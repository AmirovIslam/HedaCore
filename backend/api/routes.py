"""CloudGuard — API route definitions."""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from models.cloud_models import (
    CloudAsset,
    Finding,
    FindingCategory,
    Scan,
    ScanStatus,
    Severity,
)
from models.cloud_account import CloudAccount

router = APIRouter()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pydantic schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class CloudAccountCreate(BaseModel):
    provider: str       # aws | azure | gcp
    display_name: str
    credentials: dict   # provider-specific credential dict
    region: str | None = None


class CloudAccountOut(BaseModel):
    id: UUID
    provider: str
    display_name: str
    region: str | None = None
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectionTestResult(BaseModel):
    success: bool
    message: str
    account_id: UUID


class ScanOut(BaseModel):
    id: UUID
    status: ScanStatus
    cloud_provider: str
    cloud_account_id: UUID | None = None
    risk_score: float
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class FindingOut(BaseModel):
    id: UUID
    scan_id: UUID
    category: FindingCategory
    severity: Severity
    title: str
    description: str
    resource_arn: Optional[str] = None
    resource_type: Optional[str] = None
    recommendation: Optional[str] = None
    details: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DashboardStats(BaseModel):
    total_scans: int
    latest_risk_score: float
    total_findings: int
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    total_assets: int
    recent_findings: list[FindingOut]


class ScanTriggerRequest(BaseModel):
    cloud_account_id: UUID


class ScanTriggerResponse(BaseModel):
    scan_id: UUID
    status: str
    message: str


class AIAnalysisRequest(BaseModel):
    scan_id: UUID


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Cloud Accounts Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/cloud-accounts", response_model=CloudAccountOut, status_code=201)
async def create_cloud_account(
    body: CloudAccountCreate,
    db: AsyncSession = Depends(get_db),
):
    """Save a new cloud provider account with credentials."""
    provider = body.provider.lower()
    if provider not in ("aws", "azure", "gcp"):
        raise HTTPException(status_code=400, detail="Provider must be aws, azure, or gcp")

    account = CloudAccount(
        provider=provider,
        display_name=body.display_name,
        credentials=body.credentials,
        region=body.region,
    )
    db.add(account)
    await db.flush()
    await db.refresh(account)
    return account


@router.get("/cloud-accounts", response_model=list[CloudAccountOut])
async def list_cloud_accounts(db: AsyncSession = Depends(get_db)):
    """List all connected cloud accounts."""
    result = await db.execute(
        select(CloudAccount).order_by(CloudAccount.created_at.desc())
    )
    return result.scalars().all()


@router.delete("/cloud-accounts/{account_id}", status_code=204)
async def delete_cloud_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Remove a cloud account."""
    result = await db.execute(
        select(CloudAccount).where(CloudAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")
    await db.delete(account)


@router.post("/cloud-accounts/{account_id}/test", response_model=ConnectionTestResult)
async def test_cloud_account(
    account_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Test connectivity for a cloud account by attempting an API call."""
    result = await db.execute(
        select(CloudAccount).where(CloudAccount.id == account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")

    from cloud_integrations import get_cloud_client
    import asyncio

    try:
        loop = asyncio.get_event_loop()
        client = get_cloud_client(account.provider, account.credentials)

        if account.provider == "aws":
            identity = await loop.run_in_executor(
                None, client.sts.get_caller_identity
            )
            msg = f"Connected to AWS account {identity['Account']}"
        elif account.provider == "azure":
            success = await loop.run_in_executor(None, client.test_connection)
            if not success:
                raise Exception("Could not list resource groups")
            msg = f"Connected to Azure subscription {account.credentials.get('subscription_id', '')}"
        elif account.provider == "gcp":
            success = await loop.run_in_executor(None, client.test_connection)
            if not success:
                raise Exception("Could not get project")
            msg = f"Connected to GCP project {account.credentials.get('project_id', '')}"
        else:
            raise HTTPException(status_code=400, detail="Unsupported provider")

        account.is_verified = True
        await db.commit()
        return ConnectionTestResult(success=True, message=msg, account_id=account.id)

    except Exception as e:
        return ConnectionTestResult(
            success=False,
            message=f"Connection failed: {str(e)}",
            account_id=account.id,
        )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Scan Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/scans", response_model=ScanTriggerResponse, status_code=202)
async def trigger_scan(
    body: ScanTriggerRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create a new scan and enqueue it for background execution."""
    # Validate cloud account exists
    result = await db.execute(
        select(CloudAccount).where(CloudAccount.id == body.cloud_account_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Cloud account not found")

    scan = Scan(
        cloud_provider=account.provider,
        cloud_account_id=account.id,
        status=ScanStatus.PENDING,
    )
    db.add(scan)
    await db.flush()
    await db.refresh(scan)

    # Enqueue celery task
    from services.tasks import run_scan_task
    run_scan_task.delay(str(scan.id), str(account.id))

    return ScanTriggerResponse(
        scan_id=scan.id,
        status="PENDING",
        message=f"Scan {scan.id} enqueued for {account.provider.upper()}.",
    )


@router.get("/scans", response_model=list[ScanOut])
async def list_scans(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Scan).order_by(Scan.created_at.desc()).limit(limit)
    )
    return result.scalars().all()


@router.get("/scans/{scan_id}", response_model=ScanOut)
async def get_scan(scan_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id).options(selectinload(Scan.findings))
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    return scan


@router.get("/scans/{scan_id}/findings", response_model=list[FindingOut])
async def get_scan_findings(
    scan_id: UUID,
    severity: Optional[Severity] = None,
    category: Optional[FindingCategory] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Finding).where(Finding.scan_id == scan_id)
    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if category:
        stmt = stmt.where(Finding.category == category)
    stmt = stmt.order_by(Finding.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/findings", response_model=list[FindingOut])
async def list_findings(
    limit: int = Query(50, ge=1, le=200),
    severity: Optional[Severity] = None,
    category: Optional[FindingCategory] = None,
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Finding)
    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if category:
        stmt = stmt.where(Finding.category == category)
    stmt = stmt.order_by(Finding.created_at.desc()).limit(limit)
    result = await db.execute(stmt)
    return result.scalars().all()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# AI Analysis Endpoints
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.post("/scans/{scan_id}/analyze")
async def analyze_scan(scan_id: UUID, db: AsyncSession = Depends(get_db)):
    """Trigger AI analysis on scan findings using Gemini."""
    # Get scan
    result = await db.execute(
        select(Scan).where(Scan.id == scan_id).options(selectinload(Scan.findings))
    )
    scan = result.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    if scan.status != ScanStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Scan must be completed before analysis")

    # Convert findings to dict list
    findings_data = [
        {
            "category": f.category.value,
            "severity": f.severity.value,
            "title": f.title,
            "description": f.description,
            "resource_arn": f.resource_arn,
            "resource_type": f.resource_type,
            "recommendation": f.recommendation,
        }
        for f in scan.findings
    ]

    from services.ai_analyzer import analyze_findings
    analysis = await analyze_findings(findings_data)
    return {"scan_id": str(scan_id), "analysis": analysis}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Dashboard
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/dashboard", response_model=DashboardStats)
async def dashboard(db: AsyncSession = Depends(get_db)):
    """Aggregated dashboard stats."""
    total_scans = (await db.execute(select(func.count(Scan.id)))).scalar() or 0

    latest_scan_result = await db.execute(
        select(Scan)
        .where(Scan.status == ScanStatus.COMPLETED)
        .order_by(Scan.completed_at.desc())
        .limit(1)
    )
    latest_scan = latest_scan_result.scalar_one_or_none()
    latest_risk_score = latest_scan.risk_score if latest_scan else 0.0

    sev_counts = {s: 0 for s in Severity}
    for sev in Severity:
        count = (
            await db.execute(
                select(func.count(Finding.id)).where(Finding.severity == sev)
            )
        ).scalar() or 0
        sev_counts[sev] = count
    total_findings = sum(sev_counts.values())

    total_assets = (await db.execute(select(func.count(CloudAsset.id)))).scalar() or 0

    recent_result = await db.execute(
        select(Finding).order_by(Finding.created_at.desc()).limit(10)
    )
    recent_findings = recent_result.scalars().all()

    return DashboardStats(
        total_scans=total_scans,
        latest_risk_score=latest_risk_score,
        total_findings=total_findings,
        critical_count=sev_counts[Severity.CRITICAL],
        high_count=sev_counts[Severity.HIGH],
        medium_count=sev_counts[Severity.MEDIUM],
        low_count=sev_counts[Severity.LOW],
        total_assets=total_assets,
        recent_findings=recent_findings,
    )
