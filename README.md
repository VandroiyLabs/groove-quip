# Groove Quip

[![License](https://img.shields.io/github/license/VandroiyLabs/groove-quip?label=license)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/VandroiyLabs/groove-quip?style=flat-square)](https://github.com/VandroiyLabs/groove-quip/stargazers)
[![Deploy to GitHub Pages](https://img.shields.io/github/actions/workflow/status/VandroiyLabs/groove-quip/pages.yml?branch=main&style=flat-square)](https://github.com/VandroiyLabs/groove-quip/actions/workflows/pages.yml)
[![GitHub issues](https://img.shields.io/github/issues/VandroiyLabs/groove-quip?style=flat-square)](https://github.com/VandroiyLabs/groove-quip/issues)

[**Open the app now!**](https://vandroiylabs.github.io/groove-quip/)

An open-source, touch-first music notation editor that runs entirely in the browser. Built for fast note entry on an iPad with Apple Pencil.

**Modes:** melody, piano (grand staff), drums (tap grid with an extensible kit).
**Features:** chord symbols, rests, sharps/flats, editable auto-tablature (guitar/bass), pen annotations, per-measure zoom, undo, PNG and PDF export, save/open as JSON. Scores autosave in the browser.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Refresh About page screenshots
To regenerate the browser screenshots used by the About page:

1. Install dependencies and Chromium once:
   ```
   npm install
   npx playwright install --with-deps chromium
   ```
2. Start the local app with `python3 -m http.server 8000`.
3. In another terminal, run:
   ```
   npm run screenshots:about
   ```

The command replaces the images in `assets/screenshots/` with fresh examples from clean browser storage and scripted interactions at a fixed portrait iPad viewport (768 × 1024 CSS pixels, 2× device scale). Screenshots 03 and 04 are cropped to the top three quarters of that viewport to reduce unused space while retaining the same width and aspect framing. The patterns showcase is a melody with two named two-bar patterns. Repeated runs with the same Chromium build and host produce byte-identical PNGs; different browser or operating-system versions may rasterize system fonts differently. Set `APP_URL` to capture from another local server, or `SCREENSHOT_DIR` to preview the generated images in a different directory before replacing the published showcase.

The About page is intentionally ordered around the product story: quick sketches rather than large finished scores; melody and drum entry; named patterns; then handwritten annotations. Preserve this order and the lightweight, welcoming focus when editing the page.

For a review-first, ad hoc update of copy or screenshots, use the **Refresh About Screenshots** prompt in `.github/prompts/refresh-about-screenshots.prompt.md`.

## Contributing and tests
Read [`AGENTS.md`](AGENTS.md) before making changes. It contains the repository's contribution and verification requirements, including guidance for AI coding assistants.

Run the test suite with:
```
npm test
```
Before submitting changes, ensure all tests pass. For JavaScript changes, also run `node --check js/app.js`; run `git diff --check` for all changes. Before pushing, run the app locally and verify the affected workflow in a browser.

## Deploy with GitHub Pages
1. Push to the `main` branch.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, branch = `main`, folder = `/ (root)`.
3. The `.nojekyll` file tells Pages to serve files as-is, with no Jekyll build.

## Layout
- `index.html` – page shell
- `css/app.css` – styles
- `js/app.js` – score model, renderer, input, export (to be split into modules)

## Roadmap
Split `app.js` into modules, add tests, offline/installable (manifest + service worker), playback and MIDI export, share by link, tablature as its own input mode.

## License
This project repository is licensed under the GNU General Public License v3.0. See `LICENSE` for the full text.

The uploaded app source originally came from an upstream project that lists an MIT license; this repository keeps the GPL-3.0 license for the repo as a whole unless otherwise noted.
