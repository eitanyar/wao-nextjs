/**
 * Plain (non-"use server") module shared between the readiness-gate admin
 * page and its server action. Server-action files may only export async
 * functions (every export becomes a callable action), so the shared
 * constants/types/parsing logic used by both live here instead — same
 * split as src/app/(app)/admin/live-readiness/shared.ts.
 *
 * The actual parsing/validation logic lives in ./ltpc-form.js (plain JS,
 * not TS) specifically so it stays directly unit-testable with `node --test`
 * without a TypeScript loader — see ./ltpc-form.test.mjs. This file just
 * layers types on top.
 */
import {
  UNIVERSAL_ITEM_IDS as UNIVERSAL_ITEM_IDS_UNTYPED,
  BOT_SPECIFIC_ITEM_IDS as BOT_SPECIFIC_ITEM_IDS_UNTYPED,
  BOT_TYPES as BOT_TYPES_UNTYPED,
  applicableItemIds as applicableItemIdsUntyped,
  parseLtpcSubmission as parseLtpcSubmissionUntyped,
  computeOverallPass as computeOverallPassUntyped,
} from './ltpc-form.js';

export type BotType = 'site-bot' | 'geo-bot' | 'content-bot' | 'ads-bot' | 'gmb-bot';

export type LtpcItemId =
  | 'contact-inventory'
  | 'delivery-reliability'
  | 'intake-integrity'
  | 'no-unauth-exposure'
  | 'grading-path'
  | 'downstream-integrations'
  | 'gclid-capture'
  | 'geo-action-log';

export type LtpcStatus = 'pass' | 'fail' | 'not-checked';

export interface LtpcItem {
  id: LtpcItemId;
  status: LtpcStatus;
  checkedBy?: string;
  checkedAt?: string;
  evidence?: string;
}

export interface LtpcRecord {
  botType: BotType;
  items: LtpcItem[];
  overallPass: boolean;
}

export type ParsedLtpcSubmission =
  | { ok: true; clientId: string; botType: BotType; checkedBy: string; items: Array<{ id: LtpcItemId; status: LtpcStatus; evidence: string }> }
  | { ok: false; error: 'invalid-client' }
  | { ok: false; error: 'invalid-bot-type' }
  | { ok: false; error: 'missing-evidence'; clientId: string; itemId: LtpcItemId }
  | { ok: false; error: 'missing-checked-by'; clientId: string };

export const UNIVERSAL_ITEM_IDS = UNIVERSAL_ITEM_IDS_UNTYPED as readonly LtpcItemId[];
export const BOT_SPECIFIC_ITEM_IDS = BOT_SPECIFIC_ITEM_IDS_UNTYPED as Record<BotType, readonly LtpcItemId[]>;
export const BOT_TYPES = BOT_TYPES_UNTYPED as readonly BotType[];

export function applicableItemIds(botType: BotType): LtpcItemId[] {
  return applicableItemIdsUntyped(botType);
}

export function parseLtpcSubmission(formData: FormData): ParsedLtpcSubmission {
  return parseLtpcSubmissionUntyped(formData) as ParsedLtpcSubmission;
}

export function computeOverallPass(items: Array<{ id: string; status: string }>, botType: BotType): boolean {
  return computeOverallPassUntyped(items, botType);
}
