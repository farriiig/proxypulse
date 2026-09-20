from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
SETTINGS_FILE = BASE_DIR / "settings" / "config.json"


def _load_json() -> dict:
    try:
        return json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return {}


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    scan_limit: int
    source_concurrency: int
    probe_concurrency: int
    probe_timeout: float
    probe_attempts: int
    http_timeout: float
    max_source_bytes: int
    history_samples: int
    state_retention_days: int
    stable_min_score: float
    stable_min_uptime: float
    fast_max_latency_ms: float
    gaming_max_latency_ms: float
    top_nodes_export: int
    user_agent: str


def get_settings() -> Settings:
    cfg = _load_json()
    return Settings(
        scan_limit=max(1, _env_int("SCAN_LIMIT", int(cfg.get("scan_limit", 800)))),
        source_concurrency=max(1, _env_int("SOURCE_CONCURRENCY", int(cfg.get("source_concurrency", 8)))),
        probe_concurrency=max(1, _env_int("PROBE_CONCURRENCY", int(cfg.get("probe_concurrency", 80)))),
        probe_timeout=max(0.5, _env_float("PROBE_TIMEOUT", float(cfg.get("probe_timeout", 4.0)))),
        probe_attempts=max(1, _env_int("PROBE_ATTEMPTS", int(cfg.get("probe_attempts", 2)))),
        http_timeout=max(2.0, _env_float("HTTP_TIMEOUT", float(cfg.get("http_timeout", 15.0)))),
        max_source_bytes=max(1024, _env_int("MAX_SOURCE_BYTES", int(cfg.get("max_source_bytes", 8_000_000)))),
        history_samples=max(4, _env_int("HISTORY_SAMPLES", int(cfg.get("history_samples", 24)))),
        state_retention_days=max(1, _env_int("STATE_RETENTION_DAYS", int(cfg.get("state_retention_days", 30)))),
        stable_min_score=float(cfg.get("stable_min_score", 78.0)),
        stable_min_uptime=float(cfg.get("stable_min_uptime", 75.0)),
        fast_max_latency_ms=float(cfg.get("fast_max_latency_ms", 100.0)),
        gaming_max_latency_ms=float(cfg.get("gaming_max_latency_ms", 140.0)),
        top_nodes_export=max(50, int(cfg.get("top_nodes_export", 500))),
        user_agent=str(cfg.get("user_agent", "ProxyPulse/1.0 (+GitHub Actions)")),
    )
