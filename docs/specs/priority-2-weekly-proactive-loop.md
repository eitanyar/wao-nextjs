# Technical Specification — Priority 2: Automate the Weekly Proactive Loop

Author: Dror (PPC Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation
Depends on: Priority 1 (`docs/specs/priority-1-google-ads-execution-loop.md`) — this spec reuses `WeeklyDigest`, `CampaignConfig`, `loadClientGoogleAdsIndex`, `loadCampaignConfigBySlug`, and the `src/lib/mail.ts` pattern that Priority 1 already extended. No changes to Priority 1's mutation/executor code are needed or in scope here.
Related: VISION.md "Phase 1.5 — Proactive Management Loop" (line 275) — explicit subscription-revenue gate: *"Weekly (every Monday) — Send performance digest… no human involved… This is what justifies the ongoing subscription fee."*

---

## 0. Problem Statement

`buildWeeklyDigest()` (`src/lib/crm/intelligence.ts:225`) already computes a per-client weekly digest correctly. Today it is only reachable two ways:
1. `GET /api/google-ads/weekly-digest` — session-gated, single authenticated client, pull-only (a client or Eitan must be logged in and manually load the dashboard).
2. `scripts/whatsapp-digest.mjs --client=<id>` — a **different, GEO-specific** digest (anomalies/pareto/title-bot), run manually, one client at a time, output printed to a terminal for a human to copy into WhatsApp by hand.

Nothing computes the Google Ads digest for *every bound client* on a schedule, nothing emails it, and there is no click-to-send WhatsApp mechanism for it at all (the WhatsApp mechanism that exists — `src/lib/geo/whatsapp.ts` + `/geo/dashboard` — is wired to GEO content-approval messages, not Google Ads performance digests).

This is the exact gap VISION.md calls a **subscription-revenue blocker**: without a proactive, low-friction weekly touch, "clients onboard and go dark." This spec closes that gap for the Google Ads digest specifically, using the same Wizard-of-Oz principle already proven for GEO (`/geo/dashboard`'s `SendButton` + `wa.me` deep link — no WhatsApp Business API, a human clicks the actual send).

**Out of scope for this pass:** WhatsApp Business API / automated sending (still Wizard-of-Oz, per existing project convention), client-facing email (the client has no email field on `client.json` today — see §1.4), and any change to Priority 1's mutation/executor code.

---

## 1. Architecture Decisions (read before implementing)

### 1.1 No serverless cron platform exists in this repo — use a shared-secret HTTP endpoint

The app is a self-hosted Next.js app on a VPS behind PM2 (`deploy.sh:45` — `pm2 restart wao-app`). There is no `vercel.json`, no Vercel Cron, no queue. The existing precedent for "an external trigger hits a running endpoint" is `deploy.sh:48` (`node scripts/verify-google-ads-sandbox.mjs`), which authenticates via a signed cookie built from `CLIENT_PORTAL_SECRET`.

Do **not** try to introduce a job-queue library or a new cron framework. Build one new POST endpoint, gated by a new shared secret (`CRON_SECRET`, §2.1), and let Eitan add **one line** to the server's system crontab that calls it with `curl`. This mirrors the project's existing "infra wiring is a manual server-side step Eitan owns, code stays simple" convention (see AGENTS.md: *"Eitan manually triggers deploy.sh"*).

### 1.2 Digest computation stays a pure, non-HTTP module — the route is a thin wrapper

Exactly like Priority 1 separated `mutations.ts` (pure logic) from the API routes that call it, digest batch computation belongs in a plain `.ts` module with **no side effects beyond the file reads it already needs** (mirrors `buildWeeklyDigest` itself, which is already side-effect-free except for `readLeads()`). The route handler's only job is: auth check → call the module → email each result → return a summary. This keeps the batch logic unit-testable without spinning up `NextRequest`/`NextResponse`.

### 1.3 One client's failure must never abort the batch

`buildWeeklyDigest` throws if `loadCampaignConfigBySlug` returns something malformed, and `sendResendEmail` throws on a non-200 from Resend. A naive `for` loop with no per-item try/catch would let client #2's bad JSON file kill the digest for clients #3–#10. Every per-client step is wrapped so **one client's failure produces one failed result entry, not a crashed batch** — same non-throwing-contract philosophy Priority 1 established for `MutationResult`/`ExecutionResult`.

### 1.4 Email goes to WAO operators, not the client — WhatsApp is the actual client-facing channel

`client.json` (`src/lib/geo/client.ts:10-27`) has no email field — only `approvalContact` (name) and `approvalWhatsapp` (phone). Both existing `mail.ts` functions already hardcode WAO-internal recipients (`eitan@wao.co.il`, `leads@wao.co.il`) because there is no client email to send to. This spec follows that same convention: **the cron email is an internal WAO notification** ("Client X's digest is ready, N alerts, go send it"), and the **WhatsApp button is the client-facing delivery mechanism**, clicked by a human at WAO. Do not invent a client email field or a client-facing send in this pass — that would be a scope-creep beyond "automate the weekly proactive loop" into "add client email as a channel," which is a separate decision (new data field, new consent question in onboarding).

### 1.5 UI surface: extend `/geo/dashboard`, do not create a new admin route

`/geo/dashboard` (`src/app/(app)/geo/dashboard/page.tsx`) is already exactly the shape needed: admin-cookie-gated (`ADMIN_PROTECTED` in `src/proxy.ts:6`), cross-client, lists every client, and already renders `SendButton` + a `wa.me` deep link per actionable item (`buildApprovalLink`, `src/lib/geo/whatsapp.ts:71`). Adding a "Google Ads Weekly Digests" section to this existing page reuses the admin gate, the `SendButton` component, and the `wa.me`-link pattern verbatim — it needs zero `src/proxy.ts` changes. Creating a *new* admin route would require adding a new path to `ADMIN_PROTECTED` and would duplicate the gate/list-clients logic for no benefit. Do not create `/admin/google-ads-digests` or similar.

---

## 2. Files to Create

### 2.1 `src/lib/google-ads/weekly-digest-batch.ts` (NEW)

Pure computation module — the "which clients, what digest" logic, with no email and no HTTP awareness.

```ts
import fs from 'fs';
import path from 'path';
import {
  buildWeeklyDigest,
  loadClientGoogleAdsIndex,
  loadCampaignConfigBySlug,
  type CampaignConfig,
  type WeeklyDigest,
} from '@/lib/crm/intelligence';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

export interface ClientDigestResult {
  clientId: string;
  status: 'ok' | 'unbound' | 'error';
  campaign?: CampaignConfig;
  digest?: WeeklyDigest;
  error?: string;
}

/**
 * Every client directory that has a data/clients/<id>/google-ads.json index
 * file (i.e. has run bindCampaignToClient() at least once — Priority 1's
 * create-campaign flow). Mirrors the directory-scan pattern already used in
 * src/lib/geo/actions.ts:41 and geo/dashboard/page.tsx:49-55 — do not
 * introduce a second "list all clients" convention.
 */
export function listGoogleAdsBoundClientIds(): string[] {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR)
    .filter((entry) => fs.statSync(path.join(CLIENTS_DIR, entry)).isDirectory())
    .filter((clientId) => fs.existsSync(path.join(CLIENTS_DIR, clientId, 'google-ads.json')));
}

/**
 * Builds one WeeklyDigest per bound client. Never throws — a malformed
 * record for one client becomes one { status: 'error' } entry, the rest
 * of the batch still runs. This is the same non-throwing-contract pattern
 * as MutationResult/ExecutionResult in Priority 1 (mutations.ts, executor.ts).
 */
export function buildAllClientDigests(now?: Date): ClientDigestResult[] {
  return listGoogleAdsBoundClientIds().map((clientId) => {
    try {
      const index = loadClientGoogleAdsIndex(clientId);
      if (!index?.primarySlug) {
        return { clientId, status: 'unbound' as const, error: 'google-ads.json present but primarySlug missing' };
      }

      const campaign = loadCampaignConfigBySlug(index.primarySlug);
      if (!campaign) {
        return { clientId, status: 'unbound' as const, error: `Campaign config not found for slug: ${index.primarySlug}` };
      }

      const digest = buildWeeklyDigest({ campaign, now });
      return { clientId, status: 'ok' as const, campaign, digest };
    } catch (error) {
      return {
        clientId,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unknown error building digest',
      };
    }
  });
}
```

Notes:
- `now` is an optional injected parameter purely so tests can pin the clock without stubbing `Date` globally — same reason `buildWeeklyDigest` itself already accepts `now?: Date` (`intelligence.ts:228`).
- This module does **not** filter out `GOOGLE_ADS_SANDBOX_CLIENT_ID`. There is currently exactly one bound client (`google-ads-sandbox`, confirmed via `data/clients/google-ads-sandbox/google-ads.json`) and it is expected to appear in the batch like any other client. If sandbox noise in the weekly ops email becomes annoying once real clients exist, that's a one-line filter to add later — do not pre-build it speculatively now.

### 2.2 `src/lib/google-ads/whatsapp-digest.ts` (NEW)

Message composition + link building for the Google Ads weekly digest, specifically. This is **not** a copy of `scripts/whatsapp-digest.mjs` — that script's ranking logic (anomalies/pareto/title-bot tiers) is the GEO advisor domain (`src/lib/advisor.ts`) and does not apply to `WeeklyDigest`, which already has its own `alerts`/`nextActions` shape. Reuse the existing, already-exported `buildWaLink` from `src/lib/geo/whatsapp.ts:66` for the phone-cleaning + `wa.me` URL construction — do not write a third copy of that regex.

```ts
import { buildWaLink } from '@/lib/geo/whatsapp';
import type { WeeklyDigest } from '@/lib/crm/intelligence';

export function composeWeeklyDigestWhatsAppMessage(params: {
  contactName: string;
  campaignName: string;
  digest: WeeklyDigest;
}): string {
  const { contactName, campaignName, digest } = params;
  const lines: string[] = [];

  lines.push(`שלום ${contactName},`);
  lines.push('');
  lines.push(`הסיכום השבועי של "${campaignName}" מוכן.`);
  lines.push('');
  lines.push(`לידים השבוע: ${digest.totals.leads}`);
  lines.push(`עסקאות שנסגרו: ${digest.totals.closedDeals}`);

  if (digest.alerts.length > 0) {
    lines.push('');
    lines.push(`⚠️ ${digest.alerts.length} דברים שכדאי לשים לב אליהם:`);
    digest.alerts.slice(0, 3).forEach((alert) => lines.push(`- ${alert.title}`));
  } else {
    lines.push('');
    lines.push('✅ הכל תקין השבוע — אין התראות פתוחות.');
  }

  if (digest.nextActions[0]) {
    lines.push('');
    lines.push('מה שהכי כדאי לעשות עכשיו:');
    lines.push(`▪️ ${digest.nextActions[0]}`);
  }

  lines.push('');
  lines.push('רוצה שנעדכן משהו? תגידו ונטפל.');

  return lines.join('\n');
}

export function buildWeeklyDigestWhatsAppLink(params: {
  contactPhone: string;
  contactName: string;
  campaignName: string;
  digest: WeeklyDigest;
}): string {
  const message = composeWeeklyDigestWhatsAppMessage(params);
  return buildWaLink(params.contactPhone, message);
}
```

### 2.3 `src/app/api/google-ads/weekly-digest-cron/route.ts` (NEW)

`POST /api/google-ads/weekly-digest-cron` — the scheduled-job entry point. No session cookie involved; this is a system-to-system call, gated by a shared secret header, following the same "internal secret, plain equality, fail closed if unset" convention already established by `verifyAdminSecret` (`src/lib/admin-auth.ts:28-32` — plain `===`, returns `false` if the env var is empty). Do not introduce a different auth convention (e.g. HMAC-signed payloads) for this one endpoint; that would add complexity Eitan's crontab `curl` line would then also need to replicate, for no meaningful security gain over the existing convention on an internal-only, non-mutating (email-only) endpoint.

```ts
import { NextResponse } from 'next/server';
import { buildAllClientDigests, type ClientDigestResult } from '@/lib/google-ads/weekly-digest-batch';
import { sendGoogleAdsWeeklyDigestEmail } from '@/lib/mail';

interface CronRunResult {
  clientId: string;
  status: 'sent' | 'digest_failed' | 'email_failed' | 'unbound';
  error?: string;
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // fail closed — same posture as ADMIN_SECRET
  const provided = req.headers.get('x-cron-secret') ?? '';
  return provided === expected;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const digestResults: ClientDigestResult[] = buildAllClientDigests();
    const runResults: CronRunResult[] = [];

    for (const result of digestResults) {
      if (result.status !== 'ok' || !result.campaign || !result.digest) {
        runResults.push({ clientId: result.clientId, status: 'unbound', error: result.error });
        continue;
      }

      try {
        await sendGoogleAdsWeeklyDigestEmail({
          clientId: result.clientId,
          campaignName: result.campaign.businessName || result.campaign.slug,
          digest: result.digest,
        });
        runResults.push({ clientId: result.clientId, status: 'sent' });
      } catch (error) {
        // Digest computation succeeded; only the email failed. Report that
        // distinction explicitly — do not fold this into 'sent' or into a
        // generic failure that hides which half of the pipeline broke.
        runResults.push({
          clientId: result.clientId,
          status: 'email_failed',
          error: error instanceof Error ? error.message : 'Unknown email error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      ranAt: new Date().toISOString(),
      clientsProcessed: runResults.length,
      results: runResults,
    });
  } catch (error) {
    console.error('[google-ads/weekly-digest-cron] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to run weekly digest batch' },
      { status: 500 },
    );
  }
}
```

Notes:
- `sendGoogleAdsWeeklyDigestEmail` (§3) is specified to **not** self-swallow its own errors the way the two existing `mail.ts` functions do (they `console.error` internally and return normally either way) — this route needs to *see* the email failure to report `'email_failed'` distinctly from `'sent'`. This is a deliberate, small deviation from `sendLeadNotificationEmail`/`sendGoogleAdsOperatorApprovalEmail`'s internal-catch style; state this explicitly in the new function's doc comment so a future reader doesn't "fix" it to match the other two and silently re-hide the failure.
- The route itself still has an outer try/catch for anything unexpected (e.g. `buildAllClientDigests` throwing despite its own internal per-client guards, or a totally malformed request) — defense in depth, matching the existing convention in `operator-task/route.ts:137-143` and `weekly-digest/route.ts:51-55`.

---

## 3. Files to Modify

### 3.1 `src/lib/mail.ts` — add `sendGoogleAdsWeeklyDigestEmail`

Follows the existing `sendResendEmail` + RTL Hebrew HTML template convention used by both current functions. Recipients: same WAO-internal list already hardcoded in this file (`eitan@wao.co.il`, `leads@wao.co.il`) — see §1.4 for why this isn't a client-facing send.

```ts
export async function sendGoogleAdsWeeklyDigestEmail(params: {
  clientId: string;
  campaignName: string;
  digest: WeeklyDigest; // import type { WeeklyDigest } from '@/lib/crm/intelligence'
}): Promise<void> {
  const { clientId, campaignName, digest } = params;
  const alertsHtml = digest.alerts.length
    ? `<ul>${digest.alerts.map((a) => `<li><strong>${a.title}:</strong> ${a.message}</li>`).join('')}</ul>`
    : '<p>אין התראות פתוחות השבוע.</p>';

  const htmlContent = `
    <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2c3e50;">סיכום שבועי — ${campaignName} 📊</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
        <p><strong>לקוח:</strong> ${clientId}</p>
        <p><strong>לידים השבוע:</strong> ${digest.totals.leads}</p>
        <p><strong>עסקאות שנסגרו:</strong> ${digest.totals.closedDeals}</p>
        <p><strong>קצב תקציב:</strong> ${digest.pacing.status}</p>
      </div>
      <div style="margin-top: 15px;">${alertsHtml}</div>
      <p style="margin-top: 20px;">היכנס ל-<code>/geo/dashboard</code> כדי לשלוח את הסיכום לוואטסאפ הלקוח.</p>
    </div>
  `;

  // Deliberately does NOT self-catch like sendLeadNotificationEmail / 
  // sendGoogleAdsOperatorApprovalEmail above — the cron route needs to see 
  // a thrown error to report 'email_failed' distinctly from 'sent'. If you 
  // add a try/catch here, you will silently break that distinction.
  await sendResendEmail({
    from: "WAO Ads Digest <ads@wao.co.il>",
    to: ["eitan@wao.co.il", "leads@wao.co.il"],
    subject: `Google Ads weekly digest [${clientId}]: ${digest.pacing.status}, ${digest.alerts.length} alert(s)`,
    html: htmlContent,
  });
}
```

This needs `import type { WeeklyDigest } from '@/lib/crm/intelligence';` added to `mail.ts`'s imports (the file currently has none — it's untyped `any` for lead objects, but the new function should be strictly typed per the "strict TypeScript safety" requirement; do not widen `WeeklyDigest` params to `any` to match the file's older style — the older style predates this requirement).

### 3.2 `src/app/(app)/geo/dashboard/page.tsx` — add the Google Ads digest section + WhatsApp button

Two changes to this file:

**(a) Loosen the per-client early return** so a client with a Google Ads digest but zero GEO actions still renders. Current code (`page.tsx:88`):
```ts
if (!client || actions.length === 0) return null;
```
Change to:
```ts
if (!client) return null;
```
...and move the GEO-actions-specific rendering (everything from `{/* Actions list */}` onward) behind its own `{actions.length > 0 && (...)}` guard, so a client with zero GEO actions simply shows no GEO section but can still show the new Ads section below. This is a required, minimal restructure — not a drive-by refactor — because without it, the sandbox client (currently 0 GEO actions, per `data/clients/google-ads-sandbox/tasks/` containing only a `google-ads/` subdir, no `geo/`) would never reach the new section at all.

**(b) Add the new section**, after the existing per-client GEO block, using the same `client`/`hasPhone` variables already in scope:
```tsx
import { buildAllClientDigests } from '@/lib/google-ads/weekly-digest-batch';
import { buildWeeklyDigestWhatsAppLink } from '@/lib/google-ads/whatsapp-digest';
// ...

export default function GeoDashboard() {
  const clients = listClients();
  const adsDigests = buildAllClientDigests(); // computed once, outside the per-client loop

  return (
    // ...
    {clients.map(clientId => {
      const client  = loadClient(clientId);
      if (!client) return null;
      const actions = loadActions(clientId);
      const adsResult = adsDigests.find((d) => d.clientId === clientId);
      const hasPhone = !!client.approvalWhatsapp;

      return (
        <section key={clientId} className="mb-12">
          {/* existing header + GEO actions block, now gated by actions.length > 0 */}

          {adsResult?.status === 'ok' && adsResult.campaign && adsResult.digest && (
            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-2">
                <div>
                  <span className="font-medium">Google Ads — סיכום שבועי</span>
                  <span className="text-xs text-[var(--muted)] mr-2">
                    {adsResult.digest.totals.leads} לידים · {adsResult.digest.alerts.length} התראות
                  </span>
                </div>
                <SendButton
                  waLink={buildWeeklyDigestWhatsAppLink({
                    contactPhone: client.approvalWhatsapp,
                    contactName: client.approvalContact || 'שלום',
                    campaignName: adsResult.campaign.businessName || adsResult.campaign.slug,
                    digest: adsResult.digest,
                  })}
                  label={`שלח סיכום ל${client.approvalContact || 'לקוח'}`}
                  disabled={!hasPhone}
                />
              </div>
            </div>
          )}
        </section>
      );
    })}
  );
}
```

`SendButton` (`src/components/geo/SendButton.tsx`) is reused as-is — no changes needed there; it already just renders an `<a href={waLink}>` with a disabled state.

---

## 4. Environment / Ops Setup (manual, not code)

Add to `.env.production` on the server (and `.env.local` for local testing):
```
CRON_SECRET=<a long random string, e.g. `openssl rand -hex 32`>
```

Add **one line** to the server's system crontab (`crontab -e` on the VPS — this is Eitan's manual infra step, same category as the existing `pm2 restart wao-app` in `deploy.sh`, not something this codebase's git history should encode):
```
0 6 * * 1 curl -sf -X POST https://www.wao.co.il/api/google-ads/weekly-digest-cron -H "x-cron-secret: $CRON_SECRET" >> /var/log/wao-weekly-digest.log 2>&1
```
(Monday 06:00 server time, matching VISION.md's "every Monday" cadence.) Do not add a `.github/workflows` cron or any other CI-based trigger — this app has no CI/CD pipeline beyond `deploy.sh`, and introducing one for a single cron call is disproportionate.

---

## 5. Type/Interface Changes Summary

| File | Change |
|---|---|
| `src/lib/google-ads/weekly-digest-batch.ts` | NEW — `listGoogleAdsBoundClientIds()`, `buildAllClientDigests()`, `ClientDigestResult` |
| `src/lib/google-ads/whatsapp-digest.ts` | NEW — `composeWeeklyDigestWhatsAppMessage()`, `buildWeeklyDigestWhatsAppLink()` |
| `src/app/api/google-ads/weekly-digest-cron/route.ts` | NEW — `POST` handler, `CronRunResult` |
| `src/lib/mail.ts` | Add `sendGoogleAdsWeeklyDigestEmail()`; add `WeeklyDigest` type import |
| `src/app/(app)/geo/dashboard/page.tsx` | Loosen per-client early-return guard; add Ads digest section + `SendButton` reuse |

No changes to `src/lib/crm/intelligence.ts`, `src/lib/google-ads/operator.ts`, `src/lib/google-ads/mutations.ts`, or `src/lib/google-ads/executor.ts` (Priority 1's files) — this spec is purely additive on top of them. No new SEO/GEO content pages are introduced anywhere in this spec, so there is no `/seo` vs `/seo/guide` cannibalization concern to check.

---

## 6. Test Coverage (Eitan-Dev / Claude Code)

Same hard rule as Priority 1: **assert against real behavior, not source-text regex.** Mock `fs` methods and injected dependencies (`sendGoogleAdsWeeklyDigestEmail`), not the routes' own source strings.

Run with the project's existing convention: `node --test --test-reporter=spec "src/**/*.test.mjs"` (17/17 pass as of this analysis, before this spec's new tests).

### 6.1 `src/lib/google-ads/weekly-digest-batch.test.mjs`
1. `listGoogleAdsBoundClientIds()` — mock `fs.readdirSync`/`fs.statSync`/`fs.existsSync` (via `node:test`'s `mock.method(fs, 'readdirSync', () => [...])`, etc.) to simulate three client directories, only two of which have a `google-ads.json`; assert the returned array contains exactly those two IDs.
2. `buildAllClientDigests()` with two mocked-bound clients, both with valid campaign configs — assert two `{ status: 'ok' }` results, each with a populated `digest` whose shape matches `WeeklyDigest` (spot-check `totals`, `pacing`, `alerts` keys exist).
3. `buildAllClientDigests()` where one client's `google-ads.json` has no `primarySlug` — assert that client's result is `{ status: 'unbound' }` and the **other** client still returns `{ status: 'ok' }` (this is the "one bad client can't kill the batch" guarantee from §1.3 — make the assertion explicit and named, e.g. `test('one client's missing primarySlug does not block the other clients in the batch')`).
4. `buildAllClientDigests()` where `loadCampaignConfigBySlug` is mocked to throw — assert the result is `{ status: 'error' }` with a non-empty `error` string, and, again, that a second, healthy client in the same batch still returns `'ok'`.

### 6.2 `src/lib/google-ads/whatsapp-digest.test.mjs`
5. `composeWeeklyDigestWhatsAppMessage()` with a fixture `WeeklyDigest` containing 2 alerts and a non-empty `nextActions[0]` — assert the output string contains the lead count, the closed-deal count, both alert titles, and the first next-action text (not the second, third, etc. — only the top one per §2.2's design).
6. `composeWeeklyDigestWhatsAppMessage()` with `alerts: []` — assert the output contains the "all clear" Hebrew line and does **not** contain the word "⚠️".
7. `buildWeeklyDigestWhatsAppLink()` — assert the returned string starts with `https://wa.me/` followed only by digits (phone with dashes/spaces/`+` stripped, reusing `buildWaLink`'s existing behavior — assert this by passing a phone like `+972-50-123-4567` and checking the result contains `9725012345 67`... i.e. exactly the digit-only cleaned form, matching `buildWaLink`'s regex at `geo/whatsapp.ts:67`), and that the `text=` query param, when URL-decoded, equals `composeWeeklyDigestWhatsAppMessage()`'s output for the same inputs.

### 6.3 `src/app/api/google-ads/weekly-digest-cron.test.mjs`
Import and invoke the route handler directly (construct a `Request`), mocking `buildAllClientDigests` and `sendGoogleAdsWeeklyDigestEmail` via `mock.method` on the imported modules — same technique as Priority 1's operator-task tests.

8. No `x-cron-secret` header, `CRON_SECRET` set in env — 401.
9. `CRON_SECRET` unset/empty in env, even with a header that happens to equal `''` — 401 (fail closed; explicitly guard against the "empty secret matches empty header" bug — this is the exact class of bug `verifyAdminSecret`'s `if (!secret) return false` already guards against, and this new code must too).
10. Correct header, two `'ok'` digest results returned by the mocked batch builder, mocked email function resolves for both — 200, `results` has two entries both `status: 'sent'`, and the mocked email function was called exactly twice (once per client, not once per alert).
11. One `'unbound'` result and one `'ok'` result — 200, the unbound one appears as `{ status: 'unbound' }` in the response and the email function is called exactly once (only for the `'ok'` client) — assert call count, not just "was called."
12. One `'ok'` result whose mocked email call rejects — 200 overall (batch success ≠ every individual send succeeding), but that entry's `status` is `'email_failed'`, not `'sent'` and not silently omitted (this is the named regression guard per §2.3's note — e.g. `test('an email failure is reported as email_failed, never folded into sent')`).

### 6.4 UI (`geo/dashboard/page.tsx`)
This repo has zero component/page-render tests today (no RTL/jsdom setup) — do not introduce a new test framework for one Wizard-of-Oz button. Verification of the rendered button, the `disabled` state when `approvalWhatsapp` is missing, and the actual `wa.me` link opening correctly is Roni's runtime/browser check, per the existing verifier role boundary (`AGENTS.md` §4) — not a unit test Eitan self-certifies.

### 6.5 Definition of Done for Priority 2
- [ ] All 12 new unit tests pass under `node --test --test-reporter=spec "src/**/*.test.mjs"`, alongside the existing 17 (29+ total, 0 fail).
- [ ] `npm run build` is clean (no TypeScript errors — in particular, `mail.ts`'s new `WeeklyDigest` import and the new modules' strict typing).
- [ ] `npm run lint` is clean.
- [ ] `CRON_SECRET` added to `.env.production` on the server and the crontab line from §4 added by Eitan manually; `curl`-based manual invocation (with the real header) against the running production app returns `200` with a `results` array reflecting the real bound client(s).
- [ ] `/geo/dashboard` visually shows the new Google Ads digest block for `google-ads-sandbox` (the only currently-bound client) with a working `SendButton`, verified by Roni per her PASS/FAIL evidence standard.
