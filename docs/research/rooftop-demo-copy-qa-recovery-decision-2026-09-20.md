# Rooftop Demo Copy QA Recovery Decision

Date: 2026-09-20
Decision: Select one narrow content correction followed by a fresh independent Hebrew-QA card. Do not simplify or abandon the demo.

## Independently verified evidence

- Current artifact: `docs/copy/site-bot-fictional-rooftop-demo-site.json`
- Current artifact SHA-256: `eecee53d0e43304170d92379fd99afe3167002cf85cb5bfe7b0e2839cd09f838`
- Original handoff SHA-256: `8a6be0d443c683566189520e37d5c18629c2acb4506f2e268938ca1f265c2b5a`
- The current JSON parses and retains `approval.copyStatus: pending_hebrew_qa`, `approval.visualStatus: brief_only_not_generated`, and `approval.engineerUse: false`.
- The three strings identified by the latest QA report are present at the exact paths below. Comparison with `/tmp/wao-fictional-rooftop-professional-notebook.json` confirms that the source describes one tear near an air-conditioning opening and an owner-led inspection, but does not support a prevalence claim, a categorical roof-wide superlative, or the stated subcontractor/call-center business model.
- The repository is already broadly dirty. The artifact is untracked; this decision does not infer ownership of any unrelated path.

## Worker claims preserved as evidence

- `t_f1343479` is formally `blocked`. Its reports claim structural/hash checks passed and identify the first claim-safety and inert-preview defects.
- `t_4d0ae7d8` is formally `blocked`. Its report claims all earlier named corrections passed and identifies three remaining unsupported claims.
- These are independent worker reports, not strategist-authored PASS evidence. Both cards, their runs, comments, events, and blocked outcomes are immutable and must not be retried, edited, or used as runnable parents.

## Permitted correction scope

Only these existing JSON values may change:

1. `siteDraft.pages[2].copy.aboutPageBody` — remove the unsupported prevalence assertion and retain non-quantified inspection-risk wording around air-conditioning openings.
2. `siteDraft.pages[2].copy.serviceDetails[1].description` — remove the categorical superlative and describe this as an important inspection point.
3. `siteDraft.pages[1].copy.aboutBlurb` — remove the unsupported subcontractor/call-center operating-model assertion and retain only the source-supported owner-led inspection narrative.

No other JSON path, copy, schema, order, metadata, source lineage, visual brief, approval value, repository file, or historical handoff may change. The baseline artifact hash above must match before correction.

## Recovery path

Author exactly one correction contract: `handoff/pending/2026-09-20_004_waocopy_correct-rooftop-claims.md`. Do not dispatch it from this decision task. After a future correction run completes, use a newly created `waohebrewqa` card bound to the corrected artifact hash; do not retry either blocked QA card. Engineer use, image generation, UI/runtime wiring, publication, and deployment remain prohibited until that fresh QA card formally passes and creates the required SHA-bound sidecar.
