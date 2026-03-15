"""CloudGuard — Scan orchestration service.

Coordinates: AWS client → all scanners → risk scoring → DB persistence → alerts.
"""

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from cloud_integrations.aws import AWSClient
from models.cloud_models import Finding, FindingCategory, Scan, ScanStatus, Severity
from risk_engine.scorer import calculate_risk_score, severity_counts
from risk_engine.threat_detector import detect as detect_threats
from scanners import (
    iam_scanner,
    network_scanner,
    storage_scanner,
    compute_scanner,
    logging_scanner,
    encryption_scanner,
    secrets_scanner,
)
from alerts.email_alert import build_scan_report_html, send_email_alert
from alerts.telegram_alert import build_scan_summary, send_telegram_alert

logger = logging.getLogger(__name__)

# All scanners to run, in order
SCANNERS = [
    ("IAM", iam_scanner),
    ("Network", network_scanner),
    ("Storage", storage_scanner),
    ("Compute", compute_scanner),
    ("Logging", logging_scanner),
    ("Encryption", encryption_scanner),
    ("Secrets", secrets_scanner),
]


async def execute_scan(scan_id: UUID, cloud_account_id: UUID, db: AsyncSession) -> None:
    """Run a full cloud security scan and persist results."""

    # ── Verify Scan & Account ────────────────────────────
    result = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = result.scalar_one_or_none()
    if not scan:
        logger.error(f"Scan {scan_id} not found")
        return

    from models.cloud_account import CloudAccount
    account_result = await db.execute(select(CloudAccount).where(CloudAccount.id == cloud_account_id))
    account = account_result.scalar_one_or_none()
    if not account:
        logger.error(f"Cloud account {cloud_account_id} not found")
        scan.status = ScanStatus.FAILED
        scan.error_message = "Cloud account not found"
        await db.commit()
        return

    scan.status = ScanStatus.RUNNING
    scan.started_at = datetime.now(timezone.utc)
    await db.commit()

    all_findings: list[dict] = []

    try:
        from cloud_integrations import get_cloud_client
        client = get_cloud_client(account.provider, account.credentials)

        # ── Run each scanner ─────────────────────────────
        for name, scanner in SCANNERS:
            try:
                # pass in the client instead of hardcoded aws
                logger.info(f"Running {name} scanner for {account.provider}…")
                results = await scanner.scan(client)
                all_findings.extend(results)
                logger.info(f"  → {name}: {len(results)} findings")
            except Exception as exc:
                logger.error(f"  ✗ {name} scanner failed: {exc}")

        # ── Threat detection ─────────────────────────────
        try:
            logger.info("Running threat detection…")
            threat_findings = await detect_threats(client)
            all_findings.extend(threat_findings)
            logger.info(f"  → Threats: {len(threat_findings)} findings")
        except Exception as exc:
            logger.error(f"  ✗ Threat detection failed: {exc}")

        # ── Persist findings ─────────────────────────────
        for f in all_findings:
            finding = Finding(
                scan_id=scan_id,
                category=FindingCategory(f["category"]),
                severity=Severity(f["severity"]),
                title=f["title"],
                description=f["description"],
                resource_arn=f.get("resource_arn"),
                resource_type=f.get("resource_type"),
                recommendation=f.get("recommendation"),
                details=f.get("details"),
            )
            db.add(finding)

        # ── Risk score ───────────────────────────────────
        risk = calculate_risk_score(all_findings)
        counts = severity_counts(all_findings)

        scan.risk_score = risk
        scan.total_findings = len(all_findings)
        scan.critical_count = counts["CRITICAL"]
        scan.high_count = counts["HIGH"]
        scan.medium_count = counts["MEDIUM"]
        scan.low_count = counts["LOW"]
        scan.status = ScanStatus.COMPLETED
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()

        logger.info(
            f"Scan {scan_id} completed — risk {risk}, "
            f"{len(all_findings)} findings"
        )

        # ── Send alerts ──────────────────────────────────
        await _send_alerts(str(scan_id), risk, counts, len(all_findings))

    except Exception as exc:
        scan.status = ScanStatus.FAILED
        scan.error_message = str(exc)
        scan.completed_at = datetime.now(timezone.utc)
        await db.commit()
        logger.exception(f"Scan {scan_id} failed: {exc}")


async def _send_alerts(
    scan_id: str, risk: float, counts: dict, total: int
) -> None:
    """Fire email & Telegram alerts (best-effort)."""
    try:
        html = build_scan_report_html(scan_id, risk, counts, total)
        await send_email_alert(f"Scan Complete — Risk Score {risk}", html)
    except Exception as exc:
        logger.error(f"Email alert failed: {exc}")

    try:
        text = build_scan_summary(scan_id, risk, counts, total)
        await send_telegram_alert(text)
    except Exception as exc:
        logger.error(f"Telegram alert failed: {exc}")
