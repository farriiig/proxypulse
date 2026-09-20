# ProxyPulse

**ProxyPulse is a GitHub-native proxy aggregation and monitoring platform that collects public proxy configurations, semantically deduplicates them, performs bounded TCP reachability/latency pre-checks, tracks reliability over time, scores nodes, publishes curated subscriptions, and deploys a live GitHub Pages dashboard.**

> Validation in v1 is intentionally **TCP-level**. A reachable port does **not** prove that VLESS, VMess, Trojan, Shadowsocks, Hysteria2 or TUIC authentication/end-to-end proxying works. The dashboard states this explicitly to avoid false confidence.

## Why this edition is different

This release is designed specifically for GitHub and does **not** require an always-on VPS, FastAPI server or database service.

```text
settings/sources.txt
        │
        ▼
GitHub Actions — every 3 hours
        │
        ├─ concurrent source fetching
        ├─ protocol parsing
        ├─ semantic fingerprint / dedupe
        ├─ fair known/new node sampling
        ├─ multi-attempt TCP probes
        ├─ rolling history + uptime + jitter
        ├─ general score + TCP gaming score
        ├─ source reputation
        ├─ static config hygiene checks
        ├─ subscription generation
        │
        ├──────────────► GitHub Pages dashboard
        │
        └──────────────► generated branch
                         history + snapshots + subscriptions
```

The generated snapshot is written to a dedicated **`generated` branch**, so automated scans do not fight with your edits on `main`.

## Highlights

- VLESS, VMess, Trojan, Shadowsocks, Hysteria2/Hy2 and TUIC parsing
- Base64 subscription decoding
- semantic deduplication that keeps meaningful Reality/TLS/transport differences
- concurrent source fetching with retry and size limits
- configurable scan cap and concurrency
- two TCP probe attempts by default
- rolling availability history
- median TCP latency and rolling jitter estimate
- `HEALTHY`, `STABLE`, `RECOVERED`, `NEW`, `DEGRADING`, `WEAK`, `OFFLINE` states
- general score and approximate TCP gaming score
- source reliability/reputation
- static Reality/TLS URI hygiene checks
- curated subscriptions: Stable, Fast, Gaming, Healthy, Reality, Online and per-protocol
- plain-text and Base64 subscription variants
- self-contained GitHub Pages dashboard — CSS and JS are embedded into the generated HTML
- Top Nodes is collapsed by default
- responsive mobile dashboard
- MIT license
- Node.js 24-compatible official GitHub Actions

## First-time setup

### 1. Upload the repository

Extract this ZIP and upload **the contents of the folder** to your repository root. Make sure the hidden `.github` directory is included.

The repository root should look like:

```text
.github/
app/
settings/
tests/
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

### 3. Check workflow permissions

Normally the workflow-level permission is enough. If the `generated` branch cannot be created, open:

```text
Settings → Actions → General → Workflow permissions
```

and allow **Read and write permissions**.

### 4. Run the first scan

Open:

```text
Actions → ProxyPulse Scan + Pages → Run workflow
```

After the first successful run your dashboard is:

```text
https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/
```

For your current repository this would be:

```text
https://farriiig.github.io/proxypulse-mvp/
```

## Subscription URLs

After a successful run, examples are:

```text
https://farriiig.github.io/proxypulse-mvp/subscriptions/stable.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/fast.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/gaming.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/reality.txt
https://farriiig.github.io/proxypulse-mvp/subscriptions/online.txt
```

Base64 variants are also generated, for example:

```text
https://farriiig.github.io/proxypulse-mvp/subscriptions/stable.base64.txt
```

The same outputs are preserved in the `generated` branch for history/persistence.

## Add sources

Edit only:

```text
settings/sources.txt
```

One public source URL per line. Comments beginning with `#` are ignored.

Examples:

```text
https://raw.githubusercontent.com/user/repo/main/subscription.txt
https://t.me/s/public_channel
```

Public Telegram web pages work when the page response contains supported proxy URIs.

## Change scan settings

Edit:

```text
settings/config.json
```

Important options:

```json
{
  "scan_limit": 800,
  "source_concurrency": 8,
  "probe_concurrency": 80,
  "probe_timeout": 4.0,
  "probe_attempts": 2,
  "history_samples": 24,
  "state_retention_days": 30,
  "stable_min_score": 78.0,
  "gaming_max_latency_ms": 140.0
}
```

`SCAN_LIMIT` can also be overridden from the **Run workflow** form.

## Edit the dashboard

Edit the source files only:

```text
app/static/index.template.html
app/static/style.css
app/static/app.js
```

Do **not** manually edit generated website files. The workflow creates a self-contained `build/site/index.html` each run by embedding the CSS and JavaScript directly into the page. This avoids broken asset paths on GitHub Pages.

## Scoring

General score for currently reachable nodes:

```text
45% historical availability
30% current TCP latency
15% rolling jitter/stability
10% static config quality
```

The TCP Gaming Score is an approximation based on:

```text
50% latency
25% jitter
25% recent reachability
```

It is **not** a UDP game-server benchmark and does not measure packet loss through the proxy tunnel.

## Source reputation

Each source gets a 0–100 reputation score based on:

- historical fetch reliability
- valid configuration ratio
- unique contribution ratio
- fetch response time

## Local development

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

On Windows PowerShell use:

```powershell
.venv\Scripts\Activate.ps1
```

## Repository branches

- `main` — source code and settings
- `generated` — Action-produced state, data snapshots and subscriptions

Keeping generated data away from `main` avoids the push/rebase conflict that commonly happens when a workflow modifies the same branch while you are editing it.

## Roadmap

Potential v1.x/v2 improvements:

- Xray-core protocol-level validation
- sing-box protocol-level validation
- Reality handshake analyzer
- country/ASN enrichment
- route-quality probes from multiple regions
- Mihomo and sing-box structured exporters
- adaptive source scan intervals

## Responsible use

Use ProxyPulse only with sources, infrastructure and networks you are authorized to access. Keep scan frequency, timeouts and concurrency reasonable.

---

## Suggested GitHub About

```text
Smart GitHub-native proxy aggregation, TCP pre-checks, scoring, history and automated subscription publishing with a live Pages dashboard.
```

---

© 2026 farriiig. Released under the MIT License.
