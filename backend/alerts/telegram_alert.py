"""CloudGuard — Telegram bot alert sender."""

import logging
import httpx
from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

TELEGRAM_API = "https://api.telegram.org/bot{token}/sendMessage"


async def send_telegram_alert(message: str) -> bool:
    """Send a Telegram message to the configured chat. Returns True on success."""
    if not settings.TELEGRAM_BOT_TOKEN or not settings.TELEGRAM_CHAT_ID:
        logger.warning("Telegram not configured — skipping alert.")
        return False

    url = TELEGRAM_API.format(token=settings.TELEGRAM_BOT_TOKEN)
    payload = {
        "chat_id": settings.TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
        logger.info("Telegram alert sent successfully.")
        return True
    except Exception as exc:
        logger.error(f"Failed to send Telegram alert: {exc}")
        return False


def build_scan_summary(
    scan_id: str,
    risk_score: float,
    counts: dict[str, int],
    total: int,
) -> str:
    """Build a Telegram-friendly text summary."""
    emoji = "🔴" if risk_score >= 70 else "🟡" if risk_score >= 40 else "🟢"
    return (
        f"<b>☁️ CloudGuard Scan Complete</b>\n\n"
        f"<b>Scan:</b> <code>{scan_id[:8]}…</code>\n"
        f"<b>Risk Score:</b> {emoji} <b>{risk_score}</b> / 100\n\n"
        f"<b>Findings ({total}):</b>\n"
        f"  🔴 Critical: {counts.get('CRITICAL', 0)}\n"
        f"  🟠 High: {counts.get('HIGH', 0)}\n"
        f"  🟡 Medium: {counts.get('MEDIUM', 0)}\n"
        f"  🟢 Low: {counts.get('LOW', 0)}\n"
    )
