# Improvement roadmap — Phases 3-5 plan for this repo

This is the Phase 2.6 plan: how Phases 3-5 (`PROMPT.md`) will be applied here, with risks. **Requires approval before Phase 3 starts** (`CLAUDE.md` approval gate — "the Phase 2 plan for each repo").

## Phase 3 — Git and repo hygiene

1. **History audit — done** (see `REPOSITORY_AUDIT.md`). Finding: the Gmail credential in `server.js` (commit `f3d7c8f`, 2022-08-03) has never left the history.
   - **Risk / gate:** Removing it properly requires rewriting history (`git filter-repo`) and a force push to `origin/master`. This is approval gate #1 in `CLAUDE.md`. **Not done yet — needs your explicit go-ahead before it's touched.** Independently of this workflow, the live Gmail credential should be rotated now; that's outside git and needs no approval.
2. **Dependency bot PRs (15 total):** triage each Renovate/Dependabot PR — check what it bumps, whether it's security-labeled, whether it's superseded by a later PR on the same package. Merge the safe ones once there's at least a basic CI check to lean on (see Phase 4.7 below — CI should land before mass-merging, otherwise we're merging on faith).
3. **Open PRs:** all 15 are the dependency-bot PRs above; there are no human-authored open PRs to review separately.
4. **Branches:** once a bot PR is merged, delete its branch (local mirror backup already preserves history regardless).
5. **Branch structure:** rename `master` → `main`.
   - **Risk / gate:** default branch change is approval gate #4. Low technical risk (GitHub redirects old refs), but I'll wait for your sign-off and will check for any external link to this repo first (none found so far in the other 54 repos' index entries, but that's only confirmed once we reach Phase 9/10's cross-repo link check).

## Phase 4 — Modernization and independence

1. **Dependency upgrades:** once the bot PRs are triaged, run a full `npm install` + `npm outdated` pass (not yet done — requires executing npm, which this plan defers to this phase) and bump anything left by hand, one logical group at a time, with build+test after each.
2. **Bug fixes (P0→P3 from `TECHNICAL_DEBT.md`):**
   - P0 secret → remove from source, move to env (code fix is safe to do now and should happen regardless of the history-rewrite timing; the approval gate is specifically about rewriting history, not about removing the line from the current file).
   - P1 `lasttName` typo, P1 hardcoded `localhost:5000` contact URL, P2 `succes`/`success` typo — straightforward fixes.
   - P1 "where does the contact backend actually run in production" is an open question for you: this plan assumes we containerize `server.js` and document a real deployment target (Phase 4.3/4.4) rather than silently leaving the feature broken. Flagging this as a decision point, not an approval-gate item.
3. **Docker:** add a multi-stage Dockerfile + compose for `server.js` (the SPA itself is static and typically doesn't need its own container — will confirm the intended hosting target with you before assuming one).
4. **Dual-mode independence:** `.env.example` covering `EMAIL_USER`, `EMAIL_PASS`, `REACT_APP_MAILCHIMP_URL/U/ID`, and the contact-form API base URL; `/health/live` + `/health/ready` on the Express server.
5. **Observability:** structured logging for the Express server (currently bare `console.log`); nothing applicable on the static frontend beyond what `web-vitals` already reports.
6. **Quality tooling:** ESLint config already exists (`react-app` preset) — add Prettier and a pre-commit hook; no type checker planned (plain JS, converting to TypeScript would be a separate, larger decision — not assumed here).
7. **CI/CD:** GitHub Actions — install, lint, test (react-scripts test, non-interactive), build. Added before the bot-PR merge wave in Phase 3.2 so those merges have a real signal.

## Phase 5 — Tests

1. Fix/replace the stale `App.test.js` boilerplate assertion.
2. Add tests for `Contact` (form state, submit success/failure paths once the URL and typos are fixed), `MailchimpForm`/`Newsletter` (env var wiring), `NavBar` (scroll-state class toggle).
3. Run the suite for real, fix failures, rerun — `docs/TEST_REPORT.md` will record actual results, not assumed ones.

## Net new risks introduced by this plan

- None of the above changes existing business behavior except where it's fixing a bug (dead button, broken field, broken contact URL) — those are intentional, justified, and listed above.
- The two items needing your explicit approval before execution: **(a)** git history rewrite to purge the leaked credential, **(b)** default branch rename `master` → `main`. Everything else in Phases 3-5 can proceed without a separate check-in, per the working procedure in `CLAUDE.md`.
