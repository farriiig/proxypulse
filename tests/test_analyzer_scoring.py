from app.analyzer import analyze_config
from app.parser import parse_uri
from app.scoring import calculate_score, gaming_score


def test_reality_missing_key_is_flagged():
    n = parse_uri('vless://abc@example.com:443?security=reality&sni=example.org')
    assert n
    result = analyze_config(n)
    assert result['config_quality'] < 100
    assert any('public key' in x.lower() for x in result['issues'])


def test_scores_are_bounded():
    score = calculate_score(reachable=True, latency_ms=50, uptime=95, jitter_ms=5, config_quality=100)
    game = gaming_score(reachable=True, latency_ms=50, jitter_ms=5, recent_success_rate=95)
    assert 0 <= score <= 100
    assert 0 <= game <= 100
