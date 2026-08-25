# 005 — Site-Bot Switching-Cost Asset Inventory

- Task: handoff/pending/2026-08-24_005_waoengineer_switching-cost-asset-inventory.md
- Executor: waoengineer (read-only research; this report is the only new file)
- Date: 2026-08-24
- Method: every storage-location and survives-cancel claim below cites `file:line` or a real data
  path verified in the working tree. Hebrew content is referenced by path/field name only — never
  reproduced here.

---

## 0. Scope note (structural finding up front)

Site Bot is currently sold as a **one-time ₪9.90 checkout**, explicitly separate from the
recurring-subscription engine: `src/app/api/site-bot/checkout/init/route.ts:8-14` ("One-time ₪9.90
Site Bot checkout — separate from the recurring-subscription engine in subscriptions.ts"). The
cancel path analyzed here (`src/lib/payments/subscriptions.ts`) belongs to the recurring
subscription system. Two consequences:

1. For a one-time Site Bot purchase there is no subscription row to cancel at all today —
   "cancel" only has meaning for the recurring engine.
2. There is **no link anywhere between the payments DB and the client/site filesystem records**.
   `SubscriptionRow` (`src/lib/payments/db.ts:185-194`) carries `user_id` = email and no
   clientId/slug; `data/clients/{slug}/client.json` carries no subscriptionId. A cancellation
   today cannot even *identify* which site/client it belongs to. This is the single most
   important structural gap for the cancellation-policy decision (§5).

## 1. The cancel path, exactly as implemented

`src/app/api/subscriptions/cancel/route.ts:13` calls `cancelSubscriptionByToken`
(`src/lib/payments/subscriptions.ts:317-380`), which does exactly four things:

1. Validates+consumes the magic-link token (`subscriptions.ts:318`).
2. Rejects if already canceled (`subscriptions.ts:330-332`).
3. One SQL UPDATE: `status='canceled'`, `canceled_at`, `next_charge_at=NULL`,
   `cancel_reason='self_serve_magic_link'` (`subscriptions.ts:337-350`).
4. Best-effort payment-provider token deletion (`subscriptions.ts:352-369`) and one
   `canceled_by_user` event row (`subscriptions.ts:371-377`).

**Nothing else.** No filesystem deletion, no Cloudflare teardown, no GBP-side call, no client
notification beyond the payment-email layer. A repo-wide search for consumers of `status ===
'canceled'` finds only payments code and the account page UI
(`src/app/(product)/account/subscription/page.tsx:109`) — no cron job, poller, or rendering path
gates on subscription status.

## 2. Asset inventory

Loss-aversion column is an explicit **judgment** (per spec §3), not measured data.

| # | Asset | Storage location (evidence) | Survives cancel today? (evidence) | Loss aversion (judgment + rationale) |
|---|-------|------------------------------|-----------------------------------|--------------------------------------|
| A1 | **Live deployed site** — rendered 5-page brochure site + core-30 local-SEO pages, hosted on Cloudflare Pages with `{slug}.wao.co.il` custom domain + CNAME | Deployed by `src/app/api/site-bot/deploy/route.ts:181-198` (wrangler) and `:200-229` (domain/DNS); rendered from `data/sites/{slug}.json` read at `deploy/route.ts:66` | **Untouched.** Cancel (`subscriptions.ts:337-350`) has no Cloudflare call; no teardown code exists anywhere. Site keeps serving after cancel. | **High** — the visible, public-facing business asset; owners read "my website is live" as the core of what they bought, and it keeps working (and accumulating SEO) whether or not they pay. |
| A2 | **Generated site content JSON** — the owner's full onboarding answers (`collectedData`: niche, USP, guarantee, license, pricing, review quote, contact details) + all generated site copy (`copy`: hero, trust bar, about page, services, FAQ, guarantee block), plus optional `coreThirtyNodes`/`coreThirtyCopies` | `data/sites/{slug}.json`, written at `src/app/api/site-bot/generate/route.ts:199`; schema verified read-only on `data/sites/test-plumber-tlv.json` (slug line 2, `collectedData` lines 3-38, `copy` lines 39-103, `createdAt` line 104; optional core-30 fields typed at `deploy/route.ts:30-36`) | **Untouched.** Cancel touches no files. | **High** — it *is* the owner's own business data plus bespoke copy; rebuilding it elsewhere means redoing the entire interview and regeneration. |
| A3 | **Client dashboard record / account** — `clientId`, `siteUrl`, login `pin`, `entitlements`, `reviewFlywheelEnabled`, `reviewLink`, GBP account/location ids, `siteBotLaunchedAt` | `data/clients/{slug}/client.json`, created on first deploy via `ensureSiteBotClientRecord` (`deploy/route.ts:244-253`, defined at `src/lib/geo/client.ts:182`); shape confirmed on `data/clients/test-plumber-tlv/client.json` | **Untouched.** No deletion path. | **Medium** — it is "my account/dashboard", but owners mostly value what it shows (the assets below), not the record itself. |
| A4 | **Leads history** — every captured inquiry (name/phone/date/status/quality/revenue/closed flag + gclid/wbraid/gbraid attribution), one global file for all clients, per-lead `slug`/`customerId` fields | `src/data/leads.json`, path constant at `src/lib/crm/leadsStore.ts:14`; appended at `src/app/api/leads/route.ts:211-212`; per-lead attribution fields at `route.ts:200-208` | **Untouched.** Cancel never reads or writes this file. Note it is WAO-internal Mini-CRM storage, not client-scoped — an owner who cancels has no export path defined anywhere. | **High** — real customer inquiries and revenue records are the most concrete "mine" data an owner can imagine losing; also the feed for ROAS/optimization. |
| A5 | **Phone/WhatsApp click-intent events** | `src/data/phone-reveals.json`, path constant at `src/lib/phoneRevealStore.ts:23` | **Untouched.** | **Low** — attribution exhaust; invisible to owners, only meaningful as marketing diagnostics. |
| B1 | **GBP review snapshot** — latest polled review set per client (overwritten each poll; diff computed before overwrite, so only the latest snapshot is kept — no history) | `data/clients/{clientId}/gbp-reviews.json`, path at `src/lib/gbp/reviewStore.ts:29-31`, written at `:39-43`; polling entry `pollClientReviews` at `src/lib/gbp/reviewPoll.ts:64`, run via `scripts/review-poll.mjs` (not yet wired into cron — `review-poll.mjs:14-15`) | **Untouched.** No subscription-status gate in the poller; polling continues if invoked. | **Low–Medium** — it is a mirror of Google-hosted data, not owner-created content; value is the monitoring continuity, not the snapshot itself. |
| B2 | **Bad-review reply drafts queue** — AI-drafted replies awaiting owner approval (`status: drafted|posted`), append-only | `data/clients/{clientId}/review-responder-queue.json`, path at `src/lib/gbp/reviewResponderStore.ts:26-28`, append at `:37-44`; drafts produced by `draftRepliesForBadReviews` (`src/lib/gbp/reviewResponder.ts:33`) | **Untouched.** | **Medium** — pending protective work ("replies Google prepared for me"); loss is felt as exposure, since un-replied bad reviews stay exposed. |
| B3 | **Posted review replies — GBP-side** — replies actually published live on the owner's Google Business Profile | GBP servers (Google-side, outside this repo); posting at `src/app/api/gbp/review-reply/route.ts:70-77` | **Untouched and untouchable** — cancel has no GBP call, and once public on Google the reply persists regardless of WAO status. | **High** — public, permanent, reputation-bearing content the owner sees as theirs; also a hostage in the strongest sense: it keeps defending the business only while the loop runs. |
| B4 | **Posted-reply ledger** — per-post audit trail (edit distance, draft vs final length, postedAt) | `data/clients/{clientId}/review-responder-log.jsonl`, path+append at `src/app/api/gbp/review-reply/route.ts:26-34` | **Untouched.** | **Low** — internal QA telemetry; owners never see it. |
| B5 | **Review-reply "voice"/prompt state** | **Not a per-business asset today.** The voice is one global, code-level constant: `REVIEW_REPLY_SYSTEM_PROMPT` (`src/lib/gbp/reviewReplyPrompt.ts:9`) + `REVIEW_REPLY_FEWSHOT` (`:11-15`). The only per-business inputs are `businessName`/`businessNiche` injected at call time (`src/lib/gbp/reviewResponder.ts:109-114`). No per-client voice file, memory, or fine-tune state exists in the tree. | N/A — nothing per-client exists to survive. | **N/A today** — flagged as a design gap: a per-business learned voice would be a strong switching-cost asset, but it is not yet accumulated anywhere. |
| C1 | **GMB/GBP post & reply approval queue** — drafted posts and review replies with full approval history (`pending/approved-edited/approved-as-is/posted/rejected`) | `data/clients/{clientId}/gmb/queue/*.json` (one file per item), paths at `src/lib/gmb/store.ts:21-23`, write at `:75-78`; layout documented at `src/lib/gmb/types.ts:4-8` | **Untouched.** | **Medium** — accumulated approved/published content pipeline history; visible to owners as "the content WAO made for me". |
| C2 | **GMB connection + NAP scan + profile-completeness history** | `data/clients/{clientId}/gmb/connection.json`, `nap-scan.json`, `completeness.json` — `src/lib/gmb/store.ts:18-29`; both diagnostics keep `history` arrays (`src/lib/gmb/types.ts:61-74`) | **Untouched.** | **Low–Medium** — diagnostic time-series; value grows with months of scans but is invisible to owners. |
| C3 | **Immutable approval/post log** | `data/gmb-logs/{clientId}/log.jsonl` (`src/lib/gmb/log.ts:12`, adapter over `src/lib/shared/approvalLog.ts`) | **Untouched.** | **Low** — audit trail, owner-invisible. |
| D1 | **Review-generation flywheel queue** — review-request wa.me links queued per closed lead | `data/clients/{clientId}/review-flywheel-queue.json`, path at `src/lib/crm/reviewFlywheelStore.ts:22-24`; hook at `src/app/api/leads/route.ts:38-78` | **Untouched.** | **Low** — transient links; the underlying value (new Google reviews) lands GBP-side, not in this queue. |
| E1 | **Weekly performance digest** | **No persisted history exists.** Digests are computed on the fly per cron run from live GAQL + `src/data/leads.json` (`src/lib/google-ads/weekly-digest-batch.ts:75-153`), emailed, and discarded (`src/app/api/google-ads/weekly-digest-cron/route.ts:36-79`); WhatsApp variant is a stateless message builder (`src/lib/google-ads/whatsapp-digest.ts:4-48`). The only "history" is in the owner's email/WhatsApp inbox. | **Untouched (nothing to touch)** — but note the cron itself is not subscription-gated (`weekly-digest-batch.ts:62-73` enumerates clients by presence of `google-ads.json`, so a canceled client would keep receiving digests). | **Low as stored asset / Medium as habit** — there is no archive to lose, but the weekly "someone is watching my money" cadence is likely the most felt recurring value; loss would be experienced as the service going silent. |
| F1 | **Google Ads binding + brand-CPL baselines** — per-client Ads index and learned CPL baselines used by the operator's gating logic | `data/clients/{clientId}/google-ads.json` (existence check at `weekly-digest-batch.ts:72`); `data/clients/{clientId}/google-ads/brand-cpl-baselines.json` (path at `src/lib/google-ads/cpl-ceiling.ts:257`) | **Untouched.** | **Medium** — invisible to owners, but this is accumulated calibration ("the system learned my business's real cost-per-lead"); restarting elsewhere means re-learning from zero. |
| G1 | **GEO task content** (context only — GEO Bot, not Site Bot) | `data/clients/{clientId}/tasks/geo/*.json` (+ `_archive/`), e.g. observed under `data/clients/retter/`, `data/clients/aasada/` | **Untouched.** | Listed for completeness of the per-client asset family; classification is GEO's concern, not Site Bot's. |

## 3. Survives-cancel summary

For **every** asset above the answer is the same: cancellation today is a **billing-only freeze**.
Cancel sets the subscription row to `canceled` and nulls `next_charge_at`
(`subscriptions.ts:337-350`); it deletes, freezes, or exports **nothing**. Specifically:

- No asset deletion: the cancel function contains no fs calls and no reference to
  `data/sites`, `data/clients`, or `src/data` (entirety of
  `subscriptions.ts:317-380`).
- Live site keeps serving: Cloudflare project, custom domain, and DNS record
  (`deploy/route.ts:181-229`) have no teardown counterpart.
- Automation keeps running if invoked: no poller/cron/digest path checks subscription status
  (repo-wide search for `'canceled'` consumers returns only payments code + account UI).
- GBP-side published replies persist on Google regardless of anything WAO does (B3).

**Ambiguities flagged rather than guessed (per spec):**
1. Whether the one-time Site Bot checkout is ever meant to convert to the recurring engine is
   ambiguous — not explicitly handled (`checkout/init/route.ts:8-14`).
2. Whether cancel *should* stop the digest email / review polling is ambiguous — not explicitly
   handled; today they are status-blind.
3. No subscriptionId→clientId mapping exists anywhere, so no future teardown/freeze/buyout
   mechanic can currently locate the assets it would govern.

## 4. Loss-aversion ranking (rolled up)

- **High:** A1 live site, A2 site content JSON, A4 leads history, B3 posted GBP replies.
- **Medium:** A3 dashboard account, B2 reply-draft queue, C1 GMB content queue, E1 digest cadence
  (as habit, not as stored data), F1 Ads binding + CPL baselines.
- **Low:** A5 phone-reveals, B1 review snapshot, B4 posted-reply ledger, C2 diagnostics, C3
  approval log, D1 flywheel queue.
- **N/A today:** B5 per-business reply voice — does not exist yet as a per-client asset.

Pattern: the assets owners would fight hardest to keep are (a) the public, visible ones — the
live site and published review replies — and (b) the money trail — leads and their revenue data.
The invisible operational telemetry (logs, snapshots, baselines) is where a freeze/buyout could
be negotiated cheaply.

## 5. Open question (restated, not decided)

The unresolved cancellation-policy question (memory `project_site_bot_cancellation_policy_open`):
**on cancel, does WAO take the live site / GBP activity down, freeze them in place, or offer a
buyout (hand over the assets for a fee)?**

This report does not decide it. Assets that decision would govern:

- **Take-down vs freeze vs hand-over targets:** A1 (Cloudflare project + domain + DNS), A2
  (`data/sites/{slug}.json`), A3 (`client.json` dashboard account), A4 (`src/data/leads.json` —
  note it is a shared global file, so per-client extraction would be required before any
  export/hand-over).
- **Automation-stop targets:** B1 polling (`scripts/review-poll.mjs`), E1 digest cron
  (`weekly-digest-cron/route.ts`), F1 operator gating inputs.
- **Already beyond reach regardless of policy:** B3 (published replies live on Google), and any
  digest/lead emails already delivered to the owner's inbox.
- **Prerequisite for any policy:** a subscriptionId→clientId link does not exist today (§0); no
  cancel-side mechanic can be implemented before that mapping is added.

Escalation: None — read-only analysis.

## Verification gate

- `npm run build` — N/A (read-only task, no code changes).
- `npm run test` — N/A (read-only task, no code changes).
- `git status --porcelain` — see completion note; exactly one new untracked file belongs to this
  task (this report).
- Evidence — asset table above (§2); every claim cites `file:line` or a real data path.
