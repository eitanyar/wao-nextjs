# Site-Bot Research — Aug 2026

This folder holds the strategist-commissioned research reports that decide how we make Site-Bot a
no-brainer for micro-businesses and hard to cancel. Each report answers one question and is produced
by a Hermes agent from a spec in `/handoff/`.

## Reports in this batch

| File | Question it answers |
|------|--------------------|
| `004_activation-instrumentation-audit.md` | What does the trial→charge funnel already measure, and what's the smallest hook to track time-to-first-value? |
| `005_switching-cost-asset-inventory.md` | Which owner-specific assets accumulate, where do they live, and do they survive a cancel? (loss-aversion map) |
| `006_onboarding-decision-set-autofill.md` | Every question onboarding forces, and the irreducible floor after GBP autofill. |
| `007_referral-attribution-feasibility.md` | Minimal schema/hook to attribute a referral and grant a reward on first real charge. |
| `008_retention-interview-script.md` | Hebrew 5-question interview script to surface perceived switching cost (human-gated). |
| `skira-transcript.md` | Verbatim Hebrew transcript of the investor-facing "סקירת מוצר ומפת דרכים" deck (source: Drive PDF / Claude artifact 02edbc3d). |
| `skira-sabra-rewrite.md` | The same deck rewritten in native Sabra Hebrew by `waocopy` (human-gated). |
| `009_ulku-local-ranking-fact-check.md` | Is Caleb Ulku's local+AI ranking method real? Full-transcript analysis, evidence grading, and the adopt/adapt/reject list for site-bot. |
| `010_audit-first-wedge-build-plan.md` | Build plan turning §8's audit-first-wedge decision into the 13-task spec decomposition in `handoff/pending/` (dependency graph + open items). |

## Feeds these open decisions (strategist-owned)
- Cancellation policy — down / freeze / buyout (memory `project_site_bot_cancellation_policy_open`).
- Whether to build referral attribution at all — pending a manual, no-code referral test first.
