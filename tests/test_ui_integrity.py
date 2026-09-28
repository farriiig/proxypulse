from pathlib import Path
import re

BASE = Path(__file__).resolve().parents[1]
HTML = (BASE / "app/static/index.template.html").read_text(encoding="utf-8")
JS = (BASE / "app/static/app.js").read_text(encoding="utf-8")
CSS = (BASE / "app/static/style.css").read_text(encoding="utf-8")


def test_every_static_button_has_a_supported_action_marker():
    tags = re.findall(r"<button\b[^>]*>", HTML, flags=re.I)
    allowed = (
        'id="refreshBtn"', 'id="themeToggle"', 'id="moreToggle"', 'data-lang=', 'data-view=',
        'data-theme-choice=', 'data-switch-advanced', 'data-close-qr', 'id="appDownloadToggle"', 'data-close-app-downloads',
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
        "[data-lang]", "[data-view]", "[data-theme-choice]", "#themeToggle", "#moreToggle",
        "[data-switch-advanced]", "[data-copy]", "[data-profile]",
        "[data-favorite-country]", "[data-qr]", "[data-close-qr]", "#appDownloadToggle", "[data-close-app-downloads]",
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


def test_compact_app_download_popover_is_in_page_and_same_tab():
    assert 'id="appDownloadToggle"' in HTML
    assert 'id="appDownloadPopover"' in HTML
    block = HTML.split('id="appDownloadPopover"', 1)[1].split('id="qrModal"', 1)[0]
    assert 'target="_blank"' not in block
    assert 'toggleAppDownloads' in JS
    assert 'closeAppDownloads' in JS


def test_compact_primary_actions_are_touch_sized():
    assert '.compact-recommended-actions .endpoint-actions a' in CSS
    assert 'min-height:38px' in CSS
    assert 'min-height:42px' in CSS


def test_mobile_compact_recommended_is_rtl_right_aligned():
    assert 'html[dir="rtl"] .compact-recommended-copy' in CSS
    assert 'text-align:right!important' in CSS
    assert 'justify-items:end!important' in CSS


def test_mobile_compact_actions_use_non_overlapping_grid():
    assert 'grid-template-columns:repeat(3,minmax(0,1fr))!important' in CSS
    assert 'width:100%!important' in CSS
    assert 'min-width:0!important' in CSS


def test_compact_recommended_uses_three_independent_zones():
    assert 'class="compact-recommended-tools"' not in HTML
    assert 'id="compactRecommendedActions"' in HTML
    assert 'id="appDownloadToggle"' in HTML
    assert 'id="compactRecommendedCopy"' in HTML
    assert 'v1.5.9 canonical compact footer row' in CSS
    assert 'grid-template-areas:"actions notice copy"' in CSS
    assert 'v1.5.8 canonical compact recommendation layout' not in CSS


def test_header_utility_menu_is_wired_and_contains_real_links():
    assert 'id="moreToggle"' in HTML
    assert 'id="moreMenu"' in HTML
    assert 'function toggleMoreMenu' in JS
    assert "$('#moreToggle').addEventListener('click'" in JS
    assert 'id="repoLink"' in HTML and 'id="actionsLink"' in HTML


def test_stable_ui_polish_has_accessible_focus_and_touch_targets():
    assert 'v1.6.0 Stable UI polish' in CSS
    assert ':focus-visible' in CSS
    assert 'min-height:44px' in CSS
    assert '--radius-control:10px' in CSS
    assert '--space-4:16px' in CSS


def test_bilingual_compact_copy_is_polished():
    assert "compactPulseTitle:'وضعیت شبکه'" in JS
    assert "recommended:'اشتراک پیشنهادی'" in JS
    assert "smartTitle:'هدف اتصال‌تان را انتخاب کنید'" in JS
    assert "compactPulseTitle:'Network status'" in JS
    assert "recommended:'Recommended subscription'" in JS
    assert "smartTitle:'Choose your connection goal'" in JS


def test_mobile_theme_menu_stacks_above_more_controls():
    assert 'v1.6.1 RTL/mobile controls hotfix' in CSS
    assert '.theme-control{position:relative;z-index:1000!important}' in CSS
    assert '.theme-menu{z-index:1010!important}' in CSS
    assert '.more-control{z-index:700!important}' in CSS


def test_compact_country_imports_share_primary_action_classes():
    assert 'class="app-import app-incy"' in JS
    assert 'class="app-import app-happ"' in JS
    assert '.compact-action-set .app-import' in CSS
    assert 'min-height:44px!important' in CSS


def test_rtl_recommended_copy_has_full_width_right_alignment():
    assert 'html[dir="rtl"] .compact-recommended-copy>*' in CSS
    assert 'text-align:right!important' in CSS
    assert 'width:100%!important' in CSS


def test_mobile_view_switch_is_content_fit_not_fixed_grid():
    assert '.view-switch{width:max-content!important;min-width:0!important' in CSS
    assert 'display:flex!important;flex-wrap:wrap!important' in CSS
