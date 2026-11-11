/**
 * Pricing default (Eitan 2026-11-10, docs/missions/site-bot-content-depth-2026-11-10.md "Pricing input"): every research
 * site gets one pricing promise line in the hero, built only from the promises the owner checked. When the owner gave
 * numbers (a call-out fee, "starting from" prices for 1-3 common jobs), service pages also get a small price table plus one
 * cost FAQ, at the B2 position (never a second price block). The generator never guesses a price: nothing here reaches
 * the model, and nothing renders without owner data.
 *
 * HEBREW-SAFETY: the only Hebrew in this module is RESEARCHED_PRICING_LABELS, loaded byte-exact by script from the
 * Noa-approved docs/copy/site-bot-pricing-labels-2026-11-10.json (2026-11-10); the engineer never authors it. While any
 * label is a `__HE_TODO_<key>__` placeholder, RESEARCHED_PRICING_LABELS_PENDING_COPY must be true and the pricing UI renders
 * NOTHING (so a placeholder can never ship). This flag is separate from RESEARCHED_SITE_LABELS_PENDING_COPY.
 *
 * Noa's rendering rules (the JSON's `_rules`, applied below):
 * - {city} must be Hebrew (the template glues the prefix letter to it): a city with a Latin letter or a digit gets no cost FAQ.
 * - {service} must have a singular head noun. The renderer cannot parse Hebrew number, so the cost FAQ renders only when
 *   the owner's job text equals (after whitespace/NFC normalisation) a service name the owner gave (primaryService,
 *   priorityServices, secondaryServices), and the slot is filled with that owner text. LIMITATION: this proves the text is
 *   the owner's own service name, not that it is singular; an owner who typed a plural service name still gets it verbatim.
 * - No space between the maqaf prefix and the amount <bdi> (the templates carry none; the renderer adds none).
 * - Cells under priceTableFromColumn carry no prefix (the header already says "starting price").
 * - {policy}: trailing punctuation is stripped (the template ends its own sentence).
 * - At most one of the two "price confirmed" chips per site: price_before_work wins over price_by_phone_before_leaving.
 */
import type { CollectedData, PricingPromiseId, StartingPrice } from '../bot/prompts';
import { HE_TODO_PREFIX } from './researchedSiteLabels';

/** The fixed promise set the owner picks from (multi-select), in display order. */
export const PRICING_PROMISE_IDS: readonly PricingPromiseId[] = [
  'free_quote',
  'price_before_work',
  'price_by_phone_before_leaving',
  'no_callout_fee',
  'no_hidden_costs',
];

/** At most this many "starting from" rows (owner input: 1-3 common jobs). */
export const MAX_STARTING_PRICES = 3;
/** Owner text caps (job name, surcharge policy), in characters; longer input is dropped, never cut. */
export const PRICING_JOB_MAX_CHARS = 60;
export const PRICING_SURCHARGE_MAX_CHARS = 120;
/** Largest amount (NIS) accepted from the owner; anything else is treated as not given. */
export const PRICING_MAX_AMOUNT = 100_000;

/**
 * Fixed pricing labels (Tamar -> Noa). Templates carry slots the renderer fills; the patched Hebrew must keep them:
 * costFaqQuestion {service} {city}; costFaqAnswerFrom {business} {service} {city} {amount}; costFaqAnswerCallout {amount};
 * costFaqAnswerSurcharge {policy}.
 */
export const RESEARCHED_PRICING_LABELS: Readonly<{
  /** Promise phrase: free quote. */
  promiseFreeQuote: string;
  /** Promise phrase: the price is confirmed before the work starts. */
  promisePriceBeforeWork: string;
  /** Promise phrase: the price is confirmed by phone before I leave (set out to the job). */
  promisePriceByPhoneBeforeLeaving: string;
  /** Promise phrase: no call-out fee. */
  promiseNoCalloutFee: string;
  /** Promise phrase: no hidden costs. */
  promiseNoHiddenCosts: string;
  /** Accessible name of the hero promise line (e.g. "Pricing"). */
  promiseLineLabel: string;
  /** H2 of the service-page price table section. */
  priceTableHeading: string;
  /** Table column header: the job. */
  priceTableJobColumn: string;
  /** Table column header: the price ("starting from"). */
  priceTableFromColumn: string;
  /** "From" prefix. Not rendered in table cells (Noa: cells under priceTableFromColumn carry no prefix); kept for future non-table use. */
  priceFromPrefix: string;
  /** Table row label: the call-out fee. */
  calloutFeeRow: string;
  /** Table row label: the surcharge policy (night / Shabbat); the value is the owner's own words. */
  surchargeRow: string;
  /** Cost FAQ question template: "How much does {service} cost in {city}?". */
  costFaqQuestion: string;
  /** Cost FAQ answer, first sentence (answers directly): "At {business}, {service} in {city} starts from {amount}.". */
  costFaqAnswerFrom: string;
  /** Cost FAQ answer sentence when a call-out fee is given: "The call-out fee is {amount}.". */
  costFaqAnswerCallout: string;
  /** Cost FAQ answer sentence when a surcharge policy is given: "Surcharge: {policy}.". */
  costFaqAnswerSurcharge: string;
}> = {
  promiseFreeQuote: 'הצעת מחיר חינם',
  promisePriceBeforeWork: 'מחיר סגור לפני תחילת העבודה',
  promisePriceByPhoneBeforeLeaving: 'מחיר סגור בטלפון לפני ההגעה',
  promiseNoCalloutFee: 'בלי דמי הגעה',
  promiseNoHiddenCosts: 'בלי עלויות נסתרות',
  promiseLineLabel: 'מחירים',
  priceTableHeading: 'כמה זה עולה',
  priceTableJobColumn: 'עבודה',
  priceTableFromColumn: 'מחיר התחלתי',
  priceFromPrefix: 'החל מ־',
  calloutFeeRow: 'דמי הגעה',
  surchargeRow: 'תוספת לילה / שבת',
  costFaqQuestion: 'כמה עולה {service} ב{city}?',
  costFaqAnswerFrom: 'אצל {business}, המחיר ל{service} ב{city} מתחיל מ־{amount}.',
  costFaqAnswerCallout: 'דמי ההגעה: {amount}.',
  costFaqAnswerSurcharge: 'תוספת: {policy}.',
};

/** True while any pricing label is a placeholder: the pricing UI then renders nothing. Flip when the patch lands. */
export const RESEARCHED_PRICING_LABELS_PENDING_COPY = false;

/** The slots each template must keep (checked by test once the labels are patched). */
export const PRICING_TEMPLATE_SLOTS: Readonly<Record<string, readonly string[]>> = {
  costFaqQuestion: ['{service}', '{city}'],
  costFaqAnswerFrom: ['{business}', '{service}', '{city}', '{amount}'],
  costFaqAnswerCallout: ['{amount}'],
  costFaqAnswerSurcharge: ['{policy}'],
};

const PROMISE_LABEL_KEYS: Readonly<Record<PricingPromiseId, keyof typeof RESEARCHED_PRICING_LABELS>> = {
  free_quote: 'promiseFreeQuote',
  price_before_work: 'promisePriceBeforeWork',
  price_by_phone_before_leaving: 'promisePriceByPhoneBeforeLeaving',
  no_callout_fee: 'promiseNoCalloutFee',
  no_hidden_costs: 'promiseNoHiddenCosts',
};

/** The owner's pricing input, validated: unknown promises, bad amounts and over-long text are dropped (never cut or guessed). */
export interface OwnerPricing {
  promises: PricingPromiseId[];
  calloutFee: number | null;
  startingPrices: StartingPrice[];
  surchargePolicy: string | null;
}

function amount(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d+(?:\.\d+)?\s*$/.test(value) ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 && number <= PRICING_MAX_AMOUNT ? Math.round(number) : null;
}

function ownerText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text && text.length <= max ? text : null;
}

/** Surcharge policy in the owner's words, trailing punctuation stripped (Noa: the template closes the sentence). */
function policyText(value: unknown): string | null {
  const text = ownerText(value, PRICING_SURCHARGE_MAX_CHARS);
  if (!text) return null;
  // Sentence punctuation only: a trailing % or ) is part of the owner's fact ("+50%") and stays.
  const stripped = text.replace(/[\s.,;:!?\u2026]+$/u, '');
  return stripped || null;
}

export function ownerPricing(data: CollectedData): OwnerPricing {
  const picked = new Set(Array.isArray(data.pricingPromises) ? data.pricingPromises : []);
  const calloutFee = amount(data.calloutFee);
  // A stated call-out fee contradicts "no call-out fee": the number is the concrete fact, so the promise is dropped.
  // Noa: at most one "price confirmed" chip per site; "before the work starts" wins over "by phone before leaving".
  const promises = PRICING_PROMISE_IDS.filter(id => picked.has(id)
    && !(id === 'no_callout_fee' && calloutFee !== null)
    && !(id === 'price_by_phone_before_leaving' && picked.has('price_before_work')));
  const startingPrices = (Array.isArray(data.startingPrices) ? data.startingPrices : []).flatMap(entry => {
    const job = ownerText(entry?.job, PRICING_JOB_MAX_CHARS);
    const from = amount(entry?.from);
    return job && from !== null ? [{ job, from }] : [];
  }).slice(0, MAX_STARTING_PRICES);
  return { promises, calloutFee, startingPrices, surchargePolicy: policyText(data.surchargePolicy) };
}

/** True when the owner gave at least one number (the price table and cost FAQ need one). */
export function hasPriceNumbers(pricing: OwnerPricing): boolean {
  return pricing.calloutFee !== null || pricing.startingPrices.length > 0;
}

/** Amount display: digits with thousands separators, then the shekel sign (no Hebrew; Maya owns the final typography). */
export function formatShekels(value: number): string {
  return `${String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ₪`;
}

/** The hero promise phrases (labels of the checked promises, in the fixed order); empty while the labels are pending. */
export function pricingPromisePhrases(data: CollectedData, labels = RESEARCHED_PRICING_LABELS, pending = RESEARCHED_PRICING_LABELS_PENDING_COPY): string[] {
  if (pending) return [];
  return ownerPricing(data).promises.map(id => labels[PROMISE_LABEL_KEYS[id]]).filter(item => item.trim() && !item.includes(HE_TODO_PREFIX));
}

function fill(template: string, slots: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in slots ? slots[key] : match));
}

/** HTML fill: template text and slot values escaped; the {amount} slot is an isolated `<bdi>` glued to the text before it. */
function fillHtml(template: string, slots: Record<string, string>, escape: (value: string) => string): string {
  return template.split(/(\{\w+\})/).map(part => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    if (key === undefined || !(key in slots)) return escape(part);
    return key === 'amount' ? `<bdi>${escape(slots[key])}</bdi>` : escape(slots[key]);
  }).join('');
}

/**
 * Rerun-3b item D (Noa): the call-out fee and the surcharge are never starting prices, so they never sit in the
 * priceTableFromColumn table. Outside the table they are the cost FAQ's own approved sentences (costFaqAnswerCallout,
 * costFaqAnswerSurcharge), as escaped HTML with each amount an isolated <bdi>. Empty without either.
 */
export function pricingNoteSentencesHtml(pricing: OwnerPricing, labels = RESEARCHED_PRICING_LABELS, escape: (value: string) => string = value => value): string[] {
  return [
    ...(pricing.calloutFee !== null ? [fillHtml(labels.costFaqAnswerCallout, { amount: formatShekels(pricing.calloutFee) }, escape)] : []),
    ...(pricing.surchargePolicy ? [fillHtml(labels.costFaqAnswerSurcharge, { policy: pricing.surchargePolicy }, escape)] : []),
  ];
}

const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
const HEBREW_LETTER = /[\u05D0-\u05EA]/;

/** Noa: {city} is glued to a Hebrew prefix letter, so it must be Hebrew (a Hebrew letter, no Latin letter, no digit). */
export function costFaqCityOk(city: string | null | undefined): city is string {
  const place = (city ?? '').trim();
  return Boolean(place) && HEBREW_LETTER.test(place) && !LATIN_OR_DIGIT.test(place);
}

/** The service names the owner gave (primaryService, priorityServices, comma-separated secondaryServices), normalised. */
export function ownerServiceNames(data: CollectedData): Set<string> {
  const names = [
    data.primaryService,
    ...(Array.isArray(data.priorityServices) ? data.priorityServices : []),
    ...(typeof data.secondaryServices === 'string' ? data.secondaryServices.split(/[,\n]/) : []),
  ];
  return new Set(names.filter((name): name is string => typeof name === 'string').map(norm).filter(Boolean));
}

const norm = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

/** The starting price of this page's service: the owner job equal to, containing or contained in the service name. */
export function startingPriceFor(pricing: OwnerPricing, service: string): StartingPrice | null {
  const name = norm(service);
  if (!name) return null;
  return pricing.startingPrices.find(item => norm(item.job) === name)
    ?? pricing.startingPrices.find(item => norm(item.job).includes(name) || name.includes(norm(item.job)))
    ?? null;
}

/**
 * The one cost FAQ of a service page: "how much does <service> cost in <city>", answered in its first sentence from the
 * owner's starting price for this service. Null without a matching price, a service name or a city (never a guessed
 * number), or while the labels are pending. Noa's rules: the city must be Hebrew (costFaqCityOk), and the matched job
 * text must equal a service name the owner gave (ownerServiceNames); {service} is filled with that owner text.
 * `a` is plain text; `aHtml` is the same answer escaped with `escape`, each amount an isolated `<bdi>` with no space
 * after the prefix.
 */
export function costFaq(
  data: CollectedData,
  page: { service: string; city: string | null; business: string },
  labels = RESEARCHED_PRICING_LABELS,
  pending = RESEARCHED_PRICING_LABELS_PENDING_COPY,
  escape: (value: string) => string = value => value,
): { q: string; a: string; aHtml: string } | null {
  if (pending || !costFaqCityOk(page.city) || !page.service.trim()) return null;
  const pricing = ownerPricing(data);
  const price = startingPriceFor(pricing, page.service);
  if (!price || !ownerServiceNames(data).has(norm(price.job))) return null;
  const slots = { service: price.job, city: page.city.trim(), business: page.business };
  const parts: Array<[string, Record<string, string>]> = [[labels.costFaqAnswerFrom, { ...slots, amount: formatShekels(price.from) }]];
  if (pricing.calloutFee !== null) parts.push([labels.costFaqAnswerCallout, { amount: formatShekels(pricing.calloutFee) }]);
  if (pricing.surchargePolicy) parts.push([labels.costFaqAnswerSurcharge, { policy: pricing.surchargePolicy }]);
  return {
    q: fill(labels.costFaqQuestion, slots),
    a: parts.map(([template, values]) => fill(template, values)).join(' '),
    aHtml: parts.map(([template, values]) => fillHtml(template, values, escape)).join(' '),
  };
}
