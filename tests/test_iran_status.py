from app.iran_status import parse_covered_status


def test_parse_covered_status_summary():
    html = """
    <html><body>
      <h1>Iran Network Connectivity Status</h1>
      <section>Overall network status: Incident.</section>
      <p>Of 31 monitored domestic routes, 97% are reported healthy.</p>
      <p>Of 54 monitored international routes, 93% are reported healthy.</p>
      <p>Active incidents: 0.</p>
      <p>Last measured: 15:00 · All times are Iran Standard Time (IRST).</p>
    </body></html>
    """
    result = parse_covered_status(html)
    assert result["available"] is True
    assert result["status"] == "incident"
    assert result["domestic_routes"] == 31
    assert result["domestic_healthy_percent"] == 97
    assert result["international_routes"] == 54
    assert result["international_healthy_percent"] == 93
    assert result["active_incidents"] == 0
    assert result["last_measured_irst"] == "15:00"


def test_parse_covered_status_fallback_cards():
    html = """
    <div>Overall status Incident Some routes are disrupted</div>
    <div>Domestic routes 31 84% healthy</div>
    <div>International routes 54 98% healthy</div>
    """
    result = parse_covered_status(html)
    assert result["available"] is True
    assert result["status"] == "incident"
    assert result["domestic_healthy_percent"] == 84
    assert result["international_healthy_percent"] == 98
