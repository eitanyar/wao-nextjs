/**
 * Site Bot step 2c, first-screen fact v2 rule (a) (docs/missions/site-bot-step2-interview-preview-2026-11-25.md): the
 * homepage heroSubheadline of an interviewed owner is written in the H1's grammatical person, the third person about the
 * business. This module is the code gate behind the prompt rule: it finds first- and second-person forms (pronouns,
 * possessives and object forms) in a subheadline.
 *
 * Token sources (no Hebrew is authored here):
 *   - first-person plural: copyGates.config.ts WE_FORM_TOKENS (Noa's weTokens + we-form verbs), matched exactly as the
 *     solo-operator gate matches them (tokenPattern).
 *   - second-person plural address: copyGates.config.ts PLURAL_ADDRESS_TOKENS, matched as the address gate matches them.
 *   - the first-person subject pronoun and the name intro: generationData.ts SUBJECT_CARRY_TOKENS.
 *   - two first-person object forms cut from generationData.ts STICKY_ACTION_TOKENS (the second word of two of its
 *     two-word entries, found by shape, never retyped).
 *   - the remaining singular forms: \u escapes of words that already exist in the repo's waocopy-authored copy; the
 *     source file of each is named next to it (byte-verified on 2026-11-26).
 * Missing from the repo, so not covered: the first-person "for me" form built on the root that the second-person
 * entry below uses (FORMS_MISSING_FROM_REPO). Verb conjugations are not covered either (a present-tense verb has no
 * person in Hebrew; past and future person suffixes collide with nouns), so the prompt rule stays binding for them.
 *
 * Server and test only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import { PLURAL_ADDRESS_TOKENS, WE_FORM_TOKENS } from '../lp/copyGates.config';
import { tokenPattern } from '../lp/copyGates';
import { STICKY_ACTION_TOKENS, SUBJECT_CARRY_TOKENS } from '../lp/generationData';

const HEBREW_LETTER = '\u05D0-\u05EA';
/** Prefixes a singular pronoun may carry: vav, shin, kaf+shin and their vav forms. Never he, bet, kaf, lamed or mem alone
 * (those turn two of the short forms into other words). */
const SINGULAR_PREFIX = '(?:\u05D5?(?:\u05DB?\u05E9)?)';

/** Two-word sticky actions whose second word is a first-person object form (the "with me" and "to me" entries). */
const STICKY_OBJECT_FORMS: readonly string[] = STICKY_ACTION_TOKENS
  .map(token => token.split(' '))
  .filter(parts => parts.length === 2 && parts[1].length >= 2 && parts[1].length <= 4 && parts[1].endsWith('\u05D9'))
  .map(parts => parts[1]);

/** First-person singular forms: escapes of words in the repo (source in the comment). */
export const FIRST_PERSON_SINGULAR_FORMS: readonly string[] = [
  ...SUBJECT_CARRY_TOKENS,
  ...STICKY_OBJECT_FORMS,
  '\u05E9\u05DC\u05D9', // docs/copy/ads-bot-end-card-v2-2026-11-14.waocopy.json
  '\u05D0\u05D5\u05EA\u05D9', // docs/copy/ads-bot-new-strings-2026-11-22.json
  '\u05D0\u05DC\u05D9\u05D9', // docs/copy/ads-bot-faq-objections-2026-11-12.waocopy.json
  '\u05DE\u05DE\u05E0\u05D9', // docs/copy/briefs/google-ads-r2-patch-pass-2026-11-12.md
  '\u05D1\u05E9\u05D1\u05D9\u05DC\u05D9', // docs/copy/briefs/anchors-google-ads-site-bot-2026-11-11.md
  '\u05D0\u05E6\u05DC\u05D9', // docs/copy/astra-authority-first-homepage-copy.qwen38-v3-2026-09-30.json
  '\u05E2\u05DC\u05D9\u05D9', // docs/copy/briefs/site-bot-google-profile-link-label-2026-11-12.md
];

/** Second-person singular forms: escapes of words in the repo (source in the comment). */
export const SECOND_PERSON_SINGULAR_FORMS: readonly string[] = [
  '\u05D0\u05EA\u05D4', // docs/copy/ads-bot-consent-bidding-clause-2026-11-12.waocopy.json
  '\u05DC\u05DA', // docs/copy/ads-bot-completed-reply-2026-11-23.waocopy.json
  '\u05E9\u05DC\u05DA', // docs/copy/2026-08-24_operator-emails-hebrew-bundle.json
  '\u05D0\u05D5\u05EA\u05DA', // docs/copy/ads-bot-explainer-a-before-launch-2026-11-12.waocopy.json
  '\u05D0\u05DC\u05D9\u05DA', // docs/copy/ads-bot-explainer-a-before-launch-2026-11-12.waocopy.json
  '\u05D1\u05E9\u05D1\u05D9\u05DC\u05DA', // docs/copy/ads-bot-nurture-sequence-r3-2026-11-12.waocopy.json
  '\u05DE\u05DE\u05DA', // docs/copy/ads-bot-consent-bidding-clause-2026-11-12.waocopy.json
  '\u05D0\u05E6\u05DC\u05DA', // docs/copy/ads-bot-consent-bidding-clause-2026-11-12.waocopy.json
  '\u05D0\u05D9\u05EA\u05DA', // docs/copy/anchors-site-bot-2026-11-11.waocopy.json
  '\u05E2\u05DC\u05D9\u05DA', // docs/copy/ads-bot-pilot-patches-2026-11-22.waocopy.json
  '\u05E2\u05D1\u05D5\u05E8\u05DA', // docs/copy/ads-bot-credit-as-bonus-2026-11-12.waocopy.json
];

/** Forms the gate should cover but no repo string carries yet (English description; Adam gets them from waocopy). */
export const FORMS_MISSING_FROM_REPO: readonly string[] = ['first-person singular "for me" (the first-person twin of the last SECOND_PERSON_SINGULAR_FORMS entry)'];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const singularPattern = (token: string) => new RegExp(`(?<![${HEBREW_LETTER}])${SINGULAR_PREFIX}${escapeRegExp(token)}(?![${HEBREW_LETTER}])`, 'u');

interface PersonMatcher { token: string; person: 'first' | 'second'; pattern: RegExp }

const MATCHERS: readonly PersonMatcher[] = [
  ...FIRST_PERSON_SINGULAR_FORMS.map(token => ({ token, person: 'first' as const, pattern: singularPattern(token) })),
  ...WE_FORM_TOKENS.map(entry => ({ token: entry.token, person: 'first' as const, pattern: tokenPattern(entry) })),
  ...SECOND_PERSON_SINGULAR_FORMS.map(token => ({ token, person: 'second' as const, pattern: singularPattern(token) })),
  ...PLURAL_ADDRESS_TOKENS.map(entry => ({ token: entry.token, person: 'second' as const, pattern: tokenPattern(entry) })),
];

export interface SubheadlinePersonHit { token: string; person: 'first' | 'second' }

/**
 * The first- and second-person forms in a subheadline. `exempt` holds words that are names here (the owner's first name,
 * the business name's words): a token equal to one of them never counts.
 */
export function subheadlinePersonHits(value: string, exempt: readonly string[] = []): SubheadlinePersonHit[] {
  if (typeof value !== 'string' || !value.trim()) return [];
  const names = new Set(exempt.map(word => word.trim()).filter(Boolean));
  const seen = new Set<string>();
  const out: SubheadlinePersonHit[] = [];
  for (const matcher of MATCHERS) {
    if (names.has(matcher.token) || seen.has(matcher.token) || !matcher.pattern.test(value)) continue;
    seen.add(matcher.token);
    out.push({ token: matcher.token, person: matcher.person });
  }
  return out;
}

/** Name words that may collide with a short pronoun form: the owner's first name and the business name's words. */
export function personExemptNames(ownerName: unknown, businessName: unknown): string[] {
  const words = (value: unknown) => (typeof value === 'string' ? value.split(/\s+/u).filter(Boolean) : []);
  return [...words(ownerName), ...words(businessName)];
}
