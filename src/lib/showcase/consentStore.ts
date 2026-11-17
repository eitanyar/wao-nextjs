/**
 * Showcase consent: may WAO show this client's work (site / landing page) as an example of its work?
 * Approved 2026-11-17 (terms Site Bot / Ads Bot section 10 "showcase" sub-clause; docs/legal/showcase-consent-legal-FINAL-2026-11-17.json).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Storage: one append-only JSONL file per account under the showcaseConsent data root (data/showcase-consent/,
 * WAO_SHOWCASE_CONSENT_DIR to override; never data/clients). Each line is one grant or withdraw event; nothing is ever
 * rewritten or deleted (terms sub-clause 7: the consent record is kept up to 7 years as proof). The current state is the
 * last event. `accountId` is the billing subscription id.
 *
 * Readers (the later showcase registry / health check / strip) call getShowcaseConsent(accountId) and show a client
 * only while `granted` is true. `id` is stable per account and is what a showcase entry stores as consent.reference;
 * `grantEventId` points at the exact grant event (with its text version + digest) that the current consent rests on.
 */
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { dataRoot } from '../dataRoots';
import { SHOWCASE_CONSENT_COPY } from './consentCopy.generated';

export const SHOWCASE_PRODUCTS = ['site-bot', 'ads-bot'] as const;
export type ShowcaseProduct = (typeof SHOWCASE_PRODUCTS)[number];
/** Where the owner gave / withdrew it. A cancellation withdraws with source 'cancellation'. */
export type ShowcaseConsentSource = 'checkout' | 'account' | 'cancellation';
export type ShowcaseWithdrawReason = 'owner_toggle' | 'cancelled';

export interface ShowcaseConsentEvent {
  eventId: string;
  accountId: string;
  product: ShowcaseProduct;
  granted: boolean;
  /** The approved text set, e.g. "showcase-consent-2026-11-17". */
  textVersion: string;
  /** sha256 of the exact terms sub-clause text for `product` ("title\n\nbody"), as approved under textVersion. */
  textSha256: string;
  source: ShowcaseConsentSource;
  /** ISO time of the event. */
  at: string;
  reason?: ShowcaseWithdrawReason;
}

export interface ShowcaseConsent {
  /** Stable per account; the later showcase registry stores it as consent.reference. */
  id: string;
  accountId: string;
  product: ShowcaseProduct;
  granted: boolean;
  textVersion: string;
  textSha256: string;
  /** Time of the grant the current (or last) consent rests on; null if it was never granted. */
  grantedAt: string | null;
  grantEventId: string | null;
  /** Set while not granted after an earlier grant: when, and why, it was withdrawn. */
  withdrawnAt?: string;
  withdrawReason?: ShowcaseWithdrawReason;
  /** Source of the last event. */
  source: ShowcaseConsentSource;
  history: ShowcaseConsentEvent[];
}

const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,128}$/;

export class ShowcaseConsentError extends Error {
  constructor(readonly code: 'invalid_account' | 'invalid_product' | 'corrupt_record') {
    super(code);
  }
}

/** The text version + digest the owner agrees to today for `product`. */
export function currentShowcaseText(product: ShowcaseProduct): { textVersion: string; textSha256: string } {
  return { textVersion: SHOWCASE_CONSENT_COPY.textVersion, textSha256: SHOWCASE_CONSENT_COPY.products[product].clauseSha256 };
}

export function showcaseConsentRecordId(accountId: string): string {
  return `showcase-consent:${accountId}`;
}

function fileFor(accountId: string): string {
  if (typeof accountId !== 'string' || !ACCOUNT_ID.test(accountId)) throw new ShowcaseConsentError('invalid_account');
  return path.join(dataRoot('showcaseConsent').dir, `${accountId}.jsonl`);
}

function readEvents(accountId: string): ShowcaseConsentEvent[] {
  const file = fileFor(accountId);
  let raw: string;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const events: ShowcaseConsentEvent[] = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let event: ShowcaseConsentEvent;
    try {
      event = JSON.parse(line);
    } catch {
      throw new ShowcaseConsentError('corrupt_record');
    }
    if (event?.accountId !== accountId || typeof event.granted !== 'boolean') throw new ShowcaseConsentError('corrupt_record');
    events.push(event);
  }
  return events;
}

function toConsent(accountId: string, events: ShowcaseConsentEvent[]): ShowcaseConsent | null {
  const last = events[events.length - 1];
  if (!last) return null;
  const lastGrant = [...events].reverse().find((event) => event.granted) ?? null;
  const consent: ShowcaseConsent = {
    id: showcaseConsentRecordId(accountId),
    accountId,
    product: last.product,
    granted: last.granted,
    textVersion: (lastGrant ?? last).textVersion,
    textSha256: (lastGrant ?? last).textSha256,
    grantedAt: lastGrant?.at ?? null,
    grantEventId: lastGrant?.eventId ?? null,
    source: last.source,
    history: events,
  };
  if (!last.granted && lastGrant) {
    consent.withdrawnAt = last.at;
    if (last.reason) consent.withdrawReason = last.reason;
  }
  return consent;
}

function append(event: ShowcaseConsentEvent): void {
  const file = fileFor(event.accountId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // O_APPEND: one line per event, never a rewrite.
  fs.appendFileSync(file, JSON.stringify(event) + '\n', { encoding: 'utf8', flag: 'a' });
}

/** The account's consent, or null when the owner never ticked it (= not granted). */
export function getShowcaseConsent(accountId: string): ShowcaseConsent | null {
  return toConsent(accountId, readEvents(accountId));
}

/** True only while the owner's latest event is a grant. */
export function isShowcaseConsentGranted(accountId: string): boolean {
  return getShowcaseConsent(accountId)?.granted === true;
}

/**
 * Records a grant. Idempotent: if the account is already granted under the same text digest, nothing is appended.
 * Returns the resulting consent.
 */
export function recordShowcaseConsent(params: {
  accountId: string;
  product: ShowcaseProduct;
  source: 'checkout' | 'account';
  now?: Date;
}): ShowcaseConsent {
  if (!SHOWCASE_PRODUCTS.includes(params.product)) throw new ShowcaseConsentError('invalid_product');
  const events = readEvents(params.accountId);
  const current = toConsent(params.accountId, events);
  const text = currentShowcaseText(params.product);
  if (current?.granted && current.textSha256 === text.textSha256 && current.product === params.product) return current;
  const event: ShowcaseConsentEvent = {
    eventId: crypto.randomUUID(),
    accountId: params.accountId,
    product: params.product,
    granted: true,
    ...text,
    source: params.source,
    at: (params.now ?? new Date()).toISOString(),
  };
  append(event);
  return toConsent(params.accountId, [...events, event]) as ShowcaseConsent;
}

/**
 * Records a withdrawal at `now` (the toggle: at once; a cancellation: at receipt). Only appends when the account is
 * currently granted; otherwise returns the unchanged state (null when there never was a consent).
 */
export function withdrawShowcaseConsent(params: {
  accountId: string;
  source: 'account' | 'cancellation';
  reason: ShowcaseWithdrawReason;
  now?: Date;
}): ShowcaseConsent | null {
  const events = readEvents(params.accountId);
  const current = toConsent(params.accountId, events);
  if (!current?.granted) return current;
  const event: ShowcaseConsentEvent = {
    eventId: crypto.randomUUID(),
    accountId: params.accountId,
    product: current.product,
    granted: false,
    textVersion: current.textVersion,
    textSha256: current.textSha256,
    source: params.source,
    at: (params.now ?? new Date()).toISOString(),
    reason: params.reason,
  };
  append(event);
  return toConsent(params.accountId, [...events, event]);
}
