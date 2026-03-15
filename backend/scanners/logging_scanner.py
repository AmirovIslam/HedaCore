"""CloudGuard — Logging & Monitoring Scanner.

Checks:
 • CloudTrail not enabled or not multi-region
 • GuardDuty not enabled
 • No CloudWatch alarms configured
"""

import asyncio
from typing import Any

from cloud_integrations.aws import AWSClient


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    # ── CloudTrail ────────────────────────────────────────
    try:
        trails = await loop.run_in_executor(
            None, lambda: aws.cloudtrail.describe_trails().get("trailList", [])
        )
        if not trails:
            findings.append(
                _finding(
                    "CRITICAL",
                    "CloudTrail is not enabled",
                    "No CloudTrail trails are configured. API activity is not "
                    "being recorded, severely impacting auditability.",
                    "arn:aws:cloudtrail:::trail/*",
                    "CloudTrail",
                    "Enable a multi-region CloudTrail trail with S3 log storage.",
                )
            )
        else:
            multi_region = any(t.get("IsMultiRegionTrail") for t in trails)
            if not multi_region:
                findings.append(
                    _finding(
                        "HIGH",
                        "No multi-region CloudTrail trail found",
                        "All CloudTrail trails are single-region. Activity in "
                        "other regions will not be logged.",
                        "arn:aws:cloudtrail:::trail/*",
                        "CloudTrail",
                        "Enable multi-region logging on at least one trail.",
                    )
                )

            # Check if logging is actually turned on
            for trail in trails:
                trail_arn = trail.get("TrailARN", "")
                try:
                    status = await loop.run_in_executor(
                        None,
                        lambda t=trail_arn: aws.cloudtrail.get_trail_status(Name=t),
                    )
                    if not status.get("IsLogging"):
                        findings.append(
                            _finding(
                                "CRITICAL",
                                f"CloudTrail trail is not actively logging",
                                f"Trail {trail.get('Name')} exists but logging is "
                                f"disabled.",
                                trail_arn,
                                "CloudTrail",
                                "Start logging on this trail immediately.",
                            )
                        )
                except Exception:
                    pass

    except Exception:
        findings.append(
            _finding(
                "HIGH",
                "Unable to check CloudTrail status",
                "Could not describe CloudTrail trails — verify IAM permissions.",
                "arn:aws:cloudtrail:::trail/*",
                "CloudTrail",
                "Ensure the scanner role has cloudtrail:DescribeTrails permission.",
            )
        )

    # ── GuardDuty ─────────────────────────────────────────
    try:
        detectors = await loop.run_in_executor(
            None, lambda: aws.guardduty.list_detectors().get("DetectorIds", [])
        )
        if not detectors:
            findings.append(
                _finding(
                    "HIGH",
                    "GuardDuty is not enabled",
                    "Amazon GuardDuty is not enabled in this region. Threat "
                    "detection for malicious activity is not active.",
                    "arn:aws:guardduty:::detector/*",
                    "GuardDuty",
                    "Enable GuardDuty in all regions for continuous threat monitoring.",
                )
            )
    except Exception:
        pass

    # ── CloudWatch alarms ─────────────────────────────────
    try:
        alarms = await loop.run_in_executor(
            None, lambda: aws.cloudwatch.describe_alarms(MaxRecords=1)
        )
        if not alarms.get("MetricAlarms") and not alarms.get("CompositeAlarms"):
            findings.append(
                _finding(
                    "MEDIUM",
                    "No CloudWatch alarms configured",
                    "There are no CloudWatch metric alarms. Critical events may "
                    "go unnoticed.",
                    "arn:aws:cloudwatch:::alarm/*",
                    "CloudWatch",
                    "Create alarms for key metrics (billing, CPU, error rates).",
                )
            )
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
        "category": "LOGGING",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
