// node --test scripts/video/record/record.test.mjs
// Offline: no browser, no dev server, no network. The render test uses the compiled
// product modules and is skipped (with the build command) when they are stale.
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { ROOT } from "../../voice/lib/io.mjs";
import { assertLocalBase, classifyRequest, STATIC_HOSTS } from "./lib/capture.mjs";
import { auditReplies, htmlFictionProblems, loadDemo, recordFictionProblems, releaseBlockers, seedPathProblem, storyboardProblems, validateDemo } from "./lib/demo.mjs";
import { FPS, MAX_SCROLL_PX_PER_S, VIEWPORTS, frameSize, graphemes, holdFrames, peakScrollSpeed, ringFrames, scrollFrames, typeFrames } from "./lib/motion.mjs";
import { SHOTS } from "./lib/shots.mjs";
import { DIST_BUILD_COMMAND, loadProduct, renderDemoSite, resolveSiteFile, staleDist } from "./lib/site.mjs";
import { clipName, parseArgs, siteFacts } from "./record.mjs";

const SEED = "data/video/demo/demo-business.json";
const seed = () => JSON.parse(readFileSync(path.join(ROOT, SEED), "utf8"));

// ---------------------------------------------------------------- motion

test("viewport sets match the storyboard and give even frame sizes", () => {
  assert.deepEqual(frameSize(VIEWPORTS.mobile), { width: 1170, height: 2532 });
  assert.deepEqual(frameSize(VIEWPORTS.desktop), { width: 1920, height: 1080 });
  assert.deepEqual(VIEWPORTS.mobile.aspects, ["9x16", "1x1"]);
  assert.deepEqual(VIEWPORTS.desktop.aspects, ["16x9"]);
  assert.throws(() => frameSize({ width: 391, height: 844, dpr: 1 }), /not even/);
});

test("scroll never exceeds the speed limit and lands exactly on the target", () => {
  for (const [from, to] of [[0, 900], [1200, 100], [0, 5000], [0, 40]]) {
    const f = scrollFrames(from, to);
    assert.equal(f.at(-1), to);
    assert.ok(peakScrollSpeed(f, from) <= MAX_SCROLL_PX_PER_S + FPS, `peak ${peakScrollSpeed(f, from)} for ${from}->${to}`); // + rounding of whole pixels
    const down = to > from;
    assert.ok(f.every((y, i) => i === 0 || (down ? y >= f[i - 1] : y <= f[i - 1])), "monotonic");
  }
  assert.deepEqual(scrollFrames(100, 100), []);
  assert.ok(scrollFrames(0, 40).length >= FPS / 2, "short scrolls still take half a second");
});

test("typing is capped, ends complete, and never splits a character", () => {
  const text = "ab\u05E9\u05B8\u05C1\u05DC cd"; // a Hebrew letter with two marks counts as one
  assert.equal(graphemes(text).length, 7);
  const f = typeFrames(text);
  assert.equal(f.at(-1), 7);
  assert.ok(f.every((n, i) => i === 0 || n >= f[i - 1]));
  assert.throws(() => typeFrames("abc", { charsPerSecond: 20 }), /over the/);
});

test("tap ring lasts 300ms and fades out; holds are whole frames", () => {
  const r = ringFrames();
  assert.equal(r.length, 9);
  assert.equal(r.at(-1).opacity, 0);
  assert.equal(r.at(-1).scale, 1);
  assert.equal(holdFrames(1), 30);
  assert.equal(holdFrames(0), 1);
});

// ---------------------------------------------------------------- network policy

const policy = {
  localOrigins: ["http://127.0.0.1:3271", "http://127.0.0.1:5000"],
  staticHosts: STATIC_HOSTS,
  silence: [{ pathname: "/api/exit-optin/status", why: "pop-up" }],
  mocks: [{ method: "POST", pathname: "/api/site-bot/audit-lookup", body: {} }, { method: "GET", pathname: "/api/site-bot/audit-result", body: {} }],
};
const verdict = (method, url) => classifyRequest({ method, url }, policy).action;

test("network policy: seeded API replies, everything else that could spend or write is blocked", () => {
  assert.equal(verdict("POST", "http://127.0.0.1:3271/api/site-bot/audit-lookup"), "mock");
  assert.equal(verdict("GET", "http://127.0.0.1:3271/api/site-bot/audit-result?auditId=x"), "mock");
  assert.equal(verdict("GET", "http://127.0.0.1:3271/api/site-bot/audit-lookup"), "block", "wrong method is not a seeded call");
  assert.equal(verdict("POST", "http://127.0.0.1:3271/api/site-bot/help-request"), "block");
  assert.equal(verdict("POST", "http://127.0.0.1:3271/api/bot"), "block");
  assert.equal(verdict("POST", "http://127.0.0.1:5000/contact"), "block", "a form post on the demo site");
  assert.equal(verdict("GET", "http://127.0.0.1:3271/site-bot/audit"), "allow");
  assert.equal(verdict("GET", "http://127.0.0.1:5000/services/leak-detection"), "allow");
  assert.equal(verdict("GET", "https://fonts.gstatic.com/s/x.woff2"), "allow");
  assert.equal(verdict("POST", "https://fonts.googleapis.com/css2"), "block");
  assert.equal(verdict("GET", "https://www.googletagmanager.com/gtm.js"), "block");
  assert.equal(verdict("GET", "https://www.wao.co.il/site-bot/audit"), "block");
  assert.equal(verdict("GET", "https://places.googleapis.com/v1/places:searchText"), "block");
  assert.equal(verdict("GET", "data:image/png;base64,AAAA"), "allow");
  assert.equal(verdict("GET", "not a url"), "block");
  const quiet = classifyRequest({ method: "GET", url: "http://127.0.0.1:3271/api/exit-optin/status" }, policy);
  assert.equal(quiet.action, "block");
  assert.equal(quiet.silenced, true);
});

test("the app under recording must be a loopback dev server", () => {
  assert.equal(assertLocalBase("http://127.0.0.1:3271/x"), "http://127.0.0.1:3271");
  assert.equal(assertLocalBase("http://localhost:3000"), "http://localhost:3000");
  for (const bad of ["https://www.wao.co.il", "http://wao.co.il", "http://100.102.160.114:4017", "https://127.0.0.1:3000"]) assert.throws(() => assertLocalBase(bad), /local dev server only/);
});

// ---------------------------------------------------------------- demo seed

test("seed data may live only under data/video/demo or scratch", () => {
  assert.equal(seedPathProblem(SEED, ROOT), null);
  assert.equal(seedPathProblem("scratch/anything/site-record.json", ROOT), null);
  assert.match(seedPathProblem("data/clients/test-plumber-tlv/client.json", ROOT), /live production data/);
  assert.match(seedPathProblem("data/video/demo/../../clients/retter/client.json", ROOT), /live production data/);
  assert.match(seedPathProblem("data/sites/test-plumber-tlv.json", ROOT), /must live under/);
  assert.match(seedPathProblem("../outside.json", ROOT), /outside the repository/);
});

test("the checked-in seed is valid, fictional, and reads its record from an allowed place", () => {
  const { demo, record } = loadDemo(SEED, { root: ROOT });
  assert.equal(demo.fictional, true);
  assert.deepEqual(validateDemo(demo), []);
  assert.deepEqual(recordFictionProblems(record), []);
  assert.equal(seedPathProblem(demo.siteRecord, ROOT), null);
});

test("seed validation catches the dangerous edits", () => {
  const bad = (patch) => validateDemo({ ...seed(), ...patch });
  assert.ok(bad({ fictional: false }).some((e) => /fictional/.test(e)));
  assert.ok(bad({ canonicalOrigin: "https://demo-plumber.wao.co.il" }).some((e) => /invalid or \.example/.test(e)));
  assert.ok(bad({ canonicalOrigin: "https://real-plumber.co.il" }).some((e) => /invalid or \.example/.test(e)));
  assert.ok(bad({ audit: { ...seed().audit, placeId: "ChIJN1t_tDeuEmsRUsoyG83frY4" } }).some((e) => /never a real Place ID/.test(e)));
  assert.ok(bad({ audit: { ...seed().audit, auditId: "nope" } }).some((e) => /UUID/.test(e)));
  assert.ok(bad({ status: "APPROVED" }).some((e) => /approvals\.founder/.test(e)), "APPROVED needs all three sign-offs");
  assert.deepEqual(bad({ status: "APPROVED", approvals: { copy: "a", languageQa: "b", founder: "c" } }), []);
});

test("a record with a real-looking phone, mail or photo is refused", () => {
  const pages = [{ classification: "homepage" }];
  const ok = { collectedData: { phone: "050-0000002", whatsappNumber: "0500000002", email: "owner@example.com" }, researchedPages: pages };
  assert.deepEqual(recordFictionProblems(ok), []);
  assert.ok(recordFictionProblems({ collectedData: { phone: "050-1234567" }, researchedPages: pages }).length);
  assert.ok(recordFictionProblems({ collectedData: { email: "yossi@gmail.com" }, researchedPages: pages }).length);
  assert.ok(recordFictionProblems({ collectedData: { profilePhotoUrl: "https://x/y.jpg" }, researchedPages: pages }).length);
  assert.ok(recordFictionProblems({ collectedData: {}, researchedPages: [] }).length);
  assert.deepEqual(htmlFictionProblems({ "a.html": '<a href="tel:+972500000000">x</a><a href="https://wa.me/972500000000">w</a><a href="mailto:a@example.com">m</a>' }), []);
  assert.equal(htmlFictionProblems({ "a.html": '<a href="tel:+972501234567">x</a><a href="https://wa.me/972521234567">w</a><a href="mailto:a@gmail.com">m</a>' }).length, 3);
});

test("stand-in data and storyboard-breaking facts block release", () => {
  const clean = { collectedData: { businessName: "Demo" } };
  const approved = { ...seed(), status: "APPROVED" };
  assert.deepEqual(releaseBlockers(approved, clean), []);
  assert.equal(releaseBlockers(seed(), clean).length, 1);
  assert.equal(storyboardProblems({ collectedData: { reviewQuote: "q" } }).length, 1);
  assert.equal(storyboardProblems({ collectedData: { starRating: "5" } }).length, 1);
  assert.equal(storyboardProblems({ collectedData: { startingPrices: [{ job: "x", from: 1 }] } }).length, 1);
  assert.equal(storyboardProblems({ collectedData: { calloutFee: 150 } }).length, 1);
  assert.equal(storyboardProblems({ collectedData: { ownerName: "x" } }).length, 1);
  assert.equal(storyboardProblems({ collectedData: { businessName: "TEST M2a Plumbing" } }).length, 1);
  assert.deepEqual(storyboardProblems({ collectedData: { startingPrices: [], reviewQuote: " " } }), []);
  const { demo, record } = loadDemo(SEED, { root: ROOT });
  if (demo.status === "STAND_IN") assert.ok(releaseBlockers(demo, record).length >= 1, "the stand-in can never be released");
});

test("audit replies have the API's shape and the product's own score", () => {
  const demo = seed();
  const record = { collectedData: { businessName: "Demo Name", targetLocation: "Demo City" } };
  const fakeScore = (c) => ({ total: 6, passed: 0, failed: 6, unknown: 0, dimensions: Array.from({ length: 6 }, (_, i) => ({ key: `k${i}`, status: "fail", evidence: "", copyToken: "" })), seen: c });
  const r = auditReplies(demo, record, fakeScore);
  assert.deepEqual(r.lookup, { auditId: demo.audit.auditId, candidateCount: 1 });
  assert.deepEqual(Object.keys(r.result).sort(), ["businessName", "formattedAddress", "placeId", "score", "status"]);
  assert.equal(r.result.status, "ready");
  assert.equal(r.typedName, "Demo Name");
  assert.equal(r.result.score.seen.placeId, demo.audit.placeId);
  assert.equal(r.result.score.seen.hasWebsite, demo.audit.snapshot.hasWebsite);
  assert.throws(() => auditReplies(demo, { collectedData: {} }, fakeScore), /businessName/);
});

// ---------------------------------------------------------------- shots and CLI

test("shots cover the storyboard's real screens; S3 stays blocked with a reason", () => {
  assert.deepEqual(Object.keys(SHOTS), ["S1", "S2", "S3", "S4"]);
  assert.deepEqual(Object.values(SHOTS).map((s) => s.beat), ["B05", "B06", "B10", "B12"]);
  assert.match(SHOTS.S3.blocked, /G4/);
  assert.equal(SHOTS.S3.run, undefined);
  for (const id of ["S1", "S2", "S4"]) assert.equal(typeof SHOTS[id].run, "function");
  assert.deepEqual(parseArgs([]).shots, ["S1", "S2", "S4"]);
  assert.throws(() => parseArgs(["--shots", "S9"]), /unknown shot/);
  assert.throws(() => parseArgs(["--sets", "tablet"]), /unknown viewport set/);
  assert.equal(clipName("S1", "mobile", true), "S1_mobile_DRAFT");
  assert.equal(clipName("S1", "mobile", false), "S1_mobile");
});

test("S2 never clicks the call button; no shot touches checkout, fix or start routes", () => {
  const src = readFileSync(path.join(ROOT, "scripts/video/record/lib/shots.mjs"), "utf8");
  assert.ok(!/tap\(call/.test(src), "the call button gets a ring, never a tap");
  for (const route of ["/site-bot/pay", "/site-bot/fix", "/site-bot/start`", "fix-execute", "gbp/oauth"]) assert.ok(!src.includes(`goto(\`\${env.baseUrl}${route}`), route);
});

test("Pages-like file lookup", () => {
  const files = { "index.html": "h", "contact.html": "c", "services/leak.html": "l", "404.html": "n" };
  assert.equal(resolveSiteFile(files, "/"), "index.html");
  assert.equal(resolveSiteFile(files, "/contact"), "contact.html");
  assert.equal(resolveSiteFile(files, "/services/leak"), "services/leak.html");
  assert.equal(resolveSiteFile(files, "/nope"), null);
  assert.equal(resolveSiteFile(files, "/../etc/passwd"), null);
});

test("recorder source and seed contain no Hebrew (Hebrew comes only from the copy pipeline)", () => {
  const dir = path.join(ROOT, "scripts/video/record");
  const files = [...readdirSync(dir), ...readdirSync(path.join(dir, "lib")).map((f) => `lib/${f}`)].filter((f) => /\.(mjs|md)$/.test(f)).map((f) => path.join(dir, f));
  for (const f of [...files, path.join(ROOT, SEED)]) assert.ok(!/[\u0590-\u05FF]/.test(readFileSync(f, "utf8")), `${path.relative(ROOT, f)} contains Hebrew`);
});

// ---------------------------------------------------------------- render (compiled product modules)

test("the demo site renders through the product renderer and is demo-safe", { skip: staleDist(ROOT).length ? `compiled modules are stale; run \`${DIST_BUILD_COMMAND}\`` : false }, async () => {
  const { demo, record } = loadDemo(SEED, { root: ROOT });
  const product = await loadProduct(ROOT);
  const files = renderDemoSite({ demo, record, product });
  assert.ok("index.html" in files && "contact.html" in files);
  assert.ok(files["index.html"].includes(demo.canonicalOrigin), "canonical is the demo's own domain");
  assert.ok(!Object.values(files).some((h) => h.includes(".wao.co.il")), "no WAO subdomain: own domain from day one");
  const facts = siteFacts(files, record, product);
  assert.ok(facts.servicePaths.includes(demo.servicePath), "the seed's service page exists");
  assert.ok(facts.servicePaths.every((p) => facts.sitePaths.includes(p)), "a page per service");
  assert.deepEqual(facts.pagesWithoutCall, [], "call link on home, contact and every service page");
  assert.ok(facts.hoursText, "opening hours are displayable");
  const audit = auditReplies(demo, record, product.scoreAudit);
  assert.equal(audit.result.score.total, 6);
  assert.equal(audit.result.score.dimensions.length, 6);
  assert.equal(audit.result.score.dimensions.find((d) => d.key === "phone_website").status, "pass", "the demo business has a site, so the check must not say it has none");
});
