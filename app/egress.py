from __future__ import annotations

import asyncio
import ipaddress
import json
import os
import re
import shutil
import socket
import tempfile
import time
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qs

from .parser import ParsedNode
from .settings import Settings

_COUNTRY_RE = re.compile(r"^[A-Z]{2}$")


@dataclass(slots=True)
class EgressResult:
    validated: bool
    egress_ip: str | None = None
    country_code: str | None = None
    elapsed_ms: float | None = None
    error: str | None = None


class UnsupportedEgressConfig(ValueError):
    pass


def find_singbox_binary() -> str | None:
    configured = os.getenv("SING_BOX_BIN", "").strip()
    if configured:
        path = Path(configured)
        if path.is_file():
            return str(path)
        resolved = shutil.which(configured)
        if resolved:
            return resolved
    return shutil.which("sing-box")


def find_curl_binary() -> str | None:
    configured = os.getenv("CURL_BIN", "").strip()
    if configured:
        path = Path(configured)
        if path.is_file():
            return str(path)
        resolved = shutil.which(configured)
        if resolved:
            return resolved
    return shutil.which("curl")


def _params(node: ParsedNode) -> dict[str, str]:
    return {str(k).lower(): str(v) for k, v in node.params.items()}


def _param(node: ParsedNode, *keys: str) -> str | None:
    params = _params(node)
    for key in keys:
        value = params.get(key.lower())
        if value is not None and value != "":
            return value
    return None


def _truthy(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _split_values(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r"[,|]", value) if part.strip()]


def _server_is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
        return True
    except ValueError:
        return False


def _build_tls(node: ParsedNode) -> dict | None:
    security = (node.security or "").lower()
    enabled = security in {"tls", "reality", "1", "true"} or node.protocol in {"trojan", "hysteria2", "tuic"}
    if not enabled:
        return None

    tls: dict = {"enabled": True}
    server_name = _param(node, "sni", "servername", "server_name", "peer")
    if server_name:
        tls["server_name"] = server_name

    if _truthy(_param(node, "allowinsecure", "allow_insecure", "insecure", "skip-cert-verify", "skip_cert_verify")):
        tls["insecure"] = True

    alpn = _split_values(_param(node, "alpn"))
    if alpn:
        tls["alpn"] = alpn

    fingerprint = _param(node, "fp", "fingerprint")
    if fingerprint:
        tls["utls"] = {"enabled": True, "fingerprint": fingerprint}

    if security == "reality":
        public_key = _param(node, "pbk", "publickey", "public_key")
        short_id = _param(node, "sid", "shortid", "short_id")
        if not public_key:
            raise UnsupportedEgressConfig("Reality config is missing public key")
        reality: dict = {"enabled": True, "public_key": public_key, "short_id": short_id or ""}
        tls["reality"] = reality

    return tls


def _build_transport(node: ParsedNode) -> dict | None:
    raw_type = (node.transport or _param(node, "type", "network") or "").strip().lower()
    if raw_type in {"", "tcp", "raw"}:
        return None
    if raw_type in {"websocket", "ws"}:
        transport: dict = {"type": "ws"}
        path = _param(node, "path")
        host = _param(node, "host")
        if path:
            transport["path"] = path
        if host:
            transport["headers"] = {"Host": host.split(",", 1)[0].strip()}
        early_data = _param(node, "ed", "max_early_data")
        if early_data:
            try:
                transport["max_early_data"] = max(0, int(early_data))
            except ValueError:
                pass
        early_header = _param(node, "eh", "early_data_header_name")
        if early_header:
            transport["early_data_header_name"] = early_header
        return transport
    if raw_type in {"grpc", "gun"}:
        service = _param(node, "servicename", "service_name", "service") or _param(node, "path")
        transport = {"type": "grpc"}
        if service:
            transport["service_name"] = service.lstrip("/")
        return transport
    if raw_type in {"http", "h2"}:
        transport = {"type": "http"}
        host = _param(node, "host")
        path = _param(node, "path")
        if host:
            transport["host"] = [x.strip() for x in host.split(",") if x.strip()]
        if path:
            transport["path"] = path
        return transport
    if raw_type in {"httpupgrade", "http-upgrade", "http_upgrade"}:
        transport = {"type": "httpupgrade"}
        host = _param(node, "host")
        path = _param(node, "path")
        if host:
            transport["host"] = host.split(",", 1)[0].strip()
        if path:
            transport["path"] = path
        return transport
    if raw_type == "quic":
        return {"type": "quic"}
    raise UnsupportedEgressConfig(f"Unsupported transport for end-to-end validation: {raw_type}")


def _base_outbound(node: ParsedNode, kind: str) -> dict:
    outbound: dict = {
        "type": kind,
        "tag": "proxy",
        "server": node.host,
        "server_port": node.port,
        "connect_timeout": "6s",
    }
    if not _server_is_ip(node.host):
        outbound["domain_resolver"] = "local"
    return outbound


def build_singbox_outbound(node: ParsedNode) -> dict:
    protocol = node.protocol.lower()
    tls = _build_tls(node)
    transport = _build_transport(node) if protocol in {"vless", "vmess", "trojan"} else None

    if protocol == "vless":
        if not node.credential:
            raise UnsupportedEgressConfig("VLESS config is missing UUID")
        outbound = _base_outbound(node, "vless")
        outbound["uuid"] = node.credential
        flow = _param(node, "flow")
        if flow:
            outbound["flow"] = flow
        if tls:
            outbound["tls"] = tls
        if transport:
            outbound["transport"] = transport
        return outbound

    if protocol == "vmess":
        if not node.credential:
            raise UnsupportedEgressConfig("VMess config is missing UUID")
        outbound = _base_outbound(node, "vmess")
        outbound["uuid"] = node.credential
        outbound["security"] = _param(node, "scy") or "auto"
        alter_id = _param(node, "aid", "alterid", "alter_id")
        try:
            outbound["alter_id"] = int(alter_id or 0)
        except ValueError:
            outbound["alter_id"] = 0
        if tls:
            outbound["tls"] = tls
        if transport:
            outbound["transport"] = transport
        return outbound

    if protocol == "trojan":
        if not node.credential:
            raise UnsupportedEgressConfig("Trojan config is missing password")
        outbound = _base_outbound(node, "trojan")
        outbound["password"] = node.credential
        if tls:
            outbound["tls"] = tls
        if transport:
            outbound["transport"] = transport
        return outbound

    if protocol == "ss":
        if ":" not in node.credential:
            raise UnsupportedEgressConfig("Shadowsocks config is missing method/password")
        method, password = node.credential.split(":", 1)
        outbound = _base_outbound(node, "shadowsocks")
        outbound["method"] = method
        outbound["password"] = password
        raw_query = node.params.get("query", "")
        if raw_query:
            query = parse_qs(raw_query, keep_blank_values=True)
            plugin_value = (query.get("plugin") or [""])[0]
            if plugin_value:
                plugin, sep, opts = plugin_value.partition(";")
                outbound["plugin"] = plugin
                if sep and opts:
                    outbound["plugin_opts"] = opts
        return outbound

    if protocol == "hysteria2":
        password = node.credential or _param(node, "auth", "password")
        if not password:
            raise UnsupportedEgressConfig("Hysteria2 config is missing password")
        outbound = _base_outbound(node, "hysteria2")
        outbound["password"] = password
        if tls:
            outbound["tls"] = tls
        obfs_type = _param(node, "obfs")
        obfs_password = _param(node, "obfs-password", "obfs_password", "obfspassword")
        if obfs_type:
            obfs: dict = {"type": obfs_type}
            if obfs_password:
                obfs["password"] = obfs_password
            outbound["obfs"] = obfs
        return outbound

    if protocol == "tuic":
        if ":" not in node.credential:
            raise UnsupportedEgressConfig("TUIC config is missing UUID/password")
        uuid, password = node.credential.split(":", 1)
        if not uuid or not password:
            raise UnsupportedEgressConfig("TUIC config is missing UUID/password")
        outbound = _base_outbound(node, "tuic")
        outbound["uuid"] = uuid
        outbound["password"] = password
        if tls:
            outbound["tls"] = tls
        congestion = _param(node, "congestion_control", "congestion-control", "congestion")
        if congestion:
            outbound["congestion_control"] = congestion
        relay_mode = _param(node, "udp_relay_mode", "udp-relay-mode")
        if relay_mode:
            outbound["udp_relay_mode"] = relay_mode
        if _truthy(_param(node, "zero_rtt_handshake", "zero-rtt-handshake", "zero_rtt")):
            outbound["zero_rtt_handshake"] = True
        heartbeat = _param(node, "heartbeat")
        if heartbeat:
            outbound["heartbeat"] = heartbeat
        return outbound

    raise UnsupportedEgressConfig(f"Unsupported protocol for end-to-end validation: {protocol}")


def build_singbox_config(node: ParsedNode, listen_port: int) -> dict:
    return {
        "log": {"disabled": True},
        "dns": {"servers": [{"type": "local", "tag": "local"}]},
        "inbounds": [
            {
                "type": "mixed",
                "tag": "mixed-in",
                "listen": "127.0.0.1",
                "listen_port": listen_port,
            }
        ],
        "outbounds": [build_singbox_outbound(node)],
        "route": {
            "final": "proxy",
            "auto_detect_interface": True,
            "default_domain_resolver": "local",
        },
    }


def parse_cloudflare_trace(text: str) -> tuple[str | None, str | None]:
    values: dict[str, str] = {}
    for raw in text.splitlines():
        if "=" not in raw:
            continue
        key, value = raw.split("=", 1)
        values[key.strip().lower()] = value.strip()

    ip = values.get("ip") or None
    if ip:
        try:
            ipaddress.ip_address(ip)
        except ValueError:
            ip = None

    country = (values.get("loc") or "").upper()
    if not _COUNTRY_RE.fullmatch(country) or country == "XX":
        country = None
    return ip, country


def _reserve_local_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


async def _wait_until_listening(proc: asyncio.subprocess.Process, port: int, timeout: float) -> bool:
    deadline = asyncio.get_running_loop().time() + timeout
    while asyncio.get_running_loop().time() < deadline:
        if proc.returncode is not None:
            return False
        try:
            _, writer = await asyncio.open_connection("127.0.0.1", port)
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            return True
        except OSError:
            await asyncio.sleep(0.05)
    return False


async def _process_error(proc: asyncio.subprocess.Process) -> str | None:
    if proc.returncode is None:
        return None
    try:
        _, stderr = await proc.communicate()
    except Exception:
        return None
    text = (stderr or b"").decode("utf-8", "ignore").strip()
    return text[-320:] if text else f"sing-box exited with code {proc.returncode}"


async def _stop_process(proc: asyncio.subprocess.Process) -> None:
    if proc.returncode is not None:
        return
    proc.terminate()
    try:
        await asyncio.wait_for(proc.wait(), timeout=1.2)
    except asyncio.TimeoutError:
        proc.kill()
        try:
            await asyncio.wait_for(proc.wait(), timeout=1.0)
        except asyncio.TimeoutError:
            pass


async def validate_egress(
    node: ParsedNode,
    settings: Settings,
    *,
    singbox_binary: str,
    curl_binary: str,
) -> EgressResult:
    started = time.perf_counter()
    try:
        port = _reserve_local_port()
        config = build_singbox_config(node, port)
    except UnsupportedEgressConfig as exc:
        return EgressResult(False, error=str(exc)[:240])
    except Exception as exc:
        return EgressResult(False, error=f"config: {type(exc).__name__}: {exc}"[:240])

    proc: asyncio.subprocess.Process | None = None
    try:
        with tempfile.TemporaryDirectory(prefix="proxypulse-egress-") as tmp:
            config_path = Path(tmp) / "config.json"
            config_path.write_text(json.dumps(config, ensure_ascii=False), encoding="utf-8")

            proc = await asyncio.create_subprocess_exec(
                singbox_binary,
                "run",
                "-c",
                str(config_path),
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
            )
            ready = await _wait_until_listening(proc, port, settings.egress_startup_timeout)
            if not ready:
                err = await _process_error(proc) or "sing-box local proxy did not start in time"
                return EgressResult(False, error=err[:240])

            proxy = f"socks5h://127.0.0.1:{port}"
            request = await asyncio.create_subprocess_exec(
                curl_binary,
                "--fail",
                "--silent",
                "--show-error",
                "--max-time",
                str(settings.egress_timeout),
                "--connect-timeout",
                str(min(settings.egress_timeout, 5.0)),
                "--proxy",
                proxy,
                "--user-agent",
                "ProxyPulse-Egress/1.1",
                settings.egress_trace_url,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    request.communicate(), timeout=settings.egress_timeout + 2.0
                )
            except asyncio.TimeoutError:
                request.kill()
                await request.wait()
                return EgressResult(False, error="egress request timed out")

            if request.returncode != 0:
                error = stderr.decode("utf-8", "ignore").strip() or f"curl exited with code {request.returncode}"
                return EgressResult(False, error=error[-240:])

            ip, country = parse_cloudflare_trace(stdout.decode("utf-8", "ignore"))
            elapsed = round((time.perf_counter() - started) * 1000, 2)
            if not ip:
                return EgressResult(False, elapsed_ms=elapsed, error="egress response did not contain a valid final IP")
            return EgressResult(True, egress_ip=ip, country_code=country, elapsed_ms=elapsed)
    except FileNotFoundError as exc:
        return EgressResult(False, error=f"runtime missing: {exc}"[:240])
    except Exception as exc:
        return EgressResult(False, error=f"{type(exc).__name__}: {exc}"[:240])
    finally:
        if proc is not None:
            await _stop_process(proc)


async def validate_egress_many(
    items: list[tuple[int, ParsedNode]],
    settings: Settings,
    *,
    singbox_binary: str,
    curl_binary: str,
) -> dict[int, EgressResult]:
    semaphore = asyncio.Semaphore(settings.egress_concurrency)

    async def run(item_id: int, node: ParsedNode):
        async with semaphore:
            return item_id, await validate_egress(
                node,
                settings,
                singbox_binary=singbox_binary,
                curl_binary=curl_binary,
            )

    pairs = await asyncio.gather(*(run(*item) for item in items))
    return dict(pairs)
