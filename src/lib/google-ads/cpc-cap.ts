/**
 * THE one source of truth for Ads Bot per-trade money: max-CPC ceiling, minimum and recommended monthly budget, and the
 * click price lead forecasts use (Dror's table, accepted by Eitan 2026-11-23).
 *
 *   | Trade row                                                        | Cap | Min   | Recommended |
 *   | Personal-injury lawyer                                           | 35  | 2,500 | 4,000       |
 *   | Other lawyer                                                     | 28  | 2,000 | 3,500       |
 *   | Urgent home services: locksmith, plumber / leak detection,       | 25  | 1,500 | 2,500       |
 *   |   roof waterproofing, movers                                     |     |       |             |
 *   | Dentist / orthodontist                                           | 20  | 1,500 | 2,500       |
 *   | Electrician                                                      | 20  | 1,500 | 2,000       |
 *   | Aesthetics / beauty, accountant                                  | 15  | 1,500 | 2,000       |
 *   | Everything else                                                  | 15  | 1,500 | 1,500       |
 *
 * Minimum rule: max(1,500, cap x 60 rounded UP to the nearest 500) (tradeMinimumBudgetIls). Nothing is ever below 1,500.
 * Forecast click price: 0.8 x the trade's cap (FORECAST_CPC_SHARE_OF_CAP) until real data (Keyword Planner / account
 * history) replaces it.
 * Phase 1 bids Maximize Clicks with the cap (campaign.target_spend.cpc_bid_ceiling_micros). The owner never sees the
 * cap (the copy says "a ceiling set for your trade"). The bot's prompt table is generated from this module
 * (src/lib/bot/prompts.ts), and the bot's budget replies read it (src/app/api/bot/route.ts).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The trade tokens are \u escapes copied by script from existing
 * lists (src/lib/lp/verticalDetect.ts VERTICAL_MAP, the CLUSTER_KEYWORDS table in src/app/api/bot/route.ts, and the
 * DataForSEO market-scan terms in docs/research/site-bot/market-scan/stage1-diagnostics.json), never typed by hand.
 */

export type CpcCapTrade = 'injury_lawyer' | 'lawyer' | 'urgent_home' | 'dentist' | 'electrician' | 'beauty_accountant' | 'default';

export interface TradeMoney {
  /** Max CPC ceiling, NIS per click. */
  cap: number;
  /** Minimum monthly budget the bot accepts / quotes, NIS. */
  min: number;
  /** Recommended monthly budget, NIS. */
  recommended: number;
}

/** Budgets are never quoted below this (NIS per month). */
export const BUDGET_FLOOR_ILS = 1500;
/** Lead forecasts assume clicks cost this share of the cap until real data exists. */
export const FORECAST_CPC_SHARE_OF_CAP = 0.8;

/** max(1,500, cap x 60 rounded up to the nearest 500). */
export function tradeMinimumBudgetIls(cap: number): number {
  return Math.max(BUDGET_FLOOR_ILS, Math.ceil((cap * 60) / 500) * 500);
}

const row = (cap: number, recommended: number): TradeMoney => Object.freeze({ cap, min: tradeMinimumBudgetIls(cap), recommended });

/** The one table (minimums derived by the rule above). */
export const TRADE_MONEY: Readonly<Record<CpcCapTrade, TradeMoney>> = Object.freeze({
  injury_lawyer: row(35, 4000),
  lawyer: row(28, 3500),
  urgent_home: row(25, 2500),
  dentist: row(20, 2500),
  electrician: row(20, 2000),
  beauty_accountant: row(15, 2000),
  default: row(15, 1500),
});

/** Per-trade ceilings (NIS per click), derived from TRADE_MONEY. */
export const CPC_CAP_ILS_BY_TRADE: Readonly<Record<CpcCapTrade, number>> = Object.freeze(
  Object.fromEntries(Object.entries(TRADE_MONEY).map(([trade, money]) => [trade, money.cap])) as Record<CpcCapTrade, number>,
);

/** Plain-English row labels (prompt table / admin); the Hebrew matching tokens are below. */
export const TRADE_LABELS: Readonly<Record<CpcCapTrade, string>> = Object.freeze({
  injury_lawyer: 'Personal-injury lawyer',
  lawyer: 'Other lawyer',
  urgent_home: 'Urgent home services (locksmith, plumber / leak detection, roof waterproofing, movers)',
  dentist: 'Dentist / orthodontist',
  electrician: 'Electrician',
  beauty_accountant: 'Aesthetics / beauty, accountant',
  default: 'Everything else',
});

const LAWYER_TOKENS = ['\u05E2\u05D5\u05E8\u05DA \u05D3\u05D9\u05DF', '\u05E2\u05D5\"\u05D3'];
const INJURY_TOKENS = ['\u05E0\u05D6\u05D9\u05E7\u05D9\u05DF'];
const DENTIST_TOKENS = ['\u05E9\u05D9\u05E0\u05D9\u05D9\u05DD', '\u05D3\u05E0\u05D8\u05DC', '\u05D0\u05D5\u05E8\u05EA\u05D5\u05D3\u05D5\u05E0\u05D8'];
// Locksmith (unchanged tokens) + plumber / leak detection + roof waterproofing + movers.
const URGENT_HOME_TOKENS = [...['\u05DE\u05E0\u05E2\u05D5\u05DC\u05DF', '\u05DE\u05E0\u05E2\u05D5\u05DC', '\u05E4\u05E8\u05D9\u05E6\u05D4'], ...['\u05D0\u05D9\u05E0\u05E1\u05D8\u05DC', '\u05E9\u05E8\u05D1\u05E8\u05D1', '\u05E0\u05D6\u05D9\u05DC', '\u05E1\u05EA\u05D9\u05DE\u05D4', '\u05D0\u05D9\u05D8\u05D5\u05DD', '\u05D2\u05D2\u05DF', '\u05D4\u05D5\u05D1\u05DC\u05D5\u05EA', '\u05E4\u05E8\u05D9\u05E6\u05EA']];
const ELECTRICIAN_TOKENS = ['\u05D7\u05E9\u05DE\u05DC\u05D0\u05D9'];
// The bot's beautyAesthetics cluster keywords + accountant.
const BEAUTY_ACCOUNTANT_TOKENS = ['\u05E7\u05D5\u05E1\u05DE\u05D8', '\u05D0\u05E1\u05EA\u05D8', '\u05D1\u05D5\u05D8\u05D5\u05E7\u05E1', '\u05E4\u05D9\u05DC\u05D9\u05E0\u05D2', '\u05DC\u05D9\u05D9\u05D6\u05E8', '\u05E9\u05D9\u05E2\u05E8', '\u05D8\u05D9\u05E4\u05D5\u05DC \u05E4\u05E0\u05D9\u05DD', '\u05DE\u05E0\u05D9\u05E7\u05D5\u05E8', '\u05E4\u05D3\u05D9\u05E7\u05D5\u05E8', '\u05E8\u05D9\u05E1\u05D9\u05DD', '\u05D2\u05D1\u05D5\u05EA', '\u05D0\u05E4\u05D9\u05DC', '\u05DE\u05E1\u05D0\u05D6', '\u05E8\u05D5\u05D0\u05D4 \u05D7\u05E9\u05D1\u05D5\u05DF', '\u05D7\u05E9\u05D1\u05D5\u05E0\u05D0\u05D9'];

/** Matching order: most specific first; unknown niches get the default. */
export const TRADE_TOKENS: ReadonlyArray<readonly [CpcCapTrade, readonly string[]]> = Object.freeze([
  ['injury_lawyer', INJURY_TOKENS],
  ['lawyer', LAWYER_TOKENS],
  ['dentist', DENTIST_TOKENS],
  ['urgent_home', URGENT_HOME_TOKENS],
  ['electrician', ELECTRICIAN_TOKENS],
  ['beauty_accountant', BEAUTY_ACCOUNTANT_TOKENS],
] as const);

const has = (text: string, tokens: readonly string[]) => tokens.some((token) => text.includes(token));

/** Which row a business niche falls in. */
export function cpcCapTradeForNiche(niche: string | undefined | null): CpcCapTrade {
  const text = (niche ?? '').normalize('NFC').replace(/\u05F4/g, '"').toLowerCase();
  if (!text.trim()) return 'default';
  for (const [trade, tokens] of TRADE_TOKENS) if (has(text, tokens)) return trade;
  return 'default';
}

export function tradeMoneyForNiche(niche: string | undefined | null): TradeMoney {
  return TRADE_MONEY[cpcCapTradeForNiche(niche)];
}

export function cpcCapIlsForNiche(niche: string | undefined | null): number {
  return tradeMoneyForNiche(niche).cap;
}

export function cpcCapMicrosForNiche(niche: string | undefined | null): number {
  return Math.round(cpcCapIlsForNiche(niche) * 1_000_000);
}

/** The click price lead forecasts use: 0.8 x the trade's cap, NIS. */
export function forecastCpcIlsForNiche(niche: string | undefined | null): number {
  return Math.round(cpcCapIlsForNiche(niche) * FORECAST_CPC_SHARE_OF_CAP * 100) / 100;
}

/** Markdown table for the bot's system prompt, generated from TRADE_MONEY (labels English, tokens from the lists). */
export function tradeBudgetPromptTable(): string {
  const tokens = new Map<CpcCapTrade, readonly string[]>(TRADE_TOKENS);
  const fmt = (n: number) => n.toLocaleString('en-US');
  const lines = [
    '| Trade row (niche contains any of) | Min NIS/mo | Recommended NIS/mo | CPC cap NIS |',
    '|---|---|---|---|',
  ];
  for (const trade of Object.keys(TRADE_MONEY) as CpcCapTrade[]) {
    const money = TRADE_MONEY[trade];
    const words = tokens.get(trade);
    const label = words ? `${TRADE_LABELS[trade]}: ${words.join(' / ')}` : TRADE_LABELS[trade];
    lines.push(`| ${label} | ${fmt(money.min)} | ${fmt(money.recommended)} | ${money.cap} |`);
  }
  return lines.join('\n');
}

/** The prompt's one-line CPC-cap sentence, generated from TRADE_MONEY. */
export function cpcCapPromptSentence(): string {
  const caps = (Object.keys(TRADE_MONEY) as CpcCapTrade[]).map((trade) => `${TRADE_LABELS[trade]} ~NIS ${TRADE_MONEY[trade].cap}`);
  return `The system sets that cap per trade (${caps.join('; ')}); do not compute or promise a different cap.`;
}
