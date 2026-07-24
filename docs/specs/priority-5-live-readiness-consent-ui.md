# Technical Specification — Priority 5: Live-Readiness Consent-Capture UI

Author: Dror (PPC Strategist), on behalf of WAO strategy — routed via Adam
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation
Related: `src/lib/google-ads/live-readiness.js`, `docs/specs/priority-4-live-payment-integration.md`

---

## 0. Problem Statement

`assessLiveReadiness()` (`src/lib/google-ads/live-readiness.js:5`) gates a client's eligibility for
an approval-gated live Google Ads pilot on **six per-client boolean attestations**, read from
`data/clients/{clientId}/live-readiness.json`:

| Key | Label |
|---|---|
| `clientAccountOwned` | Client-owned Google Ads account confirmed |
| `clientBillingAccepted` | Client-owned billing profile and Google billing terms accepted |
| `mccInvitationAccepted` | WAO MCC manager invitation accepted |
| `approvalContactConfirmed` | Named approval contact confirmed |
| `liveConsentRecorded` | Explicit live-pilot consent recorded |
| `auditLogEnabled` | Immutable approval/audit log enabled |

Today there is **no write path** for these fields. The only reader is
`GET /api/google-ads/live-readiness` (`src/app/api/google-ads/live-readiness/route.ts`), which is
**client-authed** (it shows a logged-in client *their own* readiness) and read-only. The record
files don't exist yet for any client, so every client currently reads as fully un-ready. To set a
field, a human must SSH to the server and hand-edit JSON — the operational hole this spec closes.

**Goal:** an internal, staff-only screen where WAO staff toggle these six fields per client through
the app, with an audit trail — no server SSH, no hand-edited JSON.

---

## 1. Non-Negotiable Security Constraints

These are the reason this spec exists at all — get them wrong and it's worse than the JSON-editing
status quo, because a self-service consent toggle that isn't gated *launders* consent.

### 1.1 Staff (admin) auth, NOT client auth — CRITICAL
These six fields are the gate that unlocks a live-money pilot. A **client must never be able to
attest their own live-readiness.** Do NOT reuse the client session (`verifySessionToken` /
`COOKIE_NAME`) that the existing GET route uses. Use the **`wao-admin`** gate:
`ADMIN_COOKIE_NAME` + `verifyAdminToken` from `@/lib/admin-auth`, exactly as
`src/app/(app)/admin/clients/action.ts:22-26` does. Verify the admin token **first, before any
read or write**, and redirect to `/admin/login?...` on failure. Treat this the same way that file's
comment does: "the only thing standing between this route and an open backdoor."

### 1.2 This UI must NOT enable live mode
`live-readiness.js`'s header comment is load-bearing: it is "deliberately read-only: it never
enables live mutations." Even with all six fields `true`, `assessLiveReadiness` returns
`eligibleForPilot` only when `liveModeEnabled === false`, and actual live mutations stay locked
behind the `GOOGLE_ADS_ENABLE_LIVE_MODE` env var. **This UI records attestations only. It must not
touch `GOOGLE_ADS_ENABLE_LIVE_MODE`, must not flip any live-execution flag, and must not call any
mutation route.** Do not "helpfully" wire the sixth checkbox to enable live mode.

### 1.3 `liveConsentRecorded` must capture evidence, not a bare checkbox
Five of the six fields are operational facts WAO staff genuinely own (account owned, billing
accepted, MCC invite accepted, approval contact, audit log). But `liveConsentRecorded` = "Explicit
live-pilot **consent** recorded" is the **client's** consent. A staff member silently ticking a box
that asserts the client consented is exactly the failure mode we rejected on the Yaad signature in
Priority 4 — a check that looks real but attests nothing. Therefore: setting `liveConsentRecorded`
to `true` MUST require a non-empty free-text **evidence note** (who consented, when, via what
channel — e.g. "owner Dana signed onboarding consent form 2026-07-20" or "WhatsApp confirmation
from listed approval contact"). Persist that note (see §2.2). Reject a `liveConsentRecorded=true`
submission with an empty evidence note. The other five may be plain toggles.

### 1.4 Input hardening
- Validate `clientId` against `/^[a-z0-9-]+$/i` (same regex the GET route uses at
  `route.ts:38`) AND confirm `data/clients/{clientId}/` already exists before writing — never let a
  crafted `clientId` create stray directories or traverse paths.
- Only the six known keys are writable. Ignore any other field in the submitted form.

---

## 2. Files to Create

Mirror the `admin/clients` shape (server component page + `'use server'` action). Server action,
**not** a new API route — that's the established convention for admin mutations here and avoids
inventing a second auth surface.

### 2.1 `src/app/(app)/admin/live-readiness/page.tsx` (NEW)
Server component, `dir="rtl"`, `export const metadata = { robots: { index: false }, title: '…' }`
(match `admin/clients/page.tsx:5` — never index an internal admin page).

- Read the admin cookie and `verifyAdminToken` at the top; if invalid, `redirect('/admin/login?next=/admin/live-readiness')`.
- Enumerate clients from `data/clients/*` the same way `admin/clients/page.tsx:15-34` does (dirs
  containing `client.json`).
- For each client, load its `live-readiness.json` (default `{}` if absent) and render the six
  fields as a form of checkboxes + the evidence-note textarea for `liveConsentRecorded`, plus a
  read-only display of the current `assessLiveReadiness(...)` verdict (`missing`, `nextAction`) so
  staff see the effect of what they're setting. Reuse `assessLiveReadiness` — do not re-derive the
  logic in the page.
- Each client's form posts to the §2.2 action with a hidden `clientId`.
- Keep the visual language consistent with `admin/clients/page.tsx` (Tailwind, `var(--accent)`,
  RTL). Hebrew UI copy in this file is fine (it's created content, not agent prose) — but any
  user-facing Hebrew strings must go through **language-qa (Noa)** before this ships.

### 2.2 `src/app/(app)/admin/live-readiness/action.ts` (NEW)
`'use server'`. One exported action, e.g. `updateLiveReadinessAction(formData: FormData)`:

1. `verifyAdminToken` FIRST (per §1.1) → redirect on failure.
2. Validate `clientId` (§1.4); confirm client dir exists.
3. Read existing record (default `{}`), apply the six booleans from the form. Enforce §1.3:
   if `liveConsentRecorded` is being set true, require a non-empty evidence note; else redirect
   back with an error param.
4. Persist:
   - Write the six-field record back to `data/clients/{clientId}/live-readiness.json`
     (pretty-printed JSON, atomic write — write to a temp file then rename, so a crash can't leave
     a half-written consent record).
   - **Append an audit entry** to `data/clients/{clientId}/live-readiness.audit.jsonl`
     (append-only, one JSON object per line): timestamp, which fields changed old→new, and for a
     `liveConsentRecorded` change the evidence note. This is proportionate given the `auditLogEnabled`
     field literally promises "immutable approval/audit log" — the act of recording consent should
     itself be logged. (Single-admin system today, so no per-user actor field is required; a
     `source: 'admin-ui'` marker is enough.)
5. `redirect` back to the page with a success indicator.

---

## 3. Explicitly Out of Scope
- The client-facing `GET /api/google-ads/live-readiness` route stays exactly as-is (client-authed,
  read-only view). Do not change its auth or behavior.
- No changes to `assessLiveReadiness` logic, `GOOGLE_ADS_ENABLE_LIVE_MODE`, or any mutation/executor
  route (§1.2).
- No role system — single admin via the existing `wao-admin` gate is sufficient for now.

## 4. Verification (Roni, runtime)
- `GET /admin/live-readiness` with **no** `wao-admin` cookie → redirects to `/admin/login` (not 200,
  no client data leaked).
- With a valid admin cookie → 200, lists clients from `data/clients`.
- Submitting the form toggling e.g. `clientAccountOwned=true` for a test client → the field
  persists to that client's `live-readiness.json` on disk (show the file before/after).
- Submitting `liveConsentRecorded=true` with an **empty** evidence note → rejected, field NOT
  written. With a non-empty note → written, and an entry appended to `live-readiness.audit.jsonl`.
- Confirm `GOOGLE_ADS_ENABLE_LIVE_MODE` is untouched and no live-mutation route is called by this
  flow (grep the action for any executor/mutation import → must be none).
