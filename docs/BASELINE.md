# Docker baseline (Phase 5)

This is the Phase 5 behavior contract for `fe-react-personal-portfolio-responsive`:
what the repo's existing tests prove it does, and what the Docker image built
from it actually does when run, verified for real (not assumed).

## Scope decision

This repo contains two logically separate things sharing one `package.json`:

1. A static React SPA (`src/`, `public/`, built via `react-scripts build`).
2. An Express "contact form" mail-relay API (`server.js`, sends mail via
   nodemailer/Gmail SMTP).

Only **#2 is containerized as a runtime service**. This matches the decision
already recorded in `docs/IMPROVEMENT_ROADMAP.md` ("the SPA itself is static
and typically doesn't need its own container — will confirm the intended
hosting target before assuming one") — that hosting target (Netlify / Vercel /
S3+CloudFront / GitHub Pages / etc.) is still an open, undecided question and
is explicitly **not** assumed here; inventing a frontend-serving container
(e.g. nginx) would be deciding a production deployment target that is not
this phase's call to make. The multi-stage Dockerfile still **runs**
`npm run build` (in the `build` stage) so a broken frontend build fails the
image build — the SPA's build-time correctness is part of the contract even
though its artifact isn't shipped by this image.

## What was found before changing anything

**The Dockerfile already on `main` did not actually build.** Verified by
running it unmodified before writing anything new:

```
$ DOCKER_BUILDKIT=1 docker build -t fe-react-old-baseline:test .
...
RUN npm ci --omit=dev
sh: husky: not found
npm error code 127
ERROR: process "/bin/sh -c npm ci --omit=dev" did not complete successfully: exit code: 127
```

Root cause: `package.json`'s `"prepare": "husky"` lifecycle script fires on
every `npm ci`, including `--omit=dev`. `husky` itself is a devDependency, so
`--omit=dev` removes it — but the `prepare` script still tries to invoke it,
and fails because the binary is gone. This had never been exercised for real
before (no CI step ever ran `docker build`; the `docker-compose.yml`/
`Dockerfile` pair was added in commit `1d1cfed` without a build verification
step in that session). Fixed in the new Dockerfile with `--ignore-scripts` on
every `npm ci` (the `prepare`/`husky` step is meaningless inside a Docker
build context anyway — there is no `.git` checkout to install hooks into).

## Dockerfile pipeline

`base` (pinned exact version + digest) → `deps` (full install, cached) →
`build` (`npm run build`, verifies the SPA compiles) → `test` (both test
suites) → `prod-deps` (production-only install, built **from** `test`) →
`runtime` (server.js + prod `node_modules` only, non-root, `HEALTHCHECK`).

Because `runtime` is only reachable through `prod-deps` → `test` → `build` →
`deps` → `base`, a plain `docker build .` (no `--target`, i.e. building
`runtime`, which is what `make build`/`make up` do) **always** re-executes
the `test` stage's `RUN` as part of the build graph — there is no way to
produce a runtime image whose test stage didn't pass. Verified by sabotage:

```
$ sed -i 's/toBe(200)/toBe(999)/' server.test.js   # break 3 assertions
$ docker build --no-cache .
...
Tests: 3 failed, 2 passed, 5 total
ERROR: failed to build: ... exit code: 1
$ git checkout -- server.test.js                   # restored, confirmed clean
```

Base image: `node:22.23.4-alpine3.24@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914`
(resolved from the `node:22-alpine` tag already used on `main`; Node 22 matches
the version the existing `.github/workflows/ci.yml` already pins). Bumping to
a newer major is Phase 6's job, not this phase's.

## Verification evidence (commands + exit codes)

| #   | Command                                                                              | Result                                                                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `docker build -t fe-react-old-baseline:test .` (pre-existing Dockerfile, unmodified) | **exit 1** — `sh: husky: not found` (see above)                                                                                                                                                                                                                                                                                                                       |
| 2   | `docker build --target deps .`                                                       | exit 0 — `npm ci --ignore-scripts`, 1334 packages                                                                                                                                                                                                                                                                                                                     |
| 3   | `docker build --target build .`                                                      | exit 0 — `Compiled successfully`, CRA bundle 81.77 kB JS + 38.66 kB CSS gzip                                                                                                                                                                                                                                                                                          |
| 4   | `docker build --target test .`                                                       | exit 0 — frontend: 5 suites / 21 tests passed; backend: 1 suite / 5 tests passed                                                                                                                                                                                                                                                                                      |
| 5   | `docker build --target prod-deps .`                                                  | exit 0 — `npm ci --omit=dev --ignore-scripts`, 1327 packages (see "Out-of-scope findings" — omit=dev barely trims this tree)                                                                                                                                                                                                                                          |
| 6   | `docker build .` (default target = `runtime`)                                        | exit 0                                                                                                                                                                                                                                                                                                                                                                |
| 7   | Sabotage test: broke 3 assertions in `server.test.js`, `docker build --no-cache .`   | **exit 1** as expected — confirms the test gate is real, not cosmetic                                                                                                                                                                                                                                                                                                 |
| 8   | `make verify` (= `make test` + `make build`)                                         | exit 0                                                                                                                                                                                                                                                                                                                                                                |
| 9   | `make up`                                                                            | exit 0 — container `fe-react-personal-portfolio-responsive-p5-server-1` started, mapped to host port 20040 (reserved block 20040-20049)                                                                                                                                                                                                                               |
| 10  | `curl http://localhost:20040/health/live`                                            | `{"status":"ok"}`, HTTP 200                                                                                                                                                                                                                                                                                                                                           |
| 11  | `curl http://localhost:20040/health/ready`                                           | `{"status":"unavailable","reason":"mailer not verified"}`, HTTP 503 — **expected**: the local/CI `.env` used placeholder credentials (`test@example.com` / a dummy app-password, never a real secret), so nodemailer's SMTP `verify()` cannot succeed. This endpoint only reports healthy with real, working Gmail credentials, which is correct behavior, not a bug. |
| 12  | `docker ps`                                                                          | `fe-react-personal-portfolio-responsive-p5-server-1: Up ... (healthy)` — container `HEALTHCHECK` (which probes `/health/live`, not `/health/ready` — see `docker-compose.yml` comment) passes                                                                                                                                                                         |
| 13  | `curl -X POST http://localhost:20040/contact -d '{...}'`                             | HTTP 502, `{"code":502,"status":"Failed to send","error":"Invalid login: 535-5.7.8 ..."}` — confirms the route, body parsing, and nodemailer wiring all work end-to-end inside the running container; the 502 is the correct, already-tested failure path reacting to the placeholder credentials actually being rejected by Gmail (not a crash, no secret echoed)    |
| 14  | `make down`                                                                          | exit 0 — container, network removed                                                                                                                                                                                                                                                                                                                                   |
| 15  | `make lint` (`npm run format:check` inside the `test` image)                         | **exit 1** — 24 pre-existing files fail Prettier's check. Pre-existing, not introduced by this phase (see "Out-of-scope findings")                                                                                                                                                                                                                                    |
| 16  | `make shell`                                                                         | exit 0 — confirmed non-root (`whoami` → `app`), `node --version` → `v22.23.4`, `ls` → only `node_modules`, `package.json`, `server.js` (no source, no tests, no dev tooling) in the runtime image                                                                                                                                                                     |
| 17  | `docker scout cves fe-react-personal-portfolio-responsive:runtime`                   | 1695 packages indexed, 22 vulnerable, 0 Critical / 18 High / 26 Medium / 5 Low / 1 Unspecified (see "Out-of-scope findings" for root cause)                                                                                                                                                                                                                           |

## Image size

- `docker images` (uncompressed, on-disk): **734 MB**
- `docker scout` reported analyzed/exported size: **117 MB**
- Both recorded; the gap is normal (compressed vs. uncompressed layer accounting). See "Out-of-scope findings" for why this is larger than a 3-dependency Express API should need.

## Baseline test results (the behavior contract)

Re-run fresh inside the Docker `test` stage (not assumed from old docs):

```
Frontend (react-scripts test / Jest):
  PASS src/components/MailchimpForm.test.js
  PASS src/components/Newsletter.test.js
  PASS src/components/NavBar.test.js
  PASS src/components/Contact.test.js
  PASS src/App.test.js
  Test Suites: 5 passed, 5 total
  Tests:       21 passed, 21 total

Backend (jest server.test.js):
  PASS ./server.test.js
  Test Suites: 1 passed, 1 total
  Tests:       5 passed, 5 total
```

This matches `docs/TEST_REPORT.md`'s already-recorded numbers (written during
an earlier, pre-restructure session's own "Phase 5" testing pass under the
old `CLAUDE.md`/`PROMPT.md` v1 numbering). No regression between that record
and this fresh, containerized run.

**No new characterization tests were added.** Phase 5 only requires them
"where critical paths have no tests" — here every critical path already has
direct coverage (both health endpoints, the `/contact` success and failure
paths, the SPA's smoke render, `NavBar`, `Newsletter`, `MailchimpForm`),
confirmed by re-running the existing suites inside Docker rather than by
assuming the old report is still accurate. Writing the _rest_ of the test
suite (coverage thresholds, edge cases, etc.) is Phase 11's job.

## `.env.example`

Already existed (added in the same pre-restructure session), reviewed and
left as-is: placeholders only, every variable `server.js` and the SPA read
from `process.env` is covered (`EMAIL_USER`, `EMAIL_PASS`,
`CONTACT_RECIPIENT`, `PORT`, `REACT_APP_MAILCHIMP_*`, `REACT_APP_API_URL`).
No real value was ever present. A `HOST_PORT` line was added to document the
Docker-only, non-secret port override (default `20040`, inside this repo's
reserved `20040-20049` block).

## Out-of-scope findings (for later phases, not fixed here)

1. **Runtime image is far larger than a 3-dependency Express API needs (734
   MB / 117 MB scout size; 18 High CVEs, all from CRA/webpack/babel-era
   transitive packages like `brace-expansion`, `minimatch`, `glob`, `uuid`).**
   Root cause: `package.json` lists `react-scripts`, every `@testing-library/*`
   package, and friends under `"dependencies"` (this is Create React App's own
   default convention, not a mistake introduced here) in the **same**
   manifest that also declares `express`/`cors`/`nodemailer`. `npm ci
--omit=dev` can only drop true `devDependencies` (here: `husky`,
   `lint-staged`, `prettier` — 7 packages), so the backend's production
   install unavoidably drags in the entire frontend toolchain too. A real fix
   needs an architectural decision (e.g. splitting `server.js` into its own
   `package.json`/directory so the two deployables have independent
   dependency trees) — a Phase 7 (restructure) or Phase 8 (architecture,
   modular-monolith boundary) candidate, not something to hack around inside
   a Dockerfile. Flagging with full evidence rather than fixing.
2. **`npm audit` on the full dependency tree: 74 vulnerabilities (16 low, 36
   moderate, 22 high)** — GitHub's own Dependabot alert (surfaced during
   Phase 4, see `handoff/4/fe-react-personal-portfolio-responsive.md`) already
   reported "46 vulnerabilities (16 high, 26 moderate, 4 low)" on `main`.
   Phase 6/9's job, not re-triaged here.
3. **Base image patch available**: `docker scout` flags Alpine's `musl
1.2.6-r3` (one CVE, fixed in `1.2.6-r6`) — a same-minor Alpine patch
   update, not a major bump. Left pinned to the exact digest resolved at the
   time of this phase (matches what `node:22-alpine` already resolved to on
   `main`); keeping base images current on an ongoing basis is Phase 6's job.
4. **`make lint` (Prettier `format:check`) fails on 24 pre-existing files**
   under `src/`. This predates this phase — confirmed by re-reading
   `docs/IMPROVEMENT_ROADMAP.md`'s own note that adding Prettier/husky was
   "deliberately incremental, not a mass reformat of the existing codebase."
   Not reformatted here: a 24-file reformat is outside Docker/Make scope and
   would bury this phase's actual diff. Left for whichever phase owns code
   style enforcement.
5. **Discrepancy worth a second look, not re-investigated here**: the
   pre-restructure `docs/REPOSITORY_AUDIT.md` states commit `f3d7c8f`
   (2022-08-03) "introduced the hardcoded Gmail credential still present
   today" and that it "has never been removed or rotated in-repo." The
   Phase 4 `git-steward` handoff for this repo
   (`handoff/4/fe-react-personal-portfolio-responsive.md`) instead reports a
   **full-history** gitleaks scan (158 commits, all branches) finding **zero
   leaks**, and no `APPROVALS.md` row exists for this repo's Gate 1. The
   current tree's `server.js` does correctly read `EMAIL_USER`/`EMAIL_PASS`
   from `process.env` (verified by reading it during this phase) — so
   whatever the 2022 commit contained, it is not live in the current working
   tree. This is a Phase-4/Gate-1 question (did the credential actually
   never get cleaned from history, or was the old audit's claim already
   stale by the time `git-steward` ran gitleaks), not something this phase
   investigated further or acted on. Flagging for the Orchestrator.
6. **Frontend hosting target still undecided** (see "Scope decision" above)
   — whichever phase/decision eventually picks one (Netlify/Vercel/S3/GH
   Pages/a container) should revisit whether the SPA needs its own
   Dockerfile stage at that point.

---

## Phase 6 — Upgrade to latest (comparison against this baseline)

Every runtime, framework, library, dev tool, and CI action was checked
against the live registry (npm / Docker Hub / nodejs.org / GitHub releases)
on 2026-11-05, not against `DEPENDENCY_MAP.md` (stale by this point) or
memory. Upgrade order followed: Node base image → framework (React) →
libraries → dev tools → CI actions, per `DEPENDENCY_MAP.md`.

### Result

| Component                                                                                                                                                                                                                                    | Phase 5 baseline           | Phase 6 result                                                                                                                                                                                                                                      | Status                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Node base image                                                                                                                                                                                                                              | `node:22.23.4-alpine3.24`  | `node:26.13.0-alpine3.24` (exact digest pinned)                                                                                                                                                                                                     | latest stable (26.13.0 "Lithium" — 27.x is alpha-only, excluded)                            |
| `express`                                                                                                                                                                                                                                    | not yet checked in Phase 5 | `5.3.0`                                                                                                                                                                                                                                             | latest stable                                                                               |
| `react` / `react-dom`                                                                                                                                                                                                                        | pre-upgrade `18.x`         | `19.3.1`                                                                                                                                                                                                                                            | latest stable                                                                               |
| `react-router-dom`                                                                                                                                                                                                                           | `6.30.6`                   | **kept at `6.30.6`**                                                                                                                                                                                                                                | latest **compatible** — see blocker below; `7.18.5` is latest upstream but breaks this repo |
| `web-vitals`                                                                                                                                                                                                                                 | `3.x`-era                  | `6.2.3`                                                                                                                                                                                                                                             | latest stable                                                                               |
| `cors`, `nodemailer`, `bootstrap`, `react-bootstrap`, `react-bootstrap-icons`, `react-multi-carousel`, `react-on-screen`, `react-responsive-carousel`, `react-mailchimp-subscribe`, `react-router-hash-link`, `react-scripts`, `animate.css` | various                    | unchanged — each independently confirmed already at latest stable via `npm view <pkg> version` on 2026-11-05                                                                                                                                        | latest stable                                                                               |
| `husky`, `lint-staged`, `prettier` (dev tools)                                                                                                                                                                                               | various                    | unchanged — confirmed already at latest stable                                                                                                                                                                                                      | latest stable                                                                               |
| `actions/checkout`, `actions/setup-node` (CI)                                                                                                                                                                                                | floating tags              | SHA-pinned at `v7.0.1` / `v7.1.0` respectively — confirmed these are each action's current latest release tag via `gh api repos/<action>/releases/latest`, and the pinned SHA matches `git ls-remote`/`gh api .../git/refs/tags/<tag>` for that tag | latest stable                                                                               |

### Blocker: `react-router-dom` v7 (GATE 5 — already resolved 2026-11-03, re-verified 2026-11-05)

`react-router-dom@7.x` requires the sibling `react-router@7.x` package, whose
CommonJS entry (`dist/index.js`) requires the `react-router/dom` subpath
export. `react-router-hash-link` (the _only_ reason this repo depends on
`react-router` at all — see `docs/TECHNICAL_DEBT.md` #15, a single `HashLink`
used by `NavBar`) ships a CJS build that `require()`s `react-router-dom`'s
CJS entry. Under Jest's CJS module resolution (the `test` stage, i.e. the
Phase 5 behavior-contract gate) this throws:

```
Cannot find module 'react-router/dom' from 'node_modules/react-router-dom/dist/index.js'
```

Reproduced fresh in this session: `npm install react-router-dom@7.18.5` →
`CI=true npm run build` succeeds (webpack/CRA resolves the `exports` map
fine) → `CI=true npm test -- --watchAll=false` fails 2 of 5 suites
(`App.test.js`, `NavBar.test.js`) with the exact error above; the other 3
suites (14 tests) still pass. Reverted cleanly (`package.json` /
`package-lock.json` restored, `npm ci`, confirmed zero `git diff`).

This is the same break already found and gated on 2026-11-03
(`docs/TECHNICAL_DEBT.md` #19 — "Gate #5 flagged, your call: closed
2026-11-03, staying on 6.30.6"). Nothing has changed upstream since (same
`react-router-hash-link@2.4.3`, same `react-router-dom@7.18.5` resolution
behavior) — the existing decision stands, re-confirmed rather than assumed.
Per standing decision 1, the **highest compatible version** (`6.30.6`, the
latest `6.x` release) is pinned as the floor in `package.json` and is what
ships. Tracked as open debt in `docs/TECHNICAL_DEBT.md` #19; the real fix is
removing the single-use router (`docs/TECHNICAL_DEBT.md` #15), which is a
Phase 8 (architecture) decision, not Phase 6's to make.

### Dependency-bot PR triage

6 Renovate PRs were open before Phase 6 started: `node` v26 (#67), `express`
v5 (#66), `web-vitals` v6 (#71), `react` v19 (#68), `react-dom` v19 (#69),
`react-router-dom` v7 (#70).

- **Merged** (#66, #67, #71): equivalent to and green with this phase's own
  result, merged into `main` directly.
- **Closed as superseded** (#68, #69): this phase's own commit
  (`5c00a7d`) already bumped `react`/`react-dom` to `19.3.1`, newer than
  these PRs' `19.0.0` floor.
- **Closed as superseded/blocked** (#70): reproduces the `react-router-dom`
  v7 break documented above; re-opens the already-gated decision against a
  newer base. See PR close comment for the reproduced failure.

A 4th bot PR not in the original 6, Dependabot's `#74` (opened against a
stale pre-floor-pin base, proposing the identical `react-router`/
`react-router-dom` v7 bump via the `npm_and_yarn` group), was closed as
superseded for the same reason.

All 4 bot branches were deleted on close; the 3 merged PRs' branches were
already auto-deleted by GitHub on merge. `git fetch --prune` confirms zero
stale remote branches remain. 0 open PRs remain on the repo (verified via
`gh pr list --state open`).

### No-regression check (vs. this document's own Phase 5 numbers)

- `npm ci --omit=dev --ignore-scripts` (the `prod-deps` stage) inside
  `make verify`: **74 vulnerabilities (16 low, 36 moderate, 22 high)** —
  identical to the Phase 5 baseline recorded above (same root cause: CRA's
  own `react-scripts` toolchain tree, not shipped at runtime; same
  pre-existing item, not re-triaged here — Phase 9's job).
- `make verify` (`test` + `build` stages): **exit 0**, both before and after
  every Phase 6 commit.
- Frontend: 5 suites / 21 tests still pass. Backend: 1 suite / 5 tests still
  pass. No test was weakened, skipped, or rewritten to pass.
- Dependabot's repo-level alert count (GitHub UI) still reflects only the
  pre-existing toolchain-level mediums/highs listed in
  `docs/TECHNICAL_DEBT.md` #16 — nothing newly introduced by this phase's
  bumps (checked via `gh api repos/.../dependabot/alerts` — no `react-router`
  or `react` advisory present; all 16 open alerts are `minimatch`/`glob`/
  `postcss-selector-parser`/`ip-address`/`pacote`/`sigstore`/`picomatch`/
  `deepmerge`, all inside `react-scripts`' own build-time dependency tree).
