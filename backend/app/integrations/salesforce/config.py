"""
Salesforce Service Cloud Integration Configuration.
Manages OAuth 2.0 parameters, endpoints, credentials, and mock mode switching.
Never logs or leaks credentials.
"""

import os
from typing import Optional
from pydantic import BaseModel, Field
from app.core.config import settings

class SalesforceConfig(BaseModel):
    """Configuration for Salesforce Service Cloud API connectivity."""
    
    # Mode control: set to True when no live Salesforce org is configured
    MOCK_MODE: bool = Field(default=True, description="When True, uses the in-memory Salesforce Sandbox Mock Provider")
    
    # Auth type: 'client_credentials', 'password', or 'jwt_bearer'
    AUTH_TYPE: str = Field(default="client_credentials", description="OAuth 2.0 flow type")
    
    # Salesforce Instance & Login URLs
    LOGIN_URL: str = Field(default="https://login.salesforce.com", description="Salesforce OAuth login base URL")
    INSTANCE_URL: str = Field(default="", description="Salesforce MyDomain instance URL (e.g. https://yourcampus.my.salesforce.com)")
    
    # Connected App / External Client App Credentials
    CLIENT_ID: str = Field(default="", description="OAuth Consumer Key from Connected App")
    CLIENT_SECRET: str = Field(default="", description="OAuth Consumer Secret from Connected App")
    
    # User-level credentials (for Password or JWT bearer flow)
    USERNAME: str = Field(default="", description="Salesforce Integration User Username")
    PASSWORD: str = Field(default="", description="Salesforce Integration User Password")
    SECURITY_TOKEN: str = Field(default="", description="Salesforce Security Token (for password flow)")
    
    # API & Network Settings
    API_VERSION: str = Field(default="v60.0", description="Salesforce REST API version")
    TIMEOUT_SECONDS: int = Field(default=15, description="HTTP request timeout in seconds")
    MAX_RETRIES: int = Field(default=3, description="Max retry attempts for transient 429/503 errors")
    
    # Service Cloud Defaults
    DEFAULT_CASE_ORIGIN: str = Field(default="Web Portal", description="Origin field value for created Cases")
    ADMIN_REVIEW_QUEUE: str = Field(default="Admin_Review_Queue", description="Fallback queue for unmapped categories")

    @classmethod
    def from_env(cls) -> "SalesforceConfig":
        """Load configuration from environment with auto-detection of mock mode."""
        client_id = os.getenv("SALESFORCE_CLIENT_ID", "")
        client_secret = os.getenv("SALESFORCE_CLIENT_SECRET", "")
        instance_url = os.getenv("SALESFORCE_INSTANCE_URL", "")
        
        # Explicit mock mode toggle, or auto-fallback if essential credentials are missing
        raw_mock = os.getenv("SALESFORCE_MOCK_MODE", "").lower()
        if raw_mock in ("false", "0", "no"):
            mock_mode = False
        elif raw_mock in ("true", "1", "yes"):
            mock_mode = True
        else:
            # Auto-detect: if no client_id or instance_url provided, safely default to Mock mode
            mock_mode = not bool(client_id and (instance_url or os.getenv("SALESFORCE_USERNAME")))

        return cls(
            MOCK_MODE=mock_mode,
            AUTH_TYPE=os.getenv("SALESFORCE_AUTH_TYPE", "client_credentials"),
            LOGIN_URL=os.getenv("SALESFORCE_LOGIN_URL", "https://login.salesforce.com"),
            INSTANCE_URL=instance_url,
            CLIENT_ID=client_id,
            CLIENT_SECRET=client_secret,
            USERNAME=os.getenv("SALESFORCE_USERNAME", ""),
            PASSWORD=os.getenv("SALESFORCE_PASSWORD", ""),
            SECURITY_TOKEN=os.getenv("SALESFORCE_SECURITY_TOKEN", ""),
            API_VERSION=os.getenv("SALESFORCE_API_VERSION", "v60.0"),
            TIMEOUT_SECONDS=int(os.getenv("SALESFORCE_TIMEOUT_SECONDS", "15")),
            MAX_RETRIES=int(os.getenv("SALESFORCE_MAX_RETRIES", "3")),
            DEFAULT_CASE_ORIGIN=os.getenv("SALESFORCE_DEFAULT_CASE_ORIGIN", "Web Portal"),
            ADMIN_REVIEW_QUEUE=os.getenv("SALESFORCE_ADMIN_REVIEW_QUEUE", "Admin_Review_Queue"),
        )

# Global configuration singleton
sf_config = SalesforceConfig.from_env()

