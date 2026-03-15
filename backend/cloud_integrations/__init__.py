"""CloudGuard — Cloud integration factory."""

from cloud_integrations.aws import AWSClient
from cloud_integrations.azure import AzureClient
from cloud_integrations.gcp import GCPClient


def get_cloud_client(provider: str, credentials: dict):
    """Create the appropriate cloud client based on provider type.

    Args:
        provider: 'aws', 'azure', or 'gcp'
        credentials: Dict with provider-specific credential keys

    Returns:
        AWSClient, AzureClient, or GCPClient instance
    """
    provider = provider.lower()

    if provider == "aws":
        return AWSClient(
            access_key_id=credentials["access_key_id"],
            secret_access_key=credentials["secret_access_key"],
            region=credentials.get("region", "us-east-1"),
        )
    elif provider == "azure":
        return AzureClient(
            tenant_id=credentials["tenant_id"],
            client_id=credentials["client_id"],
            client_secret=credentials["client_secret"],
            subscription_id=credentials["subscription_id"],
        )
    elif provider == "gcp":
        return GCPClient(
            project_id=credentials["project_id"],
            service_account_json=credentials["service_account_json"],
        )
    else:
        raise ValueError(f"Unsupported cloud provider: {provider}")
