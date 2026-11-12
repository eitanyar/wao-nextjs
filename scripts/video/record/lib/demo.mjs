// Demo-business seed: load, guard, and turn into the two audit API replies.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Hebrew only passes through
// from the site record (generator output); nothing is typed here.

import { existsSync, readFileSync, realpathSync } from "node:fs";
import path from "node:path";

export const DEMO_SCHEMA = "wao.video.demo/1";
export const AUDIT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Demo phones are 050-000000X: obviously not a subscriber number, so a viewer who dials reaches nobody. */
export const DEMO_PHONE = /^0500{6}\d$/;
const DEMO_HOST = /\.(invalid|example)$/;
const DEMO_EMAIL = /@(example\.(com|org|net)|[a-z0-9.-]+\.(invalid|example))$/i;
const SNAPSHOT_BOOLS = ["hasRegularOpeningHours", "hasSpecialOpeningHours", "hasPhone", "hasWebsite", "photosFetched", "hasRating", "hasEditorialSummary"];

/** Seed files may live only under data/video/demo or scratch. Never data/clients. */
export function seedPathProblem(file, root) {
  const abs = path.resolve(root, file);
  const real = existsSync(abs) ? realpathSync(abs) : abs;
  const rel = path.relative(realpathSync(root), real).split(path.sep).join("/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) return `${file}: outside the repository`;
  if (rel === "data/clients" || rel.startsWith("data/clients/")) return `${file}: data/clients is live production data`;
  if (!rel.startsWith("data/video/demo/") && !rel.startsWith("scratch/")) return `${file}: seed data must live under data/video/demo/ or scratch/`;
  return null;
}

export function validateDemo(demo) {
  const errors = [];
  if (demo?.schema !== DEMO_SCHEMA) errors.push(`schema must be ${DEMO_SCHEMA}`);
  if (demo?.fictional !== true) errors.push("fictional must be true");
  if (!["STAND_IN", "APPROVED"].includes(demo?.status)) errors.push("status must be STAND_IN or APPROVED");
  if (typeof demo?.siteRecord !== "string") errors.push("siteRecord path missing");
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(demo?.slug ?? "")) errors.push("slug must be lowercase ascii with dashes");
  let host = "";
  try {
    const u = new URL(demo?.canonicalOrigin);
    host = u.protocol === "https:" && u.pathname === "/" ? u.hostname : "";
  } catch { /* reported below */ }
  if (!DEMO_HOST.test(host)) errors.push("canonicalOrigin must be an https .invalid or .example origin");
  if (!/^\/[a-z0-9/-]+$/.test(demo?.servicePath ?? "")) errors.push("servicePath must be a site path");
  const a = demo?.audit;
  if (!AUDIT_ID.test(a?.auditId ?? "")) errors.push("audit.auditId must be a UUID");
  if (!/^demo-place-[0-9]+$/.test(a?.placeId ?? "")) errors.push("audit.placeId must look like demo-place-0001 (never a real Place ID)");
  const s = a?.snapshot;
  if (!s || !Array.isArray(s.types) || !s.types.every((t) => typeof t === "string")) errors.push("audit.snapshot.types must be a string list");
  for (const k of SNAPSHOT_BOOLS) if (typeof s?.[k] !== "boolean") errors.push(`audit.snapshot.${k} must be true or false`);
  if (!Number.isInteger(s?.photoCount) || s.photoCount < 0) errors.push("audit.snapshot.photoCount must be a whole number");
  if (s?.userRatingCount !== undefined && !Number.isInteger(s.userRatingCount)) errors.push("audit.snapshot.userRatingCount must be a whole number");
  if (demo?.status === "APPROVED") {
    for (const k of ["copy", "languageQa", "founder"]) if (!demo.approvals?.[k]) errors.push(`status APPROVED needs approvals.${k}`);
  }
  return errors;
}

const filled = (v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && String(v).trim() !== "");

/** Facts that would put something on screen the storyboard and the founder's rules forbid. */
export function storyboardProblems(record) {
  const d = record?.collectedData ?? {};
  const out = [];
  if (["reviewQuote", "starRating", "reviewCount"].some((k) => filled(d[k]))) out.push("the record has a review quote or a star rating; the site would show it (storyboard: no review quotes, no star ratings with numbers)");
  if (["startingPrices", "calloutFee", "pricingNotes", "avgJobValue"].some((k) => filled(d[k]))) out.push("the record has prices; a price on a demo screen breaks the rule that a price appears only on the end screen");
  if (filled(d.ownerName)) out.push("the record has an owner name; the demo business must not name a person");
  if (/test|synthetic|eval/i.test(String(d.businessName ?? ""))) out.push("the business name is a test name");
  return out;
}

/** Why these recordings may not go into a release render. Empty = releasable. */
export function releaseBlockers(demo, record) {
  return [...(demo.status === "APPROVED" ? [] : ["demo business is a stand-in (copy not proofread, not approved)"]), ...storyboardProblems(record)];
}

const digits = (s) => String(s ?? "").replace(/\D/g, "");

/** Facts in the site record that could point at a real person or business. */
export function recordFictionProblems(record) {
  const d = record?.collectedData ?? {};
  const out = [];
  for (const k of ["phone", "whatsappNumber"]) {
    if (d[k] && !DEMO_PHONE.test(digits(d[k]))) out.push(`collectedData.${k} must be a demo number (050-000000X)`);
  }
  if (d.email && !DEMO_EMAIL.test(d.email)) out.push("collectedData.email must be on example.com or a .invalid / .example domain");
  for (const k of ["trustAssetUrls", "profilePhotoUrl", "logoUrl", "googleBusinessUrl", "websiteUrl"]) {
    if (d[k] && (!Array.isArray(d[k]) || d[k].length)) out.push(`collectedData.${k} must be empty (no real photos, profiles or sites)`);
  }
  if (!Array.isArray(record?.researchedPages) || !record.researchedPages.some((p) => p.classification === "homepage")) out.push("site record has no researched homepage");
  return out;
}

/** Contact links in the rendered HTML that are not demo-safe. */
export function htmlFictionProblems(files) {
  const out = [];
  for (const [file, html] of Object.entries(files)) {
    if (!file.endsWith(".html")) continue;
    for (const [, n] of html.matchAll(/href="tel:([^"]+)"/g)) {
      const local = digits(n).replace(/^972/, "0");
      if (!DEMO_PHONE.test(local)) out.push(`${file}: tel:${n} is not a demo number`);
    }
    for (const [, n] of html.matchAll(/href="https?:\/\/(?:wa\.me|api\.whatsapp\.com)\/[^"]*?(\d{9,})/g)) {
      if (!DEMO_PHONE.test(n.replace(/^972/, "0"))) out.push(`${file}: WhatsApp link ${n} is not a demo number`);
    }
    for (const [, m] of html.matchAll(/href="mailto:([^"?]+)/g)) if (!DEMO_EMAIL.test(m)) out.push(`${file}: mailto:${m} is not a demo address`);
  }
  return [...new Set(out)];
}

/** Read the seed and its site record; throws with every problem listed. */
export function loadDemo(file, { root }) {
  const problems = [];
  const p0 = seedPathProblem(file, root);
  if (p0) throw new Error(p0);
  const demo = JSON.parse(readFileSync(path.resolve(root, file), "utf8"));
  problems.push(...validateDemo(demo));
  if (problems.length) throw new Error(`demo seed invalid:\n- ${problems.join("\n- ")}`);
  const p1 = seedPathProblem(demo.siteRecord, root);
  if (p1) throw new Error(p1);
  const record = JSON.parse(readFileSync(path.resolve(root, demo.siteRecord), "utf8"));
  const fiction = recordFictionProblems(record);
  if (fiction.length) throw new Error(`site record is not demo-safe:\n- ${fiction.join("\n- ")}`);
  return { demo, record };
}

/**
 * The two replies the audit page asks for, in the exact shape of
 * /api/site-bot/audit-lookup and /api/site-bot/audit-result. The score is computed
 * by the product's own scoreAudit, so the scorecard is what a real profile with
 * these facts would get. Name and address come from the site record.
 */
export function auditReplies(demo, record, scoreAudit) {
  const d = record.collectedData;
  const displayName = d.businessName;
  const formattedAddress = d.targetLocation || String(d.specificCities ?? "").split(",")[0].trim();
  if (!displayName || !formattedAddress) throw new Error("site record needs businessName and targetLocation for the audit seed");
  const candidate = { placeId: demo.audit.placeId, displayName, formattedAddress, ...demo.audit.snapshot };
  const score = scoreAudit(candidate);
  if (score.total !== 6 || score.dimensions.length !== 6) throw new Error("scoreAudit did not return six dimensions");
  return {
    typedName: displayName,
    lookup: { auditId: demo.audit.auditId, candidateCount: 1 },
    result: { status: "ready", businessName: displayName, formattedAddress, score, placeId: demo.audit.placeId },
  };
}
