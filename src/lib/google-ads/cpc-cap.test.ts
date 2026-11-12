import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { CPC_CAP_ILS_BY_TRADE, cpcCapIlsForNiche, cpcCapMicrosForNiche, cpcCapTradeForNiche } from './cpc-cap';

// Hebrew trade words are read from the existing source lists by position, never typed here.
const repo = path.resolve(__dirname, '..', '..', '..');
const vd = fs.readFileSync(path.join(repo, 'src/lib/lp/verticalDetect.ts'), 'utf8').split('\n');
const tokens = (line: string) => [...line.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
const arrayBefore = (vertical: string) => {
  let i = vd.findIndex((l) => l.includes(`vertical: '${vertical}'`));
  while (i > 0 && !vd[i].includes('keywords: [')) i -= 1;
  return tokens(vd[i]);
};
const legal = arrayBefore('legal-financial'); // [0] lawyer, [1] lawyer abbreviation
const emergency = arrayBefore('emergency-trades'); // [0] plumber, [4] locksmith
const medical = arrayBefore('medical-aesthetics'); // [1] teeth (dentist)

test('one exported map: ~15 default, lawyers 28/35, dentists and locksmiths 20', () => {
  assert.deepEqual({ ...CPC_CAP_ILS_BY_TRADE }, { injury_lawyer: 35, lawyer: 28, dentist: 20, locksmith: 20, default: 15 });
  assert.ok(Object.isFrozen(CPC_CAP_ILS_BY_TRADE));
});

test('niche -> trade, most specific first', () => {
  const lawyer = legal[0];
  assert.equal(cpcCapTradeForNiche(lawyer), 'lawyer');
  assert.equal(cpcCapTradeForNiche(legal[1]), 'lawyer');
  assert.equal(cpcCapTradeForNiche(emergency[4]), 'locksmith');
  assert.equal(cpcCapTradeForNiche(medical[1]), 'dentist');
  assert.equal(cpcCapTradeForNiche(emergency[0]), 'default'); // plumber: the default 15
  assert.equal(cpcCapTradeForNiche(''), 'default');
  assert.equal(cpcCapTradeForNiche(undefined), 'default');
  assert.equal(cpcCapIlsForNiche(lawyer), 28);
  assert.equal(cpcCapMicrosForNiche(emergency[4]), 20_000_000);
  assert.equal(cpcCapMicrosForNiche('unknown trade'), 15_000_000);
});

test('the prompt table CPC column agrees with the map for the capped trades', () => {
  const prompts = fs.readFileSync(path.join(repo, 'src/lib/bot/prompts.ts'), 'utf8');
  const rows = prompts.split('\n').filter((l) => /^\| .+\|\s*[\d,]+\s*\|\s*[\d,]+\s*\|\s*\d+\s*\|$/.test(l));
  const cpcFor = (needle: string) => Number(rows.find((r) => r.split('|')[1].includes(needle))!.split('|')[4].trim());
  assert.equal(cpcFor(emergency[4]), CPC_CAP_ILS_BY_TRADE.locksmith);
  assert.equal(cpcFor(medical[1]), CPC_CAP_ILS_BY_TRADE.dentist);
});
