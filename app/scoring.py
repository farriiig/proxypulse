from __future__ import annotations

from statistics import mean


def latency_score(latency_ms: float | None) -> float:
    if latency_ms is None:
        return 0.0
    if latency_ms <= 40: return 100.0
    if latency_ms <= 70: return 95.0
    if latency_ms <= 100: return 88.0
    if latency_ms <= 150: return 78.0
    if latency_ms <= 220: return 65.0
    if latency_ms <= 350: return 50.0
    if latency_ms <= 600: return 30.0
    return 10.0


def jitter_score(jitter_ms: float | None) -> float:
    if jitter_ms is None: return 65.0
    if jitter_ms <= 5: return 100.0
    if jitter_ms <= 10: return 92.0
    if jitter_ms <= 20: return 78.0
    if jitter_ms <= 35: return 60.0
    if jitter_ms <= 60: return 40.0
    return 20.0


def calculate_score(
    *,
    reachable: bool,
    latency_ms: float | None,
    uptime: float,
    jitter_ms: float | None,
    config_quality: float,
) -> float:
    if not reachable:
        return 0.0
    score = (
        0.45 * max(0.0, min(100.0, uptime))
        + 0.30 * latency_score(latency_ms)
        + 0.15 * jitter_score(jitter_ms)
        + 0.10 * max(0.0, min(100.0, config_quality))
    )
    return round(max(0.0, min(100.0, score)), 1)


def gaming_score(*, reachable: bool, latency_ms: float | None, jitter_ms: float | None, recent_success_rate: float) -> float:
    if not reachable:
        return 0.0
    score = 0.50 * latency_score(latency_ms) + 0.25 * jitter_score(jitter_ms) + 0.25 * recent_success_rate
    return round(max(0.0, min(100.0, score)), 1)


def mean_absolute_delta(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    deltas = [abs(b - a) for a, b in zip(values, values[1:])]
    return round(mean(deltas), 2) if deltas else None
