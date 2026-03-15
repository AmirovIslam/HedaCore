"""CloudGuard — Encryption Scanner.

Checks:
 • Unencrypted EBS volumes
 • Unencrypted RDS instances
 • KMS key rotation not enabled
"""

import asyncio
from typing import Any

from cloud_integrations.aws import AWSClient


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    # ── EBS volumes ───────────────────────────────────────
    try:
        volumes = await loop.run_in_executor(
            None, lambda: aws.ec2.describe_volumes()["Volumes"]
        )
        for vol in volumes:
            vid = vol["VolumeId"]
            if not vol.get("Encrypted", False):
                findings.append(
                    _finding(
                        "HIGH",
                        f"EBS volume {vid} is not encrypted",
                        "This EBS volume does not have encryption enabled. Data at "
                        "rest is unprotected.",
                        f"arn:aws:ec2:::volume/{vid}",
                        "EBS Volume",
                        "Enable EBS encryption by default and encrypt existing volumes.",
                        {"volume_id": vid, "size_gb": vol.get("Size")},
                    )
                )
    except Exception:
        pass

    # ── RDS instances ─────────────────────────────────────
    try:
        db_instances = await loop.run_in_executor(
            None,
            lambda: aws.rds.describe_db_instances()["DBInstances"],
        )
        for db in db_instances:
            db_id = db["DBInstanceIdentifier"]
            arn = db["DBInstanceArn"]
            if not db.get("StorageEncrypted", False):
                findings.append(
                    _finding(
                        "CRITICAL",
                        f"RDS instance {db_id} is not encrypted",
                        "Database storage is not encrypted. Sensitive data is at risk "
                        "if the underlying storage is compromised.",
                        arn,
                        "RDS Instance",
                        "Enable encryption for the RDS instance (requires recreation "
                        "from encrypted snapshot).",
                    )
                )
    except Exception:
        pass

    # ── KMS key rotation ──────────────────────────────────
    try:
        keys_resp = await loop.run_in_executor(
            None, lambda: aws.kms.list_keys()["Keys"]
        )
        for key in keys_resp:
            key_id = key["KeyId"]
            try:
                meta = await loop.run_in_executor(
                    None,
                    lambda k=key_id: aws.kms.describe_key(KeyId=k)["KeyMetadata"],
                )
                if meta.get("KeyManager") != "CUSTOMER":
                    continue
                rotation = await loop.run_in_executor(
                    None,
                    lambda k=key_id: aws.kms.get_key_rotation_status(KeyId=k),
                )
                if not rotation.get("KeyRotationEnabled"):
                    findings.append(
                        _finding(
                            "MEDIUM",
                            f"KMS key {key_id} does not have rotation enabled",
                            "Automatic key rotation is not enabled for this "
                            "customer-managed KMS key.",
                            meta.get("Arn", ""),
                            "KMS Key",
                            "Enable automatic key rotation for customer-managed keys.",
                        )
                    )
            except Exception:
                pass
    except Exception:
        pass

    return findings


def _finding(
    severity: str,
    title: str,
    description: str,
    resource_arn: str,
    resource_type: str,
    recommendation: str,
    details: dict | None = None,
) -> dict:
    return {
        "category": "ENCRYPTION",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
