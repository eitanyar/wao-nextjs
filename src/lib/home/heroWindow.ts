// Homepage hero window (docs/missions/homepage-hero-motion-2026-11-15.md, step 2: resting state).
// Everything the window shows comes from the video demo business (data/video/demo/), byte-exact: this module
// selects fields, it never writes copy. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import demo from "../../../data/video/demo/demo-business.json";
import record from "../../../data/video/demo/stand-in/site-record.json";
import { HERO_SCENE } from "@/data/heroScene";
import { SHOWCASES, showcaseLpPath, type ShowcaseEntry } from "./heroShowcases";
import { growQuad, rectToQuad } from "./homography";

/** Virtual screen the window is laid out in (CSS px), the laptop screen's aspect (~1.588:1). The LP renders its desktop layout from 900px. */
export const HERO_WINDOW_SIZE = { width: 960, height: 605 } as const;
/** Thin tab bar, the ad strip under it; the landing page fills the rest. */
export const HERO_WINDOW_TAB_BAR = 26;
export const HERO_WINDOW_SERP = 132;
export const HERO_WINDOW_LP_HEIGHT = HERO_WINDOW_SIZE.height - HERO_WINDOW_TAB_BAR - HERO_WINDOW_SERP;
/** Scene px the window reaches past the fitted screen edges, under the bezel (no screen-off seam). */
export const HERO_WINDOW_BLEED = 1.5;

/** Stored site records the window can render, by slug (heroShowcases.SITE_RECORD_SLUGS must match). */
export const HERO_SITE_RECORDS: Record<string, { demo: typeof demo; record: typeof record }> = { [demo.slug]: { demo, record } };

/** What the window shows for one showcase entry: its ad (Google limits checked in heroShowcases.ts), tab, LP. */
export function heroWindowData(e: ShowcaseEntry) {
  const tab = e.landingPage.source === "site-record" ? HERO_SITE_RECORDS[e.landingPage.slug].record.collectedData.businessName : e.tabTitle!;
  return {
    ad: { displayUrl: e.ad.displayHost, headlines: e.ad.headlines, descriptions: [e.ad.description] },
    tabTitle: tab,
    lpPath: showcaseLpPath(e.id),
  };
}

const first = heroWindowData(SHOWCASES[0]);
/** The first entry = the resting frame (no-JS, reduced motion, before play). */
export const HERO_AD = first.ad;
export const HERO_TAB_TITLE = first.tabTitle;
/** Served by src/app/hero-window/lp/[id]/route.ts (noindex). */
export const HERO_LP_PATH = first.lpPath;

/** The window's transform: virtual screen -> the photo's laptop screen (scene px), with the bezel bleed. */
export function heroWindowTransform(): string {
  return rectToQuad(HERO_WINDOW_SIZE.width, HERO_WINDOW_SIZE.height, growQuad(HERO_SCENE.screen, HERO_WINDOW_BLEED)).css;
}
