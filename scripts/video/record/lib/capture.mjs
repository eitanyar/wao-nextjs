// Frame-stepped screen capture: one screenshot per output frame, piped to ffmpeg.
// Also the network policy: the page may talk only to the local servers, API calls
// are answered from the seed or blocked, and nothing leaves the machine except
// read-only font files.
// HEBREW-SAFETY: this module contains ZERO Hebrew bytes.

import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { FPS, RING_PX, frameSize, holdFrames, ringFrames, scrollFrames, typeFrames, graphemes } from "./motion.mjs";

export const STATIC_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
const LOOPBACK = new Set(["127.0.0.1", "localhost", "[::1]"]);
const MOBILE_UA = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36";

/** The app under recording must be a local server. A production or staging host is refused. */
export function assertLocalBase(url) {
  const u = new URL(url);
  if (u.protocol !== "http:" || !LOOPBACK.has(u.hostname)) throw new Error(`recorder runs against a local dev server only, got ${u.origin}`);
  return u.origin;
}

/**
 * policy = { localOrigins: [origin], mocks: [{ method, pathname, body }], silence: [{ pathname, why }], staticHosts }
 * -> { action: "mock" | "allow" | "block", mock?, reason?, silenced? }
 * `silence` lists API calls that are blocked on purpose (for example the exit pop-up's status call).
 */
export function classifyRequest({ url, method }, policy) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return { action: "block", reason: "unparseable url" };
  }
  if (["data:", "blob:", "about:"].includes(u.protocol)) return { action: "allow" };
  if (policy.localOrigins.includes(u.origin)) {
    const mock = (policy.mocks ?? []).find((m) => m.method === method && m.pathname === u.pathname);
    if (mock) return { action: "mock", mock };
    const quiet = (policy.silence ?? []).find((m) => m.pathname === u.pathname);
    if (quiet) return { action: "block", reason: `silenced: ${quiet.why}`, silenced: true };
    if (u.pathname.startsWith("/api/")) return { action: "block", reason: "API call with no seeded reply" };
    if (method !== "GET") return { action: "block", reason: "write request" };
    return { action: "allow" };
  }
  if (u.protocol === "https:" && method === "GET" && (policy.staticHosts ?? STATIC_HOSTS).includes(u.hostname)) return { action: "allow" };
  return { action: "block", reason: "external host" };
}

const INIT_CSS = "html{scroll-behavior:auto!important}nextjs-portal{display:none!important}::-webkit-scrollbar{display:none!important}";

/**
 * Open a page for one clip. Returns the step helpers the shots use.
 * Every helper that shows something writes whole frames; `offRecord` runs steps without frames (a cut).
 */
export async function openShot({ browser, set, outFile, policy, accent, fps = FPS, log = () => {} }) {
  const size = frameSize(set);
  mkdirSync(path.dirname(outFile), { recursive: true });
  const page = await browser.newPage();
  await page.setViewport({ width: set.width, height: set.height, deviceScaleFactor: set.dpr, isMobile: set.isMobile, hasTouch: set.isMobile });
  if (set.isMobile) await page.setUserAgent(MOBILE_UA);
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.evaluateOnNewDocument((css) => {
    const add = () => {
      const s = document.createElement("style");
      s.setAttribute("data-wao-recorder", "");
      s.textContent = css;
      document.documentElement.appendChild(s);
    };
    if (document.documentElement) add();
    else document.addEventListener("readystatechange", add, { once: true });
  }, INIT_CSS);

  const network = { mocked: [], blocked: [], silenced: [], external: [] };
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const verdict = classifyRequest({ url: req.url(), method: req.method() }, policy);
    const label = `${req.method()} ${req.url().split("?")[0]}`;
    if (verdict.action === "mock") {
      network.mocked.push(label);
      return req.respond({ status: 200, contentType: "application/json", headers: { "Cache-Control": "private, no-store" }, body: JSON.stringify(verdict.mock.body) });
    }
    if (verdict.action === "block") {
      network[verdict.silenced ? "silenced" : "blocked"].push(`${label} (${verdict.reason})`);
      return req.abort("blockedbyclient");
    }
    if (!policy.localOrigins.includes(new URL(req.url()).origin) && !/^(data|blob|about):/.test(req.url())) network.external.push(label);
    return req.continue();
  });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e.message ?? e).slice(0, 200)));

  const ff = spawn("ffmpeg", ["-y", "-v", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-",
    "-vf", `scale=${size.width}:${size.height}:flags=lanczos`, "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-pix_fmt", "yuv420p", "-r", String(fps), "-movflags", "+faststart", outFile],
  { stdio: ["pipe", "ignore", "pipe"] });
  let ffErr = "";
  ff.stderr.on("data", (d) => { ffErr += d; });
  const ffDone = new Promise((ok, fail) => ff.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg failed (${code}): ${ffErr.slice(-400)}`)))));
  ffDone.catch(() => {});

  let frames = 0;
  let last = null;
  const marks = [];
  const checks = [];
  const write = async (buf, times = 1) => {
    for (let i = 0; i < times; i++) {
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
      frames++;
    }
  };
  const frame = async () => {
    last = Buffer.from(await page.screenshot({ type: "png", captureBeyondViewport: false, optimizeForSpeed: true }));
    await write(last);
  };

  const ring = (box) => page.evaluate((b, color) => {
    let el = document.getElementById("__wao_ring");
    if (!b) return void el?.remove();
    if (!el) {
      el = document.createElement("div");
      el.id = "__wao_ring";
      el.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;";
      document.documentElement.appendChild(el);
    }
    Object.assign(el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, borderRadius: b.radius, border: `${b.stroke}px solid ${color}`, opacity: String(b.opacity), transform: `scale(${b.scale})` });
  }, box, accent);

  const rect = async (selector) => {
    const r = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, radius: getComputedStyle(el).borderRadius, vw: innerWidth, vh: innerHeight };
    }, selector);
    if (!r) throw new Error(`element not found: ${selector}`);
    return r;
  };
  const inView = (r) => r.w > 0 && r.h > 0 && r.x >= 0 && r.y >= 0 && r.x + r.w <= r.vw + 0.5 && r.y + r.h <= r.vh + 0.5;

  const ctx = {
    page, set, size, fps,
    check(name, ok, detail = "") {
      checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });
      if (!ok) throw new Error(`check failed: ${name}${detail ? ` (${detail})` : ""}`);
    },
    note(name, detail) { checks.push({ name, ok: true, note: true, detail }); },
    mark(name) { marks.push({ name, frame: frames, t: Math.round((frames / fps) * 1000) / 1000 }); },
    async goto(url) {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
      await page.evaluate(() => document.fonts.ready.then(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))));
    },
    async hold(seconds) {
      // Two live frames let late paints settle, the rest repeat the settled frame.
      const n = holdFrames(seconds, fps);
      await frame();
      if (n > 1) { await frame(); await write(last, n - 2); }
    },
    /** target: page Y, or a selector with { offset } px kept above it (default: just under a sticky header). */
    async scrollTo(target, { offset = null, align = "top" } = {}) {
      const { from, to } = await page.evaluate((t, off, al) => {
        const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
        let y = t;
        if (typeof t === "string") {
          const el = document.querySelector(t);
          if (!el) return { from: scrollY, to: null };
          const b = el.getBoundingClientRect();
          const header = [...document.querySelectorAll("header,nav")].filter((h) => ["sticky", "fixed"].includes(getComputedStyle(h).position)).reduce((m, h) => Math.max(m, h.getBoundingClientRect().height), 0);
          const top = off ?? header + 12;
          y = al === "bottom" ? b.bottom + scrollY - innerHeight + 24 : al === "center" ? b.top + scrollY - (innerHeight - b.height) / 2 : b.top + scrollY - top;
        }
        return { from: Math.round(scrollY), to: Math.round(Math.min(max, Math.max(0, y))) };
      }, target, offset, align);
      if (to === null) throw new Error(`scroll target not found: ${target}`);
      for (const y of scrollFrames(from, to, { fps })) {
        await page.evaluate((v) => scrollTo(0, v), y);
        await frame();
      }
    },
    /** A tap: the ring at the element's centre, then (optionally) the real click. */
    async tap(selector, { click = true, navigates = false } = {}) {
      const r = await rect(selector);
      if (!inView(r)) throw new Error(`tap target is not fully on screen: ${selector}`);
      for (const f of ringFrames({ fps })) {
        await ring({ x: r.x + r.w / 2 - RING_PX / 2, y: r.y + r.h / 2 - RING_PX / 2, w: RING_PX, h: RING_PX, radius: "50%", stroke: 3, ...f });
        await frame();
      }
      await ring(null);
      if (!click) return;
      if (navigates) {
        await Promise.all([page.waitForNavigation({ waitUntil: "networkidle2", timeout: 90000 }), page.click(selector)]);
        await page.evaluate(() => document.fonts.ready);
      } else await page.click(selector);
    },
    /** One pulse of a ring around an element. No click (used for the call button: no dialler, no ringing). */
    async pulse(selector, { ms = 600, pad = 8 } = {}) {
      const r = await rect(selector);
      if (!inView(r)) throw new Error(`pulse target is not fully on screen: ${selector}`);
      const n = Math.max(2, Math.round((ms / 1000) * fps));
      for (let i = 0; i < n; i++) {
        const t = (i + 1) / n;
        await ring({ x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad, radius: `calc(${r.radius.split(" ")[0] || "0px"} + ${pad}px)`, stroke: 3, opacity: Math.round(Math.sin(Math.PI * t) * 1000) / 1000, scale: 1 + 0.04 * t });
        await frame();
      }
      await ring(null);
    },
    /** Type into a focused input, a few characters per frame. */
    async type(selector, text, { charsPerSecond = 8 } = {}) {
      await page.$eval(selector, (el) => { el.spellcheck = false; }); // no red squiggle under a name
      await page.focus(selector);
      const chars = graphemes(text);
      let typed = 0;
      for (const upTo of typeFrames(text, { fps, charsPerSecond })) {
        while (typed < upTo) await page.keyboard.sendCharacter(chars[typed++]);
        await frame();
      }
    },
    async offRecord(fn) { await fn(page); },
    /** Tag the smallest visible element whose text contains `text`; returns a selector or null. */
    async findText(text, tag) {
      return page.evaluate((needle, name) => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let best = null;
        for (let el = walker.currentNode; el; el = walker.nextNode()) {
          if (["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) || !el.textContent.includes(needle)) continue;
          const b = el.getBoundingClientRect();
          if (b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== "hidden") best = el;
        }
        if (!best) return null;
        best.setAttribute("data-wao-rec", name);
        return `[data-wao-rec="${name}"]`;
      }, text, tag);
    },
    async poster(file) { if (last) writeFileSync(file, last); },
    async finish() {
      ff.stdin.end();
      await ffDone;
      const fontsFailed = await page.evaluate(() => [...document.fonts].filter((f) => f.status === "error").map((f) => f.family)).catch(() => []);
      await page.close();
      return { frames, marks, checks, network: { mocked: [...new Set(network.mocked)], blocked: [...new Set(network.blocked)], silenced: [...new Set(network.silenced)], external: [...new Set(network.external)] }, pageErrors, fontsFailed: [...new Set(fontsFailed)] };
    },
    async abort() {
      ff.stdin.destroy();
      ff.kill("SIGKILL");
      await page.close().catch(() => {});
    },
  };
  log(`  ${path.basename(outFile)}: ${size.width}x${size.height} @ ${fps}fps`);
  return ctx;
}
