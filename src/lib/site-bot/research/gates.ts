import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { getResearchPath, readResearchDossier, writeResearchDossierAtomic } from './researchStore';
import type { CollectedData } from '../../bot/prompts';
import type { SiteResearchDossier } from './types';

export type ResearchGateType = 'business_boundary' | 'service_attributes' | 'geography' | 'money_services' | 'ambiguous_intent';

export interface ResearchGate {
  id: string;
  type: ResearchGateType;
  evidenceDigest: string;
}

export interface ResearchGateApprovalResult {
  status: 'approved' | 'already_approved' | 'stale';
  collectedData: CollectedData;
}

export interface ResearchGatePersistenceOptions {
  baseDir?: string;
  now?: () => Date;
}

type ResearchGatePersistenceResult = (ResearchGateApprovalResult & { dossier: SiteResearchDossier }) | { status: 'not_found' };

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 24);
}

function gate(researchId: string, type: ResearchGateType, evidence: unknown): ResearchGate {
  const evidenceDigest = digest(evidence);
  return { id: `${researchId}:${type}:${evidenceDigest}`, type, evidenceDigest };
}

export function deriveOpenResearchGates(researchId: string, collectedData: CollectedData, includeApproved = false): ResearchGate[] {
  const gates: ResearchGate[] = [];
  if (!collectedData.secondaryServices?.trim()) {
    gates.push(gate(researchId, 'business_boundary', { primaryService: collectedData.primaryService ?? '', secondaryServices: collectedData.secondaryServices ?? '' }));
  }
  if (!collectedData.serviceAttributes || Object.keys(collectedData.serviceAttributes).length === 0) {
    gates.push(gate(researchId, 'service_attributes', { primaryService: collectedData.primaryService ?? '', serviceAttributes: collectedData.serviceAttributes ?? {} }));
  }
  if (!collectedData.targetLocation?.trim() || !collectedData.travelBoundary?.trim() || !collectedData.geographicExclusions) {
    gates.push(gate(researchId, 'geography', { targetLocation: collectedData.targetLocation ?? '', travelBoundary: collectedData.travelBoundary ?? '', geographicExclusions: collectedData.geographicExclusions ?? null }));
  }
  if (!collectedData.priorityServices?.length) {
    gates.push(gate(researchId, 'money_services', { primaryService: collectedData.primaryService ?? '', priorityServices: collectedData.priorityServices ?? [] }));
  }
  if (collectedData.researchGateAnswers?.ambiguous_intent !== undefined) {
    gates.push(gate(researchId, 'ambiguous_intent', collectedData.researchGateAnswers.ambiguous_intent));
  }
  return includeApproved ? gates : gates.filter(item => collectedData.researchGateApprovals?.[item.id]?.evidenceDigest !== item.evidenceDigest);
}

export function applyResearchGateAnswer(collectedData: CollectedData, gateItem: ResearchGate, answer: unknown): CollectedData {
  const value = answer && typeof answer === 'object' ? answer as Record<string, unknown> : {};
  if (gateItem.type === 'business_boundary' && Array.isArray(value.services)) {
    return { ...collectedData, secondaryServices: value.services.filter(item => typeof item === 'string').join(', ') };
  }
  if (gateItem.type === 'service_attributes' && value.serviceAttributes && typeof value.serviceAttributes === 'object' && !Array.isArray(value.serviceAttributes)) {
    return { ...collectedData, serviceAttributes: Object.fromEntries(Object.entries(value.serviceAttributes).filter(([, item]) => typeof item === 'string')) };
  }
  if (gateItem.type === 'geography') {
    return {
      ...collectedData,
      ...(typeof value.travelBoundary === 'string' ? { travelBoundary: value.travelBoundary } : {}),
      ...(Array.isArray(value.geographicExclusions) ? { geographicExclusions: value.geographicExclusions.filter(item => typeof item === 'string') } : {}),
    };
  }
  if (gateItem.type === 'money_services' && Array.isArray(value.priorityServices)) {
    return { ...collectedData, priorityServices: value.priorityServices.filter(item => typeof item === 'string') };
  }
  if (gateItem.type === 'ambiguous_intent') {
    return { ...collectedData, researchGateAnswers: { ...collectedData.researchGateAnswers, ambiguous_intent: answer } };
  }
  return collectedData;
}

export function approveResearchGate(collectedData: CollectedData, gateItem: ResearchGate, evidenceDigest: string, approvedAt: string): ResearchGateApprovalResult {
  if (evidenceDigest !== gateItem.evidenceDigest) return { status: 'stale', collectedData };
  const existing = collectedData.researchGateApprovals?.[gateItem.id];
  if (existing?.evidenceDigest === evidenceDigest) return { status: 'already_approved', collectedData };
  return {
    status: 'approved',
    collectedData: {
      ...collectedData,
      researchGateApprovals: {
        ...collectedData.researchGateApprovals,
        [gateItem.id]: { evidenceDigest, approvedAt },
      },
    },
  };
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

export async function persistResearchGateApproval(researchId: string, gateItem: ResearchGate, collectedData: CollectedData, evidenceDigest: string, options: ResearchGatePersistenceOptions = {}): Promise<ResearchGatePersistenceResult> {
  const file = getResearchPath(researchId, options.baseDir);
  if (!file || !regularDossierPath(file)) return { status: 'not_found' };
  const dossier = await readResearchDossier(researchId, options.baseDir, { bounded: true });
  if (!dossier) return { status: 'not_found' };
  const now = options.now ?? (() => new Date());
  const approval = approveResearchGate({ ...collectedData, researchGateApprovals: dossier.researchGateApprovals }, gateItem, evidenceDigest, now().toISOString());
  if (approval.status === 'stale') return { ...approval, dossier };
  dossier.researchGateApprovals = approval.collectedData.researchGateApprovals;
  dossier.updatedAt = now().toISOString();
  if (!await writeResearchDossierAtomic(researchId, dossier, options.baseDir)) throw new Error('Unable to persist research gate approval');
  return { ...approval, dossier };
}
