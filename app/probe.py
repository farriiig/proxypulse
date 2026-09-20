from __future__ import annotations

import asyncio
import statistics
import time
from dataclasses import dataclass

from .settings import Settings


@dataclass(slots=True)
class ProbeResult:
    reachable: bool
    latency_ms: float | None
    attempt_success_rate: float
    attempt_latencies: list[float]
    error: str | None = None


async def _one_tcp_probe(host: str, port: int, timeout: float) -> tuple[bool, float | None, str | None]:
    started = time.perf_counter()
    writer = None
    try:
        _, writer = await asyncio.wait_for(asyncio.open_connection(host, port), timeout=timeout)
        latency = (time.perf_counter() - started) * 1000
        return True, round(latency, 2), None
    except Exception as exc:
        return False, None, f"{type(exc).__name__}: {exc}"[:220]
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass


async def tcp_probe(host: str, port: int, settings: Settings) -> ProbeResult:
    latencies: list[float] = []
    errors: list[str] = []
    for attempt in range(settings.probe_attempts):
        ok, latency, error = await _one_tcp_probe(host, port, settings.probe_timeout)
        if ok and latency is not None:
            latencies.append(latency)
        elif error:
            errors.append(error)
        if attempt + 1 < settings.probe_attempts:
            await asyncio.sleep(0.06)
    success_rate = round(len(latencies) / settings.probe_attempts * 100, 1)
    latency_ms = round(statistics.median(latencies), 2) if latencies else None
    return ProbeResult(bool(latencies), latency_ms, success_rate, latencies, errors[-1] if errors else None)


async def probe_many(items: list[tuple[int, str, int]], settings: Settings) -> dict[int, ProbeResult]:
    semaphore = asyncio.Semaphore(settings.probe_concurrency)

    async def run(node_id: int, host: str, port: int):
        async with semaphore:
            return node_id, await tcp_probe(host, port, settings)

    pairs = await asyncio.gather(*(run(*item) for item in items))
    return dict(pairs)
