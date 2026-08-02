import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * `uploadLeadConversion()`'s own orchestration logic (spec §6.1 items 4–5:
 * no-click-id → skip without ever exchanging an OAuth token; closed-deal
 * uses `lead.revenue`, not the estimated-value formula) lives in
 * `conversion-upload.ts`, a TypeScript file with real, non-elidable value
 * imports (`@/lib/crm/leadsStore`, `@/lib/crm/intelligence`). This Node
 * build has no TypeScript type-stripping support
 * (`node --experimental-strip-types` → `ERR_NO_TYPESCRIPT`), so plain
 * `node --test` cannot import and exercise `.ts` real behavior directly —
 * the codebase's only working path for that (`tsconfig.test.json` →
 * `dist/`, used by the trainer/payments suites) is scoped to a subgraph
 * that deliberately excludes `@/`-aliased CRM modules, and extending it here
 * is out of scope per spec §5.2 ("no other file changes required"). This
 * matches the established convention already used for every other `.ts`
 * file in this directory (see `weekly-digest-batch.test.mjs`,
 * `whatsapp-digest.test.mjs`) — source-anchored regression guards, not a
 * source-text stand-in for the request/response-shape coverage, which
 * *is* exercised with real mocked `fetch` behavior in
 * `data-manager-events.test.mjs` (spec §6.1 items 1–3, 6–10) since that
 * logic was extracted to a plain `.js` sibling specifically to make that
 * possible.
 */

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(baseDir, 'conversion-upload.ts'), 'utf8');

// Priority 4 spec §6.1 item 4.
test('a lead with no gclid/wbraid/gbraid is skipped before any Data Manager token exchange is attempted', () => {
  const clickIdBlock = source.match(/const clickId: ClickId \| null = [\s\S]*?: null;/);
  assert.ok(clickIdBlock, 'expected the clickId resolution block to exist');

  const skipBlock = source.match(
    /if \(!clickId\) \{\s*return \{\s*skipped: true,\s*reason: 'no_click_id',/
  );
  assert.ok(skipBlock, 'expected the no-click-id skip branch to return { skipped: true, reason: "no_click_id" }');

  // The skip branch (and its early `return`) appears strictly before the
  // OAuth token exchange call in source order — since this function is a
  // single top-to-bottom async body with no branching that could reach
  // `getDataManagerAccessToken` before the skip's `return`, this ordering
  // is sufficient evidence the token exchange cannot fire for a
  // no-click-id lead.
  const skipIndex = source.indexOf("reason: 'no_click_id'");
  const tokenExchangeIndex = source.indexOf('getDataManagerAccessToken(refreshToken, fetchImpl)');
  assert.ok(skipIndex > -1 && tokenExchangeIndex > -1);
  assert.ok(skipIndex < tokenExchangeIndex, 'the no-click-id skip must return before the OAuth token exchange call');
});

// Priority 4 spec §6.1 item 5 — carried over from Priority 3's existing
// test #16 for this behavior, re-asserted here since this is the first
// dedicated test file for conversion-upload.ts.
test('closed-deal conversions use lead.revenue as conversionValue, not the estimated avgJobValue * closeRateEstimate formula', () => {
  const closedDealBranch = source.match(
    /conversionActionResourceName = config\.closedDealConversionResourceName;\s*conversionValue = lead\.revenue \|\| 0;/
  );
  assert.ok(closedDealBranch, 'expected the closed-deal branch to set conversionValue from lead.revenue');

  const verifiedLeadBranch = source.match(
    /conversionActionResourceName = config\.verifiedLeadConversionResourceName;\s*conversionValue = Math\.round\(config\.avgJobValue \* config\.closeRateEstimate \* 100\) \/ 100;/
  );
  assert.ok(verifiedLeadBranch, 'expected the verified-lead branch (only) to use the estimated-value formula');
});

test('uploadLeadConversion signature and UploadResult shape are unchanged from Priority 3 (spec §3.1)', () => {
  assert.match(source, /export async function uploadLeadConversion\(\s*\{ leadId, type \}: UploadLeadConversionParams,/);
  assert.match(source, /export type UploadResult =/);
  assert.match(source, /\{ skipped: true; reason: 'no_click_id'; message: string \}/);
  assert.match(source, /\{ success: true; leadId: number; type: ConversionType; conversionValue: number \}/);
  assert.match(source, /\{ success: false; leadId: number; type: ConversionType; partialError: string; status: 207 \}/);
});

// Priority 4 spec §3.3 / §6.2 — belt-and-suspenders re-check alongside
// production-access-guards.test.mjs (which reads this same string).
test('resolveAdsAccount still reads GOOGLE_ADS_TEST_MCC_CUSTOMER_ID (unchanged mode gating, spec §3.3)', () => {
  assert.match(source, /GOOGLE_ADS_TEST_MCC_CUSTOMER_ID/);
});

test('the Data Manager helpers are imported from the extracted, independently-tested ./data-manager-events.js module', () => {
  assert.match(
    source,
    /import \{\s*parseConversionActionId,\s*resolveDataManagerRefreshToken,\s*getDataManagerAccessToken,\s*sendConversionEvent,\s*toEventTimestamp,\s*\} from '\.\/data-manager-events\.js';/
  );
});
