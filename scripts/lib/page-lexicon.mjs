/**
 * page-lexicon.mjs — crawl a live URL and extract the vocabulary
 * the page actually uses, so content generation stays grounded in
 * the client's own language rather than the client.json description.
 *
 * Two entry points:
 *   extractLexicon(url, cacheDir)  — fetch a real page
 *   lexiconFromPersona(persona)    — build from a fictional persona object (batch verticals)
 */

import fs   from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_TTL_MS  = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_HE_CHARS  = 200;                        // below this → JS-rendered, degrade gracefully
const FETCH_TIMEOUT = 10_000;

// Hebrew stopwords — filtered out of topNouns
const HE_STOP = new Set([
  'של','את','על','הוא','היא','הם','הן','זה','זו','אלה','אנחנו','אתה','אני',
  'כי','אם','אבל','או','גם','רק','כל','לא','יש','אין','כן','מה','מי','איך',
  'כך','כן','עוד','כבר','רב','פי','מן','בין','אחר','אחרי','לפני','עם','אל',
  'מ','ב','ל','ה','ו','כ','ש','מי','יהיה','היה','היו','הייתה','להיות',
  'ניתן','כדי','כאשר','אשר','שהם','שהיא','שהוא','שאנחנו','עצמו','עצמה',
]);

// ── HTML stripping ─────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<(script|style|nav|footer|header)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'i'));
  return m ? stripHtml(m[1]).trim() : '';
}

function extractAllTags(html, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\s\S]*?)</${tag}>`, 'gi');
  const results = [];
  let m;
  while ((m = re.exec(html)) !== null) results.push(stripHtml(m[1]).trim());
  return results.filter(Boolean);
}

function extractMetaDescription(html) {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
         || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return m ? m[1].trim() : '';
}

// ── Top Hebrew nouns by frequency ─────────────────────────────────────────────
function topHebrewNouns(text, limit = 15) {
  const tokens = text.match(/[א-ת]{3,}/g) || [];
  const freq = {};
  for (const t of tokens) {
    if (!HE_STOP.has(t)) freq[t] = (freq[t] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

// ── Self-reference heuristic: most frequent brand-adjacent noun ───────────────
function extractSelfReference(h1, h2s, title) {
  // Collect candidate 2-3 word spans from headings; pick most frequent
  const headingText = [title, h1, ...h2s].join(' ');
  const spans = headingText.match(/[א-ת]{2,}(?:\s[א-ת]{2,}){0,2}/g) || [];
  const freq = {};
  for (const s of spans) {
    const clean = s.trim();
    if (clean.length > 2 && !HE_STOP.has(clean)) freq[clean] = (freq[clean] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([w]) => w);
}

// ── Cache helpers ──────────────────────────────────────────────────────────────
function cacheKey(url) {
  return crypto.createHash('sha1').update(url).digest('hex');
}

function readCache(cacheDir, url) {
  if (!cacheDir) return null;
  const file = path.join(cacheDir, `${cacheKey(url)}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - new Date(entry.cachedAt).getTime() < CACHE_TTL_MS) return entry.lexicon;
  } catch { /* stale or corrupt */ }
  return null;
}

function writeCache(cacheDir, url, lexicon) {
  if (!cacheDir) return;
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${cacheKey(url)}.json`);
  fs.writeFileSync(file, JSON.stringify({ cachedAt: new Date().toISOString(), url, lexicon }, null, 2));
}

// ── Main: fetch + extract ──────────────────────────────────────────────────────
export async function extractLexicon(url, cacheDir = null) {
  const cached = readCache(cacheDir, url);
  if (cached) return cached;

  let lexicon;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WAO-GEO-Bot/1.0)' },
    });
    clearTimeout(timer);

    const html = await res.text();
    const bodyText = stripHtml(html);
    const heChars = (bodyText.match(/[א-ת]/g) || []).length;

    if (heChars < MIN_HE_CHARS) {
      // JS-rendered or non-Hebrew — degrade gracefully
      lexicon = { source: 'fallback-js-rendered', url, selfReference: [], serviceTerms: [], topNouns: [] };
    } else {
      const title = extractTag(html, 'title');
      const h1    = extractTag(html, 'h1');
      const h2s   = extractAllTags(html, 'h2');
      const meta  = extractMetaDescription(html);
      const headingText = [h1, ...h2s].join(' ');

      lexicon = {
        source:        'page',
        url,
        title,
        h1,
        h2s,
        metaDescription: meta,
        selfReference: extractSelfReference(h1, h2s, title),
        serviceTerms:  topHebrewNouns(headingText, 10),
        topNouns:      topHebrewNouns(bodyText, 15),
      };
    }
  } catch (err) {
    lexicon = { source: 'fallback-error', url, error: err.message, selfReference: [], serviceTerms: [], topNouns: [] };
  }

  writeCache(cacheDir, url, lexicon);
  return lexicon;
}

// ── Persona constructor (batch-generate-verticals) ────────────────────────────
export function lexiconFromPersona(persona) {
  const services = (persona.services || []).flatMap(s => s.match(/[א-ת]{3,}/g) || []);
  return {
    source:        'persona',
    selfReference: [persona.businessName, ...(persona.businessName?.match(/[א-ת]{2,}/g) || [])].filter(Boolean).slice(0, 3),
    serviceTerms:  [...new Set(services)].slice(0, 10),
    topNouns:      [],
  };
}

// ── Prompt injection builder ───────────────────────────────────────────────────
export function buildLexiconConstraint(lexicon) {
  if (!lexicon || lexicon.source?.startsWith('fallback')) {
    return lexicon?.source === 'fallback-js-rendered' || lexicon?.source === 'fallback-error'
      ? '\n## הערה: לא הצלחנו לאחזר את העמוד — השתמשי בפרטי הלקוח בלבד.'
      : '';
  }

  const selfRef  = lexicon.selfReference.slice(0, 3).join('", "');
  const services = lexicon.serviceTerms.slice(0, 8).join(', ');

  return `
## אוצר מילים מחייב (נשלף מהעמוד עצמו)
העמוד מכנה את העסק: "${selfRef}" — השתמשי רק בצורות אלה. אל תמציאי כינויים חדשים (לא "מכון", לא "בית ספר" אם הם לא ברשימה).
מונחי שירות מהעמוד: ${services}
כלל ברזל: כל תיאור של העסק, השירות, או הקורס חייב להופיע ברשימה. אם מונח לא ברשימה — אל תשתמשי בו.`;
}
