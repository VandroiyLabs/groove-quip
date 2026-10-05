# Groove Quip

An open-source, touch-first music notation editor that runs entirely in the browser. Built for fast note entry on an iPad with Apple Pencil.

**Modes:** melody, piano (grand staff), drums (tap grid with an extensible kit).
**Features:** chord symbols, rests, sharps/flats, editable auto-tablature (guitar/bass), pen annotations, per-measure zoom, undo, PNG and PDF export, save/open as JSON. Scores autosave in the browser.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

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
