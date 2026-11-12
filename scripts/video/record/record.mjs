#!/usr/bin/env node
// WAO video screen recorder: the real Site Bot screens of the storyboard, on a
// seeded fictional demo business, at fixed viewports. Re-run after any UI change.
//
// node scripts/video/record/record.mjs [--shots S1,S2,S4] [--sets mobile,desktop]
//      [--base-url http://127.0.0.1:3271] [--demo data/video/demo/demo-business.json]
//      [--out scratch/video-out/recordings] [--list]
//
// S1/S2 (generated demo site) need no server: the site record is rendered by the
// product's compiled renderer and served from memory. S4 (free check) needs a LOCAL
// dev server (--base-url, loopback only); its two API calls are answered from the
// seed, so no Places lookup is made and nothing is written to data/.
// Output: <out>/{shot}_{set}[_DRAFT].mp4 + .png (last frame) + recordings.manifest.json
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../../voice/lib/io.mjs";
import { ffprobe, sha256File } from "../lib/compose.mjs";
import { launchBrowser } from "../lib/render.mjs";
import { STATIC_HOSTS, assertLocalBase, openShot } from "./lib/capture.mjs";
import { auditReplies, loadDemo, releaseBlockers } from "./lib/demo.mjs";
import { FPS, VIEWPORTS, frameSize } from "./lib/motion.mjs";
import { SHOTS, SHOT_IDS } from "./lib/shots.mjs";
import { loadProduct, renderDemoSite, serveFiles } from "./lib/site.mjs";

const rel = (f) => path.relative(ROOT, f);

export function parseArgs(argv) {
  const o = { shots: SHOT_IDS.filter((id) => !SHOTS[id].blocked), sets: Object.keys(VIEWPORTS), baseUrl: null, demo: "data/video/demo/demo-business.json", out: path.join(ROOT, "scratch/video-out/recordings"), config: path.join(ROOT, "data/video/config.json"), list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--shots") o.shots = argv[++i].split(",");
    else if (a === "--sets") o.sets = argv[++i].split(",");
    else if (a === "--base-url") o.baseUrl = argv[++i];
    else if (a === "--demo") o.demo = argv[++i];
    else if (a === "--out") o.out = path.resolve(argv[++i]);
    else if (a === "--config") o.config = path.resolve(argv[++i]);
    else if (a === "--list") o.list = true;
    else throw new Error(`unexpected argument: ${a}`);
  }
  for (const id of o.shots) if (!SHOTS[id]) throw new Error(`unknown shot ${id} (known: ${SHOT_IDS.join(", ")})`);
  for (const s of o.sets) if (!VIEWPORTS[s]) throw new Error(`unknown viewport set ${s} (known: ${Object.keys(VIEWPORTS).join(", ")})`);
  return o;
}

export const clipName = (shot, set, draft) => `${shot}_${set}${draft ? "_DRAFT" : ""}`;

/** What the shots need to know about the rendered demo site. */
export function siteFacts(files, record, product) {
  const toPath = (f) => (f === "index.html" ? "/" : `/${f.replace(/\.html$/, "")}`);
  const sitePaths = Object.keys(files).filter((f) => f.endsWith(".html")).map(toPath);
  const servicePaths = record.researchedPages.filter((p) => p.classification === "money_service").map((p) => p.targetPath);
  const contentFiles = ["index.html", "contact.html", ...servicePaths.map((p) => `${p.slice(1)}.html`)].filter((f) => f in files);
  return {
    sitePaths,
    servicePaths,
    pagesWithoutCall: contentFiles.filter((f) => !files[f].includes('href="tel:')).map(toPath),
    hoursText: product.displayBusinessHours(record.collectedData.businessHours),
  };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.list) {
    for (const id of SHOT_IDS) console.log(`${id}  ${SHOTS[id].beat}  ${SHOTS[id].title}${SHOTS[id].blocked ? `\n    BLOCKED: ${SHOTS[id].blocked}` : ""}`);
    return;
  }
  const config = JSON.parse(readFileSync(o.config, "utf8"));
  const { demo, record } = loadDemo(o.demo, { root: ROOT });
  const blockers = releaseBlockers(demo, record);
  const draft = blockers.length > 0;
  const product = await loadProduct(ROOT);
  const files = renderDemoSite({ demo, record, product });
  const audit = auditReplies(demo, record, product.scoreAudit);
  const wanted = o.shots.filter((id) => !SHOTS[id].blocked);
  const needsApp = wanted.some((id) => SHOTS[id].source === "app");
  let baseOrigin = null;
  if (needsApp) {
    if (!o.baseUrl) throw new Error("this run includes an app screen: start a local dev server and pass --base-url http://127.0.0.1:<port>");
    baseOrigin = assertLocalBase(o.baseUrl);
    const res = await fetch(`${baseOrigin}/site-bot/audit`).catch((e) => ({ status: `unreachable: ${e.message}` }));
    if (res.status !== 200) throw new Error(`${baseOrigin}/site-bot/audit answered ${res.status}; is the dev server up?`);
  }
  const site = await serveFiles(files);
  const env = { demo, record, audit, siteUrl: site.url, baseUrl: baseOrigin, ...siteFacts(files, record, product) };
  const policy = {
    localOrigins: [site.url, ...(baseOrigin ? [baseOrigin] : [])],
    staticHosts: STATIC_HOSTS,
    silence: [{ pathname: "/api/exit-optin/status", why: "keeps the exit pop-up closed during a recording" }],
    mocks: [
      { method: "POST", pathname: "/api/site-bot/audit-lookup", body: audit.lookup },
      { method: "GET", pathname: "/api/site-bot/audit-result", body: audit.result },
    ],
  };
  mkdirSync(o.out, { recursive: true });
  const manifestFile = path.join(o.out, "recordings.manifest.json");
  const previous = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")).clips ?? {} : {};
  const clips = { ...previous };
  const browser = await launchBrowser();
  let failed = 0;
  console.log(`demo: ${demo.slug} (${demo.status})${draft ? "  -> DRAFT clips, not for release:" : ""}`);
  for (const b of blockers) console.log(`  - ${b}`);
  try {
    for (const id of o.shots) {
      const shot = SHOTS[id];
      if (shot.blocked) {
        console.log(`${id} BLOCKED: ${shot.blocked}`);
        continue;
      }
      for (const setName of o.sets) {
        const set = VIEWPORTS[setName];
        const name = clipName(id, setName, draft);
        const outFile = path.join(o.out, `${name}.mp4`);
        // A clip from an earlier run with the other status would be stale: remove it.
        for (const stale of [clipName(id, setName, !draft)]) {
          for (const ext of [".mp4", ".png"]) rmSync(path.join(o.out, `${stale}${ext}`), { force: true });
          delete clips[stale];
        }
        const ctx = await openShot({ browser, set, outFile, policy, accent: config.brand.accent, fps: config.video?.fps ?? FPS, log: console.log });
        try {
          await shot.run(ctx, env);
          await ctx.poster(path.join(o.out, `${name}.png`));
          const done = await ctx.finish();
          const probe = ffprobe(outFile);
          const size = frameSize(set);
          const problems = [];
          if (probe.video?.width !== size.width || probe.video?.height !== size.height) problems.push(`size ${probe.video?.width}x${probe.video?.height}, expected ${size.width}x${size.height}`);
          if (probe.video?.fps !== `${ctx.fps}/1`) problems.push(`frame rate ${probe.video?.fps}`);
          if (Math.abs(probe.duration - done.frames / ctx.fps) > 0.05) problems.push(`duration ${probe.duration}s for ${done.frames} frames`);
          if (done.network.blocked.some((b) => b.includes("/api/"))) problems.push("the page made an API call that has no seeded reply");
          clips[name] = {
            shot: id, beat: shot.beat, title: shot.title, set: setName, aspects: set.aspects, status: problems.length ? "failed" : "ok", problems,
            file: rel(outFile), sha256: sha256File(outFile), width: size.width, height: size.height, cssViewport: `${set.width}x${set.height}@${set.dpr}`, fps: ctx.fps,
            frames: done.frames, seconds: Math.round((done.frames / ctx.fps) * 1000) / 1000, marks: done.marks, checks: done.checks,
            network: done.network, pageErrors: done.pageErrors, fontsFailed: done.fontsFailed, draft, releaseBlockers: blockers,
          };
          if (problems.length) failed++;
          console.log(`  ${problems.length ? "FAILED" : "ok"}  ${name}.mp4  ${clips[name].seconds}s  marks: ${done.marks.map((m) => `${m.name}@${m.t}`).join(", ") || "-"}${problems.length ? `\n    ${problems.join("\n    ")}` : ""}`);
          for (const n of done.checks.filter((c) => c.note)) console.log(`    note: ${n.detail}`);
        } catch (e) {
          failed++;
          await ctx.abort();
          rmSync(outFile, { force: true });
          clips[name] = { shot: id, beat: shot.beat, title: shot.title, set: setName, status: "failed", problems: [String(e.message)], draft, releaseBlockers: blockers };
          console.log(`  FAILED  ${name}: ${e.message}`);
        }
      }
    }
  } finally {
    await browser.close();
    await site.close();
  }
  const head = (() => { try { return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim(); } catch { return null; } })();
  const manifest = {
    schema: "wao.video.recordings/1",
    recordedAt: new Date().toISOString(),
    gitHead: head,
    demo: { seed: o.demo, slug: demo.slug, status: demo.status, siteRecord: demo.siteRecord, siteRecordSha256: sha256File(path.resolve(ROOT, demo.siteRecord)), canonicalOrigin: demo.canonicalOrigin },
    app: { baseUrl: baseOrigin, note: "local dev server; audit API answered from the seed" },
    release: !draft && Object.values(clips).every((c) => c.status === "ok"),
    releaseBlockers: blockers,
    blockedShots: Object.fromEntries(SHOT_IDS.filter((id) => SHOTS[id].blocked).map((id) => [id, SHOTS[id].blocked])),
    clips,
  };
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`manifest: ${rel(manifestFile)}`);
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
