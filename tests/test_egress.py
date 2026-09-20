from app.egress import build_singbox_config, build_singbox_outbound, parse_cloudflare_trace
from app.parser import parse_uri


def test_parse_cloudflare_trace_extracts_final_ip_and_country():
    ip, country = parse_cloudflare_trace("fl=123\nip=203.0.113.10\nloc=DE\nwarp=off\n")
    assert ip == "203.0.113.10"
    assert country == "DE"


def test_parse_cloudflare_trace_rejects_invalid_values():
    ip, country = parse_cloudflare_trace("ip=not-an-ip\nloc=XX\n")
    assert ip is None
    assert country is None


def test_build_reality_vless_singbox_config():
    node = parse_uri(
        "vless://11111111-1111-1111-1111-111111111111@example.com:443"
        "?security=reality&sni=www.cloudflare.com&fp=chrome&pbk=testPublicKey"
        "&sid=01234567&type=ws&host=cdn.example.com&path=%2Fws"
    )
    assert node is not None
    config = build_singbox_config(node, 18080)
    outbound = config["outbounds"][0]
    assert config["inbounds"][0]["listen_port"] == 18080
    assert outbound["type"] == "vless"
    assert outbound["uuid"] == "11111111-1111-1111-1111-111111111111"
    assert outbound["tls"]["server_name"] == "www.cloudflare.com"
    assert outbound["tls"]["reality"]["public_key"] == "testPublicKey"
    assert outbound["transport"]["type"] == "ws"
    assert outbound["transport"]["path"] == "/ws"
    assert outbound["transport"]["headers"]["Host"] == "cdn.example.com"


def test_build_tuic_outbound():
    node = parse_uri(
        "tuic://11111111-1111-1111-1111-111111111111:secret@example.com:443"
        "?sni=example.com&alpn=h3&congestion_control=bbr"
    )
    assert node is not None
    outbound = build_singbox_outbound(node)
    assert outbound["type"] == "tuic"
    assert outbound["uuid"] == "11111111-1111-1111-1111-111111111111"
    assert outbound["password"] == "secret"
    assert outbound["congestion_control"] == "bbr"
    assert outbound["tls"]["server_name"] == "example.com"
