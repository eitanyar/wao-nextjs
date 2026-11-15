// The landing page inside the homepage hero window, per showcase entry (src/lib/home/heroShowcases.ts):
// - site-record: a stored site record rendered by the product's own Site Bot renderer (the same call the video
//   recorder makes, scripts/video/record/lib/site.mjs);
// - live-url: a live client site on our wao-sites Worker, fetched at build time (tenant host only).
// Both are cut to their top (header + hero) and pass the same guards (guardWindowHtml) before display in a 960px
// frame. Served noindex by src/app/hero-window/lp/[id]/route.ts. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import type { CollectedData } from "@/lib/bot/prompts";
import { renderResearchedSitePages, type ResearchedSitePage, type ResearchedSiteGraphEdge } from "@/lib/lp/researchedSite";
import { researchedRenderInputs } from "@/lib/site-bot/researchToSite";
import { SITE_FONT_PATHS } from "@/lib/lp/siteFonts";
import { HERO_SITE_RECORDS } from "./heroWindow";
import { SHOWCASES, assertWorkerUrl, type OwnerPhoto, type ShowcaseEntry } from "./heroShowcases";

export const HERO_FONT_BASE = "/hero-window/fonts/";

const BASE_CSS = "html,body{overflow:hidden;}";
// A real owner photo (entry.ownerPhoto: client consent, aiGenerated false, validated in heroShowcases.ts) at the
// renderer's reserved hero photo slot (heroPhotoSlot, empty until GBP photos). Without one the product's own hero shows:
// the text block runs the full width, no empty slot (Fable 5.2, 2026-11-16: no AI owner photo in the window).
const OWNER_CSS = [
  ".hw-owner img{display:block;width:200px;height:auto;aspect-ratio:3/4;object-fit:cover;border-radius:var(--r-md);box-shadow:0 2px 10px rgba(13,27,42,0.12);}",
  "@media (min-width:900px){.hero-grid{grid-template-columns:minmax(0,1fr) auto;align-items:center;}}",
].join("");

/** Characters that would put a rating, review count or result on screen (Adam's line: none in the window). */
export const FORBIDDEN_IN_WINDOW = /★|\d\.\d/;
/** Review / rating markup that must never reach the window. */
export const REVIEW_MARKUP = /data-demo-reviews|rv-card|aggregateRating|reviewCount|ratingValue|itemprop="review|data-section="(?:trust|reviews)"|class="trust"/i;
/** Test / demo / placeholder domains that must never reach the window. */
export const TEST_DOMAIN = /\.invalid\b|demo-plumber|localhost|127\.0\.0\.1|example\.(?:com|org|net)|\.test\b|\.local\b/i;
/** Known AI-made people photos (the video demo owner / work photos, the retired hero owner crop) or an AI-flagged image. */
export const AI_PHOTO = /hero-owner\.|\/video\/demo\/photos\/|demo-owner|data-ai-generated/i;

/** Body text a visitor can see (tags, styles and attributes removed). */
export function visibleText(html: string): string {
  const body = html.slice(html.indexOf("<body"));
  return body.replace(/<style\b[\s\S]*?<\/style>/g, " ").replace(/<svg\b[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
}

function once(html: string, needle: string, what: string): number {
  const at = html.indexOf(needle);
  if (at < 0 || html.indexOf(needle, at + 1) >= 0) throw new Error(`hero LP: expected one ${what}`);
  return at;
}

/**
 * Removes the visible phone number (its <bdi> runs) and every tel: target; throws if digits remain. With a known
 * phone it checks that number; without one (live sites) any run of 9+ digits in the visible text fails.
 */
export function stripPhoneDigits(html: string, phone?: string): string {
  let out = html;
  if (phone) {
    const shown = phone.trim();
    out = out.split(`<bdi dir="ltr" class="num">${shown}</bdi>`).join("").split(`<bdi dir="ltr">${shown}</bdi>`).join("");
  } else {
    out = out.replace(/<bdi dir="ltr"(?: class="num")?>[\d\s+()-]{7,}<\/bdi>/g, "");
  }
  out = out.replace(/href="tel:[^"]*"/g, 'href="#"');
  const compact = out.replace(/[\s-]/g, "");
  if (phone) {
    const digits = phone.replace(/\D/g, "");
    if (compact.includes(digits) || compact.includes(digits.replace(/^0/, ""))) throw new Error("hero LP: the phone number still shows in the window");
  }
  if (/\d{9,}/.test(visibleText(out).replace(/[\s()+-]/g, ""))) throw new Error("hero LP: phone-like digits still show in the window");
  return out;
}

/** Cuts a product-rendered page to header + hero (everything below, incl. trust / rating strips, is dropped). */
function cutToHero(html: string, slotHtml = ""): string {
  const heroAt = once(html, '<section class="hero', "hero section");
  const heroEnd = html.indexOf("</section>", heroAt);
  if (heroEnd < 0) throw new Error("hero LP: hero section not closed");
  if (!slotHtml) return `${html.slice(0, heroEnd)}</section></main></body></html>`;
  const slotClose = "</div></div></section>";
  if (html.slice(heroEnd - "</div></div>".length, heroEnd + "</section>".length) !== slotClose) {
    throw new Error("hero LP: hero no longer ends at the photo slot");
  }
  const beforeSlot = heroEnd - "</div>".length;
  return `${html.slice(0, beforeSlot)}${slotHtml}</div></section></main></body></html>`;
}

/**
 * The guards every entry passes (fail closed): no scripts, no canonical / alternate / OG / Twitter / robots-index tags,
 * noindex added, cut above anything below the hero, no rating, review markup, phone digits, tel: or test domain.
 */
export function guardWindowHtml(input: string, opts: { phone?: string; slotHtml?: string; extraCss?: string; base?: string } = {}): string {
  let html = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<script\b[^>]*\/>/g, "");
  html = html.replace(/<link rel="(?:canonical|alternate)"[^>]*>/g, "");
  html = html.replace(/<meta (?:name="robots"|name="twitter:[^"]*"|property="og:[^"]*")[^>]*>/g, "");
  html = html.split(SITE_FONT_PATHS.hebrew.replace(/[^/]+$/, "")).join(HERO_FONT_BASE);
  const head = once(html, "<head>", "<head>") + "<head>".length;
  const base = opts.base ? `<base href="${opts.base}">` : "";
  html = `${html.slice(0, head)}<meta name="robots" content="noindex, nofollow">${base}${html.slice(head)}`;
  html = html.replace("</head>", `<style>${BASE_CSS}${opts.extraCss ?? ""}</style></head>`);
  html = cutToHero(html, opts.slotHtml);
  if (FORBIDDEN_IN_WINDOW.test(visibleText(html)) || REVIEW_MARKUP.test(html)) throw new Error("hero LP: a rating or review reached the window");
  html = stripPhoneDigits(html, opts.phone);
  if (/<script\b/i.test(html) || /name="robots" content="index/.test(html)) throw new Error("hero LP: script or indexable page reached the window");
  if (AI_PHOTO.test(html)) throw new Error("hero LP: an AI-made photo reached the window");
  const leak = html.search(TEST_DOMAIN);
  if (leak >= 0) throw new Error(`hero LP: a test/demo domain reached the window: ${html.slice(Math.max(0, leak - 80), leak + 40)}`);
  return html;
}

function siteRecordHtml(slug: string, path: string, photo?: OwnerPhoto): string {
  const stored = HERO_SITE_RECORDS[slug];
  if (!stored) throw new Error(`hero LP: no stored site record ${slug}`);
  const { demo, record } = stored;
  const data = structuredClone(record.collectedData) as unknown as CollectedData;
  const pages = renderResearchedSitePages({
    ...researchedRenderInputs(data, demo.slug),
    siteUrl: demo.canonicalOrigin,
    data,
    slug: demo.slug,
    pages: structuredClone(record.researchedPages) as unknown as ResearchedSitePage[],
    graphEdges: structuredClone(record.researchedGraphEdges ?? []) as ResearchedSiteGraphEdge[],
  });
  const file = `${path.replace(/^\//, "")}.html`;
  const html = pages[file];
  if (typeof html !== "string") throw new Error(`hero LP: renderer produced no ${file}`);
  const slotHtml = photo
    ? `<div class="hw-owner"><picture><source type="image/avif" srcset="${photo.avif}"><img src="${photo.webp}" alt="" width="${photo.width}" height="${photo.height}" decoding="async"></picture></div>`
    : "";
  // Inside the window only: call buttons keep their label and icon but show no digits (Adam 2026-11-15).
  return guardWindowHtml(html, { phone: record.collectedData.phone, slotHtml, extraCss: photo ? OWNER_CSS : "" });
}

/** A live client page from our Worker (build time). Never a third-party host; the guards apply as for records. */
export async function liveUrlHtml(url: string, fetchImpl?: typeof fetch): Promise<string> {
  const u = assertWorkerUrl(url);
  const res = await (fetchImpl ?? fetch)(u.toString(), { redirect: "error", headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`hero LP: ${u.hostname} answered ${res.status}`);
  if (!/^text\/html/i.test(res.headers.get("content-type") ?? "")) throw new Error("hero LP: live page is not HTML");
  return guardWindowHtml(await res.text(), { base: `${u.origin}/` });
}

/** The trimmed page for one entry, as served inside the window. Throws if any guard fails. */
export async function showcaseLandingHtml(e: ShowcaseEntry, fetchImpl?: typeof fetch): Promise<string> {
  return e.landingPage.source === "site-record" ? siteRecordHtml(e.landingPage.slug, e.landingPage.path, e.ownerPhoto) : liveUrlHtml(e.landingPage.url, fetchImpl);
}

/** The first entry's page (site-record, synchronous): the resting frame's landing page. */
export function heroLandingPageHtml(e: ShowcaseEntry = SHOWCASES[0]): string {
  if (e.landingPage.source !== "site-record") throw new Error("hero LP: heroLandingPageHtml renders site-record entries only");
  return siteRecordHtml(e.landingPage.slug, e.landingPage.path, e.ownerPhoto);
}
