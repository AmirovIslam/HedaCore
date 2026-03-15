"""CloudGuard — Storage Security Scanner.

Checks:
 • Public S3 buckets (ACL & policy)
 • Unencrypted S3 buckets
 • Missing bucket policies
 • Block public access disabled
"""

import asyncio
import json
from typing import Any

from cloud_integrations.aws import AWSClient


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    buckets = await loop.run_in_executor(
        None, lambda: aws.s3.list_buckets().get("Buckets", [])
    )

    for bucket in buckets:
        name = bucket["Name"]
        arn = f"arn:aws:s3:::{name}"

        # ─ Block public access settings ──────────────────
        try:
            pub_access = await loop.run_in_executor(
                None,
                lambda b=name: aws.s3.get_public_access_block(Bucket=b)[
                    "PublicAccessBlockConfiguration"
                ],
            )
            if not all(pub_access.values()):
                findings.append(
                    _finding(
                        "CRITICAL",
                        f"S3 bucket {name} has incomplete public access block",
                        "Not all S3 Block Public Access settings are enabled, which "
                        "may allow public exposure of objects.",
                        arn,
                        "S3 Bucket",
                        "Enable all four Block Public Access settings.",
                        {"public_access_block": pub_access},
                    )
                )
        except Exception:
            findings.append(
                _finding(
                    "HIGH",
                    f"S3 bucket {name} has no public access block configured",
                    "S3 Block Public Access is not configured on this bucket.",
                    arn,
                    "S3 Bucket",
                    "Configure S3 Block Public Access on the bucket.",
                )
            )

        # ─ Bucket ACL ────────────────────────────────────
        try:
            acl = await loop.run_in_executor(
                None, lambda b=name: aws.s3.get_bucket_acl(Bucket=b)
            )
            for grant in acl.get("Grants", []):
                grantee = grant.get("Grantee", {})
                uri = grantee.get("URI", "")
                if "AllUsers" in uri or "AuthenticatedUsers" in uri:
                    findings.append(
                        _finding(
                            "CRITICAL",
                            f"S3 bucket {name} has public ACL grant",
                            f"Bucket ACL grants access to {uri.split('/')[-1]}.",
                            arn,
                            "S3 Bucket",
                            "Remove public ACL grants and use bucket policies with "
                            "explicit deny for public access.",
                        )
                    )
        except Exception:
            pass

        # ─ Bucket policy ─────────────────────────────────
        try:
            policy_str = await loop.run_in_executor(
                None, lambda b=name: aws.s3.get_bucket_policy(Bucket=b)["Policy"]
            )
            policy = json.loads(policy_str)
            for stmt in policy.get("Statement", []):
                principal = stmt.get("Principal", "")
                if principal == "*" or (
                    isinstance(principal, dict) and principal.get("AWS") == "*"
                ):
                    if stmt.get("Effect") == "Allow":
                        findings.append(
                            _finding(
                                "CRITICAL",
                                f"S3 bucket {name} policy allows public access",
                                "Bucket policy has a statement with Principal: * and "
                                "Effect: Allow, exposing data publicly.",
                                arn,
                                "S3 Bucket",
                                "Remove or add conditions to statements with Principal: *.",
                            )
                        )
        except aws.s3.exceptions.ClientError:
            # No bucket policy — this is informational
            findings.append(
                _finding(
                    "LOW",
                    f"S3 bucket {name} has no bucket policy",
                    "No bucket policy is attached. While not inherently insecure, "
                    "an explicit deny policy is recommended.",
                    arn,
                    "S3 Bucket",
                    "Attach a bucket policy with least-privilege access rules.",
                )
            )
        except Exception:
            pass

        # ─ Encryption ────────────────────────────────────
        try:
            await loop.run_in_executor(
                None,
                lambda b=name: aws.s3.get_bucket_encryption(Bucket=b),
            )
        except Exception:
            findings.append(
                _finding(
                    "HIGH",
                    f"S3 bucket {name} does not have default encryption",
                    "Server-side encryption is not configured as the default for "
                    "this bucket, leaving objects potentially unencrypted.",
                    arn,
                    "S3 Bucket",
                    "Enable default SSE-S3 or SSE-KMS encryption on the bucket.",
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
        "category": "STORAGE",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
