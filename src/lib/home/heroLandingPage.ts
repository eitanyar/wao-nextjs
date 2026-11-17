// The landing page inside the homepage hero window, per showcase entry (src/lib/home/heroShowcases.ts):
// - site-record: a stored site record rendered by the product's own Site Bot renderer (the same call the video
//   recorder makes, scripts/video/record/lib/site.mjs);
// - live-url: a live client site on our wao-sites Worker, fetched at build time (tenant host only).
// Both are cut above the contact form (header, hero and the product's sections below it: trust facts, Q&A, related
// services) and pass the same guards (guardWindowHtml) before display in a 960px frame. Served noindex by
// src/app/hero-window/lp/[id]/route.ts. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import path from "node:path";
import type { CollectedData } from "@/lib/bot/prompts";
import type { SiteLook } from "@/lib/lp/siteLook";
import { loadSiteLook } from "@/lib/site-bot/siteLookStore";
import { renderResearchedSitePages, type ResearchedSitePage, type ResearchedSiteGraphEdge } from "@/lib/lp/researchedSite";
import { researchedRenderInputs } from "@/lib/site-bot/researchToSite";
import { SITE_FONT_PATHS } from "@/lib/lp/siteFonts";
import { HERO_SITE_RECORDS } from "./heroWindow";
import { SHOWCASES, assertWorkerUrl, type HeroPhotoFlag, type OwnerPhoto, type ShowcaseEntry } from "./heroShowcases";

export const HERO_FONT_BASE = "/hero-window/fonts/";
/** The stored records' approved looks (logo + hero photo), applied with scripts/site-bot-look.mjs. Tracked in git and fixed:
 * never the WAO_SITE_PROOF_DIR data root (live client data). */
export const heroLookRoot = (): string => path.join(process.cwd(), "data", "video", "demo", "site-proof");
/** Where the window serves the look's built images (src/app/hero-window/img/[file]/route.ts). */
export const HERO_IMG_BASE = "/hero-window/img/";

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
/**
 * Review / rating markup that must never reach the window. The trust-facts strip itself may show (years, area), a rating
 * item in it fails FORBIDDEN_IN_WINDOW (the product writes ratings as "<n.n> \u2605").
 */
export const REVIEW_MARKUP = /data-demo-reviews|rv-card|aggregateRating|reviewCount|ratingValue|itemprop="review|data-section="reviews"/i;
/** Test / demo / placeholder domains that must never reach the window. */
export const TEST_DOMAIN = /\.invalid\b|demo-plumber|localhost|127\.0\.0\.1|example\.(?:com|org|net)|\.test\b|\.local\b/i;
/** Known AI-made people / work photos (the video demo owner / work photos, the retired hero owner crop). */
export const AI_PHOTO = /hero-owner\.|\/video\/demo\/photos\/|demo-owner/i;
/** The one AI-made image the window may show: the hero backdrop flagged as an atmosphere photo (Eitan 2026-11-17). */
export const ATMOSPHERE_FLAG = 'data-ai-generated="atmosphere"';
const FLAGGED_ATMOSPHERE_IMG = `<img class="hero-bg" ${ATMOSPHERE_FLAG} `;

/** Every image URL the page loads: img / source / svg image (src, srcset, href) and CSS url() other than our fonts. */
export function imageUrls(html: string): string[] {
  const urls: string[] = [];
  for (const [tag] of html.matchAll(/<(?:img|source|image|input)\b[^>]*>/gi)) {
    for (const [, name, value] of tag.matchAll(/\s(src|srcset|href|xlink:href)="([^"]*)"/gi)) {
      if (name.toLowerCase() === "srcset") urls.push(...value.split(",").map((part) => part.trim().split(/\s+/)[0]).filter(Boolean));
      else urls.push(value);
    }
  }
  for (const [, value] of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) if (!value.startsWith(HERO_FONT_BASE)) urls.push(value);
  return urls;
}

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

/**
 * Cuts a product-rendered page above its contact form (or the end of main / the footer, whichever comes first): the
 * header, the hero and the sections the product renders below it stay (trust facts, Q&A, related services); the form,
 * the footer and everything after are dropped. A rating that survives in a kept section fails the guards.
 */
function cutPage(html: string, slotHtml = ""): string {
  const heroAt = once(html, '<section class="hero', "hero section");
  let heroEnd = html.indexOf("</section>", heroAt);
  if (heroEnd < 0) throw new Error("hero LP: hero section not closed");
  if (slotHtml) {
    const slotClose = "</div></div></section>";
    if (html.slice(heroEnd - "</div></div>".length, heroEnd + "</section>".length) !== slotClose) {
      throw new Error("hero LP: hero no longer ends at the photo slot");
    }
    const beforeSlot = heroEnd - "</div>".length;
    html = `${html.slice(0, beforeSlot)}${slotHtml}${html.slice(beforeSlot)}`;
    heroEnd += slotHtml.length;
  }
  const after = heroEnd + "</section>".length;
  const stops = ['<section id="contact"', "</main>", "<footer"].map((m) => html.indexOf(m, after)).filter((i) => i >= 0);
  const end = stops.length ? Math.min(...stops) : html.indexOf("</body>", after);
  if (end < 0) throw new Error("hero LP: page has no end");
  return `${html.slice(0, end).trimEnd()}</main></body></html>`;
}

export interface WindowGuardOptions {
  phone?: string;
  slotHtml?: string;
  extraCss?: string;
  base?: string;
  /** Image URLs the page may load (a validated owner photo, the flagged hero photo); any other image fails. */
  images?: readonly string[];
  /** The entry flags its hero photo as an AI-made atmosphere photo (heroShowcases HeroPhotoFlag). */
  atmosphereAi?: boolean;
}

/**
 * The guards every entry passes (fail closed): no scripts, no canonical / alternate / OG / Twitter / robots-index tags,
 * noindex added, cut above the contact form, no rating, review markup, phone digits, tel: or test domain; no known AI
 * people photo, no AI flag except the one flagged atmosphere hero, no image outside opts.images.
 */
export function guardWindowHtml(input: string, opts: WindowGuardOptions = {}): string {
  let html = input.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "").replace(/<script\b[^>]*\/>/g, "");
  html = html.replace(/<link rel="(?:canonical|alternate)"[^>]*>/g, "");
  html = html.replace(/<meta (?:name="robots"|name="twitter:[^"]*"|property="og:[^"]*")[^>]*>/g, "");
  html = html.split(SITE_FONT_PATHS.hebrew.replace(/[^/]+$/, "")).join(HERO_FONT_BASE);
  const head = once(html, "<head>", "<head>") + "<head>".length;
  const base = opts.base ? `<base href="${opts.base}">` : "";
  html = `${html.slice(0, head)}<meta name="robots" content="noindex, nofollow">${base}${html.slice(head)}`;
  html = html.replace("</head>", `<style>${BASE_CSS}${opts.extraCss ?? ""}</style></head>`);
  html = cutPage(html, opts.slotHtml);
  if (FORBIDDEN_IN_WINDOW.test(visibleText(html)) || REVIEW_MARKUP.test(html)) throw new Error("hero LP: a rating or review reached the window");
  html = stripPhoneDigits(html, opts.phone);
  if (/<script\b/i.test(html) || /name="robots" content="index/.test(html)) throw new Error("hero LP: script or indexable page reached the window");
  if (AI_PHOTO.test(html)) throw new Error("hero LP: an AI-made photo reached the window");
  const aiFlags = (html.match(/data-ai-generated/gi) ?? []).length;
  const atmosphere = html.split(FLAGGED_ATMOSPHERE_IMG).length - 1;
  if (aiFlags > 0 && !(opts.atmosphereAi && aiFlags === 1 && atmosphere === 1)) {
    throw new Error("hero LP: an AI-made photo reached the window (only a flagged atmosphere hero photo is allowed)");
  }
  const leak = html.search(TEST_DOMAIN);
  if (leak >= 0) throw new Error(`hero LP: a test/demo domain reached the window: ${html.slice(Math.max(0, leak - 80), leak + 40)}`);
  const allowed = new Set(opts.images ?? []);
  const stray = imageUrls(html).find((url) => !allowed.has(url));
  if (stray !== undefined) throw new Error(`hero LP: an unflagged image reached the window: ${stray}`);
  return html;
}

/**
 * The stored record's approved look for the window (logo + hero photo), or null. The hero photo needs the entry's
 * heroPhoto flag (an approved photo without one fails: unflagged fails closed), and a flag needs an approved photo.
 */
export function heroWindowLook(slug: string, flag: HeroPhotoFlag | undefined, root = heroLookRoot()): { look: SiteLook; files: Record<string, Buffer> } | null {
  const loaded = loadSiteLook(slug, root);
  if (loaded?.look.hero && !flag) throw new Error(`hero LP: ${slug} has an approved hero photo but the showcase entry does not flag it (heroPhoto)`);
  if (flag && !loaded?.look.hero) throw new Error(`hero LP: the showcase entry flags a hero photo but ${slug} has none approved`);
  return loaded;
}

/** Served file name of a look image: the basename of its /img/ path. */
export const heroImageFile = (src: string): string => src.slice(src.lastIndexOf("/") + 1);

/**
 * Inside the window only: a business with no rating. The fictional record keeps its rating for the video recorder; the
 * homepage window shows none (Eitan's standing rule: no invented ratings, review counts or results). Rating copy is
 * dropped, never rewritten.
 */
function withoutRatings(data: CollectedData, pages: ResearchedSitePage[]): void {
  const d = data as unknown as Record<string, unknown>;
  delete d.starRating;
  delete d.reviewCount;
  for (const page of pages) {
    const copy = (page as unknown as { copy?: Record<string, unknown> }).copy;
    if (!copy) continue;
    delete copy.reviewContext;
    if (Array.isArray(copy.trustBarItems)) copy.trustBarItems = copy.trustBarItems.filter((item) => !(typeof item === "string" && FORBIDDEN_IN_WINDOW.test(item)));
  }
}

function siteRecordHtml(slug: string, pagePath: string, photo?: OwnerPhoto, heroFlag?: HeroPhotoFlag): string {
  const stored = HERO_SITE_RECORDS[slug];
  if (!stored) throw new Error(`hero LP: no stored site record ${slug}`);
  const { demo, record } = stored;
  const data = structuredClone(record.collectedData) as unknown as CollectedData;
  const researched = structuredClone(record.researchedPages) as unknown as ResearchedSitePage[];
  withoutRatings(data, researched);
  const loaded = heroWindowLook(slug, heroFlag);
  const pages = renderResearchedSitePages({
    ...researchedRenderInputs(data, demo.slug),
    siteUrl: demo.canonicalOrigin,
    data,
    slug: demo.slug,
    pages: researched,
    graphEdges: structuredClone(record.researchedGraphEdges ?? []) as ResearchedSiteGraphEdge[],
    ...(loaded ? { look: loaded.look } : {}),
  });
  const file = `${pagePath.replace(/^\//, "")}.html`;
  let html = pages[file];
  if (typeof html !== "string") throw new Error(`hero LP: renderer produced no ${file}`);
  const images: string[] = [];
  for (const image of loaded?.look.hero?.images ?? []) {
    for (const src of [image.avif, image.webp]) {
      const served = `${HERO_IMG_BASE}${heroImageFile(src)}`;
      html = html.split(`${src} `).join(`${served} `).split(`"${src}"`).join(`"${served}"`);
      images.push(served);
    }
  }
  if (loaded?.look.hero && heroFlag?.aiGenerated) {
    if (html.split('<img class="hero-bg" ').length !== 2) throw new Error("hero LP: expected one hero photo");
    html = html.replace('<img class="hero-bg" ', FLAGGED_ATMOSPHERE_IMG);
  }
  const slotHtml = photo
    ? `<div class="hw-owner"><picture><source type="image/avif" srcset="${photo.avif}"><img src="${photo.webp}" alt="" width="${photo.width}" height="${photo.height}" decoding="async"></picture></div>`
    : "";
  if (photo) images.push(photo.avif, photo.webp);
  // Inside the window only: call buttons keep their label and icon but show no digits (Adam 2026-11-15).
  return guardWindowHtml(html, { phone: record.collectedData.phone, slotHtml, extraCss: photo ? OWNER_CSS : "", images, atmosphereAi: Boolean(heroFlag?.aiGenerated) });
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
  return e.landingPage.source === "site-record" ? siteRecordHtml(e.landingPage.slug, e.landingPage.path, e.ownerPhoto, e.heroPhoto) : liveUrlHtml(e.landingPage.url, fetchImpl);
}

/** The first entry's page (site-record, synchronous): the resting frame's landing page. */
export function heroLandingPageHtml(e: ShowcaseEntry = SHOWCASES[0]): string {
  if (e.landingPage.source !== "site-record") throw new Error("hero LP: heroLandingPageHtml renders site-record entries only");
  return siteRecordHtml(e.landingPage.slug, e.landingPage.path, e.ownerPhoto, e.heroPhoto);
}

/** Every look image the window serves, by file name (src/app/hero-window/img/[file]/route.ts), sha-checked at load. */
export function heroWindowImages(): Record<string, Buffer> {
  const out: Record<string, Buffer> = {};
  for (const e of SHOWCASES) {
    if (e.landingPage.source !== "site-record") continue;
    const loaded = heroWindowLook(e.landingPage.slug, e.heroPhoto);
    for (const image of loaded?.look.hero?.images ?? []) {
      for (const src of [image.avif, image.webp]) out[heroImageFile(src)] = loaded!.files[src.replace(/^\//, "")];
    }
  }
  return out;
}
