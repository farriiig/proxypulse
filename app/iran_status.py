from __future__ import annotations

import html as html_lib
import re
from datetime import datetime, timezone

import httpx

COVERED_URL = "https://covered.ir/en"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _visible_text(raw_html: str) -> str:
    """Reduce SSR HTML to readable text without adding a parser dependency."""
    value = re.sub(r"<script\b[^>]*>.*?</script>", " ", raw_html, flags=re.I | re.S)
    value = re.sub(r"<style\b[^>]*>.*?</style>", " ", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html_lib.unescape(value).replace("\xa0", " ")
    return re.sub(r"\s+", " ", value).strip()


def parse_covered_status(raw_html: str) -> dict:
    text = _visible_text(raw_html)

    def match(pattern: str, *, cast=None):
        found = re.search(pattern, text, flags=re.I)
        if not found:
            return None
        value = found.group(1).strip()
        return cast(value) if cast else value

    status = match(r"Overall network status:\s*(Healthy|Degraded|Incident|Down|Unknown)\b")
    domestic = re.search(
        r"Of\s+(\d+)\s+monitored domestic routes,\s*(\d+)%\s+are reported healthy",
        text,
        flags=re.I,
    )
    international = re.search(
        r"Of\s+(\d+)\s+monitored international routes,\s*(\d+)%\s+are reported healthy",
        text,
        flags=re.I,
    )
    active_incidents = match(r"Active incidents:\s*(\d+)", cast=int)
    last_measured = match(r"Last measured:\s*([0-2]?\d:[0-5]\d)")

    # Fallback to the headline cards if the summary wording changes slightly.
    if not domestic:
        domestic = re.search(r"Domestic routes\s+(\d+)\s+(\d+)%\s+healthy", text, flags=re.I)
    if not international:
        international = re.search(r"International routes\s+(\d+)\s+(\d+)%\s+healthy", text, flags=re.I)
    if status is None:
        status = match(r"Overall status\s+(Healthy|Degraded|Incident|Down|Unknown)\b")

    complete = bool(status and domestic and international)
    return {
        "available": complete,
        "status": status.lower() if status else "unknown",
        "domestic_routes": int(domestic.group(1)) if domestic else None,
        "domestic_healthy_percent": int(domestic.group(2)) if domestic else None,
        "international_routes": int(international.group(1)) if international else None,
        "international_healthy_percent": int(international.group(2)) if international else None,
        "active_incidents": active_incidents,
        "last_measured_irst": last_measured,
        "source": "Covered.ir",
        "source_url": COVERED_URL,
        "scope_note": "Covered.ir reflects only the locations and routes it monitors, not every user's experience in Iran.",
    }


async def fetch_iran_internet_status(timeout: float = 12.0) -> dict:
    fetched_at = _now_iso()
    base = {
        "available": False,
        "status": "unknown",
        "domestic_routes": None,
        "domestic_healthy_percent": None,
        "international_routes": None,
        "international_healthy_percent": None,
        "active_incidents": None,
        "last_measured_irst": None,
        "source": "Covered.ir",
        "source_url": COVERED_URL,
        "scope_note": "Covered.ir reflects only the locations and routes it monitors, not every user's experience in Iran.",
        "fetched_at": fetched_at,
    }
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={
                "User-Agent": "ProxyPulse/1.2 (+GitHub Actions; Iran connectivity snapshot)",
                "Accept": "text/html,application/xhtml+xml",
            },
        ) as client:
            response = await client.get(COVERED_URL)
            response.raise_for_status()
            parsed = parse_covered_status(response.text)
            parsed["fetched_at"] = fetched_at
            if not parsed.get("available"):
                parsed["error"] = "Covered.ir response did not contain the expected status summary."
            return parsed
    except Exception as exc:  # dashboard enrichment must never fail the scan pipeline
        base["error"] = f"{type(exc).__name__}: {exc}"[:240]
        return base
