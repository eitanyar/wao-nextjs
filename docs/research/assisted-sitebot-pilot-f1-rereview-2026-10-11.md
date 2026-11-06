# Independent F1 re-review — assisted Site-Bot pilot

- Reviewer: waohebrewqa, gpt-6-luna / openai-codex (existing task-pinned route; no provider probe).
- Task: t_e31d3332.
- Status: DRAFT REVIEW / NOT APPLICATION AUTHORIZATION.
- Reviewed current companion: `docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md`. The earlier strategist SHA pin is stale after the correction; I did not compute a replacement hash.
- Also reviewed: `handoff/pending/2026-10-11_004_waocopy_assisted-pilot-evidence-wording.md`, the unchanged historical QA report, the reconciled playbook, and the named scoring, contact, audit-result/page, and Google Ads readiness/access-policy source seams.

## F1 disposition

**F1: PASS — corrected in the current draft; no further copy revision identified.** This is a fresh editorial finding for the two affected messages only, not a broad re-review or release approval.

- `SB_UNKNOWN_VERIFY`, companion `:265-277`: its English trigger note defines unknown as insufficient evidence, not a proven defect, and permits owner-supplied evidence, attributed owner confirmation, or separately authorized evidence. It expressly rejects an owner-only evidence route and says source presence alone does not establish accuracy or suitability. The Hebrew lines `:275-277` preserve the distinction between insufficient evidence and a defect and name owner confirmation, a supplied source, or a separately authorized check as possible bases. This is consistent with playbook `:36-40,54-56`.
- `WR_STATUS_LEGEND`, companion `:478-494`: the English note requires an identified source or owner-authorized evidence, source/date attribution, and suitable evidence of absence or attributed owner confirmation for a reviewed missing label. It defines unknown as insufficient evidence, not a defect. The Hebrew legend `:491-494` distinguishes supported, absent, and insufficient-evidence outcomes and does not restrict verification to owner attestation or owner-supplied sources. This matches playbook `:36-40,54,94`.
- The raw heuristic status remains distinct from operator-reviewed interpretation in both message notes. The draft does not claim that this review gathers evidence or implements a verification control.

## Focused regression and consistency checks

- The current companion retains the adjacent `SB_MISSING_ACTION`, `SB_CHECKLIST_CANDOR`, `WR_SCOPE_LIST`, and `WR_GAPS_TITLE` sections in the expected locations. Its message index remains present; I did not compute a fresh hash or make a mechanical before/after file comparison. The earlier report's historical FAIL is preserved unchanged and is not retroactively relabeled.
- Scoring source `src/lib/gbp/auditScore.ts:50-108` confirms heuristic thresholds and snapshot-field checks; a `fail` does not itself establish an editable real-world defect. `src/app/(app)/site-bot/audit/page.tsx:161-163,219-254` renders DIY instructions only for failed categories, hours, or photos; it does not establish a correction-recording control. `src/app/api/site-bot/audit-result/route.ts:43-44` returns a sole candidate as ready without an implemented confirmation gate.
- Contact regression remains bounded: `src/components/ContactForm.tsx:46,53-80` has idle/loading/success/error states and maps unacknowledged outcomes to error; `src/app/api/lead/route.ts:86-93,130-134` supports exact-recipient SMTP acceptance, not inbox or human receipt, and an error can follow a send attempt. The draft's success, failure, and separately proposed uncertainty wording remains consistent with those limits.
- The Ads-readiness language remains conditional manual planning, not an implemented end-to-end feature or account/ad action. The relevant source seams, `src/lib/google-ads/live-readiness.js:5-31` and `src/lib/google-ads/access-policy.js:6-45`, do not establish runtime/configuration acceptance or authorize mutations.

## Verdict and limits

**Focused editorial verdict: PASS for F1 and the specified regression checks.** No material Hebrew-register, gender/persona, evidence-route, or claim-boundary defect was found in the corrected regions. The companion remains DRAFT / NOT APPLIED. This review does not certify the full companion anew, runtime behavior, TTS/rendering, provider configuration, repository-wide preservation, or absence of actions beyond the records available here. The historical F1 FAIL remains as the result of its original run; this report records the new focused PASS only. Founder voice review, any copy application, runtime/visual acceptance, client/provider/action authorization, and release approval remain separate gates; `release_health=false`.