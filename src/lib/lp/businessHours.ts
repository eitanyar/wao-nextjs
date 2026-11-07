/**
 * Business hours (M2a.1, C2 schema + B hours formatter).
 *
 * parseBusinessHours: owner hours in the Latin day-abbreviation format
 * ("Sun-Thu 08:00-18:00, Fri 08:00-13:00") -> schema.org OpeningHoursSpecification.
 * All-or-nothing: anything unparseable returns null and the schema omits the field.
 *
 * The Hebrew display formatter (day letters with geresh, en-dash ranges) is NOT built:
 * no Hebrew day-letter table exists in the codebase, and the engineer may not author one
 * ("waocopy patch needed"). Copy keeps the owner's hours raw until that patch lands;
 * formatBusinessHoursHebrew() then only needs the table.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

export const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type SchemaDay = (typeof SCHEMA_DAYS)[number];

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: SchemaDay[];
  opens: string;
  closes: string;
}

export interface ParsedHoursSegment {
  /** Indexes into SCHEMA_DAYS (0 = Sunday). */
  days: number[];
  opens: string;
  closes: string;
}

const DAY_INDEX: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};
const DASH = '[-–—]';
const TIME = '([01]?\\d|2[0-4]):([0-5]\\d)';
const SEGMENT = new RegExp(`^([A-Za-z]+(?:\\s*(?:${DASH}|/|&)\\s*[A-Za-z]+)*)\\s+${TIME}\\s*${DASH}\\s*${TIME}$`);

function pad(hours: string, minutes: string): string {
  return `${hours.padStart(2, '0')}:${minutes}`;
}

function dayList(text: string): number[] | null {
  const out: number[] = [];
  for (const part of text.split(/\s*[/&]\s*/)) {
    const range = part.split(new RegExp(`\\s*${DASH}\\s*`));
    if (range.length > 2) return null;
    const from = DAY_INDEX[range[0].toLowerCase()];
    const to = DAY_INDEX[(range[1] ?? range[0]).toLowerCase()];
    if (from === undefined || to === undefined) return null;
    for (let day = from; ; day = (day + 1) % 7) {
      if (!out.includes(day)) out.push(day);
      if (day === to) break;
    }
  }
  return out;
}

export function parseBusinessHoursSegments(text: string | undefined): ParsedHoursSegment[] | null {
  const value = (text ?? '').trim();
  if (!value) return null;
  const segments: ParsedHoursSegment[] = [];
  for (const raw of value.split(/\s*[,;]\s*/).filter(Boolean)) {
    const match = SEGMENT.exec(raw.trim());
    if (!match) return null;
    const days = dayList(match[1]);
    if (!days) return null;
    segments.push({ days, opens: pad(match[2], match[3]), closes: pad(match[4], match[5]) });
  }
  return segments.length ? segments : null;
}

export function parseBusinessHours(text: string | undefined): OpeningHoursSpecification[] | null {
  const segments = parseBusinessHoursSegments(text);
  return segments
    ? segments.map(segment => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: segment.days.map(day => SCHEMA_DAYS[day]), opens: segment.opens, closes: segment.closes }))
    : null;
}

/**
 * Hebrew display string, given the day-letter table (index 0 = Sunday) from a waocopy patch.
 * Without the table (today) returns null and callers keep the owner's raw hours.
 */
export function formatBusinessHoursHebrew(text: string | undefined, dayLetters: readonly string[] | null): string | null {
  if (!dayLetters || dayLetters.length !== 7) return null;
  const segments = parseBusinessHoursSegments(text);
  if (!segments) return null;
  const contiguous = (days: number[]) => days.every((day, index) => index === 0 || day === (days[index - 1] + 1) % 7);
  if (!segments.every(segment => contiguous(segment.days))) return null;
  return segments.map(segment => {
    const first = dayLetters[segment.days[0]];
    const last = dayLetters[segment.days[segment.days.length - 1]];
    const days = segment.days.length > 1 ? `${first}–${last}` : first;
    return `${days} ${segment.opens}–${segment.closes}`;
  }).join(', ');
}
