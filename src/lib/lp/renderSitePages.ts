// Site Bot — renders the 5-page brochure site (index/about/services/contact/sitemap)
// from a SiteCopy + CollectedData pair. Wraps renderStaticHtml() for the home page
// (unmodified — see renderStaticHtml.ts) and builds the 3 standalone pages locally,
// sharing the same theme tokens, header, nav, and footer.

import type { VerticalTheme } from './verticalThemes';
import type { SiteCopy } from './lpCopyPrompt';
import type { CollectedData } from '@/lib/bot/prompts';
import { renderStaticHtml, CONSENT_CHECKBOX_STYLE, CONSENT_LABEL_STYLE, CONSENT_LINK_STYLE, type RenderStaticHtmlParams } from './renderStaticHtml';
import { buildPrivacyHtml, buildAccessibilityHtml, buildNotFoundHtml, isAccessibilityExempt } from './legalPages';
import { buildFraudBlockerTrackerHtml } from '../fraud-blocker/tracker';
import { displayBusinessHours, parseBusinessHours } from './businessHours';
import { TEMPLATE_STRINGS } from './generationData';

export interface RenderSitePagesParams extends Omit<RenderStaticHtmlParams, 'copy' | 'mode' | 'siteUrl'> {
  copy: SiteCopy;
  mode?: 'site';
  /** Required — the live domain root, e.g. 'https://daniel-locksmith.wao.co.il' */
  siteUrl: string;
  /** Researched sites (M2a.1) pass ownerFactsOnly schema options; unset = legacy schema, unchanged. */
  schemaOptions?: LocalBusinessSchemaOptions;
  /**
   * Researched sites (M2a.2): contact <title> (Yonatan's formula), `| brand` legal titles and the
   * owner's hours formatted in code (never raw Latin day names). Unset = legacy, unchanged.
   */
  /**
   * contactDescription (2026-11-11): the contact page's own meta description (never the homepage's). null = no code-built
   * description could be made: the contact page is noindex,follow (and left out of the research sitemap). Unset = legacy.
   */
  researched?: { contactTitle: string | null; contactDescription?: string | null };
  /** M2b.1b: research-site nav for the emitted standalone pages (contact.html). Unset = legacy nav, unchanged. */
  researchNav?: ResearchNavOptions;
  /** Launch step 2 (capability 9): the footer's visible Google-profile link on the emitted standalone pages. Unset = none. */
  footerProfileLink?: FooterProfileLink;
}

/** Launch step 2 (capability 9): a visible link to the business's Google profile (the same URL as the schema sameAs). */
export interface FooterProfileLink {
  href: string;
  label: string;
}

/**
 * M2a.3 (item 9): system strings of the lead form on researched sites. Unset = legacy markup,
 * byte-identical (the button repeats the hero CTA, the legacy thanks line, an H2 headline).
 */
export interface LeadFormOptions {
  /** Submit-button label (Noa templateStrings.formSubmitLabel): the button sends the form, it does not call. */
  submitLabel?: string;
  /** Form-success line (Noa templateStrings.formThanks). */
  thanks?: string;
  /** False = no H2 (the page's H1 already carries the same headline). Default true. */
  headline?: boolean;
  /** M2b.1b: id of the form <section> (in-page contact target). Unset = no id (legacy markup unchanged). */
  sectionId?: string;
}

/** The researched-site lead-form strings (Noa templateStrings). */
export const RESEARCHED_LEAD_FORM: Readonly<LeadFormOptions> = { submitLabel: TEMPLATE_STRINGS.formSubmitLabel, thanks: TEMPLATE_STRINGS.formThanks };

/**
 * M4 step 0 (URL hygiene): the path Cloudflare Pages serves a deploy file at. Files stay `*.html` on disk; Pages answers
 * `/x.html` with a redirect to `/x`, so every canonical, og:url, sitemap <loc>, schema URL and internal link uses the
 * extensionless form: 'index.html' (or '') -> '/', 'a/index.html' -> '/a/', 'about.html' -> '/about',
 * 'sherut/x.html' -> '/sherut/x'.
 */
export function servedPath(file: string): string {
  const clean = file.replace(/^\/+/, '');
  if (clean === '' || clean === 'index.html') return '/';
  if (clean.endsWith('/index.html')) return `/${clean.slice(0, -'index.html'.length)}`;
  return `/${clean.replace(/\.html$/, '')}`;
}

/** Absolute served URL of a deploy file (see servedPath). */
export function servedUrl(siteUrl: string, file: string): string {
  return `${siteUrl.replace(/\/$/, '')}${servedPath(file)}`;
}

/**
 * The ads-LP deploy (api/cloudflare-pages/deploy): the files written next to its single index.html -- privacy, the gated
 * accessibility page, and the real 404.html (M4 step 0). Canonicals are the extensionless served URLs.
 */
export function buildLandingPageSupportPages(o: { theme: VerticalTheme; data: CollectedData; siteUrl: string; fraudBlockerSid?: string }): Record<string, string> {
  const base = { theme: o.theme, data: o.data, homeHref: '/', fraudBlockerSid: o.fraudBlockerSid };
  const pages: Record<string, string> = { 'privacy.html': buildPrivacyHtml({ ...base, canonicalUrl: servedUrl(o.siteUrl, 'privacy.html') }) };
  if (!isAccessibilityExempt(o.data.vatStatus)) pages['accessibility.html'] = buildAccessibilityHtml({ ...base, canonicalUrl: servedUrl(o.siteUrl, 'accessibility.html') });
  pages['404.html'] = buildNotFoundHtml(base);
  return pages;
}

export function renderSitePages(p: RenderSitePagesParams): Record<string, string> {
  const siteUrl = p.siteUrl.replace(/\/$/, '');
  const exempt = isAccessibilityExempt(p.data.vatStatus);
  // Launch step 2 (capability 9): the legal pages' footers carry the same Google-profile row as every other page.
  const profileRow = footerProfileRow(p.theme, p.footerProfileLink);
  const legalExtra = { ...(p.researched ? { pipeTitle: true, prefixRule: true } : {}), ...(profileRow ? { footerProfileRow: profileRow } : {}) };

  const pages: Record<string, string> = {
    'index.html': buildIndexHtml(p, siteUrl),
    'about.html': buildAboutHtml(p, siteUrl),
    'services.html': buildServicesHtml(p, siteUrl),
    'contact.html': buildContactHtml(p, siteUrl),
    'privacy.html': buildPrivacyHtml({ theme: p.theme, data: p.data, canonicalUrl: servedUrl(siteUrl, 'privacy.html'), homeHref: '/', fraudBlockerSid: p.fraudBlockerSid, ...legalExtra }),
    'sitemap.xml': buildSitemap(siteUrl),
    // M4 step 0: a real 404 (Pages serves it with status 404 for unknown paths, instead of the homepage with 200).
    '404.html': buildNotFoundHtml({ theme: p.theme, data: p.data, homeHref: '/', fraudBlockerSid: p.fraudBlockerSid, ...legalExtra }),
  };

  // No exemption exists for the privacy page — always built. Accessibility
  // is gated: absent entirely (not a stub) when the client is exempt.
  if (!exempt) {
    pages['accessibility.html'] = buildAccessibilityHtml({ theme: p.theme, data: p.data, canonicalUrl: servedUrl(siteUrl, 'accessibility.html'), homeHref: '/', fraudBlockerSid: p.fraudBlockerSid, ...legalExtra });
  }

  return pages;
}

// ─────────────────────────────────────────────────────────────────────────
// index.html — delegate to renderStaticHtml (untouched), then inject the
// shared nav bar + footer around its existing header/sticky-bar structure.
// ─────────────────────────────────────────────────────────────────────────

function buildIndexHtml(p: RenderSitePagesParams, siteUrl: string): string {
  // M4 step 0: the homepage canonical is the site root (renderStaticHtml's own default appends the business slug).
  const html = renderStaticHtml({ ...p, mode: 'site', siteUrl, canonicalUrl: `${siteUrl}/` });
  const t = p.theme;
  const { businessName } = contacts(p.data);

  const withSchema = html.replace(
    '</head>',
    () => `  ${localBusinessSchema(p.data, businessName, siteUrl, p.heroImageUrl, p.schemaOptions)}\n</head>`
  );

  const withNav = withSchema.replace(
    '<body>\n\n  <!-- Header -->',
    () => `<body>\n${navBar(t)}\n\n  <!-- Header -->`
  );

  const withFooter = withNav.replace(
    '  <!-- Sticky Bottom Bar -->',
    () => `${footerBadge(t, isAccessibilityExempt(p.data.vatStatus))}\n\n  <!-- Sticky Bottom Bar -->`
  );

  return withFooter;
}

// ─────────────────────────────────────────────────────────────────────────
// Shared building blocks — same CSS variables, header, nav, footer as index.
// ─────────────────────────────────────────────────────────────────────────

export function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function contacts(data: CollectedData) {
  const phone = data.phone || '';
  const whatsapp = data.whatsappNumber || data.phone || '';
  const whatsappHref = `https://wa.me/972${whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`;
  const phoneHref = `tel:${phone}`;
  const businessName = data.businessName || data.businessNiche || '';
  return { phone, whatsapp, whatsappHref, phoneHref, businessName };
}

export function styleBlock(t: VerticalTheme): string {
  return `<style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: '${t.fontBody.split(',')[0].replace(/['"]/g, '')}', Assistant, sans-serif; background: ${t.bg}; color: ${t.textPrimary}; }
    /* M2b.1c: a short page's leftover viewport below the footer takes the footer colour, not a blank bg strip. */
    html { background: ${t.surface}; }
    a { text-decoration: none; }
    input, button { font-family: inherit; }
    a:focus-visible, button:focus-visible, summary:focus-visible, input:focus-visible { outline: 3px solid ${t.textPrimary}; outline-offset: 2px; }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    #form-success { display: none; text-align: center; color: ${t.accentText}; font-weight: 700; font-size: 1.1rem; padding: 20px; }
    #form-error { display: none; text-align: center; color: #e53e3e; font-size: 0.9rem; padding: 8px; }
    .submit-btn { padding: 15px; background: ${t.ctaGradient}; color: ${t.ctaText}; border: none; border-radius: ${t.radiusSm}; font-weight: 800; font-size: 1.05rem; cursor: pointer; width: 100%; }
    .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  </style>`;
}

/**
 * Main-nav link texts (moved verbatim out of the legacy navBar markup in M2b.1b; the research nav reuses them, and
 * researchedSite.ts uses services/about as the accessible-name fallback of a section without its own headline).
 */
export const NAV_LINK_TEXT = { home: 'בית', services: 'שירותים', about: 'אודות', contact: 'צור קשר' } as const;

/**
 * M2b.1b (Maya C1): research-site nav. Legacy services.html / about.html do not exist there, so the services and
 * about links are same-page anchors on the homepage (`#services`, `#about`) and `/#services`, `/#about` elsewhere,
 * each drawn only when the homepage renders that section. `contactHref` is null when no contact page is emitted.
 */
export interface ResearchNavOptions {
  /** Accessible name of the nav (RESEARCHED_SITE_LABELS.mainNavLabel). */
  label: string;
  /** True on the homepage (anchors are same-page `#id`), false on every other page (`/#id`). */
  onHome: boolean;
  /** The homepage renders `id="services"` / `id="about"`. */
  homeHasServices: boolean;
  homeHasAbout: boolean;
  contactHref: string | null;
}

export function navBar(t: VerticalTheme, research?: ResearchNavOptions): string {
  if (research) return researchNavBar(t, research);
  return `  <nav style="background:${t.surface};border-bottom:1px solid ${t.border};padding:10px 20px;display:flex;gap:20px;justify-content:flex-end;font-size:0.9rem;">
    <a href="/">${NAV_LINK_TEXT.home}</a>
    <a href="/services">${NAV_LINK_TEXT.services}</a>
    <a href="/about">${NAV_LINK_TEXT.about}</a>
    <a href="/contact">${NAV_LINK_TEXT.contact}</a>
  </nav>`;
}

function researchNavBar(t: VerticalTheme, o: ResearchNavOptions): string {
  const anchor = (id: string) => (o.onHome ? `#${id}` : `/#${id}`);
  const links: Array<[string, string]> = [
    ['/', NAV_LINK_TEXT.home],
    ...(o.homeHasServices ? [[anchor('services'), NAV_LINK_TEXT.services] as [string, string]] : []),
    ...(o.homeHasAbout ? [[anchor('about'), NAV_LINK_TEXT.about] as [string, string]] : []),
    ...(o.contactHref ? [[o.contactHref, NAV_LINK_TEXT.contact] as [string, string]] : []),
  ];
  const items = links.map(([href, text]) => `<a href="${href}" style="display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:${t.textPrimary};">${text}</a>`).join('');
  return `  <nav aria-label="${esc(o.label)}" style="background:${t.surface};border-bottom:1px solid ${t.border};padding:0 10px;display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-start;font-size:0.9rem;">${items}</nav>`;
}

/**
 * The footer. Launch step 2 (capability 9): with `profile`, the Google-profile link opens the footer, in its own row above
 * the legal links (data-footer-profile: the redesign's footer NAP block, Yonatan condition 10, takes this row as it is).
 */
/** The footer's Google-profile row (data-footer-profile), '' without a profile. One markup for every footer, the legal pages included. */
export function footerProfileRow(t: VerticalTheme, profile?: FooterProfileLink): string {
  return profile ? `
    <div data-footer-profile style="margin-bottom:4px;display:flex;justify-content:center;"><a href="${esc(profile.href)}" style="display:inline-flex;align-items:center;min-height:44px;padding:0 8px;color:${t.textMuted};text-decoration:underline;">${escWithLatinIsolated(profile.label)}</a></div>` : '';
}

export function footerBadge(t: VerticalTheme, exempt: boolean, profile?: FooterProfileLink): string {
  const profileRow = footerProfileRow(t, profile);
  return `  <footer style="text-align:center;padding:24px 20px 32px;background:${t.surface};border-top:1px solid ${t.border};font-size:0.8rem;color:${t.textMuted};">${profileRow}
    <div style="margin-bottom:4px;display:flex;flex-wrap:wrap;gap:4px 6px;justify-content:center;">
      <a href="/privacy" style="display:inline-flex;align-items:center;min-height:44px;padding:0 8px;color:${t.textMuted};">מדיניות פרטיות</a>
      ${exempt ? '' : '<a href="/accessibility" style="display:inline-flex;align-items:center;min-height:44px;padding:0 8px;color:' + t.textMuted + ';">הצהרת נגישות</a>'}
    </div>
    <a href="https://wao.co.il" style="display:inline-flex;align-items:center;gap:0.3em;min-height:44px;padding:0 8px;color:${t.textMuted};text-decoration:none;">נבנה עם <strong>WAO</strong> 🚀</a>
  </footer>`;
}

export function stickyHeader(t: VerticalTheme, businessName: string, phone: string, phoneHref: string): string {
  return `  <header style="position:sticky;top:0;z-index:50;background:${t.surface};border-bottom:1px solid ${t.border};padding:12px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <div style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.1rem;color:${t.primary};">${esc(businessName)}</div>
    ${phone ? `<a href="${phoneHref}" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;background:${t.ctaGradient};color:${t.ctaText};padding:10px 18px;border-radius:${t.radiusSm};font-weight:700;font-size:0.9rem;white-space:nowrap;"><span aria-hidden="true">📞</span><bdi dir="ltr">${esc(phone)}</bdi></a>` : ''}
  </header>`;
}

// ─────────────────────────────────────────────────────────────────────────
// Vertical Schema Subtype Mapping
// ─────────────────────────────────────────────────────────────────────────

const SCHEMA_ORG_NICHE_MAP: Array<{ keywords: string[]; schemaType: string }> = [
  {
    // Locksmith
    keywords: ['locksmith', '\u05de\u05e0\u05e2\u05d5\u05dc\u05df', '\u05de\u05e0\u05e2\u05d5\u05dc'],
    schemaType: 'Locksmith',
  },
  {
    // Plumber
    keywords: ['plumber', '\u05d0\u05d9\u05e0\u05e1\u05d8\u05dc\u05d8\u05d5\u05e8', '\u05e9\u05e8\u05d1\u05e8\u05d1', '\u05d0\u05d9\u05e0\u05e1\u05d8\u05dc'],
    schemaType: 'Plumber',
  },
  {
    // Electrician
    keywords: ['electrician', '\u05d7\u05e9\u05de\u05dc\u05d0\u05d9', '\u05d7\u05e9\u05de\u05dc'],
    schemaType: 'Electrician',
  },
  {
    // HVAC
    keywords: ['hvac', '\u05de\u05d9\u05d6\u05d5\u05d2 \u05d0\u05d5\u05d5\u05d9\u05e8', '\u05d8\u05db\u05e0\u05d0\u05d9 \u05de\u05d6\u05d2\u05e0\u05d9\u05dd', '\u05de\u05d6\u05d2\u05e0\u05d9\u05dd', '\u05de\u05d6\u05d2\u05df', '\u05de\u05d9\u05d6\u05d5\u05d2'],
    schemaType: 'HVACBusiness',
  },
  {
    // Roofing
    keywords: ['roofing', '\u05d0\u05d9\u05d8\u05d5\u05dd', '\u05d2\u05d2\u05d5\u05ea'],
    schemaType: 'RoofingContractor',
  },
  {
    // Automotive
    keywords: ['automotive', 'auto repair', 'auto', '\u05de\u05d5\u05e1\u05da', '\u05e8\u05db\u05d1'],
    schemaType: 'AutoRepair',
  },
  {
    // Medical / Clinic
    keywords: ['medical', 'clinic', '\u05e8\u05d5\u05e4\u05d0', '\u05de\u05e8\u05e4\u05d0\u05d4', '\u05de\u05e8\u05e4\u05d0\u05ea'],
    schemaType: 'MedicalBusiness',
  },
  {
    // Home services / Handyman
    keywords: ['home services', 'handyman', '\u05e9\u05d9\u05e4\u05d5\u05e6\u05d9\u05dd', '\u05e9\u05d9\u05e4\u05d5\u05e5', '\u05d4\u05e0\u05d3\u05d9\u05de\u05df'],
    schemaType: 'HomeAndConstructionBusiness',
  },
];

export function getSchemaOrgType(businessNiche?: string): string {
  if (!businessNiche) return 'LocalBusiness';
  const lower = businessNiche.toLowerCase();
  for (const entry of SCHEMA_ORG_NICHE_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.schemaType;
    }
  }
  return 'LocalBusiness';
}

// LocalBusiness JSON-LD — NOT AggregateRating/Review: Google's structured-data
// policy disqualifies (and risks a manual action on) self-hosted review schema
// where the business controls the reviews about itself, which is exactly this
// case. starRating/reviewCount stay visible page copy only, never schema.
export interface LocalBusinessSchemaOptions {
  /**
   * M2a.1 (Yonatan's schema must-fixes): emit only what the owner stated. No hard-coded
   * priceRange / paymentAccepted, openingHoursSpecification only when the hours parse,
   * areaServed as one City per owner-stated place, sameAs only from a GBP/Maps URL in the
   * data, address only from the owner's streetAddress (never invented).
   */
  ownerFactsOnly?: boolean;
  /** Owner-stated places for areaServed (display names); default: targetLocation + specificCities. */
  areaServed?: string[];
}

const MAPS_URL = /^https:\/\/(?:(?:www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|g\.page|share\.google)\//i;

/** Yonatan C3: a place_id we may build a link from. Anything else (e.g. `fixture-...` test ids) renders no link and no sameAs. */
export const PLACE_ID_FORMAT = /^[A-Za-z0-9_-]{10,}$/;
/** Yonatan C2: cap on the Maps URLs `query` (code points; the whole URL limit is 2,048). */
export const MAPS_QUERY_MAX_CHARS = 100;

/** True when the id may reach production output (C3): the documented format and never a `fixture-` id. */
export function isUsablePlaceId(placeId: unknown): placeId is string {
  return typeof placeId === 'string' && PLACE_ID_FORMAT.test(placeId) && !/^fixture/i.test(placeId);
}

function mapsQuery(value: string | undefined): string {
  const clean = (value ?? '').replace(/\s+/g, ' ').trim();
  return Array.from(clean).slice(0, MAPS_QUERY_MAX_CHARS).join('').trim();
}

/**
 * Yonatan C1/C2: the Maps URLs search link for a place_id. `query` = the owner-confirmed business name from intake (never a
 * stored Places displayName); without one, a generic category + city query from intake. Built with URL/searchParams only
 * (spaces become `+`, Hebrew is percent-encoded), never by hand. '' when the id is not usable (C3) or there is no query.
 */
export function buildPlaceIdMapsUrl(data: Pick<CollectedData, 'placeId' | 'businessName' | 'businessNiche' | 'targetLocation'>): string {
  const placeId = typeof data.placeId === 'string' ? data.placeId.trim() : '';
  if (!isUsablePlaceId(placeId)) return '';
  const query = mapsQuery(data.businessName) || mapsQuery([data.businessNiche, data.targetLocation].map(v => (v ?? '').trim()).filter(Boolean).join(' '));
  if (!query) return '';
  const url = new URL('https://www.google.com/maps/search/');
  url.searchParams.set('api', '1');
  url.searchParams.set('query', query);
  url.searchParams.set('query_place_id', placeId);
  const href = url.toString();
  return MAPS_URL.test(href) ? href : '';
}

/**
 * The business's Google profile URL, else ''. One source for the schema sameAs and the visible profile links (launch step 2,
 * capability 9), so the two never differ. Priority (Yonatan C5): the GBP `metadata.mapsUri` that build step 6 stores in
 * googleMapsUrl (allowlisted by MAPS_URL), then the URL built from the stored place_id (buildPlaceIdMapsUrl). Never the
 * Places `googleMapsUri`. A place_id that came back NOT_FOUND is already removed from the record (site-bot/placeIdRefresh.ts, C4).
 */
export function googleProfileUrl(data: Pick<CollectedData, 'googleMapsUrl' | 'placeId' | 'businessName' | 'businessNiche' | 'targetLocation'>): string {
  if (typeof data.googleMapsUrl === 'string' && MAPS_URL.test(data.googleMapsUrl.trim())) return data.googleMapsUrl.trim();
  return buildPlaceIdMapsUrl(data);
}

/** JSON for an inline <script type="application/ld+json">: `</` is written `<\/` so no value can close the script element. */
export function jsonLdText(value: unknown): string {
  return JSON.stringify(value).replace(/<\//g, '<\\/');
}

/** Escaped text with each Latin run (a brand such as Google) in its own <bdi>, so it never reorders the Hebrew around it. */
export function escWithLatinIsolated(value: string): string {
  return value.split(/([A-Za-z][A-Za-z0-9.'&-]*(?: [A-Za-z][A-Za-z0-9.'&-]*)*)/).map((part, index) => (index % 2 ? `<bdi>${esc(part)}</bdi>` : esc(part))).join('');
}

function ownerStatedPlaces(data: CollectedData): string[] {
  const seen = new Set<string>();
  return [data.targetLocation, ...(data.specificCities ?? '').split(',')]
    .map(value => (value ?? '').trim())
    .filter(value => value && !seen.has(value.toLowerCase()) && Boolean(seen.add(value.toLowerCase())));
}

function ownerFactsLocalBusiness(data: CollectedData, businessName: string, cleanSiteUrl: string, ogImage: string, options: LocalBusinessSchemaOptions): Record<string, unknown> {
  const hours = parseBusinessHours(data.businessHours);
  const places = (options.areaServed ?? ownerStatedPlaces(data)).map(name => name.trim()).filter(Boolean);
  const mapsUrl = googleProfileUrl(data);
  return {
    '@type': getSchemaOrgType(data.businessNiche),
    '@id': `${cleanSiteUrl}/#business`,
    name: businessName,
    url: cleanSiteUrl,
    image: ogImage,
    ...(data.phone ? { telephone: data.phone } : {}),
    ...(data.streetAddress ? { address: { '@type': 'PostalAddress', streetAddress: data.streetAddress, ...(data.targetLocation ? { addressLocality: data.targetLocation } : {}), addressCountry: 'IL' } } : {}),
    ...(places.length ? { areaServed: places.map(name => ({ '@type': 'City', name })) } : {}),
    ...(hours ? { openingHoursSpecification: hours } : {}),
    ...(mapsUrl ? { sameAs: [mapsUrl] } : {}),
  };
}

export function localBusinessObject(data: CollectedData, businessName: string, siteUrl: string, ogImage: string, options: LocalBusinessSchemaOptions = {}): Record<string, unknown> {
  const cleanSiteUrl = siteUrl.replace(/\/$/, '');
  if (options.ownerFactsOnly) return ownerFactsLocalBusiness(data, businessName, cleanSiteUrl, ogImage, options);
  const address = data.streetAddress
    ? {
        '@type': 'PostalAddress',
        streetAddress: data.streetAddress,
        addressLocality: data.targetLocation || undefined,
        addressCountry: 'IL',
      }
    : undefined;

  return {
    '@type': getSchemaOrgType(data.businessNiche),
    '@id': `${cleanSiteUrl}/#business`,
    name: businessName,
    url: cleanSiteUrl,
    image: ogImage,
    priceRange: '$$',
    currenciesAccepted: 'ILS',
    paymentAccepted: ['Cash', 'Credit Card', 'Bit', 'PayBox'],
    ...(data.phone ? { telephone: data.phone } : {}),
    ...(address ? { address } : {}),
    ...(!address && (data.targetLocation || data.specificCities)
      ? { areaServed: data.specificCities || data.targetLocation }
      : {}),
    ...(data.businessHours ? { openingHours: data.businessHours } : {}),
  };
}

export function localBusinessSchema(data: CollectedData, businessName: string, siteUrl: string, ogImage: string, options: LocalBusinessSchemaOptions = {}): string {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    ...localBusinessObject(data, businessName, siteUrl, ogImage, options),
  };

  return `<script type="application/ld+json">${jsonLdText(schema)}</script>`;
}

export function pageHead(opts: {
  t: VerticalTheme;
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  schema?: string;
  fraudBlockerSid?: string;
  /** Page-specific CSS appended after the theme style block (unset = byte-identical head). */
  extraCss?: string;
  /** robots meta content (unset = index,follow). */
  robots?: string;
}): string {
  const { t, title, description, canonicalUrl, ogImage, schema, fraudBlockerSid, extraCss, robots } = opts;
  return `<head>
  ${fraudBlockerSid ? buildFraudBlockerTrackerHtml(fraudBlockerSid) : ''}
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="${robots ?? 'index,follow'}" />
  <link rel="canonical" href="${canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:locale" content="he_IL" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Secular+One&family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet" />
  ${styleBlock(t)}${extraCss ? `\n  <style>${extraCss}</style>` : ''}
  ${schema || ''}
</head>`;
}

// Trust bar (same items as homepage) — reusable section.
export function trustBarSection(t: VerticalTheme, items: string[]): string {
  const html = items.map(item => `
    <div style="background:rgba(255,255,255,0.12);color:#fff;padding:6px 14px;border-radius:${t.radiusSm};font-size:0.85rem;font-weight:600;white-space:nowrap;">
      ${esc(item)}
    </div>`).join('');
  return `  <section style="background:${t.primary};padding:16px 20px;">
    <div style="max-width:700px;margin:0 auto;display:flex;flex-wrap:wrap;gap:8px;justify-content:center;">
      ${html}
    </div>
  </section>`;
}

// Lead form section (same markup/behavior as renderStaticHtml's Lead Form).
export function leadFormSection(t: VerticalTheme, headline: string, ctaLabel: string, options: LeadFormOptions = {}): string {
  const submitLabel = options.submitLabel ?? ctaLabel;
  const heading = options.headline === false
    ? ''
    : `
      <h2 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:1.35rem;color:${t.primary};margin-bottom:20px;text-align:center;">${esc(headline)}</h2>`;
  return `  <section${options.sectionId ? ` id="${esc(options.sectionId)}"` : ''} style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:480px;margin:0 auto;">${heading}
      <form id="lead-form" style="display:flex;flex-direction:column;gap:14px;">
        <input type="text" id="f-name" placeholder="שם מלא" aria-label="שם מלא" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};" />
        <input type="tel" id="f-phone" placeholder="050-0000000" aria-label="מספר טלפון" dir="ltr" required style="padding:14px 16px;border-radius:${t.radiusSm};border:1px solid ${t.border};font-size:1rem;color:${t.textPrimary};background:${t.surface};text-align:right;" />
        <label style="${CONSENT_LABEL_STYLE}">
          <input type="checkbox" id="f-consent" required style="${CONSENT_CHECKBOX_STYLE}" />
          <span style="font-size:0.8rem;color:${t.textMuted};line-height:1.4;">אני מסכים/ה ל<a href="/privacy" style="${CONSENT_LINK_STYLE}color:${t.textMuted};text-decoration:underline;">מדיניות הפרטיות</a>.</span>
        </label>
        <div id="form-error">שגיאה בשליחה — נסה שוב או התקשר ישירות.</div>
        <button type="submit" class="submit-btn">${esc(submitLabel)}</button>
      </form>
      <div id="form-success">${options.thanks !== undefined ? esc(options.thanks) : '✅ תודה! נחזור אליך בהקדם.'}</div>
    </div>
  </section>`;
}

// Wires the lead-form submit handler + tel/wa click-stub pings.
// Mirrors renderStaticHtml's inline <script> so /api/lead + conversion labels behave identically.
export function pageScript(opts: {
  slug: string;
  businessName: string;
  googleAdsCustomerId: string;
  formConversionLabel: string;
  phoneConversionLabel: string;
  whatsappConversionLabel: string;
  ctaLabel: string;
  includeLeadForm: boolean;
}): string {
  const { slug, businessName, googleAdsCustomerId, formConversionLabel, phoneConversionLabel, whatsappConversionLabel, ctaLabel, includeLeadForm } = opts;

  return `  <script>
    var _params = new URLSearchParams(window.location.search);
    var _gclid   = _params.get('gclid')   || null;
    var _wbraid  = _params.get('wbraid')  || null;
    var _gbraid  = _params.get('gbraid')  || null;
    var _clickId = _gclid ? { gclid: _gclid } : _wbraid ? { wbraid: _wbraid } : _gbraid ? { gbraid: _gbraid } : {};

    function _uid() {
      return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function _pingClick(type) {
      var orderId = _uid();
      fetch('https://wao.co.il/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.assign({
          name: null,
          phone: null,
          service: type,
          source: 'site-${slug}',
          orderId: orderId,
          slug: '${slug}',
          customerId: '${googleAdsCustomerId}',
          type: 'click-stub'
        }, _clickId))
      }).catch(function(){});
    }
    ${includeLeadForm ? `
    document.getElementById('lead-form').addEventListener('submit', async function(e) {
      e.preventDefault();
      var btn = this.querySelector('button[type="submit"]');
      var errEl = document.getElementById('form-error');
      var successEl = document.getElementById('form-success');
      btn.disabled = true;
      btn.textContent = 'שולח...';
      errEl.style.display = 'none';
      var orderId = _uid();
      try {
        var res = await fetch('https://wao.co.il/api/lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.assign({
            name: document.getElementById('f-name').value,
            phone: document.getElementById('f-phone').value,
            service: 'site-form',
            source: 'site-${slug}',
            message: 'פנייה מהאתר: ${esc(businessName)}',
            orderId: orderId,
            slug: '${slug}',
            customerId: '${googleAdsCustomerId}',
            type: 'form'
          }, _clickId))
        });
        if (!res.ok) throw new Error('server error');
        this.style.display = 'none';
        successEl.style.display = 'block';
        ${formConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${formConversionLabel}','transaction_id':orderId});}` : ''}
      } catch(err) {
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = '${esc(ctaLabel)}';
      }
    });` : ''}

    document.querySelectorAll('a[href^="tel:"]').forEach(function(el) {
      el.addEventListener('click', function() {
        _pingClick('phone-click');
        ${phoneConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${phoneConversionLabel}'});}` : ''}
      });
    });
    document.querySelectorAll('a[href^="https://wa.me"]').forEach(function(el) {
      el.addEventListener('click', function() {
        _pingClick('whatsapp-click');
        ${whatsappConversionLabel ? `if(window.gtag){gtag('event','conversion',{'send_to':'${whatsappConversionLabel}'});}` : ''}
      });
    });
  </script>`;
}

// ─────────────────────────────────────────────────────────────────────────
// about.html
// ─────────────────────────────────────────────────────────────────────────

function buildAboutHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, businessName } = contacts(data);
  const canonicalUrl = servedUrl(siteUrl, 'about.html');

  const head = pageHead({
    t,
    title: `${esc(copy.aboutPageHeadline)} — ${esc(businessName)}`,
    description: copy.aboutPageBody,
    canonicalUrl,
    ogImage: heroImageUrl,
    schema: localBusinessSchema(data, businessName, siteUrl, heroImageUrl, p.schemaOptions),
    fraudBlockerSid: p.fraudBlockerSid,
  });

  const trustBar = trustBarSection(t, copy.trustBarItems);

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- About Hero -->
  <section style="padding:44px 20px 36px;background:${t.surface};text-align:center;">
    <div style="max-width:600px;margin:0 auto;">
      <div style="width:72px;height:72px;border-radius:50%;background:${t.ctaGradient};margin:0 auto 20px;display:flex;align-items:center;justify-content:center;color:${t.ctaText};font-weight:900;font-size:1.7rem;">
        ${esc((data.ownerName || businessName || '?')[0])}
      </div>
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.5rem,4.5vw,2.1rem);color:${t.primary};line-height:1.25;margin-bottom:18px;">${esc(copy.aboutPageHeadline)}</h1>
      <p style="color:${t.textMuted};font-size:1rem;line-height:1.7;">${esc(copy.aboutPageBody)}</p>
    </div>
  </section>

${trustBar}

  <!-- CTA -->
  <section style="padding:36px 20px;background:${t.surfaceAlt};text-align:center;">
    <a href="/contact" style="display:inline-block;background:${t.ctaGradient};color:${t.ctaText};padding:14px 32px;border-radius:${t.radiusSm};font-weight:800;font-size:1.05rem;">${esc(copy.heroCta)}</a>
  </section>

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: copy.heroCta,
    includeLeadForm: false,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet, data);
}

// ─────────────────────────────────────────────────────────────────────────
// services.html
// ─────────────────────────────────────────────────────────────────────────

function buildServicesHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, businessName } = contacts(data);
  const canonicalUrl = servedUrl(siteUrl, 'services.html');

  const head = pageHead({
    t,
    title: `${esc(copy.servicesHeadline)} — ${esc(businessName)}`,
    description: copy.heroSubheadline,
    canonicalUrl,
    ogImage: heroImageUrl,
    schema: localBusinessSchema(data, businessName, siteUrl, heroImageUrl, p.schemaOptions),
    fraudBlockerSid: p.fraudBlockerSid,
  });

  const cards = copy.serviceDetails.map(s => `
    <div style="background:${t.surface};border:1px solid ${t.border};border-radius:${t.radiusMd};padding:20px;border-inline-start:3px solid ${t.accent};">
      <h3 style="font-weight:700;font-size:1rem;color:${t.primary};margin-bottom:8px;">${esc(s.name)}</h3>
      <p style="color:${t.textMuted};font-size:0.9rem;line-height:1.5;">${esc(s.description)}</p>
    </div>`).join('');

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- Services -->
  <section style="padding:40px 20px;background:${t.surfaceAlt};">
    <div style="max-width:700px;margin:0 auto;">
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.4rem,4vw,1.9rem);color:${t.primary};margin-bottom:24px;text-align:center;">${esc(copy.servicesHeadline)}</h1>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;">
        ${cards}
      </div>
    </div>
  </section>

${leadFormSection(t, copy.formHeadline, copy.heroCta)}

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: p.formConversionLabel || '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: copy.heroCta,
    includeLeadForm: true,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet, data);
}

// ─────────────────────────────────────────────────────────────────────────
// contact.html
// ─────────────────────────────────────────────────────────────────────────

function buildContactHtml(p: RenderSitePagesParams, siteUrl: string): string {
  const { theme: t, copy, data, heroImageUrl, slug } = p;
  const { phone, phoneHref, whatsapp, whatsappHref, businessName } = contacts(data);
  const canonicalUrl = servedUrl(siteUrl, 'contact.html');

  const head = pageHead({
    t,
    title: p.researched?.contactTitle ?? `${esc(copy.formHeadline)} — ${esc(businessName)}`,
    description: p.researched?.contactDescription ?? copy.heroSubheadline,
    ...(p.researched?.contactDescription === null ? { robots: 'noindex,follow' } : {}),
    canonicalUrl,
    ogImage: heroImageUrl,
    schema: localBusinessSchema(data, businessName, siteUrl, heroImageUrl, p.schemaOptions),
    fraudBlockerSid: p.fraudBlockerSid,
  });

  // M2a.2: researched sites show the hours formatted in code (Hebrew day letters), never raw Latin.
  const hours = p.researched ? displayBusinessHours(data.businessHours) : data.businessHours;
  const hoursHtml = hours
    ? `<p style="color:${t.textMuted};font-size:0.9rem;margin-top:8px;">🕒 ${esc(hours)}</p>`
    : '';

  const body = `${stickyHeader(t, businessName, phone, phoneHref)}

  <!-- Contact Intro -->
  <section style="padding:36px 20px 20px;background:${t.surface};text-align:center;">
    <div style="max-width:500px;margin:0 auto;">
      <h1 style="font-family:'Secular One',sans-serif;font-weight:${t.headingWeight};font-size:clamp(1.4rem,4vw,1.9rem);color:${t.primary};margin-bottom:16px;">${esc(copy.formHeadline)}</h1>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:8px;">
        ${phone ? `<a href="${phoneHref}" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;background:${t.ctaGradient};color:${t.ctaText};padding:12px 24px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;"><span aria-hidden="true">📞</span><bdi dir="ltr">${esc(phone)}</bdi></a>` : ''}
        ${whatsapp ? `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;min-height:44px;background:#25D366;color:#fff;padding:12px 24px;border-radius:${t.radiusSm};font-weight:800;font-size:1rem;"><span aria-hidden="true">💬</span>וואטסאפ</a>` : ''}
      </div>
      ${hoursHtml}
    </div>
  </section>

${p.researched
    // M2a.3 (item 9): the H1 above already shows formHeadline, so the researched form drops its H2.
    ? leadFormSection(t, copy.formHeadline, copy.heroCta, { ...RESEARCHED_LEAD_FORM, headline: false })
    : leadFormSection(t, copy.formHeadline, copy.heroCta)}

${pageScript({
    slug,
    businessName,
    googleAdsCustomerId: p.googleAdsCustomerId || '',
    formConversionLabel: p.formConversionLabel || '',
    phoneConversionLabel: p.phoneConversionLabel || '',
    whatsappConversionLabel: p.whatsappConversionLabel || '',
    ctaLabel: p.researched ? RESEARCHED_LEAD_FORM.submitLabel ?? copy.heroCta : copy.heroCta,
    includeLeadForm: true,
  })}`;

  return assembleDocument(t, head, body, p.gtagSnippet, data, p.researchNav, p.footerProfileLink);
}

// Assembles <head> + <body> with nav bar (top) and footer badge (bottom) for
// the 3 standalone pages (index.html has its own injection path above).
export function assembleDocument(t: VerticalTheme, head: string, bodyInner: string, gtagSnippet: string | undefined, data: CollectedData, nav?: ResearchNavOptions, profile?: FooterProfileLink): string {
  const headWithGtag = gtagSnippet ? head.replace('</head>', () => `  ${gtagSnippet}\n</head>`) : head;
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
${headWithGtag}
<body>
${navBar(t, nav)}

${bodyInner}

${footerBadge(t, isAccessibilityExempt(data.vatStatus), profile)}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────
// sitemap.xml
// ─────────────────────────────────────────────────────────────────────────

// `extraPaths` — additional relative deploy file paths (e.g. core-30 `sherut/{id}.html` entries) appended after the 4
// static pages. M4 step 0: every <loc> is the extensionless served URL (servedUrl), never a redirecting `.html` URL.
export function buildSitemap(siteUrl: string, extraPaths: string[] = []): string {
  const urls = ['', 'about.html', 'services.html', 'contact.html', ...extraPaths];
  const entries = urls.map(u => `  <url>
    <loc>${servedUrl(siteUrl, u)}</loc>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}
