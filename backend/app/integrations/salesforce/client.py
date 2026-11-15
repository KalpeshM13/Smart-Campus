"""
Salesforce REST API Client Interface and Implementation.
Supports OAuth 2.0 token management, automatic refresh, retry policy, SOQL queries, and sObject CRUD.
Never logs credentials or sensitive tokens.
"""

import abc
import time
import logging
from typing import Any, Dict, List, Optional
import httpx
from app.integrations.salesforce.config import SalesforceConfig, sf_config

logger = logging.getLogger("smart_campus.salesforce")

class SalesforceAPIError(Exception):
    """Exception raised for Salesforce API errors with safe sanitized messages."""
    def __init__(self, message: str, status_code: int = 500, error_code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code


class SalesforceClientInterface(abc.ABC):
    """Abstract interface defining the contract for Salesforce Case operations."""

    @abc.abstractmethod
    def is_mock(self) -> bool:
        """Returns True if this client is running in mock/sandbox mode."""
        pass

    @abc.abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Check connectivity to Salesforce (or mock sandbox) without exposing secrets."""
        pass

    @abc.abstractmethod
    def query(self, soql: str) -> List[Dict[str, Any]]:
        """Execute a SOQL query and return a list of matching record dictionaries."""
        pass

    @abc.abstractmethod
    def create_record(self, sobject: str, fields: Dict[str, Any]) -> str:
        """Create an sObject record and return its new 18-character Salesforce ID."""
        pass

    @abc.abstractmethod
    def get_record(self, sobject: str, record_id: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """Retrieve an sObject record by ID."""
        pass

    @abc.abstractmethod
    def update_record(self, sobject: str, record_id: str, fields: Dict[str, Any]) -> bool:
        """Update an sObject record by ID."""
        pass

    @abc.abstractmethod
    def delete_record(self, sobject: str, record_id: str) -> bool:
        """Delete an sObject record by ID."""
        pass

    @abc.abstractmethod
    def upload_file(self, title: str, filename: str, content: bytes, linked_entity_id: str) -> str:
        """Upload a file as ContentVersion and link it to an entity via ContentDocumentLink."""
        pass


class SalesforceRestClient(SalesforceClientInterface):
    """
    Production-grade Salesforce REST API client.
    Handles OAuth 2.0 token caching, token refresh buffer, exponential backoff, and timeouts.
    """

    def __init__(self, config: Optional[SalesforceConfig] = None):
        self.config = config or sf_config
        self._access_token: Optional[str] = None
        self._token_expires_at: float = 0.0
        self._instance_url: str = self.config.INSTANCE_URL
        self._client: Optional[httpx.Client] = None

    def is_mock(self) -> bool:
        return False

    def _get_http_client(self) -> httpx.Client:
        if self._client is None or self._client.is_closed:
            self._client = httpx.Client(timeout=self.config.TIMEOUT_SECONDS)
        return self._client

    def _authenticate(self, force_refresh: bool = False) -> str:
        """
        Authenticate with Salesforce using OAuth 2.0.
        Uses 5-minute buffer before expiration to refresh tokens proactively.
        """
        now = time.time()
        if not force_refresh and self._access_token and now < (self._token_expires_at - 300):
            return self._access_token

        logger.info("Authenticating with Salesforce OAuth 2.0 token endpoint...")
        client = self._get_http_client()

        payload: Dict[str, str] = {
            "client_id": self.config.CLIENT_ID,
            "client_secret": self.config.CLIENT_SECRET,
        }

        if self.config.AUTH_TYPE == "client_credentials":
            # Salesforce Client Credentials Flow requires the My Domain URL or site URL
            base_url = self.config.INSTANCE_URL.rstrip('/') if self.config.INSTANCE_URL else self.config.LOGIN_URL.rstrip('/')
            token_url = f"{base_url}/services/oauth2/token"
            payload["grant_type"] = "client_credentials"
        elif self.config.AUTH_TYPE == "password":
            token_url = f"{self.config.LOGIN_URL.rstrip('/')}/services/oauth2/token"
            payload["grant_type"] = "password"
            payload["username"] = self.config.USERNAME
            # Append security token to password if present
            payload["password"] = f"{self.config.PASSWORD}{self.config.SECURITY_TOKEN}"
        else:
            base_url = self.config.INSTANCE_URL.rstrip('/') if self.config.INSTANCE_URL else self.config.LOGIN_URL.rstrip('/')
            token_url = f"{base_url}/services/oauth2/token"
            payload["grant_type"] = "client_credentials"

        try:
            resp = client.post(token_url, data=payload)
            if resp.status_code != 200:
                logger.error(f"Salesforce OAuth failed with status {resp.status_code}")
                raise SalesforceAPIError(
                    f"Salesforce authentication failed (HTTP {resp.status_code}). Verify Connected App credentials.",
                    status_code=resp.status_code,
                    error_code="OAUTH_FAILURE"
                )
            
            data = resp.json()
            self._access_token = data.get("access_token")
            # Instance URL is returned by Salesforce in the token response
            returned_instance = data.get("instance_url")
            if returned_instance:
                self._instance_url = returned_instance
            
            # Default token lifespan: 2 hours (7200s) if not specified
            expires_in = int(data.get("expires_in", 7200))
            self._token_expires_at = now + expires_in
            logger.info("Salesforce OAuth token acquired successfully.")
            return self._access_token

        except httpx.RequestError as exc:
            logger.error(f"Network error during Salesforce OAuth authentication: {type(exc).__name__}")
            raise SalesforceAPIError(
                "Unable to reach Salesforce identity server. Check network connection and LOGIN_URL.",
                status_code=503,
                error_code="NETWORK_UNREACHABLE"
            )

    def _get_headers(self) -> Dict[str, str]:
        token = self._authenticate()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        }

    def _execute_with_retry(self, method: str, url: str, **kwargs) -> httpx.Response:
        """Executes HTTP request with exponential backoff for transient errors."""
        client = self._get_http_client()
        retries = 0
        backoff = 1.0

        while retries <= self.config.MAX_RETRIES:
            try:
                headers = self._get_headers()
                if "headers" in kwargs:
                    headers.update(kwargs.pop("headers"))
                
                resp = client.request(method, url, headers=headers, **kwargs)
                
                # If session expired / token revoked, force refresh and retry once
                if resp.status_code == 401 and retries == 0:
                    logger.warning("Salesforce returned 401 Unauthorized; attempting token refresh...")
                    self._authenticate(force_refresh=True)
                    retries += 1
                    continue

                # Transient rate limit (429) or service unavailable (503)
                if resp.status_code in (429, 503) and retries < self.config.MAX_RETRIES:
                    logger.warning(f"Salesforce returned {resp.status_code}; retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff *= 2.0
                    retries += 1
                    continue

                return resp

            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                if retries < self.config.MAX_RETRIES:
                    logger.warning(f"Salesforce connection error ({type(exc).__name__}); retrying in {backoff:.1f}s...")
                    time.sleep(backoff)
                    backoff *= 2.0
                    retries += 1
                    continue
                raise SalesforceAPIError(
                    f"Salesforce request timed out or connection failed after {self.config.MAX_RETRIES} retries.",
                    status_code=504,
                    error_code="GATEWAY_TIMEOUT"
                )

        raise SalesforceAPIError("Max retries exceeded communicating with Salesforce.", status_code=504)

    def health_check(self) -> Dict[str, Any]:
        """Perform a lightweight sanity query to verify Salesforce connectivity."""
        try:
            start_time = time.time()
            # Query standard Organization object
            records = self.query("SELECT Id, Name, OrganizationType FROM Organization LIMIT 1")
            latency_ms = round((time.time() - start_time) * 1000, 1)
            org_name = records[0].get("Name") if records else "Connected"
            return {
                "status": "connected",
                "mode": "live_salesforce",
                "org_name": org_name,
                "latency_ms": latency_ms,
                "api_version": self.config.API_VERSION
            }
        except Exception as e:
            return {
                "status": "degraded",
                "mode": "live_salesforce",
                "error": str(e)
            }

    def query(self, soql: str) -> List[Dict[str, Any]]:
        base = self._instance_url.rstrip("/")
        url = f"{base}/services/data/{self.config.API_VERSION}/query"
        records: List[Dict[str, Any]] = []

        resp = self._execute_with_retry("GET", url, params={"q": soql})
        if resp.status_code != 200:
            error_detail = resp.text[:200]
            raise SalesforceAPIError(f"SOQL query failed (HTTP {resp.status_code}): {error_detail}", status_code=resp.status_code)

        data = resp.json()
        records.extend(data.get("records", []))

        # Handle pagination if nextRecordsUrl is present
        next_url = data.get("nextRecordsUrl")
        while next_url:
            full_next_url = f"{base}{next_url}"
            next_resp = self._execute_with_retry("GET", full_next_url)
            if next_resp.status_code == 200:
                next_data = next_resp.json()
                records.extend(next_data.get("records", []))
                next_url = next_data.get("nextRecordsUrl")
            else:
                break

        return records

    def create_record(self, sobject: str, fields: Dict[str, Any]) -> str:
        base = self._instance_url.rstrip("/")
        url = f"{base}/services/data/{self.config.API_VERSION}/sobjects/{sobject}"
        
        resp = self._execute_with_retry("POST", url, json=fields)
        if resp.status_code in (200, 201):
            data = resp.json()
            return data["id"]
        
        error_detail = resp.text[:300]
        raise SalesforceAPIError(f"Failed to create {sobject} (HTTP {resp.status_code}): {error_detail}", status_code=resp.status_code)

    def get_record(self, sobject: str, record_id: str, fields: Optional[List[str]] = None) -> Dict[str, Any]:
        base = self._instance_url.rstrip("/")
        url = f"{base}/services/data/{self.config.API_VERSION}/sobjects/{sobject}/{record_id}"
        params = {"fields": ",".join(fields)} if fields else None

        resp = self._execute_with_retry("GET", url, params=params)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code == 404:
            raise SalesforceAPIError(f"{sobject} record '{record_id}' not found.", status_code=404)
        
        error_detail = resp.text[:200]
        raise SalesforceAPIError(f"Failed to fetch {sobject} (HTTP {resp.status_code}): {error_detail}", status_code=resp.status_code)

    def update_record(self, sobject: str, record_id: str, fields: Dict[str, Any]) -> bool:
        base = self._instance_url.rstrip("/")
        url = f"{base}/services/data/{self.config.API_VERSION}/sobjects/{sobject}/{record_id}"
        
        resp = self._execute_with_retry("PATCH", url, json=fields)
        if resp.status_code in (200, 204):
            return True
        
        error_detail = resp.text[:200]
        raise SalesforceAPIError(f"Failed to update {sobject} (HTTP {resp.status_code}): {error_detail}", status_code=resp.status_code)

    def delete_record(self, sobject: str, record_id: str) -> bool:
        base = self._instance_url.rstrip("/")
        url = f"{base}/services/data/{self.config.API_VERSION}/sobjects/{sobject}/{record_id}"
        
        resp = self._execute_with_retry("DELETE", url)
        if resp.status_code in (200, 204):
            return True
        if resp.status_code == 404:
            raise SalesforceAPIError(f"{sobject} record '{record_id}' not found for deletion.", status_code=404)
        
        error_detail = resp.text[:200]
        raise SalesforceAPIError(f"Failed to delete {sobject} (HTTP {resp.status_code}): {error_detail}", status_code=resp.status_code)

    def upload_file(self, title: str, filename: str, content: bytes, linked_entity_id: str) -> str:
        """Upload binary file to ContentVersion and link to linked_entity_id."""
        import base64
        base64_data = base64.b64encode(content).decode("utf-8")
        
        # 1. Create ContentVersion
        version_fields = {
            "Title": title,
            "PathOnClient": filename,
            "VersionData": base64_data,
            "FirstPublishLocationId": linked_entity_id
        }
        return self.create_record("ContentVersion", version_fields)

