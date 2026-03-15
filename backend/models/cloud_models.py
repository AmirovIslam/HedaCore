"""CloudGuard — SQLAlchemy ORM models."""

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from database import Base


# ── Enums ───────────────────────────────────────────────
class Severity(str, enum.Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class ScanStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class FindingCategory(str, enum.Enum):
    IAM = "IAM"
    NETWORK = "NETWORK"
    STORAGE = "STORAGE"
    COMPUTE = "COMPUTE"
    LOGGING = "LOGGING"
    ENCRYPTION = "ENCRYPTION"
    SECRETS = "SECRETS"
    THREAT = "THREAT"


# ── Models ──────────────────────────────────────────────
class Scan(Base):
    __tablename__ = "scans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status = Column(Enum(ScanStatus), default=ScanStatus.PENDING, nullable=False)
    cloud_provider = Column(String(20), default="aws", nullable=False)
    cloud_account_id = Column(UUID(as_uuid=True), ForeignKey("cloud_accounts.id"), nullable=True)
    risk_score = Column(Float, default=0.0)
    total_findings = Column(Integer, default=0)
    critical_count = Column(Integer, default=0)
    high_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    low_count = Column(Integer, default=0)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    error_message = Column(Text, nullable=True)

    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=False)
    category = Column(Enum(FindingCategory), nullable=False)
    severity = Column(Enum(Severity), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    resource_arn = Column(String(1000), nullable=True)
    resource_type = Column(String(200), nullable=True)
    recommendation = Column(Text, nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    scan = relationship("Scan", back_populates="findings")


class CloudAsset(Base):
    __tablename__ = "cloud_assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cloud_provider = Column(String(20), nullable=False)
    resource_type = Column(String(200), nullable=False)
    resource_id = Column(String(500), nullable=False)
    resource_arn = Column(String(1000), nullable=True)
    region = Column(String(50), nullable=True)
    name = Column(String(500), nullable=True)
    metadata_ = Column("metadata", JSON, nullable=True)
    last_seen = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class AlertRecord(Base):
    __tablename__ = "alert_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    scan_id = Column(UUID(as_uuid=True), ForeignKey("scans.id"), nullable=True)
    channel = Column(String(50), nullable=False)  # email | telegram
    status = Column(String(20), default="sent")
    message = Column(Text, nullable=True)
    sent_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
