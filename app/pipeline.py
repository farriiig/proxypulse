from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import os
import shutil
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

from .analyzer import analyze_config
from .collector import fetch_sources
from .parser import ParsedNode, parse_uri
from .probe import ProbeResult, probe_many
from .scoring import calculate_score, gaming_score, mean_absolute_delta
from .settings import BASE_DIR, Settings, get_settings

SETTINGS_DIR = BASE_DIR / "settings"
RUNTIME_DIR = BASE_DIR / ".runtime"
BUILD_DIR = BASE_DIR / "build"
SITE_DIR = BUILD_DIR / "site"
PUBLISH_DIR = BUILD_DIR / "publish"
SOURCES_FILE = SETTINGS_DIR / "sources.txt"
STATE_FILE = RUNTIME_DIR / "state.json"
SOURCE_STATE_FILE = RUNTIME_DIR / "source_state.json"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return default


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    body = "\n".join(lines)
    path.write_text(body + ("\n" if body else ""), encoding="utf-8")


def read_sources(path: Path = SOURCES_FILE) -> list[str]:
    if not path.exists():
        return []
    seen: set[str] = set()
    result: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or line in seen:
            continue
        if not line.startswith(("http://", "https://")):
            continue
        seen.add(line)
        result.append(line)
    return result


def source_reputation(*, reliability: float, valid: int, fetched: int, unique: int, fetch_ms: float | None) -> float:
    valid_ratio = (valid / fetched * 100) if fetched else 0.0
    unique_ratio = (unique / valid * 100) if valid else 0.0
    speed = 100.0 if not fetch_ms else max(0.0, 100.0 - min(fetch_ms, 5000.0) / 50.0)
    score = 0.50 * reliability + 0.25 * valid_ratio + 0.15 * unique_ratio + 0.10 * speed
    return round(max(0.0, min(100.0, score)), 1)


def _stable_shuffle_key(fp: str, bucket: str) -> str:
    return hashlib.sha256(f"{bucket}:{fp}".encode()).hexdigest()


def select_candidates(parsed: dict[str, ParsedNode], old_state: dict, limit: int, bucket: str) -> list[ParsedNode]:
    all_nodes = list(parsed.values())
    if len(all_nodes) <= limit:
        return all_nodes

    known = [n for n in all_nodes if n.fingerprint in old_state]
    new = [n for n in all_nodes if n.fingerprint not in old_state]

    known.sort(key=lambda n: (-float(old_state.get(n.fingerprint, {}).get("score", 0)), _stable_shuffle_key(n.fingerprint, bucket)))
    new.sort(key=lambda n: _stable_shuffle_key(n.fingerprint, bucket))

    known_quota = min(len(known), int(limit * 0.60))
    new_quota = min(len(new), limit - known_quota)
    selected = known[:known_quota] + new[:new_quota]

    if len(selected) < limit:
        selected_fps = {n.fingerprint for n in selected}
        remainder = [n for n in all_nodes if n.fingerprint not in selected_fps]
        remainder.sort(key=lambda n: _stable_shuffle_key(n.fingerprint, bucket))
        selected.extend(remainder[: limit - len(selected)])
    return selected


def recent_success_rate(recent: list[dict]) -> float:
    if not recent:
        return 0.0
    return round(sum(1 for x in recent if x.get("reachable")) / len(recent) * 100, 1)


def classify_status(*, reachable: bool, score: float, latency_ms: float | None, previous: dict | None) -> str:
    if not reachable:
        return "OFFLINE"
    if not previous or int(previous.get("run_count", 0)) == 0:
        return "NEW"
    if previous.get("reachable") is False:
        return "RECOVERED"
    prev_score = float(previous.get("score") or 0)
    prev_latency = previous.get("latency_ms")
    if prev_score - score >= 15:
        return "DEGRADING"
    if prev_latency and latency_ms and latency_ms > max(float(prev_latency) * 1.5, float(prev_latency) + 60):
        return "DEGRADING"
    if score >= 85:
        return "HEALTHY"
    if score >= 70:
        return "STABLE"
    return "WEAK"


def update_history(*, previous: dict, probe: ProbeResult, generated_at: str, settings: Settings, config_quality: float) -> dict:
    recent = list(previous.get("recent", []))[-(settings.history_samples - 1):]
    recent.append({"at": generated_at, "reachable": probe.reachable, "latency_ms": probe.latency_ms})

    run_count = int(previous.get("run_count", 0)) + 1
    success_runs = int(previous.get("success_runs", 0)) + (1 if probe.reachable else 0)
    uptime = round(success_runs / run_count * 100, 1)

    latencies = [float(x["latency_ms"]) for x in recent if x.get("latency_ms") is not None]
    jitter = mean_absolute_delta(latencies)
    recent_rate = recent_success_rate(recent)
    score = calculate_score(
        reachable=probe.reachable,
        latency_ms=probe.latency_ms,
        uptime=uptime,
        jitter_ms=jitter,
        config_quality=config_quality,
    )
    gscore = gaming_score(
        reachable=probe.reachable,
        latency_ms=probe.latency_ms,
        jitter_ms=jitter,
        recent_success_rate=recent_rate,
    )
    consecutive_failures = 0 if probe.reachable else int(previous.get("consecutive_failures", 0)) + 1
    return {
        "first_seen_at": previous.get("first_seen_at") or generated_at,
        "last_seen_at": generated_at,
        "run_count": run_count,
        "success_runs": success_runs,
        "uptime": uptime,
        "recent_success_rate": recent_rate,
        "latency_ms": probe.latency_ms,
        "jitter_ms": jitter,
        "score": score,
        "gaming_score": gscore,
        "reachable": probe.reachable,
        "attempt_success_rate": probe.attempt_success_rate,
        "consecutive_failures": consecutive_failures,
        "recent": recent,
    }


def safe_node(parsed: ParsedNode, sources: list[str], probe: ProbeResult, history: dict, status: str, analysis: dict) -> dict:
    return {
        "fingerprint": parsed.fingerprint,
        "protocol": parsed.protocol,
        "host": parsed.host,
        "port": parsed.port,
        "name": parsed.name,
        "security": parsed.security,
        "transport": parsed.transport,
        "reachable": probe.reachable,
        "latency_ms": probe.latency_ms,
        "jitter_ms": history["jitter_ms"],
        "attempt_success_rate": probe.attempt_success_rate,
        "score": history["score"],
        "gaming_score": history["gaming_score"],
        "uptime": history["uptime"],
        "recent_success_rate": history["recent_success_rate"],
        "run_count": history["run_count"],
        "status": status,
        "config_quality": analysis["config_quality"],
        "config_risk": analysis["config_risk"],
        "config_issues": analysis["issues"],
        "sources": sources[:5],
        "raw_uri": parsed.raw_uri,
    }



def prune_state(state: dict, generated_at: str, retention_days: int) -> dict:
    cutoff = datetime.fromisoformat(generated_at.replace("Z", "+00:00")) - timedelta(days=retention_days)
    kept = {}
    for fp, item in state.items():
        raw = item.get("last_seen_at")
        if not raw:
            kept[fp] = item
            continue
        try:
            seen = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
        except ValueError:
            kept[fp] = item
            continue
        if seen >= cutoff:
            kept[fp] = item
    return kept

def _sort_nodes(nodes: list[dict], key: str = "score") -> list[dict]:
    return sorted(
        nodes,
        key=lambda n: (
            not n.get("reachable", False),
            -float(n.get(key) or 0),
            float(n.get("latency_ms")) if n.get("latency_ms") is not None else 10**9,
        ),
    )


def generate_subscriptions(nodes: list[dict], settings: Settings) -> dict[str, dict]:
    online = [n for n in nodes if n["reachable"]]
    groups: dict[str, list[dict]] = {
        "all": _sort_nodes(nodes),
        "best100": _sort_nodes(online)[:100],
        "online": _sort_nodes(online),
        "stable": _sort_nodes([n for n in online if n["score"] >= settings.stable_min_score and n["uptime"] >= settings.stable_min_uptime]),
        "fast": _sort_nodes([n for n in online if n["latency_ms"] is not None and n["latency_ms"] <= settings.fast_max_latency_ms]),
        "gaming": _sort_nodes([n for n in online if n["latency_ms"] is not None and n["latency_ms"] <= settings.gaming_max_latency_ms and n["gaming_score"] >= 75], "gaming_score"),
        "reality": _sort_nodes([n for n in online if (n.get("security") or "").lower() == "reality"]),
        "healthy": _sort_nodes([n for n in online if n["status"] in {"HEALTHY", "RECOVERED"}]),
    }
    for protocol in sorted({n["protocol"] for n in nodes}):
        groups[protocol] = _sort_nodes([n for n in online if n["protocol"] == protocol])

    manifest: dict[str, dict] = {}
    pub_sub = PUBLISH_DIR / "subscriptions"
    site_sub = SITE_DIR / "subscriptions"
    for name, members in groups.items():
        lines = [n["raw_uri"] for n in members]
        write_text(pub_sub / f"{name}.txt", lines)
        write_text(site_sub / f"{name}.txt", lines)
        encoded = base64.b64encode(("\n".join(lines) + ("\n" if lines else "")).encode()).decode()
        (pub_sub / f"{name}.base64.txt").write_text(encoded + ("\n" if encoded else ""), encoding="utf-8")
        (site_sub / f"{name}.base64.txt").write_text(encoded + ("\n" if encoded else ""), encoding="utf-8")
        manifest[name] = {"count": len(lines), "path": f"subscriptions/{name}.txt", "base64_path": f"subscriptions/{name}.base64.txt"}
    return manifest


def build_site() -> None:
    static = BASE_DIR / "app" / "static"
    template = (static / "index.template.html").read_text(encoding="utf-8")
    css = (static / "style.css").read_text(encoding="utf-8")
    js = (static / "app.js").read_text(encoding="utf-8")
    html = template.replace("/*__INLINE_CSS__*/", css).replace("/*__INLINE_JS__*/", js)
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    (SITE_DIR / "index.html").write_text(html, encoding="utf-8")
    (SITE_DIR / ".nojekyll").write_text("", encoding="utf-8")


def reset_build() -> None:
    if BUILD_DIR.exists():
        shutil.rmtree(BUILD_DIR)
    SITE_DIR.mkdir(parents=True, exist_ok=True)
    PUBLISH_DIR.mkdir(parents=True, exist_ok=True)


async def run() -> dict:
    settings = get_settings()
    reset_build()
    generated_at = now_iso()
    bucket = generated_at[:13]
    sources = read_sources()
    old_state: dict = load_json(STATE_FILE, {})
    old_source_state: dict = load_json(SOURCE_STATE_FILE, {})

    fetch_results = await fetch_sources(sources, settings)
    parsed_by_fp: dict[str, ParsedNode] = {}
    node_sources: dict[str, list[str]] = defaultdict(list)
    source_reports: list[dict] = []

    for fetched in fetch_results:
        previous_src = old_source_state.get(fetched.url, {})
        total_fetches = int(previous_src.get("total_fetches", 0)) + 1
        successful_fetches = int(previous_src.get("successful_fetches", 0)) + (1 if fetched.status == "ok" else 0)
        valid = 0
        contributed: set[str] = set()
        if fetched.status == "ok":
            for uri in fetched.uris:
                parsed = parse_uri(uri)
                if not parsed:
                    continue
                valid += 1
                fp = parsed.fingerprint
                parsed_by_fp.setdefault(fp, parsed)
                if fetched.url not in node_sources[fp]:
                    node_sources[fp].append(fetched.url)
                contributed.add(fp)
        reliability = round(successful_fetches / total_fetches * 100, 1)
        reputation = source_reputation(
            reliability=reliability,
            valid=valid,
            fetched=len(fetched.uris),
            unique=len(contributed),
            fetch_ms=fetched.elapsed_ms,
        )
        source_reports.append({
            "url": fetched.url,
            "status": fetched.status,
            "fetch_ms": fetched.elapsed_ms,
            "bytes_read": fetched.bytes_read,
            "fetched": len(fetched.uris),
            "valid": valid,
            "unique": len(contributed),
            "total_fetches": total_fetches,
            "successful_fetches": successful_fetches,
            "reliability": reliability,
            "reputation": reputation,
            "error": fetched.error,
        })

    discovered_total = len(parsed_by_fp)
    candidates = select_candidates(parsed_by_fp, old_state, settings.scan_limit, bucket)
    indexed = [(i, node.host, node.port) for i, node in enumerate(candidates)]
    results = await probe_many(indexed, settings) if indexed else {}

    next_state = dict(old_state)
    nodes: list[dict] = []
    for idx, parsed in enumerate(candidates):
        probe = results[idx]
        previous = old_state.get(parsed.fingerprint, {})
        analysis = analyze_config(parsed)
        history = update_history(
            previous=previous,
            probe=probe,
            generated_at=generated_at,
            settings=settings,
            config_quality=analysis["config_quality"],
        )
        status = classify_status(
            reachable=probe.reachable,
            score=history["score"],
            latency_ms=probe.latency_ms,
            previous=previous,
        )
        history["status"] = status
        next_state[parsed.fingerprint] = history
        nodes.append(safe_node(parsed, node_sources[parsed.fingerprint], probe, history, status, analysis))

    nodes = _sort_nodes(nodes)
    next_state = prune_state(next_state, generated_at, settings.state_retention_days)
    manifest = generate_subscriptions(nodes, settings)

    protocol_counts = Counter(n["protocol"] for n in nodes)
    status_counts = Counter(n["status"] for n in nodes)
    online_nodes = [n for n in nodes if n["reachable"]]
    with_latency = [n for n in online_nodes if n["latency_ms"] is not None]
    avg_score = round(sum(n["score"] for n in online_nodes) / len(online_nodes), 1) if online_nodes else 0.0
    avg_latency = round(sum(n["latency_ms"] for n in with_latency) / len(with_latency), 1) if with_latency else 0.0
    avg_gaming = round(sum(n["gaming_score"] for n in online_nodes) / len(online_nodes), 1) if online_nodes else 0.0

    stats = {
        "version": "1.0.0",
        "generated_at": generated_at,
        "test_level": "TCP reachability / latency pre-check",
        "source_count": len(sources),
        "source_ok": sum(1 for s in source_reports if s["status"] == "ok"),
        "discovered_nodes": discovered_total,
        "scanned_nodes": len(nodes),
        "online_nodes": len(online_nodes),
        "offline_nodes": len(nodes) - len(online_nodes),
        "online_rate": round(len(online_nodes) / len(nodes) * 100, 1) if nodes else 0.0,
        "avg_score": avg_score,
        "avg_gaming_score": avg_gaming,
        "avg_latency_ms": avg_latency,
        "reality_nodes": sum(1 for n in online_nodes if (n.get("security") or "").lower() == "reality"),
        "protocols": dict(sorted(protocol_counts.items())),
        "statuses": dict(sorted(status_counts.items())),
        "subscriptions": manifest,
        "settings": {
            "scan_limit": settings.scan_limit,
            "probe_attempts": settings.probe_attempts,
            "probe_concurrency": settings.probe_concurrency,
        },
    }

    source_state = {
        r["url"]: {k: r[k] for k in ("total_fetches", "successful_fetches", "reliability", "reputation")}
        for r in source_reports
    }

    # Persistent snapshot for the generated branch.
    write_json(PUBLISH_DIR / "data" / "state.json", next_state)
    write_json(PUBLISH_DIR / "data" / "source_state.json", source_state)
    write_json(PUBLISH_DIR / "data" / "stats.json", stats)
    write_json(PUBLISH_DIR / "data" / "nodes.json", nodes[: settings.top_nodes_export])
    write_json(PUBLISH_DIR / "data" / "sources.json", source_reports)

    # Dashboard data.
    write_json(SITE_DIR / "data" / "stats.json", stats)
    write_json(SITE_DIR / "data" / "nodes.json", nodes[: settings.top_nodes_export])
    write_json(SITE_DIR / "data" / "sources.json", source_reports)
    write_json(SITE_DIR / "data" / "project.json", {
        "repository": os.getenv("GITHUB_REPOSITORY", "farriiig/proxypulse-mvp"),
        "generated_at": generated_at,
        "generated_branch": "generated",
    })

    build_site()
    print(json.dumps(stats, indent=2))
    return stats


if __name__ == "__main__":
    asyncio.run(run())
