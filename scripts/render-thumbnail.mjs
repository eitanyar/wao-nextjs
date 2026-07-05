import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node render-thumbnail.mjs <html-path> <out-png-path>
// Falls back to the original L2-1/website-lesson-3 defaults if no args given.
const [, , htmlArg, outArg] = process.argv;
const htmlPath = htmlArg
  ? path.resolve(htmlArg)
  : path.resolve(__dirname, '../scratch/l2-1-thumbnail.html');
const outPath = outArg
  ? path.resolve(outArg)
  : path.resolve(__dirname, '../public/media/thumbnails/website-lesson-3.png');

const browser = await puppeteer.launch({
  executablePath: '/home/eitanya/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });

await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });

// Guard against a headless-Chrome timing race where screenshot() can fire
// before the first paint/compositor pass completes, yielding a blank capture.
// Force a couple of animation-frame ticks so layout+paint have settled.
await new Promise((resolve) => setTimeout(resolve, 500));

await page.screenshot({ path: outPath });

await browser.close();
console.log(`Thumbnail rendered: ${outPath}`);
