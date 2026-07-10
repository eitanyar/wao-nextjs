import fs                  from 'fs';
import path                from 'path';
import { cookies }         from 'next/headers';
import { redirect }        from 'next/navigation';
import Link                from 'next/link';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { getClientActions } from '@/lib/geo/actions';
import { getClientRecord }  from '@/lib/geo/client';
import {
  adaptAnomalies,
  adaptParetoOpportunities,
  adaptTitleBotSuggestions,
  adaptGeoTasks,
  rankAdvisorItems,
  TOOL_LABEL,
} from '@/lib/advisor';

// ---------------------------------------------------------------------------
// Title-bot section — entitlement-gated, read-only display.
//
// Convention (per Lior, mission-planner): every bot has two possible
// entitlement strings — "{bot}:internal" (WAO-eyes-only review) and
// "{bot}" (graduated, client-facing). Both render this section for now;
// graduation from :internal to plain just means the same UI is shown to
// the client too — no code change needed when that happens later.
// ---------------------------------------------------------------------------
function hasEntitlement(entitlements: string[] | undefined, bot: string): boolean {
  if (!entitlements) return false;
  return entitlements.includes(`${bot}:internal`) || entitlements.includes(bot);
}

interface TitleBotCandidate {
  rank: number;
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  currentCtr: number;
  expectedCtrAtPosition: number;
  queryType?: string;
  ctrGap: number;
  directionalPriorityScore?: number;
  estimatedLostClicks?: number; // pre-fix field name, tolerated for old files
  suggestedTitle: string | null;
  status: string;
}

interface TitleBotSkippedRow {
  query: string;
  page: string;
  reasons: string[];
}

interface TitleBotSuggestions {
  site: string | null;
  generatedAt: string;
  ctrCurveSource: string;
  stats: Record<string, number>;
  candidates: TitleBotCandidate[];
  skippedForCannibalization: TitleBotSkippedRow[];
}

function loadTitleSuggestions(clientId: string): TitleBotSuggestions | null {
  const file = path.join(process.cwd(), 'data', 'clients', clientId, 'title-suggestions.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pareto (search-opportunity) section — raw GSC-derived diagnosis, read-only.
// This is the analyst-level data that title-bot's suggestions are derived
// from. Gated on "pareto:internal" / "pareto" per the same entitlement
// convention as title-bot.
// ---------------------------------------------------------------------------
interface ParetoCannibalUrl {
  url: string;
  impressions: number;
  position: number;
}

interface ParetoOpportunity {
  rank: number;
  query: string;
  rankingUrl: string;
  implementationMode: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  score: number;
  intentScore?: number | null;
  intentFlag?: string | null;
  intentReason?: string | null;
  priority: string;
  actionType: string;
  cannibalFlag?: string;
  cannibalReasons?: string[];
  cannibalUrls?: ParetoCannibalUrl[];
}

interface ParetoData {
  site: string;
  generatedAt: string;
  period: { startDate: string; endDate: string; days: number };
  totalInRange: number;
  opportunities: ParetoOpportunity[];
}

function loadParetoData(clientId: string): ParetoData | null {
  const file = path.join(process.cwd(), 'data', 'clients', clientId, 'pareto.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Anomaly-Check (Alerts) section — flags meaningful clicks/impressions drops
// per page/query vs. a trailing 7-day baseline. Dashboard-only for now — no
// push/WhatsApp notification (confirmed scope). Gated on "anomaly:internal" /
// "anomaly" per the same entitlement convention as the other bots.
//
// Warm-up is expected: a fresh pilot has 0-1 GSC snapshots on file, so the
// script degrades gracefully to a "collecting data" status rather than
// erroring or showing an empty table.
// ---------------------------------------------------------------------------
interface AnomalyRow {
  dimension: 'pages' | 'queries';
  key: string;
  baselineClicks: number;
  currentClicks: number;
  clicksChangePct: number;
  baselineImpressions: number;
  currentImpressions: number;
  impressionsChangePct: number;
  direction: string;
  flaggedOn: string;
}

interface AnomalyData {
  status: 'warming_up' | 'ok';
  snapshotsCollected: number;
  snapshotsNeeded?: number;
  generatedAt?: string;
  anomalies: AnomalyRow[];
}

function loadAnomalyData(clientId: string): AnomalyData | null {
  const file = path.join(process.cwd(), 'data', 'clients', clientId, 'anomalies.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// SEO/Ads Overlap section — queries where the client already ranks organic
// position 1-3 with meaningful traffic, candidates for a defensive/incremental
// paid search ad. Gated on "ads-overlap:internal" / "ads-overlap" per the same
// entitlement convention as the other bots. Read-only display of
// scripts/ads-overlap.mjs's output, including its fast template-based draft
// ad fields (draftHeadlines/draftDescriptions) — explicitly a rough starting
// point, not launch-ready copy.
// ---------------------------------------------------------------------------
interface AdsOverlapOpportunity {
  rank: number;
  query: string;
  page: string;
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  score: number;
  ctr_flag?: string;
  brand_match?: string;
  brand_match_token?: string;
  recommendedMatchType: string;
  recommendedDailyBudgetILS: number;
  recommendedBiddingStrategy: string;
  draftHeadlines: string[];
  draftDescriptions: string[];
  draftStatus: string;
}

interface AdsOverlapData {
  site: string;
  generatedAt: string;
  period: { startDate: string; endDate: string; days: number };
  totalInRange: number;
  distinctLandingPageCount?: number;
  sitelinksViable?: boolean;
  opportunities: AdsOverlapOpportunity[];
}

function loadAdsOverlapData(clientId: string): AdsOverlapData | null {
  const file = path.join(process.cwd(), 'data', 'clients', clientId, 'ads-overlap.json');
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export const metadata = { robots: { index: false }, title: 'המשימות שלי | WAO' };

const PRIORITY_ORDER = { HIGH: 0, MEDIUM: 1, LOW: 2 };

const STATUS_LABEL: Record<string, string> = {
  generated: 'ממתין',
  sent:      'נשלח',
  approved:  'אושר',
  published: 'פורסם',
  verified:  'אומת',
  done:      'בוצע ✓',
};

const STATUS_COLOR: Record<string, string> = {
  generated: 'text-yellow-400 bg-yellow-500/15',
  sent:      'text-blue-400  bg-blue-500/15',
  approved:  'text-purple-400 bg-purple-500/15',
  published: 'text-cyan-400  bg-cyan-500/15',
  verified:  'text-green-400 bg-green-500/15',
  done:      'text-green-400 bg-green-500/15',
};

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   'bg-red-400',
  MEDIUM: 'bg-yellow-400',
  LOW:    'bg-green-400',
};

export default async function DashboardPage() {
  const jar      = await cookies();
  const token    = jar.get(COOKIE_NAME)?.value ?? '';
  const clientId = await verifySessionToken(token);
  if (!clientId) redirect('/client/login');

  const clientRecord   = getClientRecord(clientId);
  const showTitleBot   = hasEntitlement(clientRecord?.entitlements, 'title-bot');
  const titleBotData   = showTitleBot ? loadTitleSuggestions(clientId) : null;
  const showPareto     = hasEntitlement(clientRecord?.entitlements, 'pareto');
  const paretoData     = showPareto ? loadParetoData(clientId) : null;
  const showAnomaly    = hasEntitlement(clientRecord?.entitlements, 'anomaly');
  const anomalyData    = showAnomaly ? loadAnomalyData(clientId) : null;
  const showAdsOverlap = hasEntitlement(clientRecord?.entitlements, 'ads-overlap');
  const adsOverlapData = showAdsOverlap ? loadAdsOverlapData(clientId) : null;

  const all     = getClientActions(clientId);
  const pending = all
    .filter(a => a.status !== 'done' && a.status !== 'verified')
    .sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.rank - b.rank);
  const done = all.filter(a => a.status === 'done' || a.status === 'verified');

  const totalDone = done.length;
  const pct       = all.length ? Math.round((totalDone / all.length) * 100) : 0;

  // ── Advisor bot (supervisor over the three tools above + geo tasks) ──────
  const showAdvisor = hasEntitlement(clientRecord?.entitlements, 'advisor');
  const advisorItems = showAdvisor
    ? rankAdvisorItems([
        ...adaptAnomalies(anomalyData),
        ...adaptParetoOpportunities(paretoData),
        ...adaptTitleBotSuggestions(titleBotData),
        ...adaptGeoTasks(all),
      ])
    : [];
  const [advisorTop, ...advisorRest] = advisorItems;

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 pt-8 pb-20" dir="rtl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">המשימות שלי</h1>
          <p className="text-[var(--muted)] text-sm mt-0.5">
            {pending.length} משימות פתוחות · {totalDone} בוצעו
          </p>
        </div>
        <span className="text-3xl font-black tracking-tight text-[var(--accent)]">WAO</span>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────── */}
      {all.length > 0 && (
        <div className="mb-8">
          <div className="flex justify-between text-xs text-[var(--muted)] mb-1.5">
            <span>התקדמות כוללת</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Pending tasks ───────────────────────────────────────────────── */}
      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            ממתין לביצוע
          </h2>
          <ul className="space-y-3">
            {pending.map((action) => (
              <li key={action.actionId}>
                <Link
                  href={`/geo/action/${encodeURIComponent(action.actionId)}`}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-4 hover:border-white/20 hover:bg-white/8 transition-all group"
                >
                  {/* Priority dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[action.priority]}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{action.query}</p>
                    <p className="text-[var(--muted)] text-xs mt-0.5 truncate">
                      {decodeURIComponent(action.rankingUrl.replace(/https?:\/\/[^/]+/, '') || '/')}
                    </p>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLOR[action.status] ?? ''}`}>
                    {STATUS_LABEL[action.status] ?? action.status}
                  </span>

                  {/* Arrow */}
                  <span className="text-[var(--muted)] group-hover:text-white transition-colors text-lg">←</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Done tasks ──────────────────────────────────────────────────── */}
      {done.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            בוצע
          </h2>
          <ul className="space-y-2">
            {done.map((action) => (
              <li key={action.actionId}>
                <Link
                  href={`/geo/action/${encodeURIComponent(action.actionId)}`}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/3 px-4 py-3 opacity-60 hover:opacity-80 transition-opacity"
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-green-400" />
                  <span className="flex-1 text-sm truncate line-through">{action.query}</span>
                  <span className="text-xs text-green-400">✓</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {all.length === 0 && (
        <div className="text-center py-20 text-[var(--muted)]">
          <p className="text-4xl mb-4">📋</p>
          <p>אין משימות עדיין. WAO יעדכן אותך בקרוב.</p>
        </div>
      )}

      {/* ── Next Recommendation (advisor bot, entitlement-gated, read-only) ── */}
      {/* Supervisor over Alerts / Search Opportunities / Title Optimization  */}
      {/* (+ open geo content tasks). Not a fourth silo — it ranks items      */}
      {/* already produced by those tools (tier 1 = anomalies, tier 2 =      */}
      {/* opportunities) and surfaces the single top recommendation first,   */}
      {/* with the detailed tool sections still below for drill-down.        */}
      {showAdvisor && (
        <section className="mt-12" dir="ltr">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Next Recommendation
          </h2>
          <p dir="rtl" lang="he" className="text-sm text-[var(--foreground)]/90 leading-relaxed mb-2 max-w-xl">
            במקום לנחש מה קודם, אנחנו מציגים לך את הפעולה החשובה ביותר עכשיו. הדחוף מופיע ראשון, וכל השאר מדורג מתחת.
          </p>
          <p className="text-[10px] text-[var(--muted)] mb-4 max-w-xl">
            Internal preview — cross-tool ranked recommendation (Alerts, Search Opportunities,
            Title Optimization, open content tasks). Tier 1 (alerts) always ranks above
            tier 2 (opportunities). Read-only, no actions taken automatically.
          </p>

          {advisorItems.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-[var(--muted)]">
              All quiet — no active recommendations right now.
            </div>
          ) : (
            <>
              {advisorTop && (
                <a
                  href={advisorTop.sourceLink ?? '#'}
                  className="block rounded-xl border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-4 py-4 mb-3 hover:border-[var(--accent)]/70 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-[var(--accent)] bg-[var(--accent)]/15">
                      {TOOL_LABEL[advisorTop.tool]}
                    </span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {advisorTop.tier === 1 ? 'Alert' : 'Opportunity'}
                    </span>
                  </div>
                  <p className="font-semibold">{advisorTop.title}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">{advisorTop.detail}</p>
                </a>
              )}

              {advisorRest.length > 0 && (
                <ul className="space-y-2">
                  {advisorRest.map((item, i) => (
                    <li key={i}>
                      <a
                        href={item.sourceLink ?? '#'}
                        className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 hover:bg-white/8 transition-all"
                      >
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full text-[var(--muted)] bg-white/10 flex-shrink-0">
                          {TOOL_LABEL[item.tool]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.title}</p>
                          <p className="text-[10px] text-[var(--muted)] truncate">{item.detail}</p>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Alerts (anomaly-check, entitlement-gated, read-only) ──────────── */}
      {/* Placed above Search Opportunities: anomalies are the most         */}
      {/* time-sensitive, attention-grabbing signal — a drop needs eyes     */}
      {/* before a slow-burn opportunity list.                              */}
      {showAnomaly && anomalyData && (
        <section className="mt-12" dir="ltr">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Alerts
          </h2>
          <p dir="rtl" lang="he" className="text-sm text-[var(--foreground)]/90 leading-relaxed mb-2 max-w-xl">
            אנחנו משווים כל יום את התנועה מגוגל מול השבוע האחרון. אם משהו צנח, תדע כאן מיד — לא בעוד חודש בדוח.
          </p>
          <p className="text-[10px] text-[var(--muted)] mb-4 max-w-xl">
            Internal preview — clicks/impressions drops vs. a trailing baseline (GSC data).
            Dashboard-only for now, read-only, no notifications sent.
          </p>

          {anomalyData.status === 'warming_up' ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center">
              <p className="text-2xl mb-2">📡</p>
              <p className="text-sm">
                Monitoring started — {anomalyData.snapshotsCollected}/{anomalyData.snapshotsNeeded ?? 2} snapshots collected, check back soon.
              </p>
            </div>
          ) : anomalyData.anomalies.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-[var(--muted)]">
              No anomalies detected — clicks and impressions are within normal range.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] text-[var(--muted)] border-b border-white/10">
                    <th className="py-2 px-2">Type</th>
                    <th className="py-2 px-2">Page / Query</th>
                    <th className="py-2 px-2">Baseline clicks</th>
                    <th className="py-2 px-2">Current clicks</th>
                    <th className="py-2 px-2">Baseline impr.</th>
                    <th className="py-2 px-2">Current impr.</th>
                    <th className="py-2 px-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalyData.anomalies.map((a, i) => (
                    <tr key={`${a.dimension}-${a.key}-${i}`} className="border-b border-white/5">
                      <td className="py-2 px-2">{a.dimension === 'pages' ? 'Page' : 'Query'}</td>
                      <td className="py-2 px-2 max-w-[12rem] truncate font-medium">{a.key}</td>
                      <td className="py-2 px-2">{a.baselineClicks}</td>
                      <td className="py-2 px-2">{a.currentClicks}</td>
                      <td className="py-2 px-2">{a.baselineImpressions}</td>
                      <td className="py-2 px-2">{a.currentImpressions}</td>
                      <td className="py-2 px-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-red-400 bg-red-500/15">
                          ↓ {Math.min(a.clicksChangePct, a.impressionsChangePct)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ── Search Opportunities (pareto, entitlement-gated, read-only) ───── */}
      {showPareto && paretoData && (
        <section className="mt-12" dir="ltr">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Search Opportunities
          </h2>
          <p dir="rtl" lang="he" className="text-sm text-[var(--foreground)]/90 leading-relaxed mb-2 max-w-xl">
            אלה מילות החיפוש שבהן האתר שלך כמעט מנצח — מדורג יפה, אבל לא בפסגה. תמצא כאן איפה הכי משתלם להשקיע.
          </p>
          <p className="text-[10px] text-[var(--muted)] mb-4 max-w-xl">
            Internal preview — raw GSC opportunity diagnosis (Pareto analysis).
            Analyst view, unfiltered. Rows flagged for cannibalization are shown, not hidden.
          </p>

          <div className="flex gap-3 text-xs text-[var(--muted)] mb-4 flex-wrap">
            <span className="rounded-full border border-white/10 px-3 py-1">
              period: {paretoData.period.startDate} → {paretoData.period.endDate}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              total queries: {paretoData.totalInRange}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              opportunities: {paretoData.opportunities.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[10px] text-[var(--muted)] border-b border-white/10">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Query</th>
                  <th className="py-2 px-2">Page</th>
                  <th className="py-2 px-2">Pos</th>
                  <th className="py-2 px-2">Impr.</th>
                  <th className="py-2 px-2">CTR</th>
                  <th className="py-2 px-2">Score</th>
                  <th className="py-2 px-2">Priority</th>
                  <th className="py-2 px-2">Flags</th>
                </tr>
              </thead>
              <tbody>
                {paretoData.opportunities.map(o => (
                  <tr key={`${o.query}-${o.rankingUrl}`} className="border-b border-white/5">
                    <td className="py-2 px-2">{o.rank}</td>
                    <td className="py-2 px-2 font-medium">{o.query}</td>
                    <td className="py-2 px-2 max-w-[10rem] truncate">
                      {o.rankingUrl.replace(/^https?:\/\/[^/]+/, '')}
                    </td>
                    <td className="py-2 px-2">{o.position}</td>
                    <td className="py-2 px-2">{o.impressions.toLocaleString()}</td>
                    <td className="py-2 px-2">{(o.ctr * 100).toFixed(1)}%</td>
                    <td className="py-2 px-2 font-semibold">{o.score.toLocaleString()}</td>
                    <td className="py-2 px-2">{o.priority}</td>
                    <td className="py-2 px-2">
                      {o.cannibalReasons?.length ? (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-red-400 bg-red-500/15"
                          title={o.cannibalUrls?.map(u => `${u.url} (pos ${u.position}, ${u.impressions} impr.)`).join('; ')}
                        >
                          ⚠ {o.cannibalReasons.join(', ')}
                        </span>
                      ) : (
                        <span className="text-[var(--muted)]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── SEO/Ads Overlap (ads-overlap, entitlement-gated, read-only) ───── */}
      {/* Placed right after Search Opportunities: both mine GSC query data,  */}
      {/* just opposite position windows — this one is "already winning       */}
      {/* organically, worth a defensive/incremental paid ad" rather than     */}
      {/* "close to winning, worth an SEO push".                              */}
      {showAdsOverlap && adsOverlapData && (
        <section className="mt-12" dir="ltr">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Ads Overlap
          </h2>
          <p dir="rtl" lang="he" className="text-sm text-[var(--foreground)]/90 leading-relaxed mb-2 max-w-xl">
            במילים האלה אתה כבר מנצח בגוגל האורגני. השאלה היא אם משתלם גם להריץ עליהן מודעה ממומנת — להגן על השטח או לתפוס קליקים נוספים.
          </p>
          <p className="text-[10px] text-[var(--muted)] mb-4 max-w-xl">
            Internal preview — GSC queries already ranking organic position 1-3 with meaningful
            traffic (SEO/Ads Overlap analysis). Read-only, no Google Ads API calls made.
            draftHeadlines/draftDescriptions are fast, deterministic, template-based rough
            drafts from client.json — not launch-ready copy.
          </p>

          <div className="flex gap-3 text-xs text-[var(--muted)] mb-4 flex-wrap">
            <span className="rounded-full border border-white/10 px-3 py-1">
              period: {adsOverlapData.period.startDate} → {adsOverlapData.period.endDate}
            </span>
            <span className="rounded-full border border-white/10 px-3 py-1">
              opportunities: {adsOverlapData.opportunities.length}
            </span>
            {typeof adsOverlapData.distinctLandingPageCount === 'number' && (
              <span className="rounded-full border border-white/10 px-3 py-1" title="Informational only — sitelinks are not generated by this tool (v1)">
                distinct pages: {adsOverlapData.distinctLandingPageCount}
                {adsOverlapData.sitelinksViable ? ' (sitelinks-viable)' : ''}
              </span>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[10px] text-[var(--muted)] border-b border-white/10">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Query</th>
                  <th className="py-2 px-2">Page</th>
                  <th className="py-2 px-2">Pos</th>
                  <th className="py-2 px-2">Impr.</th>
                  <th className="py-2 px-2">Clicks</th>
                  <th className="py-2 px-2">CTR</th>
                  <th className="py-2 px-2">Flags</th>
                  <th className="py-2 px-2">Match type</th>
                  <th className="py-2 px-2">Budget/day</th>
                  <th className="py-2 px-2">Bidding</th>
                  <th className="py-2 px-2">Draft ad</th>
                </tr>
              </thead>
              <tbody>
                {adsOverlapData.opportunities.map(o => (
                  <tr key={`${o.query}-${o.page}`} className="border-b border-white/5 align-top">
                    <td className="py-2 px-2">{o.rank}</td>
                    <td className="py-2 px-2 font-medium max-w-[10rem]" dir="rtl" lang="he">{o.query}</td>
                    <td className="py-2 px-2 max-w-[10rem] truncate">
                      {o.page.replace(/^https?:\/\/[^/]+/, '')}
                    </td>
                    <td className="py-2 px-2">{o.position}</td>
                    <td className="py-2 px-2">{o.impressions.toLocaleString()}</td>
                    <td className="py-2 px-2">{o.clicks.toLocaleString()}</td>
                    <td className="py-2 px-2">{o.ctr}%</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-col gap-1">
                        {o.ctr_flag && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-red-400 bg-red-500/15 w-fit">
                            ⚠ {o.ctr_flag}
                          </span>
                        )}
                        {o.brand_match && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-yellow-400 bg-yellow-500/15 w-fit"
                            title={`matched token: ${o.brand_match_token}`}
                          >
                            🏷 brand
                          </span>
                        )}
                        {!o.ctr_flag && !o.brand_match && <span className="text-[var(--muted)]">—</span>}
                      </div>
                    </td>
                    <td className="py-2 px-2">{o.recommendedMatchType}</td>
                    <td className="py-2 px-2">₪{o.recommendedDailyBudgetILS}</td>
                    <td className="py-2 px-2 max-w-[9rem] truncate" title={o.recommendedBiddingStrategy}>
                      {o.recommendedBiddingStrategy}
                    </td>
                    <td className="py-2 px-2 max-w-[16rem]">
                      {o.draftStatus === 'PENDING_BUSINESS_DETAILS' ? (
                        <span className="text-[10px] text-[var(--muted)]">
                          Pending business details in client.json
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <div dir="rtl" lang="he" className="space-y-0.5">
                            {o.draftHeadlines.map((h, i) => (
                              <p key={i} className="truncate">{h}</p>
                            ))}
                          </div>
                          <div dir="rtl" lang="he" className="text-[var(--muted)] space-y-0.5 border-t border-white/5 pt-1">
                            {o.draftDescriptions.map((d, i) => (
                              <p key={i} className="truncate">{d}</p>
                            ))}
                          </div>
                          <span className="text-[9px] text-[var(--muted)]">
                            AUTO_DRAFT — rough, replace before use
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Title Optimization (title-bot, entitlement-gated, read-only) ──── */}
      {showTitleBot && titleBotData && (
        <section className="mt-12" dir="ltr">
          <h2 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Title Optimization
          </h2>
          <p dir="rtl" lang="he" className="text-sm text-[var(--foreground)]/90 leading-relaxed mb-2 max-w-xl">
            כותרות שמושכות פחות קליקים ממה שמגיע להן לפי הדירוג בגוגל. תקבל כאן ניסוח כותרת חדש — לרוב זה כל מה שצריך.
          </p>
          <p className="text-[10px] text-[var(--muted)] mb-4 max-w-xl">
            Internal preview — ranked title-rewrite candidates from GSC data.
            Ranking signal only, not a click guarantee. Read-only for now.
          </p>

          <div className="flex gap-3 text-xs text-[var(--muted)] mb-4 flex-wrap">
            {Object.entries(titleBotData.stats).map(([k, v]) => (
              <span key={k} className="rounded-full border border-white/10 px-3 py-1">{k}: {v}</span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-left text-[10px] text-[var(--muted)] border-b border-white/10">
                  <th className="py-2 px-2">#</th>
                  <th className="py-2 px-2">Query</th>
                  <th className="py-2 px-2">Page</th>
                  <th className="py-2 px-2">Pos</th>
                  <th className="py-2 px-2">Impr.</th>
                  <th className="py-2 px-2">CTR now</th>
                  <th className="py-2 px-2">CTR exp.</th>
                  <th className="py-2 px-2">Priority score</th>
                </tr>
              </thead>
              <tbody>
                {titleBotData.candidates.map(c => (
                  <tr key={`${c.query}-${c.page}`} className="border-b border-white/5">
                    <td className="py-2 px-2">{c.rank}</td>
                    <td className="py-2 px-2 font-medium">{c.query}</td>
                    <td className="py-2 px-2 max-w-[10rem] truncate">
                      {c.page.replace(/^https?:\/\/[^/]+/, '')}
                    </td>
                    <td className="py-2 px-2">{c.position}</td>
                    <td className="py-2 px-2">{c.impressions.toLocaleString()}</td>
                    <td className="py-2 px-2">{c.currentCtr}%</td>
                    <td className="py-2 px-2">{c.expectedCtrAtPosition}%</td>
                    <td className="py-2 px-2 font-semibold">
                      {c.directionalPriorityScore ?? c.estimatedLostClicks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {titleBotData.skippedForCannibalization?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                Skipped — cannibalization ({titleBotData.skippedForCannibalization.length})
              </h3>
              <ul className="text-xs space-y-1 text-[var(--muted)]">
                {titleBotData.skippedForCannibalization.map((s, i) => (
                  <li key={i}>
                    <span className="font-medium">{s.query}</span> — {s.reasons.join(', ')}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

    </main>
  );
}
