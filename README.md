# Notation Sketchpad

An open-source, touch-first music notation editor that runs entirely in the browser. Built for fast note entry on an iPad with Apple Pencil.

**Modes:** melody, piano (grand staff), drums (tap grid with an extensible kit).
**Features:** chord symbols, rests, sharps/flats, editable auto-tablature (guitar/bass), pen annotations, per-measure zoom, undo, PNG and PDF export, save/open as JSON. Scores autosave in the browser.

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

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
MIT – see `LICENSE`.
