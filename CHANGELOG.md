# Changelog

All notable changes to this repository are recorded here. Format loosely
follows [Keep a Changelog](https://keepachangelog.com/); dates are UTC.

## Phase 6 — Upgrade to latest (2026-11-05)

Every dependency, the Node runtime, the Docker base image, and the CI
actions were checked against their live registries (npm, Docker Hub,
nodejs.org, GitHub releases) and brought to latest stable where compatible.
Full comparison and evidence: `docs/BASELINE.md` ("Phase 6" section).

### Changed

- **Node / Docker base image**: `node:22.23.4-alpine3.24` → `node:26.13.0-alpine3.24`
  (exact digest re-pinned). CI's `actions/setup-node` `node-version` matches.
- **`express`**: → `5.3.0` (major bump; verified, no code change needed).
- **`react`, `react-dom`**: → `19.3.1`.
- **`web-vitals`**: → `6.2.3`.
- **GitHub Actions**: `actions/checkout` and `actions/setup-node` re-pinned
  to the SHA of their current latest release (`v7.0.1`, `v7.1.0`
  respectively).
- `package.json` reformatted to this repo's Prettier conventions
  (4-space indent); `.github/workflows/ci.yml` reformatted to match.
- Direct library version floors pinned to each package's latest stable
  minor/patch at the time of this phase.

### Added

- `renovate.json`: explicit config (grouped minor/patch, major bumps kept
  individual, Docker digest pinning, GitHub Actions digest pinning,
  weekly schedule, PR/hour limits) so the repo keeps itself at latest
  going forward without manual re-discovery.

### Not changed (documented blocker)

- **`react-router-dom` stays on `6.30.6`** (latest upstream is `7.18.5`).
  `react-router-dom@7` requires `react-router@7`, whose CJS entry needs the
  `react-router/dom` subpath export; `react-router-hash-link` (this repo's
  only consumer of the router) breaks under Jest's CJS resolution with
  `Cannot find module 'react-router/dom'`, failing 2 of 5 frontend test
  suites. Reproduced and reverted in this session. This is a previously
  gated decision (Approval Gate 5, 2026-11-03) re-confirmed, not a new one.
  See `docs/TECHNICAL_DEBT.md` #19 and `docs/BASELINE.md`.

### Dependency-bot PRs

- Merged: #66 (`express` v5), #67 (`node` v26), #71 (`web-vitals` v6).
- Closed as superseded: #68 (`react` v19 — superseded by a newer direct
  bump to 19.3.1), #69 (`react-dom` v19 — same), #70 (`react-router-dom`
  v7 — breaking, see above), #74 (`dependabot`, same v7 break, stale base).
- All bot branches deleted; 0 open PRs remain.

### Verification

- `make verify` (Docker `test` stage + `runtime` build): green after every
  commit in this phase.
- No regression vs. the Phase 5 baseline: same test counts (21 frontend +
  5 backend, all passing), same vulnerability count (74: 16 low / 36
  moderate / 22 high, all pre-existing `react-scripts` build-toolchain
  transitive deps, none newly introduced).
