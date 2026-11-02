# Repository audit

Scope: full checkout of `master` at clone time (2026-11-03), plus `git log`/`git branch -a` against the mirror backup. No `npm install` was run during this audit — findings below are from static inspection; anything that requires execution to confirm is marked as such.

## Git history

- 59 commits total on `master`, oldest relevant to this audit: `f3d7c8f` "Contact Form" (2022-08-03), which introduced the hardcoded Gmail credential still present today (see Technical Debt #1). It is the only commit that ever touched `server.js` — the secret has never been removed or rotated in-repo.
- No other obvious secret patterns, large binaries, or force-pushed/rewritten history detected.
- No tags.

## Branches

- Default branch: `master` (16 remote branches total). All 15 non-default remote branches are automated dependency-bump branches:
  - 12 `renovate/*` branches (bootstrap, cors, express-vulnerability, nodemailer-vulnerability, react-18.x, react-bootstrap, react-bootstrap-icons, react-multi-carousel, testing-library-jest-dom, testing-library-react, testing-library-user-event, web-vitals)
  - 3 `dependabot/npm_and_yarn/*` branches (css-tools, follow-redirects, semver)
  - None are merged into `master`. This matches the 15 open PRs reported in `REPOS_INDEX.md`.
- No stale feature branches from a human contributor — this is a single-maintainer repo where only the bots are currently active.

## CI/CD

No `.github/workflows/`, no other CI config found. Nothing runs automatically against PRs — which is consistent with 15 dependency-bot PRs sitting unmerged with no automated check to reassure anyone they're safe to merge.

## Docker / containerization

None. No `Dockerfile`, `.dockerignore`, or `docker-compose.yml`.

## Tests

One file: `src/App.test.js`, the unmodified Create React App boilerplate (`renders learn react link`). A repo-wide search found no occurrence of "learn react" outside that test file, meaning the assertion almost certainly fails against the current UI. Not executed as part of this audit (Phase 5 will run and fix it) — flagged here as a near-certain failure based on static evidence, not claimed as confirmed.

## Configuration / secrets handling

- `.gitignore` correctly excludes `.env*` files — but that protection was bypassed entirely because `server.js` hardcodes its Gmail credentials directly in source instead of reading from `process.env`. Ironically, lines 12-13 of `server.js` *do* `console.log(process.env.EMAIL_USER)` / `console.log(process.env.EMAIL_PASS)` right above the hardcoded transporter config — strongly suggesting an abandoned attempt to switch to env vars that was never finished, and which would itself have logged the secret to stdout.
- `MailchimpForm.js`, by contrast, correctly reads its three Mailchimp settings from `process.env.REACT_APP_*`. There's no `.env.example` anywhere documenting that these (or `EMAIL_USER`/`EMAIL_PASS`) need to be set.

## Dead/placeholder code

- `Banner.js`: a "Let's Connect" button whose `onClick` only does `console.log('connect')`.
- `NavBar.js`: three social-icon links all pointing at `href="#"`.
- `react-router-dom` + a `BrowserRouter` instance inside `NavBar.js` with no `<Route>` ever defined anywhere in the app — used purely to make `HashLink` work.

## IDE/editor artifacts

`.idea/` (JetBrains) is committed: `.gitignore`, `dbnavigator.xml`, `*.iml`, `modules.xml`, `vcs.xml`. Content was inspected — `dbnavigator.xml` holds only default DB Navigator plugin settings, no connection strings or credentials. Still, none of this belongs in version control.

## Dependencies

`package.json` lists 20 runtime dependencies for the frontend (React 18, Bootstrap 5, several small UI add-ons) plus `express`/`cors`/`nodemailer` for the unrelated backend script, all under the same `dependencies` block (no `devDependencies` separation). `package-lock.json` is lockfile v2 (npm 7+). No outdated-version audit was run in this pass (requires `npm install`/`npm outdated`, which belongs to Phase 4) — the 12 open Renovate PRs are themselves evidence that several packages are behind their latest versions.
