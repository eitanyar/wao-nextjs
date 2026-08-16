/**
 * GEO Content Generation Pipeline — Tamar→Noa two-model chain
 *
 * Reads pareto.json opportunities, generates Hebrew content for each
 * (FAQ block, definition box, or table), and saves ready-to-use action files.
 *
 * Usage:
 *   node scripts/geo-generate-content.mjs --client=retter
 *   node scripts/geo-generate-content.mjs --client=retter --top=5
 *   node scripts/geo-generate-content.mjs --client=retter --rank=1   (single action)
 *
 * Output: data/geo-logs/{client}/actions/{rank}-{slug}.json
 * Checkpointed: skips already-generated actions.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractLexicon, buildLexiconConstraint } from './lib/page-lexicon.mjs';
import { extractJsonSpan } from './lib/json-repair.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = {};
fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf-8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('='))
);

const CLIENT_ID  = args.client || 'retter';
const TOP_N      = parseInt(args.top  || '20', 10);
const ONLY_RANK  = args.rank ? parseInt(args.rank, 10) : null;
const CONCURRENCY = 2;

const BASE_DIR    = path.resolve(__dirname, `../data/clients/${CLIENT_ID}`);
const PARETO_FILE = path.join(BASE_DIR, 'pareto.json');
const CLIENT_FILE = path.join(BASE_DIR, 'client.json');
const ACTIONS_DIR = path.join(BASE_DIR, 'tasks', 'geo');
const PAGES_DIR   = path.join(BASE_DIR, 'pages'); // lexicon cache per URL

// Process-env wins so a single invocation can force-unset/override a key
// (e.g. GEMINI_API_KEY= node …) without rewriting .env.local.
function envVal(name) {
  return Object.prototype.hasOwnProperty.call(process.env, name) ? process.env[name] : env[name];
}

// ── Qwen 3.8 Max (Hebrew channel) — OpenAI-compatible DashScope ───────────────
const QWEN_API_KEY  = envVal('QWEN_API_KEY');
const QWEN_BASE_URL = envVal('QWEN_BASE_URL');
const QWEN_MODEL    = 'qwen3.8-max';

// ── Gemini 3.7 Flash (PRIMARY for unattended GEO gen) ─────────────────────────
const GEMINI_API_KEY = envVal('GEMINI_API_KEY');
const GEMINI_MODEL   = envVal('GEMINI_MODEL_NAME') || 'gemini-3.7-flash';

// Note: unlike Azure's max_completion_tokens, we deliberately do NOT cap
// max_tokens here. A fixed budget carried over from Azure's tokenizer
// truncated Hebrew JSON output mid-string. The `_legacyMaxTokens` param is
// kept only so call sites don't need updating; it's intentionally unused.
async function callQwenOnce(systemPrompt, userMessage, opts = {}) {
  const url = `${QWEN_BASE_URL}/chat/completions`;
  const payload = {
    model: QWEN_MODEL,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  };
  // Default = reasoning on (omit the field). Noa proofreading does not need it.
  if (opts.think === false) payload.enable_thinking = false;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Qwen error ${res.status}: ${JSON.stringify(data)}`);
  if (process.env.DEBUG_QWEN) console.error('[DEBUG_QWEN] finishReason=', data?.choices?.[0]?.finish_reason, 'usage=', JSON.stringify(data?.usage));
  const raw = data?.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(extractJsonSpan(raw)); // throws on malformed JSON — caller retries
}

// Qwen occasionally emits malformed/unterminated JSON even in
// response_format: json_object mode. A same-prompt retry reliably produces
// well-formed JSON on the next attempt, so retry a few times before giving
// up — cheaper and simpler than trying to heuristically repair a broken
// JSON string.
async function callQwen(systemPrompt, userMessage, _legacyMaxTokens = 2000, attempts = 3, opts = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callQwenOnce(systemPrompt, userMessage, opts);
    } catch (e) {
      lastErr = e;
      if (process.env.DEBUG_QWEN) console.error(`[DEBUG_QWEN] attempt ${i + 1}/${attempts} failed:`, e.message);
    }
  }
  throw lastErr;
}

// ── Gemini (primary) — Generative Language API, JSON-mode ─────────────────────
async function callGeminiOnce(systemPrompt, userMessage, opts = {}) {
  void opts; // Qwen-only flags (e.g. think) are ignored; request shape is fixed.
  if (!GEMINI_API_KEY) throw new Error('Gemini not configured');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const payload = {
    systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: 'LOW' },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data)}`);
  if (process.env.DEBUG_QWEN) {
    console.error('[DEBUG_GEMINI] modelVersion=', data?.modelVersion, 'usage=', JSON.stringify(data?.usageMetadata));
  }
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof raw !== 'string') throw new Error(`Gemini returned unexpected shape: ${JSON.stringify(data)}`);
  return JSON.parse(extractJsonSpan(raw)); // throws on malformed JSON — caller retries
}

async function callGemini(systemPrompt, userMessage, _legacyMaxTokens = 2000, attempts = 2, opts = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiOnce(systemPrompt, userMessage, opts);
    } catch (e) {
      lastErr = e;
      if (process.env.DEBUG_QWEN) console.error(`[DEBUG_GEMINI] attempt ${i + 1}/${attempts} failed:`, e.message);
    }
  }
  throw lastErr;
}

// Gemini first (2 attempts); Qwen only after Gemini is exhausted (1 retry = 2 attempts).
async function callGeminiThenQwen(systemPrompt, userMessage, _legacyMaxTokens = 2000, qwenAttempts = 2, opts = {}) {
  try {
    const result = await callGemini(systemPrompt, userMessage, _legacyMaxTokens, 2, opts);
    return { result, generatedVia: `primary:${GEMINI_MODEL}` };
  } catch (geminiErr) {
    if (process.env.DEBUG_QWEN) console.error('[DEBUG_GEMINI] exhausted, falling back to Qwen:', geminiErr.message);
    const result = await callQwen(systemPrompt, userMessage, _legacyMaxTokens, qwenAttempts, opts);
    return { result, generatedVia: `fallback:${QWEN_MODEL}` };
  }
}

function viaLogLabel(generatedVia) {
  if (String(generatedVia).startsWith('fallback:')) return `${generatedVia.slice('fallback:'.length)} FALLBACK`;
  if (String(generatedVia).startsWith('primary:')) return generatedVia.slice('primary:'.length);
  return generatedVia;
}

// ── Tamar system prompt ───────────────────────────────────────────────────────
function tamarPrompt(client) {
  return `אתה טמר, קופירייטר של WAO — מומחית בתוכן GEO/AIO לעסקים ישראלים.

המשימה שלך: לכתוב תוכן עברי מדויק שיופיע בתשובות ה-AI של גוגל ו-ChatGPT.

## הלקוח
- שם המותג הרשמי: ${client.brandName || client.businessNiche}
- עסק: ${client.businessNiche}
- שירות מוביל: ${client.topService}
- אזורי פעילות: ${client.targetLocation}
- יתרון ייחודי: ${client.usp}
- טון: ${client.tone}

## כללי כתיבה
- עברית ישראלית מדוברת — לא מתורגמת מאנגלית
- משפטים קצרים. מקסימום 12-15 מילה למשפט.
- לא לזרוק מילים כדי לחסוך מקום — כל משפט צריך להיות שלם
- את/ה → אתה (יחיד זכר)
- אסור: "כיצד", "במידה ו", "על מנת", "מהו" — רק שפה מדוברת
- תמיד לכלול את שם העסק/המותג בטבעיות
- השתמשי אך ורק בשם המותג הרשמי כפי שהוא מופיע בפרומפט, ללא כל שינוי או וריאציה אחרת
- היי ספציפית רק לגבי פרטים מאומתים מהקשר הלקוח (קורסים, יתרונות, מיקום, מותג). אל תמציאי פרטים תפעוליים כמו שעות, מחירים או חניה; אם המידע לא סופק – אל תכתבי אותו.

כתבי רק על הלקוח: רטר, קורסי NLP בישראל, קהל היעד, ההבדלים מהמתחרים, התוצאות שהקורס מביא.
אל תכתבי הגדרות כלליות, פרסונות מעורפלות, מוטיבציה ריקה או משפטי פתיחה גנריים.
כל טענה חייבת להיות ספציפית, ניתנת לבדיקה ומקושרת לרטר או לקורס NLP בישראל.

## פורמט תוצאה (JSON בלבד)
{
  "hebrewContent": "...",        // התוכן המלא לפרסום (HTML סמנטי נקי)
  "placementInstruction": "...", // משפט אחד בעברית: איפה בדיוק להוסיף
  "jsonLd": { ... },             // אובייקט schema.org תקני (ללא @context/@graph)
  "metaDescription": "...",      // תיאור SEO של 150-160 תווים (לדף קיים)
  "tamarNotes": "..."            // הערות לעורכת — מה שצריך לשים לב אליו
}`;
}

// ── Noa system prompt ─────────────────────────────────────────────────────────
function noaPrompt(lexicon, brandName, clientFacts) {
  const termList = lexicon?.source === 'page'
    ? `\n\n## אוצר מילים מחייב (מהעמוד)\nתיאורי עסק/שירות מורשים: ${[...(brandName ? [brandName] : []), ...lexicon.selfReference, ...lexicon.serviceTerms].slice(0, 12).join(', ')}\nאם תמצאי מונח תיאורי שאינו ברשימה — ציני אותו ב-vocabViolations.`
    : '';

  return `אתה נועה, עורכת השפה הישראלית של WAO.

תקבל תוכן שכתבה טמר. תפקידך:
1. לתקן עברית לא טבעית, מבנים מתורגמים, מילים פורמליות
2. לוודא שכל משפט שלם ותקין דקדוקית
3. לוודא את→ (קיים לפני מושא ישיר מיודע)
4. לוודא שימוש בגרשיים עבריים (״ ״) ולא ASCII
5. לתקן מקפים: em-dash ( — ) ולא מינוס${termList}
6. דרגי את מידת הטבעיות של העברית (סברה) מול תרגמת, וסמני ביטויים שמסגירים תרגום.
7. סמני טענות עובדתיות ספציפיות בתוכן שאינן נובעות מהקשר הלקוח המאומת ודורשות בדיקה נוספת.

## הקשר מאומת על העסק
${clientFacts || ''}

החזירי JSON:
{
  "hebrewContent": "...",        // התוכן המתוקן
  "placementInstruction": "...", // המשפט המתוקן
  "metaDescription": "...",      // התיאור המתוקן
  "noaChanges": "...",           // רשימת תיקונים שביצעת
  "vocabViolations": [],         // מונחים שנמצאו בתוכן אך לא ברשימה המורשית (מערך מחרוזות, ריק אם אין)
  "registerScore": 0,            // ציון 0-100 לטבעיות הסברה: 100=עברית ישראלית טבעית, נמוך=מתורגם/קלקה.
  "registerFlags": [],           // מערך ביטויים שמסגירים תרגום או קלקה; יש להשאיר ריק אם אין.
  "groundingRisk": "low",        // רמת סיכון להמצאת עובדות (low/med/high), הנקבעת לפי כמות וחומרת הטענות הלא-מאומתות בטקסט.
  "factualClaims": []            // מערך הטענות העובדתיות הספציפיות הדורשות אימות. יש להשאיר ריק אם אין טענות כאלו.
}`;
}

// ── Content prompt per action type ───────────────────────────────────────────
function buildUserMessage(opportunity, client, lexicon = null) {
  const { query, rankingUrl, implementationMode, actionType, priority } = opportunity;
  const urlSlug = rankingUrl.replace(client.siteUrl.replace(/\/$/, ''), '') || '/';

  // Cannibalization guard: react to ANY detected reason, not just
  // HEAD_TERM_ON_LOCATION. MULTI_URL alone (no location page involved) still
  // means another page on the site already owns this query's intent — generic
  // FAQ/definition content would duplicate it. See scripts/gsc-pareto.mjs
  // checkCannibalization() for how reasons are set.
  const cannibalReasons  = opportunity.cannibalReasons ?? [];
  const isLocationCannibal = cannibalReasons.includes('HEAD_TERM_ON_LOCATION');
  const isMultiUrlCannibal = !isLocationCannibal && cannibalReasons.includes('MULTI_URL');
  const isGeoMode = isLocationCannibal; // kept for existing log/console naming
  const locationSlug = urlSlug.replace(/\//g, '').replace(/-/g, ' ').trim();

  const geoFaqInstruction = `כתבי בלוק FAQ גאוגרפי עבור "${query}" בדגש על הסניף המקומי.
השאלות צריכות להיות ספציפיות למיקום — לא הגדרות כלליות של הנושא.
דוגמאות לשאלות: "איפה מתקיים הקורס ב${locationSlug}?", "מה שעות הלימוד בסניף?", "כיצד מגיעים?", "מתי מתחיל המחזור הבא?"
JSON-LD: סוג LocalBusiness עם כתובת וסכימת Course עם location.
חשוב: אל תכתבי הגדרות כלליות של "${query}" — זה תפקיד העמוד הראשי.`;

  // MULTI_URL-only cannibalization: another (non-location) page already
  // ranks/splits impressions for this query. Steer toward a narrow, non-
  // overlapping facet instead of a general definition of the query.
  const multiUrlFaqInstruction = `כתבי בלוק FAQ ממוקד על היבט צר של "${query}" — לא הגדרה כללית של הנושא.
בחרי זווית ספציפית לעמוד הזה (${urlSlug}) שלא חופפת לעמוד אחר באתר שמדבר על אותה שאילתה: פרט טכני, שלב בתהליך, או צד ייחודי של הנושא.
דוגמאות לשאלות: "מה ההבדל בין [היבט א] ל[היבט ב]?", "מתי הכי מתאים ל${query}?", "מה חשוב לדעת לפני שמתחילים?"
JSON-LD: סוג FAQPage עם mainEntity — בלי שאלת "מה זה ${query}?".
חשוב: אל תכתבי הגדרות כלליות של "${query}" — זה תפקיד העמוד המרכזי שכבר מדורג עליו.`;

  const cannibalInstruction = isLocationCannibal
    ? geoFaqInstruction
    : (isMultiUrlCannibal ? multiUrlFaqInstruction : null);

  const typeInstructions = {
    faq_block: cannibalInstruction || `כתבי בלוק שאלות ותשובות (FAQ) על "${query}".
פורמט HTML:
<div class="faq-block">
  <h2>שאלות נפוצות על [נושא]</h2>
  <div class="faq-item">
    <h3>שאלה 1?</h3>
    <p>תשובה...</p>
  </div>
  ... (3-5 שאלות)
</div>
JSON-LD: סוג FAQPage עם mainEntity.`,

    definition_box: cannibalInstruction || `כתבי תיבת הגדרה (definition box) על "${query}".
פורמט HTML:
<div class="definition-box">
  <h2>מה זה ${query}?</h2>
  <p>[הגדרה קצרה וברורה — 2-3 משפטים]</p>
  <ul><li>נקודה 1</li><li>נקודה 2</li><li>נקודה 3</li></ul>
</div>
JSON-LD: סוג DefinedTerm או FAQPage עם שאלה אחת "מה זה ${query}?".`,

    table: cannibalInstruction || `כתבי טבלת השוואה על "${query}".
פורמט HTML: <table> עם <thead> ו-<tbody>.
JSON-LD: סוג FAQPage עם שאלת השוואה.`,
  };

  const lexiconBlock = buildLexiconConstraint(lexicon);

  return `## המשימה
שאילתת מטרה: "${query}"
סוג פעולה: ${actionType}
עמוד קיים לשיפור: ${urlSlug}
עדיפות: ${priority}
מצב יישום: ${implementationMode === 'enhance' ? 'הוספה לעמוד קיים' : 'עמוד חדש'}
${lexiconBlock}

${typeInstructions[actionType] || typeInstructions.faq_block}

## הוראות נוספות
- התוכן יופיע ב-${urlSlug} — התאימי אותו לנושא העמוד
- כתבי כך שגוגל תרצה לצטט את התשובה שלנו ב-AI Overview
- הוסיפי בטבעיות את שם העסק/קורסים בהתאם לאוצר המילים מהעמוד
- JSON-LD צריך להיות אובייקט אחד תקין (לא מערך)`;
}

// ── Cannibalization safety net ───────────────────────────────────────────────
// Even with the guarded instructions above, the model can still slip and emit
// a general-definition heading or FAQPage question for the bare query — the
// exact pattern that duplicates the intent of the page that should own it.
// When cannibalReasons is non-empty, scan the generated output and refuse to
// write the action file if this pattern is found.
function detectGeneralDefinitionLeak(content, query) {
  const normalizedQuery = query.trim().toLowerCase();

  const defHeadingRe = /<h[23][^>]*>\s*(?:מה זה|מהו|מהי)\s+([^<]+?)\s*\??\s*<\/h[23]>/gi;
  const html = content.hebrewContent || '';
  for (const m of html.matchAll(defHeadingRe)) {
    if (m[1].trim().toLowerCase() === normalizedQuery) {
      return `heading "${m[0].replace(/<[^>]+>/g, '').trim()}"`;
    }
  }

  const jsonLd = content.jsonLd;
  const entities = [];
  if (jsonLd) {
    if (Array.isArray(jsonLd.mainEntity)) entities.push(...jsonLd.mainEntity);
    else if (jsonLd.mainEntity) entities.push(jsonLd.mainEntity);
    if (jsonLd['@type'] === 'Question' && jsonLd.name) entities.push(jsonLd);
  }
  for (const e of entities) {
    const name = String(e?.name || '').trim();
    const normName = name.toLowerCase();
    if (!name) continue;
    if (normName === normalizedQuery) return `JSON-LD Question.name "${name}"`;
    const stripped = normName.replace(/^(מה זה|מהו|מהי)\s+/, '').replace(/\?+\s*$/, '').trim();
    if (/^(מה זה|מהו|מהי)\s+/.test(normName) && stripped === normalizedQuery) {
      return `JSON-LD Question.name "${name}"`;
    }
  }

  return null;
}

// ── Anti-boilerplate filter ─────────────────────────────────────────────────
// HIGH + >=2 distinct hits refuses the write (caller logs + returns null).
// MEDIUM warns only. LOW is ignored.
function detectBoilerplatePatterns(content, priority) {
  const html = content.hebrewContent || '';
  const patterns = [
    "בעולם הדיגיטלי",
    "בשוק התחרותי",
    "כל עסק צריך",
    "חשוב לזכור ש",
    "אין ספק ש",
    "בסופו של דבר",
    "קהל היעד הוא אנשים ש",
    "אנשים שמחפשים שינוי",
    "רוצים להצליח",
    "לממש את הפוטנציאל",
    "לשפר את החיים",
    "מסע אישי"
  ];
  const matched = patterns.filter(p => html.includes(p));

  if (priority === 'MEDIUM' && matched.length) {
    console.warn(`     ⚠ boilerplate patterns: ${matched.join(', ')}`);
  }

  if (priority === 'HIGH' && matched.length >= 2) {
    return matched;
  }
  return null;
}

// ── Schema.org JSON-LD validity gate ────────────────────────────────────────
// Deterministic, no LLM. Records schemaValid/schemaErrors; never refuses.
function validateJsonLd(jsonLd, actionType) {
  const errors = [];

  if (jsonLd == null || typeof jsonLd !== 'object' || Array.isArray(jsonLd)) {
    return { valid: false, errors: ['jsonLd must be a non-null object, not an array'] };
  }

  const rawType = jsonLd['@type'];
  const type = Array.isArray(rawType)
    ? rawType.find(t => typeof t === 'string' && t.trim())
    : rawType;
  if (typeof type !== 'string' || !type.trim()) {
    return { valid: false, errors: ['jsonLd missing @type'] };
  }

  const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
  const present = (v) => v != null && (typeof v !== 'string' || v.trim().length > 0);

  if (type === 'FAQPage') {
    const entities = jsonLd.mainEntity;
    if (!Array.isArray(entities) || entities.length === 0) {
      errors.push('FAQPage.mainEntity missing or empty');
    } else {
      entities.forEach((item, i) => {
        const path = `FAQPage.mainEntity[${i}]`;
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          errors.push(`${path} is not an object`);
          return;
        }
        if (item['@type'] !== 'Question') {
          errors.push(`${path} @type is not Question`);
        }
        if (!nonEmpty(item.name)) {
          errors.push(`${path} missing name`);
        }
        const answer = item.acceptedAnswer;
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
          errors.push(`${path} missing acceptedAnswer`);
        } else {
          if (answer['@type'] !== 'Answer') {
            errors.push(`${path} acceptedAnswer.@type is not Answer`);
          }
          if (!nonEmpty(answer.text)) {
            errors.push(`${path} missing acceptedAnswer.text`);
          }
        }
      });
    }
  } else if (type === 'LocalBusiness' || type.includes('Business')) {
    if (!nonEmpty(jsonLd.name)) errors.push(`${type} missing name`);
    if (!present(jsonLd.address)) errors.push(`${type} missing address`);
  } else if (type === 'DefinedTerm') {
    if (!nonEmpty(jsonLd.name)) errors.push('DefinedTerm missing name');
    if (!nonEmpty(jsonLd.description)) errors.push('DefinedTerm missing description');
  } else if (type === 'Course') {
    if (!nonEmpty(jsonLd.name)) errors.push('Course missing name');
    if (!present(jsonLd.provider)) errors.push('Course missing provider');
  } else {
    errors.push(`unvalidated @type: ${type}`);
    return { valid: true, errors };
  }

  void actionType;
  return { valid: errors.length === 0, errors };
}

// Aggregates the recorded gate signals into a 0-100 confidence and a ship decision.
// Deterministic, no LLM. Hard blockers force 'review' regardless of score.
function scoreConfidence(finalContent) {
  const reasons = [];
  const hardBlockers = [];

  // ── Hard blockers → always human review (never auto-ship) ──
  if (finalContent.schemaValid === false) {
    hardBlockers.push(`schema invalid (${(finalContent.schemaErrors ?? []).join('; ') || 'unspecified'})`);
  }
  if (finalContent.groundingRisk === 'high') {
    hardBlockers.push(`grounding risk high (${(finalContent.factualClaims ?? []).join('; ') || 'unverified claims'})`);
  }
  // (boilerplate ≥2 on HIGH priority is already refused upstream — never reaches here.)

  // ── Soft confidence: start at 100, subtract graded penalties ──
  let confidence = 100;

  // registerScore is the main quality signal. Anything below 90 costs points 1:1.
  if (typeof finalContent.registerScore === 'number') {
    const regPenalty = Math.max(0, 90 - finalContent.registerScore);
    if (regPenalty > 0) {
      confidence -= regPenalty;
      reasons.push(`register ${finalContent.registerScore} (-${regPenalty})`);
    }
  }

  // Medium grounding risk: real but not disqualifying.
  if (finalContent.groundingRisk === 'med') {
    confidence -= 15;
    reasons.push('grounding risk med (-15)');
  }

  // Vocab violations: -5 each, capped at -20.
  const vocabCount = (finalContent.vocabViolations ?? []).length;
  if (vocabCount > 0) {
    const vocabPenalty = Math.min(20, vocabCount * 5);
    confidence -= vocabPenalty;
    reasons.push(`${vocabCount} vocab violation(s) (-${vocabPenalty})`);
  }

  confidence = Math.max(0, Math.min(100, confidence));

  // ── Decision: hard blocker OR below threshold → review ──
  const THRESHOLD = 85;
  let decision;
  if (hardBlockers.length) {
    decision = 'review';
    reasons.unshift(...hardBlockers.map(b => `BLOCKER: ${b}`));
  } else if (confidence >= THRESHOLD) {
    decision = 'autoship';
  } else {
    decision = 'review';
    reasons.push(`confidence ${confidence} < ${THRESHOLD}`);
  }

  return { confidence, decision, reasons };
}

// ── Slug from query ───────────────────────────────────────────────────────────
function queryToSlug(query) {
  return query
    .replace(/\s+/g, '-')
    .replace(/[^֐-׿a-zA-Z0-9-]/g, '')
    .slice(0, 40)
    .toLowerCase();
}

// ── Status-preserving overwrite + archive (never clobber, never delete) ───────
// A client may open a WhatsApp link to an old actionId hours/days after a
// regeneration re-ranks the pareto list. Protected actions (already
// approved/sent/done/published) must never be touched. Everything else that
// would otherwise be silently replaced gets moved to tasks/geo/_archive/
// (stamped superseded) instead of overwritten in place — so the old actionId
// still resolves via findActionById reading the archive too.
const PROTECTED_STATUSES = new Set(['approved', 'sent', 'done', 'published']);
const ARCHIVE_DIR = path.join(ACTIONS_DIR, '_archive');

function outFileFor(rank, slug) {
  return path.join(ACTIONS_DIR, `${String(rank).padStart(2, '0')}-${slug}.json`);
}

// Archives one existing (already confirmed non-protected) action file: stamp
// it superseded, move it to _archive/, never delete it.
function archiveOneFile(filePath, existing, supersededBy) {
  const archived = {
    ...existing,
    status: 'superseded',
    supersededAt: new Date().toISOString(),
    ...(supersededBy ? { supersededBy } : {}),
  };
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARCHIVE_DIR, path.basename(filePath)), JSON.stringify(archived, null, 2), 'utf8');
  fs.unlinkSync(filePath);
  console.log(`  🗄  archived ${path.basename(filePath)} → _archive/ (status: superseded${supersededBy ? `, supersededBy: ${supersededBy}` : ''})`);
}

// Orphan sweep — only for full/top-N runs (never for a single --rank call,
// whose scope is intentionally just that one action). A re-ranked or
// re-slugged pareto run can leave a prior action's file sitting at a
// rank/slug path that no current opportunity writes to (e.g. a query moved
// from rank 3 to rank 5 — 03-<slug>.json is now stranded). Without this
// sweep that file would neither regenerate nor archive; it would just sit
// there forever, silently drifting from the current pareto set. Files that
// DO match a current opportunity's outFile path are left for
// generateAction() itself to archive-then-regenerate (see below) — this
// sweep only handles the leftovers that don't match anything in this run.
function archiveOrphanedActions(opportunities) {
  if (ONLY_RANK) return;
  if (!fs.existsSync(ACTIONS_DIR)) return;

  const currentOutFiles = new Set(
    opportunities.map((o) => path.basename(outFileFor(o.rank, queryToSlug(o.query))))
  );

  const files = fs.readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    if (currentOutFiles.has(file)) continue; // generateAction() handles this one directly

    const filePath = path.join(ACTIONS_DIR, file);
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.warn(`  ⚠ could not parse ${file} for orphan-sweep check, leaving in place: ${e.message}`);
      continue;
    }

    if (PROTECTED_STATUSES.has(existing.status)) continue; // never touch protected

    const replacement = opportunities.find(
      (o) => o.query === existing.query || o.rankingUrl === existing.rankingUrl
    );
    const supersededBy = replacement
      ? `${CLIENT_ID}-${replacement.rank}-${queryToSlug(replacement.query)}`
      : undefined;

    archiveOneFile(filePath, existing, supersededBy);
  }
}

// ── Generate one action ───────────────────────────────────────────────────────
async function generateAction(opportunity, client) {
  const { rank, query, rankingUrl, implementationMode, actionType, priority, score } = opportunity;
  const slug = queryToSlug(query);
  const outFile = outFileFor(rank, slug);
  const actionId = `${CLIENT_ID}-${rank}-${slug}`;

  if (fs.existsSync(outFile)) {
    let existing;
    try {
      existing = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    } catch (e) {
      console.warn(`  ⚠ #${rank} "${query}" — could not parse existing ${path.basename(outFile)}, leaving it in place untouched: ${e.message}`);
      return null;
    }

    if (PROTECTED_STATUSES.has(existing.status)) {
      console.log(`  🔒 #${rank} "${query}" — SKIPPED (protected status: ${existing.status})`);
      return null;
    }

    // Non-protected: archive it (this same call is about to write the fresh
    // replacement under the identical actionId) before regenerating.
    archiveOneFile(outFile, existing, actionId);
  }

  const cannibalReasons = opportunity.cannibalReasons ?? [];
  const geoMode      = cannibalReasons.includes('HEAD_TERM_ON_LOCATION');
  const multiUrlMode = !geoMode && cannibalReasons.includes('MULTI_URL');
  if (geoMode)      console.log(`  🔀 #${rank} "${query}" — HEAD_TERM_ON_LOCATION → switching to geo-FAQ mode`);
  else if (multiUrlMode) console.log(`  🔀 #${rank} "${query}" — MULTI_URL cannibalization → narrowing to non-overlapping facet`);
  console.log(`  ⚙  #${rank} "${query}" [${actionType}${geoMode ? '/GEO' : multiUrlMode ? '/NARROW' : ''}] → crawling ${rankingUrl}...`);

  // Step 0: crawl the target page for vocabulary grounding
  const lexicon = await extractLexicon(rankingUrl, PAGES_DIR);
  const vocabSource = lexicon.source;
  if (vocabSource === 'page') {
    console.log(`     ✓ lexicon: selfRef=[${lexicon.selfReference.slice(0,3).join(', ')}] services=[${lexicon.serviceTerms.slice(0,5).join(', ')}]`);
  } else {
    console.log(`     ⚠ lexicon fallback (${vocabSource}) — using client.json only`);
  }

  console.log(`     → Tamar...`);

  // Step 1: Tamar generates content (Gemini primary, Qwen fallback)
  let tamarResult;
  let tamarVia;
  try {
    const tamarCall = await callGeminiThenQwen(
      tamarPrompt(client),
      buildUserMessage(opportunity, client, lexicon),
      2000
    );
    tamarResult = tamarCall.result;
    tamarVia = tamarCall.generatedVia;
  } catch (err) {
    console.error(`  ❌ Tamar failed for #${rank}: ${err.message}`);
    return null;
  }

  if (!tamarResult.hebrewContent) {
    console.error(`  ❌ Tamar returned no content for #${rank}:`, JSON.stringify(tamarResult).slice(0, 200));
    return null;
  }

  const boilerplateHits = detectBoilerplatePatterns(tamarResult, opportunity.priority);
  if (boilerplateHits) {
    console.error(`  ❌ #${rank} "${query}" — boilerplate filter triggered: ${boilerplateHits.join(', ')}. Refusing to write action file.`);
    return null;
  }

  console.log(`     ✓ Tamar done (via ${viaLogLabel(tamarVia)}) → Noa...`);

  const clientFacts = [client.brandName, client.businessNiche, client.topService, client.targetLocation, client.usp].filter(Boolean).join(' | ');

  // Step 2: Noa proofreads + vocab QA (Gemini primary, Qwen fallback)
  let noaResult;
  let noaVia = null;
  try {
    const noaCall = await callGeminiThenQwen(
      noaPrompt(lexicon, client.brandName, clientFacts),
      JSON.stringify({
        hebrewContent: tamarResult.hebrewContent,
        placementInstruction: tamarResult.placementInstruction,
        metaDescription: tamarResult.metaDescription,
      }),
      1500,
      2,
      { think: false }
    );
    noaResult = noaCall.result;
    noaVia = noaCall.generatedVia;
    console.log(`     ✓ Noa done (via ${viaLogLabel(noaVia)})`);
  } catch (err) {
    console.warn(`  ⚠  Noa failed for #${rank}, using Tamar output: ${err.message}`);
    noaResult = null;
  }

  const vocabViolations = noaResult?.vocabViolations ?? [];
  if (vocabViolations.length) {
    console.warn(`     ⚠ vocab violations: ${vocabViolations.join(', ')}`);
  }

  const finalContent = {
    hebrewContent:        noaResult?.hebrewContent        || tamarResult.hebrewContent,
    placementInstruction: noaResult?.placementInstruction || tamarResult.placementInstruction,
    metaDescription:      noaResult?.metaDescription      || tamarResult.metaDescription,
    jsonLd:               tamarResult.jsonLd,
    tamarNotes:           tamarResult.tamarNotes,
    noaChanges:           noaResult?.noaChanges || null,
    vocabViolations:      vocabViolations.length ? vocabViolations : undefined,
    registerScore:        typeof noaResult?.registerScore === "number" ? noaResult.registerScore : undefined,
    registerFlags:        noaResult?.registerFlags?.length ? noaResult.registerFlags : undefined,
    groundingRisk:        noaResult?.groundingRisk ?? undefined,
    factualClaims:        noaResult?.factualClaims?.length ? noaResult.factualClaims : undefined,
    generatedVia:         (tamarVia.startsWith('fallback:') || (noaVia && noaVia.startsWith('fallback:')))
      ? `fallback:${QWEN_MODEL}`
      : `primary:${GEMINI_MODEL}`,
  };

  const schema = validateJsonLd(finalContent.jsonLd, actionType);
  finalContent.schemaValid = schema.valid;
  finalContent.schemaErrors = schema.errors.length ? schema.errors : undefined;
  if (!schema.valid) {
    console.warn(`     ⚠ schema invalid: ${schema.errors.join(', ')}`);
  }

  if (typeof finalContent.registerScore === "number" && finalContent.registerScore < 70) {
    console.warn(`     ⚠ register score ${finalContent.registerScore}: ${(finalContent.registerFlags ?? []).join(', ')}`);
  }

  if (finalContent.groundingRisk === "high") {
    console.warn(`     ⚠ grounding risk high: ${(finalContent.factualClaims ?? []).join(', ')}`);
  }

  const conf = scoreConfidence(finalContent);
  finalContent.confidence = conf.confidence;
  finalContent.shipDecision = conf.decision;
  finalContent.reviewReasons = conf.reasons.length ? conf.reasons : undefined;
  if (conf.decision === 'autoship') {
    console.log(`     ✅ confidence ${conf.confidence} — auto-ship`);
  } else {
    console.warn(`     🔶 confidence ${conf.confidence} — needs review: ${conf.reasons.join(' | ')}`);
  }

  // Safety net: refuse to ship a cannibalization-flagged action that still
  // contains a bare general-definition pattern (see 07-nlp.json incident —
  // "מהו NLP?" duplicating retter.co.il/nlp/'s intent).
  if (cannibalReasons.length) {
    const leak = detectGeneralDefinitionLeak(finalContent, query);
    if (leak) {
      console.error(`  ❌ #${rank} "${query}" — cannibalization safety net triggered: general-definition leak in ${leak}. Refusing to write action file.`);
      return null;
    }
  }

  const action = {
    actionId,
    clientId:           CLIENT_ID,
    rank,
    query,
    rankingUrl,
    implementationMode,
    actionType,
    priority,
    score,
    impressions:        opportunity.impressions,
    clicks:             opportunity.clicks,
    ctr:                opportunity.ctr,
    status:             'generated',
    shipDecision:       finalContent.shipDecision,
    confidence:         finalContent.confidence,
    generatedAt:        new Date().toISOString(),
    vocabSource:        lexicon.source,
    vocabConfidence:    lexicon.source === 'page' ? 'high' : 'low',
    cannibalFlag:       opportunity.cannibalFlag,
    cannibalReasons:    cannibalReasons.length ? cannibalReasons : undefined,
    cannibalUrls:       opportunity.cannibalUrls,
    content:            finalContent,
  };

  fs.mkdirSync(ACTIONS_DIR, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(action, null, 2), 'utf8');
  console.log(`     ✅ #${rank} saved → ${path.relative(process.cwd(), outFile)}`);
  return action;
}

// ── Concurrency pool ──────────────────────────────────────────────────────────
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let i = 0;

  async function runNext() {
    if (i >= tasks.length) return;
    const idx = i++;
    results[idx] = await tasks[idx]();
    await runNext();
  }

  await Promise.all(Array.from({ length: limit }, runNext));
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n=== WAO GEO Content Generation ===`);
  console.log(`Client: ${CLIENT_ID}\n`);

  if (!fs.existsSync(PARETO_FILE)) throw new Error(`Pareto file not found: ${PARETO_FILE}\nRun: node scripts/gsc-pareto.mjs --client=${CLIENT_ID}`);
  if (!fs.existsSync(CLIENT_FILE)) throw new Error(`Client context not found: ${CLIENT_FILE}`);

  const pareto  = JSON.parse(fs.readFileSync(PARETO_FILE, 'utf8'));
  const client  = JSON.parse(fs.readFileSync(CLIENT_FILE, 'utf8'));

  let opportunities = pareto.opportunities;
  if (ONLY_RANK) {
    opportunities = opportunities.filter(o => o.rank === ONLY_RANK);
    if (!opportunities.length) throw new Error(`Rank ${ONLY_RANK} not found in pareto.json`);
  } else {
    opportunities = opportunities.slice(0, TOP_N);
  }

  // Archive-safe overwrite: sweep any orphaned prior actions (left stranded
  // by a re-ranked/re-slugged pareto run) out of the way before generating.
  // Files that directly correspond to this run's opportunities are archived
  // individually by generateAction() itself, right before each rewrite.
  // Protected (approved/sent/done/published) actions are never touched by
  // either path.
  archiveOrphanedActions(opportunities);

  console.log(`Generating ${opportunities.length} action(s) with concurrency ${CONCURRENCY}...\n`);

  const tasks = opportunities.map(opp => () => generateAction(opp, client));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const generatedActions = results.filter(Boolean);
  const generated = generatedActions.length;
  const skipped   = results.filter(r => r === null).length;
  const geminiPrimary = generatedActions.filter(a => String(a.content?.generatedVia || '').startsWith('primary:')).length;
  const qwenFallback  = generatedActions.filter(a => String(a.content?.generatedVia || '').startsWith('fallback:')).length;

  console.log(`\n─────────────────────────────────`);
  console.log(`Done. Generated: ${generated} | Skipped: ${skipped}`);
  console.log(`Providers this run: Gemini-primary: ${geminiPrimary} | Qwen-fallback: ${qwenFallback}`);
  console.log(`Output: ${path.relative(process.cwd(), ACTIONS_DIR)}/`);
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
