"""CloudGuard — IAM Security Scanner.

Checks:
 • Overly permissive IAM roles (wildcard actions/resources)
 • Admin privileges (AdministratorAccess)
 • Privilege escalation risks (iam:PassRole, sts:AssumeRole, etc.)
 • Unused credentials (>90 days)
 • MFA disabled on console users
 • Access keys older than 90 days
"""

import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Any

from cloud_integrations.aws import AWSClient


DANGEROUS_ACTIONS = {
    "iam:CreateUser",
    "iam:CreateRole",
    "iam:AttachUserPolicy",
    "iam:AttachRolePolicy",
    "iam:PutUserPolicy",
    "iam:PutRolePolicy",
    "iam:PassRole",
    "sts:AssumeRole",
    "iam:CreateAccessKey",
    "iam:AddUserToGroup",
    "lambda:CreateFunction",
    "lambda:InvokeFunction",
    "ec2:RunInstances",
}

MAX_KEY_AGE_DAYS = 90


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    """Run all IAM checks and return a list of finding dicts."""
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    # ── Fetch IAM data ───────────────────────────────────
    users = await loop.run_in_executor(None, lambda: aws.iam.list_users()["Users"])
    roles = await loop.run_in_executor(None, lambda: aws.iam.list_roles()["Roles"])

    now = datetime.now(timezone.utc)

    # ── Check each user ──────────────────────────────────
    for user in users:
        username = user["UserName"]
        arn = user["Arn"]

        # ─ MFA check ─────────────────────────────────────
        mfa = await loop.run_in_executor(
            None, lambda u=username: aws.iam.list_mfa_devices(UserName=u)["MFADevices"]
        )
        if not mfa:
            findings.append(
                _finding(
                    "CRITICAL",
                    f"MFA disabled for user {username}",
                    "IAM user does not have Multi-Factor Authentication enabled, "
                    "allowing password-only access to the AWS Console.",
                    arn,
                    "IAM User",
                    "Enable MFA for all IAM users with console access.",
                )
            )

        # ─ Access key age ────────────────────────────────
        keys = await loop.run_in_executor(
            None,
            lambda u=username: aws.iam.list_access_keys(UserName=u)[
                "AccessKeyMetadata"
            ],
        )
        for key in keys:
            age = (now - key["CreateDate"]).days
            if age > MAX_KEY_AGE_DAYS:
                findings.append(
                    _finding(
                        "HIGH",
                        f"Access key {key['AccessKeyId']} is {age} days old",
                        f"Access key for user {username} has not been rotated in "
                        f"{age} days (threshold: {MAX_KEY_AGE_DAYS} days).",
                        arn,
                        "IAM Access Key",
                        "Rotate access keys regularly and delete unused keys.",
                        {"access_key_id": key["AccessKeyId"], "age_days": age},
                    )
                )

        # ─ Unused credentials check ──────────────────────
        pwd_last_used = user.get("PasswordLastUsed")
        if pwd_last_used and (now - pwd_last_used).days > 90:
            findings.append(
                _finding(
                    "MEDIUM",
                    f"User {username} has unused credentials (>90 days)",
                    "The user's password has not been used in over 90 days, "
                    "indicating a potentially stale account.",
                    arn,
                    "IAM User",
                    "Review and remove unused IAM credentials.",
                )
            )

        # ─ Inline / attached policies ────────────────────
        attached = await loop.run_in_executor(
            None,
            lambda u=username: aws.iam.list_attached_user_policies(UserName=u)[
                "AttachedPolicies"
            ],
        )
        for pol in attached:
            if pol["PolicyName"] == "AdministratorAccess":
                findings.append(
                    _finding(
                        "CRITICAL",
                        f"User {username} has full admin privileges",
                        "AdministratorAccess policy grants unrestricted access to all "
                        "AWS services and resources.",
                        arn,
                        "IAM User",
                        "Follow the principle of least privilege. "
                        "Replace AdministratorAccess with scoped policies.",
                    )
                )

        # Inline policies — check for wildcards
        inline_names = await loop.run_in_executor(
            None,
            lambda u=username: aws.iam.list_user_policies(UserName=u)["PolicyNames"],
        )
        for pname in inline_names:
            doc = await loop.run_in_executor(
                None,
                lambda u=username, p=pname: aws.iam.get_user_policy(
                    UserName=u, PolicyName=p
                )["PolicyDocument"],
            )
            _check_policy_document(findings, doc, arn, f"User {username}", "IAM User")

    # ── Check each role ──────────────────────────────────
    for role in roles:
        rname = role["RoleName"]
        rarn = role["Arn"]
        if rname.startswith("aws-service-role/"):
            continue

        attached = await loop.run_in_executor(
            None,
            lambda r=rname: aws.iam.list_attached_role_policies(RoleName=r)[
                "AttachedPolicies"
            ],
        )
        for pol in attached:
            if pol["PolicyName"] == "AdministratorAccess":
                findings.append(
                    _finding(
                        "HIGH",
                        f"Role {rname} has AdministratorAccess",
                        "This role grants full admin privileges. Any principal that "
                        "can assume this role gains unrestricted access.",
                        rarn,
                        "IAM Role",
                        "Scope down the role's policies to least privilege.",
                    )
                )

        inline_names = await loop.run_in_executor(
            None,
            lambda r=rname: aws.iam.list_role_policies(RoleName=r)["PolicyNames"],
        )
        for pname in inline_names:
            doc = await loop.run_in_executor(
                None,
                lambda r=rname, p=pname: aws.iam.get_role_policy(
                    RoleName=r, PolicyName=p
                )["PolicyDocument"],
            )
            _check_policy_document(findings, doc, rarn, f"Role {rname}", "IAM Role")

    return findings


# ── Helpers ─────────────────────────────────────────────
def _check_policy_document(
    findings: list, doc: dict | str, arn: str, entity: str, res_type: str
):
    if isinstance(doc, str):
        doc = json.loads(doc)
    statements = doc.get("Statement", [])
    for stmt in statements:
        if stmt.get("Effect") != "Allow":
            continue
        actions = stmt.get("Action", [])
        if isinstance(actions, str):
            actions = [actions]
        resources = stmt.get("Resource", [])
        if isinstance(resources, str):
            resources = [resources]

        # Wildcard action
        if "*" in actions:
            findings.append(
                _finding(
                    "CRITICAL",
                    f"{entity} has wildcard (*) action permissions",
                    "Policy allows all actions (Action: *). This is effectively "
                    "full admin access.",
                    arn,
                    res_type,
                    "Remove wildcard actions and specify only required permissions.",
                )
            )

        # Wildcard resource
        if "*" in resources and "*" not in actions:
            findings.append(
                _finding(
                    "HIGH",
                    f"{entity} has wildcard resource scope",
                    "Policy applies to all resources (Resource: *). Scope resources "
                    "to specific ARNs.",
                    arn,
                    res_type,
                    "Restrict Resource to specific ARNs.",
                )
            )

        # Privilege escalation actions
        dangerous = set(actions) & DANGEROUS_ACTIONS
        if dangerous:
            findings.append(
                _finding(
                    "HIGH",
                    f"{entity} has privilege-escalation-capable actions",
                    f"Policy grants actions that could be used for privilege "
                    f"escalation: {', '.join(sorted(dangerous))}.",
                    arn,
                    res_type,
                    "Review and restrict these actions unless explicitly required.",
                    {"dangerous_actions": sorted(dangerous)},
                )
            )


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
        "category": "IAM",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
