import fs from 'fs';
import path from 'path';

export interface LeadRecord {
  id: number;
  orderId?: string;
  name?: string | null;
  phone?: string | null;
  date?: string;
  status?: string;
  quality?: string;
  revenue?: number;
  closed?: boolean;
  closedAt?: string | null;
  type?: string;
  source?: string;
  slug?: string;
  customerId?: string;
  gclid?: string | null;
  wbraid?: string | null;
  gbraid?: string | null;
  businessNiche?: string;
}

export interface CampaignConfig {
  clientId?: string;
  mode?: 'test' | 'live';
  customerId: string;
  slug: string;
  businessName?: string;
  businessNiche?: string;
  targetLocation?: string;
  targetDailyBudget?: number;
  targetMonthlyBudget?: number;
  avgJobValue: number;
  closeRateEstimate: number;
  verifiedLeadConversionResourceName: string | null;
  closedDealConversionResourceName: string | null;
  adGroupResourceName?: string;
  createdAt: string;
}

export interface GoogleAdsCampaignLink {
  slug: string;
  customerId: string;
  campaignId: string;
  createdAt: string;
  finalUrl?: string;
}

export interface GoogleAdsClientIndex {
  clientId: string;
  primarySlug: string;
  primaryCustomerId: string;
  primaryCampaignId: string;
  updatedAt: string;
  campaigns: GoogleAdsCampaignLink[];
}

export interface PerformanceSnapshot {
  impressions?: number;
  clicks?: number;
  spendMicros?: number;
}

export interface DigestAlert {
  type: 'no_leads' | 'no_conversions' | 'budget_pacing' | 'data_quality';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

export interface WeeklyDigest {
  slug: string;
  customerId: string;
  campaignName: string;
  windowDays: number;
  windowStart: string;
  windowEnd: string;
  totals: {
    leads: number;
    verifiedLeads: number;
    closedDeals: number;
    revenue: number;
    newLeads: number;
    previousLeads: number;
    leadChangePct: number | null;
    revenueChangePct: number | null;
  };
  pacing: {
    mode: 'live' | 'estimated';
    expectedWeeklyLeads: number;
    actualWeeklyLeads: number;
    deviationPct: number;
    status: 'under' | 'on_track' | 'over';
  };
  alerts: DigestAlert[];
  nextActions: string[];
}

const LEADS_PATH = path.join(process.cwd(), 'src', 'data', 'leads.json');
const DEFAULT_WINDOW_DAYS = 7;
const CAMPAIGNS_DIR = path.join(process.cwd(), 'data', 'campaigns');
const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function readLeads(): LeadRecord[] {
  try {
    const raw = fs.readFileSync(LEADS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as LeadRecord[] : [];
  } catch {
    return [];
  }
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(-999, Math.min(999, n));
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return clampPct(((current - previous) / previous) * 100);
}

function estimateWeeklyLeadTarget(campaign: CampaignConfig): number {
  const dailyBudget = campaign.targetDailyBudget ?? Math.max(0, Math.round((campaign.targetMonthlyBudget ?? 0) / 30.4));
  const avgJobValue = campaign.avgJobValue || 500;
  const closeRate = Math.max(0.05, Math.min(campaign.closeRateEstimate || 0.2, 0.8));
  const assumedCostPerLead = Math.max(45, Math.round(avgJobValue * closeRate * 0.3));
  const raw = Math.round((dailyBudget * 7) / assumedCostPerLead);
  return Math.max(1, raw);
}

function buildPacing(campaign: CampaignConfig, leadsInWindow: number, live?: PerformanceSnapshot) {
  if (live?.spendMicros && campaign.targetDailyBudget) {
    const budgetMicros = campaign.targetDailyBudget * 7 * 1_000_000;
    const spendPct = (live.spendMicros / budgetMicros) * 100;
    const deviationPct = clampPct(spendPct - 100);
    return {
      mode: 'live' as const,
      expectedWeeklyLeads: estimateWeeklyLeadTarget(campaign),
      actualWeeklyLeads: leadsInWindow,
      deviationPct,
      status: deviationPct > 20 ? 'over' as const : deviationPct < -20 ? 'under' as const : 'on_track' as const,
    };
  }

  const expectedWeeklyLeads = estimateWeeklyLeadTarget(campaign);
  const deviationPct = expectedWeeklyLeads === 0 ? 0 : ((leadsInWindow - expectedWeeklyLeads) / expectedWeeklyLeads) * 100;
  return {
    mode: 'estimated' as const,
    expectedWeeklyLeads,
    actualWeeklyLeads: leadsInWindow,
    deviationPct: clampPct(deviationPct),
    status: deviationPct < -20 ? 'under' as const : deviationPct > 20 ? 'over' as const : 'on_track' as const,
  };
}

function buildAlerts(
  campaign: CampaignConfig,
  windowLeads: LeadRecord[],
  previousLeads: LeadRecord[],
  pacing: ReturnType<typeof buildPacing>
): DigestAlert[] {
  const alerts: DigestAlert[] = [];

  if (windowLeads.length === 0) {
    alerts.push({
      type: 'no_leads',
      severity: 'critical',
      title: 'No leads in the selected window',
      message: 'There were no leads in the last window. Check the landing page, search terms, and phone/form tracking immediately.',
    });
  }

  const closedCount = windowLeads.filter(lead => Boolean(lead.closed) || lead.status === 'סגור' || lead.status === 'closed').length;
  const verifiedCount = windowLeads.filter(lead => lead.quality === 'GOOD').length;
  if (windowLeads.length >= 3 && closedCount === 0) {
    alerts.push({
      type: 'no_conversions',
      severity: 'warning',
      title: 'Leads are coming in, but nothing is closing',
      message: 'Leads exist in the current window, but no closed deals were logged. Review call handling, follow-up speed, and lead quality.',
    });
  }

  if (pacing.status !== 'on_track') {
    alerts.push({
      type: 'budget_pacing',
      severity: pacing.status === 'over' ? 'warning' : 'info',
      title: pacing.status === 'over' ? 'Budget pacing is above target' : 'Budget pacing is below target',
      message: `Current pacing is ${pacing.deviationPct.toFixed(1)}% versus target. Estimated weekly target: ${pacing.expectedWeeklyLeads} leads; actual: ${pacing.actualWeeklyLeads}.`,
    });
  }

  if (verifiedCount === 0 && previousLeads.length > 0 && windowLeads.length > 0) {
    alerts.push({
      type: 'data_quality',
      severity: 'info',
      title: 'No verified leads yet',
      message: 'No leads were marked GOOD in this window. If these are real leads, the CRM review workflow may need attention.',
    });
  }

  if (campaign.targetDailyBudget && campaign.targetDailyBudget < 100) {
    alerts.push({
      type: 'budget_pacing',
      severity: 'info',
      title: 'Very small daily budget',
      message: 'The target daily budget is very tight. This will limit volume and make the learning window longer.',
    });
  }

  return alerts;
}

export function buildWeeklyDigest(input: {
  campaign: CampaignConfig;
  leads?: LeadRecord[];
  now?: Date;
  windowDays?: number;
  performance?: PerformanceSnapshot;
}): WeeklyDigest {
  const leads = input.leads ?? readLeads();
  const now = input.now ?? new Date();
  const windowDays = input.windowDays ?? DEFAULT_WINDOW_DAYS;
  const windowStart = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(windowStart.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const scopedLeads = leads.filter(lead => !lead.slug || lead.slug === input.campaign.slug || lead.customerId === input.campaign.customerId);
  const windowLeads = scopedLeads.filter(lead => {
    const leadDate = parseDate(lead.closedAt || lead.date || null);
    return leadDate ? leadDate >= windowStart && leadDate <= now : false;
  });
  const previousLeads = scopedLeads.filter(lead => {
    const leadDate = parseDate(lead.closedAt || lead.date || null);
    return leadDate ? leadDate >= previousStart && leadDate < windowStart : false;
  });

  const revenue = windowLeads.reduce((sum, lead) => sum + (Number(lead.revenue) || 0), 0);
  const previousRevenue = previousLeads.reduce((sum, lead) => sum + (Number(lead.revenue) || 0), 0);
  const verifiedLeads = windowLeads.filter(lead => lead.quality === 'GOOD').length;
  const closedDeals = windowLeads.filter(lead => Boolean(lead.closed) || lead.status === 'סגור' || lead.status === 'closed').length;

  const pacing = buildPacing(input.campaign, windowLeads.length, input.performance);
  const alerts = buildAlerts(input.campaign, windowLeads, previousLeads, pacing);

  const nextActions: string[] = [];
  if (windowLeads.length === 0) {
    nextActions.push('Audit the landing page and conversion tracking first.');
  } else {
    nextActions.push('Review the latest leads and mark good ones quickly so offline conversion uploads stay current.');
  }
  if (closedDeals === 0 && windowLeads.length > 0) {
    nextActions.push('Call or message new leads faster; the bottleneck is likely follow-up speed or offer clarity.');
  }
  if (pacing.status === 'under') {
    nextActions.push('Consider broadening keyword coverage or lifting budget if the economics still work.');
  }
  if (pacing.status === 'over') {
    nextActions.push('Tighten negatives and check search terms before scaling spend further.');
  }

  if (!nextActions.length) {
    nextActions.push('Keep the current setup and watch the next 7-day window.');
  }

  return {
    slug: input.campaign.slug,
    customerId: input.campaign.customerId,
    campaignName: input.campaign.businessName || input.campaign.slug,
    windowDays,
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    totals: {
      leads: windowLeads.length,
      verifiedLeads,
      closedDeals,
      revenue,
      newLeads: windowLeads.length,
      previousLeads: previousLeads.length,
      leadChangePct: pctChange(windowLeads.length, previousLeads.length),
      revenueChangePct: pctChange(revenue, previousRevenue),
    },
    pacing,
    alerts,
    nextActions,
  };
}

export function loadCampaignConfigBySlug(slug: string): CampaignConfig | null {
  try {
    const configPath = path.join(CAMPAIGNS_DIR, `${slug}.json`);
    const raw = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(raw) as CampaignConfig;
    return parsed && parsed.slug ? parsed : null;
  } catch {
    return null;
  }
}

export function loadClientGoogleAdsIndex(clientId: string): GoogleAdsClientIndex | null {
  try {
    const indexPath = path.join(CLIENTS_DIR, clientId, 'google-ads.json');
    if (!fs.existsSync(indexPath)) return null;
    const raw = fs.readFileSync(indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as GoogleAdsClientIndex;
    return parsed && parsed.clientId ? parsed : null;
  } catch {
    return null;
  }
}

export function saveClientGoogleAdsIndex(index: GoogleAdsClientIndex): void {
  const indexPath = path.join(CLIENTS_DIR, index.clientId, 'google-ads.json');
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

export function bindCampaignToClient(params: {
  clientId: string;
  campaign: CampaignConfig;
  campaignId: string;
  finalUrl?: string;
}): GoogleAdsClientIndex {
  const existing = loadClientGoogleAdsIndex(params.clientId);
  const nextCampaign: GoogleAdsCampaignLink = {
    slug: params.campaign.slug,
    customerId: params.campaign.customerId,
    campaignId: params.campaignId,
    createdAt: params.campaign.createdAt,
    finalUrl: params.finalUrl,
  };

  const campaigns = [
    ...(existing?.campaigns || []).filter(item => item.slug !== params.campaign.slug),
    nextCampaign,
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const index: GoogleAdsClientIndex = {
    clientId: params.clientId,
    primarySlug: params.campaign.slug,
    primaryCustomerId: params.campaign.customerId,
    primaryCampaignId: params.campaignId,
    updatedAt: new Date().toISOString(),
    campaigns,
  };

  saveClientGoogleAdsIndex(index);
  return index;
}
