---
mode: agent
description: Refresh and review the Groove Quip About page screenshots on demand
---

Refresh the About page showcase screenshots when requested.

1. Read the screenshot workflow in `README.md` and inspect the current About page image references.
2. Preserve the About page story and order: introduce Groove Quip as a quick sketchpad for capturing musical ideas, explicitly distinguish it from a tool for large finished pieces, then show melody and drum entry, named patterns, and only after patterns show handwritten annotations.
3. Confirm the app is serving locally at `APP_URL` (default `http://127.0.0.1:8000/`).
4. Generate previews without replacing published images:
   `SCREENSHOT_DIR=/tmp/groove-quip-about-preview npm run screenshots:about`
5. Open and review all four preview images. They should use the fixed portrait iPad viewport documented in `README.md`; screenshots 03 and 04 should be cropped to the top three quarters. For `04-patterns.png`, confirm that it shows exactly two melody patterns named `Riff 1 - Verse` and `Riff 2 - Chorus`, each with exactly two bars and distinct musical content. Check that each screenshot depicts its intended mode, has a clean score and useful controls in frame, and matches the current UI. If needed, update the deterministic scenarios in `scripts/capture-about-screenshots.js` and regenerate the previews.
6. Only after reviewing the previews, copy the approved images to `assets/screenshots/` (or run `npm run screenshots:about` with its default output directory).
7. Update image alt text, dimensions, captions, and the About page order in `about/index.html` if the showcase changed; always keep patterns before hand annotations. Run `npm test` and `git diff --check`, and summarize the screenshots and copy that changed.

Do not commit or push unless explicitly asked.
