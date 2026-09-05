import type { GoogleAdsAutonomyPolicy } from './autonomy';

export interface OnboardingAutonomyConsentInput {
  clientId: string;
  mode: 'test' | 'live';
  autonomyConsent?: boolean;
  autonomyConsentTimestamp?: string;
  autonomyTermsVersion?: string;
  dailyBudgetIls: number;
  authorizedBy: string;
  legalTermsVersion?: string;
}

const ALLOWED_KINDS: GoogleAdsAutonomyPolicy['allowedKinds'] = [
  'budget_tune',
  'search_term_cleanup',
  'search_term_harvest',
];

export function buildOnboardingAutonomyPolicy(input: OnboardingAutonomyConsentInput): GoogleAdsAutonomyPolicy | null {
  if (input.autonomyConsent !== true) return null;
  if (!input.clientId.trim() || !input.authorizedBy.trim() || !input.autonomyConsentTimestamp?.trim() || !input.autonomyTermsVersion?.trim()) {
    throw new Error('Autonomy consent requires client, authorization timestamp, and terms version.');
  }
  if (!Number.isFinite(input.dailyBudgetIls) || input.dailyBudgetIls <= 0) {
    throw new Error('Autonomy consent requires a positive configured daily budget.');
  }
  if (Number.isNaN(new Date(input.autonomyConsentTimestamp).getTime())) {
    throw new Error('Autonomy consent timestamp must be an ISO date.');
  }

  const liveTermsReleased = input.mode === 'live'
    && Boolean(input.legalTermsVersion)
    && input.legalTermsVersion === input.autonomyTermsVersion;

  return {
    version: 1,
    clientId: input.clientId,
    mode: input.mode === 'test' || liveTermsReleased ? 'autonomous' : 'shadow',
    authorizedAt: input.autonomyConsentTimestamp,
    authorizedBy: input.authorizedBy,
    termsVersion: input.autonomyTermsVersion,
    allowedKinds: [...ALLOWED_KINDS],
    maxDailyBudgetIls: input.dailyBudgetIls,
    maxBudgetChangePctPerRun: 15,
    maxActionsPerRun: 20,
    cooldownHours: 24,
    killSwitch: false,
    clickProtection: {
      provider: 'fraudblocker',
      status: 'unknown',
      verifiedAt: null,
      maxAgeDays: 7,
    },
  };
}
