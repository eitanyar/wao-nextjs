/**
 * Site Bot paid-journey v2 M1 (Yonatan's served-areas rule): which localities did the owner
 * literally name in the Q2 answer (collectedData.travelBoundary)?
 *
 * - Names are matched ONLY against a supplied locality list (in production, the tracked
 *   config/market-scanner/areas.json via ./israeliLocalities). Unknown words are ignored.
 * - A radius / distance answer (any digit) never produces localities: it stays in travelBoundary.
 * - Result: deduplicated in the owner's order, the base city removed (it is always first
 *   elsewhere), at most 3 listed, the rest kept as overflow for the M2b one-tap confirm.
 * - The result feeds schema areaServed and the service-area brief fact only. It must never
 *   reach specificCities / businessTruth.servedAreas, which is what creates city pages.
 *
 * Matching is ported from scripts/market-scan/lib/stage2.mjs citiesNamedIn: he_name or any
 * he_aliases entry, not glued to a following letter, a hit inside a longer hit dropped, and the
 * areas.json he_match_guard honoured. Stricter for owner prose: at most 3 leading Hebrew prefix
 * letters (copyGates PREFIX_LETTERS) may be attached; any other leading letter means it is part
 * of a longer word.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { PREFIX_LETTERS } from '../lp/copyGates';

export const MAX_LISTED_SERVED_AREAS = 3;

export interface LocalityMatchGuard {
  prefix_letters?: string[];
  end?: string;
  end_words?: string[];
}

export interface Locality {
  slug: string;
  he_name: string;
  he_aliases?: string[];
  he_match_guard?: LocalityMatchGuard;
}

export type ServedAreaNames = NonNullable<CollectedData['servedAreaNames']>;

const nfc = (value: string) => value.normalize('NFC');
const isLetter = (ch: string | undefined) => ch !== undefined && /\p{L}/u.test(ch);
const nameKey = (value: string) => nfc(value).replace(/[^\p{L}]/gu, '');

function guardAllows(text: string, start: number, end: number, guard: LocalityMatchGuard | undefined): boolean {
  if (!guard) return true;
  if (guard.prefix_letters && !guard.prefix_letters.map(nfc).includes(text[start - 1])) return false;
  if (guard.end === 'title_end_punct_or_word') {
    let j = end;
    while (j < text.length && /\s/u.test(text[j])) j += 1;
    if (j >= text.length || /[\p{P}\p{S}]/u.test(text[j])) return true;
    return (guard.end_words ?? []).map(nfc).some(word => word && text.startsWith(word, j) && !isLetter(text[j + word.length]));
  }
  return true;
}

/** Leading run: at most 3 prefix letters, preceded by a non-letter or the start. */
function prefixAllows(text: string, start: number): boolean {
  let i = start;
  let attached = 0;
  while (i > 0 && isLetter(text[i - 1])) {
    if (!PREFIX_LETTERS.includes(text[i - 1]) || attached === 3) return false;
    attached += 1;
    i -= 1;
  }
  return true;
}

/** True when the answer states a distance/radius (any digit): such an answer never yields localities. */
export function isRadiusAnswer(answer: string): boolean {
  return /\d/.test(answer);
}

/** Localities named in the answer, in the owner's order of first mention, deduplicated by slug. */
export function localitiesNamedIn(answer: string, localities: readonly Locality[]): Locality[] {
  const text = nfc(answer);
  const hits: Array<{ locality: Locality; start: number; end: number }> = [];
  for (const locality of localities) {
    for (const name of [locality.he_name, ...(locality.he_aliases ?? [])]) {
      const needle = nfc(name).trim();
      if (!needle) continue;
      for (let i = text.indexOf(needle); i >= 0; i = text.indexOf(needle, i + 1)) {
        const end = i + needle.length;
        if (!isLetter(text[end]) && prefixAllows(text, i) && guardAllows(text, i, end, locality.he_match_guard)) hits.push({ locality, start: i, end });
      }
    }
  }
  const kept = hits.filter(hit => !hits.some(other => other !== hit && other.end - other.start > hit.end - hit.start && other.start <= hit.start && other.end >= hit.end));
  kept.sort((a, b) => a.start - b.start);
  return [...new Map(kept.map(hit => [hit.locality.slug, hit.locality])).values()];
}

/**
 * The servedAreaNames field for this answer, or undefined when nothing qualifies. The base
 * city (card city) is dropped by name key, or by locality when the base is a known locality
 * or alias. Display names are the canonical he_name from the list, never the owner's spelling
 * fragment, so schema and gates see one stable name per place.
 */
export function extractServedAreaNames(answer: string | undefined, baseCity: string | undefined, localities: readonly Locality[]): ServedAreaNames | undefined {
  const text = (answer ?? '').trim();
  if (!text || isRadiusAnswer(text)) return undefined;
  const baseKey = nameKey(baseCity ?? '');
  const baseSlug = baseKey
    ? localities.find(item => [item.he_name, ...(item.he_aliases ?? [])].some(name => nameKey(name) === baseKey))?.slug
    : undefined;
  const named = localitiesNamedIn(text, localities)
    .filter(item => item.slug !== baseSlug && nameKey(item.he_name) !== baseKey)
    .map(item => item.he_name);
  if (!named.length) return undefined;
  return {
    listed: named.slice(0, MAX_LISTED_SERVED_AREAS),
    overflow: named.slice(MAX_LISTED_SERVED_AREAS),
    source: 'travel_boundary',
    ownerConfirmed: false,
  };
}

/** Recomputes the field from travelBoundary + the base city, discarding any client-sent value. */
export function withServedAreaNames(data: CollectedData, localities: readonly Locality[]): CollectedData {
  const rest: CollectedData = { ...data };
  delete rest.servedAreaNames;
  const names = extractServedAreaNames(data.travelBoundary, data.targetLocation, localities);
  return names ? { ...rest, servedAreaNames: names } : rest;
}

/** The listed names a renderer may use (overflow is never rendered in M1). */
export function listedServedAreas(data: CollectedData): string[] {
  const listed = data.servedAreaNames?.listed;
  return Array.isArray(listed) ? listed.filter((item): item is string => typeof item === 'string' && item.trim() !== '').slice(0, MAX_LISTED_SERVED_AREAS) : [];
}
