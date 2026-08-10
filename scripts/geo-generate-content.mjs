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

// ── Gemini (fast, Hebrew-capable) — same caller shape as /api/bot & /api/site-bot ─
const GEMINI_API_KEY   = env.GEMINI_API_KEY;
const GEMINI_MODEL     = env.GEMINI_MODEL_NAME || 'gemini-3.5-flash';

// Note: unlike Azure's max_completion_tokens, we deliberately do NOT cap
// maxOutputTokens here — matches the established pattern in gemini-fast.ts
// and /api/bot's callGemini (neither caps it). A fixed budget carried over
// from Azure's tokenizer truncated Hebrew JSON output mid-string (Gemini's
// tokenizer + JSON-mode overhead differ). The `_legacyMaxTokens` param is
// kept only so call sites don't need updating; it's intentionally unused.
async function callGeminiOnce(systemPrompt, userMessage) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${JSON.stringify(data)}`);
  if (process.env.DEBUG_GEMINI) console.error('[DEBUG_GEMINI] finishReason=', data?.candidates?.[0]?.finishReason, 'usage=', JSON.stringify(data?.usageMetadata));
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return JSON.parse(extractJsonSpan(raw)); // throws on malformed JSON — caller retries
}

// Gemini occasionally emits malformed/unterminated JSON (stray trailing
// commentary after the object, observed 2026-08-09 during the Azure→Gemini
// migration) even in responseMimeType: 'application/json' mode. A same-
// prompt retry reliably produces well-formed JSON on the next attempt, so
// retry a few times before giving up — cheaper and simpler than trying to
// heuristically repair a broken JSON string.
async function callGemini(systemPrompt, userMessage, _legacyMaxTokens = 2000, attempts = 3) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGeminiOnce(systemPrompt, userMessage);
    } catch (e) {
      lastErr = e;
      if (process.env.DEBUG_GEMINI) console.error(`[DEBUG_GEMINI] attempt ${i + 1}/${attempts} failed:`, e.message);
    }
  }
  throw lastErr;
}

// ── Tamar system prompt ───────────────────────────────────────────────────────
function tamarPrompt(client) {
  return `אתה טמר, קופירייטר של WAO — מומחית בתוכן GEO/AIO לעסקים ישראלים.

המשימה שלך: לכתוב תוכן עברי מדויק שיופיע בתשובות ה-AI של גוגל ו-ChatGPT.

## הלקוח
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
function noaPrompt(lexicon) {
  const termList = lexicon?.source === 'page'
    ? `\n\n## אוצר מילים מחייב (מהעמוד)\nתיאורי עסק/שירות מורשים: ${[...lexicon.selfReference, ...lexicon.serviceTerms].slice(0, 12).join(', ')}\nאם תמצאי מונח תיאורי שאינו ברשימה — ציני אותו ב-vocabViolations.`
    : '';

  return `אתה נועה, עורכת השפה הישראלית של WAO.

תקבל תוכן שכתבה טמר. תפקידך:
1. לתקן עברית לא טבעית, מבנים מתורגמים, מילים פורמליות
2. לוודא שכל משפט שלם ותקין דקדוקית
3. לוודא את→ (קיים לפני מושא ישיר מיודע)
4. לוודא שימוש בגרשיים עבריים (״ ״) ולא ASCII
5. לתקן מקפים: em-dash ( — ) ולא מינוס${termList}

החזירי JSON:
{
  "hebrewContent": "...",        // התוכן המתוקן
  "placementInstruction": "...", // המשפט המתוקן
  "metaDescription": "...",      // התיאור המתוקן
  "noaChanges": "...",           // רשימת תיקונים שביצעת
  "vocabViolations": []          // מונחים שנמצאו בתוכן אך לא ברשימה המורשית (מערך מחרוזות, ריק אם אין)
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

// ── Slug from query ───────────────────────────────────────────────────────────
function queryToSlug(query) {
  return query
    .replace(/\s+/g, '-')
    .replace(/[^֐-׿a-zA-Z0-9-]/g, '')
    .slice(0, 40)
    .toLowerCase();
}

// ── Generate one action ───────────────────────────────────────────────────────
async function generateAction(opportunity, client) {
  const { rank, query, rankingUrl, implementationMode, actionType, priority, score } = opportunity;
  const slug = queryToSlug(query);
  const outFile = path.join(ACTIONS_DIR, `${String(rank).padStart(2, '0')}-${slug}.json`);

  if (fs.existsSync(outFile)) {
    console.log(`  ⏭  #${rank} "${query}" — already generated, skipping`);
    return null;
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

  // Step 1: Tamar generates content
  let tamarResult;
  try {
    tamarResult = await callGemini(
      tamarPrompt(client),
      buildUserMessage(opportunity, client, lexicon),
      2000
    );
  } catch (err) {
    console.error(`  ❌ Tamar failed for #${rank}: ${err.message}`);
    return null;
  }

  if (!tamarResult.hebrewContent) {
    console.error(`  ❌ Tamar returned no content for #${rank}:`, JSON.stringify(tamarResult).slice(0, 200));
    return null;
  }

  console.log(`     ✓ Tamar done → Noa...`);

  // Step 2: Noa proofreads + vocab QA
  let noaResult;
  try {
    noaResult = await callGemini(
      noaPrompt(lexicon),
      JSON.stringify({
        hebrewContent: tamarResult.hebrewContent,
        placementInstruction: tamarResult.placementInstruction,
        metaDescription: tamarResult.metaDescription,
      }),
      1500
    );
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
  };

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
    actionId:           `${CLIENT_ID}-${rank}-${slug}`,
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

  console.log(`Generating ${opportunities.length} action(s) with concurrency ${CONCURRENCY}...\n`);

  const tasks = opportunities.map(opp => () => generateAction(opp, client));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const generated = results.filter(Boolean).length;
  const skipped   = results.filter(r => r === null).length;

  console.log(`\n─────────────────────────────────`);
  console.log(`Done. Generated: ${generated} | Skipped: ${skipped}`);
  console.log(`Output: ${path.relative(process.cwd(), ACTIONS_DIR)}/`);
}

main().catch(err => {
  console.error('\n❌', err.message);
  process.exit(1);
});
