import fs from 'fs';
import path from 'path';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { ResearchGate, ResearchGateType } from './gates';
import type { OwnerResearchGate, SiteResearchDossier } from './types';

// Owner-answerable research gates (F2, rehearsal 2026-11-16; re-keyed in Site Bot step 2a, 2026-11-25). The research now
// runs BEFORE payment, keyed by the interview session (research id = interview session id), and the owner answers the
// gates inside the interview (2b UI), no longer on the pay page. The interview research run (interviewResearch.ts)
// records WHICH gates it hands to the owner (id, type, evidence digest) in that research's dossier; the public
// interview-gates POST may then list / approve only a gate from that server-side list, only while it is open (not
// approved, not expired), and only for the research of the interview session whose cookie the caller holds (the route
// takes the research id from the session, never from the request). The client-supplied collectedData is never used to
// decide which gates exist.

/**
 * Gate types the owner may answer from the pay page. ambiguous_intent is staff-only (2026-11-20, post-payment screen): the
 * owner cannot answer "which of these do you mean" without the candidates in front of him, so staff answer it through the
 * admin gates path. The admin path is unaffected by this list. Research gates never block the research or generation
 * (completion reads dossier.humanGates only), so an unanswered staff-only gate cannot stall a paid site.
 */
export const OWNER_ANSWERABLE_GATE_TYPES: readonly ResearchGateType[] = [
  'business_boundary',
  'service_attributes',
  'geography',
  'money_services',
];

/** Every gate type whose stored answer (owner or staff) generation applies (gateAnswers.ts); a superset of the owner list. */
export const STORED_ANSWER_GATE_TYPES: readonly ResearchGateType[] = [...OWNER_ANSWERABLE_GATE_TYPES, 'ambiguous_intent'];

/**
 * How long after the gates were issued the owner may still answer them: the spot lifetime (Eitan 2026-11-25: 3 days,
 * SITE_BOT_SPOT_TTL_HOURS default 72; the interview route passes the configured value as `windowMs`). The interview
 * session itself closes at the spot expiry, so the route refuses earlier than this whenever the session is gone.
 */
export const OWNER_GATE_WINDOW_MS = 72 * 60 * 60 * 1000;

const MAX_LIST_ITEMS = 20;
const MAX_ITEM_CHARS = 200;
const MAX_TEXT_CHARS = 1000;
const MAX_ATTRIBUTE_ENTRIES = 10;

function boundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

function boundedStringList(value: unknown, { allowEmpty = false } = {}): value is string[] {
  return Array.isArray(value)
    && (allowEmpty || value.length > 0)
    && value.length <= MAX_LIST_ITEMS
    && value.every(item => boundedString(item, MAX_ITEM_CHARS));
}

function plainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Shape + size check of an owner's answer, per gate type (matches buildResearchGateAnswer in gatePresentation.ts).
 * Returns the answer reduced to the expected keys, or null when it is malformed or oversized.
 */
export function validateOwnerGateAnswer(type: ResearchGateType, answer: unknown): unknown | null {
  switch (type) {
    case 'business_boundary':
      return plainObject(answer) && boundedStringList(answer.services) ? { services: answer.services } : null;
    case 'money_services':
      return plainObject(answer) && boundedStringList(answer.priorityServices) ? { priorityServices: answer.priorityServices } : null;
    case 'service_attributes': {
      if (!plainObject(answer) || !plainObject(answer.serviceAttributes)) return null;
      const entries = Object.entries(answer.serviceAttributes);
      if (entries.length === 0 || entries.length > MAX_ATTRIBUTE_ENTRIES) return null;
      if (!entries.every(([key, value]) => boundedString(key, MAX_ITEM_CHARS) && boundedString(value, MAX_TEXT_CHARS))) return null;
      return { serviceAttributes: Object.fromEntries(entries) };
    }
    case 'geography': {
      if (!plainObject(answer) || !boundedString(answer.travelBoundary, MAX_TEXT_CHARS)) return null;
      const exclusions = answer.geographicExclusions ?? [];
      if (!boundedStringList(exclusions, { allowEmpty: true })) return null;
      return { travelBoundary: answer.travelBoundary, geographicExclusions: exclusions };
    }
    case 'ambiguous_intent':
      return boundedString(answer, MAX_TEXT_CHARS) ? answer : null;
    default:
      return null;
  }
}

function regularDossierPath(file: string): boolean {
  const root = path.parse(file).root;
  const parts = path.relative(root, file).split(path.sep);
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !(index === parts.length - 1 ? stat.isFile() : stat.isDirectory())) return false;
    } catch {
      return false;
    }
  }
  return true;
}

async function readDossier(researchId: string, baseDir?: string): Promise<SiteResearchDossier | null> {
  const file = getResearchPath(researchId, baseDir);
  if (!file || !regularDossierPath(file)) return null;
  return readResearchDossier(researchId, baseDir, { bounded: true });
}

/**
 * Called by the checkout callback right after the research ran: remembers the owner-answerable gates it is about to hand
 * to the pay page. Returns the gates actually recorded (owner-answerable only); [] when the dossier could not be updated,
 * so the caller never shows the owner a gate he cannot submit.
 */
export async function recordOwnerResearchGates(researchId: string, gates: ResearchGate[], options: { baseDir?: string; now?: () => Date } = {}): Promise<ResearchGate[]> {
  const ownerGates = gates.filter(gate => OWNER_ANSWERABLE_GATE_TYPES.includes(gate.type));
  if (ownerGates.length === 0) return [];
  const dossier = await readDossier(researchId, options.baseDir);
  if (!dossier) return [];
  const issuedAt = (options.now ?? (() => new Date()))().toISOString();
  const known = new Set((dossier.ownerResearchGates ?? []).map(gate => gate.id));
  dossier.ownerResearchGates = [
    ...(dossier.ownerResearchGates ?? []),
    ...ownerGates.filter(gate => !known.has(gate.id)).map(gate => ({ id: gate.id, type: gate.type, evidenceDigest: gate.evidenceDigest, issuedAt })),
  ];
  dossier.updatedAt = issuedAt;
  return await writeResearchDossierAtomic(researchId, dossier, options.baseDir) ? ownerGates : [];
}

/** The owner gates of a research that are still open (not answered, not approved, inside the window). */
export async function listOpenOwnerResearchGates(researchId: string, options: { baseDir?: string; now?: () => Date; windowMs?: number } = {}): Promise<ResearchGate[]> {
  const dossier = await readDossier(researchId, options.baseDir);
  if (!dossier || !Array.isArray(dossier.ownerResearchGates)) return [];
  const now = (options.now ?? (() => new Date()))().getTime();
  const windowMs = options.windowMs ?? OWNER_GATE_WINDOW_MS;
  return dossier.ownerResearchGates
    .filter(gate => OWNER_ANSWERABLE_GATE_TYPES.includes(gate.type) && !gate.answeredAt && !dossier.researchGateApprovals?.[gate.id]
      && Number.isFinite(Date.parse(gate.issuedAt)) && now - Date.parse(gate.issuedAt) <= windowMs)
    .map(gate => ({ id: gate.id, type: gate.type, evidenceDigest: gate.evidenceDigest }));
}

export type OwnerGateSubmitResult =
  | { status: 'approved'; gate: ResearchGate; answer: unknown; dossier: SiteResearchDossier }
  | { status: 'forbidden' | 'not_found' | 'closed' | 'stale' | 'invalid_answer' };

/**
 * Approves one owner gate: the gate must be on the dossier's owner list, owner-answerable, unapproved, inside the answer
 * window and with the evidence digest it was issued with. The validated answer is stored next to the gate record,
 * together with the approval, in one atomic dossier write; generation applies it to the site facts (gateAnswers.ts).
 */
export async function submitOwnerResearchGate(
  researchId: string,
  gateId: string,
  evidenceDigest: string,
  answer: unknown,
  options: { baseDir?: string; now?: () => Date; windowMs?: number } = {},
): Promise<OwnerGateSubmitResult> {
  const dossier = await readDossier(researchId, options.baseDir);
  if (!dossier || !Array.isArray(dossier.ownerResearchGates) || dossier.ownerResearchGates.length === 0) return { status: 'forbidden' };
  const index = dossier.ownerResearchGates.findIndex(gate => gate.id === gateId);
  const record: OwnerResearchGate | undefined = dossier.ownerResearchGates[index];
  if (!record || !OWNER_ANSWERABLE_GATE_TYPES.includes(record.type)) return { status: 'not_found' };
  const now = (options.now ?? (() => new Date()))();
  const issued = Date.parse(record.issuedAt);
  if (record.answeredAt || dossier.researchGateApprovals?.[record.id] || !Number.isFinite(issued) || now.getTime() - issued > (options.windowMs ?? OWNER_GATE_WINDOW_MS)) {
    return { status: 'closed' };
  }
  if (evidenceDigest !== record.evidenceDigest) return { status: 'stale' };
  const validAnswer = validateOwnerGateAnswer(record.type, answer);
  if (validAnswer === null) return { status: 'invalid_answer' };
  const approvedAt = now.toISOString();
  dossier.researchGateApprovals = { ...dossier.researchGateApprovals, [record.id]: { evidenceDigest: record.evidenceDigest, approvedAt } };
  dossier.ownerResearchGates = dossier.ownerResearchGates.map((gate, at) => at === index ? { ...gate, answer: validAnswer, answeredAt: approvedAt } : gate);
  dossier.updatedAt = approvedAt;
  if (!await writeResearchDossierAtomic(researchId, dossier, options.baseDir)) throw new Error('Unable to persist owner research gate');
  return { status: 'approved', gate: { id: record.id, type: record.type, evidenceDigest: record.evidenceDigest }, answer: validAnswer, dossier };
}
