// Demo-site dressing for the video: the approved owner and work photos plus a reviews block, added to the
// HTML the product renderer produced. The renderer has no photo slot yet (heroPhotoSlot renders nothing
// until the owner-authorised GBP connection) and its only review output is one verbatim quote, so these
// sections exist only in the recorder's in-memory site. Nothing here reaches the product or data/.
// Eitan, 2026-11-14: natural review cards (stars, first name, plain text); the recording scrolls past them
// fast instead of hiding the text (see MAX_REVIEWS_ON_SCREEN_S and the exposure check in record.mjs).
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Names, review lines and the section heading
// come from data/video/demo/reviews.json (approved copy) and the product's own label module.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const REVIEWS_SCHEMA = "wao.video.demo-reviews/1";
/** Unfilled copy slot. A slot still holding it is a release blocker (releaseBlockers in demo.mjs). */
export const REVIEW_PLACEHOLDER = /^REVIEW_TEXT_PENDING_\d+$/;
/** Eitan, 2026-11-14: the reviews pass on screen for at most this long in any recording. */
export const MAX_REVIEWS_ON_SCREEN_S = 0.8;
export const REVIEWS_SELECTOR = "[data-demo-reviews]";
const PHOTO_DIR = "data/video/demo/photos/";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Problems with the seed's dressing block (paths, flags, review cards). */
export function dressingProblems(dressing, { root }) {
  if (!dressing) return [];
  const out = [];
  const ph = dressing.photos;
  if (ph) {
    if (ph.aiGenerated !== true) out.push("dressing.photos.aiGenerated must be true (only the approved AI-made fictional photos)");
    for (const f of [ph.owner, ...(ph.work ?? [])]) {
      if (typeof f !== "string" || !f.startsWith(PHOTO_DIR) || !/\.jpe?g$/.test(f) || f.includes("..")) out.push(`dressing photo ${f}: must be a .jpg under ${PHOTO_DIR}`);
      else if (!existsSync(path.join(root, f))) out.push(`dressing photo ${f}: missing`);
    }
    if (!Array.isArray(ph.work) || ph.work.length < 1) out.push("dressing.photos.work needs at least one photo");
  }
  if (dressing.reviews !== undefined) {
    if (typeof dressing.reviews !== "string" || !dressing.reviews.startsWith("data/video/demo/")) out.push("dressing.reviews must be a file under data/video/demo/");
    else if (!existsSync(path.join(root, dressing.reviews))) out.push(`dressing.reviews ${dressing.reviews}: missing`);
  }
  return out;
}

export function loadReviews(dressing, { root }) {
  if (!dressing?.reviews) return null;
  const r = JSON.parse(readFileSync(path.join(root, dressing.reviews), "utf8"));
  const errors = [];
  if (r.schema !== REVIEWS_SCHEMA) errors.push(`reviews schema must be ${REVIEWS_SCHEMA}`);
  if (!Array.isArray(r.cards) || !r.cards.length) errors.push("reviews.cards must be a non-empty list");
  for (const [i, c] of (r.cards ?? []).entries()) {
    if (typeof c.name !== "string" || !c.name.trim() || c.name.trim().includes(" ")) errors.push(`reviews.cards[${i}].name must be one first name`);
    if (!Number.isInteger(c.stars) || c.stars < 1 || c.stars > 5) errors.push(`reviews.cards[${i}].stars must be 1-5`);
    if (typeof c.text !== "string" || !c.text.trim()) errors.push(`reviews.cards[${i}].text is empty`);
  }
  if (errors.length) throw new Error(`demo reviews invalid:\n- ${errors.join("\n- ")}`);
  return r;
}

/** Why the review cards may not be released: placeholders, or numbers / prices (no result claims on demo screens). */
export function reviewTextProblems(reviews) {
  const out = [];
  for (const [i, c] of (reviews?.cards ?? []).entries()) {
    if (REVIEW_PLACEHOLDER.test(String(c.text).trim())) out.push(`review ${i + 1} text is still a placeholder (${c.text})`);
    else if (/[0-9₪$%]/.test(c.text)) out.push(`review ${i + 1} text has a number or a price`);
  }
  return out;
}

const STAR_ON = "#F5A623";
const STAR_OFF = "#D0D5DD";
const CSS = [
  ".demo-owner{display:block;width:200px;max-width:60%;height:auto;aspect-ratio:3/4;object-fit:cover;margin:0 auto 18px;border-radius:var(--r-md);box-shadow:0 2px 10px rgba(13,27,42,0.12);}",
  ".demo-gallery{padding:8px 16px 36px;background:var(--surface);}",
  ".demo-gallery ul{list-style:none;margin:0 auto;padding:0;max-width:1120px;display:grid;grid-template-columns:1fr;gap:12px;}",
  ".demo-gallery img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:var(--r-md);}",
  "@media (min-width:600px){.demo-gallery ul{grid-template-columns:1fr 1fr;}}",
  ".demo-reviews{padding:32px 16px;background:var(--surface-alt);}",
  ".demo-reviews .wrap{max-width:960px;margin:0 auto;}",
  ".demo-reviews h2{font-size:1.25rem;color:var(--primary);text-align:center;margin-bottom:14px;}",
  ".demo-reviews ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
  "@media (min-width:900px){.demo-reviews ul{grid-template-columns:repeat(3,1fr);}}",
  ".rv-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 2px rgba(13,27,42,0.06);}",
  ".rv-stars{font-size:0.95rem;letter-spacing:1px;line-height:1;}",
  ".rv-text{color:var(--text);font-size:0.9rem;line-height:1.45;margin:0;}",
  ".rv-name{color:var(--muted);font-size:0.85rem;font-weight:700;}",
].join("");

const media = (f) => `media/${path.basename(f)}`;

function reviewCard(c) {
  const stars = `<span style="color:${STAR_ON}">${"★".repeat(c.stars)}</span><span style="color:${STAR_OFF}">${"★".repeat(5 - c.stars)}</span>`;
  return `<li class="rv-card" data-review-card><div class="rv-stars" aria-label="${c.stars}/5">${stars}</div><p class="rv-text" data-review-text>${esc(c.text)}</p><div class="rv-name">${esc(c.name)}</div></li>`;
}

/**
 * Add the photos and the reviews to the rendered home page. Throws when an anchor the dressing relies on
 * is missing, so a renderer change cannot silently drop a section. Returns a new files map (binary media added).
 */
export function dressDemoSite(files, { dressing, reviews, reviewsHeading, root }) {
  if (!dressing) return files;
  const out = { ...files };
  let html = out["index.html"];
  if (typeof html !== "string") throw new Error("dressing: the rendered site has no index.html");
  const one = (re, what) => {
    const m = html.match(new RegExp(re.source, "g")) ?? [];
    if (m.length !== 1) throw new Error(`dressing: expected one ${what} on the home page, found ${m.length}`);
    return m[0];
  };
  html = html.replace("</head>", `<style data-demo-dressing>${CSS}</style></head>`);
  const ph = dressing.photos;
  if (ph) {
    for (const f of [ph.owner, ...ph.work]) out[media(f)] = readFileSync(path.join(root, f));
    const aboutOpen = one(/<section id="about" data-section="about"[^>]*><div[^>]*>/, "about section");
    html = html.replace(aboutOpen, `${aboutOpen}<img class="demo-owner" data-demo-owner src="/${media(ph.owner)}" alt="" width="900" height="1200">`);
  }
  const aboutEnd = html.indexOf("</section>", html.indexOf('<section id="about"'));
  if (aboutEnd < 0) throw new Error("dressing: about section is not closed");
  const gallery = ph ? `<section id="gallery" data-section="gallery" data-demo-dressing class="demo-gallery"><ul role="list">${ph.work.map((f, i) => `<li><img data-demo-work="${i}" src="/${media(f)}" alt="" width="1200" height="900"></li>`).join("")}</ul></section>` : "";
  const rv = reviews ? `<section id="reviews" data-section="reviews" data-demo-reviews data-demo-dressing class="demo-reviews" aria-labelledby="reviews-heading"><div class="wrap"><h2 id="reviews-heading">${esc(reviewsHeading)}</h2><ul role="list">${reviews.cards.map(reviewCard).join("")}</ul></div></section>` : "";
  const at = aboutEnd + "</section>".length;
  // Reviews sit between the owner and the work photos: the shot flicks from one to the other, so the reviews are only
  // ever seen in motion. (Below the gallery they could never leave the screen on mobile: the page ends too soon.)
  html = `${html.slice(0, at)}${rv}${gallery}${html.slice(at)}`;
  out["index.html"] = html;
  return out;
}
