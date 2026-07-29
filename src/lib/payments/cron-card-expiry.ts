/**
 * Proactive "your card is expiring soon" notice cron. A separate concern
 * from `cron-charge.ts` (charge/reminder/retry state machine) — this module
 * never touches charging state at all, it only reads `card_expiry` and
 * sends an email carrying a card-update magic link. Kept as its own file
 * rather than folded into `cron-charge.ts` for that reason.
 *
 * Entry point: `runCardExpiryNoticeCron()`, called from
 * `POST /api/subscriptions/cron/card-expiry-notices` (same Bearer
 * `CRON_SECRET` auth pattern as the other two cron routes — see
 * `cron-auth.ts`).
 *
 * ## Window definition
 *
 * A subscription is a candidate if its `card_expiry` (`MM/YY`) falls in the
 * current calendar month or the next one, evaluated in UTC (consistent with
 * every other date computation in this billing engine — `cron-charge.ts`
 * uses `now.toISOString()`/UTC month arithmetic throughout).
 *
 * ## Once-per-calendar-month gate
 *
 * Reuses the same "check `subscription_events` for an existing event before
 * sending" pattern the trial-ending reminder cron established
 * (`reminder_sent` in `cron-charge.ts`), but scoped to the current `YYYY-MM`
 * (stored in the event's `metadata` JSON) rather than "ever sent" — a card
 * can legitimately need more than one notice across its lifetime (e.g. it
 * was renewed with a new card that itself later approaches expiry), so the
 * gate must be month-scoped, not subscription-lifetime-scoped like
 * `reminder_sent` is.
 */

import crypto from 'crypto';
import { getDb, insertSubscriptionEvent, type SubscriptionRow } from './db';
import { generateMagicLinkToken } from './magic-link';
import { buildAccountUrl } from './subscriptions';
import { sendCardExpiringSoonEmail } from './email';

function nowIso(now: Date): string {
  return now.toISOString();
}

/** Parses a 'MM/YY' card_expiry string into a { month (1-12), year (4-digit) } pair. Returns null if malformed. */
function parseCardExpiry(cardExpiry: string): { month: number; year: number } | null {
  const match = /^(\d{2})\/(\d{2})$/.exec(cardExpiry.trim());
  if (!match) return null;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { month, year };
}

function monthKeyOf(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function isExpiringThisOrNextMonth(parsed: { month: number; year: number }, now: Date): boolean {
  const currentMonth = now.getUTCMonth() + 1;
  const currentYear = now.getUTCFullYear();
  // First day of next calendar month, UTC — lets Date handle the Dec->Jan rollover for us.
  const nextMonthDate = new Date(Date.UTC(currentYear, currentMonth, 1));
  const nextMonth = nextMonthDate.getUTCMonth() + 1;
  const nextMonthYear = nextMonthDate.getUTCFullYear();

  return (
    (parsed.month === currentMonth && parsed.year === currentYear) ||
    (parsed.month === nextMonth && parsed.year === nextMonthYear)
  );
}

export interface CardExpiryNoticeCronSummary {
  ranAt: string;
  candidates: number;
  sent: number;
  skippedAlreadySent: number;
}

/** Runs one full pass of the card-expiry-notice cron. Safe to call more often
 * than needed — subscriptions whose expiry isn't in the current/next month
 * window, or that already got this month's notice, are simply skipped. */
export async function runCardExpiryNoticeCron(now: Date = new Date()): Promise<CardExpiryNoticeCronSummary> {
  const db = getDb();
  const monthKey = monthKeyOf(now);

  const chargeableRows = db
    .prepare(
      `SELECT * FROM subscriptions
       WHERE status IN ('active', 'trialing', 'past_due')
         AND card_expiry IS NOT NULL`
    )
    .all() as SubscriptionRow[];

  const candidates = chargeableRows.filter((row) => {
    const parsed = row.card_expiry ? parseCardExpiry(row.card_expiry) : null;
    return parsed !== null && isExpiringThisOrNextMonth(parsed, now);
  });

  let sent = 0;
  let skippedAlreadySent = 0;

  for (const row of candidates) {
    const alreadySentThisMonth = db
      .prepare(
        `SELECT id FROM subscription_events
         WHERE subscription_id = ? AND event_type = 'card_expiry_notice_sent' AND metadata LIKE ?`
      )
      .get(row.id, `%"monthKey":"${monthKey}"%`);

    if (alreadySentThisMonth) {
      skippedAlreadySent++;
      continue;
    }

    const timestamp = nowIso(now);
    try {
      const { token } = generateMagicLinkToken(row.id);
      const updateCardUrl = buildAccountUrl({ token });
      await sendCardExpiringSoonEmail({
        to: row.user_id,
        cardLast4: row.card_last4 ?? '',
        cardExpiry: row.card_expiry!,
        updateCardUrl,
      });
    } catch (err) {
      console.error(`[cron-card-expiry] Failed to send card-expiry notice for subscription=${row.id}:`, err);
      // Same posture as the reminder cron: on a genuine send failure, don't
      // record the event, so a future run retries it.
      continue;
    }

    insertSubscriptionEvent(db, {
      id: crypto.randomUUID(),
      subscription_id: row.id,
      event_type: 'card_expiry_notice_sent',
      metadata: JSON.stringify({ monthKey, cardExpiry: row.card_expiry }),
      created_at: timestamp,
    });
    sent++;
  }

  return { ranAt: nowIso(now), candidates: candidates.length, sent, skippedAlreadySent };
}
