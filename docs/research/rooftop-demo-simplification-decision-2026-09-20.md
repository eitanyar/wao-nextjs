# Rooftop Demo Simplification Decision

Date: 2026-09-20
Decision: Abandon the fictional Hebrew rooftop-site artifact and use the already-supported synthetic pilot rehearsal.

## Outcome

- Cannot approve or dispatch `docs/copy/site-bot-fictional-rooftop-demo-site.json` for engineer consumption.
- Can continue local Site-Bot rehearsal with `fixtures/site-bot/pilot-rehearsal.json` and `scripts/site-bot-pilot-rehearsal.mjs`.
- The current Hebrew artifact is non-dispatchable: `approval.copyStatus` is `pending_hebrew_qa`, `approval.engineerUse` is `false`, its QA sidecar is absent, and the latest independent QA card is formally blocked.

## Independently verified evidence

- Current artifact SHA-256 is `eed367d6601fa88ceb04e31547df654b771588e5027760032b9a93dcca7de588`; source SHA-256 is `35e164c204bab8e0a34f7558f3a935e45b177e54f6ba6e9e9306df89177456ee`.
- The artifact parses, its `intakeDraft` equals the source notebook, and its approval state remains `pending_hebrew_qa` / `brief_only_not_generated` / `engineerUse: false`.
- Direct comparison with `src/lib/lp/lpCopyPrompt.ts:11-35` finds nine over-limit values: page 0 `heroCta`, `formHeadline`, `stickyBarLine`; page 1 `formHeadline`, `stickyBarLine`; page 2 `heroSubheadline`, `heroCta`, `formHeadline`, `stickyBarLine`.
- The supported synthetic rehearsal is explicitly synthetic, loopback-only, inert, non-deployable, and uses the reserved `.invalid` origin. A fresh run of `node --test scripts/site-bot-pilot-rehearsal.test.mjs` passed all 5 tests, including approval gating, inert rendering, no non-loopback requests, cleanup, and CLI safety.
- The repository was already broadly dirty; the Hebrew artifact and this report are untracked. This task changed only this report.

## Worker claims and formal board evidence

- `t_f1343479`, `t_4d0ae7d8`, and `t_76222506` are formally `blocked`.
- Their QA reports claim successive material defects in claim safety, inert-preview clarity, schema limits, and unsupported availability/outcome/prevalence/timing language. Those language judgments remain worker evidence; they are not restated as strategist PASS findings.
- The latest QA worker also reports that hashes, JSON/source equality, base structure, approval flags, and visual-brief state pass, while no QA sidecar was created.

## Why the previous correction was insufficient

The recovery contract allowed changes at exactly three JSON paths selected from the second QA report. It did not require an exhaustive validation of every `SiteCopy` length limit or an artifact-wide claim-safety review before fresh QA. The correction therefore passed its narrow three-path contract while leaving nine independently confirmed schema violations and additional worker-reported claim defects elsewhere. A further path-by-path correction would repeat the same discovery loop rather than produce a small, fully bounded recovery.

## One next action

Use the existing synthetic pilot rehearsal as the sole local rooftop demonstration path; do not correct, QA, wire, generate assets for, publish, or dispatch the abandoned Hebrew artifact.
