// node --test scripts/video/*.test.mjs
// No network (fetch is mocked), no ffmpeg, no browser. Hebrew appears only as
// \u escapes or is loaded from data files.

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasNiqqud } from "../voice/lexicon.mjs";
import { ROOT } from "../voice/lib/io.mjs";
import { baseDir, captionUnits, cardHtml, cardTimes, cleanTextProblems, isolateLtr, splitCards, toSrt } from "./lib/captions.mjs";
import { audioArgs, buildTimeline, composeArgs, outputBase, probeProblems } from "./lib/compose.mjs";
import { captionPage, endScreenPage } from "./lib/pages.mjs";
import { checkPrice, findApproval, priceLineFromText, priceMentions, productPrice, releaseBlockers, resolveVideo, scriptHash, validateVideoSpec } from "./lib/spec.mjs";
import { findPickedTake, generateTake, resolveTake } from "./lib/voice.mjs";
import { validate } from "./build-video.mjs";

// Hebrew fixtures by code point (no meaning needed beyond "some Hebrew words").
const W1 = "\u05E9\u05DC\u05D5\u05DD"; // 4 letters
const W2 = "\u05E2\u05D5\u05DC\u05DD";
const W3 = "\u05D8\u05D5\u05D1";
const W4 = "\u05D9\u05E4\u05D4";
const VAT = "\u05DE\u05E2\u05F4\u05DE"; // abbreviation with gershayim
const PRODUCT = "\u05D1\u05D5\u05D8 \u05D8\u05D5\u05D1"; // two-word product name
const SHEKEL = "\u20AA";
const NIQQUD_WORD = "\u05E9\u05B8\u05DC\u05D5\u05B9\u05DD";

const ASPECT = { width: 1080, height: 1920, safe: { top: 250, right: 180, bottom: 420, left: 60 }, captionFontPx: 76 };
const BRAND = { bg: "#0D1117", accent: "#4AE3B5", text: "#F2F5F9", muted: "#9AA7B5", wordmark: "WAO", fontFamily: "Rubik", fontFallback: "sans-serif" };
const LEXICON = { defaultVoice: { voiceId: "v1", model: "m1" }, entries: [{ id: "prod", clean: PRODUCT, match: [PRODUCT], tts: PRODUCT, status: "approved", allowPrefixes: false }] };
const CONFIG = {
  products: { "ads-bot": { price: { amount: 249, currency: "ILS" }, pageSource: null, nameLexiconId: "prod", url: "wao.co.il/x", stampText: "STAMP_TEXT_PENDING", ctaText: "CTA_TEXT_PENDING" } },
  aspects: { "9x16": ASPECT },
};
const END_LINE = `WAO. ${PRODUCT}: 249 ${SHEKEL} + ${VAT} ${W1}.`;

function spec(over = {}) {
  return {
    schema: "wao.video/1",
    id: "t-1",
    product: "ads-bot",
    slotSeconds: 30,
    version: 1,
    lang: "he",
    beats: [
      { text: `${W1} ${W2}. ${W3} ${W4}.`, voice: `[calm] ${W1} ${W2}. ${W3} ${W4}.`, visual: { type: "illustration" } },
      { text: END_LINE, voice: `[excited] WAO! ${PRODUCT}.`, visual: { type: "endScreen" }, captions: false },
    ],
    endScreen: { price: 249, holdSeconds: 3 },
    ...over,
  };
}
const resolve = (s, config = CONFIG) => resolveVideo(s, { root: "/nonexistent", config, lexicon: LEXICON });

// ---------------------------------------------------------------- stage 1

test("schema: a valid spec passes", () => {
  assert.deepEqual(validateVideoSpec(spec(), { aspects: ["9x16"] }), []);
});

test("schema: rejects bad visual type, misplaced or missing end screen, short hold, line without source", () => {
  const bad = (s) => validateVideoSpec(s).join("\n");
  assert.match(bad(spec({ beats: [{ text: W1, voice: W1, visual: { type: "hologram" } }, spec().beats[1]] })), /visual\.type must be one of/);
  assert.match(bad(spec({ beats: [spec().beats[1], spec().beats[0]] })), /only the last beat may be the endScreen/);
  assert.match(bad(spec({ beats: [spec().beats[0]] })), /last beat must have visual\.type "endScreen"/);
  assert.match(bad(spec({ endScreen: { price: 249, holdSeconds: 2 } })), /holdSeconds must be >= 3/);
  assert.match(bad(spec({ endScreen: undefined })), /endScreen block is required/);
  assert.match(bad(spec({ beats: [{ line: 0, visual: { type: "card" } }, spec().beats[1]] })), /needs a top-level "source"/);
  assert.match(bad(spec({ beats: [{ ...spec().beats[0], visual: { type: "screen", crop: { "9x16": { x: 0, y: 0, w: 0, h: 10 } } } }, spec().beats[1]] })), /crop/);
});

test("price: refuses when the end-screen price or any spoken/shown price differs from the constant", () => {
  const ok = resolve(spec());
  assert.deepEqual(ok.errors, []);
  assert.deepEqual(checkPrice(ok.video, 249), []);
  assert.match(checkPrice(resolve(spec({ endScreen: { price: 199, holdSeconds: 3 } })).video, 249).join(), /endScreen\.price 199 != price constant 249/);
  const wrongCopy = spec();
  wrongCopy.beats[1].text = `WAO. ${PRODUCT}: ${SHEKEL}199 + ${VAT}.`;
  assert.match(checkPrice(resolve(wrongCopy).video, 249).join(), /mentions 199, price constant is 249/);
});

test("price: the constant is cross-checked against the page source when configured", () => {
  const cfg = { products: { p: { price: { amount: 199 }, pageSource: { file: "plans.ts", pattern: "netAmount:\\s*(\\d+)" } } } };
  assert.deepEqual(productPrice(cfg, "p", { root: "/", readText: () => "netAmount: 199," }).errors, []);
  assert.match(productPrice(cfg, "p", { root: "/", readText: () => "netAmount: 249," }).errors.join(), /config says 199 but plans\.ts says 249/);
  assert.throws(() => productPrice(cfg, "nope", { root: "/" }), /not in data\/video\/config\.json/);
});

test("price: mentions are found with the sign on either side; the end-screen line is cut from the clean copy", () => {
  assert.deepEqual(priceMentions(`${SHEKEL}199 ${W1} 249 ${SHEKEL}`).map((m) => m.amount), [199, 249]);
  assert.equal(priceLineFromText(END_LINE, 249), `249 ${SHEKEL} + ${VAT} ${W1}`);
  assert.equal(priceLineFromText(`${W1} ${W2}.`, 249), null);
});

test("hash: any copy change changes the hash; only listed hashes are approved", () => {
  const a = resolve(spec()).video;
  const edited = spec();
  edited.beats[0].text = `${W1} ${W2}. ${W3} ${W3}.`;
  const h = scriptHash(a);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, scriptHash(resolve(edited).video));
  const stamped = structuredClone(CONFIG);
  stamped.products["ads-bot"].stampText = "FINAL";
  assert.notEqual(h, scriptHash(resolve(spec(), stamped).video));
  assert.equal(findApproval({ approved: [{ hash: h, id: "t-1" }] }, h, "t-1").hash, h);
  assert.equal(findApproval({ approved: [{ hash: h, id: "other" }] }, h, "t-1"), null);
  assert.equal(findApproval({ approved: [] }, h, "t-1"), null);
});

test("validate(): refuses an unapproved script, accepts it once its hash is listed", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "wao-video-"));
  const f = (name, obj) => {
    const p = path.join(dir, name);
    writeFileSync(p, JSON.stringify(obj));
    return p;
  };
  const args = { specFile: f("v.json", spec()), configFile: f("c.json", CONFIG), lexiconFile: f("l.json", LEXICON), approvedFile: f("a.json", { approved: [] }), root: dir };
  const refused = validate(args);
  assert.match(refused.errors.join(), /script hash [0-9a-f]{64} is not in/);
  f("a.json", { approved: [{ hash: refused.hash, id: "t-1" }] });
  assert.deepEqual(validate(args).errors, []);
});

test("the Dash A1 spec in the repo validates: schema, price constant, approved hash", { skip: !existsSync(path.join(ROOT, "docs/copy/video-dash-scripts-r4-final-candidate-2026-11-12.json")) }, () => {
  const v = validate({ specFile: path.join(ROOT, "scripts/video/specs/dash-a1-30s.video.json") });
  assert.deepEqual(v.errors, []);
  assert.equal(v.price.amount, 249);
  for (const b of v.video.beats) assert.equal(hasNiqqud(b.clean), false);
});

test("release blockers: pending end-screen copy and placeholder visuals are reported", () => {
  const b = releaseBlockers(resolve(spec()).video).join("\n");
  assert.match(b, /stampText is a placeholder \(STAMP_TEXT_PENDING\)/);
  assert.match(b, /ctaText is a placeholder/);
  assert.match(b, /beats\[0\] uses a placeholder visual/);
});

// ---------------------------------------------------------------- captions

test("clean text: niqqud, audio tags and ASCII quotes are refused", () => {
  assert.deepEqual(cleanTextProblems(`${W1} ${VAT} 249 ${SHEKEL}.`), []);
  assert.match(cleanTextProblems(NIQQUD_WORD).join(), /niqqud/);
  assert.match(cleanTextProblems(`[calm] ${W1}`).join(), /audio tag/);
  assert.match(cleanTextProblems(`\u05DE\u05E2"\u05DE`).join(), /ASCII quote/);
  const s = spec();
  s.beats[0].text = `${NIQQUD_WORD} ${W2}.`;
  assert.match(resolve(s).errors.join(), /beats\[0\] clean text: niqqud/);
});

test("cards: 2-4 words, breaks at sentence ends, text is preserved exactly", () => {
  const line = `${W1} ${W2} ${W3} ${W4}. ${W1} ${W2}.`;
  const cards = splitCards(line);
  assert.deepEqual(cards.map((c) => c.words), [4, 2]);
  assert.equal(cards.map((c) => c.text).join(" "), line);
  assert.deepEqual(splitCards(`${W1}. ${W2} ${W3}. ${W4} ${W1}.`).map((c) => c.words), [3, 2]);
  assert.deepEqual(splitCards(W1).map((c) => c.words), [1]); // a one-word line cannot be padded
});

test("cards: a price run and a lexicon product name are never split", () => {
  const units = captionUnits(END_LINE, LEXICON).map((u) => u.text);
  assert.deepEqual(units, ["WAO.", `${PRODUCT}:`, `249 ${SHEKEL} + ${VAT}`, `${W1}.`]);
  const cards = splitCards(END_LINE, { lexicon: LEXICON });
  assert.deepEqual(cards.map((c) => c.text), [`WAO. ${PRODUCT}:`, `249 ${SHEKEL} + ${VAT} ${W1}.`]);
  assert.deepEqual(captionUnits(`${W1} Site Bot ${W2}`).map((u) => u.text), [W1, "Site Bot", W2]);
});

test("cards: every line of the approved Dash scripts splits into 2-4 word cards with no niqqud", { skip: !existsSync(path.join(ROOT, "docs/copy/video-dash-scripts-r4-final-candidate-2026-11-12.json")) }, () => {
  const doc = JSON.parse(readFileSync(path.join(ROOT, "docs/copy/video-dash-scripts-r4-final-candidate-2026-11-12.json"), "utf8"));
  const lexicon = JSON.parse(readFileSync(path.join(ROOT, "data/voice/pronunciation-lexicon.json"), "utf8"));
  let n = 0;
  for (const ep of Object.values(doc.episodes))
    for (const sec of ["script_30", "script_15"])
      for (const l of ep[sec] ?? []) {
        const cards = splitCards(l.display, { lexicon });
        assert.equal(cards.map((c) => c.text).join(" "), l.display);
        for (const c of cards) {
          assert.ok(c.words >= 2 && c.words <= 4, `${c.words} words: ${c.text}`);
          assert.equal(hasNiqqud(c.text), false);
          n++;
        }
      }
  assert.ok(n > 50);
});

test("timing: card text stays the clean text; the transcript only supplies times", () => {
  const clean = `${W1} ${W2}. ${W3} ${W4}.`;
  const cards = splitCards(clean);
  // The STT "heard" a different spelling for the last word; it must not leak into the caption.
  const stt = { words: [W1, W2, W3, "\u05D9\u05E4\u05D4\u05D4"].map((t, i) => ({ type: "word", text: t, start: 0.5 + i, end: 1.4 + i })) };
  const timed = cardTimes(clean, cards, { stt, duration: 5 });
  assert.deepEqual(timed.map((c) => c.text), [`${W1} ${W2}.`, `${W3} ${W4}.`]);
  assert.deepEqual(timed.map((c) => [c.from, c.to]), [[0, 2.5], [2.5, 5]]);
  const guessed = cardTimes(clean, cards, { stt: null, duration: 5 });
  assert.equal(guessed[0].from, 0);
  assert.equal(guessed[1].to, 5);
  assert.ok(guessed[1].from > 0 && guessed[1].from < 5);
  assert.equal(guessed[0].timed, "interpolated");
});

test("bidi: Latin and number runs are isolated; a detached shekel sign and punctuation stay in the RTL flow", () => {
  assert.equal(isolateLtr(`WAO. ${W1}`), `<bdi dir="ltr">WAO</bdi>. ${W1}`);
  assert.equal(isolateLtr(`${SHEKEL}199 + ${VAT}`), `<bdi dir="ltr">${SHEKEL}199</bdi> + ${VAT}`);
  assert.equal(isolateLtr(`249 ${SHEKEL} + ${VAT}`), `<bdi dir="ltr">249</bdi> ${SHEKEL} + ${VAT}`);
  assert.equal(isolateLtr(`\u05DE-WAO`), `\u05DE-<bdi dir="ltr">WAO</bdi>`);
  assert.equal(isolateLtr(`${W1} Site Bot.`), `${W1} <bdi dir="ltr">Site Bot</bdi>.`);
  assert.equal(isolateLtr(`24/7 WAO`), `<bdi dir="ltr">24/7</bdi> <bdi dir="ltr">WAO</bdi>`);
  assert.equal(isolateLtr("a<b"), `<bdi dir="ltr">a</bdi>&lt;<bdi dir="ltr">b</bdi>`);
  assert.equal(baseDir(`WAO ${W1}`), "rtl");
  assert.equal(baseDir("WAO."), "ltr");
});

test("caption page: dir=rtl, units are no-wrap isolates, no niqqud, no TTS form", () => {
  const card = splitCards(END_LINE, { lexicon: LEXICON })[1];
  assert.equal(cardHtml(card), `<span class="u"><bdi dir="ltr">249</bdi> ${SHEKEL} + ${VAT}</span> <span class="u">${W1}.</span>`);
  const html = captionPage({ aspect: ASPECT, brand: BRAND, fonts: "", card });
  assert.match(html, /<div class="cap" id="cap" dir="rtl">/);
  assert.match(html, /background: transparent/);
  assert.match(html, /\.u \{ white-space: nowrap; unicode-bidi: isolate; \}/);
  assert.equal(hasNiqqud(html), false);
});

test("end screen: price from the constant, product from the lexicon, pending stamp rendered as pending", () => {
  const { video } = resolve(spec());
  assert.equal(video.endScreen.productName, PRODUCT);
  assert.equal(video.endScreen.priceLine, `249 ${SHEKEL} + ${VAT} ${W1}`);
  const html = endScreenPage({ aspect: ASPECT, brand: BRAND, fonts: "", endScreen: video.endScreen });
  assert.match(html, /class="fit stamp pending" dir="ltr"><bdi dir="ltr">STAMP_TEXT_PENDING<\/bdi>/);
  assert.match(html, /class="fit cta pending"/);
  assert.match(html, /<bdi dir="ltr">249<\/bdi>/);
  assert.match(html, /wao\.co\.il\/x/);
  assert.ok(html.includes(PRODUCT));
});

test("srt: numbered cues with comma milliseconds", () => {
  assert.equal(toSrt([{ from: 0, to: 2.8, text: "a" }, { from: 62.033, to: 3661.5, text: "b" }]), "1\n00:00:00,000 --> 00:00:02,800\na\n\n2\n00:01:02,033 --> 01:01:01,500\nb\n");
});

// ---------------------------------------------------------------- voice

function takesFixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "wao-takes-"));
  mkdirSync(path.join(root, "check/takes"), { recursive: true });
  writeFileSync(path.join(root, "check/takes/l0-t1.mp3"), "one");
  writeFileSync(path.join(root, "check/takes/l0-t2.mp3"), "two");
  const takes = [1, 2].map((k) => ({ take: k, file: `check/takes/l0-t${k}.mp3` }));
  const lines = [
    { id: "E.s[0]", tts: `${W1} ${W2}`, audio: { picked: 2, needsHuman: false, takes, flags: [{ type: "pronunciation", label: W1, verdict: "wrong", confidence: 0.9 }] } },
    { id: "E.s[1]", tts: `${W3} ${W4}`, audio: { picked: 1, needsHuman: true, takes, flags: [] } },
  ];
  writeFileSync(path.join(root, "check/lines.json"), JSON.stringify(lines));
  return root;
}
const mockFetch = (calls) => async (url, init) => {
  calls.push({ url, body: JSON.parse(init.body) });
  return { ok: true, arrayBuffer: async () => new TextEncoder().encode("mp3").buffer };
};
const okStt = (text) => async () => ({ words: text.split(" ").map((t, i) => ({ type: "word", text: t, start: i, end: i + 0.5 })) });

test("voice: a picked take is matched by TTS text, with its flags; an edited or human-flagged line is not reused", () => {
  const root = takesFixture();
  const t = findPickedTake(`${W1} ${W2}`, ["check"], { root });
  assert.equal(t.take, 2);
  assert.equal(t.file, path.join(root, "check/takes/l0-t2.mp3"));
  assert.equal(t.flags[0].verdict, "wrong");
  assert.equal(findPickedTake(`${W1} ${W3}`, ["check"], { root }), null); // wording changed since the take
  assert.equal(findPickedTake(`${W3} ${W4}`, ["check"], { root }), null); // needs a human
  assert.equal(findPickedTake(`${W1} ${W2}`, ["missing"], { root }), null);
});

test("voice: no ElevenLabs call when a picked take exists", async () => {
  const root = takesFixture();
  const calls = [];
  const t = await resolveTake(`${W1} ${W2}`, { takesDirs: ["check"], root, voice: LEXICON.defaultVoice, cacheDir: path.join(root, "cache"), allowTts: true, apiKey: () => "k", fetch: mockFetch(calls) });
  assert.equal(t.source, "voice-check-picked");
  assert.deepEqual(t.spent, { requests: 0, chars: 0 });
  assert.equal(calls.length, 0);
});

test("voice: a missing take is refused without --allow-tts, generated once with it, then served from cache", async () => {
  const root = takesFixture();
  const calls = [];
  const text = `${W3} ${W1}`;
  const opts = { takesDirs: ["check"], root, voice: LEXICON.defaultVoice, cacheDir: path.join(root, "cache"), apiKey: () => "k", fetch: mockFetch(calls), stt: okStt(text) };
  await assert.rejects(resolveTake(text, { ...opts, allowTts: false }), /no take exists for this line and --allow-tts was not given/);
  assert.equal(calls.length, 0);
  const made = await resolveTake(text, { ...opts, allowTts: true });
  assert.equal(made.source, "generated");
  assert.deepEqual(made.spent, { requests: 1, chars: text.length });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.elevenlabs\.io\/v1\/text-to-speech\/v1/);
  assert.deepEqual(calls[0].body, { text, model_id: "m1" });
  assert.equal(made.needsHuman, false);
  const again = await resolveTake(text, { ...opts, allowTts: false });
  assert.equal(again.source, "pipeline-cache");
  assert.equal(again.file, made.file);
  assert.equal(calls.length, 1);
});

test("voice: a take that fails the STT diff triggers one more take, and is flagged for a human if both fail", async () => {
  const root = takesFixture();
  const calls = [];
  const t = await generateTake(`${W3} ${W1}`, { voice: LEXICON.defaultVoice, cacheDir: path.join(root, "cache2"), allowTts: true, apiKey: () => "k", fetch: mockFetch(calls), stt: okStt(W3) });
  assert.equal(calls.length, 2);
  assert.equal(t.needsHuman, true);
  assert.equal(t.flags[0].kind, "dropped");
});

// ---------------------------------------------------------------- timeline + compose

test("timeline: beats follow audio length plus gap, on whole frames; end screen held at least 3s", () => {
  const tl = buildTimeline([{ audioDuration: 4.48 }, { audioDuration: 3.2 }, { audioDuration: 2.0, isEnd: true }], { fps: 30, gap: 0.4, endHold: 3 });
  assert.deepEqual(tl.beats.map((b) => b.start), [0, 4.9, 8.5]);
  assert.equal(tl.beats[2].duration, 3);
  assert.equal(tl.total, 11.5);
  const long = buildTimeline([{ audioDuration: 5, isEnd: true }], { fps: 30, gap: 0.4, endHold: 3 });
  assert.equal(long.beats[0].duration, 5.4);
  for (const b of tl.beats) assert.ok(Number.isInteger(b.frames));
});

test("compose: text never goes through ffmpeg; captions are timed PNG overlays; size and codec are set", () => {
  const args = composeArgs({
    width: 1080,
    height: 1920,
    fps: 30,
    segments: [{ file: "bg1.png", duration: 4.9 }, { file: "clip.mp4", duration: 3.6, crop: { x: 10, y: 20, w: 300, h: 400 } }],
    captions: [{ png: "c1.png", from: 0, to: 2.8 }, { png: "c2.png", from: 2.8, to: 4.48 }],
    audio: "a.wav",
    total: 8.5,
    out: "o.mp4",
  });
  const s = args.join(" ");
  assert.equal(/drawtext|subtitles=|ass=/.test(s), false);
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.equal(graph.match(/overlay=0:0:enable=/g).length, 2);
  assert.match(graph, /\[1:v\]crop=300:400:10:20,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
  assert.match(graph, /enable='gte\(t,2\.8\)\*lt\(t,4\.48\)'/);
  assert.match(s, /-stream_loop -1 -t 3\.6 -i clip\.mp4/);
  assert.match(s, /-loop 1 -framerate 30 -t 4\.9 -i bg1\.png/);
  assert.match(s, /-c:v libx264 .*-pix_fmt yuv420p -r 30 .*-t 8\.5 -movflags \+faststart o\.mp4$/);
  assert.equal(/drawtext/.test(audioArgs({ takes: [{ file: "a.mp3", duration: 4.9 }], out: "a.wav" }).join(" ")), false);
});

test("naming and probe checks", () => {
  assert.equal(outputBase({ id: "sitebot-intro", slotSeconds: 90, version: 1 }, "9x16"), "sitebot-intro_90s_9x16_he_v1");
  const exp = { width: 1080, height: 1920, fps: 30, total: 23.333, slotSeconds: 30, endHold: 3.2, endHoldMin: 3 };
  const good = { duration: 23.333333, video: { codec: "h264", width: 1080, height: 1920, pixFmt: "yuv420p", fps: "30/1" }, audio: { codec: "aac" } };
  assert.deepEqual(probeProblems(good, exp), []);
  const bad = probeProblems({ ...good, duration: 31, video: { ...good.video, width: 1920, height: 1080 }, audio: null }, { ...exp, endHold: 2 }).join("\n");
  assert.match(bad, /resolution 1920x1080, expected 1080x1920/);
  assert.match(bad, /no audio stream/);
  assert.match(bad, /exceeds the 30s slot/);
  assert.match(bad, /end screen held 2s, minimum 3s/);
});
