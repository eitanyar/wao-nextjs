// The landing page inside the homepage hero window: the demo business's service page, rendered by the product's
// own Site Bot renderer (the same call the video recorder makes, scripts/video/record/lib/site.mjs), then cut to
// its top (header + hero) for display in a 960px-wide frame. Never deployed; served noindex by
// src/app/hero-window/lp/route.ts. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import demo from "../../../data/video/demo/demo-business.json";
import record from "../../../data/video/demo/stand-in/site-record.json";
import type { CollectedData } from "@/lib/bot/prompts";
import { renderResearchedSitePages, type ResearchedSitePage, type ResearchedSiteGraphEdge } from "@/lib/lp/researchedSite";
import { researchedRenderInputs } from "@/lib/site-bot/researchToSite";
import { SITE_FONT_PATHS } from "@/lib/lp/siteFonts";
import { HERO_OWNER_PHOTO } from "@/data/heroScene";
import { HERO_LP_SOURCE_FILE } from "./heroWindow";

export const HERO_FONT_BASE = "/hero-window/fonts/";

// Owner photo at the renderer's reserved hero photo slot (heroPhotoSlot, empty until GBP photos), styled like the
// recorder's dressing (scripts/video/record/lib/dressing.mjs .demo-owner).
const OWNER_CSS = [
  "html,body{overflow:hidden;}",
  ".hw-owner img{display:block;width:200px;height:auto;aspect-ratio:3/4;object-fit:cover;border-radius:var(--r-md);box-shadow:0 2px 10px rgba(13,27,42,0.12);}",
  "@media (min-width:900px){.hero-grid{grid-template-columns:minmax(0,1fr) auto;align-items:center;}}",
].join("");

/** Characters that would put a rating, review count or result on screen (Adam's line: none in the window). */
export const FORBIDDEN_IN_WINDOW = /\u2605|\d\.\d/;

/** Body text a visitor can see (tags, styles and attributes removed). */
export function visibleText(html: string): string {
  const body = html.slice(html.indexOf("<body"));
  return body.replace(/<style\b[\s\S]*?<\/style>/g, " ").replace(/<svg\b[\s\S]*?<\/svg>/g, " ").replace(/<[^>]+>/g, " ");
}

function renderDemoPages(): Record<string, string> {
  const data = structuredClone(record.collectedData) as unknown as CollectedData;
  return renderResearchedSitePages({
    ...researchedRenderInputs(data, demo.slug),
    siteUrl: demo.canonicalOrigin,
    data,
    slug: demo.slug,
    pages: structuredClone(record.researchedPages) as unknown as ResearchedSitePage[],
    graphEdges: structuredClone(record.researchedGraphEdges ?? []) as ResearchedSiteGraphEdge[],
  });
}

function once(html: string, needle: string, what: string): number {
  const at = html.indexOf(needle);
  if (at < 0 || html.indexOf(needle, at + 1) >= 0) throw new Error(`hero LP: expected one ${what}`);
  return at;
}

/** The trimmed page as served inside the window. Throws if the renderer's structure changed. */
export function heroLandingPageHtml(): string {
  let html = renderDemoPages()[HERO_LP_SOURCE_FILE];
  if (typeof html !== "string") throw new Error(`hero LP: renderer produced no ${HERO_LP_SOURCE_FILE}`);
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "");
  // Head tags for a live site (canonical, robots, social cards) point at the demo domain or say index: drop them.
  html = html.replace(/<link rel="(?:canonical|alternate)"[^>]*>/g, "");
  html = html.replace(/<meta (?:name="robots"|name="twitter:[^"]*"|property="og:[^"]*")[^>]*>/g, "");
  html = html.split(SITE_FONT_PATHS.hebrew.replace(/[^/]+$/, "")).join(HERO_FONT_BASE);
  const head = once(html, "<head>", "<head>") + "<head>".length;
  html = `${html.slice(0, head)}<meta name="robots" content="noindex, nofollow">${html.slice(head)}`;
  html = html.replace("</head>", `<style>${OWNER_CSS}</style></head>`);
  // Keep header + hero only: the trust strip below carries the rating.
  const heroAt = once(html, '<section class="hero', "hero section");
  const heroEnd = html.indexOf("</section>", heroAt);
  if (heroEnd < 0) throw new Error("hero LP: hero section not closed");
  const slotClose = "</div></div></section>";
  if (html.slice(heroEnd - "</div></div>".length, heroEnd + "</section>".length) !== slotClose) {
    throw new Error("hero LP: hero no longer ends at the photo slot");
  }
  const photo = `<div class="hw-owner"><picture><source type="image/avif" srcset="${HERO_OWNER_PHOTO.avif}"><img src="${HERO_OWNER_PHOTO.webp}" alt="" width="${HERO_OWNER_PHOTO.width}" height="${HERO_OWNER_PHOTO.height}" decoding="async"></picture></div>`;
  const beforeSlot = heroEnd - "</div>".length;
  html = `${html.slice(0, beforeSlot)}${photo}</div></section></main></body></html>`;
  if (FORBIDDEN_IN_WINDOW.test(visibleText(html)) || /data-demo-reviews|rv-card/.test(html)) {
    throw new Error("hero LP: a rating or review reached the window");
  }
  const leak = html.search(/\.invalid|demo-plumber/);
  if (leak >= 0) throw new Error(`hero LP: the demo domain reached the window: ${html.slice(Math.max(0, leak - 80), leak + 40)}`);
  return html;
}
