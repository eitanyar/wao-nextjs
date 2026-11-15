// Captures real phone screenshots of a live Site Bot site for /site-bot (design review #5) and encodes them for the web.
// Crops above the first rating / review-count / trust element (Adam: no rating shown as real) and hides the fixed call bar.
// HEBREW-SAFETY: ASCII-only. Re-run: node scripts/build-site-bot-screens.mjs [origin]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
export const ORIGIN = 'https://www.xn--6dblcab6b5bl.net';
export const OUT_DIR = path.join(root, 'public/images/site-bot');
export const SHOTS = [
  { name: 'site-home-phone', path: '/' },
  { name: 'site-services-phone', path: '/services' },
];
const WIDTH = 390;
const MAX_HEIGHT = 760;

export async function capture(origin = ORIGIN) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const out = [];
  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage();
      await page.setViewport({ width: WIDTH, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
      await page.goto(origin + shot.path, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.addStyleTag({ content: '[data-action-bar],.bar,.bar-spacer{display:none!important}' });
      const cut = await page.evaluate(() => {
        const ys = [...document.querySelectorAll('body *')]
          .filter((e) => e.children.length === 0 && /★|\d\.\d/.test(e.textContent || ''))
          .map((e) => e.getBoundingClientRect().top + window.scrollY);
        const trust = document.querySelector('[data-section="trust"],[data-section="reviews"],#reviews');
        if (trust) ys.push(trust.getBoundingClientRect().top + window.scrollY);
        return Math.min(...ys, 10_000);
      });
      const height = Math.min(Math.floor(cut) - 1, MAX_HEIGHT);
      const png = await page.screenshot({ clip: { x: 0, y: 0, width: WIDTH, height } });
      await page.close();
      for (const ext of ['avif', 'webp']) {
        let img = sharp(png).resize(WIDTH * 2);
        img = ext === 'avif' ? img.avif({ quality: 60, effort: 6 }) : img.webp({ quality: 82, effort: 6 });
        const buf = await img.toBuffer();
        fs.writeFileSync(path.join(OUT_DIR, `${shot.name}.${ext}`), buf);
        out.push({ file: `${shot.name}.${ext}`, bytes: buf.length, width: WIDTH * 2, height: height * 2 });
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  for (const r of await capture(process.argv[2] || ORIGIN)) console.log(`${r.file}\t${r.bytes}\t${r.width}x${r.height}`);
}
