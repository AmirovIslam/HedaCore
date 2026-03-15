"""CloudGuard — CloudAccount model for storing user cloud provider credentials."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from database import Base


class CloudAccount(Base):
    __tablename__ = "cloud_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    provider = Column(String(20), nullable=False)  # aws | azure | gcp
    display_name = Column(String(200), nullable=False)
    credentials = Column(JSON, nullable=False)  # encrypted at app layer
    region = Column(String(50), nullable=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
