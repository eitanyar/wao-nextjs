import { randomUUID } from 'node:crypto';
import { loadClient, listClients, type SharedClientRecord } from '../shared/clients';
import { sendWhatsAppTemplate, normalizeIsraeliPhone, type SendWhatsAppTemplateInput, type SendWhatsAppTemplateResult } from '../notifications/whatsapp-cloud';
import { loadClientGoogleAdsIndex, type GoogleAdsClientIndex, type LeadRecord } from './intelligence';
import { leadMatchesClientIndex } from './ownership';
import { createLeadsStore, type LeadsStore } from './leadsStore';

const STALE_CLAIM_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export interface LeadResponseDependencies {
  store?: LeadsStore;
  listClients?: () => string[];
  loadClient?: (clientId: string) => SharedClientRecord | null;
  loadClientIndex?: (clientId: string) => GoogleAdsClientIndex | null;
  sendTemplate?: (input: SendWhatsAppTemplateInput) => Promise<SendWhatsAppTemplateResult>;
  now?: () => Date;
}

export interface LeadResponseSummary {
  sent: number;
  failed: number;
  skipped: number;
  alreadyClaimed: number;
}

interface ResolvedLeadResponse {
  client: SharedClientRecord;
  claimId: string;
  lead: LeadRecord;
}

type ClaimResult =
  | { kind: 'claimed'; value: ResolvedLeadResponse }
  | { kind: 'skipped' }
  | { kind: 'already_claimed' };

function hasApprovedTemplate(client: SharedClientRecord): boolean {
  return Boolean(client.leadResponseEnabled && client.leadResponseTemplateName?.trim() && client.leadResponseTemplateLanguage?.trim());
}

function isRecordedConsent(value: string | undefined): boolean {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function isStaleSending(lead: LeadRecord, now: Date): boolean {
  if (lead.firstResponseStatus !== 'sending' || !lead.firstResponseClaimedAt) return false;
  const claimedAt = new Date(lead.firstResponseClaimedAt).getTime();
  return Number.isFinite(claimedAt) && now.getTime() - claimedAt >= STALE_CLAIM_MS;
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Lead response send failed';
  return message.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '?').slice(0, 160) || 'Lead response send failed';
}

function resolveOwner(lead: LeadRecord, dependencies: Required<Pick<LeadResponseDependencies, 'listClients' | 'loadClient' | 'loadClientIndex'>>): { client: SharedClientRecord } | { reason: string } {
  const owners = dependencies.listClients()
    .map(clientId => ({ client: dependencies.loadClient(clientId), index: dependencies.loadClientIndex(clientId) }))
    .filter((candidate): candidate is { client: SharedClientRecord; index: GoogleAdsClientIndex } => Boolean(candidate.client && candidate.index && leadMatchesClientIndex(lead, candidate.index)));

  if (owners.length !== 1) return { reason: owners.length === 0 ? 'unowned_lead' : 'ambiguous_lead_owner' };
  if (!hasApprovedTemplate(owners[0].client)) return { reason: 'client_response_not_configured' };
  return { client: owners[0].client };
}

function defaults(dependencies: LeadResponseDependencies) {
  return {
    store: dependencies.store ?? createLeadsStore(),
    listClients: dependencies.listClients ?? listClients,
    loadClient: dependencies.loadClient ?? loadClient,
    loadClientIndex: dependencies.loadClientIndex ?? loadClientGoogleAdsIndex,
    sendTemplate: dependencies.sendTemplate ?? sendWhatsAppTemplate,
    now: dependencies.now ?? (() => new Date()),
  };
}

export async function claimPendingLeadResponse(leadId: number, dependencies: LeadResponseDependencies = {}): Promise<ClaimResult> {
  const resolved = defaults(dependencies);
  const now = resolved.now();
  return resolved.store.updateLeads(async leads => {
    const lead = leads.find(item => item.id === leadId);
    if (!lead) return { leads, result: { kind: 'skipped' } as ClaimResult };
    if (lead.firstResponseStatus === 'sending' && !isStaleSending(lead, now)) {
      return { leads, result: { kind: 'already_claimed' } as ClaimResult };
    }
    if (lead.firstResponseStatus !== 'pending' && lead.firstResponseStatus !== 'failed' && !isStaleSending(lead, now)) {
      return { leads, result: { kind: 'skipped' } as ClaimResult };
    }
    if ((lead.firstResponseAttempts ?? 0) >= MAX_ATTEMPTS) {
      return { leads, result: { kind: 'skipped' } as ClaimResult };
    }

    const reason = !(
      lead.type === 'form' &&
      typeof lead.phone === 'string' &&
      normalizeIsraeliPhone(lead.phone) &&
      isRecordedConsent(lead.contactConsentAt)
    ) ? 'lead_not_eligible' : null;
    const owner = reason ? { reason } : resolveOwner(lead, resolved);
    if ('reason' in owner) {
      const next = leads.map(item => item.id === leadId ? { ...item, firstResponseStatus: 'not_eligible' as const, firstResponseLastError: owner.reason } : item);
      return { leads: next, result: { kind: 'skipped' } as ClaimResult };
    }

    const claimId = randomUUID();
    const claimedLead = { ...lead, firstResponseStatus: 'sending' as const, firstResponseClaimId: claimId, firstResponseClaimedAt: now.toISOString(), firstResponseLastError: undefined };
    return {
      leads: leads.map(item => item.id === leadId ? claimedLead : item),
      result: { kind: 'claimed', value: { client: owner.client, claimId, lead: claimedLead } } as ClaimResult,
    };
  });
}

export async function sendLeadFirstResponse(claim: ResolvedLeadResponse, dependencies: LeadResponseDependencies = {}): Promise<void> {
  const resolved = defaults(dependencies);
  const normalizedPhone = normalizeIsraeliPhone(claim.lead.phone ?? '');
  if (!normalizedPhone) throw new Error('Lead phone is not eligible');

  try {
    const provider = await resolved.sendTemplate({
      to: normalizedPhone,
      templateName: claim.client.leadResponseTemplateName!,
      templateLanguage: claim.client.leadResponseTemplateLanguage!,
    });
    await resolved.store.updateLeads(async leads => ({
      leads: leads.map(lead => lead.id === claim.lead.id && lead.firstResponseClaimId === claim.claimId ? {
        ...lead,
        firstResponseStatus: 'sent' as const,
        firstResponseAt: resolved.now().toISOString(),
        firstResponseProvider: 'whatsapp_cloud',
        firstResponseProviderMessageId: provider.messageId,
        firstResponseLastError: undefined,
      } : lead),
      result: undefined,
    }));
  } catch (error) {
    const safeError = sanitizeError(error);
    await resolved.store.updateLeads(async leads => ({
      leads: leads.map(lead => lead.id === claim.lead.id && lead.firstResponseClaimId === claim.claimId ? {
        ...lead,
        firstResponseStatus: 'failed' as const,
        firstResponseAttempts: (lead.firstResponseAttempts ?? 0) + 1,
        firstResponseLastError: safeError,
      } : lead),
      result: undefined,
    }));
    throw error;
  }
}

export async function runPendingLeadResponses(dependencies: LeadResponseDependencies = {}): Promise<LeadResponseSummary> {
  const resolved = defaults(dependencies);
  const summary: LeadResponseSummary = { sent: 0, failed: 0, skipped: 0, alreadyClaimed: 0 };
  const leads = await resolved.store.readLeads();
  for (const lead of leads) {
    try {
      const claim = await claimPendingLeadResponse(lead.id, resolved);
      if (claim.kind === 'skipped') {
        summary.skipped += 1;
      } else if (claim.kind === 'already_claimed') {
        summary.alreadyClaimed += 1;
      } else {
        try {
          await sendLeadFirstResponse(claim.value, resolved);
          summary.sent += 1;
        } catch {
          summary.failed += 1;
        }
      }
    } catch {
      summary.failed += 1;
    }
  }
  return summary;
}
