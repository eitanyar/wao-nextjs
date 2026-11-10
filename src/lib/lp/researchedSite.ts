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
  NAV_LINK_TEXT,
  pageHead,
  pageScript,
  renderSitePages,
  stickyHeader,
  trustBarSection,
  type ResearchNavOptions,
} from './renderSitePages';
import { RESEARCHED_SITE_LABELS } from './researchedSiteLabels';
import { DEPTH_BLOCK_KEYS, DEPTH_BLOCK_LIMITS, rendersDepthBlocks } from './depthBlocks';

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
  /**
   * M2b.1h: the free sales letter the page's copy was cut from (pitch-first pages: homepage, service hub). Stored for review
   * and later re-cuts; never rendered. Absent on records generated before M2b.1h.
   */
  pitch?: string;
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

/**
 * M2b.1b (Yonatan): the most service areas a page shows or declares. The homepage list and schema areaServed
 * (Service and LocalBusiness, every page) are the same capped list, same order.
 */
export const RESEARCHED_SERVICE_AREA_CAP = 6;

/**
 * The page's service areas (M2b.1b, Yonatan): page.seo.serviceArea (ownerPlaces order: base city, specificCities,
 * owner-named; deduped there and again here), capped at RESEARCHED_SERVICE_AREA_CAP. Empty without page.seo.
 */
export function researchedServiceAreas(page: Pick<ResearchedSitePage, 'seo'>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of page.seo?.serviceArea ?? []) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    const key = name.normalize('NFC').toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out.slice(0, RESEARCHED_SERVICE_AREA_CAP);
}

function schemaGraph(page: ResearchedSitePage, data: CollectedData, siteUrl: string, heroImageUrl: string, output: string): string {
  const { businessName } = contacts(data);
  const areas = researchedServiceAreas(page);
  const cleanUrl = siteUrl.replace(/\/$/, '');
  const faq = approvedFaqs(page);
  const service: Record<string, unknown> = {
    '@type': 'Service',
    '@id': `${pageUrl(cleanUrl, output)}#service`,
    name: page.seo?.name ?? page.copy.heroHeadline,
    provider: { '@id': `${cleanUrl}/#business` },
    description: page.copy.heroSubheadline,
    ...(areas.length
      ? { areaServed: areas.map(name => ({ '@type': 'City', name })) }
      : page.areaServed ? { areaServed: { '@type': page.areaServed.type ?? 'Place', name: page.areaServed.name } } : {}),
  };
  const business = page.seo
    ? localBusinessObject(data, businessName, cleanUrl, heroImageUrl, { ownerFactsOnly: true, areaServed: areas })
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
 * M2b.1b (Yonatan): the about section and the service cards render on the homepage and the service hub only
 * (RESEARCHED_HOME_HUB_ONLY_FIELDS); every other page type renders the rest. researchedGatedFieldsFor() applies that.
 * Not rendered (still warnings): aboutBlurb, serviceItems, faqHeadline, guaranteeBlock, responseTimeBadge,
 * scarcityLine, stickyBarLine. When a field starts rendering, add it here.
 */
export const RESEARCHED_RENDERED_FIELDS: readonly string[] = [
  'heroHeadline', 'heroSubheadline', 'formHeadline', 'faqItems', 'reviewFeatured', 'reviewContext',
  'heroCta', 'trustBarItems', 'aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails',
  // M2b.1h: the homepage story section (RESEARCHED_HOMEPAGE_ONLY_FIELDS).
  'storyHeadline', 'storyBody',
  // Content depth (2026-11-10): the service-page blocks B1 process, B4 Q&A, B6 proof (RESEARCHED_DEPTH_ONLY_FIELDS).
  ...DEPTH_BLOCK_KEYS,
];

/**
 * M2b.1: rendered fields whose voice-gate hits stay warnings until the next Tamar/Noa voice round. Fact/trust gates
 * (copyGates.ts ALWAYS_BLOCKING_RULES) still fail these fields. Remove a field from this list to make it a hard gate.
 * M2b.1d (Tamar section 22.4): trustBarItems and servicesHeadline are hard gates now; serviceDetails, aboutPageHeadline and
 * aboutPageBody stay warn-only until the 18-run eval with all five blocking clears >= 16/18.
 * M2b.1f (2026-11-09): that eval cleared 18/18 (US$3.18, 0 final gate hits), so all five are hard gates; the list is empty.
 */
export const RESEARCHED_RENDERED_WARN_ONLY_FIELDS: readonly string[] = [
  // M2b.1h (Adam): the new story section is warn-only until a paid eval proves it; its truth gates (ALWAYS_BLOCKING_RULES)
  // still fail the page.
  'storyHeadline', 'storyBody',
  // Content depth (2026-11-10): warn-only until a paid eval proves them, like the story; the fact-trace and term-density
  // gates (ALWAYS_BLOCKING_RULES) and every other truth gate still fail the page.
  ...DEPTH_BLOCK_KEYS,
];

/** The fields whose gate hits fail a research page (copyGates renderedFields): rendered minus the default warn-only set. */
export const RESEARCHED_GATED_FIELDS: readonly string[] = RESEARCHED_RENDERED_FIELDS.filter(field => !RESEARCHED_RENDERED_WARN_ONLY_FIELDS.includes(field));

/** M2b.1b: page types that render the about section and the service cards. */
const HOME_HUB_CLASSES: ReadonlySet<string> = new Set<PageClassification>(['homepage', 'service_hub']);

/** M2b.1b: rendered fields shown on the homepage / service hub only (aboutSection, serviceDetailsSection). */
export const RESEARCHED_HOME_HUB_ONLY_FIELDS: readonly string[] = ['aboutPageHeadline', 'aboutPageBody', 'servicesHeadline', 'serviceDetails'];

/** True when this page type renders the about section and the service cards. */
export function rendersSiteSections(classification: string): boolean {
  return HOME_HUB_CLASSES.has(classification);
}

/** M2b.1h: rendered (and generated) on the homepage only: the story section. */
export const RESEARCHED_HOMEPAGE_ONLY_FIELDS: readonly string[] = ['storyHeadline', 'storyBody'];

/** M2b.1h: true when this page type renders (and generates) the story section. */
export function rendersStory(classification: string): boolean {
  return classification === 'homepage';
}

/** Content depth: rendered (and generated) on service (money) pages only: the B1 / B4 / B6 blocks. */
export const RESEARCHED_DEPTH_ONLY_FIELDS: readonly string[] = DEPTH_BLOCK_KEYS;

/** M2b.1h: the fields one page type renders (gated or warn-only): the home/hub-only and homepage-only fields where shown. */
export function researchedRenderedFieldsFor(classification: string): readonly string[] {
  return RESEARCHED_RENDERED_FIELDS.filter(field => (rendersSiteSections(classification) || !RESEARCHED_HOME_HUB_ONLY_FIELDS.includes(field))
    && (rendersStory(classification) || !RESEARCHED_HOMEPAGE_ONLY_FIELDS.includes(field))
    && (rendersDepthBlocks(classification) || !RESEARCHED_DEPTH_ONLY_FIELDS.includes(field)));
}

/**
 * The gated fields of one page type (M2b.1b): the rendered fields minus the warn-only fields (default
 * RESEARCHED_RENDERED_WARN_ONLY_FIELDS; M2b.1f: injectable, so the warn-only mechanism stays testable while the list is
 * empty), minus the home/hub-only fields on a page type that does not render them, so a field is never gated where it is
 * not shown (M2b.1d: those pages do not generate them either). M2b.1f removed the SITE_BOT_M2B_ALL_FIELDS_BLOCKING eval
 * switch: with the list empty, all fields block by default.
 */
export function researchedGatedFieldsFor(classification: string, warnOnly: readonly string[] = RESEARCHED_RENDERED_WARN_ONLY_FIELDS): readonly string[] {
  return researchedRenderedFieldsFor(classification).filter(field => !warnOnly.includes(field));
}

/** M2b.1d: the top-level copy fields a page type does not generate (the home/hub-only fields off the homepage / services hub). */
export function researchedUngeneratedFieldsFor(classification: string): readonly string[] {
  return rendersSiteSections(classification) ? [] : RESEARCHED_HOME_HUB_ONLY_FIELDS;
}

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
  return `<div style="margin-top:22px;"><a href="tel:${href}" data-hero-call style="display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:48px;min-width:44px;padding:12px 26px;background:${theme.ctaGradient};color:${theme.ctaText};border-radius:${theme.radiusSm};font-weight:800;font-size:1.05rem;"><span aria-hidden="true">${PHONE_EMOJI}</span><span>${esc(label)}</span><bdi dir="ltr">${esc(phone)}</bdi></a></div>`;
}

const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Trust bar (M2b.1): the page's trustBarItems; nothing when empty. */
function trustBar(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  const items = (page.copy.trustBarItems ?? []).filter(nonEmpty);
  return items.length ? trustBarSection(theme, items) : '';
}

/**
 * Section heading (M2b.1b, Maya C7): the copy headline as a visible H2, else a visually hidden H2 with the
 * section's existing nav link text, so the heading levels never skip and the section keeps an accessible name.
 */
function sectionHeading(id: string, headline: string | null | undefined, fallback: string, style: string): string {
  return nonEmpty(headline)
    ? `<h2 id="${id}" style="${style}">${esc(headline)}</h2>`
    : `<h2 id="${id}" class="sr-only">${esc(fallback)}</h2>`;
}

/** True when serviceDetailsSection renders cards for this page (the nav's #services target). */
function hasServiceCards(page: ResearchedSitePage): boolean {
  return rendersSiteSections(page.classification) && (page.copy.serviceDetails ?? []).some(item => item && nonEmpty(item.name));
}

/** True when aboutSection renders for this page (the nav's #about target). */
function hasAbout(page: ResearchedSitePage): boolean {
  return rendersSiteSections(page.classification) && nonEmpty(page.copy.aboutPageBody);
}

/**
 * M2b.1h: accessible-name fallback of the story H2 when the copy has no storyHeadline. Null until Tamar -> Noa supply the
 * byte-exact Hebrew label (the engineer never authors Hebrew); while null, a story without a headline renders as an unnamed
 * <section> with no H2 (no heading level is skipped, and an unnamed section is not a landmark).
 */
export const RESEARCHED_STORY_FALLBACK_HEADING: string | null = RESEARCHED_SITE_LABELS.storyFallbackHeading;

/** M2b.1h: true when storySection renders for this page (homepage with a non-empty storyBody). */
function hasStory(page: ResearchedSitePage): boolean {
  return rendersStory(page.classification) && nonEmpty(page.copy.storyBody);
}

/**
 * Story (M2b.1h): the homepage's storyHeadline as the H2 (labelling the section) and storyBody, between the hero and the
 * services section. Nothing without a body (records before M2b.1h render unchanged). Theme tokens only; the body is
 * start-aligned (RTL) at a readable measure.
 */
function storySection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!hasStory(page)) return '';
  const style = `font-size:1.35rem;font-weight:700;color:${theme.primary};margin-bottom:14px;text-align:center;`;
  const named = nonEmpty(page.copy.storyHeadline) || nonEmpty(RESEARCHED_STORY_FALLBACK_HEADING);
  const heading = named ? sectionHeading('story-heading', page.copy.storyHeadline, RESEARCHED_STORY_FALLBACK_HEADING ?? '', style) : '';
  return `<section id="story" data-section="story"${named ? ' aria-labelledby="story-heading"' : ''} style="padding:28px 20px;background:${theme.surfaceAlt};border-block:1px solid ${theme.border};"><div style="max-width:640px;margin:0 auto;">${heading}<p style="color:${theme.textPrimary};font-size:1.125rem;line-height:1.7;text-align:start;border-inline-start:3px solid ${theme.accent};padding-inline-start:14px;">${esc(page.copy.storyBody ?? '')}</p></div></section>`;
}

/** Content depth: the non-empty text items of one depth list (a record without the field renders nothing). */
function depthItems<T extends object>(value: readonly T[] | null | undefined, keys: readonly (keyof T)[]): T[] {
  return (Array.isArray(value) ? value : []).filter(item => item && keys.every(key => nonEmpty(item[key])));
}

const depthHeadingStyle = (theme: RenderResearchedSitePagesParams['theme']) => `font-size:1.35rem;font-weight:700;color:${theme.primary};margin-bottom:16px;text-align:center;`;

/** Content depth: a block's H2, the generated headline or the approved fallback label (visible either way). */
function depthHeading(id: string, headline: string | null | undefined, fallback: string, theme: RenderResearchedSitePagesParams['theme']): string {
  return `<h2 id="${id}" style="${depthHeadingStyle(theme)}">${esc(nonEmpty(headline) ? headline : fallback)}</h2>`;
}

/** Content depth (B1): the process steps as an ordered list; service pages only; nothing without steps. */
function processSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!rendersDepthBlocks(page.classification)) return '';
  const steps = depthItems(page.copy.processSteps, ['text']);
  if (!steps.length) return '';
  const items = steps.map(step => `<li style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:14px 16px;border-inline-start:3px solid ${theme.accent};color:${theme.textPrimary};line-height:1.6;">${esc(step.text)}</li>`).join('');
  return `<section id="process" data-section="process" aria-labelledby="process-heading" style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;">${depthHeading('process-heading', page.copy.processHeadline, RESEARCHED_SITE_LABELS.processHeadingFallback, theme)}<ol style="display:flex;flex-direction:column;gap:10px;padding-inline-start:22px;margin:0;">${items}</ol></div></section>`;
}

/** Content depth (B6): owner-stated proof facts plus at most DEPTH_BLOCK_LIMITS.maxReviews verbatim reviews; nothing without facts. */
function proofReviews(page: ResearchedSitePage): string[] {
  return [page.copy.reviewFeatured].filter(nonEmpty).slice(0, DEPTH_BLOCK_LIMITS.maxReviews);
}

/** True when the B6 proof section renders (and then carries the page's review instead of reviewSection). */
function hasProof(page: ResearchedSitePage): boolean {
  return rendersDepthBlocks(page.classification) && depthItems(page.copy.proofItems, ['text']).length > 0;
}

function proofSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!hasProof(page)) return '';
  const facts = depthItems(page.copy.proofItems, ['text']).map(item => `<li style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusSm};padding:10px 14px;font-weight:600;color:${theme.textPrimary};">${esc(item.text)}</li>`).join('');
  const reviews = proofReviews(page);
  const context = page.copy.reviewContext ? `<div style="font-size:0.85rem;color:${theme.textMuted};margin-top:10px;">${esc(page.copy.reviewContext)}</div>` : '';
  const quotes = reviews.map((quote, index) => `<blockquote style="margin:18px 0 0;text-align:center;"><p style="font-style:italic;font-size:1.05rem;color:${theme.textPrimary};line-height:1.6;">\u05F4${esc(quote)}\u05F4</p>${index === 0 ? context : ''}</blockquote>`).join('');
  const fallback = reviews.length ? RESEARCHED_SITE_LABELS.proofHeadingReviews : RESEARCHED_SITE_LABELS.proofHeadingFactsOnly;
  return `<section id="proof" data-section="proof" aria-labelledby="proof-heading" style="padding:32px 20px;background:${theme.surface};"><div style="max-width:700px;margin:0 auto;">${depthHeading('proof-heading', page.copy.proofHeadline, fallback, theme)}<ul role="list" style="list-style:none;display:flex;flex-direction:column;gap:8px;padding:0;margin:0;">${facts}</ul>${quotes}</div></section>`;
}

/** Content depth (B4): the Q&A, each question an H3 with its answer; service pages only; nothing without items. */
function qaSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!rendersDepthBlocks(page.classification)) return '';
  const items = depthItems(page.copy.qaItems, ['q', 'a']);
  if (!items.length) return '';
  const body = items.map(item => `<div style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:14px 16px;"><h3 style="font-weight:700;font-size:1rem;color:${theme.primary};margin-bottom:6px;">${esc(item.q)}</h3><p style="color:${theme.textMuted};line-height:1.6;">${esc(item.a)}</p></div>`).join('');
  return `<section id="qa" data-section="qa" aria-labelledby="qa-heading" style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:12px;">${depthHeading('qa-heading', page.copy.qaHeadline, RESEARCHED_SITE_LABELS.qaHeadingFallback, theme)}${body}</div></section>`;
}

/**
 * Service cards (M2b.1): servicesHeadline as the H2, one H3 card per serviceDetails item. M2b.1b: homepage and
 * service hub only (Yonatan), id="services" (nav target), labelled by its H2 (fallback: hidden nav-text H2).
 */
function serviceDetailsSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!hasServiceCards(page)) return '';
  const cards = (page.copy.serviceDetails ?? []).filter(item => item && nonEmpty(item.name)).map(item => `<div style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:20px;border-inline-start:3px solid ${theme.accent};"><h3 style="font-weight:700;font-size:1rem;color:${theme.primary};margin-bottom:8px;">${esc(item.name)}</h3>${nonEmpty(item.description) ? `<p style="color:${theme.textMuted};font-size:0.9rem;line-height:1.5;">${esc(item.description)}</p>` : ''}</div>`).join('');
  const heading = sectionHeading('services-heading', page.copy.servicesHeadline, NAV_LINK_TEXT.services, `font-size:1.35rem;color:${theme.primary};margin-bottom:20px;text-align:center;`);
  return `<section id="services" data-section="service-details" aria-labelledby="services-heading" style="padding:36px 20px;background:${theme.surfaceAlt};"><div style="max-width:760px;margin:0 auto;">${heading}<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">${cards}</div></div></section>`;
}

/**
 * About (M2b.1): aboutPageHeadline as the H2, aboutPageBody; nothing without a body. M2b.1b: homepage and service
 * hub only (Yonatan), id="about" (nav target), labelled by its H2 (fallback: hidden nav-text H2).
 */
function aboutSection(page: ResearchedSitePage, theme: RenderResearchedSitePagesParams['theme']): string {
  if (!hasAbout(page)) return '';
  const heading = sectionHeading('about-heading', page.copy.aboutPageHeadline, NAV_LINK_TEXT.about, `font-size:1.35rem;color:${theme.primary};margin-bottom:14px;`);
  return `<section id="about" data-section="about" aria-labelledby="about-heading" style="padding:36px 20px;background:${theme.surface};"><div style="max-width:700px;margin:0 auto;text-align:center;">${heading}<p style="color:${theme.textMuted};line-height:1.7;">${esc(page.copy.aboutPageBody)}</p></div></section>`;
}

const placeKey = (value: string | null | undefined) => (value ?? '').trim().normalize('NFC').toLowerCase();

/**
 * Service areas (M2b.1b, Yonatan): researchedServiceAreas(page) (page.seo.serviceArea, capped), the same list and order
 * as schema areaServed. Homepage only; nothing when empty. Plain place names; an item links to the selected
 * qualified_service_area page of that city when one exists (plain city name as link text), else no link.
 */
function serviceAreasSection(page: ResearchedSitePage, allPages: ResearchedSitePage[], outputs: Map<string, string>, theme: RenderResearchedSitePagesParams['theme']): string {
  if (page.classification !== 'homepage') return '';
  const areas = researchedServiceAreas(page);
  if (!areas.length) return '';
  const areaPage = (name: string) => allPages.find(item => item.classification === 'qualified_service_area' && outputs.has(item.opportunityId)
    && [item.seo?.city, item.areaServed?.name].some(city => placeKey(city) === placeKey(name)));
  const items = areas.map(name => {
    const target = areaPage(name);
    const text = target ? `<a href="/${outputs.get(target.opportunityId)}" style="display:inline-block;padding:12px 8px;min-height:44px;color:${theme.accentText};text-decoration:underline;">${esc(name)}</a>` : esc(name);
    return `<li style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusSm};padding:${target ? '0 8px' : '8px 16px'};font-weight:600;color:${theme.textPrimary};">${text}</li>`;
  }).join('');
  return `<section data-section="service-areas" aria-labelledby="service-areas-heading" style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;text-align:center;"><h2 id="service-areas-heading" style="font-size:1.25rem;color:${theme.primary};margin-bottom:14px;">${esc(RESEARCHED_SITE_LABELS.serviceAreasHeading)}</h2><ul role="list" style="list-style:none;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;">${items}</ul></div></section>`;
}

/**
 * Research-site nav (M2b.1b, Maya C1): the services / about links point at the homepage sections and are drawn only when
 * the homepage renders them; the contact link only when the contact page is emitted.
 */
export function researchNavOptions(home: ResearchedSitePage, onHome: boolean, contactHref: string | null): ResearchNavOptions {
  return { label: RESEARCHED_SITE_LABELS.mainNavLabel, onHome, homeHasServices: hasServiceCards(home), homeHasAbout: hasAbout(home), contactHref };
}

const CONTACT_HREF = '/contact.html';

function buildPageHtml(page: ResearchedSitePage, params: RenderResearchedSitePagesParams, siteUrl: string, output: string, allPages: ResearchedSitePage[], outputs: Map<string, string>, contactHref: string | null): string {
  const { theme, data, heroImageUrl, slug } = params;
  const { phone, phoneHref, businessName } = contacts(data);
  const links = navigationLinks(page, allPages, outputs, params.graphEdges ?? []).flatMap(item => {
    const target = outputs.get(item.opportunityId);
    return target ? [`<a href="/${target === 'index.html' ? '' : target}" style="display:inline-block;padding:12px 8px;min-height:44px;color:${theme.accentText};text-decoration:underline;font-weight:700;">${esc(anchorText(item, businessName))}</a>`] : [];
  }).join('');
  const faq = approvedFaqs(page).map(item => `<details style="background:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radiusMd};padding:0 14px;"><summary style="min-height:44px;padding:12px 0;cursor:pointer;font-weight:700;color:${theme.primary};">${esc(item.q)}</summary><p style="color:${theme.textMuted};margin-top:-4px;padding-bottom:14px;">${esc(item.a)}</p></details>`).join('');
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
    ${trustBar(page, theme)}${storySection(page, theme)}${processSection(page, theme)}${proofSection(page, theme)}
    ${hasProof(page) ? '' : reviewSection(page, theme)}${qaSection(page, theme)}
    ${serviceDetailsSection(page, theme)}
    ${aboutSection(page, theme)}
    ${serviceAreasSection(page, allPages, outputs, theme)}
    ${faq ? `<section data-section="faq" aria-labelledby="faq-heading" style="padding:32px 20px;background:${theme.surfaceAlt};"><div style="max-width:700px;margin:0 auto;display:flex;flex-direction:column;gap:12px;"><h2 id="faq-heading" style="font-size:1.25rem;color:${theme.primary};text-align:center;">${esc(RESEARCHED_SITE_LABELS.faqHeading)}</h2>${faq}</div></section>` : ''}
    ${links ? `<nav data-section="related-links" aria-labelledby="related-links-heading" style="padding:20px;background:${theme.surface};text-align:center;"><h2 id="related-links-heading" style="font-size:0.95rem;font-weight:700;color:${theme.textPrimary};margin-bottom:6px;">${esc(RESEARCHED_SITE_LABELS.relatedLinksLabel)}</h2><div style="display:flex;flex-wrap:wrap;gap:6px 14px;justify-content:center;">${links}</div></nav>` : ''}
    ${leadFormSection(theme, page.copy.formHeadline, page.copy.heroCta, { ...RESEARCHED_LEAD_FORM, sectionId: 'contact' })}
  </main>
  ${pageScript({ slug, businessName, googleAdsCustomerId: params.googleAdsCustomerId || '', formConversionLabel: params.formConversionLabel || '', phoneConversionLabel: params.phoneConversionLabel || '', whatsappConversionLabel: params.whatsappConversionLabel || '', ctaLabel: RESEARCHED_LEAD_FORM.submitLabel ?? page.copy.heroCta, includeLeadForm: true })}`;
  const home = allPages.find(item => item.classification === 'homepage') ?? page;
  return assembleDocument(theme, head, body, params.gtagSnippet, data, researchNavOptions(home, page.classification === 'homepage', contactHref));
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
  // The legacy renderer always emits contact.html; the research nav links it (and the sitemap lists it).
  const contactNav = researchNavOptions(home[0], false, CONTACT_HREF);
  const legacy = renderSitePages({
    ...params,
    copy: home[0].copy,
    researchNav: contactNav,
    ...(homeSeo ? {
      schemaOptions: { ownerFactsOnly: true, areaServed: researchedServiceAreas(home[0]) },
      researched: { contactTitle: researchedContactTitle(homeSeo.name, homeSeo.city, contacts(params.data).businessName) },
    } : {}),
  });
  const contactHref = legacy['contact.html'] ? CONTACT_HREF : null;
  delete legacy['index.html'];
  delete legacy['about.html'];
  delete legacy['services.html'];
  const rendered = Object.fromEntries(pages.map(page => {
    const output = outputs.get(page.opportunityId)!;
    return [output, buildPageHtml(page, params, siteUrl, output, pages, outputs, contactHref)];
  }));
  return {
    ...legacy,
    ...rendered,
    'sitemap.xml': buildResearchedSitemap(siteUrl, pages),
  };
}
