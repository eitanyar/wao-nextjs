# Independent Hebrew and claim QA — assisted Site-Bot pilot

- Reviewer: waohebrewqa, gpt-6-luna / openai-codex (existing configured route; no provider probe).
- Task: t_e31d3332.
- Status: DRAFT REVIEW / NOT APPLICATION AUTHORIZATION.
- Reviewed: `docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md` (strategist-supplied SHA-256 pin: `056ae42516b4fc176a4eb135af393f0098cd0e8d0fbd62ebd54d775b1b8ffef9`); `docs/research/assisted-sitebot-ads-readiness-pilot-playbook-2026-10-11.md` (strategist-supplied SHA-256 pin: `5b68cc6bb36f5a66bc306decb2cdd65149646e320b3a52605e773fdfc9e1930e`). Pins were supplied by the strategist; I did not compute hashes.
- Source evidence read: `src/lib/gbp/auditScore.ts:45-114`; `src/components/ContactForm.tsx:46,53-80`; `src/app/api/lead/route.ts:86-93,96-135`; `src/app/api/site-bot/audit-result/route.ts:11-52`; `src/app/(app)/site-bot/audit/page.tsx:16-18,141-163,219-254`; `src/lib/google-ads/live-readiness.js:5-31`; `src/lib/google-ads/access-policy.js:6-45`.

## Coverage

All 46 IDs in the companion's index were found in artifact order, reviewed once, and scored separately for Hebrew/register and claim fidelity. PASS means no material issue identified; it is not founder voice approval or product acceptance.

| Stable ID | Lines | Language | Claim | Finding |
|---|---:|---|---|---|
| SB_SEARCH_PROMPT | 104-111 | PASS | PASS | — |
| SB_SEARCH_BUTTON | 113-115 | PASS | PASS | — |
| SB_SEARCH_BUSY | 117-121 | PASS | PASS | — |
| SB_NAME_INVALID | 123-128 | PASS | PASS | — |
| SB_PICK_PROMPT | 132-140 | PASS | PASS | — |
| SB_PICK_OPTION_BUTTON | 142-144 | PASS | PASS | — |
| SB_CONFIRM_SOLEMATCH | 146-154 | PASS | PASS | — |
| SB_CONFIRM_YES | 156-158 | PASS | PASS | — |
| SB_CONFIRM_NO | 160-162 | PASS | PASS | — |
| SB_NOT_MY_BUSINESS | 164-172 | PASS | PASS | — |
| SB_SELECTED_ACK | 174-179 | PASS | PASS | — |
| SB_NOMATCH_TITLE | 183-185 | PASS | PASS | — |
| SB_NOMATCH_BODY | 187-195 | PASS | PASS | — |
| SB_UNAVAILABLE_TITLE | 199-201 | PASS | PASS | — |
| SB_UNAVAILABLE_BODY | 203-211 | PASS | PASS | — |
| SB_UNAVAILABLE_ALT | 213-219 | PASS | PASS | — |
| SB_CHECKLIST_INTRO | 223-230 | PASS | PASS | — |
| SB_STATUS_CONFIRMED | 232-234 | PASS | PASS | — |
| SB_STATUS_MISSING | 236-245 | PASS | PASS | — |
| SB_STATUS_UNKNOWN | 247-252 | PASS | PASS | — |
| SB_MISSING_ACTION | 254-263 | PASS | PASS | — |
| SB_UNKNOWN_VERIFY | 265-273 | FAIL | PASS | F1 |
| SB_CHECKLIST_CANDOR | 275-280 | PASS | PASS | — |
| SB_SELFFIX_OFFER | 284-292 | PASS | PASS | — |
| SB_SELFFIX_ACCESS_NOTE | 294-301 | PASS | PASS | — |
| SB_FIX_CATEGORIES | 303-312 | PASS | PASS | — |
| SB_FIX_HOURS | 314-322 | PASS | PASS | — |
| SB_FIX_PHOTOS | 324-334 | PASS | PASS | — |
| SB_FIX_DONE_CONFIRM | 336-345 | PASS | PASS | — |
| SB_FIX_OUT_OF_SCOPE | 347-355 | PASS | PASS | — |
| SB_HELP_OFFER | 359-368 | PASS | PASS | — |
| SB_HELP_CONSENT_LINE | 370-378 | PASS | PASS | — |
| SB_CONSENT_DECLINED | 380-387 | PASS | PASS | — |
| CT_SUCCESS_TITLE | 391-393 | PASS | PASS | — |
| CT_SUCCESS_BODY | 395-406 | PASS | PASS | — |
| CT_FAILURE_TITLE | 408-410 | PASS | PASS | — |
| CT_FAILURE_BODY | 412-424 | PASS | PASS | — |
| CT_UNCERTAIN_TITLE | 426-428 | PASS | PASS | — |
| CT_UNCERTAIN_BODY | 430-440 | PASS | PASS | — |
| WR_INTRO_TITLE | 444-446 | PASS | PASS | — |
| WR_INTRO_BODY | 448-459 | PASS | PASS | — |
| WR_SCOPE_LIST | 461-472 | PASS | PASS | — |
| WR_STATUS_LEGEND | 474-484 | PASS | PASS | F1 |
| WR_GAPS_TITLE | 486-488 | PASS | PASS | — |
| WR_GAPS_BODY | 490-499 | PASS | PASS | — |
| WR_NOT_A_PROMISE | 501-503 | PASS | PASS | — |

## Material finding

**F1 — Moderate — COPY REVISION.** Companion `SB_UNKNOWN_VERIFY`, `:265-273`, and `WR_STATUS_LEGEND`, `:474-484`, narrow the accepted evidence route to owner confirmation or a source “on your behalf.” That phrasing leaves the verification rule unclear and can suggest that other permitted, separately authorized evidence is excluded. The playbook `:36-40,51-56,94` distinguishes evidence labels from raw statuses and allows owner-supplied or separately authorized evidence; source presence alone is not sufficient proof of accuracy or suitability. Required semantic correction (English only): state clearly that “unknown” means insufficient evidence and that a gap is confirmed only from an appropriate permitted source or owner confirmation; do not imply owner attestation is the only route. Keep source and date attribution and the distinction between raw heuristic status and reviewed interpretation. No Hebrew replacement drafted.

## Boundary and checkpoint review

- The corrected `SB_STATUS_MISSING` label at `:236-245` reports an unmet check criterion, not profile invalidity, a real-world absence, or a mandatory edit. `auditScore.ts:50-108` supports that distinction: heuristic failures include threshold and snapshot conditions. English claim summary item 9 at `:532-541` agrees. The historical verifier t_f78212d1's package FAIL was specifically the stale English playbook checkpoint; it remains a historical FAIL and is not relabeled. The reconciled playbook `:5,121-138` now describes the correction and remaining gates consistently.
- Contact claims are bounded: success `:391-406` is machine acceptance for the exact recipient, not inbox delivery or human receipt; source `lead/route.ts:86-93,130-134` and `ContactForm.tsx:71-80` support that boundary. Failure `:408-424` does not infer that nothing was sent and warns that retry can duplicate; source error handling may fail after a send attempt. The separate uncertainty state `:426-440` is expressly proposed, consistent with the four implemented form states at `ContactForm.tsx:46,78-80`.
- Proposed sole-match confirmation, correction intake, completion recording, and uncertainty UI remain labeled proposed; corresponding current source seams do not implement those controls (`audit-result/route.ts:43-44`; audit page `:141-163,219-254`; ContactForm `:46`). Manual help and the Ads-readiness worklist remain conditional, separately agreed, human-reviewed planning—not automatic product capability or account/ad action (`:357-368,442-503`). Ads readiness and access-policy source `assessLiveReadiness:5-31` and `resolveGoogleAdsMutationAccess:6-45` are source evidence only, not runtime/configuration acceptance.
- Categories/hours/photos instructions are limited to the supported DIY dimensions; the copy makes no update-time guarantee. Consent and no-password/no-code statements are scoped to this form/workflow. No ranking, visibility, photo-authenticity, guaranteed outcome, price, assignment, response-time, or automatic mutation claim was found.
- Persona/register is consistently addressed to a singular male owner. Compact labels and step lists are appropriate for interface copy; no TTS-breaking wording or materially confusing imperative was identified beyond F1. No TTS or rendered page was run.

## Verdict and limitations

**Editorial verdict: FAIL pending F1 correction.** The other 45 stable IDs passed separate language and claim review. Formal board outcome is recorded separately at completion; this report's editorial FAIL is not a task-execution failure. The playbook checkpoint contradiction is resolved, but the remaining evidence-wording ambiguity is material to how an owner verifies a proposed gap. The companion remains DRAFT / NOT APPLIED. Founder voice spot-check, any application, runtime/visual verification, provider/client operation, and release authorization remain separate gates; release health is false.

The exact current artifacts and named source seams were read directly. The operator's mid-run note reports that the strategist independently recomputed the companion, playbook and protected V2 SHA pins before and after dispatch and found them unchanged, and that the tracked `data/clients` diff was clean. This is dispatch-window evidence reported by the operator, not a hash or repository check I performed; it does not establish preservation across earlier work or prove the absence of all unrelated changes. I did not independently compute the supplied hashes, inspect live provider/configuration state, execute tests/builds, render copy, or perform external actions. Prior worker claims about broader untouched-file preservation and prohibited-action absence remain task-record/self-report evidence, not independent filesystem-wide proof. No reviewed source or draft was edited; this report is the only file created by this review.
