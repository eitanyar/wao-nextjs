// Parses the profession universe (spec section 1) and the areas table (section 2) out of
// docs/research/site-bot/market-scanner-scoring-spec.md. Every Hebrew string in the generated
// config is sliced byte-for-byte out of the spec; this file contains no Hebrew literals.
import { createHash } from 'node:crypto';

export const SPEC_PATH = 'docs/research/site-bot/market-scanner-scoring-spec.md';
const DAGGER = '\u2020';

function cells(line) {
  return line.split('|').slice(1, -1).map(cell => cell.trim());
}

export function specSha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

// Rows look like: | 7 | roofing | <trade> | `t1` . `t2` *P* . `t3` | pack | **2** | note |
export function parseProfessions(text) {
  const rows = text.split('\n').filter(line => /^\| \d+ \| [a-z-]+ \|/.test(line));
  const professions = rows.map(line => {
    const [num, slug, trade, termsCell, source, kitCell] = cells(line);
    const terms = [];
    const re = /`([^`]+)`(\s*\*P\*)?/g;
    let match;
    while ((match = re.exec(termsCell))) terms.push({ term: match[1], proposed: Boolean(match[2]) });
    const kit = Number(kitCell.replace(/\*/g, ''));
    if (!terms.length || terms.length > 4) throw new Error(`profession ${slug}: expected 1-4 terms, got ${terms.length}`);
    if (![0, 1, 2].includes(kit)) throw new Error(`profession ${slug}: bad kit level ${kitCell}`);
    return { order: Number(num), slug, trade_he: trade, source, kit_level: kit, terms };
  });
  if (professions.length !== 17) throw new Error(`expected 17 professions, parsed ${professions.length}`);
  const slugs = new Set(professions.map(p => p.slug));
  if (slugs.size !== professions.length) throw new Error('duplicate profession slug');
  return professions;
}

// Rows look like: | R1 Gush Dan | core, core | ring2, ring2 |
export function parseRegions(text) {
  const rows = text.split('\n').filter(line => /^\| R\d+ /.test(line));
  const regions = rows.map(line => {
    const [regionCell, coreCell, ringCell] = cells(line);
    const [, id, name] = regionCell.match(/^(R\d+) (.+)$/);
    const split = cell => cell.split(', ').map(raw => ({ he_name: raw.replace(DAGGER, ''), daggered: raw.includes(DAGGER) }));
    return { id, name, core: split(coreCell), ring2: split(ringCell) };
  });
  const cityCount = regions.reduce((n, r) => n + r.core.length + r.ring2.length, 0);
  if (regions.length !== 10) throw new Error(`expected 10 regions, parsed ${regions.length}`);
  if (cityCount !== 71) throw new Error(`expected 71 cities, parsed ${cityCount}`);
  return regions;
}

// A Nominatim hit that is the settlement itself (not a street, station or land-use polygon).
export function isSettlementHit(hit) {
  return (hit.category === 'place' && ['city', 'town', 'village'].includes(hit.type))
    || (hit.category === 'boundary' && hit.type === 'administrative' && ['city', 'town', 'village'].includes(hit.addresstype));
}

// Letter-only, duplicate-collapsed key so spelling variants (double yod, hyphen vs space,
// spaced maqaf) of the same locality name compare equal. No Hebrew literals needed.
export function nameKey(name) {
  const letters = [...name.normalize('NFC')].filter(ch => /\p{L}/u.test(ch));
  return letters.filter((ch, i) => ch !== letters[i - 1]).join('');
}
