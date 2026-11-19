/**
 * Research-gate answers -> site facts at build time (approved by Eitan 2026-11-17: "owner's setup answers become site facts
 * at build time"). HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Two stored answer sources, both on the research dossier:
 * - owner: dossier.ownerResearchGates[].answer (pay page, ownerGates.ts submitOwnerResearchGate);
 * - staff: dossier.staffResearchGateAnswers[gateId] (admin gates POST, gates.ts persistResearchGateApproval).
 * Both are applied with applyResearchGateAnswer, the same function that turns a staff answer into collectedData fields on
 * the admin path, so the two land in the same fields and shape.
 *
 * Precedence: research inference / the caller's collectedData < owner answer < staff answer (applied in that order; every
 * gate type writes its whole field set, so a later answer of the same type replaces an earlier one). A gate with no stored
 * answer leaves the data untouched. Every stored answer is re-validated (validateOwnerGateAnswer) and must belong to this
 * research and carry a matching approval; anything else is skipped silently. Answers stay structured collectedData fields:
 * nothing here builds prompt text.
 */

import type { CollectedData } from '../../bot/prompts';
import { ISRAELI_LOCALITIES } from '../israeliLocalities';
import { listedServedAreas, withServedAreaNames } from '../servedAreas';
import { applyResearchGateAnswer, type ResearchGateType } from './gates';
import { STORED_ANSWER_GATE_TYPES, validateOwnerGateAnswer } from './ownerGates';
import type { SiteResearchDossier } from './types';

interface StoredAnswer {
  id: string;
  type: ResearchGateType;
  evidenceDigest: string;
  answer: unknown;
  answeredAt: string;
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** A stored answer that is well formed, belongs to this research, is approved with the same evidence, and re-validates. */
function usable(dossier: SiteResearchDossier, candidate: unknown, idOverride?: string): StoredAnswer | null {
  if (!plainObject(candidate)) return null;
  const id = idOverride ?? candidate.id;
  const { type, evidenceDigest, answeredAt } = candidate;
  if (typeof id !== 'string' || typeof evidenceDigest !== 'string' || typeof answeredAt !== 'string') return null;
  if (typeof type !== 'string' || !STORED_ANSWER_GATE_TYPES.includes(type as ResearchGateType)) return null;
  if (id !== `${dossier.researchId}:${type}:${evidenceDigest}`) return null;
  const approvals = plainObject(dossier.researchGateApprovals) ? dossier.researchGateApprovals : {};
  const approval: unknown = Object.hasOwn(approvals, id) ? approvals[id] : undefined;
  if (!plainObject(approval) || approval.evidenceDigest !== evidenceDigest) return null;
  if (!Object.hasOwn(candidate, 'answer')) return null;
  const answer = validateOwnerGateAnswer(type as ResearchGateType, candidate.answer);
  return answer === null ? null : { id, type: type as ResearchGateType, evidenceDigest, answer, answeredAt };
}

function byAnsweredAt(left: StoredAnswer, right: StoredAnswer): number {
  return left.answeredAt < right.answeredAt ? -1 : left.answeredAt > right.answeredAt ? 1 : 0;
}

/** The usable owner answers, oldest first. */
export function ownerGateAnswers(dossier: SiteResearchDossier): StoredAnswer[] {
  const records: unknown[] = Array.isArray(dossier.ownerResearchGates) ? dossier.ownerResearchGates : [];
  return records.map(record => usable(dossier, record)).filter((item): item is StoredAnswer => item !== null).sort(byAnsweredAt);
}

/** The usable staff answers, oldest first. */
export function staffGateAnswers(dossier: SiteResearchDossier): StoredAnswer[] {
  const stored: unknown = dossier.staffResearchGateAnswers;
  if (!plainObject(stored)) return [];
  return Object.entries(stored).map(([id, entry]) => usable(dossier, entry, id)).filter((item): item is StoredAnswer => item !== null).sort(byAnsweredAt);
}

/**
 * The collectedData generation uses: the caller's data with the owner's, then staff's, stored gate answers applied. Pure; the
 * input is never mutated. When an answer changed travelBoundary, the served-area names are recomputed from it the way
 * checkout init does (only towns literally named; the previously listed towns are kept as the pick when still named).
 */
export function gateAnsweredCollectedData(collectedData: CollectedData, dossier: SiteResearchDossier | null | undefined): CollectedData {
  if (!dossier || !plainObject(dossier) || typeof dossier.researchId !== 'string') return collectedData;
  const answers = [...ownerGateAnswers(dossier), ...staffGateAnswers(dossier)];
  if (answers.length === 0) return collectedData;
  let data: CollectedData = structuredClone(collectedData);
  for (const item of answers) {
    data = applyResearchGateAnswer(data, { id: item.id, type: item.type, evidenceDigest: item.evidenceDigest }, structuredClone(item.answer));
  }
  if (data.travelBoundary !== collectedData.travelBoundary) {
    data = withServedAreaNames({ ...data, servedAreaChoice: listedServedAreas(collectedData) }, ISRAELI_LOCALITIES);
  }
  return data;
}
