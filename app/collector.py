from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass

import httpx

from .parser import extract_uris
from .settings import Settings


@dataclass(slots=True)
class FetchResult:
    url: str
    uris: list[str]
    elapsed_ms: float | None
    status: str
    error: str | None = None
    bytes_read: int = 0


async def _fetch_one(client: httpx.AsyncClient, url: str, settings: Settings) -> FetchResult:
    started = time.perf_counter()
    last_error: str | None = None
    for attempt in range(2):
        try:
            response = await client.get(url)
            response.raise_for_status()
            raw = response.content[: settings.max_source_bytes]
            text = raw.decode(response.encoding or "utf-8", "ignore")
            elapsed = (time.perf_counter() - started) * 1000
            return FetchResult(
                url=url,
                uris=extract_uris(text),
                elapsed_ms=round(elapsed, 1),
                status="ok",
                bytes_read=len(raw),
            )
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"[:300]
            if attempt == 0:
                await asyncio.sleep(0.25)
    elapsed = (time.perf_counter() - started) * 1000
    return FetchResult(url=url, uris=[], elapsed_ms=round(elapsed, 1), status="error", error=last_error)


async def fetch_sources(urls: list[str], settings: Settings) -> list[FetchResult]:
    if not urls:
        return []
    semaphore = asyncio.Semaphore(settings.source_concurrency)
    headers = {
        "User-Agent": settings.user_agent,
        "Accept": "text/plain,text/html,application/octet-stream,*/*",
    }
    timeout = httpx.Timeout(settings.http_timeout)
    limits = httpx.Limits(max_connections=max(16, settings.source_concurrency * 2), max_keepalive_connections=settings.source_concurrency)

    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers=headers, limits=limits) as client:
        async def guarded(url: str) -> FetchResult:
            async with semaphore:
                return await _fetch_one(client, url, settings)
        return list(await asyncio.gather(*(guarded(url) for url in urls)))
