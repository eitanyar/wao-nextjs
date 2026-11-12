/**
 * Per-trade max-CPC ceiling for new Ads Bot campaigns (Dror's create-campaign triage, fix 4;
 * Adam's decision 2026-11-12: one cap per trade from the bot's vertical budget table).
 *
 * Phase 1 bids Maximize Clicks with this ceiling (campaign.target_spend.cpc_bid_ceiling_micros).
 * Values follow the "CPC" column of the VERTICAL BUDGET TABLE in src/lib/bot/prompts.ts:
 * personal-injury lawyers 35, other lawyers 28, dentists 20, locksmiths 20, everything else 15.
 * The owner never sees the number (the copy says "a ceiling set for your trade").
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The trade tokens are \u escapes
 * copied by script from existing keyword lists (src/lib/lp/verticalDetect.ts VERTICAL_MAP and
 * the CLUSTER_KEYWORDS table in src/app/api/bot/route.ts), never typed by hand.
 */

export type CpcCapTrade = 'injury_lawyer' | 'lawyer' | 'dentist' | 'locksmith' | 'default';

/** The one place the per-trade ceilings live (NIS per click). */
export const CPC_CAP_ILS_BY_TRADE: Readonly<Record<CpcCapTrade, number>> = Object.freeze({
  injury_lawyer: 35,
  lawyer: 28,
  dentist: 20,
  locksmith: 20,
  default: 15,
});

const LAWYER_TOKENS = ['\u05E2\u05D5\u05E8\u05DA \u05D3\u05D9\u05DF', '\u05E2\u05D5\"\u05D3'];
const INJURY_TOKENS = ['\u05E0\u05D6\u05D9\u05E7\u05D9\u05DF'];
const DENTIST_TOKENS = ['\u05E9\u05D9\u05E0\u05D9\u05D9\u05DD', '\u05D3\u05E0\u05D8\u05DC', '\u05D0\u05D5\u05E8\u05EA\u05D5\u05D3\u05D5\u05E0\u05D8'];
const LOCKSMITH_TOKENS = ['\u05DE\u05E0\u05E2\u05D5\u05DC\u05DF', '\u05DE\u05E0\u05E2\u05D5\u05DC', '\u05E4\u05E8\u05D9\u05E6\u05D4'];

const has = (text: string, tokens: readonly string[]) => tokens.some((token) => text.includes(token));

/** Which cap row a business niche falls in. Most specific first; unknown niches get the default. */
export function cpcCapTradeForNiche(niche: string | undefined | null): CpcCapTrade {
  const text = (niche ?? '').normalize('NFC').replace(/\u05F4/g, '"');
  if (!text.trim()) return 'default';
  if (has(text, INJURY_TOKENS)) return 'injury_lawyer';
  if (has(text, LAWYER_TOKENS)) return 'lawyer';
  if (has(text, DENTIST_TOKENS)) return 'dentist';
  if (has(text, LOCKSMITH_TOKENS)) return 'locksmith';
  return 'default';
}

export function cpcCapIlsForNiche(niche: string | undefined | null): number {
  return CPC_CAP_ILS_BY_TRADE[cpcCapTradeForNiche(niche)];
}

export function cpcCapMicrosForNiche(niche: string | undefined | null): number {
  return Math.round(cpcCapIlsForNiche(niche) * 1_000_000);
}
