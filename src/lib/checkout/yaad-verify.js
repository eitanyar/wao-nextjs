/**
 * Yaad Sarig / Hyp Pay hosted-payment-page live-mode gating and callback
 * verification.
 *
 * CONFIRMED VERIFICATION SCHEME (2026-07-24, from developers.hyp.co.il
 * "Transaction Validation" docs + live merchant dashboard, terminal
 * 5601242121): Hyp Pay does NOT sign callbacks with a locally-verifiable
 * HMAC. Instead you round-trip the callback's own query parameters back to
 * Hyp's APISign endpoint with `What=VERIFY`, and Hyp tells you whether
 * they're genuine (`CCode=0` = valid). There is no local hashing/signature
 * formula to implement — do not add one.
 *
 * `Sign` only appears on the callback at all if the original `APIsign`
 * request that created the payment page included `Sign: 'True'` (see
 * `src/app/api/checkout/route.ts`).
 */

/**
 * Mirrors the live/sandbox decision already made in
 * `src/app/api/checkout/route.ts`: only treat the integration as "live" (and
 * therefore require real Hyp verification) when a non-default terminal
 * number is configured AND live mode is explicitly enabled. Otherwise this
 * is the sandbox fixture (`/checkout/yaad-sandbox`), which has no real Hyp
 * server signing anything, so verification is bypassed there.
 */
export function isLiveYaadMode(env = process.env) {
  const terminalNumber = env.YAAD_TERMINAL_NUMBER;
  return Boolean(terminalNumber && terminalNumber !== '1234567890' && env.YAAD_LIVE_MODE === 'true');
}

const HYP_APISIGN_URL = 'https://pay.hyp.co.il/p/';

/**
 * Verifies a Hyp Pay callback by round-tripping its own parameters back to
 * Hyp's APISign VERIFY endpoint. Fails closed on every ambiguous case:
 * missing Sign, missing PassP credential, non-zero CCode, or a fetch error.
 *
 * @param {object} params
 * @param {URLSearchParams} params.callbackParams - the exact query params
 *   received on the callback, in the order they were received.
 * @param {string} params.terminal - Masof (terminal number).
 * @param {string} params.apiKey - Hyp API KEY.
 * @param {string|undefined} params.passP - Hyp PassP credential. If unset,
 *   verification always fails closed (see docs/specs/priority-4 §1a) — this
 *   credential has not been retrieved from Hyp yet.
 * @param {typeof fetch} [params.fetchImpl] - injectable for tests.
 * @returns {Promise<boolean>}
 */
export async function verifyYaadCallbackViaHyp({ callbackParams, terminal, apiKey, passP, fetchImpl = fetch }) {
  const signature = callbackParams.get('Sign');
  if (!signature) {
    return false;
  }

  // Fail closed if we don't yet have the PassP credential — there is no
  // fallback verification path (see docs/specs/priority-4-live-payment-integration.md §1a).
  if (!passP) {
    console.error('[yaad-verify] YAAD_PASSP is not configured — rejecting live callback (fail-closed).');
    return false;
  }
  if (!terminal || !apiKey) {
    return false;
  }

  const verifyUrl = new URL(HYP_APISIGN_URL);
  verifyUrl.searchParams.set('action', 'APISign');
  verifyUrl.searchParams.set('What', 'VERIFY');
  verifyUrl.searchParams.set('Masof', terminal);
  verifyUrl.searchParams.set('KEY', apiKey);
  verifyUrl.searchParams.set('PassP', passP);
  // Append every parameter from the callback, in the same order received,
  // including Sign.
  for (const [key, value] of callbackParams.entries()) {
    verifyUrl.searchParams.append(key, value);
  }

  try {
    const response = await fetchImpl(verifyUrl.toString(), { method: 'GET' });
    if (!response.ok) return false;
    const text = await response.text();
    const parsed = new URLSearchParams(text.trim());
    return parsed.get('CCode') === '0';
  } catch (err) {
    console.error('[yaad-verify] Hyp VERIFY call failed:', err);
    return false;
  }
}

/**
 * Pure decision function for `GET /api/checkout/callback` — resolves whether
 * a callback should be treated as a genuine success or an error, without any
 * Next.js/Response coupling (so it's directly unit-testable; see
 * `yaad-verify.test.mjs` and docs/specs/priority-4-live-payment-integration.md §2).
 *
 * In live mode, verification is mandatory and fail-closed: a callback is
 * only ever resolved as 'success' if `verifyYaadCallbackViaHyp` returns true
 * (which itself fails closed on a missing Sign, missing PassP, non-zero
 * CCode, or a fetch error). Sandbox mode (isLive === false) has no real Hyp
 * server to verify against, so it resolves purely off the callback's own
 * `status`/`CCode` params, matching the pre-existing sandbox fixture
 * behavior at `/checkout/yaad-sandbox`.
 *
 * @param {object} params
 * @param {URLSearchParams} params.searchParams - the callback's query params.
 * @param {boolean} params.isLive - result of the same isLive check `checkout/route.ts` computes.
 * @param {string} params.terminal
 * @param {string} params.apiKey
 * @param {string|undefined} params.passP
 * @param {typeof fetch} [params.fetchImpl]
 * @returns {Promise<{ outcome: 'success' | 'error', reason?: string }>}
 */
export async function resolveCallbackOutcome({ searchParams, isLive, terminal, apiKey, passP, fetchImpl = fetch }) {
  const status = searchParams.get('status');
  const claimsSuccess = status === 'success' || status === '0' || searchParams.get('CCode') === '0';

  if (isLive) {
    const isValid = await verifyYaadCallbackViaHyp({ callbackParams: searchParams, terminal, apiKey, passP, fetchImpl });
    if (!isValid) {
      return { outcome: 'error', reason: 'invalid_signature' };
    }
  }

  return claimsSuccess ? { outcome: 'success' } : { outcome: 'error' };
}
