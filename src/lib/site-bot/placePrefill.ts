/**
 * Site Bot paid-journey v2 M1 (B11): the pre-fill snapshot returned by
 * /api/site-bot/prefill, the Place Details (New) -> snapshot mapper, the opening-hours
 * converter and the fixture snapshot used by tests and the verifier.
 *
 * Pure and browser-safe (no fs, no env, no network). The snapshot is NEVER persisted:
 * the audit store keeps its minimal candidate shape (Places terms forbid caching content).
 * Places content is never republished on client sites: no rating, review count or review
 * text is read here. Reviews arrive from the owner's own GBP via manager access (M4).
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

const MAX_TEXT = 200;

/**
 * Place Details (New) field mask: no `places.` prefix on the details endpoint.
 * SKU: Place Details Enterprise (verified 2026-11-09 against the Places data-fields table).
 * Enterprise is the floor because nationalPhoneNumber/internationalPhoneNumber,
 * regularOpeningHours and websiteUri are Enterprise fields; displayName/primaryType/
 * primaryTypeDisplayName are Pro; id/formattedAddress/addressComponents/types are Essentials.
 * Never add `reviews` (Enterprise + Atmosphere) or rating/userRatingCount: Places content
 * must not be stored or republished on client sites.
 */
export const PREFILL_DETAILS_FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'addressComponents', 'nationalPhoneNumber', 'internationalPhoneNumber',
  'primaryType', 'primaryTypeDisplayName', 'types', 'regularOpeningHours', 'websiteUri',
].join(',');

export interface PrefillTimePoint { day: number; hour: number; minute: number }
export interface PrefillPeriod { open: PrefillTimePoint; close?: PrefillTimePoint }

export interface PrefillSnapshot {
  placeId: string;
  displayName: string;
  formattedAddress: string;
  city?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  primaryType?: string;
  primaryTypeDisplayName?: string;
  types: string[];
  regularOpeningHours?: { periods: PrefillPeriod[] };
  websiteUri?: string;
}

type Loose = Record<string, unknown>;

function obj(value: unknown): Loose | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Loose : undefined;
}

function str(value: unknown, max = MAX_TEXT): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function localized(value: unknown, max = MAX_TEXT): string | undefined {
  return str(obj(value)?.text, max);
}

function int(value: unknown, min: number, max: number): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max ? value : undefined;
}

function point(value: unknown): PrefillTimePoint | undefined {
  const raw = obj(value);
  if (!raw) return undefined;
  const day = int(raw.day, 0, 6);
  const hour = int(raw.hour ?? 0, 0, 24);
  const minute = int(raw.minute ?? 0, 0, 59);
  return day === undefined || hour === undefined || minute === undefined ? undefined : { day, hour, minute };
}

function websiteUri(value: unknown): string | undefined {
  const raw = str(value, 500);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Raw Place Details (New) JSON -> bounded snapshot. Throws when the id does not match the request. */
export function mapPlaceDetailsToSnapshot(raw: unknown, expectedPlaceId: string): PrefillSnapshot {
  const place = obj(raw);
  if (!place || place.id !== expectedPlaceId) throw new Error('Place details id mismatch');
  const components = Array.isArray(place.addressComponents) ? place.addressComponents.map(obj) : [];
  const locality = components.find(item => Array.isArray(item?.types) && (item.types as unknown[]).includes('locality'));
  const hours = obj(place.regularOpeningHours);
  const periods = Array.isArray(hours?.periods)
    ? hours.periods.map(obj).flatMap(item => {
      const open = point(item?.open);
      if (!open) return [];
      const close = point(item?.close);
      return [close ? { open, close } : { open }];
    })
    : [];
  const snapshot: PrefillSnapshot = {
    placeId: expectedPlaceId,
    displayName: localized(place.displayName) ?? '',
    formattedAddress: str(place.formattedAddress) ?? '',
    types: Array.isArray(place.types) ? place.types.filter((item): item is string => typeof item === 'string').slice(0, 20) : [],
  };
  const city = str(locality?.longText);
  if (city) snapshot.city = city;
  const national = str(place.nationalPhoneNumber, 40);
  if (national) snapshot.nationalPhoneNumber = national;
  const international = str(place.internationalPhoneNumber, 40);
  if (international) snapshot.internationalPhoneNumber = international;
  const primaryType = str(place.primaryType, 80);
  if (primaryType) snapshot.primaryType = primaryType;
  const primaryTypeDisplayName = localized(place.primaryTypeDisplayName, 80);
  if (primaryTypeDisplayName) snapshot.primaryTypeDisplayName = primaryTypeDisplayName;
  if (periods.length) snapshot.regularOpeningHours = { periods };
  const website = websiteUri(place.websiteUri);
  if (website) snapshot.websiteUri = website;
  return snapshot;
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * GBP regular opening periods (day 0 = Sunday) -> the owner-hours format that
 * src/lib/lp/businessHours.ts parses ("Sun-Thu 08:00-18:00, Fri 08:00-13:00").
 * All-or-nothing: an overnight period past midnight, or anything malformed, returns
 * undefined so the site shows no hours rather than wrong hours. A single open period
 * with no close is Google's "open 24/7".
 */
export function periodsToBusinessHours(periods: PrefillPeriod[] | undefined): string | undefined {
  if (!periods?.length) return undefined;
  if (periods.length === 1 && !periods[0].close && periods[0].open.day === 0 && periods[0].open.hour === 0 && periods[0].open.minute === 0) {
    return 'Sun-Sat 00:00-24:00';
  }
  const byDay: string[][] = Array.from({ length: 7 }, () => []);
  for (const period of periods) {
    const { open, close } = period;
    if (!close) return undefined;
    let end: string;
    if (close.day === open.day) {
      if (close.hour * 60 + close.minute <= open.hour * 60 + open.minute) return undefined;
      end = hhmm(close.hour, close.minute);
    } else if (close.day === (open.day + 1) % 7 && close.hour === 0 && close.minute === 0) {
      end = '24:00';
    } else {
      return undefined;
    }
    byDay[open.day].push(`${hhmm(open.hour, open.minute)}-${end}`);
  }
  const keys = byDay.map(intervals => intervals.sort().join(','));
  const segments: string[] = [];
  let day = 0;
  while (day < 7) {
    if (!keys[day]) { day++; continue; }
    let last = day;
    while (last + 1 < 7 && keys[last + 1] === keys[day]) last++;
    const days = last > day ? `${DAY_ABBR[day]}-${DAY_ABBR[last]}` : DAY_ABBR[day];
    for (const interval of byDay[day]) segments.push(`${days} ${interval}`);
    day = last + 1;
  }
  return segments.length ? segments.join(', ') : undefined;
}

/**
 * Deterministic zero-network snapshot (SITE_BOT_PREFILL_PROVIDER=fixture, off production).
 * Name and address come from the audit candidate; everything else is synthetic ASCII.
 * A candidate whose placeId starts with "fixture-fail" simulates a Places failure.
 */
export function buildFixtureSnapshot(candidate: { placeId: string; displayName: string; formattedAddress: string }): PrefillSnapshot {
  if (candidate.placeId.startsWith('fixture-fail')) throw new Error('Fixture Places failure');
  return {
    placeId: candidate.placeId,
    displayName: candidate.displayName,
    formattedAddress: candidate.formattedAddress,
    city: 'Fixture City',
    nationalPhoneNumber: '03-555-0123',
    internationalPhoneNumber: '+972 3-555-0123',
    primaryType: 'plumber',
    primaryTypeDisplayName: 'Plumber',
    types: ['plumber', 'point_of_interest', 'establishment'],
    regularOpeningHours: {
      periods: [0, 1, 2, 3, 4].map(day => ({ open: { day, hour: 8, minute: 0 }, close: { day, hour: 18, minute: 0 } }))
        .concat([{ open: { day: 5, hour: 8, minute: 0 }, close: { day: 5, hour: 13, minute: 0 } }]),
    },
    websiteUri: 'https://www.fixture-plumbing.example/',
  };
}
