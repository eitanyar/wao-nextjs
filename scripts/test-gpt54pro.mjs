/**
 * Test gpt-5.4-pro on the new Azure AI Foundry project endpoint.
 * Uses the full LPCopy schema + improved prompt (character-arc aboutBlurb, 4-5 FAQs).
 *
 * Usage: node scripts/test-gpt54pro.mjs
 *
 * Requires in .env.local:
 *   AZURE_GPT54PRO_ENDPOINT   (already set)
 *   AZURE_GPT54PRO_DEPLOYMENT (already set)
 *   AZURE_OPENAI_KEY          (already set — same key)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Load .env.local ───────────────────────────────────────────────────────────
const env = {};
try {
  readFileSync(resolve(process.cwd(), '.env.local'), 'utf-8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
} catch {
  console.error('Could not read .env.local'); process.exit(1);
}

// ── Test persona — electrician (Hezi benchmark vertical) ─────────────────────
const DATA = {
  businessName:    'חזי חשמל',
  ownerName:       'חזי לוי',
  businessNiche:   'חשמלאי',
  targetLocation:  'תל אביב, רמת גן, גבעתיים',
  serviceModel:    'on-site',
  idealClientFear: 'תקלת חשמל דחופה שמשתקת את הבית או שיש סכנת בטיחות',
  usp:             'חשמלאי מוסמך, מגיע תוך שעה, לא עושה קיצורי דרך',
  yearsInField:    '12 שנה',
  guarantee:       'אחריות שנה על כל עבודה',
  license:         'רישיון חשמלאי מס׳ 1015694',
  responseTime:    'תוך שעה',
  urgencyLevel:    'urgent',
  starRating:      '4.9',
  reviewQuote:     'הגיע תוך 45 דקות, אבחן את הבעיה מיד ותיקן הכל בלי בלגן. מקצועי ואמין בלי פשרות.',
  secondaryServices: 'טיפול בלוחות חשמל, התקנת תאורה, חיווט דירות, עמדות טעינה לרכב חשמלי',
  faqQuestions:    'כמה עולה קריאת שירות? עובד בשישי ושבת? מה כלול באחריות?',
  contactMethod:   'טלפון ווצאפ',
  revenueModel:    'one-time',
};

// ── Build the same prompt as buildLpCopyPrompt() in lpCopyPrompt.ts ───────────
function buildPrompt(data) {
  const contactLabel = data.contactMethod?.includes('וואטסאפ') ? 'שלח וואטסאפ' : 'התקשר עכשיו';
  const ownerFirstName = (data.ownerName || data.businessName || '').split(/[\s,]/)[0];

  return {
    system: `You are Tamar, WAO's Sabra conversion copywriter.
Write LP copy for a Hebrew RTL landing page. Output ONLY valid JSON. No prose, no explanation.

HARD RULES:
- Hebrew only. Singular male address (אתה/שלך). No translated-Hebrew calques.
- Never use: על מנת, כיצד, במידה ו, עם זאת, מהו, ניתן ל (prefer: אפשר).
- Tone: warm Sabra expert talking directly to a stressed client. Not salesy. Not corporate.
- reviewFeatured: copy EXACTLY from the Review Quote field — do not rephrase a single word.

ABOUT SECTION (aboutBlurb) — most important field:
- First-person voice. Open with: "שמי ${ownerFirstName}," or "אני ${ownerFirstName},"
- 3-4 sentences. Follow this arc:
  1. Who I am + primary credential (years of experience, license if provided)
  2. How I work — one specific trait that sets me apart (NOT generic "שירות מקצועי")
  3. What the client gets when they call — a concrete, personal promise
  4. A brief human touch or closing hook (optional but preferred)
- If a license number is provided, embed it naturally: "בעל רישיון מספר X"
- Max 320 chars. Zero generic filler phrases like "אנו מחויבים ללקוח" or "שירות מקצועי ואיכותי".

HERO:
- heroHeadline: open with the client's fear/problem, close with the relief. Max 68 chars.
- heroSubheadline: one specific, credible USP. Not a list — one sharp promise. Max 90 chars.

FAQ (faqItems):
- 4-5 items covering what clients actually ask before calling.
- Pick from: pricing transparency, response time, area coverage, warranty/guarantee,
  process after contact, certifications, evening/weekend availability, what's included.
- Answers: 1-2 full natural sentences. Specific, not vague. Max 120 chars each.`,

    user: `BUSINESS DATA:
Niche: ${data.businessNiche}
Business Name: ${data.businessName}
Owner Name: ${data.ownerName}
Location: ${data.targetLocation}
Service Model: ${data.serviceModel}
Ideal Client Fear: ${data.idealClientFear}
USP: ${data.usp}
Years in Field: ${data.yearsInField}
Guarantee: ${data.guarantee}
License: ${data.license}
Secondary Services: ${data.secondaryServices}
FAQ Questions: ${data.faqQuestions}
Urgency Level: ${data.urgencyLevel}
Response Time: ${data.responseTime}
Review Quote: ${data.reviewQuote}
Star Rating: ${data.starRating}
Contact Method: ${data.contactMethod}
Primary CTA label: "${contactLabel}"

OUTPUT (JSON only, no markdown):
{
  "heroHeadline": "",
  "heroSubheadline": "",
  "heroCta": "${contactLabel}",
  "trustBarItems": ["", "", "", ""],
  "aboutBlurb": "",
  "servicesHeadline": "",
  "serviceItems": ["", "", "", ""],
  "faqHeadline": "",
  "faqItems": [{"q": "", "a": ""}, {"q": "", "a": ""}, {"q": "", "a": ""}, {"q": "", "a": ""}],
  "guaranteeBlock": "",
  "reviewFeatured": "${data.reviewQuote}",
  "reviewContext": "${data.starRating} כוכבים בגוגל",
  "responseTimeBadge": "${data.responseTime}",
  "scarcityLine": null,
  "formHeadline": "",
  "stickyBarLine": ""
}`,
  };
}

// ── Try multiple endpoint formats (we don't know which one gpt-5.4-pro needs) ─
async function callGpt54Pro(prompt) {
  const key        = env.AZURE_OPENAI_KEY;
  const endpoint   = env.AZURE_GPT54PRO_ENDPOINT;
  const deployment = env.AZURE_GPT54PRO_DEPLOYMENT || 'gpt-5.4-pro';

  if (!key || !endpoint) {
    return { error: 'AZURE_GPT54PRO_ENDPOINT or AZURE_OPENAI_KEY not set' };
  }

  // Try the project-level chat/completions endpoint first
  const candidates = [
    `${endpoint}/chat/completions?api-version=2025-04-01-preview`,
    `${endpoint}/chat/completions?api-version=2024-05-01-preview`,
    `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-12-01-preview`,
  ];

  for (const url of candidates) {
    const start = Date.now();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'api-key': key },
        body: JSON.stringify({
          model: deployment,
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user',   content: prompt.user },
          ],
          response_format: { type: 'json_object' },
          max_completion_tokens: 1200,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.log(`  ↳ ${url.split('?')[0].split('/').slice(-3).join('/')} → ${res.status} ${data?.error?.code || ''}`);
        continue;
      }

      const ms     = Date.now() - start;
      const raw    = data.choices?.[0]?.message?.content;
      const usage  = data.usage || {};
      const parsed = JSON.parse(raw);

      return { parsed, ms, usage, url, model: data.model || deployment };
    } catch (e) {
      console.log(`  ↳ ${url} → error: ${e.message}`);
    }
  }

  return { error: 'All endpoint formats failed — see logs above' };
}

// ── Also run gpt-chat-latest for comparison ───────────────────────────────────
async function callCurrent(prompt) {
  const key        = env.AZURE_OPENAI_KEY;
  const endpoint   = env.AZURE_OPENAI_ENDPOINT; // https://wao-brain-resource.services.ai.azure.com/models
  const deployment = env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-chat-latest';

  const url   = `${endpoint}/chat/completions?api-version=2024-05-01-preview`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({
        model: deployment,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user',   content: prompt.user },
        ],
        response_format: { type: 'json_object' },
        max_completion_tokens: 1200,
      }),
    });
    const data = await res.json();
    if (!res.ok) return { error: JSON.stringify(data?.error) };
    const ms   = Date.now() - start;
    return { parsed: JSON.parse(data.choices[0].message.content), ms, usage: data.usage || {}, model: data.model || deployment };
  } catch (e) {
    return { error: e.message };
  }
}

// ── Run ───────────────────────────────────────────────────────────────────────
const prompt = buildPrompt(DATA);

console.log(`\n⏳  Testing gpt-5.4-pro vs gpt-chat-latest for: ${DATA.businessName} (${DATA.businessNiche})\n`);

const [proResult, currentResult] = await Promise.all([
  callGpt54Pro(prompt),
  callCurrent(prompt),
]);

// ── Terminal output ───────────────────────────────────────────────────────────
const HR = '─'.repeat(70);

function printResult(label, r) {
  console.log(`\n╔ ${label}${r.ms ? `  (${r.ms}ms)` : ''}`);
  console.log(HR);
  if (r.error) { console.log(`  ❌  ${r.error}`); return; }
  const c = r.parsed;
  console.log(`  H1:     ${c.heroHeadline}`);
  console.log(`  Sub:    ${c.heroSubheadline}`);
  console.log(`  CTA:    ${c.heroCta}`);
  console.log(`  Trust:  ${(c.trustBarItems || []).join(' · ')}`);
  console.log(`\n  ABOUT (key field):`);
  console.log(`  ${c.aboutBlurb}`);
  console.log(`\n  FAQs:`);
  (c.faqItems || []).forEach((f, i) => console.log(`  ${i+1}. ${f.q}\n     → ${f.a}`));
  console.log(`\n  Guarantee: ${c.guaranteeBlock}`);
  if (r.usage.total_tokens) {
    const costIn  = (r.usage.prompt_tokens     / 1_000_000) * 3;
    const costOut = (r.usage.completion_tokens / 1_000_000) * 15;
    console.log(`\n  Tokens: ${r.usage.prompt_tokens} in / ${r.usage.completion_tokens} out — ~$${(costIn + costOut).toFixed(4)}`);
  }
}

printResult(`gpt-5.4-pro  (${env.AZURE_GPT54PRO_DEPLOYMENT})`, proResult);
printResult(`gpt-chat-latest (current)`, currentResult);

// ── HTML side-by-side ─────────────────────────────────────────────────────────
function renderCol(label, r) {
  if (r.error) return `<div class="col error"><div class="col-header">${label}</div><p class="err">❌ ${r.error}</p></div>`;
  const c = r.parsed;
  const trust = (c.trustBarItems || []).map(t => `<span class="chip">${t}</span>`).join('');
  const faqs  = (c.faqItems || []).map(f => `
    <div class="faq-q">${f.q}</div>
    <div class="faq-a">${f.a}</div>`).join('');
  const costLine = r.usage?.total_tokens
    ? `<div class="cost">~$${(((r.usage.prompt_tokens/1e6)*3)+((r.usage.completion_tokens/1e6)*15)).toFixed(4)} · ${r.usage.total_tokens} tokens · ${r.ms}ms</div>` : '';
  return `
  <div class="col">
    <div class="col-header">${label}${costLine}</div>
    <div class="section-label">Hero</div>
    <div class="h1">${c.heroHeadline || '—'}</div>
    <div class="sub">${c.heroSubheadline || '—'}</div>
    <div class="cta-wrap"><span class="cta">${c.heroCta || '—'}</span></div>
    <div class="section-label">Trust bar</div>
    <div class="chips">${trust}</div>
    <div class="section-label">About (character arc)</div>
    <div class="about">${c.aboutBlurb || '—'}</div>
    <div class="section-label">FAQ (${(c.faqItems||[]).length} שאלות)</div>
    <div class="faqs">${faqs}</div>
    <div class="section-label">Guarantee</div>
    <div class="guarantee">${c.guaranteeBlock || '—'}</div>
    <div class="section-label">Form / Sticky</div>
    <div class="form-line">${c.formHeadline || '—'}</div>
    <div class="sticky-line">${c.stickyBarLine || '—'}</div>
  </div>`;
}

const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>gpt-5.4-pro vs gpt-chat-latest — ${DATA.businessName}</title>
<link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600;700;800&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Assistant",sans-serif;background:#f0f2f5;padding:24px;direction:rtl}
h1{font-size:1.3rem;color:#1b3a5c;margin-bottom:4px}
.subtitle{color:#666;font-size:.85rem;margin-bottom:20px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.col{background:#fff;border-radius:10px;border:1px solid #dce3ee;overflow:hidden}
.col-header{background:#1b3a5c;color:#fff;padding:12px 16px;font-weight:800;font-size:.9rem}
.cost{font-weight:400;font-size:.75rem;opacity:.8;margin-top:2px}
.section-label{background:#f7f9fc;color:#8a9bb0;font-size:.68rem;font-weight:700;padding:6px 16px 2px;text-transform:uppercase;letter-spacing:.05em;border-top:1px solid #eaeff5}
.h1{font-size:1.4rem;font-weight:900;color:#1b3a5c;padding:10px 16px 4px;line-height:1.3}
.sub{color:#444;font-size:.95rem;padding:4px 16px 10px}
.cta-wrap{padding:4px 16px 12px}
.cta{background:linear-gradient(135deg,#c43c08,#a82e00);color:#fff;border-radius:6px;font-weight:800;padding:8px 18px;display:inline-block}
.chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 16px 12px}
.chip{background:rgba(27,58,92,.09);color:#1b3a5c;padding:4px 10px;border-radius:4px;font-size:.78rem;font-weight:600}
.about{padding:10px 16px;font-size:.95rem;line-height:1.65;color:#1a2940;background:#fafcff;border-right:3px solid #1b3a5c}
.faqs{padding:8px 16px 12px}
.faq-q{font-weight:700;color:#1b3a5c;font-size:.88rem;margin-top:8px}
.faq-a{color:#445;font-size:.85rem;margin-top:2px;padding-right:12px;line-height:1.5}
.guarantee{padding:10px 16px;font-size:.9rem;color:#2a5c2a;background:#f4faf4}
.form-line,.sticky-line{padding:6px 16px;font-size:.88rem;color:#555}
.error .col-header{background:#c0392b}
.err{padding:16px;color:#721c24;background:#f8d7da;font-size:.85rem}
@media(max-width:700px){.grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<h1>gpt-5.4-pro vs gpt-chat-latest</h1>
<p class="subtitle">פרסונה: ${DATA.businessName} · ${DATA.businessNiche} · ${DATA.targetLocation} — שים לב במיוחד לשדה "About (character arc)"</p>
<div class="grid">
  ${renderCol('gpt-5.4-pro', proResult)}
  ${renderCol('gpt-chat-latest (current)', currentResult)}
</div>
</body>
</html>`;

const outPath = resolve(process.cwd(), 'lp-gpt54pro-test.html');
writeFileSync(outPath, html);
console.log(`\n${HR}`);
console.log(`\n📄  HTML comparison saved → lp-gpt54pro-test.html`);
console.log(`    Open with: explorer.exe lp-gpt54pro-test.html\n`);
