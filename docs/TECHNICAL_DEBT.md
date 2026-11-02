# Technical debt ledger

Severity scale matches `CLAUDE.md`: P0 critical, P1 high, P2 medium, P3 low. "Phase" is where `PROMPT.md` plans to address it.

| # | Sev | Item | Why it's debt | Recommended fix | Phase | Approval gate? | Status |
|---|---|---|---|---|---|---|---|
| 1 | P0 | Hardcoded Gmail credentials in `server.js`, public since 2022-08-03 | Live, publicly-exposed credential; anyone who ever viewed the repo has it | Rotate the Gmail credential **now** (outside this workflow); move to env vars; then strip the secret from git history | 3.1 (history rewrite) | **Yes** — rewriting history / force push | **Done** — `git filter-repo` purged `server.js` from all 16 refs, force-pushed 2026-11-03; `server.js` re-added reading `EMAIL_USER`/`EMAIL_PASS` from env (commit `206f00b`). Gmail credential rotation itself is outside this repo — confirm you've done it. |
| 2 | P1 | Contact form posts to hardcoded `http://localhost:5000/contact` | Feature is non-functional in any deployed environment | Externalize the API base URL via env var; stand up and document a real deployment target for `server.js` (or replace it with a serverless function / form-backend service) | 4.4 (dual-mode independence) | No | Not done |
| 3 | P1 | `Contact.js` binds the Last Name input to `formDetails.lasttName` (typo) | Field silently never reflects user input | Fix the key name | 4.2 (bug fixes) | No | Not done |
| 4 | P2 | Only test is the stale CRA boilerplate | Zero real coverage; false sense of a passing suite | Replace with tests for `Contact`, `MailchimpForm`, `NavBar` scroll state | 5 | No | Not done |
| 5 | P2 | `succes`/`success` key mismatch in submit-result state | Error messages render with "success" styling | Fix the key name | 4.2 | No | Not done |
| 6 | P2 | No CI/CD | Dependency-bot PRs merge (or don't) with no automated signal | Add a GitHub Actions workflow: install, lint, test, build | 4.7 | No | Not done |
| 7 | P2 | No Docker | No reproducible way to run `server.js` anywhere but a dev machine | Add a minimal Dockerfile + compose for the mail-relay service | 4.3 | No | Not done |
| 8 | P2 | 15 unmerged Dependabot/Renovate PRs | Dependency drift, some are security-labeled (`npm-express-vulnerability`, `npm-nodemailer-vulnerability`) | Triage and merge after CI exists | 3.2 | No | Not done — count/identity shifted after the history rewrite (Renovate already recreated 2 branches against the new base as of 2026-11-03); re-triage against the current PR list before merging anything |
| 9 | P2 | `server.js` has no run script / no docs | Backend is operationally invisible to any future contributor | Add a `server` npm script and document it in README | 4.4 / 10.1 | No | Not done |
| 10 | P3 | `.idea/` tracked in git | Repo noise, IDE-specific | `git rm -r --cached .idea`, add to `.gitignore` | 3 (hygiene) | No | **Done** — untracked + `.gitignore` updated (commit `9e2ca2f`) |
| 11 | P3 | README is the unmodified CRA template | Doesn't describe the actual product or its env vars | Rewrite per Phase 10.1 | 10.1 | No | Not done |
| 12 | P3 | Default branch `master` | Doesn't match the `main`/`test` convention in `CLAUDE.md` | Rename default branch to `main` | 3.5 | **Yes** — default branch change | **Done** — `main` created from the rewritten tip, set as default, old `master` deleted on origin 2026-11-03 |
| 13 | P3 | Dead "Let's Connect" button (`console.log` only) in `Banner.js` | Looks interactive, does nothing | Wire it to scroll to `#connect`, or remove | 4.2 | No | Not done |
| 14 | P3 | Placeholder social links (`href="#"`) | Looks finished, isn't | Fill in or remove | 4.2 | No | Not done |
| 15 | P3 | `react-router-dom` + a second `BrowserRouter` used only for `HashLink` | Unnecessary dependency/complexity for a single-page app with no routes | Consider a lighter smooth-scroll approach, or confirm the router earns its keep before touching it | 8 (only after Stage B is green) | No | Not done |
| 16 | P1 | GitHub Dependabot reports **177 vulnerabilities** on the default branch (4 critical, 79 high, 75 moderate, 19 low) as of 2026-11-03 | Far beyond what the 15 bump PRs alone suggested; likely mostly transitive, but unverified | Full `npm audit`/Dependabot alert triage in Phase 4.1, prioritize critical/high first | 4.1 | No | Not done — newly discovered via GitHub's push output, not yet triaged |
