from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import httpx


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')


def _fresh(item: dict, max_age_days: int = 30) -> bool:
    raw = item.get('fetched_at')
    if not raw:
        return False
    try:
        at = datetime.fromisoformat(str(raw).replace('Z', '+00:00'))
    except ValueError:
        return False
    return at >= datetime.now(timezone.utc) - timedelta(days=max_age_days)


async def enrich_asn_many(
    ips: list[str],
    cache: dict,
    *,
    limit: int = 30,
    concurrency: int = 6,
    timeout: float = 5.0,
) -> tuple[dict[str, dict], dict]:
    """Enrich unique egress IPs with ASN/provider data using the no-key ipwho.is endpoint.

    Results are cached for 30 days. New external lookups are bounded per run so an hourly
    workflow remains below the free endpoint's daily request budget in normal operation.
    """
    unique = list(dict.fromkeys(ip for ip in ips if ip))
    result: dict[str, dict] = {}
    next_cache = dict(cache or {})

    for ip in unique:
        item = next_cache.get(ip)
        if isinstance(item, dict) and _fresh(item):
            result[ip] = item

    pending = [ip for ip in unique if ip not in result][: max(0, int(limit))]
    if not pending:
        return result, next_cache

    semaphore = asyncio.Semaphore(max(1, int(concurrency)))
    limits = httpx.Limits(max_connections=max(8, concurrency * 2), max_keepalive_connections=max(2, concurrency))
    async with httpx.AsyncClient(timeout=httpx.Timeout(timeout), follow_redirects=True, limits=limits, headers={'User-Agent':'ProxyPulse/1.3 ASN enrichment'}) as client:
        async def one(ip: str):
            async with semaphore:
                try:
                    response = await client.get(f'https://ipwho.is/{ip}')
                    response.raise_for_status()
                    data = response.json()
                    if not data.get('success', True):
                        return ip, None
                    conn = data.get('connection') or {}
                    asn = conn.get('asn')
                    item = {
                        'asn': int(asn) if str(asn or '').isdigit() else None,
                        'org': str(conn.get('org') or '')[:120] or None,
                        'isp': str(conn.get('isp') or '')[:120] or None,
                        'country_code': str(data.get('country_code') or '').upper()[:2] or None,
                        'fetched_at': _now_iso(),
                    }
                    return ip, item
                except Exception:
                    return ip, None

        pairs = await asyncio.gather(*(one(ip) for ip in pending))
        for ip, item in pairs:
            if item:
                next_cache[ip] = item
                result[ip] = item

    return result, next_cache
