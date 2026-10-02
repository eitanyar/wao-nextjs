import fs from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';
import type { PublicSeoCacheResult, PublicSeoOverviewFinding, PublicSeoReservation } from './seo-advisor-public-budget';

const IDS = [
  's1_open_beat_a', 's1_open_beat_b', 's1_open_beat_c', 's1_hesitation',
  's2_consent', 's2_waiting', 's3a_main', 's3b_authority_gap', 's3c_baseline',
  's3_close_freshness', 'anti_guarantee', 's4a_insufficient',
  's4b_unavailable', 's4c_stale', 's4d_unsupported_market', 's4e_invalid_domain',
  's5a_warm_close', 's5b_soft_exit', 's5c_no_contact',
] as const;
type BeatId = typeof IDS[number];
type Dialogue = { beats: Record<BeatId, string[]>; positionAlternatives: Record<'11-20' | '4-10', number> };
type Slots = Partial<Record<'domain' | 'keyword' | 'position' | 'page' | 'evidence_date', string>>;

export function loadPublicSeoDialogue(): Dialogue {
  const raw: unknown = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'fixtures/seo-advisor-public/dialogue.json'), 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid public SEO dialogue');
  const value = raw as Record<string, unknown>;
  const beats = value.beats as Record<string, unknown> | undefined;
  const alternatives = value.positionAlternatives as Record<string, unknown> | undefined;
  if (!beats || typeof beats !== 'object' || Array.isArray(beats) ||
    Object.keys(beats).sort().join(',') !== [...IDS].sort().join(',') ||
    !IDS.every(id => Array.isArray(beats[id]) && (beats[id] as unknown[]).length > 0 &&
      (beats[id] as unknown[]).every(line => typeof line === 'string' && line.length > 0 &&
        !/[{}]/u.test(line.replace(/\{(?:domain|keyword|position|page|evidence_date)\}/gu, '')))) ||
    !alternatives || typeof alternatives !== 'object' || Array.isArray(alternatives) ||
    Object.keys(alternatives).sort().join(',') !== '11-20,4-10' ||
    !['11-20', '4-10'].every(key => Number.isInteger(alternatives[key]) &&
      (alternatives[key] as number) >= 0 && (alternatives[key] as number) < (beats.s3a_main as string[]).length) ||
    alternatives['11-20'] === alternatives['4-10']) throw new Error('Invalid public SEO dialogue');
  return raw as Dialogue;
}

function validDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const domain = input.trim().toLowerCase();
  return domain.length <= 253 && isIP(domain) === 0 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/u.test(domain) ? domain : null;
}
function dateOf(finding: PublicSeoOverviewFinding | undefined): string | null {
  const value = finding?.retrievedAt;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString() === value ? value.slice(0, 10) : null;
}
function render(dialogue: Dialogue, id: BeatId, slots: Slots = {}, position?: number): string[] | null {
  const lines = id === 's3a_main' ? dialogue.beats[id].filter((_, index) =>
    index !== dialogue.positionAlternatives['11-20'] && index !== dialogue.positionAlternatives['4-10'] ||
    index === dialogue.positionAlternatives[position !== undefined && position >= 11 ? '11-20' : '4-10']) : dialogue.beats[id];
  const output: string[] = [];
  for (const line of lines) {
    let missing = false;
    const filled = line.replace(/\{([^}]+)\}/gu, (match, slot: string) => {
      const value = slots[slot as keyof Slots];
      if (!value || !value.trim() || /[\r\n{}]/u.test(value)) { missing = true; return match; }
      return value;
    });
    if (missing) return null;
    output.push(filled);
  }
  return output;
}

export interface RankedKeywordEvidence { keyword: string; page: string; position: number }
export interface AuthorityEvidence { referringDomains: number }
export interface DiagnosisOutcome {
  reservation?: PublicSeoReservation;
  cache?: PublicSeoCacheResult;
  finding?: PublicSeoOverviewFinding;
  executorError?: boolean;
  rankedKeyword?: RankedKeywordEvidence;
  authority?: AuthorityEvidence;
}
export type DiagnosisBeat = 's3a_main' | 's3b_authority_gap' | 's3c_baseline' |
  's4a_insufficient' | 's4b_unavailable' | 's4c_stale';
export interface MappedDiagnosis { beat: DiagnosisBeat; freshness: boolean; finding?: PublicSeoOverviewFinding; rankedKeyword?: RankedKeywordEvidence }

export function mapDiagnosisOutcome(outcome: DiagnosisOutcome): MappedDiagnosis {
  const unavailable: MappedDiagnosis = { beat: 's4b_unavailable', freshness: false };
  if (outcome.executorError || !outcome.reservation) return unavailable;
  const { reservation, cache } = outcome;
  if (reservation.status !== 'reserved' && reservation.status !== 'cached') return unavailable;
  if (cache && cache.status !== 'found') return unavailable;
  const finding = cache?.status === 'found' ? cache.finding : reservation.status === 'cached' ? reservation.finding : outcome.finding;
  const freshness = reservation.status === 'cached' || cache?.status === 'found' && cache.stale;
  if (freshness && !dateOf(finding)) return { beat: 's4a_insufficient', freshness: false };
  if (cache?.status === 'found' && cache.stale) return { beat: 's4c_stale', freshness: true, finding };
  const values = [finding?.organicKeywords, finding?.organicTraffic];
  if (!finding || !dateOf(finding) || !values.every(value => value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0))
    return { beat: 's4a_insufficient', freshness: false };
  if (values.every(value => value === null)) return { beat: 's4a_insufficient', freshness };
  const rank = outcome.rankedKeyword;
  if (rank && typeof rank.keyword === 'string' && rank.keyword.trim() && typeof rank.page === 'string' && rank.page.trim() &&
    !/[\r\n{}]/u.test(rank.keyword + rank.page) && Number.isInteger(rank.position) && rank.position >= 4 && rank.position <= 20)
    return { beat: 's3a_main', freshness, finding, rankedKeyword: rank };
  if (outcome.authority && Number.isInteger(outcome.authority.referringDomains) && outcome.authority.referringDomains >= 0 && outcome.authority.referringDomains < 10)
    return { beat: 's3b_authority_gap', freshness, finding };
  return { beat: 's3c_baseline', freshness, finding };
}

export interface PublicSeoSession {
  state: 'S1' | 'S2' | 'S3' | 'S4' | 'S5';
  domain: string | null;
  consented: boolean;
  runCount: number;
  introBeat: 0 | 1 | 2;
  realFinding: boolean;
}
export interface SessionTurn { session: PublicSeoSession; utterances: string[] }
export type SessionEvent =
  | { type: 'next_intro' | 'hesitation' | 'approve' | 'decline' | 'guarantee_question' | 'close' | 'no_contact' }
  | { type: 'submit_domain'; domain: string; market: string }
  | { type: 'run'; outcome: DiagnosisOutcome };

export function startPublicSeoSession(): SessionTurn {
  return { session: { state: 'S1', domain: null, consented: false, runCount: 0, introBeat: 0, realFinding: false },
    utterances: render(loadPublicSeoDialogue(), 's1_open_beat_a')! };
}
export function advancePublicSeoSession(session: PublicSeoSession, event: SessionEvent): SessionTurn {
  const dialogue = loadPublicSeoDialogue();
  const turn = (next: PublicSeoSession, utterances: string[] | null): SessionTurn => ({ session: next, utterances: utterances ?? [] });
  if (event.type === 'guarantee_question') return turn(session, render(dialogue, 'anti_guarantee'));
  if (event.type === 'no_contact' && (session.state === 'S3' || session.state === 'S4' || session.state === 'S5'))
    return turn({ ...session, state: 'S5' }, render(dialogue, 's5c_no_contact'));
  if (event.type === 'decline' && session.state !== 'S5')
    return turn({ ...session, state: 'S5' }, render(dialogue, 's5b_soft_exit'));
  if (event.type === 'close' && (session.state === 'S3' || session.state === 'S4'))
    return turn({ ...session, state: 'S5' }, render(dialogue, session.realFinding ? 's5a_warm_close' : 's5b_soft_exit'));
  if (session.state === 'S1') {
    if (event.type === 'hesitation') return turn(session, render(dialogue, 's1_hesitation'));
    if (event.type === 'next_intro' && session.introBeat < 2) {
      const introBeat = (session.introBeat + 1) as 1 | 2;
      return turn({ ...session, introBeat }, render(dialogue, introBeat === 1 ? 's1_open_beat_b' : 's1_open_beat_c'));
    }
    if (event.type === 'submit_domain') {
      const domain = validDomain(event.domain);
      if (!domain) return turn(session, render(dialogue, 's4e_invalid_domain'));
      if (event.market !== 'IL' && event.market !== 'US') return turn(session, render(dialogue, 's4d_unsupported_market'));
      return turn({ ...session, state: 'S2', domain }, render(dialogue, 's2_consent', { domain }));
    }
  }
  if (session.state === 'S2') {
    if (event.type === 'approve' && !session.consented)
      return turn({ ...session, consented: true }, render(dialogue, 's2_waiting'));
    if (event.type === 'run') {
      if (!session.consented) return turn(session, render(dialogue, 's2_consent', { domain: session.domain ?? undefined }));
      if (session.runCount !== 0) return turn(session, []);
      const mapped = mapDiagnosisOutcome(event.outcome);
      const slots: Slots = { domain: session.domain ?? undefined, keyword: mapped.rankedKeyword?.keyword,
        page: mapped.rankedKeyword?.page, position: mapped.rankedKeyword?.position?.toString(),
        evidence_date: dateOf(mapped.finding) ?? undefined };
      let beat: DiagnosisBeat = mapped.beat;
      let utterances = render(dialogue, beat, slots, mapped.rankedKeyword?.position);
      if (!utterances) {
        beat = beat === 's3a_main' || beat === 's3b_authority_gap' || beat === 's3c_baseline' ? 's3c_baseline' : 's4a_insufficient';
        utterances = render(dialogue, beat, slots);
      }
      if (!utterances) { beat = 's4b_unavailable'; utterances = render(dialogue, beat); }
      if (mapped.freshness && dateOf(mapped.finding)) {
        const fresh = render(dialogue, 's3_close_freshness', slots);
        if (fresh) utterances = [...utterances!, ...fresh];
      }
      const realFinding = beat.startsWith('s3');
      return turn({ ...session, state: realFinding ? 'S3' : 'S4', runCount: 1, realFinding }, utterances);
    }
  }
  return turn(session, []);
}
