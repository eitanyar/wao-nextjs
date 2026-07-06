// -----------------------------------------------------------------------------
// Advisor bot — cross-tool "next recommendation" supervisor.
//
// This is NOT a fourth data silo. It reads the already-loaded outputs of the
// three shipped tools (anomaly-check, pareto, title-bot) plus the geo/actions
// task queue, normalizes them into one common shape, and ranks them so the
// dashboard can surface a single "what to do next" recommendation above the
// existing per-tool sections.
//
// Ranking (v1, confirmed scope): tier-first only. Tier 1 (anomalies —
// reactive/time-sensitive) always outranks tier 2 (opportunities), then sort
// by each tool's own native score descending within a tier. No cross-tier
// weighted formula.
// -----------------------------------------------------------------------------

export interface AdvisorItem {
  tool: 'anomaly' | 'pareto' | 'title-bot' | 'geo-task';
  tier: 1 | 2;
  title: string;
  detail: string;
  score: number;
  sourceLink?: string;
}

// Minimal shapes — kept structurally compatible with the interfaces already
// defined in the dashboard page, so adapters accept the same objects without
// re-reading any files.

interface AnomalyRowLike {
  dimension: 'pages' | 'queries';
  key: string;
  clicksChangePct: number;
  impressionsChangePct: number;
  direction: string;
}

interface AnomalyDataLike {
  status: 'warming_up' | 'ok';
  anomalies: AnomalyRowLike[];
}

interface ParetoOpportunityLike {
  query: string;
  rankingUrl: string;
  position: number;
  impressions: number;
  score: number;
}

interface ParetoDataLike {
  opportunities: ParetoOpportunityLike[];
}

interface TitleBotCandidateLike {
  query: string;
  page: string;
  position: number;
  directionalPriorityScore?: number;
  estimatedLostClicks?: number;
}

interface TitleBotSkippedRowLike {
  query: string;
  page: string;
}

interface TitleBotDataLike {
  candidates: TitleBotCandidateLike[];
  skippedForCannibalization: TitleBotSkippedRowLike[];
}

interface GeoTaskLike {
  actionId: string;
  query: string;
  rankingUrl: string;
  score: number;
  status: string;
}

export function adaptAnomalies(data: AnomalyDataLike | null): AdvisorItem[] {
  if (!data) return [];
  if (data.status === 'warming_up') return [];
  if (!data.anomalies || data.anomalies.length === 0) return [];

  return data.anomalies.map((a) => {
    const pctDrop = Math.min(a.clicksChangePct, a.impressionsChangePct);
    return {
      tool: 'anomaly',
      tier: 1,
      title: `Clicks/impressions dropped ${Math.abs(pctDrop)}% on "${a.key}"`,
      detail: `${a.dimension === 'pages' ? 'Page' : 'Query'} · ${a.direction}`,
      score: Math.abs(pctDrop),
      sourceLink: '#alerts',
    };
  });
}

export function adaptParetoOpportunities(data: ParetoDataLike | null): AdvisorItem[] {
  if (!data || !data.opportunities) return [];

  return data.opportunities.map((o) => ({
    tool: 'pareto',
    tier: 2,
    title: `Search opportunity: "${o.query}"`,
    detail: `${o.rankingUrl.replace(/^https?:\/\/[^/]+/, '')} · pos ${o.position} · ${o.impressions.toLocaleString()} impr.`,
    score: o.score,
    sourceLink: '#search-opportunities',
  }));
}

export function adaptTitleBotSuggestions(data: TitleBotDataLike | null): AdvisorItem[] {
  if (!data || !data.candidates) return [];

  const skipSet = new Set(
    (data.skippedForCannibalization ?? []).map((s) => `${s.query}|${s.page}`)
  );

  return data.candidates
    .filter((c) => !skipSet.has(`${c.query}|${c.page}`))
    .map((c) => ({
      tool: 'title-bot',
      tier: 2,
      title: `Title rewrite candidate: "${c.query}"`,
      detail: `${c.page.replace(/^https?:\/\/[^/]+/, '')} · pos ${c.position}`,
      score: c.directionalPriorityScore ?? c.estimatedLostClicks ?? 0,
      sourceLink: '#title-optimization',
    }));
}

// Reuses getClientActions() output already loaded by the dashboard page (no
// duplicate file-reading). Only pending tasks are surfaced as recommendations
// — done/verified tasks are, by definition, no longer "next".
export function adaptGeoTasks(tasks: GeoTaskLike[]): AdvisorItem[] {
  return tasks
    .filter((t) => t.status !== 'done' && t.status !== 'verified')
    .map((t) => ({
      tool: 'geo-task',
      tier: 2,
      title: `Content task: "${t.query}"`,
      detail: `${t.rankingUrl.replace(/^https?:\/\/[^/]+/, '')} · status: ${t.status}`,
      score: t.score,
      sourceLink: `/geo/action/${encodeURIComponent(t.actionId)}`,
    }));
}

export function rankAdvisorItems(items: AdvisorItem[]): AdvisorItem[] {
  return [...items].sort((a, b) => (a.tier - b.tier) || (b.score - a.score));
}

export const TOOL_LABEL: Record<AdvisorItem['tool'], string> = {
  'anomaly':   'Alerts',
  'pareto':    'Search Opportunities',
  'title-bot': 'Title Optimization',
  'geo-task':  'Content Task',
};
