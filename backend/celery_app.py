"""CloudGuard — Celery application for background scan tasks."""

from celery import Celery
from config import get_settings

settings = get_settings()

celery = Celery(
    "cloudguard",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

celery.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

# Auto-discover tasks in the services package
celery.autodiscover_tasks(["services"])
