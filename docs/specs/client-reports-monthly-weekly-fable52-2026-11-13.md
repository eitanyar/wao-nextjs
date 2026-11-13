# Outcome

Two client reports go out automatically, with a staff alert whenever one does not.

1. **Site Bot monthly report (ledger B15).** Each paying Site Bot client gets one Hebrew email a month with four numbers from their Google profile: call-button taps, direction requests, website clicks and new reviews. This is the minimum that keeps the promise in the published terms (`docs/legal/site-bot-terms-of-use.md:15,155`).
2. **Ads Bot weekly report (ledger A14).** Every Sunday morning each eligible Ads Bot client gets the existing three-number message (enquiries, enquiries marked real, cost per real enquiry) without staff pressing a button. It carries an opt-out link, and staff get a run summary and failure alerts.

**What exists today (read 2026-11-13)**

| Piece | State | Where |
|---|---|---|
| Weekly message text and line rules | Built, Noa-gated | `src/lib/google-ads/whatsapp-digest.ts:46-114`, `weeklyDigestCopy.generated.ts:4-65` |
| Weekly numbers | Built | `buildClientWeekNumbers` (`src/lib/crm/intelligence.ts:458-491`); 7-day Google spend and the `leadCapture` flag (`src/lib/google-ads/weekly-digest-batch.ts:106-112`) |
| Weekly sending | By hand only: a staff `wa.me` button | `src/app/(product)/geo/dashboard/page.tsx:135-146,179-183`; `whatsapp-digest.ts:8` |
| Weekly cron route | Exists but deliberately returns "disabled"; a test forbids any send path | `src/app/api/google-ads/weekly-digest-cron/route.ts:27-32`; `weekly-digest-cron.test.mjs:21-36` |
| WhatsApp Cloud sender | Built, approved templates only | `src/lib/notifications/whatsapp-cloud.ts:43-77` |
| Email sender | Built, plain text only | `src/lib/notifications/resend-transactional.ts:3-16` |
| Cron pattern | Shell wrapper posts to a route with `Bearer CRON_SECRET` | `scripts/cron/lead-response.sh:47-50`; `src/lib/payments/cron-auth.ts:11-17` |
| GBP client | Token, accounts, location, reviews (first page only), behind `isGbpLive()` | `src/lib/gbp/client.ts:50-52,94-96` |
| GBP Performance API | **No code anywhere** (no match for `businessprofileperformance` in `src/`, `scripts/`, `docs/`) | — |
| Review poller | Built, but it overwrites the snapshot the reply drafter depends on | `src/lib/gbp/reviewPoll.ts:93-96` |
| Site Bot client record | Has no email, no report settings and no GBP ids at creation | `src/lib/geo/client.ts:183-213`; `src/app/api/site-bot/deploy/route.ts:503-512` |
| Owner email | Collected at intake | `src/lib/site-bot/ownerIntake.ts:195` |
| GBP binding from the connect route | Saved on the audit record, which expires after 30 days, so it is not durable | `src/lib/site-bot/auditStore.ts:48,170-189` |

**API facts (official docs, fetched 2026-11-13)**

- **Performance API call:** `GET https://businessprofileperformance.googleapis.com/v1/locations/{id}:fetchMultiDailyMetricsTimeSeries`. `dailyMetrics` is repeated; the range is `dailyRange.start_date.year|month|day` and `dailyRange.end_date.*`. Scope is `business.manage`, which our client already uses. The response is `multiDailyMetricTimeSeries[].dailyMetricTimeSeries[]`, each with `dailyMetric` and `timeSeries` (date-value pairs). [Source](https://developers.google.com/my-business/reference/performance/rest/v1/locations/fetchMultiDailyMetricsTimeSeries)
- **Metrics we need:** `CALL_CLICKS` ("the number of times the business profile call button was clicked", so taps, not completed calls), `BUSINESS_DIRECTION_REQUESTS`, `WEBSITE_CLICKS`. [Source](https://developers.google.com/my-business/reference/performance/rest/v1/DailyMetric)
- **Reviews:** `GET https://mybusiness.googleapis.com/v4/{accounts/*/locations/*}/reviews`. `pageSize` max is 50, there is a `pageToken`, and the default order is `updateTime desc`. It returns `reviews[]`, `averageRating`, `totalReviewCount` and `nextPageToken`, and is "only valid if the specified location is verified". [Source](https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list)
- **Old insights method:** v4 `reportInsights` was discontinued on 2023-03-30; the Performance API is the replacement. [Source](https://developers.google.com/my-business/content/sunset-dates)
- **WhatsApp utility templates:** they must be non-promotional and specific to the user. The "account alerts or updates" class covers "information specific to purchased or subscribed products/services". Since 9 April 2025 Meta re-labels a utility template as marketing if it judges it promotional. [Source](https://developers.facebook.com/docs/whatsapp/updates-to-pricing/new-template-guidelines)
- **WhatsApp errors:** 131049 means not delivered "to maintain healthy ecosystem engagement"; 131026 means undeliverable. [Source](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

**Not confirmed today (the engineer proves each with the probe in step S2)**

- How many days the Performance API data lags, and how far back it goes. The official pages do not say, and the FAQ URL returned 404.
- The exact shape inside `timeSeries`. I expect `datedValues[] {date, value}` with `value` missing on zero days, but the page I fetched only says "date-value pairs".
- Whether the Business Profile Performance API is enabled in our Google Cloud project. It is a separate service from the ones the smoke test covers.
- Whether WhatsApp template variables may contain line breaks. I believe not, and the design below does not depend on it.
- Which of `RESEND_API_KEY` and `WHATSAPP_CLOUD_*` are set in production, and what is in the server crontab.
- Whether a Site Bot subscription row can be linked to a client slug at deploy time.

**Design decisions**

- **Site Bot channel: email.** The owner's email is already collected, an email can hold a small table, and it needs no outside approval. WhatsApp is not needed to keep the terms promise.
- **Site Bot period: the previous calendar month.** It is sent on the first business day (Sun–Thu) on or after the 5th, which leaves a buffer for Google's data lag.
- **Ads Bot channel: email first, then WhatsApp.** The existing message is plain text and can go by email now. A WhatsApp template needs Meta's approval, so it is added once approved; the audience reads WhatsApp, so it then becomes the main channel with email as fallback. The staff button stays as a manual fallback.
- **One shared delivery layer.** Both reports use the same send log, opt-out, staff alert and channel senders.

**Dates**

| When | What must exist |
|---|---|
| **By 29.11** (Site Bot launch) | Step S0 only: the report email saved on the client record at deploy, plus the hand procedure to record the GBP connection. No report code is needed at launch because Google's numbers can be pulled for past dates later. |
| **By 20.12** | Steps R1 (shared layer) and S1–S4 (monthly report) built, verified and deployed. The Hebrew for the report is Noa-passed and spot-checked by Eitan. |
| **5.1.2027** (Tue) | First monthly run, covering December. Staff preview that day; clients receive it on 6.1. |
| **Before the first WAO-captured Ads Bot client ends its first week** (target: first run Sun 13.12) | Steps R1 and A1–A3 (weekly auto-send by email). Until then staff keep sending by hand. |
| **After Meta approves the templates** | Step A4 (WhatsApp channel). No launch dependency. |

Build slot: after Ads Bot phase 2 (30.11–3.12 in the execution order), so about 6–10.12.

# Files

**R1. Shared layer (new, `src/lib/reports/`)**

- `sendLog.ts`: per-client send log at `data/clients/{clientId}/report-log.json`, using `clientsDir()` like `src/lib/gbp/reviewStore.ts:30-44`, with a `baseDir` parameter for tests.
  - Entry: `{ key, kind: 'ads-weekly'|'site-monthly', status: 'built'|'sending'|'sent'|'failed'|'skipped'|'blocked'|'held', reason?, channel?, providerMessageId?, attempts, builtAt, sentAt? }`.
  - Keys: `ads-weekly:2026-12-06` (the Sunday the window starts) and `site-monthly:2026-12`.
  - Claim before send, with a stale-claim rule and a maximum of 3 attempts, modelled on `src/lib/crm/lead-response.ts:8-9,78-113`. A key with status `sent` is never sent again.
- `preferences.ts`: reads and writes a new optional block on `client.json`:
  `reports?: { email?: string; adsWeekly?: { optedOutAt?: string; channel?: 'email'|'whatsapp' }; siteMonthly?: { optedOutAt?: string } }`.
  - Add the type to `SharedClientRecord` (`src/lib/shared/clients.ts:14-50`).
  - Writes change only this block and are atomic (temp file plus rename, as in `auditStore.ts:161-163`).
- `optOutToken.ts`: HMAC-SHA256 over `clientId|kind` with a new env `REPORTS_OPTOUT_SECRET`. No expiry. Fails closed when the secret is missing.
- `deliver.ts`: `deliverReport({ channel, to, subject, text, html?, template? })` returns `{ providerMessageId }` or throws.
  - Email goes through `sendResendTransactionalEmail`; add an optional `html` field to it (`resend-transactional.ts:3`). From address: `WAO <reports@wao.co.il>`.
  - WhatsApp goes through `sendWhatsAppTemplate` with `normalizeIsraeliPhone` (`whatsapp-cloud.ts:32-41`).
- `staffAlert.ts`: one English email per run to `eitan@wao.co.il` and `leads@wao.co.il` (same recipients as `src/lib/mail.ts:79`).
  - Subject starts `[reports] OK` or `[reports] ACTION`.
  - Body is one line per client: status and reason. It is sent on every run, including a run with nothing to send, so a missing Sunday email is itself the signal.
- `src/app/(product)/client/report-preferences/page.tsx` and `src/app/api/client/report-preferences/route.ts`: the opt-out page.
  - `GET ?token=&kind=` only shows a confirm button. It must not change anything, because WhatsApp and mail scanners open links to preview them.
  - `POST` sets `optedOutAt`. A second button opts back in.
  - Hebrew comes from brief C4.

**A. Ads Bot weekly**

- A1 `src/lib/google-ads/weekly-report-run.ts` (new): `runAdsWeeklyReports({ now, deps })`.
  1. Set `windowEnd` to 00:00 Asia/Jerusalem on the run day and pass it as `now` to `buildClientWeekNumbers`. The lead window is then the same seven full days as Google's `LAST_7_DAYS` spend. Today the dashboard uses "now", which mixes a partial day (`page.tsx:143`).
  2. Call `buildAllClientDigests()` (`weekly-digest-batch.ts:86`). For each result decide in this order:

     | Condition | Outcome |
     |---|---|
     | `status !== 'ok'` | `failed`, reason is the error |
     | `leadCapture !== 'wao'` | `skipped: external_leads` (same rule as `whatsapp-digest.ts:155-158`) |
     | `reports.adsWeekly.optedOutAt` set | `skipped: opted_out` |
     | `digests` empty and `leadsIn === 0` | `skipped: no_enabled_campaign`. This also hides an Ads API error (`weekly-digest-batch.ts:125-133`), so the staff line says "check if 2 weeks in a row". |
     | No usable contact for the chosen channel | `blocked: no_contact` |
     | Otherwise | Compose and send |

  3. Compose with `composeWeeklyDigestWhatsAppMessage` (`whatsapp-digest.ts:84`), unchanged, then add the new `opt_out` line with the tokened link. The email subject comes from the template JSON.
  4. If `markedReal > 0` and `weekSpendIls` is undefined, still send (the cost line hides itself, `whatsapp-digest.ts:55`) and add `spend_read_failed` to the staff alert.
  5. Channel: `reports.adsWeekly.channel`, default `email`. A WhatsApp failure falls back to email when `reports.email` exists, and the alert notes it.
- A2 `src/app/api/google-ads/weekly-digest-cron/route.ts`: replace the disabled body with `isCronAuthorized` plus `runAdsWeeklyReports`.
  - Keep a kill switch: unless `ADS_WEEKLY_REPORT_ENABLED === 'true'`, return today's exact "disabled" JSON.
  - `?dryRun=1` returns the composed messages and decisions and sends nothing.
  - Rewrite `weekly-digest-cron.test.mjs` to the new contract.
- A3 `scripts/cron/ads-weekly-report.sh` (new): a copy of `scripts/cron/lead-response.sh` with its own lock file and URL.
  - Crontab line, written in the file header and installed by Eitan as with the other crons: `30 8 * * 0` with `CRON_TZ=Asia/Jerusalem`.
  - Also add an optional `opt_out` line id to the template source JSON and regenerate with `scripts/build-weekly-digest-copy.mjs` (brief C3). Add `opt_out` to `GROUP_OF` as group 3 and to the `show` map (`whatsapp-digest.ts:49-82`).
- A4 (after Meta approval) two utility templates. A template is fixed text, so the conditional lines collapse into two cases:
  - `ads_weekly_numbers` when `markedReal > 0` and spend is known. Variables: name, business, enquiries, marked real, cost, leads link.
  - `ads_weekly_mark` in every other case. Variables: name, business, enquiries, marked real, leads link.
  - Both end with the opt-out link. Text comes from brief C5. Template names and language live in env: `ADS_WEEKLY_WA_TEMPLATE_NUMBERS`, `ADS_WEEKLY_WA_TEMPLATE_MARK`, `ADS_WEEKLY_WA_LANG`.
- The dashboard button stays. Add one staff line under it with the last send-log entry for that client.

**S. Site Bot monthly**

- S0 (**by 29.11**, about 0.25 day, rides launch step 1 or 2):
  - `src/app/api/site-bot/deploy/route.ts:503-512` and `ensureSiteBotClientRecord` (`src/lib/geo/client.ts:183-213`): on first creation write `reports.email` from `collectedData.ownerContact.email`. Nothing is overwritten on redeploy; the existing early return at `client.ts:193` already guarantees that.
  - `docs/ops/site-bot-gbp-connection.md` (new, English): the hand step for the pilot. When the owner's manager invite is accepted, staff add `gbpAccountId` and `gbpLocationId` (existing fields, `src/lib/shared/clients.ts:44-45`) and a new `gbpConnectedAt` to that client's `client.json`. Each such edit names the exact client, per the `data/clients/` rule.
- S1 `src/lib/gbp/performance.ts` (new): `fetchDailyMetrics(token, locationId, metrics, startDate, endDate)`.
  - Builds the GET above, accepts `locations/123` or `123`, and returns `{ metric, days: {date, value}[] }[]`.
  - A day with no value counts as 0. Any non-200 throws with the status.
  - Add `listReviewsPage(token, accountId, locationId, { pageSize: 50, pageToken })` to `src/lib/gbp/client.ts`. Leave the existing `listReviews` untouched.
- S2 `scripts/gbp-performance-probe.mjs` (new, read-only): for one `--client`, print the last 40 days of the three metrics, the latest date that has any value, and the earliest date available. The engineer runs it once on a real connected location and records the measured lag in the file header. If the lag is more than 4 days, raise the send day from the 5th accordingly.
- S3 `src/lib/site-bot/monthlyReport.ts` (new, pure, fetchers injected): `buildSiteMonthlyReport({ client, month, deps })`.
  - The three metric totals for the calendar month.
  - New reviews: page through reviews in `updateTime desc` order until a page's oldest `updateTime` is before the month start, then count the reviews whose `createTime` falls in the month. Also carry `averageRating` and `totalReviewCount`.
  - It must **not** call `pollClientReviews`, which overwrites the reply drafter's snapshot (`reviewPoll.ts:93-96`).
  - Output: `{ month, callClicks, directionRequests, websiteClicks, newReviews, averageRating, totalReviewCount, coverage: { from, to, partial } }`, saved to `data/clients/{id}/reports/site-monthly-YYYY-MM.json`.
- S3 `src/lib/site-bot/monthlyReportCopy.generated.ts` plus a build script, following the weekly pattern (source JSON in `docs/copy/`, generated file, zero Hebrew typed by the engineer).
- S3 `src/lib/site-bot/monthlyReportEmail.ts`: fills the lines into a `dir="rtl"` HTML email (four rows, a small-print line, a support line, an opt-out link) and a plain-text twin. Latin and number runs are wrapped in `<bdi dir="ltr">`.
- S4 `src/lib/site-bot/monthly-report-run.ts`, `src/app/api/site-bot/monthly-report-cron/route.ts` and `scripts/cron/site-bot-monthly-report.sh`. Crontab: daily `0 9 * * *` Israel time. Each day:
  1. Do nothing unless `SITE_BOT_MONTHLY_REPORT_ENABLED === 'true'` and `isGbpLive()`.
  2. The roster is every client with `siteBotLaunchedAt` (`src/lib/geo/client.ts:34`).
  3. Build phase: if today is Sun–Thu, on or after the 5th, and a client has no log entry for last month, decide:

     | Condition | Outcome |
     |---|---|
     | Subscription known and `subscriptionHasAccess` is false (`src/lib/payments/subscriptions.ts:352`) | `skipped: not_subscribed`. If the link from client to subscription cannot be made at deploy, staff mark a cancelled client by setting `reports.siteMonthly.optedOutAt`. |
     | Opted out | `skipped: opted_out` |
     | `gbpConnectedAt` missing | `blocked: profile_not_connected`. Staff alert, and the client gets the short "not connected" email (brief C2) once per month. |
     | Connected fewer than 14 days of that month | `skipped: first_month_too_short`. That client's first report is the next month's. |
     | Reviews call says the location is not verified | Send with the three metrics, hide the reviews row, and alert `location_unverified`. |
     | Performance call fails, or the month's last 3 days have no value in any of the three metrics while earlier days do | `failed: data_incomplete`. Retry on the next run, up to 3 attempts, then alert. |
     | Otherwise | Status `built`, and include the full text in the staff preview email. |

  4. Send phase: send every `built` entry older than `SITE_BOT_REPORT_REVIEW_HOURS` (default 24; 0 sends at once). Staff can stop one by changing its status to `held` in the log.
  5. Watchdog: if the newest `ads-weekly` log entry across clients is more than 8 days old while the weekly switch is on, add `weekly_run_missing` to the alert.
- A month where all four numbers are 0 is still sent. The copy lines must read correctly with 0.

**Copy briefs** (waocopy → Noa → Eitan's spot-check; no Hebrew is authored in code)

| # | Goes where | Persona and situation | Angle and constraints |
|---|---|---|---|
| C1 | Monthly report email: subject, greeting, month frame, four row labels, rating line, one small-print line, support line, opt-out line | Hands-on local business owner who pays ₪199 a month and opens this on a phone between jobs | "Here is what your Google profile did for you last month", numbers first. Row 1 uses Google's own word for the metric, and the small print says it counts taps on the call button. Singular male. No promises, no upsell. Must read naturally with 0 and with 1. Placeholders: `{ownerName} {businessName} {monthName} {callClicks} {directionRequests} {websiteClicks} {newReviews} {averageRating} {totalReviewCount} {optOutLink}`. Give singular and plural variants where Hebrew needs them, as the weekly template does. |
| C2 | "Not connected" email: 3–4 lines | Same owner, whose profile is not yet connected to WAO as manager | We could not prepare your report because the connection is missing; here is the one step. Written support only, no phone promise. |
| C3 | Weekly template: one `opt_out` line and one email subject | Ads Bot client | Service tone, one short line: stop these weekly messages here. Placeholder `{optOutLink}`. |
| C4 | Opt-out page: title, confirm button, done state, opt-back-in button; one set serves both reports | Either client | Plain, no guilt, one tap. |
| C5 | Two WhatsApp template bodies (A4) | Ads Bot client | Fixed text with numbered variables, built from the approved weekly lines. Strictly informational so Meta keeps it as utility. Ends with the opt-out link. |

# Constraints

- **Hebrew.** The engineer never types or retypes Hebrew. All lines arrive as source JSON from waocopy, pass Noa, and are generated into `*.generated.ts`. Modules that only fill placeholders keep the "ZERO Hebrew bytes" header (`whatsapp-digest.ts:10`). The served email HTML has no CJK, Cyrillic or Arabic characters.
- **Never estimate a number.** A missing figure hides its line (weekly cost line) or blocks the send (monthly `data_incomplete`). No interpolation and no "about".
- **Call taps are not calls.** The metric counts taps on the call button. The small-print line is mandatory on every monthly report.
- **No promotion in either report.** No offers, upsell or cross-sell. This keeps the WhatsApp templates in the utility class and keeps the messages service messages.
- **Client-facing text only.** Alerts and next actions stay on staff pages and staff emails (`whatsapp-digest.ts:6-7`).
- **Clients with external lead capture never get the weekly report.** Their numbers would be false zeros.
- **`data/clients/` is live production data.** Every store takes a `baseDir`; tests and dry runs use a temp directory. After any local run, `git diff data/clients/` must be empty. In production the only writers are the send log, the `reports` block and the `reports/` folder. `gbp-reviews.json` is never touched by the report code.
- **All Google calls sit behind `isGbpLive()`** (`src/lib/gbp/client.ts:50-52`). The monthly report makes read-only calls only.
- **Both reports ship switched off.** Adam switches them on after verifier PASS: `ADS_WEEKLY_REPORT_ENABLED`, `SITE_BOT_MONTHLY_REPORT_ENABLED`.
- **Opt-out.** A GET never changes state. Opt-out is checked immediately before every send. Opting out of one report does not affect the other.
- **No double sends.** Claim before send, one `sent` entry per key, and re-running a cron is always safe.
- **Cron routes** use `isCronAuthorized` and fail closed without `CRON_SECRET`. Eitan installs the crontab lines; deploy does not.
- **Staff alerts are English and contain no secrets.** Error text is sanitised the same way as `lead-response.ts:52-55`.
- **Next.js 16.** Read the route-handler guide in `node_modules/next/dist/docs/` before writing the new routes and page.
- **Not in this version:** month-over-month comparison, charts, a report page inside the client dashboard, a WhatsApp monthly report, opt-out by replying to a WhatsApp message (that needs the inbound webhook from the parked nurture work), and Pub/Sub review notifications.

# Acceptance

**Shared layer**
1. Unit tests cover: claim, send and re-run sends nothing; a stale claim is retried; attempts stop at 3; token round-trip; a tampered token is rejected; a missing secret fails closed.
2. `GET /client/report-preferences?token=…` returns 200 and leaves `client.json` byte-identical. `POST` sets `optedOutAt`. A second `POST` to opt back in clears it.

**Ads Bot weekly**
3. With the switch off, the cron returns today's exact "disabled" JSON. A wrong bearer returns 401.
4. `?dryRun=1` against fixtures returns one decision per client and covers every row of the A1 table.
5. For a fixture with 5 enquiries, 2 marked real and ₪300 spend, the composed text contains the three number lines with 5, 2 and 150, plus the opt-out link, and nothing from the alerts list.
6. With the run day fixed at a Sunday, a lead created at 07:00 that same Sunday is not counted, and a lead from the previous Sunday at 00:30 Israel time is.
7. A spend read failure with `markedReal > 0` still sends, without the cost line, and the staff alert contains `spend_read_failed`.
8. An opted-out client is skipped. An `external` client is skipped. A second run the same day sends nothing.
9. A staff alert is sent on every run. Its subject is `[reports] ACTION` if any client failed or was blocked.
10. A4 only: with a mocked WhatsApp client, the right template is chosen for each case; a 131026 or 131049 response falls back to email and is logged.

**Site Bot monthly**
11. S0: deploying a fixture client writes `reports.email`. A redeploy leaves it unchanged.
12. `fetchDailyMetrics` builds exactly the documented URL (repeated `dailyMetrics`, dotted `dailyRange` fields); the test asserts the query string. A missing day value counts as 0.
13. New-review counting, with a two-page fixture: counts by `createTime` inside the month; ignores a review that was only edited in the month; stops paging once past the month start; `gbp-reviews.json` is not written.
14. Each row of the S4 table has a test, including: connected on the 20th gives `first_month_too_short`; an unverified location gives a report without the reviews row; an all-zero month is sent.
15. Schedule: nothing is built on the 1st–4th or on a Friday or Saturday. An entry built on Tuesday the 5th is sent on Wednesday the 6th with a 24-hour review window. A `held` entry is never sent.
16. The HTML email has `dir="rtl"`, the four numbers, the small-print line and the opt-out link. A plain-text twin exists. Numbers and Latin runs are wrapped in `<bdi dir="ltr">`.
17. The probe has been run once on a real connected location, and the measured lag and earliest date are written in the script header. If no location is connected yet, this item is **BLOCKED**, not passed.

**Whole change**
18. `npm run test`, then `npm run build -- --webpack` (serially), and scoped lint on the changed files all pass.
19. `git diff data/clients/` is empty after all local runs. `git diff` shows no Hebrew changes outside the new generated copy files.

# Verifier

Roni runs the app. Nothing here is a code read.

1. **Weekly, local.** Start the dev server with `ADS_WEEKLY_REPORT_ENABLED=true`, a temp data root and no `RESEND_API_KEY`. `curl -X POST` the cron with the bearer and `?dryRun=1`. Capture the JSON and check the decisions against the fixtures. Curl without the bearer and expect 401. Unset the switch and expect the "disabled" JSON.
2. **Weekly, real send to staff only.** Use one fixture client whose `reports.email` is a WAO inbox. Run without `dryRun` and capture the Resend message id from the log. Open the email and confirm three numbers, the opt-out link and no English alert text. Run again and confirm no second email.
3. **Opt-out.** Open the link from that email; GET changes nothing, POST opts out. Run the cron and confirm `skipped: opted_out`.
4. **Monthly, fixture.** With an injected clock of 5.1.2027 and fixture Google responses, run the cron and confirm the staff preview email arrives with the report text. Advance the clock 24 hours, run again, and confirm the client email arrives. Take screenshots of the email at desktop width and at 390px.
5. **Monthly, live read.** Run `scripts/gbp-performance-probe.mjs --client=<a connected client named in the brief>` and capture the output. Compare one month's three totals with the profile's own performance screen for the same dates; they must match. If no location is connected, report BLOCKED.
6. **Language and layout.** Noa passes every line of C1–C5 before step 2 or 4 uses real copy. Maya checks the email's RTL rendering and mixed-script numbers. Eitan spot-checks one rendered monthly email and one weekly message before either switch is turned on in production.
7. **Production, after deploy.** Run each cron once by hand with `?dryRun=1` and confirm the client list matches reality. Then Eitan installs the two crontab lines. The first Sunday and the first 5th are each confirmed by the staff alert email arriving.

Report PASS, FAIL or BLOCKED per item, with the captured output. There is no partial pass.

# Engineer-days estimate

| Step | Days |
|---|---|
| S0 report email on the client record, connection procedure doc (by 29.11) | 0.25 |
| R1 shared layer: send log, preferences, token, delivery, staff alert, opt-out page | 1.0 |
| A1–A3 weekly auto-send by email, cron, test rewrite, dashboard line | 1.0 |
| S1–S2 Performance client, review paging, probe | 0.5 |
| S3–S4 monthly build, email, cron, edge cases | 1.5 |
| A4 WhatsApp template channel (after Meta approval) | 0.5 |
| **Total** | **4.75** (0.25 before launch, 4.0 between 6.12 and 20.12, 0.5 later) |

Copy lane, in parallel: C3 and C4 before A goes live, C1 and C2 by 13.12, C5 whenever the templates are to be submitted.

# Open founder decisions (with your recommendation)

1. **Weekly report channel.** Recommend email now, then WhatsApp as the main channel once Meta approves two utility templates, with email as fallback.
   - It means staff add an email address for each Ads Bot client, and you (or Adam with your approval) submit the templates in WAO's Meta account.
   - WhatsApp charges per template message; check the current rate card before switching it on.
2. **Monthly schedule.** Recommend calendar months, sent on the first business day on or after the 5th. A client who joins on 29.11 then gets a first report on 6.1.2027 covering December, which is 38 days after joining. The alternative is each client's own sign-up day, which gives a first report around 29.12 but means reports trickle out on different days and are harder to supervise.
3. **24-hour staff preview before the monthly send.** Recommend yes for the pilot of 10; set it to 0 once two clean months have passed.
4. **"Calls" wording.** Google only reports taps on the call button, not completed calls. Recommend keeping Google's own label in the report with one small-print line, and asking Tamar to check that the `/site-bot` page and terms wording does not promise completed calls.
5. **Clients whose profile is not connected.** Recommend they get the short "not connected yet" email instead of a report, plus a staff alert, rather than silence. This depends on the manager connection being recorded by hand for each pilot client (ledger B12 is not built).
6. **Sender address.** Recommend `reports@wao.co.il`. Please confirm it can send through the Resend account.
7. **Lawyer, added to the existing list.** One sentence in each product's terms saying the report is sent to the contact details given at sign-up and can be switched off by the client.