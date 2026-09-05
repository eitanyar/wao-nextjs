export type AcquisitionChannel =
  | 'google_ads'
  | 'organic_search'
  | 'google_business_profile'
  | 'direct'
  | 'referral'
  | 'unknown';

export type AttributionConfidence = 'high' | 'medium' | 'low';

export interface LeadAttributionInput {
  gclid?: string | null;
  wbraid?: string | null;
  gbraid?: string | null;
  landingReferrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

export interface LeadAttribution {
  acquisitionChannel: AcquisitionChannel;
  attributionConfidence: AttributionConfidence;
}

function normalized(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function isGoogleReferrer(value: string): boolean {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'google.com' || hostname.startsWith('google.') || hostname.endsWith('.google.com') || hostname.startsWith('www.google.');
  } catch {
    return false;
  }
}

function isReferrer(value: string): boolean {
  try {
    return Boolean(new URL(value).hostname);
  } catch {
    return false;
  }
}

function isGoogleBusinessProfileSource(source: string, medium: string): boolean {
  return (
    source === 'gbp' ||
    source === 'gmb' ||
    source === 'google_business_profile' ||
    source === 'google-my-business' ||
    (source === 'google' && (medium === 'business_profile' || medium === 'google_business_profile'))
  );
}

export function deriveLeadAttribution(input: LeadAttributionInput): LeadAttribution {
  if (normalized(input.gclid) || normalized(input.wbraid) || normalized(input.gbraid)) {
    return { acquisitionChannel: 'google_ads', attributionConfidence: 'high' };
  }

  const source = normalized(input.utmSource);
  const medium = normalized(input.utmMedium);
  const referrer = input.landingReferrer?.trim() ?? '';

  if (isGoogleBusinessProfileSource(source, medium)) {
    return { acquisitionChannel: 'google_business_profile', attributionConfidence: 'high' };
  }

  if ((source === 'google' && medium === 'organic') || isGoogleReferrer(referrer)) {
    return { acquisitionChannel: 'organic_search', attributionConfidence: 'high' };
  }

  if (isReferrer(referrer)) {
    return { acquisitionChannel: 'referral', attributionConfidence: 'medium' };
  }

  if (!source && !medium && !normalized(input.utmCampaign) && !referrer) {
    return { acquisitionChannel: 'direct', attributionConfidence: 'low' };
  }

  return { acquisitionChannel: 'unknown', attributionConfidence: 'low' };
}
