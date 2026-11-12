#!/usr/bin/env node
// WAO video assembly: video.json -> voiced, captioned MP4s in three aspects.
//
// node scripts/video/build-video.mjs <video.json> [--aspects 9x16,1x1,16x9] [--allow-tts]
//      [--out-root scratch/video-out] [--config data/video/config.json] [--hash]
//
// Stages: 1 validate (schema, price constant, approved script hash) -> 2 voice
// (picked voice-check takes, else cache, else ElevenLabs with --allow-tts) ->
// 3 timeline from audio durations -> 4 captions from the clean text, rendered by
// headless Chrome with dir="rtl" -> 5 end screen -> 6 compose per aspect ->
// 7 checks (ffprobe, one frame per caption card, manifest with hashes).
//
// --hash prints the script hash and its approval status, renders nothing.
// Output: <out-root>/{product}/{id}/{id}_{seconds}s_{aspect}_he_v{n}.mp4 + .srt + .manifest.json

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { applyLexicon, loadLexicon, DEFAULT_LEXICON_PATH } from "../voice/lexicon.mjs";
import { ROOT, probeDuration, readEnvKey } from "../voice/lib/io.mjs";
import { cardTimes, splitCards, toSrt } from "./lib/captions.mjs";
import { audioArgs, buildTimeline, composeArgs, extractFrame, ffmpeg, ffprobe, outputBase, probeProblems, sha256File } from "./lib/compose.mjs";
import { captionPage, endScreenPage, fontFaceCss, placeholderPage, proofPage } from "./lib/pages.mjs";
import { launchBrowser, shoot } from "./lib/render.mjs";
import { checkPrice, findApproval, productPrice, releaseBlockers, resolveVideo, scriptHash, validateVideoSpec } from "./lib/spec.mjs";
import { resolveTake } from "./lib/voice.mjs";

export const DEFAULT_CONFIG = path.join(ROOT, "data/video/config.json");
export const APPROVED_HASHES = path.join(ROOT, "scripts/video/approved-hashes.json");
const rel = (f) => path.relative(ROOT, f);
const r3 = (x) => Math.round(x * 1000) / 1000;

function parseArgs(argv) {
  const o = { spec: null, aspects: null, allowTts: false, outRoot: path.join(ROOT, "scratch/video-out"), config: DEFAULT_CONFIG, hashOnly: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--aspects") o.aspects = argv[++i].split(",");
    else if (a === "--allow-tts") o.allowTts = true;
    else if (a === "--out-root") o.outRoot = path.resolve(argv[++i]);
    else if (a === "--config") o.config = path.resolve(argv[++i]);
    else if (a === "--hash") o.hashOnly = true;
    else if (!o.spec && !a.startsWith("--")) o.spec = path.resolve(a);
    else throw new Error(`unexpected argument: ${a}`);
  }
  if (!o.spec) throw new Error("usage: node scripts/video/build-video.mjs <video.json> [--aspects 9x16,1x1,16x9] [--allow-tts] [--hash]");
  return o;
}

/**
 * Stage 1. Loads everything, returns { video, hash, approval, price, errors }.
 * errors non-empty = refuse to run.
 */
export function validate({ specFile, configFile = DEFAULT_CONFIG, approvedFile = APPROVED_HASHES, lexiconFile = DEFAULT_LEXICON_PATH, root = ROOT }) {
  const spec = JSON.parse(readFileSync(specFile, "utf8"));
  const config = JSON.parse(readFileSync(configFile, "utf8"));
  const lexicon = loadLexicon(lexiconFile);
  const errors = validateVideoSpec(spec, { aspects: Object.keys(config.aspects) });
  if (errors.length) return { spec, config, lexicon, errors };
  const { video, errors: resolveErrors } = resolveVideo(spec, { root, config, lexicon });
  errors.push(...resolveErrors);
  if (errors.length) return { spec, config, lexicon, video, errors };
  const price = productPrice(config, spec.product, { root });
  errors.push(...price.errors, ...checkPrice(video, price.amount));
  const hash = scriptHash(video);
  const approved = existsSync(approvedFile) ? JSON.parse(readFileSync(approvedFile, "utf8")) : { approved: [] };
  const approval = findApproval(approved, hash, video.id);
  if (!approval) errors.push(`script hash ${hash} is not in ${rel(approvedFile)} (copy changed or was never approved)`);
  return { spec, config, lexicon, video, price, hash, approval, errors };
}

const toolVersion = (bin, args) => {
  try {
    return execFileSync(bin, args, { encoding: "utf8" }).split("\n")[0].trim();
  } catch {
    return null;
  }
};

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const v = validate({ specFile: o.spec, configFile: o.config });
  if (o.hashOnly) {
    if (v.hash) console.log(`${v.hash}  ${v.video.id}  ${v.approval ? "APPROVED" : "NOT APPROVED"}`);
    for (const e of v.errors) console.error(`REFUSED: ${e}`);
    process.exit(v.errors.length ? 2 : 0);
  }
  if (v.errors.length) {
    for (const e of v.errors) console.error(`REFUSED: ${e}`);
    process.exit(2);
  }
  const { spec, config, lexicon, video, price, hash, approval } = v;
  const aspects = o.aspects ?? Object.keys(config.aspects);
  for (const a of aspects) if (!config.aspects[a]) throw new Error(`unknown aspect ${a}`);
  const { fps, gapSeconds: gap, crf, loudnorm } = config.video;
  const endHoldMin = Math.max(config.video.endHoldMinSeconds, video.endScreen.holdSeconds);
  const outDir = path.join(o.outRoot, video.product, video.id);
  const work = path.join(outDir, "work", `v${video.version}`);
  mkdirSync(work, { recursive: true });
  console.error(`stage 1 validate: ok  hash ${hash.slice(0, 12)}  price ${price.amount}${price.pageChecked ? " (matches page constant)" : ""}`);

  // ---- stage 2: voice
  let ek;
  const spent = { requests: 0, chars: 0 };
  for (const b of video.beats) {
    b.tts = applyLexicon(b.voice, lexicon).tts;
    try {
      b.take = await resolveTake(b.tts, {
        takesDirs: spec.voice?.takesDirs ?? [],
        root: ROOT,
        voice: lexicon.defaultVoice,
        cacheDir: path.join(outDir, "work", "voice"),
        allowTts: o.allowTts,
        apiKey: () => (ek ??= readEnvKey("ELEVENLABS_API_KEY")),
        lexicon,
      });
    } catch (e) {
      console.error(`REFUSED: beats[${b.index}] voice: ${e.message}`);
      process.exit(2);
    }
    b.take.duration = probeDuration(b.take.file);
    spent.requests += b.take.spent.requests;
    spent.chars += b.take.spent.chars;
    console.error(`stage 2 voice: beat ${b.index + 1} ${b.take.source} take ${b.take.take} ${b.take.duration}s${b.take.flags.length ? `  (${b.take.flags.length} flag(s))` : ""}${b.take.needsHuman ? "  NEEDS HUMAN" : ""}`);
  }

  // ---- stage 3: timeline
  const tl = buildTimeline(video.beats.map((b, i) => ({ audioDuration: b.take.duration, isEnd: i === video.beats.length - 1 })), { fps, gap, endHold: endHoldMin });
  video.beats.forEach((b, i) => Object.assign(b, { start: tl.beats[i].start, duration: tl.beats[i].duration }));
  console.error(`stage 3 timeline: ${tl.total}s, end screen ${tl.beats.at(-1).duration}s`);

  // ---- stage 4: captions (clean text only)
  const cues = [];
  for (const b of video.beats) {
    const text = b.caption ?? b.clean;
    const cards = cardTimes(text, splitCards(text, { lexicon, min: config.captions.minWords, max: config.captions.maxWords }), {
      stt: b.caption ? null : b.take.stt,
      duration: b.take.duration,
      lexicon,
    });
    for (const c of cards) {
      // An unburned beat (the end screen) still gets SRT cues, spread over the whole beat.
      const scale = b.captions ? 1 : b.duration / b.take.duration;
      cues.push({ n: cues.length + 1, beat: b.index, burned: b.captions, text: c.text, words: c.words, units: c.units, timed: c.timed, from: r3(b.start + c.from * scale), to: r3(b.start + c.to * scale) });
    }
  }
  const burned = cues.filter((c) => c.burned);
  const srt = toSrt(cues);

  // ---- audio track (shared by all aspects)
  const audio = path.join(work, "audio.wav");
  ffmpeg(audioArgs({ takes: video.beats.map((b) => ({ file: b.take.file, duration: b.duration })), out: audio, loudnorm }));

  // ---- stages 4-7 per aspect
  const fonts = fontFaceCss(config.brand, ROOT);
  const browser = await launchBrowser();
  const chromeVersion = await browser.version();
  const results = [];
  try {
    const page = await browser.newPage();
    for (const a of aspects) {
      const aspect = config.aspects[a];
      const dims = { width: aspect.width, height: aspect.height };
      const adir = path.join(work, a);
      const page_ = { aspect, brand: config.brand, fonts };
      const measures = [];
      const segments = [];
      for (const b of video.beats) {
        if (b.visual.type === "endScreen") {
          const png = path.join(adir, "end-screen.png");
          const m = await shoot(page, { html: endScreenPage({ ...page_, endScreen: video.endScreen }), png, ...dims, fontFamily: config.brand.fontFamily });
          measures.push({ what: "end-screen", ...m });
          segments.push({ file: png, duration: b.duration, placeholder: false });
        } else if (b.visual.src) {
          const src = path.resolve(ROOT, b.visual.src);
          if (!existsSync(src)) throw new Error(`beats[${b.index}].visual.src not found: ${b.visual.src}`);
          segments.push({ file: src, duration: b.duration, crop: b.visual.crop?.[a] ?? null, placeholder: false });
        } else {
          const png = path.join(adir, `bg-${String(b.index + 1).padStart(2, "0")}.png`);
          await shoot(page, { html: placeholderPage({ ...page_, beat: b }), png, ...dims });
          segments.push({ file: png, duration: b.duration, placeholder: true });
        }
      }
      const caps = [];
      for (const c of burned) {
        const png = path.join(adir, `cap-${String(c.n).padStart(2, "0")}.png`);
        const m = await shoot(page, { html: captionPage({ ...page_, card: c }), png, ...dims, transparent: true, fontFamily: config.brand.fontFamily });
        measures.push({ what: `card ${c.n}`, ...m });
        caps.push({ png, from: c.from, to: c.to });
      }
      const base = outputBase(video, a);
      const mp4 = path.join(outDir, `${base}.mp4`);
      ffmpeg(composeArgs({ ...dims, fps, crf, segments, captions: caps, audio, total: tl.total, out: mp4 }));
      writeFileSync(path.join(outDir, `${base}.srt`), srt);

      // ---- stage 7: checks
      const probe = ffprobe(mp4);
      const failures = probeProblems(probe, { ...dims, fps, total: tl.total, slotSeconds: video.slotSeconds, endHold: tl.beats.at(-1).duration, endHoldMin });
      for (const m of measures) {
        if (m.withinSafe === false) failures.push(`${m.what}: outside the ${a} safe zone`);
        if (m.rtlOrderOk === false) failures.push(`${m.what}: units are not in reading order`);
      }
      const warnings = [];
      if (measures.some((m) => m.fontLoaded === false)) warnings.push(`brand font ${config.brand.fontFamily} did not load; a fallback font was used`);
      const fdir = path.join(outDir, "frames", `v${video.version}`, a);
      const frames = [];
      for (const c of burned) {
        const png = path.join(fdir, `card-${String(c.n).padStart(2, "0")}.png`);
        extractFrame(mp4, (c.from + c.to) / 2, png);
        frames.push({ card: c.n, at: r3((c.from + c.to) / 2), file: rel(png), sha256: sha256File(png) });
      }
      const endPng = path.join(fdir, "end-screen.png");
      extractFrame(mp4, tl.total - Math.min(1, tl.beats.at(-1).duration / 2), endPng);
      frames.push({ card: "end-screen", file: rel(endPng), sha256: sha256File(endPng) });
      const unburned = cues.filter((c) => !c.burned);
      if (unburned.length) {
        const png = path.join(fdir, "bidi-proof-unburned-cards.png");
        await shoot(page, { html: proofPage({ ...page_, cards: unburned }), png, ...dims });
        frames.push({ card: "bidi-proof (SRT-only cards, not in the video)", file: rel(png), sha256: sha256File(png) });
      }

      const blockers = [
        ...releaseBlockers(video),
        ...video.beats.filter((b) => b.take.needsHuman).map((b) => `beats[${b.index}] take needs a human listen`),
        ...video.beats.filter((b) => b.take.source !== "voice-check-picked").map((b) => `beats[${b.index}] take did not go through voice-check (${b.take.check})`),
      ];
      for (const b of video.beats) for (const f of b.take.flags) warnings.push(`beats[${b.index}] take flag: ${f.type} ${f.kind ?? ""} "${f.label ?? ""}" ${f.verdict ? `verdict=${f.verdict} conf=${f.confidence}` : ""}`.trim());
      const manifest = {
        id: video.id,
        product: video.product,
        aspect: a,
        version: video.version,
        file: rel(mp4),
        sha256: sha256File(mp4),
        bytes: probe.bytes,
        srt: { file: rel(path.join(outDir, `${base}.srt`)), sha256: sha256File(path.join(outDir, `${base}.srt`)) },
        generatedAt: new Date().toISOString(),
        script: { hash, approval, source: spec.source ?? null },
        price: { constant: price.amount, currency: price.currency, pageChecked: price.pageChecked },
        checks: { pass: failures.length === 0, failures, warnings, ffprobe: probe, expected: { ...dims, fps, duration: tl.total, slotSeconds: video.slotSeconds, endScreenHold: tl.beats.at(-1).duration } },
        releasable: failures.length === 0 && blockers.length === 0,
        releaseBlockers: blockers,
        endScreen: video.endScreen,
        timeline: video.beats.map((b, i) => ({
          beat: i + 1,
          lineId: b.lineId,
          start: b.start,
          duration: b.duration,
          clean: b.clean,
          visual: { type: b.visual.type, src: b.visual.src ?? null, placeholder: segments[i].placeholder, file: rel(segments[i].file) },
          take: { source: b.take.source, file: rel(b.take.file), sha256: sha256File(b.take.file), take: b.take.take, duration: b.take.duration, check: b.take.check, needsHuman: b.take.needsHuman, flags: b.take.flags },
        })),
        captions: cues.map((c) => ({ n: c.n, beat: c.beat + 1, from: c.from, to: c.to, text: c.text, words: c.words, burned: c.burned, timed: c.timed })),
        domChecks: measures,
        frames,
        tts: { spentThisRun: spent },
        inputs: Object.fromEntries(
          [o.spec, o.config, DEFAULT_LEXICON_PATH, APPROVED_HASHES, ...(spec.source ? [path.resolve(ROOT, spec.source.file)] : [])].map((f) => [rel(f), sha256File(f)]),
        ),
        tools: { ffmpeg: toolVersion("ffmpeg", ["-version"]), chrome: chromeVersion, node: process.version },
      };
      writeFileSync(path.join(outDir, `${base}.manifest.json`), JSON.stringify(manifest, null, 2) + "\n");
      results.push({ a, mp4, probe, failures, warnings, blockers, frames: frames.length });
      console.error(`stage 6-7 ${a}: ${rel(mp4)}  ${probe.video.width}x${probe.video.height}  ${probe.duration}s  ${failures.length ? "CHECKS FAILED" : "checks ok"}`);
    }
  } finally {
    await browser.close();
  }

  for (const r of results) {
    for (const f of r.failures) console.error(`FAIL ${r.a}: ${f}`);
  }
  const first = results[0];
  for (const w of first.warnings) console.error(`WARN: ${w}`);
  for (const b of first.blockers) console.error(`NOT RELEASABLE: ${b}`);
  console.log(`tts spent this run: ${spent.requests} request(s), ${spent.chars} chars`);
  console.log(`outputs: ${rel(outDir)}/`);
  if (results.some((r) => r.failures.length)) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href)
  main().catch((e) => {
    console.error(e.stack ?? e.message);
    process.exit(1);
  });
