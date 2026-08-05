/**
 * Per-client anchor-token / negative-intent dictionaries for the §3 intent-mismatch
 * heuristic, per docs/specs/priority-3-search-term-cleanup-scoring.md §3/§6.
 *
 * Deliberately does NOT include per-ad-group anchor tokens (spec §3's
 * `anchorTokensByAdGroupId`) — that requires knowing each client's actual live ad-group
 * names/structure, which wasn't available this session (§6: "neither client is onboarded
 * into this pipeline yet"). Leaving `anchorTokensByAdGroupId` empty is safe: the scorer
 * treats a missing anchor-token list for an ad group as "no anchor tokens configured,"
 * never as a false match — it does not block the mismatch test from running, it just can't
 * use the anchor-token escape hatch yet. Flag to Dror/Eitan: author real per-ad-group anchor
 * tokens once each client's live ad-group structure is inspected (same live-account check
 * §4A.0 already flags for `BRAND_CAMPAIGN_NAME_PATTERNS`).
 */

import type { ClientIntentDictionary } from './search-term-scoring';

/**
 * Retter (data/clients/retter/client.json) — NLP/coaching course training
 * ("מכון להכשרת מטפלים ומאמנים ב-NLP", "קורסי NLP פרקטישנר ומאסטר"). Has enough business
 * context in client.json to author a starting negative-intent list now (spec §6 explicitly
 * calls this out as non-blocking), covering: generic low-intent modifiers (spec's own
 * example list) plus a few course-vertical-specific off-intent terms (job-seeking language,
 * unrelated professional-service terms someone might type near "NLP"/"מאמן"). This is a
 * **minimal starting dictionary** — Dror should review/extend it once real search-term data
 * from the live account is visible.
 */
const RETTER_NEGATIVE_INTENT_TOKENS = [
  // Generic low-intent modifiers (spec §3's own example list)
  'חינם', 'בחינם', 'עבודה', 'משרה', 'משרות', 'מדריך', 'pdf', 'מתכון', 'וידאו', 'יוטיוב',
  'youtube', 'טורנט', 'free',
  // Course-vertical-specific: job-seeking / unrelated-profession drift around "NLP"/"מאמן"
  'דרושים', 'קורות', 'ראיון', 'שכר', 'פסיכולוג', 'פסיכיאטר', 'תרגום', 'ויקיפדיה', 'wikipedia',
];

export const RETTER_INTENT_DICTIONARY: ClientIntentDictionary = {
  anchorTokensByAdGroupId: {},
  negativeIntentTokens: RETTER_NEGATIVE_INTENT_TOKENS,
};

/**
 * AAAsada — per spec §6, "Intent-mismatch cannot run for this client yet — it needs the
 * anchor-token/negative-intent dictionary, which needs an actual service-scope assessment
 * first." `businessNiche`/`topService`/`usp` are all "unknown — to be assessed" in
 * client.json — authoring a dictionary now would be guessing, which the spec explicitly
 * forbids for this heuristic. No entry here on purpose; `resolveIntentDictionary` below
 * returns `undefined` for `aasada`, which `scoreSearchTerms` treats as "skip
 * INTENT_MISMATCH for this client" (CTR-low and wasted-spend still run normally).
 */
export const CLIENT_INTENT_DICTIONARIES: Record<string, ClientIntentDictionary> = {
  retter: RETTER_INTENT_DICTIONARY,
};

/**
 * Resolves the intent dictionary for a client, or `undefined` if none exists yet. Callers
 * must treat `undefined` as "skip INTENT_MISMATCH scoring for this client" (per spec §6 and
 * the definition-of-done bullet: "Explicit block/gate in the executor: if
 * campaignConfig.clientId is retter or aasada and no anchor-token/negative-intent theme file
 * exists yet, skip INTENT_MISMATCH scoring for that client rather than erroring or
 * guessing"). `scoreSearchTerms` already no-ops INTENT_MISMATCH when
 * `dictionary?.negativeIntentTokens` is empty/undefined, so passing `undefined` through is
 * sufficient — no separate boolean flag needed.
 */
export function resolveIntentDictionary(clientId: string | undefined): ClientIntentDictionary | undefined {
  if (!clientId) return undefined;
  return CLIENT_INTENT_DICTIONARIES[clientId];
}
