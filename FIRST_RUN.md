# First run checklist

1. Upload all files to the repository root, including `.github/`.
2. GitHub → **Settings → Pages → Source → GitHub Actions**.
3. GitHub → **Actions → ProxyPulse Scan + Pages → Run workflow**.
4. Wait for **Deploy GitHub Pages** to turn green.
5. Open `https://YOUR-USERNAME.github.io/YOUR-REPOSITORY/`.
6. Add or remove proxy sources only in `settings/sources.txt`.

If **Publish generated snapshot branch** cannot push, enable:

`Settings → Actions → General → Workflow permissions → Read and write permissions`.

The dashboard source lives in `app/static/`. Do not look for or edit a committed `docs/` directory; the site is built dynamically during Actions.
