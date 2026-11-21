# PAARA Life Membership Proclamation Generator (W6OTX)

A zero-build, static browser application for authoring and exporting official **Palo Alto Amateur Radio Association (PAARA)** Special Life Membership Proclamations as true-vector PDFs.

## Features

- **4 Live Switchable PAARA Themes**:
  1. **Classic Burgundy Guilloché (Vector)** — Infinite-resolution vector recreation of PAARA's traditional burgundy scalloped guilloché frame, auto-proportioned to any page size.
  2. **Original Archive Border (2019–2026)** — Classic raster certificate border matching PAARA's historical proclamations.
  3. **Formal Burgundy & Gold** — Warm parchment stock with deep maroon architectural borders, antique gold double-filigree pinlines, and corner medallions.
  4. **PAARA Red & Black Heritage (1937)** — Styled in the colors of the 1937 W6OTX club emblem (`#D22329` lightning red + `#141414` charcoal black).
- **Page Size Presets**: **US Legal (`8.5" × 14"`)** (used in 2019–2024), **Tabloid (`11" × 17"`)** (used in 2026), and **US Letter (`8.5" × 11"`)**.
- **Deterministic Live Preview + True-Vector PDF Export**:
  - Instant 60fps SVG preview sharing exact TrueType glyph metrics (`Gelasio`, metric-compatible SIL OFL equivalent of `Georgia`) with `pdf-lib`.
  - One-click `.pdf` download with selectable vector text, embedded TrueType fonts, crisp PAARA logo, and high-DPI cropped photo — no browser Print-to-PDF margin or paper-size quirks.
  - Built-in **"View Exact Generated PDF"** tab to inspect the binary PDF inside the browser before downloading.
- **Auto-Fit & Granular Typography Controls**:
  - Automatic 1-page fitting for short or long citations, or manual sliders for citation font size, bestowal/name scale, and line spacing with live overflow detection.
- **Photo Upload, Drag-and-Drop & Clipboard Paste (`⌘V` / `Ctrl+V`)**:
  - Aspect ratio presets (`Original`, `4:3`, `16:10`, `1:1`, `4:5`), zoom, pan sliders, and direct drag-to-pan on the live preview.
- **Standardized Signatories (`data/signatories.json`)**:
  - Pre-populated with PAARA Boards from 2019–2026 (defaulting to the 2026 Officers & Directors), editable live in the browser with 1-click export of updated `signatories.json`.
- **Historical Presets & Shareable `.json` Drafts**:
  - Includes complete sample presets for all 6 PAARA Life Membership proclamations (2019–2026, with honoree photos) plus a blank template and `.json` draft import/export. (Local reference PDFs in `references/` are gitignored; originals live on `https://paara.org/membership.html`.)

## Opening Locally (No Server Required)

You can **double-click `index.html` directly in Finder (`file://`)** — `js/offline-bundle.js` provides embedded data-URI fallbacks for all fonts, logos, borders, and historical presets so live preview and PDF export work offline without a web server.

When hosted over HTTP/HTTPS (such as GitHub Pages, `paara.org`, or `python3 -m http.server 8080`), the app automatically loads live `data/signatories.json` and `data/examples.json` first. If you add new static files and want to refresh the `file://` fallback bundle, run:

```bash
python3 scripts/pack-offline-assets.py
```

## Publishing to GitHub Pages (`PAARA-org/proclamation-generator`)

This repository is pre-configured for **GitHub Pages** (all asset paths are relative, so subpath URLs like `https://paara.org/proclamation-generator/` or `https://paara-org.github.io/proclamation-generator/` work automatically):

1. Push `main` to `git@github.com:PAARA-org/proclamation-generator.git`:
   ```bash
   git push -u origin main
   ```
2. In GitHub, open **Settings → Pages**:
   - Under **Build and deployment → Source**, select **GitHub Actions** (recommended — uses `.github/workflows/deploy-pages.yml` to automatically refresh the offline bundle and deploy whenever `main` or `data/signatories.json` is updated), *or* select **Deploy from a branch (`main` / `/ (root)`)** (supported via `.nojekyll`).
   - Because `PAARA-org/paara-org.github.io` uses `paara.org`, GitHub Pages will serve this project directly at **`https://paara.org/proclamation-generator/`**.

## Updating Signatories Each Year

After annual club elections, add the new board roster at the top of `data/signatories.json` and update `"defaultRosterId"` (or edit the signatories directly in the web UI and click **Export `signatories.json`**). No Node/npm build step is required — commit and push directly to GitHub Pages or `paara.org`.

## License & Third-Party Credits

- **Repository License**: Released under the **BSD 3-Clause License** (*Copyright (c) 2026, PAARA.org*) — see `LICENSE`.
- **Fonts (`assets/fonts/`)**: `Gelasio` (*Copyright 2022 The Gelasio Project Authors*) and `Cinzel` (*Copyright 2020 The Cinzel Project Authors*) are licensed under the **SIL Open Font License 1.1** — see `assets/fonts/OFL.txt`.
- **Vendored Libraries (`vendor/`)**: `pdf-lib` and `@pdf-lib/fontkit` are licensed under the **MIT License** — see `vendor/THIRD_PARTY_LICENSES.txt`.
- **PAARA Emblem (`assets/logos/`)**: Official Palo Alto Amateur Radio Association (W6OTX) club logos from `https://github.com/PAARA-org/logos`.

