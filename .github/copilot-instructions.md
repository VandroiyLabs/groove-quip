# Copilot Instructions

- Follow the repository guidance in [`AGENTS.md`](../AGENTS.md).
- Before pushing code changes, run the app locally and verify the changed workflow in a browser, then run the relevant focused checks. For JavaScript changes, use `node --check js/app.js`; for all changes, use `git diff --check`.
- Do not push when checks fail. Fix the problem and rerun the checks. If a check cannot be run, report that and wait for the contributor to decide whether to proceed.