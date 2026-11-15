/**
 * /api/lead -> client CRM intake (Site Bot sites and Ads Bot LPs rendered by renderStaticHtml /
 * renderSitePages). Rehearsal runbook S11: a lead submitted on a client site must land under that
 * client in the client dashboard, independent of SMTP.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 *
 * Trust rule: the owning client is never read from the body. The body's `slug` only names a
 * candidate tenant; the tenant is resolved server-side from a known record (data/sites/{slug}.json
 * for a Site Bot site, data/campaigns/{slug}.json for an Ads LP) and the request Origin must be one
 * of that tenant's hosts. Otherwise the lead is kept for WAO only (slug / customerId cleared, so no
 * client view can match it) and the mismatch is logged.
 *
 * Pure orchestration: every read goes through the injected `TenantLookup` and `LeadsStore`.
 */

import type { LeadRecord } from './intelligence';
import type { LeadsStore } from './leadsStore';
import { captureLead } from './lead-capture';
import { isTenantSlug, ownerHostsOf, subdomainHost, type SiteHostingFields } from '../site-hosting/tenant';
import { httpsOriginHost } from '../site-hosting/leadOrigins';

/** Repeat form submits for the same client + phone inside this window are one lead. */
export const FORM_DEDUPE_WINDOW_MS = 120_000;

export type ClickType = 'phone-click' | 'whatsapp-click';

export interface LeadTenant {
  kind: 'site' | 'lp';
  slug: string;
  clientId: string;
  /** Hostnames whose https origin may submit for this tenant. */
  hosts: string[];
  /** Google Ads customer ids this tenant may legitimately carry on a lead. */
  customerIds: string[];
}

export interface TenantLookup {
  /** The Site Bot site record for `slug`, or null when there is none. */
  siteRecord(slug: string): (SiteHostingFields & { slug?: unknown }) | null;
  /** The Ads campaign config for an LP slug, or null. */
  campaign(slug: string): { clientId?: string; customerId?: string; slug?: string } | null;
  /** Customer ids of the client's bound Google Ads campaigns (empty when none). */
  clientCustomerIds(clientId: string): string[];
}

/** Resolve the tenant a slug names, from server-side records only. */
export function resolveLeadTenant(slug: unknown, lookup: TenantLookup): LeadTenant | null {
  if (!isTenantSlug(slug)) return null;
  const site = lookup.siteRecord(slug);
  if (site && (site.slug === undefined || site.slug === slug)) {
    // The Site Bot deploy bridge creates the dashboard client with clientId = slug
    // (src/app/api/site-bot/deploy/route.ts, ensureSiteBotClientRecord).
    return {
      kind: 'site',
      slug,
      clientId: slug,
      hosts: [...new Set([subdomainHost(slug), ...ownerHostsOf(site)])],
      customerIds: lookup.clientCustomerIds(slug),
    };
  }
  const campaign = lookup.campaign(slug);
  if (campaign && campaign.slug === slug && typeof campaign.clientId === 'string' && campaign.clientId) {
    // Ads LPs are published at {slug}.wao.co.il only (src/app/api/cloudflare-pages/deploy/route.ts).
    return {
      kind: 'lp',
      slug,
      clientId: campaign.clientId,
      hosts: [subdomainHost(slug)],
      customerIds: campaign.customerId ? [campaign.customerId] : [],
    };
  }
  return null;
}

export function originMatchesTenant(origin: string | null | undefined, tenant: LeadTenant): boolean {
  if (!origin) return false;
  const host = httpsOriginHost(origin);
  return host !== null && tenant.hosts.includes(host);
}

export interface FormLeadFields {
  name: string;
  phone?: string;
  email?: string;
  source: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

export interface LeadIntakeInput {
  kind: 'form' | 'click';
  /** Only for kind 'click'. */
  clickType?: ClickType;
  /** Validated contact fields; only for kind 'form'. */
  form?: FormLeadFields;
  slug?: string;
  customerId?: string;
  orderId?: string;
  source?: string;
  gclid?: string;
  wbraid?: string;
  gbraid?: string;
  origin: string | null;
}

export interface LeadIntakeResult {
  stored: boolean;
  /** False when an existing lead absorbed this submission (same orderId, or the dedupe window). */
  created: boolean;
  /** Set when the lead was assigned to a client CRM. */
  clientId?: string;
  tenantCheck?: 'origin_mismatch' | 'unknown_tenant';
  lead?: LeadRecord;
}

export interface LeadIntakeDependencies {
  store: LeadsStore;
  lookup: TenantLookup;
  now?: () => Date;
  log?: (message: string) => void;
}

function digits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D/g, '');
}

function isDuplicateForm(existing: LeadRecord, candidate: LeadRecord, now: number): boolean {
  if (existing.type !== 'form' || candidate.type !== 'form') return false;
  const sameOwner = candidate.clientId
    ? existing.clientId === candidate.clientId
    : !existing.clientId && existing.claimedSlug === candidate.claimedSlug;
  if (!sameOwner) return false;
  const phone = digits(candidate.phone);
  if (!phone || digits(existing.phone) !== phone) return false;
  return typeof existing.id === 'number' && now - existing.id >= 0 && now - existing.id < FORM_DEDUPE_WINDOW_MS;
}

/** One stable per-request log line; no personal data (no name / phone / email). */
function describe(input: LeadIntakeInput, tenant: LeadTenant | null): string {
  return `kind=${input.kind} slug=${JSON.stringify(input.slug ?? '')} origin=${JSON.stringify(input.origin ?? '')}`
    + (tenant ? ` tenant=${tenant.kind}:${tenant.clientId} hosts=${tenant.hosts.join(',')}` : ' tenant=none');
}

/**
 * Store a slugged /api/lead submission. Returns `stored: false` (nothing written) when the body
 * names no slug (main-site contact forms keep their email-only path) or when a click event cannot
 * be tied to a verified tenant (a click carries no contact, so an unassigned one is useless).
 */
export async function intakeSiteLead(input: LeadIntakeInput, deps: LeadIntakeDependencies): Promise<LeadIntakeResult> {
  if (!input.slug) return { stored: false, created: false };
  const log = deps.log ?? ((message: string) => console.warn(message));
  const tenant = resolveLeadTenant(input.slug, deps.lookup);
  const verified = tenant !== null && originMatchesTenant(input.origin, tenant);
  const tenantCheck = verified ? undefined : tenant ? 'origin_mismatch' as const : 'unknown_tenant' as const;
  if (!verified) log(`[api/lead] ${tenantCheck}: not assigned to a client CRM (${describe(input, tenant)})`);

  if (input.kind === 'click' && !verified) return { stored: false, created: false, tenantCheck };

  const now = (deps.now ?? (() => new Date()))();
  const customerId = verified && input.customerId && tenant!.customerIds.includes(input.customerId) ? input.customerId : '';

  return deps.store.updateLeads<LeadIntakeResult>((leads) => {
    if (input.orderId) {
      const existing = leads.find((lead) => lead.orderId === input.orderId);
      if (existing) {
        return { leads, result: { stored: true, created: false, clientId: existing.clientId, tenantCheck, lead: existing } };
      }
    }
    const ids = new Set(leads.map((lead) => lead.id));
    let id = now.getTime();
    while (ids.has(id)) id += 1;

    const isClick = input.kind === 'click';
    const { lead: captured } = captureLead({
      leads,
      now,
      id,
      body: isClick
        ? {
            // A tap event: no personal data at all (no name, phone, email, or ad click id).
            orderId: input.orderId,
            type: input.clickType,
            source: input.source,
            slug: tenant!.slug,
            customerId,
          }
        : {
            orderId: input.orderId,
            type: 'form',
            name: input.form!.name,
            phone: input.form!.phone,
            email: input.form!.email,
            source: input.form!.source,
            slug: verified ? tenant!.slug : '',
            customerId,
            gclid: input.gclid,
            wbraid: input.wbraid,
            gbraid: input.gbraid,
            utmSource: input.form!.utmSource,
            utmMedium: input.form!.utmMedium,
            utmCampaign: input.form!.utmCampaign,
          },
    });
    const lead: LeadRecord = verified
      ? { ...captured, clientId: tenant!.clientId }
      : { ...captured, claimedSlug: input.slug, tenantCheck };

    if (!isClick) {
      const duplicate = leads.find((existing) => isDuplicateForm(existing, lead, now.getTime()));
      if (duplicate) {
        return { leads, result: { stored: true, created: false, clientId: duplicate.clientId, tenantCheck, lead: duplicate } };
      }
    }
    return {
      leads: [...leads, lead],
      result: { stored: true, created: true, clientId: lead.clientId, tenantCheck, lead },
    };
  });
}
