# Site Bot product-truth check (Roni, verifier, read-only, 2026-11-24)

**Verdict: FAIL for the pilot as the page and terms stand.** The review kit is the only review or GBP promise that is built. The GBP write path and review-reply posting are off or stubbed. The monthly report has no code at all. The terms promise GBP management, review replies and the report.

How I checked: I curled live https://www.wao.co.il/site-bot (HTTP 200) and read the rendered Hebrew. I probed live GET routes and read the code on hermes-migration. I changed nothing and called no paid API. I did not ssh to prod, so prod env values are inferred from live probes. The local `.env.local` has `GBP_INTEGRATION_ENABLED=true` at line 109, but that is the dev file, not prod.

Two caveats:
- **Possible deploy lag.** I can't see which commit prod runs. The live page was served from cache on 23 Nov and HEAD is dated 23 Nov, so it is probably current, but I didn't confirm it.
- **Launch stamp.** The live page has no date: it says "פיילוט ראשון: 10 עסקים בלבד." (`landingCopy.generated.ts:5`, rendered at `src/app/(app)/site-bot/page.tsx:131`). The 19.11 stamp is gone, so the "never ship copy for a piece that isn't live once the stamp is gone" rule in `docs/missions/site-bot-full-system-launch-2026-11-19.md` now applies to every line below.

## Live probes (prod)
- `/site-bot` 200.
- `/site-bot/audit` 200.
- `/site-bot/start` 307, so the paid flow is closed. The gate is `src/lib/site-bot/paidFlowGate.ts:19-26`. It is closed unless `SITE_BOT_PAID_FLOW` is `open` or `rehearsal`.
- `/site-bot/pay`, `/site-bot/account`, `/api/gbp/oauth/start`, `/api/gbp/fix-execute` and `/google-ads/terms` all return 404. The first two are probably behind the gate. The last is the unpublished Ads Bot terms page. The two `/api/gbp/*` routes were my guesses at the paths, so they don't speak for the real site-bot routes.
- `/api/gbp/review-reply`: GET returns 405 and POST returns 401, so it is auth-gated and not public.

## Table
| Promise | Where | Status | Evidence |
|---|---|---|---|
| Free check: business name only, no signup, results in seconds | Page (hero, "בדיקה חינמית") | LIVE | `/site-bot/audit` returns 200. Same as 11-12. |
| Price 199 ₪ + VAT per month, no commitment, no trial, online cancel | Page, FAQ; terms §7 | NOT LIVE, because there is no purchase path in prod | `/site-bot/start` returns 307 (flow closed). `paidFlowGate.ts:19-26`. Recurring billing is unconfirmed for the pilot, so this needs the manual-invoice path. |
| Page per service (service tree) and click-to-call | Page, section 1 | LIVE (built) | Unchanged since 11-12 (`researchedSite.ts`, `renderSitePages.ts`). |
| Opening hours on the site | Page, section 1 | LIVE (built) | Unchanged since 11-12 (`renderSitePages.ts:666-682`). |
| Live in 1 business day on a wao.co.il address; own domain in 3 business days | Page FAQ; terms §6 | HAND-DELIVERABLE | The 3-day own-domain attach was NOT BUILT on 11-12 and I found no new attach code. The one-day timing depends on the paid flow, which is closed. |
| A person reviews every site before it goes live | Page ("עין אנושית"); terms §2 | LIVE (process) | Staff approval step. Not a code feature. |
| "Profile and site tell the same story … we keep this match every month" | Page, section 2 | HAND-DELIVERABLE | `executePatch` is called only from tests (grep over `src`, `scripts`). `src/app/api/site-bot/fix-execute/route.ts` returns 503 `fix_execution_disabled`. |
| Manual profile alignment in month 1 | Page FAQ | HAND-DELIVERABLE | Same evidence. It is a manual task for staff. |
| WAO manages the GBP as a manager, owner stays owner (also "profile stays yours") | Page; terms §2, §5 | NOT BUILT / OFF | `src/app/api/site-bot/gbp/oauth/start/route.ts` and `callback/route.ts` return 503 `gbp_oauth_disabled`. `connect-gbp/paid.ts:11` only records the connection method. |
| GBP services and posts write | Terms §5 ("עדכון פרטי העסק … ופרסום עדכונים") | NOT BUILT | `executePatch.ts` handles only categories, websiteUri and description (lines 41-120). I found no services or posts write. |
| "Hours, price or service changed? One message and we update the site and profile" | Page, monthly section | HAND-DELIVERABLE | The support box is feature-flagged (`SITE_BOT_CLIENT_MESSAGES_ENABLED`, `clientMessages.ts:60-62`). The profile update itself is manual because `executePatch` isn't wired to anything. |
| Ready-to-forward review message with the owner's link | Page, section 3; FAQ | BUILT, flag and prod status unconfirmed | `reviewKit.ts:1-25` and `ReviewKitCard.tsx`. Copy is approved (`reviewKitCopy.ts:45`, `PENDING = false`). It sends one email at go-live and shows an account-page card, driven by `deploy/route.ts` and the lifecycle cron. It needs the account page, which is 404 on prod. Hand-deliver it for the pilot. |
| Draft reply to each new review; owner approves | Page, section 3 and FAQ | NOT BUILT / OFF | `review-poll.mjs:92` exits BLOCKED unless `GBP_INTEGRATION_ENABLED=true`, and the prod value is unconfirmed. `reviewResponder.ts` drafts only for bad (negative) reviews and is not tied to Site Bot owners. `/api/gbp/review-reply` is staff-only (401) and the only caller of `replyToReview`. `triageClientMessage` is a stub that returns null (`clientMessages.ts:355-358`). The "owner approves, then it posts" loop does not exist. |
| Monthly report: calls, directions, website clicks, new reviews | Page, 2 places; terms §2 | NOT BUILT | No Performance API code and no report job exists. The only report-like code is LLM usage and Google Ads digests, which are unrelated. The mission file's "a new monthly-report job" was never created. |
| "WAO never contacts your customers" | Page FAQ | LIVE (by design) | The review kit's WhatsApp link has no recipient (`reviewKit.ts:3-5`). |
| Hosting is on us; domain and profile stay yours | Page; terms §6 and §8 | LIVE / policy | Terms §6 and §8 are consistent with the page. |
| 12 months free copy, otherwise 900 ₪ + VAT; 30 days online after cancel | Page FAQ; terms §8 | LIVE (policy) | Matches the terms. |
| "No Search Console / Ads / GitHub" | Terms §5 notes | LIVE (true) | No Site Bot code touches them. |
| Google Partner badge | Page | Not checked | A link to Google's directory. Verify it by hand. |

## Terms (`docs/legal/site-bot-terms-of-use.md`, v1.2, 17.11)
- **§2 "ניהול פרופיל העסק ב-Google כמנהל", review requests and reply suggestions, and "דוח חודשי".** Of these, only the review requests exist. Profile management is OFF and the report is NOT BUILT.
- **§5 table row "Google Business Profile".** It promises "עדכון פרטי העסק, מענה לביקורות ופרסום עדכונים". Updates, replies and posts are all unavailable. It also says "אין חיבור ל-Search Console". That one is true.
- **§6 own domain "within three business days".** This is not built. Cloudflare for SaaS attach is unimplemented, so it is manual, and only staff can honour it.
- **§10 "נתוני פרופיל העסק ב-Google … כל עוד WAO משמשת כמנהלת הפרופיל".** This assumes manager access that can't be obtained in the current flow.

## Must be hand-delivered in the pilot, or removed
I suggest Eitan as the single hand-delivery owner (founder-run pilot of 10). The engineer and Adam own the code or copy changes.

1. **Monthly report.** Either send a manual report each month from the GBP Performance console, or remove it from the page (2 places) and terms §2. Owner: Eitan or Adam. I recommend removal unless Eitan commits to a manual report.
2. **GBP management / manager access.** Staff request manager access by hand and apply the edits in the GBP UI. Owner: Eitan. Alternatively, weaken the wording to "we align your profile with the site", with no automation promise.
3. **Review reply drafts and posting.** The owner gets no automatic drafts. Either staff draft replies manually, or the line comes off the page (section 3 and FAQ). Owner: Eitan, copy changes by Adam with Tamar.
4. **Own domain in 3 days.** Eitan or the engineer must do the Cloudflare attach by hand. Keep the "3 business days" promise only if someone is on call.
5. **Review kit.** Send the message by hand after go-live until the paid flow and account page are open. Owner: Eitan.
6. **Profile update on request** ("one message and we update site and profile"). Eitan applies it by hand.
7. **Terms.** Adam and the lawyer should either align §2 and §5 with what is actually delivered, or keep them and hand-deliver every item above. The terms currently over-promise (reply suggestions, posting updates, monthly report).
8. **Purchase.** `/site-bot/start` is closed in prod. Someone needs to set `SITE_BOT_PAID_FLOW=open` (or `rehearsal`) and restart, or run manual invoicing.

## Changes since 11-12
- Review-request kit built.
- Cancel notices added.
- Support box built, behind a flag.
- AI draft replies for staff support messages built (`7ddf5f2`). These are for customer messages, not Google reviews.
- Paid flow gate added, closed in prod.
- Visible Google profile link built: `renderSitePages.ts:49,393,431` says it is built, but I did not check the rendered output.
- Page rewritten and the launch stamp turned into a pilot-of-10 line.
- Unchanged: GBP OAuth and fix-execute are still 503, `executePatch` is still not wired, the monthly report still does not exist, and the own-domain attach is still manual.

Not verifiable here:
- Prod env values (`GBP_INTEGRATION_ENABLED`, `SITE_BOT_CLIENT_MESSAGES_ENABLED`).
- Which commit prod runs.
- The rendered visible profile link on a generated site.
- The Google Partner badge.

Key files:
- /home/eitanya/wao/docs/reviews/site-bot-product-truth-check-2026-11-12.md
- /home/eitanya/wao/docs/legal/site-bot-terms-of-use.md
- /home/eitanya/wao/docs/missions/site-bot-full-system-launch-2026-11-19.md
- /home/eitanya/wao/src/lib/site-bot/paidFlowGate.ts
- /home/eitanya/wao/src/lib/site-bot/landingCopy.generated.ts
- /home/eitanya/wao/src/lib/site-bot/reviewKit.ts
- /home/eitanya/wao/src/lib/gbp/executePatch.ts
- /home/eitanya/wao/src/app/api/site-bot/fix-execute/route.ts
- /home/eitanya/wao/src/app/api/site-bot/gbp/oauth/start/route.ts
- /home/eitanya/wao/src/lib/site-bot/clientMessages.ts
- /home/eitanya/wao/scripts/review-poll.mjs