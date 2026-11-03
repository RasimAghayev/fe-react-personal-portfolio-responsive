# Testing strategy

Written 2026-11-03 (Phase 5). This repo has two genuinely different pieces —
a static React SPA and a small, separate Express mail-relay (`server.js`) —
so the strategy splits in two along that same line.

## Frontend (`src/`, React Testing Library + Jest, via `react-scripts test`)

- **Component tests, not snapshot tests.** Every test renders the real
  component and asserts on user-visible behavior (text, DOM class, form
  value) rather than a serialized tree, so a harmless markup refactor
  doesn't break the suite.
- **`App.test.js`** — 3 smoke tests: the app renders without crashing and
  the hero/nav content is present.
- **`Contact.test.js`** — 4 tests: field updates, submit success path and
  submit failure path against a mocked `fetch`, and that the form resets
  after a successful submit.
- **`NavBar.test.js`** — 4 tests: the scrolled-state class toggles on
  scroll, and the active-link class switches between nav items.
- **`Newsletter.test.js`** — 7 tests: field updates; `onValidated` fires
  only for a non-empty value containing `@` (the actual validation this
  component performs, not an idealized email regex); the sending/error/
  success alert renders the right message and CSS class per `status` prop;
  the email field clears once `status` becomes `"success"` (via `rerender`,
  since this is a prop-driven transition, not something the component
  triggers itself).
- **`MailchimpForm.test.js`** — 2 tests: `react-mailchimp-subscribe` is
  mocked (it would otherwise make a real network call) to assert the
  Mailchimp POST URL is built correctly from the three
  `REACT_APP_MAILCHIMP_*` env vars, and that it renders through to a
  working `Newsletter` form.
- **Mocking policy:** mock only true external boundaries — `fetch` (real
  network), `react-mailchimp-subscribe` (real network, third-party
  component). Never mock the component under test or its own child
  components.
- **Run via:** `npm test` (interactive watch) / `CI=true npm test --
--watchAll=false` (CI). Uses `react-scripts`' bundled Jest 27.5.1 and
  Testing Library config — no custom Jest config needed.

## Backend (`server.js`, Express mail relay)

- **HTTP-level tests, not unit tests of internal functions** — `server.js`
  exports the Express `app` (gated behind `require.main === module` so
  importing it for tests doesn't also call `app.listen()`), and
  `server.test.js` drives it with real HTTP requests over an ephemeral
  port via Node's built-in `http` module (the bundled Jest 27.5.1 has no
  global `fetch`, so a small `request()` helper wraps `http.request`).
- **One real external dependency, fully mocked:** `nodemailer` is mocked
  (`createTransport` returns `{ verify: mockVerify, sendMail: mockSendMail
}`) — there is no SMTP credential available in this workflow, and even
  if there were, hitting real Gmail on every test run would be slow and
  flaky. This is the only collaborator `server.js` has, so it's the only
  mock in the file.
- **5 tests:** `/health/live` always 200; `/health/ready` 200 once
  `nodemailer.verify()`'s callback resolves without error, 503 if it
  errors; `POST /contact` 200 on a successful `sendMail`, 502 (with the
  real error message surfaced) on a failed one.
- **Why this is a separate suite from `npm test`:** CRA's Jest `roots` is
  hardcoded to `<rootDir>/src`, so a root-level `server.test.js` is
  correctly invisible to `npm test` — confirmed by running `npm test`
  with `server.test.js` present and seeing it listed nowhere in the
  output. It's run via its own `test:server` script
  (`jest server.test.js`, the same bundled Jest binary, invoked directly
  outside the `react-scripts test` wrapper) and wired into CI as its own
  step, separate from the frontend `Test` step.

## What's deliberately not covered

- **No E2E/browser tests** (Cypress/Playwright) — this is a static
  marketing/portfolio site with one real interactive feature (the contact
  form, HTTP-mocked above) and one third-party embed (Mailchimp, also
  mocked above); a full browser-automation layer would cost more to
  maintain than the bugs it would plausibly catch at this size.
- **No real-SMTP integration test.** Confirmed during Phase 4.5's
  `nodemailer` work (see `docs/TECHNICAL_DEBT.md` #18) that `verify()`/
  `sendMail()` work correctly against Ethereal's free test SMTP account;
  that was a one-time manual verification, not a repeatable automated
  test, since it depends on a third-party service being reachable and
  isn't something to run on every CI push.
- **No visual-regression testing** — no snapshot/screenshot tests; see
  "snapshot tests" note above for why.

## Running

- Frontend: `npm test` (watch) or `CI=true npm test -- --watchAll=false`
  (CI, matches `.github/workflows/ci.yml`'s `Test` step).
- Backend: `npm run test:server` (matches CI's `Test server.js` step).
- CI (`.github/workflows/ci.yml`) runs both, plus `npm run build` with
  `CI=true` (which also fails the build on any ESLint warning), on every
  push/PR to `main`.
