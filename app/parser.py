from __future__ import annotations

import base64
import hashlib
import json
import re
from dataclasses import dataclass, field
from html import unescape
from urllib.parse import parse_qs, unquote, urlsplit

SUPPORTED = ("vless", "vmess", "trojan", "ss", "hysteria2", "hy2", "tuic")
URI_RE = re.compile(r"(?:(?:vless|vmess|trojan|ss|hysteria2|hy2|tuic)://)[^\s<>\"']+", re.I)

# Query parameters that materially change how a node is reached.  Keeping these
# in the fingerprint prevents over-aggressive deduplication while still ignoring
# cosmetic names and query ordering.
IDENTITY_KEYS = {
    "security", "tls", "type", "network", "flow", "sni", "servername",
    "server_name", "pbk", "publickey", "public_key", "sid", "shortid",
    "short_id", "path", "host", "serviceName", "service_name", "alpn",
    "fp", "fingerprint", "headerType", "header_type", "mode",
}


@dataclass(slots=True)
class ParsedNode:
    protocol: str
    host: str
    port: int
    credential: str = ""
    name: str | None = None
    security: str | None = None
    transport: str | None = None
    raw_uri: str = ""
    params: dict[str, str] = field(default_factory=dict)

    @property
    def fingerprint(self) -> str:
        relevant = []
        for key, value in self.params.items():
            if key in IDENTITY_KEYS or key.lower() in {k.lower() for k in IDENTITY_KEYS}:
                relevant.append((key.lower(), str(value).strip()))
        relevant.sort()
        canonical = json.dumps(
            {
                "protocol": self.protocol.lower(),
                "host": self.host.lower().strip("[]"),
                "port": self.port,
                "credential": self.credential,
                "security": (self.security or "").lower(),
                "transport": (self.transport or "").lower(),
                "params": relevant,
            },
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        return hashlib.sha256(canonical.encode()).hexdigest()


def _b64decode(value: str) -> bytes:
    value = value.strip().replace("\n", "")
    value += "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(value)
    except Exception:
        return base64.b64decode(value)


def maybe_decode_subscription(text: str) -> str:
    stripped = text.strip()
    if "://" in stripped:
        return text
    compact = re.sub(r"\s+", "", stripped)
    if len(compact) < 24:
        return text
    try:
        decoded = _b64decode(compact).decode("utf-8", "ignore")
        return decoded if "://" in decoded else text
    except Exception:
        return text


def extract_uris(text: str) -> list[str]:
    text = unescape(maybe_decode_subscription(text))
    found: list[str] = []
    seen: set[str] = set()
    for match in URI_RE.findall(text):
        uri = match.rstrip(".,;)]}\"")
        if uri not in seen:
            seen.add(uri)
            found.append(uri)
    return found


def _first(qs: dict[str, list[str]], *keys: str) -> str | None:
    for key in keys:
        if key in qs and qs[key]:
            return qs[key][0]
    return None


def parse_uri(uri: str) -> ParsedNode | None:
    if "://" not in uri:
        return None
    scheme = uri.split("://", 1)[0].lower()
    if scheme not in SUPPORTED:
        return None
    if scheme == "vmess":
        return _parse_vmess(uri)
    if scheme == "ss":
        return _parse_ss(uri)
    return _parse_url_style(uri, scheme)


def _parse_url_style(uri: str, scheme: str) -> ParsedNode | None:
    try:
        parts = urlsplit(uri)
        host = parts.hostname
        port = parts.port
        if not host or not port or not (1 <= port <= 65535):
            return None
        qs = parse_qs(parts.query, keep_blank_values=True)
        proto = "hysteria2" if scheme == "hy2" else scheme
        security = _first(qs, "security", "tls")
        if proto in {"trojan", "hysteria2", "tuic"} and not security:
            security = "tls"
        transport = _first(qs, "type", "network")
        credential = unquote(parts.username or "")
        if parts.password:
            credential = f"{credential}:{unquote(parts.password)}" if credential else unquote(parts.password)
        return ParsedNode(
            protocol=proto,
            host=host,
            port=port,
            credential=credential,
            name=unquote(parts.fragment) if parts.fragment else None,
            security=security,
            transport=transport,
            raw_uri=uri,
            params={k: v[0] for k, v in qs.items() if v},
        )
    except Exception:
        return None


def _parse_vmess(uri: str) -> ParsedNode | None:
    try:
        payload = uri.split("://", 1)[1].split("#", 1)[0]
        data = json.loads(_b64decode(payload).decode("utf-8", "ignore"))
        host = data.get("add") or data.get("host")
        port = int(data.get("port"))
        if not host or not (1 <= port <= 65535):
            return None
        tls = str(data.get("tls") or "").lower()
        security = "tls" if tls in {"tls", "1", "true"} else (tls or None)
        params = {str(k): str(v) for k, v in data.items() if v is not None}
        return ParsedNode(
            protocol="vmess",
            host=str(host),
            port=port,
            credential=str(data.get("id") or ""),
            name=data.get("ps"),
            security=security,
            transport=str(data.get("net") or "") or None,
            raw_uri=uri,
            params=params,
        )
    except Exception:
        return None


def _parse_ss(uri: str) -> ParsedNode | None:
    """Parse SIP002 and legacy base64 Shadowsocks URIs."""
    try:
        body = uri.split("://", 1)[1]
        body, _, frag = body.partition("#")
        body, _, query = body.partition("?")
        credential = ""
        host: str | None = None
        port: int | None = None

        if "@" in body:
            userinfo, hostpart = body.rsplit("@", 1)
            try:
                decoded_userinfo = _b64decode(userinfo).decode("utf-8", "ignore") if ":" not in userinfo else unquote(userinfo)
            except Exception:
                decoded_userinfo = unquote(userinfo)
            credential = decoded_userinfo
            hp = urlsplit("ss://x@" + hostpart)
            host, port = hp.hostname, hp.port
        else:
            decoded = _b64decode(body).decode("utf-8", "ignore")
            userinfo, hostpart = decoded.rsplit("@", 1)
            credential = userinfo
            hp = urlsplit("ss://x@" + hostpart)
            host, port = hp.hostname, hp.port

        if not host or not port or not (1 <= port <= 65535):
            return None
        method = credential.split(":", 1)[0] if ":" in credential else None
        return ParsedNode(
            protocol="ss",
            host=host,
            port=port,
            credential=credential,
            name=unquote(frag) if frag else None,
            security=method,
            transport=None,
            raw_uri=uri,
            params={"query": query} if query else {},
        )
    except Exception:
        return None
