/**
 * Site Bot step 2c: the HTML of the owner's home-page preview (GET /api/site-bot/interview-preview-frame, loaded by an
 * <iframe sandbox> on /site-bot/start).
 *
 * Isolation design (2c item 5):
 *   1. The route answers only the interview session cookie (httpOnly, Path=/api/site-bot): the frame URL names no session
 *      and no research, so another session's cookie reaches its own preview or nothing (404), no cookie = 401.
 *   2. The iframe is sandboxed with NO tokens (no scripts, no same-origin, no forms, no popups, no top navigation), and the
 *      response carries `Content-Security-Policy: sandbox; default-src 'none'; ...` so the document is sandboxed even when
 *      opened directly. Same-origin is not needed: every asset is inlined below, so the opaque-origin document never makes a
 *      request (an opaque origin would not get the SameSite=Lax cookie on a sub-request anyway).
 *   3. Assets are inlined as data: URLs: the hero = one width of the trade atmosphere library photo the deploy would pick
 *      (heroLibraryStore.resolveSiteLibraryHeroes, sha256-checked), the Heebo fonts (siteFonts), the logo = the generated
 *      code-typeset lockup / trade mark (siteLogo.pickLogo, inline SVG). Never stock, never a placeholder: a trade without a
 *      library photo renders the solid hero exactly as the live site would.
 *   4. Inert: every script except JSON-LD is removed (and CSP script-src is 'none'); every link except in-page #anchors
 *      loses its href (call, WhatsApp, navigation); the form loses its action and sits in the sandbox without
 *      allow-forms, so nothing submits or dials. assertPreviewInert re-checks the result.
 *   5. Never public, indexed or cached: X-Robots-Tag noindex, nofollow and Cache-Control private, no-store (PREVIEW_FRAME_HEADERS).
 *
 * Server-only. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */
import type { CollectedData } from '../bot/prompts';
import { renderResearchedSitePages } from '../lp/researchedSite';
import { SITE_FONT_PATHS, siteFontFiles } from '../lp/siteFonts';
import { pickLogo } from '../lp/siteLogo';
import type { SiteLook } from '../lp/siteLook';
import { resolveSiteLibraryHeroes, type PeerScanOptions } from './heroLibraryStore';
import type { PreviewHomeRecord } from './previewGeneration';
import { researchedRenderInputs } from './researchToSite';

export const PREVIEW_FRAME_CSP = [
  'sandbox', "default-src 'none'", 'img-src data:', "style-src 'unsafe-inline'", 'font-src data:', "base-uri 'none'",
  "form-action 'none'", "frame-ancestors 'self'",
].join('; ');

export const PREVIEW_FRAME_HEADERS: Readonly<Record<string, string>> = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Robots-Tag': 'noindex, nofollow',
  'Content-Security-Policy': PREVIEW_FRAME_CSP,
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

/** The iframe's sandbox attribute (empty = every restriction on), shared with the start page. */
export { PREVIEW_IFRAME_SANDBOX } from './previewFrameSandbox';

const MIME: Readonly<Record<string, string>> = { webp: 'image/webp', avif: 'image/avif', woff2: 'font/woff2' };

function dataUrl(file: string, bytes: Buffer): string {
  const ext = file.slice(file.lastIndexOf('.') + 1);
  return `data:${MIME[ext] ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`;
}

/** The generated logo look (the code-typeset name + the trade mark library), as the live site's default pick. */
export function previewLook(data: CollectedData, slug: string): SiteLook | undefined {
  const name = typeof data.businessName === 'string' ? data.businessName : '';
  const pick = pickLogo(name, { businessNiche: data.businessNiche, primaryService: data.primaryService, targetLocation: data.targetLocation, ownerName: data.ownerName, siteId: slug });
  if (!pick) return undefined;
  return { logo: { approved: true, kind: 'generated', variant: pick.defaultVariant, ...(pick.markId ? { markId: pick.markId } : {}) } };
}

/** Makes a rendered page inert and self-contained (see the header, items 3-4). `files` = img/<name> -> bytes. */
export function inertPreviewHtml(html: string, files: Readonly<Record<string, Buffer>>): string {
  const fonts = siteFontFiles();
  let out = html
    .replace(/<script\b(?![^>]*\btype=(['"])application\/ld\+json\1)[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<link\b[^>]*\brel=(['"])preload\1[^>]*>\s*/gi, '')
    .replace(/<link\b[^>]*\bhref=(['"])(?:https?:)?\/\/[^'"]*\1[^>]*>\s*/gi, '');
  for (const key of ['hebrew', 'latin'] as const) {
    const served = SITE_FONT_PATHS[key];
    const bytes = fonts[served.slice(1)];
    if (bytes) out = out.split(served).join(dataUrl(served, bytes));
  }
  // The hero <picture>: one inlined width instead of the srcset (the sources would each need a request).
  out = out.replace(/<source\b[^>]*>/gi, '').replace(/\s(?:srcset|sizes)=(['"])[^'"]*\1/gi, '');
  out = out.replace(/(["'(])\/(img\/[A-Za-z0-9._-]+\.(?:webp|avif))/g, (match, lead: string, file: string) => (files[file] ? `${lead}${dataUrl(file, files[file])}` : `${lead}data:,`));
  // Links: only in-page anchors keep an href; tel:, WhatsApp, mail and navigation become inert text.
  out = out.replace(/<a\b([^>]*)>/gi, (_tag, attrs: string) => {
    const href = /\shref=(['"])(.*?)\1/i.exec(attrs)?.[2] ?? '';
    if (href.startsWith('#')) return `<a${attrs}>`;
    return `<a${attrs.replace(/\s(?:href|target|rel|onclick)=(['"])[\s\S]*?\1/gi, '')} aria-disabled="true">`;
  });
  out = out.replace(/<form\b([^>]*)>/gi, (_tag, attrs: string) => `<form${attrs.replace(/\s(?:action|method|target|onsubmit)=(['"])[\s\S]*?\1/gi, '')}>`);
  out = out.replace(/\son[a-z]+=(['"])[\s\S]*?\1/gi, '');
  return out;
}

/** Throws when the preview HTML could run a script, make a request, submit, dial or navigate. */
export function assertPreviewInert(html: string): void {
  if (/<script\b(?![^>]*application\/ld\+json)/i.test(html)) throw new Error('preview: executable script');
  if (/<a\b[^>]*\shref=(['"])(?!#)/i.test(html)) throw new Error('preview: active link');
  if (/<form\b[^>]*\saction=/i.test(html)) throw new Error('preview: form action');
  if (/\b(?:src|srcset)=(['"])(?!data:)/i.test(html)) throw new Error('preview: external source');
  if (/url\((['"]?)(?!data:|#)[^)]/i.test(html)) throw new Error('preview: external url()');
}

/** The full, inert preview document of a stored preview record. */
export async function previewFrameHtml(record: PreviewHomeRecord, options: PeerScanOptions & { libraryRoot?: string } = {}): Promise<string> {
  const data = record.collectedData;
  const heroes = await resolveSiteLibraryHeroes({
    slug: record.slug, createdAt: record.createdAt, researchId: record.researchId, collectedData: data, researchedPages: [record.page],
  }, false, options);
  const look = previewLook(data, record.slug);
  const rendered = renderResearchedSitePages({
    ...researchedRenderInputs(data, record.slug),
    data,
    slug: record.slug,
    pages: [record.page],
    graphEdges: [],
    ...(look ? { look } : {}),
    ...(Object.keys(heroes.libraryHeroes).length ? { libraryHeroes: heroes.libraryHeroes } : {}),
  })['index.html'];
  if (!rendered) throw new Error('preview: render failed');
  const html = inertPreviewHtml(rendered, heroes.files);
  assertPreviewInert(html);
  return html;
}
