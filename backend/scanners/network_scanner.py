"""CloudGuard — Network Security Scanner.

Checks:
 • Security groups open to 0.0.0.0/0 (or ::/0)
 • Open SSH (port 22) to the world
 • Open RDP (port 3389) to the world
 • EC2 instances with public IPs
 • VPC flow logs not enabled
"""

import asyncio
from typing import Any

from cloud_integrations.aws import AWSClient

RISKY_PORTS = {
    22: ("SSH", "CRITICAL"),
    3389: ("RDP", "CRITICAL"),
    3306: ("MySQL", "HIGH"),
    5432: ("PostgreSQL", "HIGH"),
    1433: ("MSSQL", "HIGH"),
    27017: ("MongoDB", "HIGH"),
    6379: ("Redis", "HIGH"),
    9200: ("Elasticsearch", "HIGH"),
}


async def scan(aws: AWSClient) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    loop = asyncio.get_event_loop()

    # ── Security groups ──────────────────────────────────
    sgs = await loop.run_in_executor(
        None, lambda: aws.ec2.describe_security_groups()["SecurityGroups"]
    )

    for sg in sgs:
        sg_id = sg["GroupId"]
        sg_name = sg.get("GroupName", sg_id)
        vpc_id = sg.get("VpcId", "N/A")

        for perm in sg.get("IpPermissions", []):
            from_port = perm.get("FromPort", 0)
            to_port = perm.get("ToPort", 65535)
            protocol = perm.get("IpProtocol", "-1")

            open_cidrs = [
                r["CidrIp"]
                for r in perm.get("IpRanges", [])
                if r["CidrIp"] in ("0.0.0.0/0", "::/0")
            ]
            open_cidrs += [
                r["CidrIpv6"]
                for r in perm.get("Ipv6Ranges", [])
                if r.get("CidrIpv6") == "::/0"
            ]

            if not open_cidrs:
                continue

            # All traffic open
            if protocol == "-1":
                findings.append(
                    _finding(
                        "CRITICAL",
                        f"SG {sg_name} allows ALL traffic from 0.0.0.0/0",
                        f"Security group {sg_id} in VPC {vpc_id} allows unrestricted "
                        f"inbound traffic on all ports.",
                        f"arn:aws:ec2:::security-group/{sg_id}",
                        "Security Group",
                        "Restrict inbound rules to specific IPs and required ports only.",
                        {"sg_id": sg_id, "vpc_id": vpc_id},
                    )
                )
                continue

            # Check specific risky ports
            for port, (service, sev) in RISKY_PORTS.items():
                if from_port <= port <= to_port:
                    findings.append(
                        _finding(
                            sev,
                            f"SG {sg_name} exposes {service} (port {port}) to the internet",
                            f"Security group {sg_id} allows inbound {service} traffic "
                            f"on port {port} from {', '.join(open_cidrs)}.",
                            f"arn:aws:ec2:::security-group/{sg_id}",
                            "Security Group",
                            f"Restrict port {port} access to trusted IP ranges only.",
                            {"sg_id": sg_id, "port": port, "service": service},
                        )
                    )

            # Generic wide-open port range
            if (to_port - from_port) > 100:
                findings.append(
                    _finding(
                        "HIGH",
                        f"SG {sg_name} has a wide port range open to the internet",
                        f"Ports {from_port}–{to_port} are exposed to {', '.join(open_cidrs)}.",
                        f"arn:aws:ec2:::security-group/{sg_id}",
                        "Security Group",
                        "Narrow the port range to only required ports.",
                        {"from_port": from_port, "to_port": to_port},
                    )
                )

    # ── Public EC2 instances ─────────────────────────────
    reservations = await loop.run_in_executor(
        None, lambda: aws.ec2.describe_instances()["Reservations"]
    )
    for res in reservations:
        for inst in res["Instances"]:
            iid = inst["InstanceId"]
            public_ip = inst.get("PublicIpAddress")
            if public_ip:
                findings.append(
                    _finding(
                        "MEDIUM",
                        f"EC2 instance {iid} has a public IP ({public_ip})",
                        "Instances with public IPs are directly accessible from the "
                        "internet, increasing the attack surface.",
                        f"arn:aws:ec2:::instance/{iid}",
                        "EC2 Instance",
                        "Use private subnets + load balancers / bastion hosts instead.",
                        {"instance_id": iid, "public_ip": public_ip},
                    )
                )

    # ── VPC flow logs ────────────────────────────────────
    vpcs = await loop.run_in_executor(
        None, lambda: aws.ec2.describe_vpcs()["Vpcs"]
    )
    for vpc in vpcs:
        vpc_id = vpc["VpcId"]
        flow_logs = await loop.run_in_executor(
            None,
            lambda v=vpc_id: aws.ec2.describe_flow_logs(
                Filters=[{"Name": "resource-id", "Values": [v]}]
            )["FlowLogs"],
        )
        if not flow_logs:
            findings.append(
                _finding(
                    "MEDIUM",
                    f"VPC {vpc_id} has no flow logs enabled",
                    "VPC flow logs are not configured, reducing visibility into "
                    "network traffic for forensic and compliance purposes.",
                    f"arn:aws:ec2:::vpc/{vpc_id}",
                    "VPC",
                    "Enable VPC Flow Logs and send to CloudWatch or S3.",
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
        "category": "NETWORK",
        "severity": severity,
        "title": title,
        "description": description,
        "resource_arn": resource_arn,
        "resource_type": resource_type,
        "recommendation": recommendation,
        "details": details or {},
    }
