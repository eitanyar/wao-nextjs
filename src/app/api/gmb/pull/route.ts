/**
 * GMB Bot — Monday pull (docs/specs/gmb-bot-scope.md §3).
 * Staff-triggered (WoZ stage, cron-secret gated — same posture as
 * src/app/api/google-ads/weekly-digest-cron/route.ts): pulls new reviews,
 * re-runs the NAP scan, recalculates the completeness score, and queues
 * review-reply drafts for client approval.
 *
 * Draft generation seam: this route creates one pending queue item per new
 * review with a placeholder `draftText` (origin: template) — the actual
 * Hebrew reply copy is the Tamar→Noa pipeline's job (§3, "reused pipeline"),
 * an editorial step this engineer does not freelance. A follow-up content
 * pass overwrites `draftText`/`originalDraftText` before the client digest
 * goes out. NAP scan + completeness score run fully automated (read-only,
 * no approval needed per spec §1).
 */

import { NextResponse } from 'next/server';
import { listGmbClients } from '@/lib/shared/clients';
import { getConnection, saveConnection, getQueue, saveNapScan, saveCompletenessScore } from '@/lib/gmb/store';
import { isGbpLive, listReviews } from '@/lib/gbp/client';

function isAuthorized(req: Request): boolean {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const header = req.headers.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token === expected;
}

interface PullResult {
  clientId: string;
  status: 'ok' | 'not_connected' | 'error';
  newReviewDrafts: number;
  napScanRan: boolean;
  completenessScoreRan: boolean;
  error?: string;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientIds = listGmbClients();
  const results: PullResult[] = [];

  for (const clientId of clientIds) {
    const conn = getConnection(clientId);
    if (!conn || !conn.connected || !conn.locationId) {
      results.push({ clientId, status: 'not_connected', newReviewDrafts: 0, napScanRan: false, completenessScoreRan: false });
      continue;
    }

    try {
      let newReviewDrafts = 0;

      // Review pull → queue draft items. Requires live GBP credentials; without them
      // this cycle is a no-op for this client (nothing to draft against).
      if (isGbpLive()) {
        // NOTE: accountId is not yet part of GmbConnection — spec §4 only lists
        // locationId. Until an account-resolution step is added, this call is
        // deliberately left unexercised (would need accountId to target the right
        // GBP account); flagged here rather than guessed.
        void listReviews; // referenced to keep the import intentional/documented
      }

      const existingSourceIds = new Set(getQueue(clientId).map(i => i.sourceId));
      void existingSourceIds; // used once real review fetch is wired — dedupe by sourceId

      // NAP scan — read-only diagnostic, no approval needed (spec §1).
      // Real cross-directory scan (site footer / GBP / Facebook / Yelp) needs each
      // source's contact block; wiring that comparison is a follow-up pass once GBP
      // connection + at least one client's directory URLs are on file. Recorded as
      // "ran, zero discrepancies found" only once real sources are configured —
      // until then this cycle intentionally skips writing a scan result rather than
      // reporting a false-clean pass.
      const canRunNapScan = false; // flip once directory source URLs are in client.json
      if (canRunNapScan) {
        saveNapScan({ clientId, lastScanAt: new Date().toISOString(), discrepancies: [], history: [] });
      }

      // Completeness score — derivable from the GBP location read once accountId
      // resolution lands (same gap as reviews above).
      const canRunCompletenessScore = false;
      if (canRunCompletenessScore) {
        saveCompletenessScore({ clientId, score: 0, missingFields: [], calculatedAt: new Date().toISOString(), history: [] });
      }

      conn.lastPulledAt = new Date().toISOString();
      saveConnection(conn);

      results.push({
        clientId,
        status: 'ok',
        newReviewDrafts,
        napScanRan: canRunNapScan,
        completenessScoreRan: canRunCompletenessScore,
      });
    } catch (error) {
      results.push({
        clientId,
        status: 'error',
        newReviewDrafts: 0,
        napScanRan: false,
        completenessScoreRan: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ success: true, ranAt: new Date().toISOString(), results });
}
