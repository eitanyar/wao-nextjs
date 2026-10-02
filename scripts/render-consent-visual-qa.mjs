import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const ROOT = resolve(process.cwd());
const ARTIFACTS_DIR = join(ROOT, 'artifacts', 'qa-consent');
mkdirSync(ARTIFACTS_DIR, { recursive: true });

const css = readFileSync(join(ROOT, 'src', 'app', 'globals.css'), 'utf8');
const copyModule = readFileSync(join(ROOT, 'src', 'lib', 'google-ads', 'autonomyCopy.ts'), 'utf8');

// Extract copy strings from autonomyCopy.ts
const TERMS_VERSION = copyModule.match(/AUTONOMY_TERMS_VERSION = "([^"]+)"/)?.[1] || '';
const copyObj = {
  AUTONOMY_CONSENT_LABEL: copyModule.match(/"AUTONOMY_CONSENT_LABEL":\s*"([^"]+)"/)?.[1] || '',
  AUTONOMY_SCOPE_SUMMARY: copyModule.match(/"AUTONOMY_SCOPE_SUMMARY":\s*"([^"]+)"/)?.[1] || '',
  AUTONOMY_LIMITS_SUMMARY: copyModule.match(/"AUTONOMY_LIMITS_SUMMARY":\s*"([^"]+)"/)?.[1] || '',
  AUTONOMY_STOP_SUMMARY: copyModule.match(/"AUTONOMY_STOP_SUMMARY":\s*"([^"]+)"/)?.[1] || '',
  AUTONOMY_AUDIT_SUMMARY: copyModule.match(/"AUTONOMY_AUDIT_SUMMARY":\s*"([^"]+)"/)?.[1] || '',
};

function renderAutonomyConsent({ checked = false, compact = false }) {
  return `
    <label style="display: flex; align-items: flex-start; gap: 10px; cursor: pointer;">
      <input
        type="checkbox"
        ${checked ? 'checked' : ''}
        aria-describedby="autonomy-consent-summary"
        style="margin-top: ${compact ? '3px' : '4px'}; accent-color: var(--accent); width: 16px; height: 16px; flex-shrink: 0;"
      />
      <span id="autonomy-consent-summary" style="font-size: ${compact ? '0.82rem' : '0.85rem'}; color: var(--muted); line-height: 1.4; direction: rtl;">
        <strong>${copyObj.AUTONOMY_CONSENT_LABEL}</strong>
        <span style="display: block; margin-top: 6px;">${copyObj.AUTONOMY_SCOPE_SUMMARY}</span>
        ${!compact ? `<span style="display: block; margin-top: 6px;">${copyObj.AUTONOMY_LIMITS_SUMMARY}</span>` : ''}
        <span style="display: block; margin-top: 6px;">${copyObj.AUTONOMY_STOP_SUMMARY}</span>
        ${!compact ? `<span style="display: block; margin-top: 6px;">${copyObj.AUTONOMY_AUDIT_SUMMARY}</span>` : ''}
        <span data-autonomy-terms-version="${TERMS_VERSION}" hidden></span>
      </span>
    </label>
  `;
}

function renderFullPage({ acceptedTerms = false }) {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Google Ads Onboarding - Visual QA</title>
  <style>
    ${css}
    body {
      background: var(--bg);
      color: var(--text, #E6E8EC);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Heebo", "Assistant", sans-serif;
      margin: 0;
      padding: 0;
      direction: rtl;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm, 8px);
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(74, 227, 181, 0.2);
    }
  </style>
</head>
<body>
  <div dir="rtl" style="padding-top: clamp(40px, 6vw, 60px); padding-bottom: 64px; min-height: 100vh; background-color: var(--bg); display: flex; flex-direction: column; align-items: center;">
    <div class="wao-container" style="width: 100%; max-width: 1200px; padding: 0 20px; box-sizing: border-box;">
      
      <!-- Header Section -->
      <div style="margin-bottom: 24px; text-align: right;">
        <div style="font-size: 0.85rem; color: var(--accent); font-weight: 700; margin-bottom: 4px;">מערכת הקמת קמפיינים אוטומטית</div>
        <h1 style="font-size: clamp(1.8rem, 4vw, 2.5rem); font-weight: 900; line-height: 1.1; margin: 0 0 8px 0;">
          לקוחות חדשים מ-<span style="background: linear-gradient(135deg, #4AE3B5, #00C3FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Google Ads</span>
        </h1>
        <p style="color: var(--muted); font-size: 0.88rem; margin: 0 0 8px 0;">
          ההקמה לוקחת דקות, לא שבועות — אבל תן לתוצאות כמה שבועות להבשיל.
        </p>
        <p style="color: var(--muted); font-size: 0.95rem; margin: 0;">
          <span style="background: rgba(255, 170, 0, 0.1); color: #FFAA00; padding: 4px 10px; border-radius: 9999px; border: 1px solid rgba(255, 170, 0, 0.2); font-size: 0.8rem; font-weight: bold;">
            ● מצב הדגמה
          </span>
          <span> | </span>
          <span>אתה במצב בדיקה פנימי. אין פרסום חי, חיוב או גישה לחשבון לקוח.</span>
        </p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 14px; margin-bottom: 12px;">
          <button type="button" style="padding: 8px 14px; font-size: 0.9rem; border: 1px solid var(--accent); color: var(--accent); background: transparent; border-radius: 6px;">
            Sandbox
          </button>
          <button type="button" disabled style="padding: 8px 14px; font-size: 0.9rem; border: 1px solid var(--border); color: var(--muted); background: transparent; border-radius: 6px; opacity: 0.5;">
            Live (נעול)
          </button>
        </div>
      </div>

      <!-- Main Onboarding 2-Col Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px;">
        
        <!-- Left: Chat Panel -->
        <div style="background: rgba(13, 15, 21, 0.6); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <div style="font-weight: 700; font-size: 1rem; border-bottom: 1px solid var(--border); padding-bottom: 8px;">שיחת אפיון עם אדם</div>
          
          <div style="background: rgba(255,255,255,0.03); padding: 12px 16px; border-radius: 8px; font-size: 0.9rem; line-height: 1.4;">
            <strong>אדם:</strong> סיימנו את שלב האפיון! הנה האסטרטגיה המלאה לקמפיין שלך. כדי לצאת לדרך, אשר את תנאי הניהול האוטונומי.
          </div>

          <!-- Inline Chat Payment & Consent CTA (compact) -->
          <div id="chat-inline-cta" style="margin: 8px 0; padding: 16px 20px; border-radius: 14px; border: 1px solid var(--accent-border); background: linear-gradient(135deg, rgba(74,227,181,0.10) 0%, rgba(0,195,255,0.10) 100%); display: flex; flex-direction: column; gap: 12px;">
            <div style="font-size: 0.9rem; color: var(--muted); text-align: center;">
              דמי הקמה חד-פעמיים — <strong style="color: var(--text, #fff);">9.90 ₪</strong>
            </div>
            ${renderAutonomyConsent({ checked: acceptedTerms, compact: true })}
            <button
              ${acceptedTerms ? '' : 'disabled'}
              class="btn-primary"
              style="width: 100%; padding: 14px; justify-content: center; font-size: 1rem; background: ${acceptedTerms ? 'linear-gradient(135deg, #4AE3B5, #00C3FF)' : 'var(--border)'}; color: ${acceptedTerms ? 'var(--bg)' : 'var(--muted)'}; cursor: ${acceptedTerms ? 'pointer' : 'not-allowed'}; border: none; border-radius: 8px; font-weight: bold; transition: all 0.3s ease;"
            >
              🚀 לתשלום (9.9 ₪) והפעלת קמפיין
            </button>
          </div>
        </div>

        <!-- Right: Strategy & Full Checkout Panel -->
        <div style="background: rgba(13, 15, 21, 0.6); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Strategy summary -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: rgba(13, 15, 21, 0.4); padding: 16px; border-radius: 8px; border: 1px solid var(--border);">
            <div>
              <div style="font-size: 0.8rem; color: var(--muted); margin-bottom: 4px;">מיקוד מיקום</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent);">📍 תל אביב, רמת גן, גבעתיים</div>
            </div>
            <div>
              <div style="font-size: 0.8rem; color: var(--muted); margin-bottom: 4px;">תקציב יומי מומלץ</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent);">💰 ₪67 / יום</div>
            </div>
          </div>

          <!-- Checkout & Full Autonomy Consent CTA (non-compact) -->
          <div id="sidebar-checkout-cta" style="background: rgba(13, 15, 21, 0.4); border: 1px solid var(--accent-border); padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
            <div style="text-align: center;">
              <div style="font-size: 0.9rem; color: var(--muted);">דמי הקמה חד-פעמיים</div>
              <div style="font-size: 2rem; font-weight: 800; color: var(--text, #fff); margin: 4px 0;">9.90 ₪</div>
              <div style="font-size: 0.8rem; color: var(--muted);">תשלום אחד שמקים לך את הקמפיין ודף הנחיתה. חודש הניהול הראשון חינם, ומהחודש השני 249 ₪ בחודש.</div>
            </div>

            ${renderAutonomyConsent({ checked: acceptedTerms, compact: false })}

            <button
              ${acceptedTerms ? '' : 'disabled'}
              class="btn-primary"
              style="width: 100%; padding: 16px; justify-content: center; font-size: 1.1rem; background: ${acceptedTerms ? 'linear-gradient(135deg, #4AE3B5, #00C3FF)' : 'var(--border)'}; color: ${acceptedTerms ? 'var(--bg)' : 'var(--muted)'}; cursor: ${acceptedTerms ? 'pointer' : 'not-allowed'}; transition: all 0.3s ease; border: none; border-radius: 8px; font-weight: bold;"
            >
              🚀 לתשלום (9.9 ₪) והפעלת קמפיין
            </button>
          </div>

        </div>

      </div>
    </div>
  </div>
</body>
</html>`;
}

async function renderScreenshots() {
  console.log('Launching Puppeteer for exact visual QA captures...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();

    // 1. Desktop Viewport (1280x900) - Unchecked State
    await page.setViewport({ width: 1280, height: 900 });
    await page.setContent(renderFullPage({ acceptedTerms: false }), { waitUntil: 'load' });
    await sleep(200);

    const desktopFull = join(ARTIFACTS_DIR, 'desktop-full-reviewing.png');
    await page.screenshot({ path: desktopFull, fullPage: true });

    const inlineCard = await page.$('#chat-inline-cta');
    const desktopInline = join(ARTIFACTS_DIR, 'desktop-chat-inline-consent.png');
    if (inlineCard) await inlineCard.screenshot({ path: desktopInline });

    const sidebarCard = await page.$('#sidebar-checkout-cta');
    const desktopSidebar = join(ARTIFACTS_DIR, 'desktop-sidebar-consent.png');
    if (sidebarCard) await sidebarCard.screenshot({ path: desktopSidebar });

    // 2. Desktop Viewport - Checked State
    await page.setContent(renderFullPage({ acceptedTerms: true }), { waitUntil: 'load' });
    await sleep(200);
    const desktopChecked = join(ARTIFACTS_DIR, 'desktop-consent-checked.png');
    await page.screenshot({ path: desktopChecked, fullPage: true });

    // 3. Narrow Responsive Viewport (390x844 - iPhone / Mobile)
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.setContent(renderFullPage({ acceptedTerms: false }), { waitUntil: 'load' });
    await sleep(200);

    const mobileFull = join(ARTIFACTS_DIR, 'mobile-full-reviewing.png');
    await page.screenshot({ path: mobileFull, fullPage: true });

    const mobileInlineCard = await page.$('#chat-inline-cta');
    const mobileInline = join(ARTIFACTS_DIR, 'mobile-chat-inline-consent.png');
    if (mobileInlineCard) await mobileInlineCard.screenshot({ path: mobileInline });

    const mobileSidebarCard = await page.$('#sidebar-checkout-cta');
    const mobileSidebar = join(ARTIFACTS_DIR, 'mobile-sidebar-consent.png');
    if (mobileSidebarCard) await mobileSidebarCard.screenshot({ path: mobileSidebar });

    // Measure metrics
    const metrics = await page.evaluate(() => {
      const summaries = Array.from(document.querySelectorAll('#autonomy-consent-summary'));
      return summaries.map((s, idx) => ({
        index: idx,
        direction: window.getComputedStyle(s).direction,
        textAlign: window.getComputedStyle(s).textAlign,
        clientWidth: s.clientWidth,
        scrollWidth: s.scrollWidth,
        hasHorizontalOverflow: s.scrollWidth > s.clientWidth + 2,
        parentWidth: s.parentElement?.clientWidth,
      }));
    });

    console.log('Visual QA Render Complete. Metrics:', JSON.stringify(metrics, null, 2));

    const manifest = {
      timestamp: new Date().toISOString(),
      metrics,
      artifacts: {
        desktopFull,
        desktopInline,
        desktopSidebar,
        desktopChecked,
        mobileFull,
        mobileInline,
        mobileSidebar,
      },
    };

    writeFileSync(join(ARTIFACTS_DIR, 'visual-qa-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log('Manifest written to:', join(ARTIFACTS_DIR, 'visual-qa-manifest.json'));
  } finally {
    await browser.close();
  }
}

renderScreenshots().catch(err => {
  console.error('Render error:', err);
  process.exit(1);
});
