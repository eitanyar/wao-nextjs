/**
 * Research-selected site renderer.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import type { CollectedData } from '../bot/prompts';
import type { PageBrief } from '../site-bot/research/pageBrief';
import type { PageClassification } from '../site-bot/research/pagePortfolio';
import { primaryCtaLabel, type SiteCopy } from './lpCopyPrompt';
import { CONTACT_TITLE_PREFIX } from './generationData';
import { heroAnchorMissing } from './copyGates';
import type { RenderSitePagesParams } from './renderSitePages';
import {
  assembleDocument,
  contacts,
  esc,
  leadFormSection,
  RESEARCHED_LEAD_FORM,
  localBusinessObject,
  pageHead,
  pageScript,
  renderSitePages,
  stickyHeader,
  trustBarSection,
} from './renderSitePages';
import { listedServedAreas } from '../site-bot/servedAreas';
import { RESEARCHED_SITE_LABELS } from './researchedSiteLabels';

const RESERVED_SEGMENTS = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap']);
const RENDERABLE_CLASSES = new Set<PageClassification>([
  'homepage', 'service_hub', 'money_service', 'qualified_service_area', 'trust', 'process', 'pricing', 'proof', 'supporting',
]);

export interface ResearchedSitePage {
  opportunityId: string;
  classification: PageClassification;
  targetPath: string;
  copy: SiteCopy;
  brief?: Pick<PageBrief, 'faqPolicy' | 'faqCandidates'>;
  areaServed?: { name: string; type?: 'City' | 'AdministrativeArea' | 'Place' };
  persistedSlug?: string;
  /** M2a.1 (C1): plain page name + city for the title formula, H1 rule, schema and link anchors. */
  seo?: ResearchedPageSeo;
}

export interface ResearchedPageSeo {
  /** Plain service name (money page) or trade (homepage). Never the hero hook. */
  name: string;
  /** Base city display name, or null. */
  city: string | null;
  /** Owner-stated places (schema areaServed), never widened. */
  serviceArea: string[];
}

export interface ResearchedSiteGraphEdge {
  fromId: string;
  toId: string;
}

export interface RenderResearchedSitePagesParams extends Omit<RenderSitePagesParams, 'copy'> {
  pages: ResearchedSitePage[];
  graphEdges?: ResearchedSiteGraphEdge[];
}

function normalizePath(value: string): string | null {
  const raw = value.trim().replace(/\\/g, '/');
  if (!raw || !raw.startsWith('/') || raw.includes('\0') || raw.includes('..')) return null;
  const parts = raw.split('/').filter(Boolean);
  if (!parts.length || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part) || RESERVED_SEGMENTS.has(part.toLowerCase()))) return null;
  return `/${parts.join('/')}`;
}

function validSlug(value: string | undefined): value is string {
  return Boolean(value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64 && !RESERVED_SEGMENTS.has(value));
}

function asciiToken(value: string): string {
  const tokens: string[] = [];
  for (const char of value.normalize('NFKD').toLowerCase()) {
    if (/[a-z0-9]/.test(char)) tokens.push(char);
    else if (/\s|[-_./]/.test(char)) tokens.push('-');
    else if (/\p{L}|\p{N}/u.test(char)) tokens.push(`u${char.codePointAt(0)!.toString(16)}`);
  }
  return tokens.join('').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Clean page slug (M2a.1, C3): the planned path segment itself (already a short, persisted,
 * unique English keyword slug, `-2` suffixed on collision), with no opportunity-ID suffix.
 * A valid persisted slug wins; a segment that is not a clean slug falls back to `svc-<hex>`.
 */
export function buildStablePageSlug(opportunityId: string, label: string, persistedSlug?: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(opportunityId)) throw new Error('Opportunity ID must be opaque.');
  if (validSlug(persistedSlug)) return persistedSlug;
  const base = asciiToken(label).slice(0, 64).replace(/-$/g, '');
  return validSlug(base) ? base : `svc-${Buffer.from(opportunityId).toString('hex').slice(0, 10)}`;
}

const RLM = '\u200F';
const HEBREW_BET = '\u05D1';
const HEBREW_LETTER = /[\u05D0-\u05EA]/;

/** "<name> b<city>" (Yonatan's formula). A city that does not start with a Hebrew letter takes a hyphen after the prefix. */
export function pageNameWithCity(name: string, city: string | null): string {
  const place = (city ?? '').trim();
  if (!place) return name.trim();
  return `${name.trim()} ${HEBREW_BET}${HEBREW_LETTER.test(place[0]) ? '' : '-'}${place}`;
}

/**
 * Title formula (C1, signed off by Yonatan): money page `<service> b<city> | <business>`,
 * homepage `<trade> b<city> | <business>`. Brand last, `|` separator. A Latin business
 * name is anchored with an RLM before ` | ` (CLAUDE.md `%s\u200F | WAO` technique).
 * Target <= RESEARCHED_TITLE_TARGET_CHARS; longer titles are returned unchanged (flagged by tests/eval).
 */
export const RESEARCHED_TITLE_TARGET_CHARS = 60;
export function buildResearchedPageTitle(name: string, city: string | null, businessName: string): string {
  const brand = businessName.trim();
  const head = pageNameWithCity(name, city);
  if (!brand) return head;
  return `${head}${HEBREW_LETTER.test(brand) ? '' : RLM} | ${brand}`;
}

/**
 * Contact page title (M2a.2, Yonatan, signed off): `<prefix> <trade> b<city> | <brand>`, RLM before
 * " | " only for a Latin brand; never the form headline, no em-dash. The prefix is Yonatan's
 * contactTitlePrefix (generationData.ts, scripted copy). Null without a trade.
 */
export function researchedContactTitle(trade: string, city: string | null, businessName: string): string | null {
  const name = trade.trim();
  return name ? buildResearchedPageTitle(`${CONTACT_TITLE_PREFIX} ${name}`, city, businessName) : null;
}

/**
 * H1 (C1): the hero hook only if it contains the page name and the city; otherwise name + city.
 * M2a.6 (Yonatan): the containment check is the H1 anchor gate's own (heroAnchorMissing: NFC + whitespace
 * normalisation), so a hook that passes the gate is never swapped; the swap stays as the safety net.
 */
export function researchedPageH1(hook: string, seo: ResearchedPageSeo | undefined): string {
  if (!seo) return hook;
  return heroAnchorMissing(hook, seo.name, seo.city) ? pageNameWithCity(seo.name, seo.city) : hook;
}

function outputPath(page: ResearchedSitePage): string | null {
  if (page.classification === 'homepage') return 'index.html';
  const path = normalizePath(page.targetPath);
  if (!path) return null;
  const parts = path.slice(1).split('/');
  const last = parts.pop()!;
  const stable = buildStablePageSlug(page.opportunityId, last, page.persistedSlug);
  return [...parts, `${stable}.html`].join('/');
}

function approvedFaqs(page: ResearchedSitePage): Array<{ q: string; a: string }> {
  if (page.brief?.faqPolicy === 'none') return [];
  const supported = new Map((page.brief?.faqCandidates ?? []).map(item => [`${item.question}\u0000${item.answer}`, item]));
  const seen = new Set<string>();
  return page.copy.faqItems.flatMap(item => {
    const key = `${item.q}\u0000${item.a}`;
    const canonical = item.q.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ');
    if (!supported.has(key) || !canonical || seen.has(canonical)) return [];
    seen.add(canonical);
    return [{ q: item.q, a: item.a }];
  });
}

function selectedPages(pages: ResearchedSitePage[]): ResearchedSitePage[] {
  const ids = new Set<string>();
  const paths = new Set<string>();
  return pages.filter(page => {
    const output = outputPath(page);
    if (!RENDERABLE_CLASSES.has(page.classification) || !output || ids.has(page.opportunityId) || paths.has(output)) return false;
    ids.add(page.opportunityId);
    paths.add(output);
    return true;
  });
}

function reachablePageIds(pages: ResearchedSitePage[], edges: ResearchedSiteGraphEdge[]): Set<string> {
  const home = pages.find(page => page.classification === 'homepage');
  if (!home) return new Set();
  const reachable = new Set([home.opportunityId]);
  const usableEdges = edges.filter(edge => pages.some(page => page.opportunityId === edge.fromId) && pages.some(page => page.opportunityId === edge.toId));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of usableEdges) {
      if (reachable.has(edge.fromId) && !reachable.has(edge.toId)) {
        reachable.add(edge.toId);
        changed = true;
      }
    }
  }
  return reachable;
}

function pageUrl(siteUrl: string, output: string): string {
  return output === 'index.html' ? `${siteUrl}/` : `${siteUrl}/${output}`;
}

/**
 * Links drawn on a page. With graph edges (research sites, C4) exactly the page's outgoing
 * edges, in edge order; the edges are built from the brief links, so brief links, graph
 * and navigation are one list. Without edges: the legacy hub/sibling behaviour.
 */
function navigationLinks(page: ResearchedSitePage, pages: ResearchedSitePage[], outputs: Map<string, string>, edges: ResearchedSiteGraphEdge[] = []): ResearchedSitePage[] {
  if (edges.length) {
    return edges.filter(edge => edge.fromId === page.opportunityId).flatMap(edge => {
      const target = pages.find(item => item.opportunityId === edge.toId);
      return target && outputs.has(target.opportunityId) ? [target] : [];
    });
  }
  if (page.classification === 'homepage') {
    const hub = pages.filter(item => item.classification === 'service_hub');
    return hub.length ? hub : pages.filter(item => item.classification !== 'homepage');
  }
  if (page.classification === 'service_hub') return pages.filter(item => item.classification === 'money_service' || item.classification === 'qualified_service_area');
  return pages.filter(item => item.opportunityId !== page.opportunityId && outputs.has(item.opportunityId)).slice(0, 3);
}

function schemaGraph(page: ResearchedSitePage, data: CollectedData, siteUrl: string, heroImageUrl: string, output: string): string {
  const { businessName } = contacts(data);
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const faq = approvedFaqs(page);
  const service: Record<string, unknown> = {
    '@type': 'Service',
    '@id': `${pageUrl(cleanUrl, output)}#service`,
    name: page.seo?.name ?? page.copy.heroHeadline,
    provider: { '@id': `${cleanUrl}/#business` },
    description: page.copy.heroSubheadline,
    ...(page.seo?.serviceArea.length
      ? { areaServed: page.seo.serviceArea.map(name => ({ '@type': 'City', name })) }
      : page.areaServed ? { areaServed: { '@type': page.areaServed.type ?? 'Place', name: page.areaServed.name } } : {}),
  };
  const business = page.seo
    ? localBusinessObject(data, businessName, cleanUrl, heroImageUrl, { ownerFactsOnly: true, areaServed: page.seo.serviceArea })
    : localBusinessObject(data, businessName, cleanUrl, heroImageUrl);
  const graph: Record<string, unknown>[] = [business, service];
  if (faq.length) graph.push({
    '@type': 'FAQPage',
    '@id': `${pageUrl(cleanUrl, output)}#faq`,
    mainEntity: faq.map(item => ({ '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } })),
  });
  return `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
}

/** Link anchor text (C1): the plain service name; the business name for the homepage. */
function anchorText(target: ResearchedSitePage, businessName: string): string {
  if (target.classification === 'homepage' && target.seo) return businessName || target.seo.name;
  return target.seo?.name ?? target.copy.heroHeadline;
}

/** Customer quote; renders with or without a context line (M2a.1 review pair). */
function reviewSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  const quote = page.copy.reviewFeatured;
  if (!quote) return '';
  const context = page.copy.reviewContext ? `<div style="font-size:0.85rem;color:${theme.textMuted};margin-top:10px;">${esc(page.copy.reviewContext)}</div>` : '';
  return `<section style="padding:28px 20px;background:${theme.surface};"><blockquote style="max-width:640px;margin:0 auto;text-align:center;"><p style="font-style:italic;font-size:1.05rem;color:${theme.textPrimary};line-height:1.6;">\u05F4${esc(quote)}\u05F4</p>${context}</blockquote></section>`;
}

/** The <title> of one researched page: the C1 formula when the page has SEO facts, else the legacy hook title. */
export function researchedPageTitle(page: ResearchedSitePage, businessName: string): string {
  return page.seo ? buildResearchedPageTitle(page.seo.name, page.seo.city, businessName) : `${page.copy.heroHeadline} \u2014 ${businessName}`;
}

/**
 * The copy fields buildPageHtml (and the contact page, from the home copy) actually shows on a research site.
 * M2a.7: the hero headline (as the H1), the hero subheadline (also the meta description), the form headline, the FAQ
 * and the review pair. M2b.1: the hero call button label (heroCta), the trust bar, the about section
 * (aboutPageHeadline + aboutPageBody), the service cards (servicesHeadline + serviceDetails).
 * Not rendered (still warnings): aboutBlurb, serviceItems, faqHeadline, guaranteeBlock, responseTimeBadge,
 * scarcityLine, stickyBarLine. When a field starts rendering, add it here.
 */
export const RESEARCHED_RENDERED_FIELDS: readonly string[] = [
  'heroHeadline', 'heroSubheadline', 'formHeadline', 'faqItems', 'reviewFeatured', 'reviewContext',
  'heroCta', 'trustBarItems', 'aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails',
];

/**
 * M2b.1: rendered fields whose voice-gate hits stay warnings until the next Tamar/Noa voice round. Gating them now
 * drops the fixture below the M2a bar (>= 9/10 valid): no-repair re-score of the M2a.7 eval final copy, 17/18 valid
 * today; gating all of them 2/18; one at a time trustBarItems 16/18, servicesHeadline 13/18, serviceDetails 13/18,
 * aboutPageBody 9/18, aboutPageHeadline 8/18 (heroCta 17/18, gated). Fact/trust gates (copyGates.ts
 * ALWAYS_BLOCKING_RULES) still fail these fields. Remove a field from this list to make it a hard gate.
 */
export const RESEARCHED_RENDERED_WARN_ONLY_FIELDS: readonly string[] = ['trustBarItems', 'aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails'];

/** The fields whose gate hits fail a research page (copyGates renderedFields): rendered minus the warn-only set. */
export const RESEARCHED_GATED_FIELDS: readonly string[] = RESEARCHED_RENDERED_FIELDS.filter(field => !RESEARCHED_RENDERED_WARN_ONLY_FIELDS.includes(field));

const PHONE_EMOJI = '\u{1F4DE}';

/**
 * tel: href in E.164 for an Israeli number (national 0XXXXXXXX / 0XXXXXXXXX, or +972 / 972 forms), else null
 * (the hero call button is then omitted; the header keeps its legacy link).
 */
export function israeliPhoneE164(raw: string | undefined): string | null {
  const compact = (raw ?? '').replace(/[^\d+]/g, '');
  const national = compact.startsWith('+972') ? `0${compact.slice(4)}` : compact.startsWith('972') ? `0${compact.slice(3)}` : compact;
  return /^0[1-9]\d{7,8}$/.test(national) ? `+972${national.slice(1)}` : null;
}

/**
 * Hero call button (M2b.1, Eitan-approved). Label: the page's heroCta on a phone site (it is the system call
 * label there, Tamar section 20.7); on a WhatsApp- or form-first site the default call label. Number in an LTR
 * isolate, href in E.164, 48px tap target.
 */
function heroCallButton(page: ResearchedSitePage, data: CollectedData, theme: RenderResearchedSitePagesParams['theme']): string {
  const phone = (data.phone ?? '').trim();
  const href = israeliPhoneE164(phone);
  if (!href) return '';
  const callLabel = primaryCtaLabel({});
  const label = primaryCtaLabel(data) === callLabel && page.copy.heroCta ? page.copy.heroCta : callLabel;
  return `<div style="margin-top:22px;"><a href="tel:${href}" data-hero-call style="display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;min-width:44px;padding:12px 26px;background:${theme.ctaGradient};color:#fff;border-radius:${theme.radiusSm};font-weight:800;font-size:1.05rem;"><span aria-hidden="true">${PHONE_EMOJI}</span><span>${esc(label)}</span><bdi dir="ltr">${esc(phone)}</bdi></a></div>`;
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Trust bar (M2b.1): the page's trustBarItems; nothing when empty. */
function trustBar(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  const items = (page.copy.trustBarItems ?? []).filter(nonEmpty);
  return items.length ? trustBarSection(theme, items) : '';
}

/** Service cards (M2b.1): servicesHeadline as the H2 (only with cards), one H3 card per serviceDetails item. */
function serviceDetailsSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  const cards = (page.copy.serviceDetails ?? []).filter(item => item && nonEmpty(item.name)).map(item => `<div style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:20px;border-inline-start:3px solid ${theme.accent};"><h3 style="font-weight:700;font-size:1rem;color:${theme.primary};margin-bottom:8px;">${esc(item.name)}</h3>${nonEmpty(item.description) ? `<p style="color:${theme.textMuted};font-size:0.9rem;line-height:1.5;">${esc(item.description)}</p>` : ''}</div>`).join('');
  if (!cards) return '';
  const heading = nonEmpty(page.copy.servicesHeadline) ? `<h2 style="font-size:1.35rem;color:${theme.primary};margin-bottom:20px;text-align:center;">${esc(page.copy.servicesHeadline)}</h2>` : '';
  return `<section data-section="service-details" style="padding:36px 20px;background:${theme.surfaceAlt};"><div style="max-width:760px;margin:0 auto;">${heading}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">${cards}</div></div></section>`;
}

/** About (M2b.1): aboutPageHeadline as the H2 (only with a body), aboutPageBody; nothing without a body. */
function aboutSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!nonEmpty(page.copy.aboutPageBody)) return '';
  const heading = nonEmpty(page.copy.aboutPageHeadline) ? `<h2 style="font-size:1.35rem;color:${theme.primary};margin-bottom:14px;">${esc(page.copy.aboutPageHeadline)}</h2>` : '';
  return `<section data-section="about" style="padding:36px 20px;background:${theme.surface};"><div style="max-width:700px;margin:0 auto;text-align:center;">${heading}<p style="color:${theme.textMuted};line-height:1.7;">${esc(page.copy.aboutPageBody)}</p></div></section>`;
}

/**
 * Service areas (M2b.1, Yonatan: base page only, no city pages): the owner-named localities
 * (collectedData.servedAreaNames.listed, max 3; overflow never rendered). Homepage only; nothing when empty.
 * Schema areaServed is unchanged (page.seo.serviceArea).
 */
function serviceAreasSection(page: ResearchedSitePage, data: CollectedData, theme: RenderResearchedSitePagesParams['theme']): string {
  if (page.classification !== 'homepage') return '';
  const areas = listedServedAreas(data);
  if (!areas.length) return '';
  const items = areas.map(name => `<li style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusSm};padding:8px 16px;font-weight:600;color:${theme.textPrimary};">${esc(name)}</li>`).join('');
  return `<section data-section="service-areas" aria-labelledby="service-areas-heading" style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;text-align:center;"><h2 id="service-areas-heading" style="font-size:1.25rem;color:${theme.primary};margin-bottom:14px;">${esc(RESEARCHED_SITE_LABELS.serviceAreasHeading)}</h2><ul role="list" style="list-style:none;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">${items}</ul></div></section>`;
}

function buildPageHtml(page: ResearchedSitePage, params: RenderResearchedSitePagesParams, siteUrl: string, output: string, allPages: ResearchedSitePage[], outputs: Map<string, string>): string {
  const { theme, data, heroImageUrl, slug } = params;
  const { phone, phoneHref, businessName } = contacts(data);
  const links = navigationLinks(page, allPages, outputs, params.graphEdges ?? []).flatMap(item => {
    const target = outputs.get(item.opportunityId);
    return target ? [`<a href="/${target === 'index.html' ? '' : target}" style="color:${theme.accent};font-weight:700;">${esc(anchorText(item, businessName))}</a>`] : [];
  }).join('');
  const faq = approvedFaqs(page).map(item => `<details style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:14px;"><summary style="font-weight:700;color:${theme.primary};">${esc(item.q)}</summary><p style="color:${theme.textMuted};margin-top:8px;">${esc(item.a)}</p></details>`).join('');
  const head = pageHead({
    t: theme,
    title: researchedPageTitle(page, businessName),
    description: page.copy.heroSubheadline,
    canonicalUrl: pageUrl(siteUrl, output),
    ogImage: heroImageUrl,
    schema: schemaGraph(page, data, siteUrl, heroImageUrl, output),
    fraudBlockerSid: params.fraudBlockerSid,
  });
  const body = `${stickyHeader(theme, businessName, phone, phoneHref)}
  <main>
    <section style="padding:44px 20px;background:${theme.surface};text-align:center;"><div style="max-width:700px;margin:0 auto;"><h1 style="color:${theme.primary};font-size:clamp(1.6rem,4vw,2.3rem);margin-bottom:16px;">${esc(researchedPageH1(page.copy.heroHeadline, page.seo))}</h1><p style="color:${theme.textMuted};line-height:1.7;">${esc(page.copy.heroSubheadline)}</p>${heroCallButton(page, data, theme)}</div></section>
    ${trustBar(page, theme)}
    ${links ? `<nav aria-label="Related pages" style="padding:20px;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;background:${theme.surfaceAlt};">${links}</nav>` : ''}
    ${serviceDetailsSection(page, theme)}
    ${reviewSection(page, theme)}
    ${aboutSection(page, theme)}
    ${serviceAreasSection(page, data, theme)}
    ${faq ? `<section style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">${faq}</div></section>` : ''}
    ${leadFormSection(theme, page.copy.formHeadline, page.copy.heroCta, RESEARCHED_LEAD_FORM)}
  </main>
  ${pageScript({ slug, businessName, googleAdsCustomerId: params.googleAdsCustomerId || '', formConversionLabel: params.formConversionLabel || '', phoneConversionLabel: params.phoneConversionLabel || '', whatsappConversionLabel: params.whatsappConversionLabel || '', ctaLabel: RESEARCHED_LEAD_FORM.submitLabel ?? page.copy.heroCta, includeLeadForm: true })}`;
  return assembleDocument(theme, head, body, params.gtagSnippet, data);
}

export function buildResearchedSitemapUrls(pages: ResearchedSitePage[], siteUrl = ''): string[] {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  return selectedPages(pages).flatMap(page => {
    const output = outputPath(page)!;
    return [cleanUrl ? pageUrl(cleanUrl, output) : output];
  });
}

function buildResearchedSitemap(siteUrl: string, pages: ResearchedSitePage[]): string {
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const urls = [...buildResearchedSitemapUrls(pages, cleanUrl), `${cleanUrl}/contact.html`];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(url => `  <url><loc>${url}</loc></url>`).join('\n')}
</urlset>`;
}

export function buildResearchedSchemaGraph(page: ResearchedSitePage, data: CollectedData, siteUrl: string, heroImageUrl: string): string {
  const output = outputPath(page);
  if (!output) throw new Error('Research page has an unsafe path.');
  return schemaGraph(page, data, siteUrl, heroImageUrl, output);
}

export function renderResearchedSitePages(params: RenderResearchedSitePagesParams): Record<string, string> {
  const pages = selectedPages(params.pages);
  const home = pages.filter(page => page.classification === 'homepage');
  if (home.length !== 1) throw new Error('A researched site requires exactly one selected homepage.');
  const reachable = reachablePageIds(pages, params.graphEdges ?? []);
  if ((params.graphEdges?.length ?? 0) > 0 && pages.some(page => !reachable.has(page.opportunityId))) throw new Error('Research graph contains an orphan selected page.');
  const siteUrl = params.siteUrl.replace(/\/$/, '');
  const outputs = new Map(pages.map(page => [page.opportunityId, outputPath(page)!]));
  const homeSeo = home[0].seo;
  const legacy = renderSitePages({
    ...params,
    copy: home[0].copy,
    ...(homeSeo ? {
      schemaOptions: { ownerFactsOnly: true, areaServed: homeSeo.serviceArea },
      researched: { contactTitle: researchedContactTitle(homeSeo.name, homeSeo.city, contacts(params.data).businessName) },
    } : {}),
  });
  delete legacy['index.html'];
  delete legacy['about.html'];
  delete legacy['services.html'];
  const rendered = Object.fromEntries(pages.map(page => {
    const output = outputs.get(page.opportunityId)!;
    return [output, buildPageHtml(page, params, siteUrl, output, pages, outputs)];
  }));
  return {
    ...legacy,
    ...rendered,
    'sitemap.xml': buildResearchedSitemap(siteUrl, pages),
  };
}
