"""CloudGuard — Azure SDK client wrapper."""

from azure.identity import ClientSecretCredential
from azure.mgmt.resource import ResourceManagementClient


class AzureClient:
    """Azure SDK access using service principal credentials."""

    def __init__(
        self,
        tenant_id: str,
        client_id: str,
        client_secret: str,
        subscription_id: str,
    ):
        self.subscription_id = subscription_id
        self._credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
        )
        self._clients: dict = {}

    @property
    def resource(self):
        if "resource" not in self._clients:
            self._clients["resource"] = ResourceManagementClient(
                self._credential, self.subscription_id
            )
        return self._clients["resource"]

    def get_subscription_id(self) -> str:
        return self.subscription_id

    def test_connection(self) -> bool:
        """Quick connectivity check — list resource groups."""
        try:
            groups = list(self.resource.resource_groups.list())
            return True
        except Exception:
            return False
