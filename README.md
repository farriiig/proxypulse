# 🌐 ProxyPulse

> **GitHub-native proxy aggregation, monitoring, scoring and subscription publishing — fully automated with GitHub Actions + Pages.**

ProxyPulse collects public proxy configurations, normalizes and semantically deduplicates them, performs bounded **TCP reachability/latency pre-checks**, then runs bounded **end-to-end tunnel validation** on selected reachable configs to discover the final egress IP and country. It tracks reliability, scores nodes, generates curated and country-based subscriptions, and publishes a live GitHub Pages dashboard — without requiring an always-on VPS or database.

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## ⚠️ Validation level

ProxyPulse uses a **two-stage validation model**:

1. Every selected candidate receives a bounded **TCP reachability / latency pre-check**.
2. Up to the configured `egress_test_limit` of TCP-reachable candidates are then started through **sing-box** and used for an actual outbound request. The returned **final egress IP and country code** are captured from Cloudflare trace data.

A reachable TCP port alone still does **not** prove that VLESS, VMess, Trojan, Shadowsocks, Hysteria2 or TUIC authentication works. Only nodes marked as end-to-end verified are included in country subscriptions. TCP latency values remain connection measurements, not full tunnel or game-server benchmarks.

## ⚙️ How it works

```text
settings/sources.txt
        │
        ▼
GitHub Actions · every hour
        │
        ├─ Fetch public sources concurrently
        ├─ Decode + parse supported proxy formats
        ├─ Semantic fingerprinting + deduplication
        ├─ Fair known/new candidate sampling
        ├─ Multi-attempt TCP reachability probes
        ├─ Bounded sing-box end-to-end tunnel validation
        ├─ Final egress IP + country detection
        ├─ Latency + rolling history + jitter tracking
        ├─ General score + TCP gaming score
        ├─ Source reputation + config hygiene analysis
        ├─ Curated + country subscription generation
        │
        ├──────────────► GitHub Pages dashboard
        │
        └──────────────► generated branch
                         state + snapshots + subscriptions
```

The source code stays on **`main`** while generated state and subscription snapshots are stored on a dedicated **`generated`** branch. This keeps automated data updates from conflicting with normal code changes.

## ✨ Features

- 🔌 Parses **VLESS, VMess, Trojan, Shadowsocks, Hysteria2/Hy2 and TUIC**
- 📦 Decodes plain-text and Base64 subscription sources
- 🧬 Semantic deduplication while preserving meaningful Reality/TLS/transport differences
- ⚡ Concurrent source fetching with retry, timeout and response-size limits
- 🧪 Configurable scan cap, probe concurrency, timeout and retry count
- 📡 Multi-attempt TCP reachability and latency pre-checks
- 🌐 Bounded **end-to-end tunnel validation** using sing-box
- 📍 Final egress IP + country detection for successfully validated configs
- 🗺️ Country-based subscriptions generated only from end-to-end verified nodes
- 📈 Rolling uptime, recent reliability and jitter tracking
- 🧠 Node health states: `HEALTHY`, `STABLE`, `RECOVERED`, `NEW`, `DEGRADING`, `WEAK`, `OFFLINE`
- 🏆 General node score and approximate **TCP Gaming Score**
- 🛡️ Static Reality/TLS URI hygiene checks
- 📊 Internal source reliability/reputation scoring
- 🔄 Automated scans every hour with GitHub Actions
- 🌍 Static GitHub Pages dashboard with no backend server
- 📱 Responsive mobile-friendly interface
- 🌐 Bilingual **Persian / English** dashboard with Persian as the default language and persistent browser preference
- 🧭 Dual dashboard modes: **Compact** (default) for quick decisions and **Advanced** for full diagnostics
- 🎨 Persistent color themes: **Ocean, Aurora, Violet, Sunset and Ruby**
- ✨ Refined Compact/Advanced UI hierarchy with grouped utilities, consistent touch targets and keyboard focus states
- 📋 Plain-text + Base64 subscription outputs
- ⭐ Smart `recommended` subscription using verification, score, uptime, jitter and latency
- 🧠 Smart Profile Builder for Balanced, Speed, Gaming, Streaming and Stability goals
- 🔄 Auto-rotating subscription that replaces weak configs on every hourly run
- ❤️‍🔥 Survival Score + consecutive survival streak derived from rolling hourly reachability
- 🛰️ Cached ASN/ISP enrichment with diversity guards for smart/country outputs
- ✅ Tunnel success rate and categorized end-to-end failure reasons
- 🔒 Hard **100-node maximum per published subscription** to keep client apps lightweight
- 📷 Pre-generated QR code for each subscription
- ⭐ Browser-local favorite countries with no account/backend
- 📈 Lightweight rolling history charts for online, latency, verified nodes and countries
- 🟢 Freshness indicator (`Fresh`, `Delayed`, `Stale`) based on the latest run
- 🇮🇷 Compact Iran internet/connectivity snapshot sourced from **Covered.ir** on each hourly run
- 🚀 One-click subscription import buttons for **Incy** and **Happ**
- 🧹 Clean user-facing dashboard focused on metrics, subscriptions, protocol mix and health
- ✅ Automated test workflow
- 📄 MIT licensed

## 🖥️ Dashboard

The public dashboard includes a **فارسی / English** language switcher in the header. Persian is the default on first visit; the selected language is saved locally in the browser and the complete layout switches between RTL and LTR without a page reload.

The default view is **Compact**, which focuses on network quality, recommended configs, selected countries, a lightweight 24-hour trend, Smart Profiles and Iran Internet Status. Users can switch to **Advanced** for the complete metrics, subscription catalog, country list, tunnel intelligence, failure analytics, history, protocol mix and health details. View mode and theme are saved locally in the browser.

The dashboard shows the latest generated snapshot, including:

- discovered semantic-unique nodes
- nodes scanned in the current run
- online count and online rate
- average TCP latency
- average score
- online Reality count
- curated subscription endpoints
- end-to-end verified country subscriptions
- end-to-end test / geolocation counts
- protocol distribution
- current health-state distribution
- rolling hourly history charts, including tunnel success and Survival Score
- Smart Profile Builder + rotating subscription
- tunnel failure-reason summary and ASN diversity metrics
- snapshot freshness status
- favorite country pinning stored locally in the browser
- compact Iran connectivity summary (overall state, domestic/international health and active incidents)

The dashboard intentionally does **not** expose the internal source list or individual Top Nodes table in the user-facing UI.

Live dashboard:

```text
https://farriiig.github.io/proxypulse-mvp/
```


### 🇮🇷 Iran connectivity snapshot

The dashboard includes a compact Iran internet-status section sourced from **Covered.ir**. ProxyPulse fetches the public Covered dashboard once per workflow run and stores a small static snapshot containing the overall state, monitored domestic/international route health, active incident count and Covered's last-measured time.

This is an informational summary of the routes Covered monitors; it does **not** claim to represent every ISP, city, user or network in Iran. If the source cannot be fetched or parsed, ProxyPulse keeps publishing normally and shows the status snapshot as unavailable instead of failing the scan.

## 📡 Generated subscriptions

Each successful run publishes both normal text and Base64 variants. **Every consumer-facing subscription is hard-capped at 100 configs**, even if more healthy candidates are available.

| Subscription | Purpose |
|---|---|
| `recommended` | Smart current selection prioritizing verification, Survival Score, score, uptime, jitter and latency |
| `rotating` | Auto-refreshed healthy pool; weak configs are replaced on every run and ASN/country concentration is limited |
| `profile-balanced` | Balanced smart profile |
| `profile-speed` | Lowest-latency-oriented smart profile |
| `profile-gaming` | Gaming Score + low latency/jitter profile |
| `profile-streaming` | Verified, high-survival, stable-jitter profile |
| `profile-stability` | Highest Survival Score / uptime profile |
| `verified` | Nodes that passed the actual end-to-end tunnel/final-IP check |
| `best100` | Top 100 currently reachable nodes by score |
| `stable` | Reachable nodes meeting score + historical uptime thresholds |
| `fast` | Reachable nodes below the configured TCP latency threshold |
| `gaming` | Low-latency nodes meeting the TCP Gaming Score threshold |
| `healthy` | Nodes currently classified as `HEALTHY` or `RECOVERED` |
| `reality` | Reachable nodes using Reality security |
| `online` | All currently reachable tested nodes |
| `all` | All candidates selected for the current bounded scan, including currently unreachable nodes |
| `vless`, `vmess`, `trojan`, `ss`, `hysteria2`, `tuic` | Reachable nodes grouped by protocol when present |
| `countries/<cc>` | End-to-end verified nodes grouped by final egress country, for example `countries/de.txt` |

Examples:

```text
https://farriiig.github.io/proxypulse-mvp/subscriptions/recommended.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/verified.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/best100.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/stable.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/fast.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/gaming.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/reality.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/online.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/countries/de.txt
```

Base64 variants use the same name with `.base64.txt`, for example:

```text
https://farriiig.github.io/proxypulse-mvp/subscriptions/stable.base64.txt
```

### 📲 Incy & Happ import

Each subscription card on the dashboard includes:

- **Incy** — opens the subscription URL through the Incy custom URI scheme
- **Happ** — opens the subscription URL through the Happ custom URI scheme
- **QR** — opens a locally generated QR code for moving the subscription to another device
- **Copy** — copies the public subscription URL
- **Open** — opens the raw subscription in the browser

The corresponding client must be installed on the device for its custom URI button to work.

### 🌍 End-to-end country verification

After the normal TCP pre-check, ProxyPulse takes up to `egress_test_limit` of the best currently reachable candidates and validates them through a temporary local **sing-box** instance. A request is sent through the actual proxy tunnel to Cloudflare's trace endpoint.

A node is considered end-to-end verified only when the request succeeds and a valid **final egress IP** is returned. When a valid country code is also returned, the node is added to a country subscription such as:

```text
subscriptions/countries/de.txt
subscriptions/countries/nl.txt
subscriptions/countries/us.txt
```

The dashboard exposes these under **Verified Countries**. Every country card includes **Favorite**, **Incy**, **Happ**, **QR**, **Copy**, and **Open** actions. Favorites are stored only in the browser via `localStorage`.

Country grouping is based on the observed final egress IP of the successful tunnel request — **not** on the hostname, source URL, or the proxy server's DNS name.

## 🚀 First-time setup

### 1. Upload the repository

Extract the project and upload **the contents of the project folder** to the repository root. Make sure the hidden `.github/` directory is included.

Expected root structure:

```text
.github/
app/
settings/
tests/
FIRST_RUN.md
LICENSE
README.md
pytest.ini
requirements.txt
```

### 2. Enable GitHub Pages

Open:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

### 3. Allow workflow write access

The scan workflow needs write access to publish the `generated` branch.

If branch publishing fails, open:

```text
Settings → Actions → General → Workflow permissions
```

Then enable:

```text
Read and write permissions
```

### 4. Run the first scan

Open:

```text
Actions → ProxyPulse Scan + Pages → Run workflow
```

After the workflow succeeds, GitHub Pages will serve the dashboard at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

## 🔗 Add or remove sources

Edit only:

```text
settings/sources.txt
```

Use one public source URL per line. Lines beginning with `#` are ignored.

Example:

```text
# Raw subscription
https://raw.githubusercontent.com/user/repo/main/subscription.txt

# Public Telegram web page
https://t.me/s/public_channel
```

Public Telegram pages are usable when the returned page contains supported proxy URIs.

## 🛠️ Configuration

Main settings live in:

```text
settings/config.json
```

Default values:

```json
{
  "scan_limit": 800,
  "source_concurrency": 8,
  "probe_concurrency": 80,
  "probe_timeout": 4.0,
  "probe_attempts": 2,
  "http_timeout": 15.0,
  "max_source_bytes": 8000000,
  "history_samples": 24,
  "state_retention_days": 30,
  "stable_min_score": 78.0,
  "stable_min_uptime": 75.0,
  "fast_max_latency_ms": 100.0,
  "gaming_max_latency_ms": 140.0,
  "top_nodes_export": 500,
  "egress_test_limit": 200,
  "egress_concurrency": 8,
  "egress_timeout": 10.0,
  "egress_startup_timeout": 2.5,
  "egress_trace_url": "https://www.cloudflare.com/cdn-cgi/trace",
  "subscription_max_nodes": 100,
  "dashboard_history_samples": 168,
  "asn_enrichment_limit": 30,
  "asn_max_per_subscription": 20,
  "country_max_per_subscription": 30,
  "user_agent": "ProxyPulse/1.3 (+GitHub Actions)"
}
```

`ASN_ENRICHMENT_LIMIT` is bounded to at most 40 new lookups per run (30 by default). ASN results are cached on the `generated` branch for 30 days, so the hourly workflow normally reuses existing enrichment instead of querying the same egress IP again. The smart outputs apply configurable per-ASN and per-country concentration caps.

`SCAN_LIMIT` and `EGRESS_TEST_LIMIT` can also be overridden manually from the **Run workflow** form. `subscription_max_nodes` is defensively clamped to a maximum of **100** by the application, so a misconfigured environment variable cannot publish a larger client subscription. The default egress limit is intentionally smaller than the TCP scan limit because end-to-end validation launches a real proxy client and performs an outbound request for each tested config.

## 🧮 Scoring

### General score

Only currently reachable nodes receive a non-zero general score:

```text
45% historical availability
30% current TCP latency
15% rolling jitter / stability
10% static config quality
```

### TCP Gaming Score

```text
50% TCP latency
25% rolling jitter
25% recent reachability
```

The Gaming Score is a ranking aid based on TCP measurements. It does **not** measure UDP game traffic, packet loss through the tunnel, routing quality to a specific game server, or protocol authentication success.

### Survival Score

Survival Score is a rolling reachability metric that combines recent success rate with the current consecutive-success streak. It is designed to prefer configs that stay alive across repeated hourly scans rather than nodes that look good in only one snapshot. It is a TCP/reachability survival signal, not a guarantee of future end-to-end availability.


## 🩺 Health states

Health is derived from current reachability plus recent historical behavior. Depending on node history, a node can be classified as:

```text
HEALTHY
STABLE
RECOVERED
NEW
DEGRADING
WEAK
OFFLINE
```

These states are intended to help distinguish newly discovered nodes from consistently reachable, recently recovered, degrading or unavailable nodes.

## 🧾 Source reputation

ProxyPulse internally calculates a 0–100 source reputation score using factors such as:

- historical fetch reliability
- valid configuration ratio
- unique contribution ratio
- fetch response time

This information is used internally and preserved in generated data, but the source list is not displayed on the public dashboard.

## 🎨 Dashboard development

Edit only the source files:

```text
app/static/index.template.html
app/static/style.css
app/static/app.js
```

Do **not** manually edit generated website output. During each run, ProxyPulse embeds the CSS and JavaScript directly into a self-contained:

```text
build/site/index.html
```

This avoids asset-path issues when deploying to GitHub Pages.

## 💻 Local development

TCP collection/scoring works with the Python dependencies alone. End-to-end country validation additionally requires `sing-box` and `curl` to be available in `PATH` (the GitHub Actions workflow installs the pinned sing-box runtime automatically).

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -q
python -m app.pipeline
python -m http.server 8080 -d build/site
```

Then open:

```text
http://localhost:8080
```

Windows PowerShell activation:

```powershell
.venv\Scripts\Activate.ps1
```

## 🌿 Repository branches

```text
main
└─ source code, settings, tests and workflows

generated
└─ pipeline state, source state, data snapshots and generated subscriptions
```

Keeping generated output separate from `main` prevents recurring workflow commits from colliding with normal development changes.

## 🗺️ Roadmap

Possible future improvements:

- broader protocol/transport compatibility for end-to-end validation
- dedicated Reality handshake diagnostics
- multiple end-to-end validation targets
- country and ASN enrichment
- route-quality probes from multiple regions
- packet-loss-aware testing
- Mihomo and sing-box structured exporters
- adaptive source scan intervals

## 🔐 Responsible use

Use ProxyPulse only with sources, infrastructure and networks you are authorized to access. Keep scan frequency, timeouts and concurrency at reasonable levels. End-to-end verification creates real outbound connections through tested proxies, so keep `egress_test_limit` and `egress_concurrency` bounded.

## 📄 License

Released under the [MIT License](LICENSE).

---

### 🧷 Suggested GitHub About

```text
🌐 GitHub-native proxy monitor: TCP + egress checks, country subscriptions, scoring, history & one-click Incy/Happ import. ⚡📊
```

© 2026 farriiig
