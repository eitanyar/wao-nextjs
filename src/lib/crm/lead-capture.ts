import type { LeadRecord } from './intelligence';
import { deriveLeadAttribution } from './lead-attribution';

export interface LeadCapturePayload {
  orderId?: string;
  name?: string;
  phone?: string;
  type?: string;
  source?: string;
  slug?: string;
  customerId?: string;
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
  businessNiche?: string;
  contactConsentAt?: string;
  landingReferrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface LeadCaptureResult {
  lead: LeadRecord;
  created: boolean;
}

function hasRecordedConsent(value: string | undefined): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function formatDate(now: Date): string {
  return now.toISOString().replace('T', ' ').substring(0, 16);
}

export function captureLead(input: {
  leads: LeadRecord[];
  body: LeadCapturePayload;
  now?: Date;
  id?: number;
}): LeadCaptureResult {
  const { leads, body } = input;
  if (body.orderId) {
    const existing = leads.find((lead) => lead.orderId === body.orderId);
    if (existing) return { lead: existing, created: false };
  }

  const now = input.now ?? new Date();
  const isClickStub = body.type === 'phone-click' || body.type === 'whatsapp-click';
  const isEligibleForm = body.type === 'form' && Boolean(body.phone) && hasRecordedConsent(body.contactConsentAt);
  const attribution = deriveLeadAttribution(body);
  const lead: LeadRecord = {
    id: input.id ?? now.getTime(),
    orderId: body.orderId || `wao-${now.getTime()}`,
    name: body.name || null,
    phone: body.phone || null,
    date: formatDate(now),
    status: isClickStub ? 'click' : 'new',
    quality: 'PENDING',
    revenue: 0,
    closed: false,
    closedAt: null,
    type: body.type || 'form',
    source: body.source || '',
    slug: body.slug || '',
    customerId: body.customerId || '',
    gclid: body.gclid || null,
    wbraid: body.wbraid || null,
    gbraid: body.gbraid || null,
    businessNiche: body.businessNiche || '',
    contactConsentAt: isEligibleForm ? body.contactConsentAt : undefined,
    landingReferrer: body.landingReferrer || undefined,
    utmSource: body.utmSource || undefined,
    utmMedium: body.utmMedium || undefined,
    utmCampaign: body.utmCampaign || undefined,
    ...attribution,
    firstResponseStatus: isEligibleForm ? 'pending' : 'not_eligible',
    firstResponseAttempts: 0,
  };

  return { lead, created: true };
}
