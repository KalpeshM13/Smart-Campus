"""
Salesforce Service Cloud Integration Package.
Provides OAuth 2.0 REST client, Mock Sandbox Provider, and Salesforce Case Service.
"""

from app.integrations.salesforce.config import SalesforceConfig, sf_config
from app.integrations.salesforce.client import SalesforceClientInterface, SalesforceRestClient
from app.integrations.salesforce.mock_provider import SalesforceMockProvider
from app.integrations.salesforce.service import SalesforceService, get_salesforce_service

__all__ = [
    "SalesforceConfig",
    "sf_config",
    "SalesforceClientInterface",
    "SalesforceRestClient",
    "SalesforceMockProvider",
    "SalesforceService",
    "get_salesforce_service",
]

