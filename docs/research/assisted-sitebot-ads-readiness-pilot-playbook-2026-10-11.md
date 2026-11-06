# Assisted Site-Bot + Ads-readiness pilot playbook

Date: 2026-10-11. Author: waostrategy. Task: t_41c0e772.
Status: INTERNAL DRAFT / NOT APPLIED. Service/workflow design only; not product acceptance, an implemented end-to-end feature, or authority to contact a client.
Companion: `docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md`, attributed to waocopy under t_a8a053d0, formally DONE/run1538. Its actual header still says `Revision: 3`; the later F1 correction is recorded in the author task, not a revision-4 artifact header. Independent t_e31d3332 is DONE/run1539 with focused F1 and specified-regression PASS. Historical package t_f78212d1 is DONE/run1540 with `FAIL / UNRESOLVED`; current package re-review is pending. Founder voice, application, runtime/visual, real-operation and release gates remain open; `release_health=false`, DEPLOY NO-GO.

## Outcome and limits

One consenting owner identifies his business, understands the available profile information, chooses one supported self-fix or optional agreed assistance, and receives a human-reviewed Ads-readiness worklist. The worklist plans the first one to two months; it does not create an account, connect a manager, accept billing, launch ads, or promise results.

This task authorizes documentation only. All interactions below describe future assisted operation. No pilot interaction, provider lookup, email, account action, runtime check, copy application, preview or release is authorized by this document. Existing blocked engineering/setup work remains blocked. The accepted paired V2 copy stays unchanged.

Evidence basis: `docs/research/shortest-real-mvp-path-2026-10-10.md`, especially lines 9–15, 20–25, 33–50; accepted V2 `docs/copy/site-bot-offer-conversion-redraft-2026-10-08-v2.md`, especially its journey map and claim checks. The supplied V2 SHA is historical/task-provided provenance, not a freshly recomputed hash here. Fresh source reads corroborate the bounded seams below, not their configured or runtime availability.

## Capability register

Labels apply separately to source existence and usable operation.

| Capability | Classification | Evidence and limit |
|---|---|---|
| Name-based lookup with input, rate, configuration and durable budget guards | Currently evidenced in source | `src/app/api/site-bot/audit-lookup/route.ts:POST:72–119`, `minimizeCandidate:54–69`. Actual provider success, configuration and approved budget are unverified. |
| Zero results, sole candidate, multiple-candidate choice and selected result | Currently evidenced in source | `src/app/api/site-bot/audit-result/route.ts:GET:20–52`, `readyResponse:11–17`. Correct business identity still requires owner confirmation. |
| Six-dimension available-information checklist | Currently evidenced in source | `src/lib/gbp/auditScore.ts:scoreAudit:45–114`. Heuristics are not ranking measures or proof of editable defects. |
| Conditional self-fix instructions for categories, hours and photos only | Currently evidenced by accepted prior report/draft source mapping | V2 lines 339–348 map `DIY_KEYS` and fail-gated rendering in `src/app/(app)/site-bot/audit/page.tsx:18,161–163,219–254`. Not freshly runtime-tested here. |
| Consented contact request and machine acknowledgement | Currently evidenced in source | `src/app/api/lead/route.ts:POST:96–134`, `sendLeadEmail:86–93`; V2 lines 269–273 map `ContactForm.handleSubmit`. Exact SMTP recipient acceptance only; human receipt, response and timing unverified. |
| Human assistance and business-specific follow-up | Proposed/manual | Requires named operator, agreement and actual later work. Contact submission does not establish assignment. |
| Client-owned account/payment and approval prerequisites | Currently evidenced in source | `src/lib/google-ads/live-readiness.js:assessLiveReadiness:5–31`. A prerequisite boolean is not real onboarding acceptance or a completed readiness worklist. |
| Account/session restrictions and locked live mutations | Currently evidenced in source | `src/lib/google-ads/access-policy.js:resolveGoogleAdsMutationAccess:13–42`. This document never enables mutations. |
| Complete first-1–2-month readiness review and recurring delivery process | Proposed/manual | Selected service scope in shortest-real-MVP report lines 13,38,49; no full application implementation asserted. |
| Real-device journey, integrated accepted copy, automated fixes, rankings, lead delivery, pricing, campaign changes and public release | Unverified/not accepted here | Separate implementation, language, runtime, provider and release gates remain. |

## Evidence vocabulary

Every finding records both raw observation and reviewed interpretation:

- Confirmed: the identified source or owner-authorized evidence positively supports the exact statement. Presence is not accuracy, suitability or effectiveness.
- Missing: a necessary readiness item was positively checked and found absent, or the owner confirms absence. Specify which source and what was checked.
- Unknown: unavailable, incomplete, stale, inaccessible or contradictory evidence. Never turn absent provider data into a confirmed business defect.

Keep raw `pass`/`fail`/`unknown` separately from these operator labels. For example, hours can fail when special hours are absent in the snapshot; description can fail when an editorial summary is absent; review counts use a heuristic threshold. None alone proves the owner's editable profile is wrong. A failed checklist criterion can be reported as such without alleging a missing real-world field. Photo count does not validate authenticity. Do not present review count as a promise of ranking improvement.

## One-owner operating journey

### 1. Identify the right business

Owner: provide business name; compare name and address when choosing a candidate. Confirm identity even if there is one match.
Operator: after separate authorization for real use, use the existing name-only route. Do not collect contact details as a condition of the free information check. Record query context, result timestamp, candidate identity and owner confirmation in a restricted operator record; do not put client PII or credentials in Kanban/public drafts.
Decision: several matches require selection before findings; ambiguous or wrong-address matches require clarification, not an automatic pick. No match means no available result, not no business or no Google presence.
Evidence to capture later: response class, minimal selected-candidate reference, owner confirmation and source/time. This draft captures no real client record.

### 2. Review available information

Owner: review the six dimensions: categories, hours, photos, phone/website, reviews and description.
Operator: retain the raw checklist status/evidence, then assign confirmed/missing/unknown using the vocabulary above. Explain the finding as information available to this check. For a potentially actionable absence, verify with owner-supplied or separately authorized evidence before recommending a specific edit.
Decision: a genuine actionable gap gets one next step; unknown gets a verification step; contradictory evidence gets reconciliation. Do not manufacture a complete report from a failed lookup.
Evidence to capture later: dimension key, raw evidence/status, reviewed label, source/time, owner correction and next action. Do not store unnecessary provider payloads or private account screenshots.

### 3. Choose one useful next action

Owner: choose self-fix or optional assistance; assistance is not required to retain the check's value.
Operator: use only the existing conditional categories/hours/photos self-fix instruction scope. Describe a review or correction the owner can perform, not an automatic write. Confirm that he has legitimate access; do not ask for passwords or verification codes. A completion statement needs owner confirmation or permitted post-change evidence, not the original checklist.
Decision: if unsupported, unavailable, access-blocked or outside those three dimensions, offer a verification step or separately scoped manual help. Optional WAO assistance requires mutual agreement on work and terms before any action; no current price/package or scheduled availability is asserted.
Evidence to capture later: chosen action, instruction reference, owner consent, completion evidence if any, unresolved item. No GBP change occurs in this documentation task.

### 4. Optional consented contact

Owner: voluntarily use the existing contact path and its required consent. Agree separately to any later service; submission alone is not a contract or live-account permission.
Operator: do not submit on the owner's behalf without separately authorized scope. The accepted V2 maps the UI success condition to HTTP OK plus parsed `ok:true`; the API waits for exact-recipient SMTP acceptance. Record only the observed result class in a restricted later record.
Decision: successful machine acknowledgement supports acknowledged sending only. It does not establish inbox delivery, reading, named-human assignment or response time. Missing acknowledgement does not prove nothing was sent. `ContactForm.tsx:53–80` collapses non-success and transport/parse exceptions into one error state; `lead/route.ts:130–134` can return an error after attempting SMTP. Restrict a definitive not-sent statement to evidence establishing rejection before any send attempt. Otherwise report unconfirmed sending and prefer verification through the published contact alternative; an optional retry may duplicate a request. A transport acknowledgement cannot mark an operator worklist assigned. A separately rendered uncertainty state is proposed/manual, not implemented by this form.
Evidence to capture later: consent evidence, result class/time and actual assignment only when separately confirmed. No email is sent now.

### 5. Prepare the assisted Ads-readiness worklist

Owner: identify desired lead outcome, service/geographic scope, account/payment owner and actual follow-up capacity. Supply only necessary evidence through an approved future path; no secrets in drafts or messages.
Operator: create a manual, business-specific worklist from authorized evidence. Have a named human reviewer check interpretation and unresolved launch prerequisites. Do not claim the application already produces this complete worklist.
Decision: missing or unknown launch-critical prerequisites mean not ready for launch. A readiness draft can still be delivered with those gaps clearly named. A configured flag or `eligibleForPilot` result is not sufficient to authorize spend or prove setup.

## Manual first-1–2-month readiness worklist

These are proposed planning phases, not a delivery SLA or campaign-management promise. Planning proceeds without Ads mutations; later execution needs its own scope and consent. Month-two work does not presume month-one launch.

| Planning phase | Review item | Evidence needed before calling it confirmed | Decision/output |
|---|---|---|---|
| Month 1: prerequisites | Client-owned Ads account and payment profile | Owner-authorized account ownership/billing confirmation | Separate Google spend from WAO service terms; no terms acceptance on client's behalf. |
| Month 1: permissions | WAO manager relationship, named approver, contact and consent | Authorized confirmation of each prerequisite | Missing/unknown manager access remains unresolved; do not issue invitations now. |
| Month 1: goal and offer | Intended qualified lead, offer, geography and exclusions | Owner-reviewed brief | Define what counts as a useful lead without predicting volume. |
| Month 1: landing-page fit | Relevant offer, clear contact action, business details and usable mobile journey | Separately permitted real-page observation | List gaps; page existence alone does not prove conversion readiness. |
| Month 1: measurement | Intended conversion, observed tracking behavior and attribution limits | Permitted test evidence, not just tag presence | Label untested tracking unknown; distinguish submission from qualified lead. |
| Month 1: follow-up | Responsible person, practical follow-up route and handling capacity | Explicit operator/owner confirmation | No response-time promise without an agreed and evidenced process. |
| Month 1: release gates | Access, billing, consent, tracking, page and review gaps | Reviewed prerequisite list | Issue a human-reviewed readiness worklist, not launch authorization. |
| Month 2: conditional review | If separately authorized activity later exists: lead quality, tracking discrepancies and follow-up gaps | Authorized observed data with period/source/limits | Recommend human-reviewed next steps; never fabricate performance when no activity exists. |
| Month 2: still pre-launch | If launch remains gated: outstanding prerequisites and owner choices | Updated evidence for each open item | Continue readiness work; do not declare account/ad changes or results. |

Each proposed worklist row uses: item; confirmed/missing/unknown; exact supporting source/date; gap or contradiction; next safe action; responsible role; prerequisite/consent gate; human reviewer/disposition. All unknowns stay visible in the delivered draft.

## Exceptions and escalation

- Invalid input: request a corrected name; do not infer business details.
- Rate/budget ceiling: stop lookup retries; no ceiling or policy override.
- Missing provider configuration/budget store or provider/storage error: report check unavailable. Manual readiness planning can continue from clearly attributed owner-supplied evidence after separate consent.
- Incorrect or disputed candidate: stop business-specific findings until identity is resolved.
- Incomplete provider fields: use unknown/review-needed, not a fabricated defect or automatic repair.
- No profile access: leave self-fix pending; no credential collection or account takeover.
- Contact failure/uncertainty: no successful-send or human-receipt claim; use existing retry/contact alternative conditionally.
- Consent declined: leave optional help unstarted. Free findings are not withheld.
- Ads prerequisite missing: retain the readiness draft with open gaps. Never create accounts, connect MCC, accept billing or spend to make a checklist green.
- Sensitive or conflicting evidence: minimize, restrict access and ask the named authorized reviewer to reconcile; no PII in board handoffs.

## Repeat-delivery discipline for 50 owners

Proposed/manual, not demonstrated capacity: use the same stage checklist and worklist schema for every owner. Keep one restricted record per owner and one named operator responsible for the next action. Suggested operational states: identity pending; information reviewed; next action selected; contact outcome observed; assistance agreed/assigned; readiness draft prepared; human reviewed; held at named gate.

Count progression only from real evidence. Separate contact submissions from acknowledged sends, human assignments, reviewed worklists and launch-ready cases. Do not call 50 drafted records 50 served clients. Use exception reasons to improve the process; no throughput, staffing or turnaround forecast is established here. Repeated work never overrides per-owner consent or account boundaries.

## Known gates and next use

This playbook requires no owner approval to exist as an internal draft. Before customer-facing use: independent Hebrew/claim review on the companion's exact bytes and founder voice spot-check at the normal later gate. No copy review is requested in this task. Any application requires a separate scoped engineer contract and existing independent runtime/desktop/mobile gates; current accepted V2 application/SEO gates remain separate.

Before real lookup/contact: named consenting business/recipient, approved provider budget/scope, configured capability and real-device observation. Before account/billing/Ads changes: separate client-owned permissions, account/payment/spend decisions and explicit action scope. Public release/publication/deployment remain distinct and are not authorized here.

## Supervisor draft-acceptance checkpoint

Reconciliation owner: t_947958bb, English documentation only. Controller preflight on this card, dated 2026-10-11 00:18 Asia/Jerusalem, reports the complete all-status mission duplicate census, five-board running census and interactive/shared-writer inspection with no competing task/artifact writer. This is controller-attributed evidence, not a census performed by this file-only reconciliation. Fresh native task reads show canonical t_a8a053d0 DONE/run1538, independent language reviewer t_e31d3332 DONE/run1539, package verifier t_f78212d1 DONE/run1540 and coordinator t_b625e615 DONE/run1542. Both draft artifacts were read directly and remain separately attributed and NOT APPLIED.

Current artifact observations (line references read from the current companion, not historical review maps):
- Header at companion :5 still says `Revision: 3`. The canonical author record calls run1538 the F1 correction and explicitly reports leaving header/history unchanged. Its operator revision-4 label is task-record attribution, not the observed artifact revision.
- `SB_STATUS_MISSING` at :236–245 reports an unmet check criterion, not a proven absence, invalid profile or mandatory edit; current English summary item 9 at :542–551 retains that boundary.
- `SB_UNKNOWN_VERIFY` at :265–277 and `WR_STATUS_LEGEND` at :478–494 permit appropriate evidence, attributed owner confirmation or separately authorized evidence, with source/date and raw-status versus reviewed-interpretation distinctions. Unknown is insufficient evidence, not a proven defect. No implemented evidence-gathering control is asserted.
- Contact messages at :395–428 distinguish machine exact-recipient SMTP acceptance from inbox/human receipt; failure is unconfirmed sending and warns of possible retry duplication. Separate uncertainty messages at :430–444 remain PROPOSED. This corroborates the draft wording; source-boundary support is attributed to the independent focused report, not freshly inspected here. Runtime acceptance remains unverified.
- Categories instructions at :307–316 make no update-time promise. Access and consent notes at :298–305,374–391 remain scoped to this workflow/form. Manual Ads-readiness worklist at :446–513 is conditional human-reviewed planning, not automation, account creation, manager connection, billing or ad launch. Sole-match confirmation, correction intake and completion recording remain PROPOSED.

Historical outcomes remain attributed, not overwritten: t_f78212d1/run1534 recorded package FAIL pending playbook reconciliation; its later run1540 recorded `FAIL / UNRESOLVED` for the stale checkpoint and retained evidence limitations. That later record's assertion that the current companion is revision 4 conflicts with the directly observed header at :5; its statement that the verifier was running describes its review-time state, not today's formal DONE readback. This correction does not retroactively overturn either package verdict or supply the missing repository-wide preservation proof.

Historical language report `docs/research/assisted-sitebot-pilot-independent-qa-2026-10-11.md:76` states `Editorial verdict: FAIL pending F1 correction.` That run1536 result remains historical. Fresh report `docs/research/assisted-sitebot-pilot-f1-rereview-2026-10-11.md:11–26` records independent focused F1 and specified-regression PASS under t_e31d3332/run1539. The fresh focused language/claim gate is therefore already satisfied; it is not another pending copy task, a new full-companion certification, founder approval or independent package PASS. The companion's :35–37,587–594 pending-QA/history notes are frozen drafting notes, not current reviewer state; this reconciliation does not edit them.

Current disposition: English checkpoint reconciled for internal documentation; independent current package acceptance remains UNRESOLVED pending one narrow read-only package re-review. Supervisor/coordinator DONE and focused F1 PASS are not substitutes for that verdict. Direct evidence here is exact artifact/report reads and native board records. Author claims of exactly two-region edits, other-message byte preservation and broader absence of prohibited actions remain worker/task-record evidence; coordinator hash checks are attributed prior evidence, not fresh hashes or repository-wide comparisons performed here.

Single next autonomous step: one read-only independent package re-review by waoverifier, with formally DONE t_947958bb as its concrete parent and a new complete Contract v3. Do not duplicate the satisfied focused Hebrew gate, reopen canonical copy, revive VOID t_cc382d08, reopen the root or change held engineering/setup. Founder voice remains deferred to its normal later gate; any application requires separate scoped authorization and independent runtime/desktop/mobile acceptance. Accepted V2/protected SEO, actual-client access, permitted setup/security/build preflight, bounded real lookup/contact smoke, client/provider/account/payment/spend permissions and complete release/exact-remote-SHA gates remain separate. No customer-facing use or launch-scope narrowing is authorized. October 11, 2026 09:00 manual-deploy window and 10:00 public target Asia/Jerusalem are unchanged targets, not approvals; routing after the public target requires explicit dated owner extension. `release_health=false`; DEPLOY NO-GO.
