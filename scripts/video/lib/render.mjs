// Headless Chrome screenshots (puppeteer). HTML is written to disk and opened by
// file URL so local fonts load. Also measures each caption in the DOM: reading
// order (right to left), fit inside the safe zone, and whether the brand font loaded.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHROME_FALLBACKS = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];

export async function launchBrowser() {
  const { default: puppeteer } = await import("puppeteer");
  const args = ["--no-sandbox", "--allow-file-access-from-files", "--font-render-hinting=none", "--force-color-profile=srgb"];
  const candidates = [process.env.CHROME_PATH, undefined, ...CHROME_FALLBACKS].filter((p, i) => i === 1 || (p && existsSync(p)));
  let last;
  for (const executablePath of candidates) {
    try {
      return await puppeteer.launch({ headless: true, args, ...(executablePath ? { executablePath } : {}) });
    } catch (e) {
      last = e;
    }
  }
  throw new Error(`no usable Chrome for puppeteer: ${last?.message}`);
}

/**
 * Write html beside the png, open it, screenshot at the exact frame size.
 * Returns DOM measurements for caption / end-screen pages (null fields when absent).
 */
export async function shoot(page, { html, png, width, height, transparent = false, fontFamily = null }) {
  mkdirSync(path.dirname(png), { recursive: true });
  const htmlFile = png.replace(/\.png$/, ".html");
  writeFileSync(htmlFile, html);
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
  const measure = await page.evaluate(async (family) => {
    await document.fonts.ready;
    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    const safe = document.querySelector(".safe");
    const box = document.querySelector("#cap, #end");
    const out = { fontLoaded: family ? [...document.fonts].some((f) => f.family.replace(/["']/g, "") === family && f.status === "loaded") : null, withinSafe: null, rtlOrderOk: null, lines: null };
    if (safe && box) {
      const s = r(safe);
      const kids = box.id === "end" ? [...box.children].map(r) : [r(box)];
      out.withinSafe = kids.every((b) => b.left >= s.left - 0.5 && b.right <= s.right + 0.5 && b.top >= s.top - 0.5 && b.bottom <= s.bottom + 0.5);
    }
    const cap = document.querySelector("#cap");
    if (cap) {
      const us = [...cap.querySelectorAll(":scope > .u")].map(r);
      const tops = [...new Set(us.map((b) => Math.round(b.top)))];
      out.lines = tops.length;
      // On each line, units must run right to left in logical order (left to right for an all-Latin card).
      const rtl = cap.getAttribute("dir") === "rtl";
      out.rtlOrderOk = us.every((b, i) => i === 0 || Math.round(b.top) !== Math.round(us[i - 1].top) || (rtl ? b.right <= us[i - 1].left + 0.5 : b.left >= us[i - 1].right - 0.5));
    }
    return out;
  }, fontFamily);
  await page.screenshot({ path: png, omitBackground: transparent, clip: { x: 0, y: 0, width, height } });
  return measure;
}
