// Stage 1: video.json schema, source resolution, price gate, approved-hash gate.
// Pure except for the injected readJson/readText. No Hebrew literals: all Hebrew
// arrives from data files (script JSON, pronunciation lexicon).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { collectLines } from "../../voice/lib/core.mjs";
import { cleanTextProblems } from "./captions.mjs";

export const SCHEMA_ID = "wao.video/1";
export const VISUAL_TYPES = ["screen", "illustration", "wan", "card", "endScreen"];
export const PENDING_RE = /_PENDING$/;

const isObj = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
const isStr = (x) => typeof x === "string" && x.length > 0;
const isPosInt = (x) => Number.isInteger(x) && x >= 1;

/** Structural validation of a video.json. Returns a list of error strings (empty = valid). */
export function validateVideoSpec(spec, { aspects = [] } = {}) {
  const e = [];
  if (!isObj(spec)) return ["video.json must be an object"];
  if (spec.schema !== SCHEMA_ID) e.push(`schema must be "${SCHEMA_ID}"`);
  if (!isStr(spec.id) || !/^[a-z0-9][a-z0-9-]*$/.test(spec.id)) e.push("id must be kebab-case [a-z0-9-]");
  if (!isStr(spec.product)) e.push("product is required");
  if (!(typeof spec.slotSeconds === "number" && spec.slotSeconds > 0)) e.push("slotSeconds must be a positive number");
  if (!isPosInt(spec.version)) e.push("version must be an integer >= 1");
  if (spec.lang !== "he") e.push('lang must be "he"');
  if (spec.source !== undefined) {
    if (!isObj(spec.source) || !isStr(spec.source.file) || !isStr(spec.source.episode) || !isStr(spec.source.section))
      e.push("source must be { file, episode, section }");
  }
  if (spec.voice !== undefined) {
    if (!isObj(spec.voice)) e.push("voice must be an object");
    else if (spec.voice.takesDirs !== undefined && !(Array.isArray(spec.voice.takesDirs) && spec.voice.takesDirs.every(isStr)))
      e.push("voice.takesDirs must be an array of paths");
  }
  if (!Array.isArray(spec.beats) || !spec.beats.length) e.push("beats must be a non-empty array");
  else
    spec.beats.forEach((b, i) => {
      const at = `beats[${i}]`;
      if (!isObj(b)) return e.push(`${at} must be an object`);
      const byLine = b.line !== undefined;
      const inline = b.text !== undefined || b.voice !== undefined;
      if (byLine === inline) e.push(`${at} needs either "line" (source reference) or inline "text" + "voice"`);
      if (byLine && !(Number.isInteger(b.line) && b.line >= 0)) e.push(`${at}.line must be an integer >= 0`);
      if (byLine && !spec.source) e.push(`${at}.line needs a top-level "source"`);
      if (inline && !(isStr(b.text) && isStr(b.voice))) e.push(`${at} inline beats need both "text" (clean) and "voice"`);
      if (b.caption !== undefined && !isStr(b.caption)) e.push(`${at}.caption must be a non-empty string`);
      if (b.captions !== undefined && typeof b.captions !== "boolean") e.push(`${at}.captions must be boolean`);
      const v = b.visual;
      if (!isObj(v) || !VISUAL_TYPES.includes(v.type)) return e.push(`${at}.visual.type must be one of ${VISUAL_TYPES.join(" | ")}`);
      if (v.src !== undefined && !isStr(v.src)) e.push(`${at}.visual.src must be a path`);
      if (v.label !== undefined && !isStr(v.label)) e.push(`${at}.visual.label must be a string`);
      if (v.crop !== undefined) {
        if (!isObj(v.crop)) e.push(`${at}.visual.crop must map aspect -> { x, y, w, h }`);
        else
          for (const [a, c] of Object.entries(v.crop)) {
            if (aspects.length && !aspects.includes(a)) e.push(`${at}.visual.crop: unknown aspect "${a}"`);
            if (!isObj(c) || !["x", "y", "w", "h"].every((k) => Number.isInteger(c[k]) && c[k] >= 0) || !c.w || !c.h)
              e.push(`${at}.visual.crop.${a} must be { x, y, w, h } non-negative integers`);
          }
      }
      const last = i === spec.beats.length - 1;
      if (v.type === "endScreen" && !last) e.push(`${at}: only the last beat may be the endScreen`);
      if (last && v.type !== "endScreen") e.push(`${at}: the last beat must have visual.type "endScreen"`);
    });
  const es = spec.endScreen;
  if (!isObj(es)) e.push("endScreen block is required");
  else {
    if (typeof es.price !== "number") e.push("endScreen.price must be a number");
    if (!(typeof es.holdSeconds === "number" && es.holdSeconds >= 3)) e.push("endScreen.holdSeconds must be >= 3");
  }
  return e;
}

// ---------------------------------------------------------------- price

// Shekel amounts in copy: sign before or after the number, optional single space.
const PRICE_RE = /\u20AA\s?(\d[\d,]*(?:\.\d+)?)|(\d[\d,]*(?:\.\d+)?)\s?\u20AA/gu;

/** Every shekel amount mentioned in a text: [{ amount, index, raw }]. */
export function priceMentions(text) {
  return [...text.matchAll(PRICE_RE)].map((m) => ({ amount: Number((m[1] ?? m[2]).replace(/,/g, "")), index: m.index, raw: m[0] }));
}

/**
 * Price line for the end screen, cut from the approved clean line: from the price
 * mention to the end of its sentence, with the digits written from the constant.
 * Returns null when the line carries no price (caller falls back to the bare amount).
 */
export function priceLineFromText(text, amount) {
  const m = priceMentions(text)[0];
  if (!m) return null;
  const rest = text.slice(m.index);
  const end = rest.slice(m.raw.length).search(/[.!?\u2026]/u);
  const line = (end < 0 ? rest : rest.slice(0, m.raw.length + end)).trim();
  return line.replace(/\d[\d,]*(?:\.\d+)?/u, String(amount));
}

/** The single price constant for a product, cross-checked against the page's own constant when one is configured. */
export function productPrice(config, product, { root, readText = (f) => readFileSync(f, "utf8") } = {}) {
  const p = config.products?.[product];
  if (!p) throw new Error(`product "${product}" is not in data/video/config.json`);
  const amount = p.price?.amount;
  if (typeof amount !== "number") throw new Error(`product "${product}" has no price.amount`);
  const errors = [];
  if (p.pageSource) {
    const m = readText(path.resolve(root, p.pageSource.file)).match(new RegExp(p.pageSource.pattern));
    if (!m) errors.push(`price: pattern not found in ${p.pageSource.file}`);
    else if (Number(m[1]) !== amount) errors.push(`price: config says ${amount} but ${p.pageSource.file} says ${m[1]}`);
  }
  return { amount, currency: p.price.currency ?? "ILS", pageChecked: Boolean(p.pageSource), errors };
}

/** Refusal reasons when any price in the video differs from the constant. */
export function checkPrice(resolved, amount) {
  const e = [];
  if (resolved.endScreen.price !== amount) e.push(`price: endScreen.price ${resolved.endScreen.price} != price constant ${amount}`);
  resolved.beats.forEach((b, i) => {
    for (const t of [b.clean, b.caption].filter(Boolean))
      for (const m of priceMentions(t)) if (m.amount !== amount) e.push(`price: beats[${i}] mentions ${m.amount}, price constant is ${amount}`);
  });
  return e;
}

// ---------------------------------------------------------------- resolve

/**
 * Fill beats from the script source (clean = display text, voice = TTS source text)
 * and the end screen from config + lexicon. Returns { video, errors }.
 */
export function resolveVideo(spec, { root, config, lexicon, readJson = (f) => JSON.parse(readFileSync(f, "utf8")) }) {
  const errors = [];
  let lines = [];
  let sourceDoc = null;
  if (spec.source) {
    sourceDoc = readJson(path.resolve(root, spec.source.file));
    lines = collectLines(sourceDoc, { episode: spec.source.episode, section: spec.source.section });
    if (!lines.length) errors.push(`source: no lines for ${spec.source.episode}/${spec.source.section} in ${spec.source.file}`);
  }
  const rawLines = sourceDoc?.episodes?.[spec.source?.episode]?.[spec.source?.section] ?? [];
  const beats = spec.beats.map((b, i) => {
    let voice = b.voice;
    let clean = b.text;
    let screen = b.visual.label ?? null;
    let lineId = null;
    if (b.line !== undefined) {
      const l = lines.find((x) => x.index === b.line);
      const raw = rawLines[b.line];
      if (!l || !raw) errors.push(`beats[${i}]: source line ${b.line} not found`);
      else {
        voice = l.voice;
        clean = raw.display;
        screen = screen ?? l.screen;
        lineId = l.id;
        if (!isStr(clean)) errors.push(`beats[${i}]: source line ${b.line} has no "display" (clean) text`);
      }
    }
    const beat = { index: i, lineId, voice: voice ?? "", clean: clean ?? "", caption: b.caption ?? null, captions: b.captions ?? true, screen, visual: b.visual };
    for (const t of [beat.clean, beat.caption].filter(Boolean)) for (const p of cleanTextProblems(t)) errors.push(`beats[${i}] clean text: ${p}`);
    return beat;
  });

  const p = config.products?.[spec.product];
  let endScreen = { price: spec.endScreen?.price, holdSeconds: spec.endScreen?.holdSeconds };
  if (!p) errors.push(`product "${spec.product}" is not in data/video/config.json`);
  else {
    const entry = (lexicon.entries ?? []).find((x) => x.id === p.nameLexiconId);
    if (!entry) errors.push(`endScreen: lexicon entry "${p.nameLexiconId}" (product name) not found`);
    const endBeat = beats.at(-1);
    endScreen = {
      ...endScreen,
      productName: entry?.clean ?? "",
      priceLine: priceLineFromText(endBeat.clean, p.price.amount) ?? `\u20AA${p.price.amount}`,
      stampText: p.stampText,
      ctaText: p.ctaText,
      url: p.url,
    };
    for (const k of ["stampText", "ctaText", "url"]) if (!isStr(endScreen[k])) errors.push(`endScreen: config products.${spec.product}.${k} is missing`);
  }
  return { video: { schema: spec.schema, id: spec.id, product: spec.product, slotSeconds: spec.slotSeconds, version: spec.version, lang: spec.lang, beats, endScreen }, errors };
}

// ---------------------------------------------------------------- hash gate

/** SHA-256 over everything a viewer hears or reads: beat voice + clean text, captions, end-screen copy, price. */
export function scriptHash(video) {
  const canon = {
    schema: video.schema,
    id: video.id,
    product: video.product,
    beats: video.beats.map((b) => ({ voice: b.voice, clean: b.clean, caption: b.caption })),
    endScreen: {
      price: video.endScreen.price,
      productName: video.endScreen.productName,
      priceLine: video.endScreen.priceLine,
      stampText: video.endScreen.stampText,
      ctaText: video.endScreen.ctaText,
      url: video.endScreen.url,
    },
  };
  return createHash("sha256").update(JSON.stringify(canon)).digest("hex");
}

/** The approval record for a hash, or null. approvedList: { approved: [{ hash, id, ... }] }. */
export function findApproval(approvedList, hash, id) {
  return (approvedList?.approved ?? []).find((a) => a.hash === hash && (!a.id || a.id === id)) ?? null;
}

/** Things that make an otherwise valid render unfit to publish (placeholders). */
export function releaseBlockers(video) {
  const out = [];
  for (const k of ["stampText", "ctaText"]) if (PENDING_RE.test(video.endScreen[k] ?? "")) out.push(`endScreen.${k} is a placeholder (${video.endScreen[k]})`);
  video.beats.forEach((b, i) => {
    if (b.visual.type !== "endScreen" && !b.visual.src) out.push(`beats[${i}] uses a placeholder visual (${b.visual.type}, no src)`);
  });
  return out;
}
