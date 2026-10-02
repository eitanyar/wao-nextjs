import { readPublicSeoOverview, reservePublicSeoOverview, savePublicSeoOverview } from './seo-advisor-public-budget';
import type {
  PublicSeoBudgetStore, PublicSeoCacheResult, PublicSeoOverviewFinding, PublicSeoReservation,
} from './seo-advisor-public-budget';
import type { DiagnosisOutcome } from './seo-advisor-public-session';

const MARKETS = {
  IL: { locationCode: 2376, languageCode: 'he' },
  US: { locationCode: 2840, languageCode: 'en' },
} as const;

export type PublicSeoExecutor = (request: {
  projectId: string;
  domain: string;
  locationCode: number;
  languageCode: string;
}) => Promise<PublicSeoOverviewFinding>;

function validFinding(input: unknown): input is PublicSeoOverviewFinding {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) return false;
  const value = input as Record<string, unknown>;
  if (Object.keys(value).sort().join(',') !== 'organicKeywords,organicTraffic,retrievedAt') return false;
  if (typeof value.retrievedAt !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value.retrievedAt)) return false;
  const time = Date.parse(value.retrievedAt);
  return Number.isFinite(time) && new Date(time).toISOString() === value.retrievedAt &&
    ['organicTraffic', 'organicKeywords'].every(key => value[key] === null ||
      (typeof value[key] === 'number' && Number.isFinite(value[key]) && value[key] >= 0));
}

export async function runPublicSeoDiagnosis(options: {
  store: PublicSeoBudgetStore;
  dailyCeiling: number;
  domain: string;
  market: string;
  projectId: string;
  executor: PublicSeoExecutor;
}): Promise<DiagnosisOutcome> {
  const { store, domain, dailyCeiling, market, projectId, executor } = options;
  const invalid: PublicSeoReservation = { status: 'invalid_arguments' };
  if (!Object.prototype.hasOwnProperty.call(MARKETS, market) ||
    typeof projectId !== 'string' || !projectId.trim()) return { reservation: invalid };
  const { locationCode, languageCode } = MARKETS[market as keyof typeof MARKETS];

  const cache: PublicSeoCacheResult = readPublicSeoOverview(store, domain);
  if (cache.status === 'found') {
    // The session mapper requires a cached reservation alongside cache evidence.
    const reservation: PublicSeoReservation = {
      status: 'cached', domain: cache.domain, day: cache.day, finding: cache.finding,
    };
    return { reservation, cache };
  }
  if (cache.status !== 'not_found') return { reservation: { status: cache.status } };

  const reservation: PublicSeoReservation = reservePublicSeoOverview(store, domain, dailyCeiling);
  if (reservation.status !== 'reserved') return { reservation };
  // The session mapper needs the status, but the ledger token must remain private.
  const publicReservation: PublicSeoReservation = { ...reservation, token: '' };
  try {
    const finding: unknown = await executor({ projectId, domain: reservation.domain, locationCode, languageCode });
    if (!validFinding(finding)) return { reservation: publicReservation, executorError: true };
    savePublicSeoOverview(store, domain, reservation.token, finding);
    return { reservation: publicReservation, finding, cache: undefined };
  } catch {
    return { reservation: publicReservation, executorError: true };
  }
}
