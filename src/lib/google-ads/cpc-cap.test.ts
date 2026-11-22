import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  BUDGET_FLOOR_ILS,
  CPC_CAP_ILS_BY_TRADE,
  FORECAST_CPC_SHARE_OF_CAP,
  TRADE_MONEY,
  cpcCapIlsForNiche,
  cpcCapMicrosForNiche,
  cpcCapTradeForNiche,
  forecastCpcIlsForNiche,
  tradeBudgetPromptTable,
  tradeMinimumBudgetIls,
  tradeMoneyForNiche,
} from './cpc-cap';
import {
  DAYS_PER_MONTH,
  campaignDailyBudgetIls,
  campaignMonthlyBudgetIls,
  dailyBudgetFromMonthly,
  dailyBudgetMicros,
} from './daily-budget';

// Hebrew trade words are read from the existing source lists by position, never typed here.
const repo = path.resolve(__dirname, '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(repo, rel), 'utf8');
const vd = read('src/lib/lp/verticalDetect.ts').split('\n');
const tokens = (line: string) => [...line.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
const arrayBefore = (vertical: string) => {
  let i = vd.findIndex((l) => l.includes(`vertical: '${vertical}'`));
  while (i > 0 && !vd[i].includes('keywords: [')) i -= 1;
  return tokens(vd[i]);
};
const legal = arrayBefore('legal-financial'); // [0] lawyer, [1] lawyer abbreviation
const emergency = arrayBefore('emergency-trades'); // [0] plumber, [4] locksmith
const medical = arrayBefore('medical-aesthetics'); // [1] teeth (dentist)
const route = read('src/app/api/bot/route.ts');
const cluster = (name: string) => [...route.match(new RegExp(`^\\s*${name}:\\s*\\[(.*?)\\],`, 'm'))![1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
const legalCluster = cluster('legal'); // [7] personal injury
const beauty = cluster('beautyAesthetics');
const business = cluster('businessProfessionalSvc'); // [0] accountant
const scan = JSON.parse(read('docs/research/site-bot/market-scan/stage1-diagnostics.json')).ticket as Record<string, { terms: Array<string | { term: string }> }>;
const term = (profession: string, i: number) => {
  const t = scan[profession].terms[i];
  return typeof t === 'string' ? t : t.term;
};

test("the one table: Dror's caps, minimums and recommended budgets (accepted 2026-11-23)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(TRADE_MONEY)), {
    injury_lawyer: { cap: 35, min: 2500, recommended: 4000 },
    lawyer: { cap: 28, min: 2000, recommended: 3500 },
    urgent_home: { cap: 25, min: 1500, recommended: 2500 },
    dentist: { cap: 20, min: 1500, recommended: 2500 },
    electrician: { cap: 20, min: 1500, recommended: 2000 },
    beauty_accountant: { cap: 15, min: 1500, recommended: 2000 },
    default: { cap: 15, min: 1500, recommended: 1500 },
  });
  assert.deepEqual({ ...CPC_CAP_ILS_BY_TRADE }, { injury_lawyer: 35, lawyer: 28, urgent_home: 25, dentist: 20, electrician: 20, beauty_accountant: 15, default: 15 });
  assert.ok(Object.isFrozen(TRADE_MONEY) && Object.isFrozen(CPC_CAP_ILS_BY_TRADE) && Object.isFrozen(TRADE_MONEY.lawyer));
});

test('minimum = max(1,500, cap x 60 rounded up to the nearest 500); nothing below 1,500', () => {
  assert.equal(BUDGET_FLOOR_ILS, 1500);
  assert.deepEqual([35, 28, 25, 20, 15, 10, 1, 26, 34].map(tradeMinimumBudgetIls), [2500, 2000, 1500, 1500, 1500, 1500, 1500, 2000, 2500]);
  for (const money of Object.values(TRADE_MONEY)) {
    assert.equal(money.min, tradeMinimumBudgetIls(money.cap));
    assert.ok(money.min >= 1500 && money.recommended >= money.min);
  }
});

test('niche -> trade row, most specific first', () => {
  const cases: Array<[string, string, number]> = [
    [`${legal[0]} ${legalCluster[7]}`, 'injury_lawyer', 35],
    [legal[0], 'lawyer', 28],
    [legal[1], 'lawyer', 28],
    [emergency[4], 'urgent_home', 25], // locksmith: 20 -> 25
    [emergency[0], 'urgent_home', 25], // plumber (was the default 15)
    [term('plumber', 2), 'urgent_home', 25], // leak detection
    [term('roofing', 0), 'urgent_home', 25], // roof waterproofing: the prospect's trade
    [term('roofing', 1), 'urgent_home', 25],
    [term('movers', 0), 'urgent_home', 25],
    [term('locksmith', 1), 'urgent_home', 25],
    [medical[1], 'dentist', 20],
    [term('electrician', 0), 'electrician', 20],
    [term('electrician', 1), 'electrician', 20],
    [beauty[0], 'beauty_accountant', 15],
    [beauty[2], 'beauty_accountant', 15],
    [business[0], 'beauty_accountant', 15],
    [term('painter', 0), 'default', 15],
    ['unknown trade', 'default', 15],
    ['', 'default', 15],
  ];
  for (const [niche, trade, cap] of cases) {
    assert.equal(cpcCapTradeForNiche(niche), trade, niche);
    assert.equal(cpcCapIlsForNiche(niche), cap, niche);
  }
  assert.equal(cpcCapTradeForNiche(undefined), 'default');
  assert.equal(cpcCapMicrosForNiche(term('roofing', 0)), 25_000_000);
  assert.equal(cpcCapMicrosForNiche('unknown trade'), 15_000_000);
  assert.deepEqual({ ...tradeMoneyForNiche(beauty[0]) }, { cap: 15, min: 1500, recommended: 2000 });
});

test('lead forecasts price clicks at 0.8 x the trade cap', () => {
  assert.equal(FORECAST_CPC_SHARE_OF_CAP, 0.8);
  assert.equal(forecastCpcIlsForNiche(emergency[4]), 20);
  assert.equal(forecastCpcIlsForNiche(legal[0]), 22.4);
  assert.equal(forecastCpcIlsForNiche(`${legal[0]} ${legalCluster[7]}`), 28);
  assert.equal(forecastCpcIlsForNiche(medical[1]), 16);
  assert.equal(forecastCpcIlsForNiche('unknown trade'), 12);
  // The bot's budget turns use it (no per-cluster CPC left).
  assert.match(route, /cpc: forecastCpcIlsForNiche\(niche\)/);
  assert.doesNotMatch(route, /\{ cpc: \d+,/, 'no per-cluster CPC remains');
  assert.doesNotMatch(route, /CITY_TIER_CPC_MULTIPLIER/);
});

test('the prompt table and CPC sentence are generated from the table (one source of truth)', () => {
  const table = tradeBudgetPromptTable().split('\n');
  assert.equal(table.length, 2 + Object.keys(TRADE_MONEY).length);
  assert.match(table[2], /\| 2,500 \| 4,000 \| 35 \|$/);
  assert.match(table[4], /\| 1,500 \| 2,500 \| 25 \|$/);
  assert.match(table[8], /^\| Everything else \| 1,500 \| 1,500 \| 15 \|$/);
  assert.ok(table[4].includes(term('roofing', 0).split(' ')[0]), 'the waterproofing token is listed');
  const prompts = read('src/lib/bot/prompts.ts');
  assert.ok(prompts.includes('${tradeBudgetPromptTable()}'));
  assert.ok(prompts.includes('${cpcCapPromptSentence()}'));
  assert.equal(prompts.split('\n').filter((l) => /^\| .+\|\s*[\d,]+\s*\|\s*[\d,]+\s*\|\s*\d+\s*\|$/.test(l)).length, 0, 'no hand-written budget table left');
});

test('the bot never quotes a minimum below 1,500', () => {
  assert.match(route, /const minimumToQuote17 = Math\.max\(BUDGET_FLOOR_ILS, vb17\.min\);/);
  assert.equal(route.split('vb17.min').length - 1, 1, 'vb17.min is read only by the floor guard');
  assert.doesNotMatch(route, /monthlyBudget \?\? 1000|monthlyBudget \|\| 1500/);
});

test('daily budget = monthly / 30.4, whole agorot; micros from the agorot value', () => {
  assert.equal(DAYS_PER_MONTH, 30.4);
  assert.equal(dailyBudgetFromMonthly(1500), 49.34);
  assert.equal(dailyBudgetMicros(49.34), 49_340_000);
  assert.equal(dailyBudgetMicros(dailyBudgetFromMonthly(1500)), 49_340_000);
  assert.equal(dailyBudgetFromMonthly(2500), 82.24);
  assert.equal(dailyBudgetFromMonthly(4000), 131.58);
  assert.equal(dailyBudgetMicros(60), 60_000_000);
  assert.throws(() => dailyBudgetFromMonthly(0));
  assert.equal(campaignDailyBudgetIls(1500, 999), 49.34, 'the monthly budget wins');
  assert.equal(campaignDailyBudgetIls(undefined, 49.336), 49.34);
  assert.equal(campaignDailyBudgetIls('nope', 60), 60);
  assert.equal(campaignMonthlyBudgetIls(1500, 49.34), 1500);
  assert.equal(campaignMonthlyBudgetIls(undefined, 49.34), 1499.94);
});

test('every monthly -> daily conversion and every budget write uses the one rule', () => {
  const create = read('src/app/api/google-ads/create-campaign/route.ts');
  assert.match(create, /const dailyBudgetIls = campaignDailyBudgetIls\(collectedData\.monthlyBudget, strategyCheck\.dailyBudgetIls\);/);
  assert.match(create, /amount_micros: dailyBudgetMicros\(dailyBudgetIls\)/);
  assert.doesNotMatch(create.slice(create.indexOf('export async function POST(')), /strategy\.suggestedDailyBudget|\* 30\.4/);
  assert.match(read('src/lib/google-ads/mutations.ts'), /const amountMicros = dailyBudgetMicros\(params\.dailyBudgetIls\);/);
  assert.match(read('src/app/api/google-ads/budget/route.ts'), /campaignDailyBudgetIls\(hasMonthly \? body\.monthlyBudgetIls : undefined, requestedDaily\)/);
  assert.equal(route.split('dailyBudgetFromMonthly(budget)').length - 1, 2);
  assert.doesNotMatch(route, /budget \/ 30(\.4)?\)/);
});
