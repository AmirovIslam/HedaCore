"""CloudGuard — Celery background tasks."""

import asyncio
import logging
from uuid import UUID

from celery_app import celery
from database import async_session
from services.scan_service import execute_scan

logger = logging.getLogger(__name__)


@celery.task(name="services.tasks.run_scan_task", bind=True, max_retries=2)
def run_scan_task(self, scan_id: str, cloud_account_id: str) -> dict:
    """
    Celery task that wraps the async scan service.
    Runs in a sync context by spinning up an asyncio event loop.
    """
    logger.info(f"Celery task started for scan {scan_id} (account {cloud_account_id})")
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(_run(scan_id, cloud_account_id))
        finally:
            loop.close()
        logger.info(f"Celery task finished for scan {scan_id}")
        return {"scan_id": scan_id, "status": "completed"}
    except Exception as exc:
        logger.exception(f"Celery task failed for scan {scan_id}: {exc}")
        raise self.retry(exc=exc, countdown=30)


async def _run(scan_id: str, cloud_account_id: str) -> None:
    async with async_session() as session:
        await execute_scan(UUID(scan_id), UUID(cloud_account_id), session)
