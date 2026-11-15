// Homepage hero window (docs/missions/homepage-hero-motion-2026-11-15.md, step 2: resting state).
// Everything the window shows comes from the video demo business (data/video/demo/), byte-exact: this module
// selects fields, it never writes copy. HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import demo from "../../../data/video/demo/demo-business.json";
import record from "../../../data/video/demo/stand-in/site-record.json";
import strings from "@/content/hero-product-strings-2026-11-15.json";
import { HERO_SCENE } from "@/data/heroScene";
import { growQuad, rectToQuad } from "./homography";

/** Virtual screen the window is laid out in (CSS px), the laptop screen's aspect (~1.588:1). The LP renders its desktop layout from 900px. */
export const HERO_WINDOW_SIZE = { width: 960, height: 605 } as const;
/** Thin tab bar, the ad strip under it; the landing page fills the rest. */
export const HERO_WINDOW_TAB_BAR = 26;
export const HERO_WINDOW_SERP = 132;
export const HERO_WINDOW_LP_HEIGHT = HERO_WINDOW_SIZE.height - HERO_WINDOW_TAB_BAR - HERO_WINDOW_SERP;
/** Scene px the window reaches past the fitted screen edges, under the bezel (no screen-off seam). */
export const HERO_WINDOW_BLEED = 1.5;

/** Served by src/app/hero-window/lp/route.ts (noindex). */
export const HERO_LP_PATH = "/hero-window/lp";

const data = record.collectedData;

/**
 * Ad strings: waocopy (Opus) 2026-11-15, applied byte-exact by script from the scratchpad hero-strings.json into
 * src/content/hero-product-strings-2026-11-15.json. Headlines <= 30, description <= 90 characters (Google limits).
 */
export const HERO_AD = {
  // WAO's own free-address format for a client without a domain (we own the zone; nobody else's domain).
  displayUrl: "yossi-plumber.wao.co.il",
  headlines: strings.hero_ad.headlines,
  descriptions: [strings.hero_ad.description],
} as const;

/** Tab title: the business name from the demo record. */
export const HERO_TAB_TITLE = data.businessName;

/** The demo record's service page the ad points to (demo-business.json servicePath). */
export const HERO_LP_SOURCE_FILE = `${demo.servicePath.replace(/^\//, "")}.html`;

/** The window's transform: virtual screen -> the photo's laptop screen (scene px), with the bezel bleed. */
export function heroWindowTransform(): string {
  return rectToQuad(HERO_WINDOW_SIZE.width, HERO_WINDOW_SIZE.height, growQuad(HERO_SCENE.screen, HERO_WINDOW_BLEED)).css;
}
