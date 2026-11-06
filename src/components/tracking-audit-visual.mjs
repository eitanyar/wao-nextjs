import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';
import { syntheticMarkup } from './tracking-audit-ui.test.mjs';

const root = process.cwd();
const out = path.join(root, 'qa-screenshots-t_de7b4fd7');
fs.mkdirSync(out, { recursive: true });
const cssDir = path.join(root, '.next/static/chunks');
const css = fs.readdirSync(cssDir).filter((file) => file.endsWith('.css')).map((file) => fs.readFileSync(path.join(cssDir, file), 'utf8')).join('\n');
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
try {
  for (const [surface, mode] of [['review', 'audit'], ['dashboard', 'audit'], ['dashboard', 'mixed'], ['dashboard', 'normal']]) {
    for (const [device, width, height] of [['desktop', 1280, 800], ['mobile', 375, 812]]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.setRequestInterception(true);
      page.on('request', (request) => request.abort());
      const content = syntheticMarkup(surface, mode);
      const html = `<!doctype html><html dir="${surface === 'review' ? 'rtl' : 'ltr'}" lang="${surface === 'review' ? 'he' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}\n:root{--bg:#101727;--surface:#1c2940;--elevated:#24334b;--text:#f7fafc;--foreground:#f7fafc;--muted:#aebbd1;--border:#42536d;--accent:#facc15;--shadow-card:0 8px 24px #0004}body{box-sizing:border-box;background:var(--bg);color:var(--text);margin:0;padding:24px;font-family:Arial,sans-serif}main{max-width:${surface === 'review' ? 672 : 1000}px;margin:0 auto;box-sizing:border-box}</style></head><body><main ${surface === 'review' ? 'dir="rtl" lang="he"' : 'dir="ltr"'}>${content}</main></body></html>`;
      await page.setContent(html);
      const state = await page.evaluate(() => {
        const card = document.querySelector('main > div').getBoundingClientRect();
        const bounds = (element) => {
          const { left, right, top, bottom } = element.getBoundingClientRect();
          return { left, right, top, bottom };
        };
        const auditCard = document.querySelector('main .grid > div[dir="rtl"]');
        const normalCard = document.querySelector('main .grid > div:not([dir="rtl"])');
        const explanation = auditCard?.querySelectorAll('p')[3];
        const textLines = explanation && (() => {
          const range = document.createRange();
          range.selectNodeContents(explanation);
          return [...range.getClientRects()].map(({ left, right, top }) => ({ left, right, top }));
        })();
        return {
          width: document.documentElement.scrollWidth, viewport: innerWidth, cardLeft: card.left, cardRight: card.right,
          buttons: document.querySelectorAll('button').length, forms: document.querySelectorAll('form').length,
          direction: getComputedStyle(document.querySelector('main')).direction, textLength: document.querySelector('main').textContent.length,
          audit: auditCard && { direction: getComputedStyle(auditCard).direction, textAlign: getComputedStyle(auditCard).textAlign, rect: bounds(auditCard), status: bounds(auditCard.querySelector('span')), explanation: bounds(explanation), textLines, tokens: [...auditCard.querySelectorAll('bdi')].map((token) => ({ text: token.textContent, direction: getComputedStyle(token).direction })) },
          normal: normalCard && { direction: getComputedStyle(normalCard).direction, textAlign: getComputedStyle(normalCard).textAlign, rect: bounds(normalCard) },
        };
      });
      const filename = `${surface}-${mode}-${device}.png`;
      await page.screenshot({ path: path.join(out, filename), fullPage: true });
      console.log(`${filename}: ${JSON.stringify(state)}`);
      if (state.width > state.viewport || state.cardLeft < 0 || state.cardRight > state.viewport || (mode === 'audit' && (state.buttons || state.forms))) throw Error(`Invalid synthetic DOM: ${filename}`);
      if (surface === 'dashboard') {
        if (mode !== 'normal' && (!state.audit || state.audit.direction !== 'rtl' || state.audit.textAlign !== 'right' || state.audit.tokens.length !== 4 || state.audit.tokens.some((token) => token.direction !== 'ltr') || state.audit.status.right < state.audit.rect.right - 30 || !state.audit.textLines.length || [...new Set(state.audit.textLines.map((line) => line.top))].some((top) => Math.max(...state.audit.textLines.filter((line) => line.top === top).map((line) => line.right)) < state.audit.rect.right - 30))) throw Error(`Audit RTL alignment failed: ${filename}`);
        if (mode !== 'audit' && (!state.normal || state.normal.direction !== 'ltr' || state.buttons !== 1)) throw Error(`Normal card changed: ${filename}`);
      }
      await page.close();
    }
  }
} finally {
  await browser.close();
}
