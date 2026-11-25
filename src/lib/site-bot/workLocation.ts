/**
 * Site Bot step 2a: the work-location question (Yonatan's 2026-11-25 sign-off on the launch allow-list). Three launch
 * trades can be storefront or online businesses as well as field work, so the interview asks where the work happens:
 *
 *   tutor         (gcid:tutoring_service)                 HOME / OWN_PLACE / ONLINE / MIX
 *   photographer  (gcid:photographer)                     HOME / OWN_PLACE / MIX
 *   solar         (gcid:solar_energy_equipment_supplier)  HOME / OWN_PLACE / MIX
 *
 * OWN_PLACE and ONLINE exit the interview to the waiting list (reason 'location'); HOME and MIX continue. The answer is
 * kept on the interview session (workLocation) so step 2c can frame a photographer's site as studio vs on-location.
 * Every other trade skips the question.
 *
 * Pure and browser-safe (the start page renders the options from it; the server validates against it).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. The question and option labels are SITE_BOT_STEP2A_COPY keys.
 */

export type WorkLocationTrade = 'tutor' | 'photographer' | 'solar';
export type WorkLocation = 'HOME' | 'OWN_PLACE' | 'ONLINE' | 'MIX';

export const WORK_LOCATION_TRADES: readonly WorkLocationTrade[] = ['tutor', 'photographer', 'solar'];

/** The launch category of each trade that is asked the question. */
export const WORK_LOCATION_TRADE_CATEGORY: Readonly<Record<WorkLocationTrade, string>> = {
  tutor: 'gcid:tutoring_service',
  photographer: 'gcid:photographer',
  solar: 'gcid:solar_energy_equipment_supplier',
};

/** The options each trade sees, in display order. ONLINE is shown to tutors only. */
export const WORK_LOCATION_OPTIONS: Readonly<Record<WorkLocationTrade, readonly WorkLocation[]>> = {
  tutor: ['HOME', 'OWN_PLACE', 'ONLINE', 'MIX'],
  photographer: ['HOME', 'OWN_PLACE', 'MIX'],
  solar: ['HOME', 'OWN_PLACE', 'MIX'],
};

/** Answers that end the interview (a storefront / studio-only or online-only business). */
export const WORK_LOCATION_EXITS: ReadonlySet<WorkLocation> = new Set<WorkLocation>(['OWN_PLACE', 'ONLINE']);

/** The step-2a copy key of each trade's question and of each option. */
export const WORK_LOCATION_QUESTION_KEY = {
  tutor: 'LOCATION_Q_TUTOR',
  photographer: 'LOCATION_Q_PHOTOGRAPHER',
  solar: 'LOCATION_Q_SOLAR',
} as const satisfies Record<WorkLocationTrade, string>;

export const WORK_LOCATION_OPTION_KEY = {
  HOME: 'LOCATION_OPT_HOME',
  OWN_PLACE: 'LOCATION_OPT_OWN_PLACE',
  ONLINE: 'LOCATION_OPT_ONLINE',
  MIX: 'LOCATION_OPT_MIX',
} as const satisfies Record<WorkLocation, string>;

export function isWorkLocationTrade(value: unknown): value is WorkLocationTrade {
  return typeof value === 'string' && (WORK_LOCATION_TRADES as readonly string[]).includes(value);
}

/** True when `value` is one of the options `trade` is shown (ONLINE from a photographer is not an answer). */
export function isWorkLocationAnswer(trade: WorkLocationTrade, value: unknown): value is WorkLocation {
  return typeof value === 'string' && (WORK_LOCATION_OPTIONS[trade] as readonly string[]).includes(value);
}

export function workLocationExits(value: WorkLocation): boolean {
  return WORK_LOCATION_EXITS.has(value);
}

/** The asked trade of a launch category id, or null (the question is skipped). */
export function workLocationTradeOfCategory(categoryId: string | null | undefined): WorkLocationTrade | null {
  for (const trade of WORK_LOCATION_TRADES) if (WORK_LOCATION_TRADE_CATEGORY[trade] === categoryId) return trade;
  return null;
}
