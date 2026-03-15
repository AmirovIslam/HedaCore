"""CloudGuard — Compute Security Scanner.

Checks:
 • EC2 instances with public IP in public subnets
 • Instances without attached security groups
 • IMDSv2 not enforced (metadata service protection)
 • Older generation instance types
"""

import asyncio
from typing import Any

from cloud_integrations.aws import AWSClient

OUTDATED_PREFIXES = ("t1.", "m1.", "m2.", "m3.", "c1.", "c3.", "r3.", "i2.", "g2.")


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    reservations = await loop.run_in_executor(
        None, lambda: aws.ec2.describe_instances()["Reservations"]
    )

    for res in reservations:
        for inst in res["Instances"]:
            iid = inst["InstanceId"]
            arn = f"arn:aws:ec2:::instance/{iid}"
            state = inst["State"]["Name"]

            if state == "terminated":
                continue

            # ─ Public IP check ───────────────────────────
            if inst.get("PublicIpAddress"):
                findings.append(
                    _finding(
                        "MEDIUM",
                        f"Instance {iid} has a public IP address",
                        f"Instance {iid} is assigned public IP "
                        f"{inst['PublicIpAddress']}, making it reachable from "
                        f"the internet.",
                        arn,
                        "EC2 Instance",
                        "Place instances in private subnets behind a load balancer.",
                        {"public_ip": inst["PublicIpAddress"]},
                    )
                )

            # ─ Security group check ──────────────────────
            sgs = inst.get("SecurityGroups", [])
            if not sgs:
                findings.append(
                    _finding(
                        "HIGH",
                        f"Instance {iid} has no security groups attached",
                        "This instance is not protected by any security group, "
                        "resulting in default-deny but no explicit controls.",
                        arn,
                        "EC2 Instance",
                        "Attach a properly configured security group.",
                    )
                )

            # ─ IMDSv2 check ──────────────────────────────
            metadata_opts = inst.get("MetadataOptions", {})
            http_tokens = metadata_opts.get("HttpTokens", "optional")
            if http_tokens != "required":
                findings.append(
                    _finding(
                        "HIGH",
                        f"Instance {iid} does not enforce IMDSv2",
                        "Instance Metadata Service v2 (IMDSv2) is not enforced. "
                        "IMDSv1 is vulnerable to SSRF-based credential theft.",
                        arn,
                        "EC2 Instance",
                        "Set HttpTokens to 'required' to enforce IMDSv2.",
                        {"http_tokens": http_tokens},
                    )
                )

            # ─ Instance type generation ──────────────────
            itype = inst.get("InstanceType", "")
            if itype.startswith(OUTDATED_PREFIXES):
                findings.append(
                    _finding(
                        "LOW",
                        f"Instance {iid} uses an outdated instance type ({itype})",
                        "Older generation instance types lack newer security features "
                        "and Nitro-based isolation.",
                        arn,
                        "EC2 Instance",
                        "Migrate to a current-generation instance type (e.g. t3, m5).",
                        {"instance_type": itype},
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
        "category": "COMPUTE",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
