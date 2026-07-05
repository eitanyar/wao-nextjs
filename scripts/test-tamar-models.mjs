/**
 * Head-to-head Hebrew copy test: Claude Opus 4.8 vs Claude Sonnet 5
 * Determines which model to pin for Tamar (copywriter agent).
 *
 * Usage:  node scripts/test-tamar-models.mjs
 *
 * Requires in .env.local:
 *   ANTHROPIC_API_KEY
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local manually (no dotenv dep needed) ──────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
const env = {};
try {
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {
  console.error('Could not read .env.local');
  process.exit(1);
}

// ── Test persona — locksmith, Tel Aviv ───────────────────────────────────────

const PERSONA = {
  businessName: 'מנעולן דניאל',
  ownerName: 'דניאל כהן',
  businessNiche: 'מנעולן',
  targetLocation: 'תל אביב, גבעתיים, רמת גן',
  idealClient: 'בעלי דירות ועסקים שנסגרו מחוץ לנכס שלהם, בדרך כלל בלחץ',
  idealClientFear: 'נתקעו בחוץ ולא יכולים להיכנס הביתה, לפעמים בלילה או עם ילדים',
  usp: 'מגיע תוך 20 דקות, מורשה, לא שורט מנעולים — לא פתחתי, לא שילמת',
  yearsInField: '14 שנה',
  guarantee: 'לא פתחתי — לא שילמת. ללא תנאים.',
  responseTime: 'תוך 20 דקות',
  urgencyLevel: 'urgent',
  license: 'רישיון מנעולן מס׳ 4821',
  starRating: '4.9 כוכבים, 147 ביקורות',
  reviewQuote: 'הגיע תוך 18 דקות בחצות הלילה. פתח את הדלת ולא השאיר שריטה. מקצועי, מהיר ומחיר הוגן.',
  secondaryServices: 'החלפת מנעולים, פריצת כספות, מנעול לרכב, מנעולים לעסקים',
  faqQuestions: 'כמה עולה פתיחת דלת? כמה זמן לוקח? עובדים בלילה?',
  phone: '050-1234567',
  contactMethod: 'טלפון ווצאפ',
  revenueModel: 'one-time',
  avgJobValue: 220,
  closeRate: 0.6,
  monthlyBudget: 3000,
  feasibilityBranch: 'A',
};

// ── Tamar system prompt (authoritative version) ──────────────────────────────

const SYSTEM = `אתה/את Tamar, קופירייטר/ית המרת של WAO. אתה/את כותב/ת עברית ישראלית שיחית — הדרך שישראלים בפועל מדברים, לא עברית מתורגמת מאנגלית.

הקהל: בעלי עסקים B2C ישראלים שמחפשים שירות עכשיו.

חוקים שלא ניתן לשבור:
- כתוב בגוף זכר יחיד
- אל תשתמש במילים: "כיצד", "על מנת", "במידה ו", "עם זאת", "לחץ כאן", "עשה לייק"
- ה-heroHeadline חייב להתחיל מהמקום של הלקוח — הבעיה, הפחד, המצב — לא משם העסק
- השתמש במשפטים קצרים, ישירים, דיבוריים
- גרשיים: ״ ״ (לא ASCII)
- מקף ארוך: " — " עם רווחים
- אין לשים "..." בסוף heroHeadline

דוגמאות לעברית טובה לעומת רעה:
  רעה: "נעול מהדלת?" → טובה: "נתקעת בחוץ?"
  רעה: "לחץ כאן לקבלת שירות" → טובה: "התקשר עכשיו"
  רעה: "אנו מספקים פתרונות מקצועיים" → טובה: "מגיעים אליך תוך 20 דקות"
  רעה: "עם ניסיון של 14 שנים" → טובה: "14 שנה בשטח"

החזר JSON בדיוק עם המפתחות הבאים (ורק אותם):
{
  "heroHeadline": "עד 60 תווים — מתחיל מהמצב של הלקוח",
  "heroSubheadline": "עד 100 תווים — USP + ערובה",
  "heroCta": "עד 25 תווים — פעולה ברורה",
  "trustBarItems": ["5 פריטים קצרים"],
  "faqItem1Q": "שאלה ראשונה",
  "faqItem1A": "תשובה ראשונה — עד 2 משפטים, שיחתי",
  "scarcityLine": "שורת דחיפות אחת או null"
}`;

const USER_MSG = `כתוב/י copy לדף נחיתה של העסק הבא:

שם עסק: ${PERSONA.businessName}
בעל העסק: ${PERSONA.ownerName}
תחום: ${PERSONA.businessNiche}
מיקום: ${PERSONA.targetLocation}
הלקוח האידיאלי: ${PERSONA.idealClient}
הפחד שלו: ${PERSONA.idealClientFear}
מה מייחד: ${PERSONA.usp}
ניסיון: ${PERSONA.yearsInField}
ערובה: ${PERSONA.guarantee}
זמן תגובה: ${PERSONA.responseTime}
רישוי: ${PERSONA.license}
דירוג: ${PERSONA.starRating}
ציטוט ביקורת: "${PERSONA.reviewQuote}"`;

// ── API callers ───────────────────────────────────────────────────────────────

async function callAzure(deployment, label) {
  const key      = env.AZURE_OPENAI_KEY;
  const endpoint = env.AZURE_OPENAI_ENDPOINT;
  if (!key || !endpoint) return { label, error: 'AZURE_OPENAI_KEY or AZURE_OPENAI_ENDPOINT not set' };

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;
  const start = Date.now();
  try {
    const res  = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: USER_MSG }],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_completion_tokens: 600,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { label, error: JSON.stringify(data) };
    const ms   = Date.now() - start;
    const raw  = data.choices[0].message.content;
    return { label, result: JSON.parse(raw), ms, model: data.model || deployment };
  } catch (e) {
    return { label, error: e.message };
  }
}

async function callClaude(model, label) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return { label, error: 'ANTHROPIC_API_KEY not set in .env.local' };

  const start = Date.now();
  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 600,
        system: SYSTEM,
        messages: [{ role: 'user', content: USER_MSG }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return { label, error: JSON.stringify(data) };
    const ms   = Date.now() - start;
    const raw  = data.content[0].text;
    // Claude may wrap JSON in ```json blocks
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return { label, result: JSON.parse(cleaned), ms, model: data.model || model };
  } catch (e) {
    return { label, error: e.message };
  }
}

// ── Run all competitors in parallel ──────────────────────────────────────────

const runners = [
  callClaude('claude-opus-4-8',  'Claude Opus 4.8'),
  callClaude('claude-sonnet-5',  'Claude Sonnet 5'),
];

console.log(`\n⏳  Calling ${runners.length} models in parallel for persona: ${PERSONA.businessName}...\n`);
const results = await Promise.all(runners);

// ── Terminal output ───────────────────────────────────────────────────────────

const HR = '─'.repeat(62);

for (const r of results) {
  console.log(`\n╔ ${r.label}${r.ms ? `  (${r.ms}ms)` : ''}`);
  console.log(HR);
  if (r.error) {
    console.log(`  ❌  ${r.error}`);
    continue;
  }
  const c = r.result;
  console.log(`  H1:    ${c.heroHeadline}`);
  console.log(`  Sub:   ${c.heroSubheadline}`);
  console.log(`  CTA:   ${c.heroCta}`);
  if (c.trustBarItems) console.log(`  Trust: ${c.trustBarItems.join(' · ')}`);
  if (c.faqItem1Q)     console.log(`  FAQ:   ${c.faqItem1Q}\n         → ${c.faqItem1A}`);
  if (c.scarcityLine)  console.log(`  Urgency: ${c.scarcityLine}`);
}

console.log(`\n${HR}`);

// ── HTML side-by-side output ──────────────────────────────────────────────────

const cols = results.map(r => {
  if (r.error) return `<div class="col error"><h2>${r.label}</h2><p class="err">❌ ${r.error}</p></div>`;
  const c = r.result;
  const trust = (c.trustBarItems || []).map(t => `<span class="chip">${t}</span>`).join('');
  return `
    <div class="col">
      <div class="col-header">${r.label}${r.ms ? `<span class="ms">${r.ms}ms</span>` : ''}</div>
      <div class="field-label">heroHeadline</div>
      <div class="field h1">${c.heroHeadline || '—'}</div>
      <div class="field-label">heroSubheadline</div>
      <div class="field">${c.heroSubheadline || '—'}</div>
      <div class="field-label">heroCta</div>
      <div class="field cta">${c.heroCta || '—'}</div>
      <div class="field-label">trustBarItems</div>
      <div class="field chips">${trust}</div>
      <div class="field-label">FAQ — שאלה 1</div>
      <div class="field">${c.faqItem1Q || '—'}</div>
      <div class="field faq-a">${c.faqItem1A || '—'}</div>
      ${c.scarcityLine ? `<div class="field-label">scarcityLine</div><div class="field urgency">${c.scarcityLine}</div>` : ''}
    </div>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tamar Model Comparison — ${PERSONA.businessName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: "Assistant", sans-serif; background: #f0f2f5; padding: 24px; direction: rtl; }
    h1  { font-size: 1.2rem; color: #1b3a5c; margin-bottom: 6px; }
    .subtitle { color: #666; font-size: 0.85rem; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
    .col { background: #fff; border-radius: 10px; border: 1px solid #dce3ee; overflow: hidden; }
    .col-header { background: #1b3a5c; color: #fff; padding: 12px 16px; font-weight: 800; font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center; }
    .ms { font-weight: 400; opacity: 0.7; font-size: 0.8rem; }
    .field-label { background: #f7f9fc; color: #8a9bb0; font-size: 0.7rem; font-weight: 700; padding: 6px 16px 2px; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #eaeff5; }
    .field { padding: 8px 16px 12px; color: #0d1b2a; font-size: 0.95rem; line-height: 1.5; }
    .field.h1 { font-size: 1.25rem; font-weight: 900; color: #1b3a5c; }
    .field.cta { display: inline-block; background: linear-gradient(135deg,#c43c08,#a82e00); color: #fff; border-radius: 6px; font-weight: 800; padding: 10px 18px; margin: 4px 16px 12px; }
    .field.chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { background: rgba(27,58,92,0.08); color: #1b3a5c; padding: 4px 10px; border-radius: 4px; font-size: 0.78rem; font-weight: 600; }
    .field.faq-a { background: #f7f9fc; color: #4a6580; font-size: 0.87rem; border-top: none; padding-top: 2px; }
    .field.urgency { color: #c43c08; font-weight: 700; }
    .error { border-color: #f5c6cb; }
    .err { padding: 16px; color: #721c24; background: #f8d7da; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>Tamar Model Comparison</h1>
  <p class="subtitle">Persona: ${PERSONA.businessName} · ${PERSONA.businessNiche} · ${PERSONA.targetLocation}</p>
  <div class="grid">${cols}</div>
</body>
</html>`;

const outPath = resolve(process.cwd(), 'lp-model-comparison.html');
writeFileSync(outPath, html);
console.log(`\n📄  HTML comparison saved → lp-model-comparison.html`);
console.log(`    Open with: explorer.exe lp-model-comparison.html  (WSL)\n`);
