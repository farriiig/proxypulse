from __future__ import annotations

from .parser import ParsedNode

TRUTHY = {"1", "true", "yes", "on"}


def _param(node: ParsedNode, *names: str) -> str | None:
    lowered = {str(k).lower(): str(v) for k, v in node.params.items()}
    for name in names:
        if name.lower() in lowered:
            return lowered[name.lower()]
    return None


def analyze_config(node: ParsedNode) -> dict:
    """Static URI hygiene checks. This is not a cryptographic security audit."""
    issues: list[str] = []
    notes: list[str] = []
    quality = 100

    insecure = _param(node, "allowInsecure", "insecure", "skip-cert-verify")
    if insecure and insecure.lower() in TRUTHY:
        issues.append("TLS verification disabled")
        quality -= 35

    security = (node.security or "").lower()
    if security == "reality":
        pbk = _param(node, "pbk", "publicKey", "public_key")
        sni = _param(node, "sni", "serverName", "server_name")
        fp = _param(node, "fp", "fingerprint")
        flow = _param(node, "flow")
        if not pbk:
            issues.append("Reality public key missing")
            quality -= 30
        if not sni:
            issues.append("Reality server name missing")
            quality -= 20
        if not fp:
            notes.append("Reality fingerprint not specified")
            quality -= 5
        if flow:
            notes.append(f"Flow: {flow}")

    if node.transport and node.transport.lower() in {"ws", "websocket"}:
        if not _param(node, "path"):
            notes.append("WebSocket path not specified")

    if not node.credential:
        issues.append("Credential/identifier missing")
        quality -= 25

    quality = max(0, min(100, quality))
    risk = "LOW" if quality >= 85 else "MEDIUM" if quality >= 60 else "HIGH"
    return {
        "config_quality": quality,
        "config_risk": risk,
        "issues": issues,
        "notes": notes,
    }
