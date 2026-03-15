"""CloudGuard — AWS boto3 client wrapper."""

import boto3


class AWSClient:
    """Centralised AWS SDK access. Creates service clients lazily."""

    def __init__(self, access_key_id: str, secret_access_key: str, region: str = "us-east-1"):
        self._session = boto3.Session(
            aws_access_key_id=access_key_id or None,
            aws_secret_access_key=secret_access_key or None,
            region_name=region,
        )
        self._clients: dict = {}

    def _get(self, service: str):
        if service not in self._clients:
            self._clients[service] = self._session.client(service)
        return self._clients[service]

    # ── Convenience properties ──────────────────────────
    @property
    def iam(self):
        return self._get("iam")

    @property
    def ec2(self):
        return self._get("ec2")

    @property
    def s3(self):
        return self._get("s3")

    @property
    def cloudtrail(self):
        return self._get("cloudtrail")

    @property
    def guardduty(self):
        return self._get("guardduty")

    @property
    def kms(self):
        return self._get("kms")

    @property
    def cloudwatch(self):
        return self._get("cloudwatch")

    @property
    def sts(self):
        return self._get("sts")

    @property
    def rds(self):
        return self._get("rds")

    def get_account_id(self) -> str:
        return self.sts.get_caller_identity()["Account"]
