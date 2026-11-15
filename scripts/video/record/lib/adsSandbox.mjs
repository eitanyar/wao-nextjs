// Ads Bot leads-screen sandbox: a fictional client, its campaign index and its
// leads, written to an isolated directory that a LOCAL dev server reads through
// the product's own env overrides (WAO_CLIENTS_DIR, WAO_LEADS_FILE_PATH,
// CLIENT_PORTAL_SECRET). Nothing here reads or writes data/clients.
//
// The session cookie is signed by the product's own createSessionToken with the
// sandbox's private secret, which only the sandbox dev server knows. Production
// auth is untouched: the sandbox client has no usable PIN and does not exist in
// the live clients directory.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes. Lead names pass through
// from the seed (copied byte-exact from the copy pipeline by the episode tools).

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const ADS_SEED_SCHEMA = "wao.video.ads-sandbox/1";
export const SANDBOX_FILE = "sandbox.json";
export const LEAD_TYPES = ["form", "phone-click", "whatsapp-click"];
/** Masked phones only: 05X-xxx-xxNN shape with bullets, so nothing on screen can be dialled. */
export const MASKED_PHONE = /^05\d-•{3}-•{2}\d{2}$/;
const CLIENT_ID = /^video-demo-[a-z0-9-]{1,40}$/;
const SLUG = /^video-demo-[a-z0-9-]{1,60}$/;
const RECENT_DAYS = 14;
/** A pinHash the product can never verify (not the scrypt-v1 shape), so the sandbox client cannot log in. */
export const NO_LOGIN_PIN_HASH = "video-sandbox-no-pin-login";

const relTo = (root, p) => path.relative(realpathSync(root), p).split(path.sep).join("/");

/** Sandbox directories may live only under scratch/ or the OS temp dir. Never data/. */
export function sandboxDirProblem(dir, root) {
  const abs = path.resolve(root, dir);
  const real = existsSync(abs) ? realpathSync(abs) : abs;
  const rel = relTo(root, real);
  const inRepo = !rel.startsWith("..") && !path.isAbsolute(rel);
  if (inRepo && (rel === "data" || rel.startsWith("data/"))) return `${dir}: sandbox may not live under data/ (data/clients is live production data)`;
  if (inRepo && !rel.startsWith("scratch/")) return `${dir}: sandbox inside the repo must live under scratch/`;
  if (!inRepo && !real.startsWith(realpathSync(os.tmpdir()) + path.sep)) return `${dir}: sandbox outside the repo must live under ${os.tmpdir()}`;
  return null;
}

/** Validate a leads seed against the storyboard rules: fictional, masked, recent, non-stub, deal empty, one mark to tap. */
export function validateAdsSeed(seed, { now = new Date() } = {}) {
  const e = [];
  if (seed?.schema !== ADS_SEED_SCHEMA) e.push(`schema must be ${ADS_SEED_SCHEMA}`);
  if (seed?.fictional !== true) e.push("fictional must be true");
  if (!CLIENT_ID.test(seed?.clientId ?? "")) e.push("clientId must start with video-demo-");
  if (!SLUG.test(seed?.slug ?? "")) e.push("slug must start with video-demo-");
  if (!/^000-000-00\d\d$/.test(seed?.customerId ?? "")) e.push("customerId must be a 000-000-00NN placeholder");
  const leads = Array.isArray(seed?.leads) ? seed.leads : [];
  if (leads.length < 1) e.push("leads must be a non-empty list");
  const ids = new Set();
  leads.forEach((l, i) => {
    const at = `leads[${i}]`;
    if (!Number.isInteger(l.id) || l.id <= 0 || ids.has(l.id)) e.push(`${at}.id must be a unique positive integer`);
    ids.add(l.id);
    if (typeof l.name !== "string" || !l.name.trim()) e.push(`${at}.name is required (a stub row would show the source label instead of the name)`);
    if (!MASKED_PHONE.test(l.phone ?? "")) e.push(`${at}.phone must be masked (05X-•••-••NN)`);
    if (!LEAD_TYPES.includes(l.type)) e.push(`${at}.type must be one of ${LEAD_TYPES.join(", ")}`);
    if (!["PENDING", "GOOD", "JUNK"].includes(l.quality)) e.push(`${at}.quality must be PENDING, GOOD or JUNK`);
    const d = new Date(l.date);
    const age = (now - d) / 86400000;
    if (!/^\d{4}-\d{2}-\d{2}T/.test(l.date ?? "") || Number.isNaN(age) || age < -0.01 || age > RECENT_DAYS) e.push(`${at}.date must be an ISO time within the last ${RECENT_DAYS} days`);
    if (l.closed || l.revenue || l.closedAt) e.push(`${at}: the deal column must be empty (no closed deal, no revenue)`);
    for (const k of ["email", "gclid", "wbraid", "gbraid"]) if (l[k]) e.push(`${at}.${k} must not be set`);
  });
  const tap = leads.find((l) => l.id === seed?.tapLeadId);
  if (!tap) e.push("tapLeadId must name one of the leads");
  else if (tap.quality !== "PENDING") e.push("the lead to tap must start PENDING (the UI shows the mark button)");
  return e;
}

/** The files the sandbox dev server reads, as { relativePath: object }. Pure. */
export function sandboxFiles(seed, { now = new Date() } = {}) {
  const ts = now.toISOString();
  const leads = seed.leads.map((l) => ({ id: l.id, name: l.name, phone: l.phone, date: l.date, type: l.type, quality: l.quality, slug: seed.slug, customerId: seed.customerId }));
  return {
    [`clients/${seed.clientId}/client-auth.json`]: { pinHash: NO_LOGIN_PIN_HASH, sessionVersion: 1, mustChangePin: false, createdAt: ts, updatedAt: ts },
    [`clients/${seed.clientId}/google-ads.json`]: {
      clientId: seed.clientId, primarySlug: seed.slug, primaryCustomerId: seed.customerId, primaryCampaignId: "0", updatedAt: ts,
      campaigns: [{ slug: seed.slug, customerId: seed.customerId, campaignId: "0", createdAt: ts }],
    },
    "leads.json": leads,
  };
}

/** Write the sandbox; returns { dir, clientId, env } with the env the dev server must be started with. */
export function materializeAdsSandbox(seed, dir, { root, now = new Date() } = {}) {
  const problems = [...validateAdsSeed(seed, { now }), ...[sandboxDirProblem(dir, root)].filter(Boolean)];
  if (problems.length) throw new Error(`ads sandbox refused:\n- ${problems.join("\n- ")}`);
  const abs = path.resolve(root, dir);
  for (const [rel, obj] of Object.entries(sandboxFiles(seed, { now }))) {
    const f = path.join(abs, rel);
    mkdirSync(path.dirname(f), { recursive: true });
    writeFileSync(f, `${JSON.stringify(obj, null, 2)}\n`);
  }
  const secret = randomBytes(32).toString("hex");
  const env = { WAO_CLIENTS_DIR: path.join(abs, "clients"), WAO_LEADS_FILE_PATH: path.join(abs, "leads.json"), CLIENT_PORTAL_SECRET: secret };
  const sandbox = { schema: ADS_SEED_SCHEMA, clientId: seed.clientId, tapLeadId: seed.tapLeadId, leads: seed.leads.map(({ id, name }) => ({ id, name })), env, createdAt: now.toISOString() };
  writeFileSync(path.join(abs, SANDBOX_FILE), `${JSON.stringify(sandbox, null, 2)}\n`);
  return { dir: abs, ...sandbox };
}

export function loadAdsSandbox(dir, { root }) {
  const problem = sandboxDirProblem(dir, root);
  if (problem) throw new Error(problem);
  const abs = path.resolve(root, dir);
  const s = JSON.parse(readFileSync(path.join(abs, SANDBOX_FILE), "utf8"));
  if (s.schema !== ADS_SEED_SCHEMA || !CLIENT_ID.test(s.clientId)) throw new Error(`${dir}: not an ads sandbox`);
  if (path.resolve(s.env.WAO_CLIENTS_DIR) !== path.join(abs, "clients")) throw new Error(`${dir}: WAO_CLIENTS_DIR does not point into the sandbox`);
  if (existsSync(path.join(root, "data/clients", s.clientId))) throw new Error(`${s.clientId} exists in the live data/clients; pick another sandbox client id`);
  return { dir: abs, ...s };
}

/** Session cookie value, signed by the product's own createSessionToken (compiled dist module) with the sandbox secret. */
export async function sandboxSessionToken(sandbox, { root }) {
  const mod = await import(pathToFileURL(path.join(root, "dist/lib/client-auth.js")).href);
  const createSessionToken = mod.createSessionToken ?? mod.default?.createSessionToken;
  return createSessionToken(sandbox.clientId, { sessionVersion: 1, secret: sandbox.env.CLIENT_PORTAL_SECRET, expiry: Date.now() + 2 * 3600 * 1000 });
}

/** Shell-ready env line for the sandbox dev server (printed by the CLI). */
export const envLine = (env) => Object.entries(env).map(([k, v]) => `${k}=${v}`).join(" ");
