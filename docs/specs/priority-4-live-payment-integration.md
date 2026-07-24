# Technical Specification — Priority 4: Close the Payment-Confirmation Gap

Author: Dror (PPC Strategist), on behalf of WAO strategy — routed via Adam
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation
Related: `docs/specs/priority-1-google-ads-execution-loop.md`, `docs/specs/priority-2-weekly-proactive-loop.md`

---

## 0. Problem Statement

An uncommitted, undocumented change already wires `POST /api/checkout` to the live Yaad Sarig
`APIsign` endpoint and adds `GET /api/checkout/callback` (`src/app/api/checkout/route.ts`,
`src/app/api/checkout/callback/route.ts`). This is real progress toward Priority 4, but it has a
live-money-shaped hole:

The onboarding page's post-payment trigger (`triggerCampaignLaunch`,
`src/app/(app)/google-ads/onboarding/page.tsx:199`) is a client-side `useEffect` that fires
**purely off a URL query param**: `?payment=success` (`page.tsx:299-305`). It calls
`POST /api/google-ads/create-campaign` with `mode` read from client state (`page.tsx:80`,
a UI toggle **entirely independent of whether payment actually happened**).

The callback route's HMAC signature check exists but is opt-in:

```ts
if (signature && process.env.YAAD_VERIFY_SIGNATURE === 'true') { ... }
```

If `YAAD_VERIFY_SIGNATURE` isn't set on production (it currently isn't — grep confirms no
`.env*` file references it anywhere), **any** unauthenticated `GET
/api/checkout/callback?status=success&slug=x` redirects to
`/google-ads/onboarding?payment=success`, which triggers live campaign creation with zero
payment having occurred. This is the actual blocker for calling Priority 4 done — not the Yaad
API wiring itself, which is mostly there.

---

## 1. Fix Required — `src/app/api/checkout/callback/route.ts`

**Make signature verification unconditional and fail-closed, not opt-in.**

- Remove the `process.env.YAAD_VERIFY_SIGNATURE === 'true'` gate. Any callback claiming
  `status === 'success'` (or `CCode === '0'`) MUST carry a valid signature or it is treated as
  failure — redirect to the `payment=error` path, never `payment=success`.
- Sandbox mode (no live `YAAD_TERMINAL_NUMBER` / `YAAD_API_KEY` configured, i.e. the existing
  `isLive` check in `route.ts` is false) may keep bypassing signature checks, since there is no
  real Yaad server signing anything in that path — the `/checkout/yaad-sandbox` mock page is a
  separate, already-understood test fixture. Gate strictly on the same `isLive` condition
  `checkout/route.ts` already computes.

### 1a. Confirmed verification scheme (Hyp Pay / Yaad Sarig, from live merchant docs)

The original assumption in this spec — a self-computed `HMAC-SHA256("${terminal}:${txId}:${status}")`
— **is wrong and must not be implemented.** Confirmed against the actual Hyp Pay developer docs
(`developers.hyp.co.il`, "Transaction Validation" page) and the live merchant dashboard
(maxpay.co.il / yaadpay account, terminal 5601242121): Hyp does **not** use a locally-computable
HMAC. Verification is **API-based** — you send the callback's parameters back to Hyp and Hyp tells
you if they're genuine.

**Step 1 — the callback itself.** After a successful payment, Hyp redirects the browser to your
success URL (now correctly configured in the Hyp dashboard as
`https://www.wao.co.il/api/checkout/callback` — confirmed set 2026-07-24, was previously the Hyp
demo default `http://icom.yaad.net/`) with query params including at minimum:
`Id`, `CCode`, `Amount`, `ACode`, `Order`, `Fild1`, `Fild2`, `Fild3`, and **`Sign`**. `Sign` is only
present if the original `APIsign` request that created the payment page included `Sign: 'True'` —
confirm `src/app/api/checkout/route.ts`'s payload includes this (it currently does not; add it).

**Step 2 — verify by round-trip, not local computation.** Send a `GET` to
`https://pay.hyp.co.il/p/` with:
```
action=APISign&What=VERIFY&Masof=<terminal>&KEY=<api-key>&PassP=<api-password>
  &<every parameter from the callback, in the same order it was received, including Sign>
```
Hyp responds `CCode=0` if the transaction and signature are genuine; any other code (or an error)
means reject — redirect to `payment=error`, never `payment=success`. This is the entire
verification logic; there is no local hashing to implement.

**Credentials (already in `.env.local`, gitignored — do not commit, do not put these values in
any file tracked by git):**
- `YAAD_TERMINAL_NUMBER` — Masof, already set (`5601242121`)
- `YAAD_API_KEY` — already set
- `YAAD_PASSP` — **not yet retrieved.** Not visible directly in the Hyp dashboard's Terminal
  Details panel; the "הוספת פרמטר" (add parameter) control under Settings → Payment Page and API →
  Authentication is for REFERER/IP-host allow-listing, not the PassP credential itself, and does
  not apply to this flow (API-based VERIFY doesn't depend on that section's radio selection —
  leave it on REFERER, don't touch it). Source PassP from Hyp support or the merchant's original
  onboarding packet before wiring this — **do not ship without it**, since the VERIFY call requires
  all three credentials and there's no fallback verification path.

**Do not implement any HMAC/local-signature formula.** If PassP can't be sourced in time to ship
this pass, ship fail-closed (reject every live callback, i.e. treat as if verification always
fails) and flag the PassP gap explicitly rather than approximating verification with a formula
that was never confirmed against Hyp's real behavior.

**Do not touch `create-campaign`'s own live/test mode gating** (`resolveAdsAccount`,
`resolveGoogleAdsMutationAccess`) — that's Priority 1's territory and is already correct. This
spec is scoped to: don't let an unpaid request reach the client-side trigger with
`payment=success` in the first place.

## 2. Test Requirement

Add a behavioral test (mock the `fetch` call to `pay.hyp.co.il`'s VERIFY endpoint, not
regex-on-source) asserting:
- A callback with `status=success` and no `Sign` param → redirects to `payment=error`, not
  `success`, without even calling VERIFY.
- A callback with `status=success` and a `Sign` param, where the mocked VERIFY call returns
  anything other than `CCode=0` → redirects to `payment=error`.
- A callback with `status=success` and a `Sign` param, where the mocked VERIFY call returns
  `CCode=0` → redirects to `payment=success`.
- Sandbox-mode callback (no live terminal configured) still redirects to `payment=success` on
  `status=success` without calling VERIFY at all.
- If `YAAD_PASSP` is unset while `isLive` is true, every callback is rejected (fail-closed) —
  the route must not silently skip verification just because a credential is missing.

## 3. Out of Scope for This Pass

- The `mode` (test/live) UI toggle at `page.tsx:80` staying independent of payment status is a
  separate, smaller product question (should "live" mode even be selectable before payment
  clears?) — flag it to Adam after this fix ships, don't fold it into this spec.
- Payment-log persistence (`data/payments/*.json`) is fine as-is for now.
