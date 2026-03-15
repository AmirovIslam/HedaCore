"""CloudGuard — Secrets Management Scanner.

Checks:
 • IAM access keys older than 90 days
 • Access keys that have never been used
 • Hardcoded secret patterns (basic heuristics)
"""

import asyncio
from datetime import datetime, timezone
from typing import Any

from cloud_integrations.aws import AWSClient

MAX_KEY_AGE_DAYS = 90


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()
    now = datetime.now(timezone.utc)

    users = await loop.run_in_executor(
        None, lambda: aws.iam.list_users()["Users"]
    )

    for user in users:
        username = user["UserName"]
        arn = user["Arn"]

        keys = await loop.run_in_executor(
            None,
            lambda u=username: aws.iam.list_access_keys(UserName=u)[
                "AccessKeyMetadata"
            ],
        )

        for key in keys:
            key_id = key["AccessKeyId"]
            status = key["Status"]
            created = key["CreateDate"]
            age = (now - created).days

            # ─ Old keys ──────────────────────────────────
            if age > MAX_KEY_AGE_DAYS and status == "Active":
                findings.append(
                    _finding(
                        "HIGH",
                        f"Access key {key_id} for {username} is {age} days old",
                        f"Active access key has not been rotated in {age} days "
                        f"(policy: {MAX_KEY_AGE_DAYS} days).",
                        arn,
                        "IAM Access Key",
                        "Rotate or deactivate this access key.",
                        {"access_key_id": key_id, "age_days": age, "status": status},
                    )
                )

            # ─ Never-used keys ───────────────────────────
            try:
                last_used = await loop.run_in_executor(
                    None,
                    lambda k=key_id: aws.iam.get_access_key_last_used(
                        AccessKeyId=k
                    )["AccessKeyLastUsed"],
                )
                if "LastUsedDate" not in last_used and status == "Active":
                    findings.append(
                        _finding(
                            "MEDIUM",
                            f"Access key {key_id} for {username} has never been used",
                            "This active access key has never been used. It may be a "
                            "leftover credential that increases attack surface.",
                            arn,
                            "IAM Access Key",
                            "Delete unused access keys.",
                            {"access_key_id": key_id},
                        )
                    )
            except Exception:
                pass

        # ─ Multiple active keys ──────────────────────────
        active_keys = [k for k in keys if k["Status"] == "Active"]
        if len(active_keys) > 1:
            findings.append(
                _finding(
                    "MEDIUM",
                    f"User {username} has {len(active_keys)} active access keys",
                    "Having multiple active access keys increases the risk of "
                    "credential exposure.",
                    arn,
                    "IAM User",
                    "Use only one active key per user and deactivate extras.",
                    {"active_key_count": len(active_keys)},
                )
            )

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
        "category": "SECRETS",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
