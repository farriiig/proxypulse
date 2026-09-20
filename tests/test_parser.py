import base64
import json

from app.parser import extract_uris, parse_uri


def test_vless_fingerprint_ignores_query_order_and_name():
    a = parse_uri('vless://abc@example.com:443?security=reality&type=tcp&pbk=key&sni=example.org#A')
    b = parse_uri('vless://abc@example.com:443?sni=example.org&pbk=key&type=tcp&security=reality#B')
    assert a and b and a.fingerprint == b.fingerprint


def test_vless_fingerprint_keeps_reality_public_key_distinct():
    a = parse_uri('vless://abc@example.com:443?security=reality&pbk=key1&sni=example.org')
    b = parse_uri('vless://abc@example.com:443?security=reality&pbk=key2&sni=example.org')
    assert a and b and a.fingerprint != b.fingerprint


def test_vmess_parse():
    obj = {"v":"2","ps":"demo","add":"example.com","port":"443","id":"uuid","net":"ws","tls":"tls","path":"/x"}
    payload = base64.urlsafe_b64encode(json.dumps(obj).encode()).decode().rstrip('=')
    n = parse_uri('vmess://' + payload)
    assert n and n.protocol == 'vmess' and n.host == 'example.com' and n.port == 443 and n.security == 'tls'


def test_extract_base64_subscription():
    content = 'vless://abc@example.com:443?security=tls#x\ntrojan://pw@example.org:443#y\n'
    encoded = base64.b64encode(content.encode()).decode()
    out = extract_uris(encoded)
    assert len(out) == 2
