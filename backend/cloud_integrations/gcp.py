"""CloudGuard — GCP SDK client wrapper."""

import json
from google.oauth2 import service_account
from google.cloud import resourcemanager_v3


class GCPClient:
    """GCP SDK access using service account credentials."""

    def __init__(self, project_id: str, service_account_json: str):
        self.project_id = project_id
        info = json.loads(service_account_json) if isinstance(service_account_json, str) else service_account_json
        self._credentials = service_account.Credentials.from_service_account_info(info)
        self._clients: dict = {}

    @property
    def projects(self):
        if "projects" not in self._clients:
            self._clients["projects"] = resourcemanager_v3.ProjectsClient(
                credentials=self._credentials
            )
        return self._clients["projects"]

    def get_project_id(self) -> str:
        return self.project_id

    def test_connection(self) -> bool:
        """Quick connectivity check — get the project."""
        try:
            self.projects.get_project(name=f"projects/{self.project_id}")
            return True
        except Exception:
            return False
