// R8 homepage-quality check: one GET of the homepage per host (robots.txt first), derived fields
// only. Raw HTML is parsed in memory and dropped; the cache stores booleans, counts, a platform
// label and the tag-stripped <title> / first <h1> text (<= 200 chars, needed for the per-cell
// city/service hits). 30-day retention. No Hebrew literals in this file.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const HOMEPAGE_CACHE_SUBDIR = 'homepage';
const TEXT_MAX = 200;

const decodeEntities = s => s
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
// Tag-stripped, entity-decoded, whitespace-collapsed text; never contains '<' or '>'.
export const plainText = html => decodeEntities(String(html ?? '').replace(/<[^>]*>/g, ' ')).replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX);

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
}

const SKIP_HREF = /^(#|tel:|mailto:|sms:|javascript:|whatsapp:|\?)/i;
const WHATSAPP_HOST = /(^|\.)(wa\.me|whatsapp\.com)$/i;

export function internalPaths(html, pageUrl) {
  const base = new URL(pageUrl);
  const host = base.hostname.replace(/^www\./, '');
  const paths = new Set();
  for (const m of String(html).matchAll(/<a\b[^>]*>/gi)) {
    const href = attr(m[0], 'href');
    if (!href || SKIP_HREF.test(href.trim())) continue;
    let u;
    try { u = new URL(href.trim(), base); } catch { continue; }
    if (!/^https?:$/.test(u.protocol) || WHATSAPP_HOST.test(u.hostname)) continue;
    if (u.hostname.replace(/^www\./, '') !== host) continue;
    const p = decodeURIComponent(u.pathname).replace(/\/+$/, '');
    if (!p) continue; // "/" (and query-only / hash-only links resolve to it)
    paths.add(p);
  }
  return paths.size;
}

export function detectPlatform(html, generator) {
  const g = String(generator ?? '');
  const h = String(html);
  if (/wix\.com|wixstatic\.com|wix-code|_wixCIDX/i.test(h) || /wix/i.test(g)) return 'wix';
  if (/elementor/i.test(g) || /\/wp-content\/plugins\/elementor/i.test(h)) return 'elementor';
  if (/wordpress/i.test(g) || /\/wp-content\/|\/wp-includes\//i.test(h)) return 'wordpress';
  if (/b144websites|b144sites|\.b144\.co\.il/i.test(h)) return 'b144websites';
  if (/sites\.google\.com|\/_\/atari\//i.test(h) || /google sites/i.test(g)) return 'google-sites';
  return 'other';
}

const PARKED_TITLE = /domain (name )?(is )?(may be )?for sale|buy this domain|this domain is (parked|available)|parked (free|domain)|domain parking/i;

// Derived fields from one HTML document (pure; the HTML itself is never returned).
export function analyzeHtml(html, { finalUrl, bytes }, cfg) {
  const metas = [...String(html).matchAll(/<meta\b[^>]*>/gi)].map(m => m[0]);
  const meta = name => metas.find(t => (attr(t, 'name') ?? '').toLowerCase() === name);
  const viewportTag = meta('viewport');
  const generatorTag = meta('generator');
  const titleM = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const h1M = String(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  const title = titleM ? plainText(titleM[1]) : '';
  const h1 = h1M ? plainText(h1M[1]) : '';
  const parked = (bytes <= cfg.parked_max_bytes && !h1M) || PARKED_TITLE.test(title);
  return {
    viewport: Boolean(viewportTag && /width\s*=\s*device-width/i.test(attr(viewportTag, 'content') ?? '')),
    title,
    h1,
    internal_paths: internalPaths(html, finalUrl),
    platform: detectPlatform(html, generatorTag ? attr(generatorTag, 'content') : null),
    parked,
  };
}

// robots.txt: the group for our product token if present, else `*`; longest matching rule wins,
// Allow beats Disallow on a tie. Returns true when `pathname` may be fetched.
export function robotsAllows(text, userAgent, pathname = '/') {
  const token = userAgent.split('/')[0].toLowerCase();
  const groups = [];
  let current = null;
  let lastWasAgent = false;
  for (const raw of String(text ?? '').split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else {
      lastWasAgent = false;
      if (current && (key === 'allow' || key === 'disallow')) current.rules.push({ allow: key === 'allow', path: value });
    }
  }
  const group = groups.find(g => g.agents.some(a => a !== '*' && token.includes(a))) ?? groups.find(g => g.agents.includes('*'));
  if (!group) return true;
  let best = null;
  for (const r of group.rules) {
    if (!r.path) continue; // "Disallow:" (empty) allows everything
    const re = new RegExp(`^${r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$')}`);
    if (!re.test(pathname)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

async function readCapped(res, maxBytes) {
  if (!res.body?.getReader) {
    const text = await res.text();
    return { text: text.slice(0, maxBytes), bytes: Math.min(Buffer.byteLength(text), maxBytes) };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    bytes += value.byteLength;
    if (bytes >= maxBytes) { await reader.cancel().catch(() => {}); break; }
  }
  const buf = Buffer.concat(chunks.map(c => Buffer.from(c))).subarray(0, maxBytes);
  return { text: buf.toString('utf8'), bytes: buf.length };
}

// GET with manual redirects (<= maxRedirects), one timeout for the whole chain, capped body.
async function getFollow(url, { fetchImpl, cfg, signal }) {
  let current = url;
  for (let hop = 0; hop <= cfg.max_redirects; hop += 1) {
    const res = await fetchImpl(current, {
      method: 'GET',
      redirect: 'manual',
      signal,
      headers: { 'User-Agent': cfg.user_agent, Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
    });
    const location = res.headers?.get?.('location');
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel?.().catch(() => {});
      current = new URL(location, current).href;
      continue;
    }
    const { text, bytes } = await readCapped(res, cfg.max_bytes);
    return { status: res.status, finalUrl: current, contentType: res.headers?.get?.('content-type') ?? '', text, bytes };
  }
  throw Object.assign(new Error('too many redirects'), { code: 'too_many_redirects' });
}

// TimeoutError / AbortError are DOMExceptions whose numeric `code` (23 / 20) is meaningless here.
const errorCode = err => (err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : null) ?? err?.cause?.code ?? (typeof err?.code === 'string' ? err.code : null) ?? 'fetch_failed';

// One host -> one derived record. Never throws.
export async function checkHomepage(host, { fetchImpl, cfg, now = () => new Date(), clock = () => performance.now() }) {
  const base = { host, checked_at: now().toISOString() };
  let lastError = null;
  for (const scheme of ['https', 'http']) {
    const signal = AbortSignal.timeout(cfg.timeout_ms);
    if (cfg.respect_robots) {
      try {
        const robots = await getFollow(`${scheme}://${host}/robots.txt`, { fetchImpl, cfg: { ...cfg, max_bytes: 256 * 1024 }, signal });
        if (robots.status >= 200 && robots.status < 300 && !/html/i.test(robots.contentType) && !robotsAllows(robots.text, cfg.user_agent, '/')) {
          return { ...base, site_check: 'skipped_robots' };
        }
      } catch (err) {
        // unreachable robots.txt = no restriction; the homepage fetch below reports the real error
        lastError = errorCode(err);
      }
    }
    const t0 = clock();
    try {
      const page = await getFollow(`${scheme}://${host}/`, { fetchImpl, cfg, signal: AbortSignal.timeout(cfg.timeout_ms) });
      const fetchMs = Math.round(clock() - t0);
      const isHtml = /html/i.test(page.contentType) || /<html[\s>]/i.test(page.text.slice(0, 2048));
      const ok2xx = page.status >= 200 && page.status < 300;
      const derived = ok2xx && isHtml ? analyzeHtml(page.text, page, cfg) : { viewport: false, title: '', h1: '', internal_paths: 0, platform: null, parked: false };
      const finalUrl = new URL(page.finalUrl);
      return {
        ...base,
        site_check: 'ok',
        scheme_tried: scheme,
        status: page.status,
        final_host: finalUrl.hostname,
        fetch_ok: ok2xx && isHtml && !derived.parked,
        parked: derived.parked,
        https: finalUrl.protocol === 'https:',
        viewport: derived.viewport,
        title: derived.title,
        h1: derived.h1,
        internal_paths: derived.internal_paths,
        multi_page: derived.internal_paths >= cfg.multi_page_min_internal_paths,
        fetch_ms: fetchMs,
        fetch_ms_note: 'rough: measured from the scanner host, not a phone',
        platform: derived.platform,
        bytes: page.bytes,
      };
    } catch (err) {
      lastError = errorCode(err);
    }
  }
  return { ...base, site_check: 'error', fetch_ok: false, https: false, viewport: false, error: lastError };
}

// R8 weak-site rule for one cell context.
export function siteVerdict(check, { cityNames, titleTerms }, cfg) {
  if (!check || check.site_check === 'skipped_robots') return null;
  const text = `${check.title ?? ''} ${check.h1 ?? ''}`;
  const city_hit = cityNames.some(n => n && text.includes(n));
  const service_hit = titleTerms.some(t => t && text.includes(t));
  const hard = !check.fetch_ok || !check.https || !check.viewport;
  const soft = Number(!service_hit) + Number(!city_hit) + Number(!check.multi_page) + Number((check.fetch_ms ?? 0) > cfg.slow_fetch_ms);
  return { city_hit, service_hit, hard, soft, weak_site: hard || soft >= cfg.weak_soft_min };
}

// ---- cache (derived records only) --------------------------------------------------------------
export function homepageCache(cacheDir, cfg, now = () => new Date()) {
  const dir = path.join(cacheDir, HOMEPAGE_CACHE_SUBDIR);
  const file = host => path.join(dir, `${createHash('sha256').update(`homepage\n${host}`).digest('hex')}.json`);
  const maxAgeMs = cfg.cache_retention_days * 864e5;
  const fresh = rec => rec && now() - new Date(rec.checked_at) <= maxAgeMs;
  return {
    dir,
    get(host) {
      const f = file(host);
      if (!fs.existsSync(f)) return undefined;
      const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
      return fresh(rec) ? rec : undefined;
    },
    set(host, rec) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(file(host), JSON.stringify(rec));
    },
    // 30-day retention, like the audit reports.
    purge() {
      if (!fs.existsSync(dir)) return 0;
      let n = 0;
      for (const f of fs.readdirSync(dir)) {
        const rec = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        if (!fresh(rec)) { fs.rmSync(path.join(dir, f)); n += 1; }
      }
      return n;
    },
  };
}

export async function runHomepageChecks(hosts, { cache, fetchImpl, cfg, now, log = () => {} }) {
  const queue = [...new Set(hosts)].filter(h => cache.get(h) === undefined).sort();
  let done = 0;
  async function worker() {
    while (queue.length) {
      const host = queue.shift();
      const rec = await checkHomepage(host, { fetchImpl, cfg, now });
      cache.set(host, rec);
      done += 1;
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, cfg.concurrency) }, worker));
  log(`homepage checks: ${done} fetched`);
  return done;
}
