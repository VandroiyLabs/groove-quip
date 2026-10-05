# Repository Instructions

- Before pushing any code change, run the app locally and exercise the affected workflow in a browser. This is a static app; from the repository root, use `python3 -m http.server 8000` and open `http://localhost:8000` (choose another free port if needed).
- Before submitting or pushing, run `npm test` and ensure all tests pass.
- Run focused checks for the changed code. For JavaScript changes, run `node --check js/app.js`; run `git diff --check` for all changes.
- Do not push if a check fails. Fix the issue and rerun the relevant checks. If a check cannot be run, state that clearly and wait for the contributor to decide whether to proceed.