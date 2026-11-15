// Homepage hero showcase entries: the businesses the hero window plays through (Eitan 2026-11-15). Data lives in
// src/content/hero-showcases.json (strings applied by script from approved files; how to add one: README.md,
// "Adding a showcase business"). This module types and validates it; the build fails on an invalid entry.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
import data from "@/content/hero-showcases.json";
import motion from "@/content/hero-motion-strings-2026-11-15.json";

export type ShowcaseLandingPage =
  /** A site rendered by the product renderer from a stored site record (fictional entries). */
  | { source: "site-record"; slug: string; path: string }
  /** A live client site on our wao-sites Worker, fetched at build time. */
  | { source: "live-url"; url: string };

export interface ShowcaseGeometry {
  /** Results-page ad headline lines, card-local px at scale 1: [top, width] (right-aligned). */
  resultsAdLines: [number, number][];
  /** LP headline lines, LP px: [left, top, width, height]. */
  lpHeadlineLines: [number, number, number, number][];
  /** LP call button: [left, top, width, height, radius, colour]. */
  callButton: [number, number, number, number, number, string];
  /** Where the pointer waits (window px), on empty space under the results ad and on the LP. */
  park: [number, number];
  /** The pointer tip on the call button (window px), off its label text. */
  callTarget: [number, number];
}

/**
 * A real owner photo shown beside the LP hero text. Never AI-made (Fable 5.2, 2026-11-16): aiGenerated must be
 * explicitly false and the entry a consented client; the build fails otherwise. Without one the text takes the width.
 */
export interface OwnerPhoto {
  avif: string;
  webp: string;
  width: number;
  height: number;
  aiGenerated: boolean;
}

export interface ShowcaseEntry {
  id: string;
  consent: { type: "fictional" | "client"; reference?: string };
  /** The tapped chips. The results-page query is service + " " + area. */
  answers: { trade: string; area: string; service: string };
  /** "global" = the three questions in hero-motion-strings; an override replaces them for this entry. */
  questions: "global" | [string, string, string];
  /** Optional per-entry chips (display order), each list holding its answer; default = the global chips. */
  chips?: { trade: string[]; area: string[]; service: string[] };
  /** Browser tab title; required for live-url (site-record uses the record's business name). */
  tabTitle?: string;
  ad: { displayHost: string; headlines: [string, string, string]; description: string };
  landingPage: ShowcaseLandingPage;
  /** Optional real owner photo (site-record entries); see OwnerPhoto. */
  ownerPhoto?: OwnerPhoto;
  geometry: ShowcaseGeometry;
}

export interface ShowcaseLabels {
  pause_label?: string;
  play_label?: string;
}

/** Strings that must exist before more than one entry can ship (the loop's pause/play control). */
export const LOOP_NEEDED_LABELS = ["pause_label", "play_label"] as const;

/** A wao-sites tenant host: <slug>.wao.co.il, one label, never our own infra / mail hosts. */
export const WORKER_TENANT_HOST = /^(?!(?:www|mail|smtp|sites|sites-origin)\.)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.wao\.co\.il$/;

/** Words / domains that read as a test or a placeholder (Eitan's production-ready rule). */
export const PLACEHOLDER = /\bdemo\b|\bexample\b|\btest\b|\.invalid\b|localhost|lorem/i;

const WINDOW = { width: 960, height: 605 };

const isText = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v === v.trim() && !/\s{2}/.test(v);

/** Throws on the first problem; returns the entries typed. */
export function validateShowcases(raw: unknown, globalChips: string[][], labels: ShowcaseLabels, siteRecordSlugs: readonly string[]): ShowcaseEntry[] {
  const fail = (at: string, why: string): never => { throw new Error(`hero showcase ${at}: ${why}`); };
  const entries = (raw as { entries?: unknown })?.entries;
  if (!Array.isArray(entries) || entries.length < 1) fail("entries", "need at least one entry");
  const list = entries as ShowcaseEntry[];
  if (list.length >= 2) {
    for (const k of LOOP_NEEDED_LABELS) if (!isText(labels[k])) fail("loop", `NEEDED string ${k} (waocopy) before a second entry can ship`);
  }
  const ids = new Set<string>();
  list.forEach((e, n) => {
    const at = `#${n} ${String(e?.id)}`;
    if (typeof e?.id !== "string" || !/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(e.id)) fail(at, "id must be a lowercase slug");
    if (ids.has(e.id)) fail(at, "duplicate id");
    ids.add(e.id);
    if (e.consent?.type !== "fictional" && e.consent?.type !== "client") fail(at, "consent.type must be fictional or client");
    if (e.consent.type === "client" && !isText(e.consent.reference)) fail(at, "client consent needs a recorded reference");
    for (const k of ["trade", "area", "service"] as const) if (!isText(e.answers?.[k])) fail(at, `answers.${k}`);
    if (e.questions !== "global" && !(Array.isArray(e.questions) && e.questions.length === 3 && e.questions.every(isText))) fail(at, "questions");
    const chips = e.chips ? [e.chips.trade, e.chips.area, e.chips.service] : globalChips;
    (["trade", "area", "service"] as const).forEach((k, i) => {
      const c = chips[i];
      if (!Array.isArray(c) || c.length !== 3 || !c.every(isText) || new Set(c).size !== 3) fail(at, `chips.${k} must be 3 distinct strings`);
      if (!c.includes(e.answers[k])) fail(at, `answers.${k} is not one of its chips`);
    });
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(e.ad?.displayHost ?? "") || PLACEHOLDER.test(e.ad.displayHost)) fail(at, "ad.displayHost");
    if (!Array.isArray(e.ad.headlines) || e.ad.headlines.length !== 3) fail(at, "ad needs exactly 3 headlines");
    e.ad.headlines.forEach((h, i) => { if (!isText(h) || [...h].length > 30) fail(at, `ad.headlines[${i}] (<= 30 chars)`); });
    if (!isText(e.ad.description) || [...e.ad.description].length > 90) fail(at, "ad.description (<= 90 chars)");
    const adText = [...e.ad.headlines, e.ad.description].join(" ");
    if (/★|\d\.\d|\d+\s*%/.test(adText)) fail(at, "ad shows a rating or a result");
    if (PLACEHOLDER.test(adText)) fail(at, "ad reads as a placeholder");
    const lp = e.landingPage;
    if (lp?.source === "site-record") {
      if (!siteRecordSlugs.includes(lp.slug)) fail(at, `no stored site record for ${lp.slug}`);
      if (!/^\/[a-z0-9/-]*$/.test(lp.path)) fail(at, "landingPage.path");
    } else if (lp?.source === "live-url") {
      assertWorkerUrl(lp.url, at);
      if (!isText(e.tabTitle)) fail(at, "live-url entries need tabTitle");
    } else fail(at, "landingPage.source must be site-record or live-url");
    if (e.ownerPhoto !== undefined) {
      const p = e.ownerPhoto;
      if (p?.aiGenerated !== false) fail(at, "ownerPhoto is AI-made or unflagged (aiGenerated must be false): no AI owner photo in the window");
      if (e.consent.type !== "client") fail(at, "ownerPhoto needs a consented client entry (a real person's photo)");
      if (lp.source !== "site-record") fail(at, "ownerPhoto applies to site-record entries only");
      const ok = (f: unknown, ext: string) => typeof f === "string" && new RegExp(`^/images/[a-z0-9/-]+\\.${ext}$`).test(f) && !/hero-owner|demo/.test(f);
      if (!ok(p.avif, "avif") || !ok(p.webp, "webp")) fail(at, "ownerPhoto.avif / webp must be /images/... files");
      if (!(Number.isInteger(p.width) && p.width > 0 && Number.isInteger(p.height) && p.height > 0)) fail(at, "ownerPhoto.width / height");
    }
    const g = e.geometry;
    const inWindow = (x: number, y: number) => Number.isFinite(x) && Number.isFinite(y) && x >= 0 && y >= 0 && x <= WINDOW.width && y <= WINDOW.height;
    if (!g || !Array.isArray(g.resultsAdLines) || !g.resultsAdLines.length || !Array.isArray(g.lpHeadlineLines) || !g.lpHeadlineLines.length) fail(at, "geometry lines");
    if (!g.resultsAdLines.every(([t, w]) => inWindow(w, t))) fail(at, "geometry.resultsAdLines");
    if (!g.lpHeadlineLines.every(([l, t, w, h]) => inWindow(l, t) && inWindow(l + w, t + h))) fail(at, "geometry.lpHeadlineLines");
    const [bl, bt, bw, bh, br, bc] = g.callButton ?? [];
    if (!inWindow(bl, bt) || !inWindow(bl + bw, bt + bh) || !(br >= 0) || !/^#[0-9a-fA-F]{6}$/.test(String(bc))) fail(at, "geometry.callButton");
    if (!inWindow(...g.park) || !inWindow(...g.callTarget)) fail(at, "geometry.park / callTarget");
  });
  return list;
}

/** Only https://<tenant>.wao.co.il/... on our Worker; never a third-party site. */
export function assertWorkerUrl(url: string, at = "url"): URL {
  let u: URL;
  try { u = new URL(url); } catch { throw new Error(`hero showcase ${at}: not a URL`); }
  if (u.protocol !== "https:" || u.username || u.password || u.port || !WORKER_TENANT_HOST.test(u.hostname)) {
    throw new Error(`hero showcase ${at}: live-url must be https on a wao-sites tenant host (<slug>.wao.co.il)`);
  }
  return u;
}

/** The three steps an entry plays: question, chips (display order) and the tapped index. */
export function showcaseSteps(e: ShowcaseEntry): { question: string; chips: string[]; answer: number }[] {
  const answers = [e.answers.trade, e.answers.area, e.answers.service];
  return motion.steps.map((step, i) => {
    const chips = e.chips ? [e.chips.trade, e.chips.area, e.chips.service][i] : step.chips;
    return { question: e.questions === "global" ? step.question : e.questions[i], chips, answer: chips.indexOf(answers[i]) };
  });
}

/** The results-page query: service + " " + area (two approved strings, joined in code). */
export function showcaseQuery(e: ShowcaseEntry): string {
  return `${e.answers.service} ${e.answers.area}`;
}

/** Slugs of the stored site records the LP builder can render (src/lib/home/heroLandingPage.ts registry). */
export const SITE_RECORD_SLUGS = ["demo-plumber"] as const;

const labels = motion as ShowcaseLabels;
export const SHOWCASES: readonly ShowcaseEntry[] = validateShowcases(data, motion.steps.map((s) => s.chips), labels, SITE_RECORD_SLUGS);

/** Loop mode needs two or more entries (and, by validation, its pause/play labels). */
export const SHOWCASE_LOOP = SHOWCASES.length >= 2;

export const showcaseLpPath = (id: string) => `/hero-window/lp/${id}`;
