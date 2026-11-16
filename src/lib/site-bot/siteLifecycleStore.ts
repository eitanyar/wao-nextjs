/**
 * Site-Bot lifecycle store, on the billing SQLite DB next to `subscriptions` (same idempotent CREATE TABLE IF NOT EXISTS
 * pattern as clientMessages.ts):
 *
 * - `site_bot_sites`: the go-live mark. One row per subscription, written by the deploy route when a paid site is
 *   published (onSiteBotSiteLive in reviewKit.ts). Keeps the slug, public URL, the stored Google Place ID (the only
 *   Places field we may keep), whether the site runs on the owner's own domain, and the first live time.
 * - `site_bot_notices`: one row per (subscription, notice kind) = the idempotency record for every one-time email
 *   (review kit, cancel confirmation, offline soon, staff take-down reminder, no-Place-ID staff alert). A notice is
 *   claimed before sending and completed after, so two overlapping runs cannot both send; a failed send releases it.
 *
 * Zero Hebrew. Never stores or logs message content.
 */
import type Database from 'better-sqlite3';
import { getDb } from '../payments/db';
import { SESSION_LINK_EVENT } from './clientMessages';

export const NOTICE_KINDS = [
  'review_kit_email',
  'review_kit_no_place_alert',
  'cancel_confirmation',
  'offline_soon',
  'takedown_staff',
] as const;
export type NoticeKind = (typeof NOTICE_KINDS)[number];

export interface SiteBotSiteRow {
  subscription_id: string;
  slug: string;
  site_url: string;
  place_id: string | null;
  own_domain: number;
  business_name: string | null;
  live_at: string;
  updated_at: string;
}

export interface NoticeRow {
  subscription_id: string;
  kind: NoticeKind;
  state: 'sending' | 'sent';
  outcome: string | null;
  claimed_at: string;
  sent_at: string | null;
}

/** A 'sending' claim older than this is treated as a crashed run and may be re-claimed. */
const STALE_CLAIM_MS = 60 * 60 * 1000;

const ensured = new WeakSet<Database.Database>();
function db(): Database.Database {
  const conn = getDb();
  if (!ensured.has(conn)) {
    conn.exec(`
      CREATE TABLE IF NOT EXISTS site_bot_sites (
        subscription_id TEXT PRIMARY KEY REFERENCES subscriptions(id),
        slug            TEXT NOT NULL,
        site_url        TEXT NOT NULL,
        place_id        TEXT,
        own_domain      INTEGER NOT NULL DEFAULT 0,
        business_name   TEXT,
        live_at         TEXT NOT NULL,
        updated_at      TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS site_bot_notices (
        subscription_id TEXT NOT NULL REFERENCES subscriptions(id),
        kind            TEXT NOT NULL,
        state           TEXT NOT NULL,
        outcome         TEXT,
        claimed_at      TEXT NOT NULL,
        sent_at         TEXT,
        PRIMARY KEY (subscription_id, kind)
      );
    `);
    ensured.add(conn);
  }
  return conn;
}

/** The subscription a Site-Bot checkout session was bought under (latest session-link event), or null. */
export function findSubscriptionIdBySession(sessionId: string): string | null {
  if (typeof sessionId !== 'string' || !sessionId.trim()) return null;
  const row = db()
    .prepare(
      `SELECT subscription_id FROM subscription_events
       WHERE event_type = ? AND json_valid(metadata) AND json_extract(metadata, '$.sessionId') = ?
       ORDER BY created_at DESC LIMIT 1`
    )
    .get(SESSION_LINK_EVENT, sessionId) as { subscription_id: string } | undefined;
  return row?.subscription_id ?? null;
}

/**
 * Records that the subscription's site is live (every deploy). The first call sets `live_at`; later calls refresh the
 * URL, Place ID, own-domain flag and business name. Returns whether this was the first go-live.
 */
export function recordSiteLive(params: {
  subscriptionId: string;
  slug: string;
  siteUrl: string;
  placeId: string | null;
  ownDomain: boolean;
  businessName: string | null;
  now: Date;
}): { row: SiteBotSiteRow; firstLive: boolean } {
  const conn = db();
  const at = params.now.toISOString();
  return conn.transaction(() => {
    const existing = getSiteBotSite(params.subscriptionId);
    if (existing) {
      conn
        .prepare(
          `UPDATE site_bot_sites SET slug = ?, site_url = ?, place_id = ?, own_domain = ?, business_name = COALESCE(?, business_name), updated_at = ?
           WHERE subscription_id = ?`
        )
        .run(params.slug, params.siteUrl, params.placeId, params.ownDomain ? 1 : 0, params.businessName, at, params.subscriptionId);
    } else {
      conn
        .prepare(
          `INSERT INTO site_bot_sites (subscription_id, slug, site_url, place_id, own_domain, business_name, live_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(params.subscriptionId, params.slug, params.siteUrl, params.placeId, params.ownDomain ? 1 : 0, params.businessName, at, at);
    }
    return { row: getSiteBotSite(params.subscriptionId) as SiteBotSiteRow, firstLive: !existing };
  }).immediate();
}

export function getSiteBotSite(subscriptionId: string): SiteBotSiteRow | null {
  return (db().prepare(`SELECT * FROM site_bot_sites WHERE subscription_id = ?`).get(subscriptionId) as SiteBotSiteRow | undefined) ?? null;
}

export function listSiteBotSites(): SiteBotSiteRow[] {
  return db().prepare(`SELECT * FROM site_bot_sites ORDER BY live_at ASC`).all() as SiteBotSiteRow[];
}

export function getNotice(subscriptionId: string, kind: NoticeKind): NoticeRow | null {
  return (db().prepare(`SELECT * FROM site_bot_notices WHERE subscription_id = ? AND kind = ?`).get(subscriptionId, kind) as NoticeRow | undefined) ?? null;
}

export function noticeSent(subscriptionId: string, kind: NoticeKind): boolean {
  return getNotice(subscriptionId, kind)?.state === 'sent';
}

/** Claims a one-time notice. False when it was already sent, or another run holds a fresh claim. */
export function claimNotice(subscriptionId: string, kind: NoticeKind, now: Date): boolean {
  const conn = db();
  const at = now.toISOString();
  return conn.transaction((): boolean => {
    const existing = getNotice(subscriptionId, kind);
    if (!existing) {
      conn.prepare(`INSERT INTO site_bot_notices (subscription_id, kind, state, claimed_at) VALUES (?, ?, 'sending', ?)`).run(subscriptionId, kind, at);
      return true;
    }
    if (existing.state === 'sent') return false;
    if (now.getTime() - Date.parse(existing.claimed_at) < STALE_CLAIM_MS) return false;
    conn.prepare(`UPDATE site_bot_notices SET claimed_at = ? WHERE subscription_id = ? AND kind = ?`).run(at, subscriptionId, kind);
    return true;
  }).immediate();
}

/** Marks a claimed notice sent. `outcome` is 'sent' (delivered) or 'stubbed' (dev outbox only). */
export function completeNotice(subscriptionId: string, kind: NoticeKind, outcome: 'sent' | 'stubbed', now: Date): void {
  db()
    .prepare(`UPDATE site_bot_notices SET state = 'sent', outcome = ?, sent_at = ? WHERE subscription_id = ? AND kind = ?`)
    .run(outcome, now.toISOString(), subscriptionId, kind);
}

/** Drops a claim after a failed or skipped send, so a later run may try again. */
export function releaseNotice(subscriptionId: string, kind: NoticeKind): void {
  db().prepare(`DELETE FROM site_bot_notices WHERE subscription_id = ? AND kind = ? AND state = 'sending'`).run(subscriptionId, kind);
}
