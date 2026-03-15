"""CloudGuard — Threat Detection Engine.

Analyses CloudTrail events for:
 • Suspicious API calls (e.g. disabling security controls)
 • Privilege escalation attempts
 • Brute-force console sign-in failures
 • Unusual login locations (non-baseline source IPs)
"""

import asyncio
from datetime import datetime, timezone, timedelta
from typing import Any

from cloud_integrations.aws import AWSClient

# API calls that indicate an attacker disabling defences
SUSPICIOUS_APIS = {
    "DeleteTrail",
    "StopLogging",
    "DeleteFlowLogs",
    "DisableGuardDuty",
    "DeleteDetector",
    "DisableAlarmActions",
    "DeleteAlarms",
    "PutBucketPolicy",
    "PutBucketAcl",
    "DeleteBucketPolicy",
    "AuthorizeSecurityGroupIngress",
    "RevokeSecurityGroupIngress",
    "CreateSecurityGroup",
    "ModifyInstanceAttribute",
}

PRIV_ESCALATION_APIS = {
    "CreateRole",
    "AttachRolePolicy",
    "PutRolePolicy",
    "CreateUser",
    "AttachUserPolicy",
    "PutUserPolicy",
    "AddUserToGroup",
    "CreateAccessKey",
    "CreateLoginProfile",
    "UpdateLoginProfile",
    "AssumeRole",
    "PassRole",
}

# A threshold: more than N failed console logins in 24 h → brute force
BRUTE_FORCE_THRESHOLD = 5


async def detect(aws: AWSClient) -> list[dict[str, Any]]:
    """Scan recent CloudTrail events for threat indicators."""
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    end = datetime.now(timezone.utc)
    start = end - timedelta(hours=24)

    try:
        events = await loop.run_in_executor(
            None,
            lambda: _lookup_events(aws, start, end),
        )
    except Exception:
        # Cannot access CloudTrail — already flagged by logging scanner
        return findings

    failed_logins: dict[str, int] = {}
    source_ips: set[str] = set()

    for event in events:
        name = event.get("EventName", "")
        source = event.get("EventSource", "")
        user = event.get("Username", "unknown")
        source_ip = event.get("SourceIPAddress", "")
        error = event.get("ErrorCode", "")

        # ─ Suspicious API calls ──────────────────────────
        if name in SUSPICIOUS_APIS:
            findings.append(
                _finding(
                    "HIGH",
                    f"Suspicious API call: {name}",
                    f"User {user} invoked {name} from {source_ip}. This action may "
                    f"indicate an attempt to disable security controls.",
                    f"arn:aws:cloudtrail:::event/{event.get('EventId', 'N/A')}",
                    "CloudTrail Event",
                    "Investigate this API call and verify it was intentional.",
                    {"event_name": name, "user": user, "source_ip": source_ip},
                )
            )

        # ─ Privilege escalation ──────────────────────────
        if name in PRIV_ESCALATION_APIS:
            findings.append(
                _finding(
                    "HIGH",
                    f"Privilege escalation attempt: {name}",
                    f"User {user} called {name} from {source_ip}. This could be a "
                    f"privilege escalation vector.",
                    f"arn:aws:cloudtrail:::event/{event.get('EventId', 'N/A')}",
                    "CloudTrail Event",
                    "Review whether this change was authorised.",
                    {"event_name": name, "user": user, "source_ip": source_ip},
                )
            )

        # ─ Failed console logins ─────────────────────────
        if name == "ConsoleLogin" and error:
            failed_logins[user] = failed_logins.get(user, 0) + 1

        # Collect IPs for anomaly detection
        if source_ip:
            source_ips.add(source_ip)

    # ─ Brute force detection ─────────────────────────────
    for user, count in failed_logins.items():
        if count >= BRUTE_FORCE_THRESHOLD:
            findings.append(
                _finding(
                    "CRITICAL",
                    f"Possible brute-force attack on user {user}",
                    f"{count} failed console login attempts detected for user "
                    f"{user} in the last 24 hours.",
                    f"arn:aws:iam:::user/{user}",
                    "IAM User",
                    "Investigate the source IPs and consider locking the account.",
                    {"failed_attempts": count, "user": user},
                )
            )

    # ─ Unusual IPs heuristic ─────────────────────────────
    # Flag if events come from a large number of distinct IPs (possible credential leak)
    if len(source_ips) > 20:
        findings.append(
            _finding(
                "MEDIUM",
                "High number of distinct source IPs in 24 hours",
                f"API calls originated from {len(source_ips)} distinct IP addresses "
                f"in the last 24 hours, which may indicate compromised credentials.",
                "arn:aws:cloudtrail:::event/*",
                "CloudTrail",
                "Audit source IPs and correlate with known office/VPN ranges.",
                {"unique_ips": len(source_ips)},
            )
        )

    return findings


def _lookup_events(aws: AWSClient, start: datetime, end: datetime) -> list[dict]:
    events: list[dict] = []
    paginator = aws.cloudtrail.get_paginator("lookup_events")
    for page in paginator.paginate(StartTime=start, EndTime=end):
        events.extend(page.get("Events", []))
        if len(events) >= 500:
            break
    return events[:500]


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
        "category": "THREAT",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
