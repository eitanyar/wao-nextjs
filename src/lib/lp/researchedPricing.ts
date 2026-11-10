/**
 * Pricing default (Eitan 2026-11-10, docs/missions/site-bot-content-depth-2026-11-10.md "Pricing input"): every research
 * site gets one pricing promise line in the hero, built only from the promises the owner checked. When the owner gave
 * numbers (a call-out fee, "starting from" prices for 1-3 common jobs), service pages also get a small price table plus one
 * cost FAQ, at the B2 position (never a second price block). The generator never guesses a price: nothing here reaches
 * the model, and nothing renders without owner data.
 *
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Every fixed label below is a `__HE_TODO_<key>__` placeholder until
 * the waocopy (Tamar) -> Noa patch lands byte-exact. While any placeholder remains, RESEARCHED_PRICING_LABELS_PENDING_COPY
 * is true and the pricing UI renders NOTHING (so a placeholder can never ship). This flag is separate from
 * RESEARCHED_SITE_LABELS_PENDING_COPY (researchedSiteLabels.ts), which stays as it is.
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
  /** Prefix before a starting price in the table ("from"). */
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
  promiseFreeQuote: '__HE_TODO_promiseFreeQuote__',
  promisePriceBeforeWork: '__HE_TODO_promisePriceBeforeWork__',
  promisePriceByPhoneBeforeLeaving: '__HE_TODO_promisePriceByPhoneBeforeLeaving__',
  promiseNoCalloutFee: '__HE_TODO_promiseNoCalloutFee__',
  promiseNoHiddenCosts: '__HE_TODO_promiseNoHiddenCosts__',
  promiseLineLabel: '__HE_TODO_promiseLineLabel__',
  priceTableHeading: '__HE_TODO_priceTableHeading__',
  priceTableJobColumn: '__HE_TODO_priceTableJobColumn__',
  priceTableFromColumn: '__HE_TODO_priceTableFromColumn__',
  priceFromPrefix: '__HE_TODO_priceFromPrefix__',
  calloutFeeRow: '__HE_TODO_calloutFeeRow__',
  surchargeRow: '__HE_TODO_surchargeRow__',
  costFaqQuestion: '__HE_TODO_costFaqQuestion__',
  costFaqAnswerFrom: '__HE_TODO_costFaqAnswerFrom__',
  costFaqAnswerCallout: '__HE_TODO_costFaqAnswerCallout__',
  costFaqAnswerSurcharge: '__HE_TODO_costFaqAnswerSurcharge__',
};

/** True while any pricing label is a placeholder: the pricing UI then renders nothing. Flip when the patch lands. */
export const RESEARCHED_PRICING_LABELS_PENDING_COPY = true;

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

export function ownerPricing(data: CollectedData): OwnerPricing {
  const picked = new Set(Array.isArray(data.pricingPromises) ? data.pricingPromises : []);
  const calloutFee = amount(data.calloutFee);
  // A stated call-out fee contradicts "no call-out fee": the number is the concrete fact, so the promise is dropped.
  const promises = PRICING_PROMISE_IDS.filter(id => picked.has(id) && !(id === 'no_callout_fee' && calloutFee !== null));
  const startingPrices = (Array.isArray(data.startingPrices) ? data.startingPrices : []).flatMap(entry => {
    const job = ownerText(entry?.job, PRICING_JOB_MAX_CHARS);
    const from = amount(entry?.from);
    return job && from !== null ? [{ job, from }] : [];
  }).slice(0, MAX_STARTING_PRICES);
  return { promises, calloutFee, startingPrices, surchargePolicy: ownerText(data.surchargePolicy, PRICING_SURCHARGE_MAX_CHARS) };
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
 * number), or while the labels are pending.
 */
export function costFaq(
  data: CollectedData,
  page: { service: string; city: string | null; business: string },
  labels = RESEARCHED_PRICING_LABELS,
  pending = RESEARCHED_PRICING_LABELS_PENDING_COPY,
): { q: string; a: string } | null {
  if (pending || !page.city || !page.service.trim()) return null;
  const pricing = ownerPricing(data);
  const price = startingPriceFor(pricing, page.service);
  if (!price) return null;
  const slots = { service: page.service, city: page.city, business: page.business };
  const sentences = [fill(labels.costFaqAnswerFrom, { ...slots, amount: formatShekels(price.from) })];
  if (pricing.calloutFee !== null) sentences.push(fill(labels.costFaqAnswerCallout, { amount: formatShekels(pricing.calloutFee) }));
  if (pricing.surchargePolicy) sentences.push(fill(labels.costFaqAnswerSurcharge, { policy: pricing.surchargePolicy }));
  return { q: fill(labels.costFaqQuestion, slots), a: sentences.join(' ') };
}
