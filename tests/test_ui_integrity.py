from pathlib import Path
import re

BASE = Path(__file__).resolve().parents[1]
HTML = (BASE / "app/static/index.template.html").read_text(encoding="utf-8")
JS = (BASE / "app/static/app.js").read_text(encoding="utf-8")
CSS = (BASE / "app/static/style.css").read_text(encoding="utf-8")


def test_every_static_button_has_a_supported_action_marker():
    tags = re.findall(r"<button\b[^>]*>", HTML, flags=re.I)
    allowed = (
        'id="refreshBtn"', 'id="themeToggle"', 'data-lang=', 'data-view=',
        'data-theme-choice=', 'data-switch-advanced', 'data-close-qr',
    )
    unsupported = [tag for tag in tags if not any(marker in tag for marker in allowed)]
    assert unsupported == []


def test_static_anchor_controls_have_href_or_runtime_href_owner():
    tags = re.findall(r"<a\b[^>]*>", HTML, flags=re.I)
    unsupported = []
    for tag in tags:
        if 'href=' in tag:
            continue
        if 'id="repoLink"' in tag or 'id="actionsLink"' in tag:
            continue
        unsupported.append(tag)
    assert unsupported == []
    assert "initStaticActions" in JS


def test_theme_switcher_has_all_palettes_and_runtime_application():
    for theme in ("ocean", "aurora", "violet", "sunset", "ruby"):
        assert f"{theme}:" in JS
        assert f'data-theme-choice="{theme}"' in HTML
    assert "Object.entries(palette).forEach" in JS
    assert "root.style.setProperty" in JS
    assert "body.style.background" in JS
    assert "--theme-bg" in CSS


def test_expected_ui_actions_are_wired():
    required = [
        "[data-lang]", "[data-view]", "[data-theme-choice]", "#themeToggle",
        "[data-switch-advanced]", "[data-copy]", "[data-profile]",
        "[data-favorite-country]", "[data-qr]", "[data-close-qr]",
        "refreshBtn",
    ]
    for token in required:
        assert token in JS


def test_view_click_selector_does_not_capture_html_ancestor():
    # html itself owns data-view; using closest('[data-view]') swallows nearly every delegated click.
    assert "closest('[data-view]')" not in JS
    assert "closest('.view-option[data-view]')" in JS


def test_theme_toggle_has_direct_click_listener():
    assert "$('#themeToggle').addEventListener('click'" in JS


def test_compact_summary_has_no_redundant_quick_action_buttons():
    assert 'class="compact-quick-actions"' not in HTML
    assert 'data-switch-advanced' not in HTML


def test_smart_profile_is_repositioned_before_compact_secondary_content():
    assert 'id="smartProfileHome"' in HTML
    assert 'function positionSmartProfile()' in JS
    assert "compactGrid.parentNode.insertBefore(panel,compactGrid)" in JS
    assert "home.parentNode.insertBefore(panel,home.nextSibling)" in JS
    assert "positionSmartProfile();" in JS
