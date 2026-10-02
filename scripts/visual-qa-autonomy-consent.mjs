import puppeteer from 'puppeteer';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { spawn } from 'child_process';
import http from 'http';

const ROOT = resolve(process.cwd());
const ARTIFACTS_DIR = join(ROOT, 'artifacts', 'qa-consent');
mkdirSync(ARTIFACTS_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/api/health`, (res) => {
      resolve(true);
    });
    req.on('error', () => {
      // Also try root
      const req2 = http.get(`http://127.0.0.1:${port}`, (res2) => {
        resolve(true);
      });
      req2.on('error', () => resolve(false));
      req2.setTimeout(1000, () => {
        req2.destroy();
        resolve(false);
      });
    });
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function ensureServer() {
  const isRunning = await checkPort(3000);
  if (isRunning) {
    console.log('Server already running on port 3000');
    return { process: null, port: 3000 };
  }

  console.log('Starting Next dev server on port 3123...');
  const serverProc = spawn('npm', ['run', 'dev', '--', '-p', '3123'], {
    cwd: ROOT,
    stdio: 'pipe',
    env: { ...process.env, PORT: '3123' },
  });

  serverProc.stdout.on('data', (d) => process.stdout.write(`[dev] ${d}`));
  serverProc.stderr.on('data', (d) => process.stderr.write(`[dev-err] ${d}`));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    ready = await checkPort(3123);
    if (ready) break;
  }

  if (!ready) {
    throw new Error('Failed to start Next.js dev server on port 3123');
  }

  return { process: serverProc, port: 3123 };
}

async function runVisualQA() {
  const { process: serverProc, port } = await ensureServer();
  const BASE_URL = `http://127.0.0.1:${port}`;
  console.log(`Testing against ${BASE_URL}...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.log('Navigating to onboarding page...');
    await page.goto(`${BASE_URL}/google-ads/onboarding`, { waitUntil: 'networkidle0', timeout: 45000 });

    // Step 1: Delivery model selection
    console.log('Selecting delivery model...');
    const fieldBtn = await page.waitForSelector('xpath///button[contains(., "עסק שטח") or contains(., "הגעה ללקוח") or contains(., "field")]', { timeout: 10000 }).catch(async () => {
      // Fallback selector
      const btns = await page.$$('button');
      for (const btn of btns) {
        const text = await page.evaluate((el) => el.textContent, btn);
        if (text.includes('הגעה') || text.includes('שטח')) return btn;
      }
      return null;
    });

    if (fieldBtn) {
      await fieldBtn.click();
      await sleep(600);
    }

    // Persona answers to reach REVIEWING state
    const personaAnswers = [
      'אינסטלטור בתל אביב',
      'אינסטלציה בר-און',
      'אורי',
      'דודי שמש וביוב',
      'תל אביב, רמת גן, גבעתיים',
      'נזילה בלילה מתחת לכיור',
      'כמה עולה ומתי מגיע',
      'אמין ומגיע תוך שעה',
      '14 שנה בתחום',
      'רישיון אינסטלטור מוסמך',
      'לא עבודות עפר',
      'להגיע מהר ולעשות עבודה נקייה',
      'דחוף, כאן ועכשיו',
      'הצעת מחיר חינם',
      'עבודות חד פעמיות וקצת חוזי תחזוקה',
      '450 שקל',
      '7 מתוך 10',
      'כן, חוזרים וממליצים',
      '4.8 כוכבים, 42 ביקורות בגוגל',
      '2000 שקל בחודש',
      'יאללה נתחיל',
      'ביקורת מעולה בגוגל: שירות מהיר ומקצועי',
      '5 עבודות בשבוע',
      'טלפון וואטסאפ',
      '052-614-8860',
    ];

    console.log('Driving onboarding conversational turns...');
    const inputSel = 'input[type="text"][aria-describedby="onboarding-input-helper"]';

    for (let i = 0; i < personaAnswers.length; i++) {
      const ans = personaAnswers[i];
      try {
        await page.waitForSelector(inputSel, { timeout: 6000 });
        await page.click(inputSel);
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.value = '';
        }, inputSel);
        await page.type(inputSel, ans, { delay: 5 });

        // Click send button
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const sendBtn = btns.find((b) => b.textContent.includes('שלח') || b.textContent.includes('המשך') || b.textContent.includes('רוץ עם זה'));
          if (sendBtn) sendBtn.click();
        });

        await sleep(500);

        // Check if reviewing state reached early
        const isReviewing = await page.evaluate(() => {
          return document.body.textContent.includes('דמי הקמה חד-פעמיים') && document.body.textContent.includes('אני מאשר לסוכן האוטונומי');
        });

        if (isReviewing) {
          console.log(`Reached REVIEWING state at turn ${i + 1}`);
          break;
        }
      } catch (err) {
        console.log(`Turn ${i + 1} note:`, err.message);
      }
    }

    // Wait a bit for LP preview and reviewing state settle
    await sleep(2000);

    // Verify reviewing state in DOM
    const stateData = await page.evaluate(() => {
      const consentInputs = Array.from(document.querySelectorAll('input[type="checkbox"][aria-describedby="autonomy-consent-summary"]'));
      const summaries = Array.from(document.querySelectorAll('#autonomy-consent-summary'));
      const termsVersions = Array.from(document.querySelectorAll('[data-autonomy-terms-version]')).map(el => el.getAttribute('data-autonomy-terms-version'));
      
      const badgeText = document.querySelector('p span')?.textContent?.trim() || '';
      const modeText = document.body.innerText.includes('אתה במצב בדיקה פנימי') ? 'אתה במצב בדיקה פנימי' : '';

      return {
        consentCount: consentInputs.length,
        termsVersions,
        badgeText,
        modeText,
        summaries: summaries.map(s => ({
          text: s.innerText,
          dir: window.getComputedStyle(s).direction,
          textAlign: window.getComputedStyle(s).textAlign,
          scrollWidth: s.scrollWidth,
          clientWidth: s.clientWidth,
          hasOverflow: s.scrollWidth > s.clientWidth + 2,
        })),
        checkboxChecked: consentInputs.map(c => c.checked),
      };
    });

    console.log('DOM State Data:', JSON.stringify(stateData, null, 2));

    // Capture Desktop Screenshots
    console.log('Capturing Desktop Screenshots (1280x900)...');
    const desktopFull = join(ARTIFACTS_DIR, 'desktop-full-reviewing.png');
    await page.screenshot({ path: desktopFull, fullPage: true });

    // Clip / element screenshots
    const chatConsentHandle = await page.$('div[style*="linear-gradient(135deg, rgba(74,227,181,0.10)"]');
    let desktopInlinePath = join(ARTIFACTS_DIR, 'desktop-chat-inline-consent.png');
    if (chatConsentHandle) {
      await chatConsentHandle.screenshot({ path: desktopInlinePath });
    }

    const sideConsentHandle = await page.$('div[style*="rgba(13, 15, 21, 0.4)"][style*="padding: 20px"]');
    let desktopSidePath = join(ARTIFACTS_DIR, 'desktop-sidebar-consent.png');
    if (sideConsentHandle) {
      await sideConsentHandle.screenshot({ path: desktopSidePath });
    }

    // Toggle checkbox and capture checked state
    console.log('Toggling consent checkbox on desktop...');
    const firstCheckbox = await page.$('input[type="checkbox"][aria-describedby="autonomy-consent-summary"]');
    if (firstCheckbox) {
      await firstCheckbox.click();
      await sleep(300);
      const desktopCheckedPath = join(ARTIFACTS_DIR, 'desktop-consent-checked.png');
      await page.screenshot({ path: desktopCheckedPath, fullPage: false });
    }

    // Capture Responsive / Mobile Screenshots (390x844)
    console.log('Capturing Mobile / Narrow Responsive Screenshots (390x844)...');
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await sleep(500);

    const mobileFull = join(ARTIFACTS_DIR, 'mobile-full-reviewing.png');
    await page.screenshot({ path: mobileFull, fullPage: true });

    const mobileStateData = await page.evaluate(() => {
      const summaries = Array.from(document.querySelectorAll('#autonomy-consent-summary'));
      return summaries.map(s => ({
        scrollWidth: s.scrollWidth,
        clientWidth: s.clientWidth,
        hasOverflow: s.scrollWidth > s.clientWidth + 2,
      }));
    });

    console.log('Mobile Overflow Check:', JSON.stringify(mobileStateData, null, 2));

    const resultReport = {
      timestamp: new Date().toISOString(),
      baseUrl: BASE_URL,
      stateData,
      mobileStateData,
      screenshots: {
        desktopFull,
        desktopInlinePath,
        desktopSidePath,
        desktopCheckedPath: join(ARTIFACTS_DIR, 'desktop-consent-checked.png'),
        mobileFull,
      },
    };

    writeFileSync(join(ARTIFACTS_DIR, 'qa-results.json'), JSON.stringify(resultReport, null, 2));
    console.log('Visual QA completed successfully. Results saved in:', ARTIFACTS_DIR);
  } finally {
    await browser.close();
    if (serverProc) {
      console.log('Stopping test dev server...');
      serverProc.kill();
    }
  }
}

runVisualQA().catch((err) => {
  console.error('Visual QA run failed:', err);
  process.exit(1);
});
