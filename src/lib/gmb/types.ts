/**
 * GMB Bot data model — docs/specs/gmb-bot-scope.md §4.
 * Storage layout (fs-based, mirrors GEO Bot's per-client file pattern):
 *   data/clients/{clientId}/gmb/connection.json     — GmbConnection
 *   data/clients/{clientId}/gmb/queue/*.json         — GmbQueueItem, one file per item
 *   data/clients/{clientId}/gmb/nap-scan.json        — NapScanResult (latest + history)
 *   data/clients/{clientId}/gmb/completeness.json    — CompletenessScore (latest + history)
 *   data/gmb-logs/{clientId}/log.jsonl               — immutable approval/post log (see lib/gmb/log.ts)
 */

export type GbpScope =
  | 'reviews.read' | 'reviews.reply' | 'qa.read' | 'posts.write' | 'location.read';

export interface GmbConnection {
  clientId:      string;
  locationId:    string | null;     // GBP location resource id, null until connected
  connected:     boolean;
  scopesGranted: GbpScope[];        // confirmed-live scopes only — see lib/gbp/client.ts smoke test
  cadence: {
    pullDay:          'monday';     // fixed per spec §3, kept as a field for future flexibility
    postCadenceDays:   number;      // biweekly = 14
  };
  connectedAt?:  string;
  lastPulledAt?: string;
}

export type QueueItemType   = 'review_reply' | 'post';
export type QueueItemStatus = 'pending' | 'approved-edited' | 'approved-as-is' | 'posted' | 'rejected';

export interface GmbQueueItem {
  itemId:      string;   // {clientId}-{type}-{sourceId}
  clientId:    string;
  type:        QueueItemType;
  sourceId:    string;   // the review ID or post-slot ID this draft responds to/fills
  draftText:   string;   // current text — overwritten in place when client edits (approved text != source)
  originalDraftText: string; // Tamar→Noa's first draft, kept for audit even after edits
  status:      QueueItemStatus;
  // Review-reply-only context, absent for `post` items.
  reviewContext?: {
    reviewerName:  string;
    rating:        number;      // 1-5
    reviewText:    string;
    reviewedAt:    string;
  };
  generatedAt: string;
  approvedAt?: string;
  approvedBy?: string;   // client contact name, self-serve on the action page
  postedAt?:   string;
  postedBy?:   'staff';  // WoZ-only in v1, per spec §2 — always 'staff', never automated
  rejectedAt?: string;
  rejectedReason?: string;
}

export interface NapDiscrepancy {
  source: string;   // e.g. "site footer", "Facebook page", "Yelp"
  field:  'name' | 'address' | 'phone';
  found:  string;
  expected: string;
}

export interface NapScanResult {
  clientId:      string;
  lastScanAt:    string;
  discrepancies: NapDiscrepancy[];   // empty = clean
  history: Array<{ scannedAt: string; discrepancyCount: number }>;
}

export interface CompletenessScore {
  clientId:     string;
  score:        number;   // 0-100
  missingFields: string[]; // e.g. ["hours", "attributes:wheelchair_accessible"]
  calculatedAt: string;
  history: Array<{ calculatedAt: string; score: number }>;
}
