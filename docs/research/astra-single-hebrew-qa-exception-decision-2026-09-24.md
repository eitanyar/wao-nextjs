# Astra Single Hebrew QA Exception Decision — 2026-09-24

## Decision

Use one independent Hebrew review for the Astra real-proof copy, followed by the report's exact three corrections, without a second Hebrew-QA card. This is Eitan's explicit exception for this correction only; it is not a general waiver of Hebrew review.

## Accepted Evidence Gate

The engineer may start the combined 004+008 run only when all of the following are true:

- `docs/copy/astra-real-proof-eeat-copy.qa.md` exists and records exactly three replacements at `accountable_review.lines[0]`, `decision_guide.unsure_prompt.line`, and `partner_proof.coverage_line`.
- Correction card `t_6a800831` is formally done and records only those three source-path changes.
- `docs/copy/astra-real-proof-eeat-copy.json` parses and has SHA-256 `0019a495a39570bc8c81b32fd516731865fcfea263b92187a65679ae7a744d09`.
- Reversing only the three report replacements in memory reconstructs the reviewed baseline SHA-256 `023c1996976c4a93de338976e70a358d65211a9aa93689c9e8786f56afd5880c`.
- Git/correction scope is narrow, and all destinations, video/Partner/source-use claim boundaries, and the complete `accessibility` object remain unchanged.
- The engineer copies the corrected source byte-for-byte and types zero Hebrew bytes.

Local verification on 2026-09-24 confirmed the corrected hash, all three exact path values once each, absence of the old values, the reconstructed baseline hash, the same seven top-level keys, valid JSON, and a trailing newline.

## Source Paths

- Original review: `docs/copy/astra-real-proof-eeat-copy.qa.md`
- Corrected source: `docs/copy/astra-real-proof-eeat-copy.json`
- Correction contract: `handoff/pending/2026-09-24_010_waocopy_correct-astra-proof-qa.md`
- Engineering contracts preserved: `handoff/pending/2026-09-24_004_waoengineer_implement-astra-real-proof.md` and `handoff/pending/2026-09-24_008_waoengineer_add-basic-accessibility-control.md`
- Gate amendment: `handoff/pending/2026-09-24_012_waoengineer_use-single-hebrew-qa-gate.md`

## Unchanged Release Boundary

Every other requirement in 004 and 008 remains binding. The exception does not permit unreviewed copy, adjacent rewriting, fallback Hebrew, a fourth correction, weakened tests, or omission of independent runtime/visual verification. Eitan's final founder-facing Hebrew and source-use spot-check, the fresh Tailscale owner-review gate, and the no-commit/push/deploy boundary remain mandatory.
