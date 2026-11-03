# Test report

Run 2026-11-03, locally (Node, `npm test` / `npm run test:server`), and
confirmed on GitHub Actions CI (run `41668987636`, commit `6e75e78`,
`ubuntu-latest`) — same commands as below.

## Environment

- Node 26.12.1 locally; CI pins Node 22 (`actions/setup-node@v7`,
  `node-version: '22'`)
- `react-scripts` 5.0.1 (bundles Jest 27.5.1, ESLint 8.21.0 via the
  `react-app` preset)
- `express` ^4.18.1, `nodemailer` ^10.3.1 (backend)

## Results

| Gate                                                    | Result                                    |
| ------------------------------------------------------- | ----------------------------------------- |
| `npm run build` (`CI=true`, lints via ESLint as errors) | **Pass** — "Compiled successfully"        |
| `npm test -- --watchAll=false` (`CI=true`, frontend)    | **Pass** — 5 suites, 21 tests, 0 failures |
| `npm run test:server` (backend)                         | **Pass** — 1 suite, 5 tests, 0 failures   |

Full frontend output:

```
PASS src/components/MailchimpForm.test.js
PASS src/components/Newsletter.test.js
PASS src/components/NavBar.test.js
PASS src/components/Contact.test.js
PASS src/App.test.js

Test Suites: 5 passed, 5 total
Tests:       21 passed, 21 total
Snapshots:   0 total
Time:        3.399 s
```

Full backend output:

```
PASS ./server.test.js

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        0.629 s, estimated 1 s
```

Before this phase (Phase 2 baseline): 1 test (`App.test.js`'s stale CRA
boilerplate assertion, which asserted on text the app no longer renders —
see `docs/TECHNICAL_DEBT.md` #4) and no backend tests at all.

## What changed this phase

- `App.test.js` replaced with 3 real smoke assertions (commit `bd503d6`).
- `Contact.test.js` (4 tests) and `NavBar.test.js` (4 tests) added
  (commits `bd503d6`, `70c1b82`).
- `server.js` made testable (`require.main === module` guard,
  `module.exports = app`) and `server.test.js` added (5 tests, commit
  `8ae0e7f`), closing the "backend has zero coverage and no deployed
  signal of its own health" gap simultaneously with adding `/health/live`
  and `/health/ready`.
- `Newsletter.test.js` (7 tests) and `MailchimpForm.test.js` (2 tests)
  added (commit `6880c22`), closing the last gap noted in
  `docs/TECHNICAL_DEBT.md` #4 ("`MailchimpForm`/`Newsletter` has no
  coverage").

## Known limitations (unchanged by this phase)

- No E2E/browser or visual-regression tests — see
  `docs/TESTING_STRATEGY.md` for why, given this repo's size and risk
  profile.
- `nodemailer`'s real Gmail SMTP path is mocked in `server.test.js`;
  it was verified manually (not via an automated test) against Ethereal's
  test SMTP account during the Phase 4.1 `nodemailer` v10 bump — see
  `docs/TECHNICAL_DEBT.md` #18.
- No line/branch coverage percentage is reported here — `react-scripts
test --coverage` was not run as part of this phase; every component and
  the one backend module each have direct behavioral assertions, but no
  coverage threshold is enforced in CI.
