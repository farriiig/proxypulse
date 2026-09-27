from app.pipeline import classify_status, limit_subscription_nodes, read_sources, select_candidates, source_reputation
from app.parser import parse_uri
from app.settings import get_settings


def test_classify_offline():
    assert classify_status(reachable=False, score=0, latency_ms=None, previous={"score":90}) == "OFFLINE"


def test_classify_recovered():
    assert classify_status(reachable=True, score=80, latency_ms=70, previous={"run_count":3,"score":0,"reachable":False}) == "RECOVERED"


def test_classify_degrading_on_score_drop():
    assert classify_status(reachable=True, score=60, latency_ms=80, previous={"run_count":4,"score":90,"latency_ms":70,"reachable":True}) == "DEGRADING"


def test_read_sources_ignores_comments_duplicates_and_invalid(tmp_path):
    p = tmp_path / "sources.txt"
    p.write_text("# x\nhttps://a.test/x\nhttps://a.test/x\ninvalid\nhttps://b.test/y\n")
    assert read_sources(p) == ["https://a.test/x", "https://b.test/y"]


def test_source_reputation_is_bounded():
    assert 0 <= source_reputation(reliability=100, valid=100, fetched=100, unique=100, fetch_ms=100) <= 100


def test_candidate_selection_respects_limit():
    parsed = {}
    for i in range(20):
        n = parse_uri(f'vless://id{i}@example{i}.com:443?security=tls')
        assert n
        parsed[n.fingerprint] = n
    selected = select_candidates(parsed, {}, 7, "bucket")
    assert len(selected) == 7


def test_subscription_cap_never_exceeds_100():
    nodes = [{"raw_uri": f"vless://{i}"} for i in range(150)]
    assert len(limit_subscription_nodes(nodes, 500)) == 100
    assert len(limit_subscription_nodes(nodes, 80)) == 80


def test_subscription_setting_is_hard_clamped(monkeypatch):
    monkeypatch.setenv("SUBSCRIPTION_MAX_NODES", "500")
    assert get_settings().subscription_max_nodes == 100
