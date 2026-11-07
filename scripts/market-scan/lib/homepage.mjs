// R8 homepage-quality check (as revised by spec 2.5-2.7): robots.txt then one GET of the homepage
// per host, derived fields only. Raw HTML is parsed in memory and dropped; the cache stores
// booleans, counts and a platform label. The tag-stripped <title> / first <h1> text (<= 200 chars,
// needed for the per-cell city/service hits) goes to the private text store only (2.7).
// 30-day retention for both. No Hebrew literals in this file.
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
    return { status: res.status, finalUrl: current, contentType: res.headers?.get?.('content-type') ?? '', header: name => res.headers?.get?.(name) ?? null, text, bytes };
  }
  throw Object.assign(new Error('too many redirects'), { code: 'too_many_redirects' });
}

// TimeoutError / AbortError are DOMExceptions whose numeric `code` (23 / 20) is meaningless here.
const errorCode = err => (err?.name === 'TimeoutError' || err?.name === 'AbortError' ? 'timeout' : null) ?? err?.code ?? err?.cause?.code ?? 'fetch_failed';
// Spec 2.5 error classes: DNS NXDOMAIN (hard fail), timeout (not checked), connect/TLS (try the
// other scheme; both failing = hard fail). EAI_AGAIN is a transient resolver error, not NXDOMAIN.
export function errorClass(code) {
  if (code === 'timeout') return 'timeout';
  if (code === 'ENOTFOUND' || code === 'EAI_NONAME') return 'dns';
  if (code === 'too_many_redirects') return 'redirects';
  return 'connect';
}

// HOMEPAGE_SCHEMA 2 = spec 2.5-2.7 outcomes (ok / failed / blocked / timeout / skipped_robots) and
// no page text in the cache record (title / first h1 live in the private text store, 2.7).
export const HOMEPAGE_SCHEMA = 2;

// Challenge / bot-wall response (2.5): a header marker, or a small body with a challenge marker.
export function isChallenge(res, cfg) {
  const headers = cfg.challenge_headers ?? [];
  if (headers.some(h => res.header?.(h) !== null && res.header?.(h) !== undefined)) return true;
  if (res.bytes > (cfg.challenge_max_bytes ?? 4096)) return false;
  const body = String(res.text ?? '').toLowerCase();
  return (cfg.challenge_markers ?? []).some(m => body.includes(m.toLowerCase()));
}

// One request (redirects followed) -> { res } or { error: class, code }. Never throws.
async function attempt(url, { fetchImpl, cfg, maxBytes }) {
  try {
    const page = await getFollow(url, { fetchImpl, cfg: { ...cfg, max_bytes: maxBytes ?? cfg.max_bytes }, signal: AbortSignal.timeout(cfg.timeout_ms) });
    return { res: page };
  } catch (err) {
    const code = errorCode(err);
    return { error: errorClass(code), code };
  }
}

// Spec 2.5 retries: a timeout is retried `timeout_retries` times; a 5xx that is not a challenge
// is retried once. Returns the last outcome and the number of requests made.
async function attemptWithRetry(url, opts) {
  const { cfg } = opts;
  let out = await attempt(url, opts);
  let requests = 1;
  for (let i = 0; i < (cfg.timeout_retries ?? 1) && out.error === 'timeout'; i += 1) { out = await attempt(url, opts); requests += 1; }
  if (out.res && out.res.status >= 500 && !isChallenge(out.res, cfg)) { out = await attempt(url, opts); requests += 1; }
  return { ...out, requests };
}

const notChecked = (base, site_check, reason, extra = {}) => ({ ...base, site_check, reason, ...extra });
const failed = (base, reason, extra = {}) => ({ ...base, site_check: 'failed', reason, fetch_ok: false, https: false, viewport: false, ...extra });

// One host -> one derived record + its private text ({ title, h1 } or null). Never throws.
// Order per scheme (2.6): GET /robots.txt, then GET /. HTTPS first; HTTP only when HTTPS cannot
// connect (connection / TLS failure), worst case 4 requests on a host with broken HTTPS.
// 3.1.6: `path` (default "/") = the listed URL's path + query; a non-root fetch stamps the record
// with `key` (host + path, its cache key) and `fetched_path`, and robots.txt is judged for it.
export async function checkHomepageFull(host, { fetchImpl, cfg, now = () => new Date(), clock = () => performance.now(), path: pagePath = '/' }) {
  const deep = pagePath !== '/';
  const base = { schema: HOMEPAGE_SCHEMA, host, ...(deep ? { key: `${host}${pagePath}`, fetched_path: pagePath } : {}), checked_at: now().toISOString() };
  const schemes = cfg.http_fallback === false ? ['https'] : ['https', 'http'];
  const notCheckedStatuses = new Set(cfg.not_checked_statuses ?? [202, 401, 403, 429]);
  const robotsCfg = cfg.robots ?? {};
  let requests = 0;
  let lastConnect = null;
  for (const scheme of schemes) {
    if (cfg.respect_robots !== false) {
      const r = await attemptWithRetry(`${scheme}://${host}${robotsCfg.path ?? '/robots.txt'}`, { fetchImpl, cfg, maxBytes: 256 * 1024 });
      requests += r.requests;
      if (r.error === 'dns') return { record: failed(base, 'dns_nxdomain', { requests }), text: null };
      if (r.error === 'connect') { lastConnect = r.code; continue; }
      if (r.error === 'timeout') return { record: notChecked(base, 'timeout', 'robots_timeout', { requests }), text: null };
      if (r.error === 'redirects') return { record: notChecked(base, 'skipped_robots', 'robots_unreachable', { requests }), text: null };
      const res = r.res;
      if (isChallenge(res, cfg) || res.status === 202) return { record: notChecked(base, 'blocked', `robots_challenge_${res.status}`, { requests, status: res.status }), text: null };
      // RFC 9309: 4xx -> no restriction; 5xx / unreachable -> treat as disallowed.
      if (res.status >= 500) return { record: notChecked(base, 'skipped_robots', `robots_${res.status}`, { requests, status: res.status }), text: null };
      if (res.status >= 200 && res.status < 300 && !/html/i.test(res.contentType) && !robotsAllows(res.text, robotsCfg.ua_token ?? cfg.user_agent, pagePath.split('?')[0])) {
        return { record: notChecked(base, 'skipped_robots', 'robots_disallow', { requests }), text: null };
      }
    }
    const t0 = clock();
    const p = await attemptWithRetry(`${scheme}://${host}${pagePath}`, { fetchImpl, cfg });
    requests += p.requests;
    const fetchMs = Math.round(clock() - t0);
    if (p.error === 'dns') return { record: failed(base, 'dns_nxdomain', { requests }), text: null };
    if (p.error === 'connect') { lastConnect = p.code; continue; }
    if (p.error === 'timeout') return { record: notChecked(base, 'timeout', 'timeout_twice', { requests }), text: null };
    if (p.error === 'redirects') return { record: failed(base, 'too_many_redirects', { requests }), text: null };
    const page = p.res;
    const status = page.status;
    // A bot wall says nothing about what a customer's phone sees -> not checked, never failed.
    if (isChallenge(page, cfg)) return { record: notChecked(base, 'blocked', `challenge_${status}`, { requests, status }), text: null };
    if (notCheckedStatuses.has(status)) return { record: notChecked(base, 'blocked', `status_${status}`, { requests, status }), text: null };
    if (status === 404 || status === 410) return { record: failed(base, 'status_404_410', { requests, status }), text: null };
    if (status >= 500) return { record: failed(base, 'status_5xx_after_retry', { requests, status }), text: null };
    // Engineer reading (flagged in the M4 report): other 4xx (400, 405, 406, ...) are typical of
    // UA filtering, not of a broken site -> not checked.
    if (status >= 400) return { record: notChecked(base, 'blocked', `status_${status}`, { requests, status }), text: null };
    const isHtml = /html/i.test(page.contentType) || /<html[\s>]/i.test(page.text.slice(0, 2048));
    const ok2xx = status >= 200 && status < 300;
    const derived = ok2xx && isHtml ? analyzeHtml(page.text, page, cfg) : { viewport: false, title: '', h1: '', internal_paths: 0, platform: null, parked: false };
    if (derived.parked) return { record: failed(base, 'parked', { requests, status }), text: null };
    const finalUrl = new URL(page.finalUrl);
    return {
      record: {
        ...base,
        site_check: 'ok',
        scheme_tried: scheme,
        status,
        final_host: finalUrl.hostname,
        fetch_ok: ok2xx && isHtml,
        parked: false,
        https: finalUrl.protocol === 'https:',
        viewport: derived.viewport,
        internal_paths: derived.internal_paths,
        multi_page: derived.internal_paths >= cfg.multi_page_min_internal_paths,
        fetch_ms: fetchMs,
        fetch_ms_note: 'rough: measured from the scanner host, not a phone',
        platform: derived.platform,
        bytes: page.bytes,
        requests,
      },
      text: { title: derived.title, h1: derived.h1 },
    };
  }
  return { record: failed(base, 'connect_or_tls_both_schemes', { error: lastConnect, requests }), text: null };
}

// ---- 3.1.6 listed URL ---------------------------------------------------------------------------
// The URL a listing points at: its `url` as-is, or (unjoined Local Finder item) the real URL inside
// a Google redirect's url/q parameter (the opaque goto?url=CAES... form yields none). null = none.
export function listedUrlOf(url, redirect) {
  let u;
  try { u = new URL(url ?? ''); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  if (!redirect) return u.href;
  const inner = u.searchParams.get('url') ?? u.searchParams.get('q');
  if (!inner || !/^https?:\/\//i.test(inner)) return null;
  try { return new URL(inner).href; } catch { return null; }
}
// root_listed: the listed URL's path is "" or "/" (query and fragment ignored). No listed URL = the
// listing names the host only = root.
export function rootListed(listedUrl) {
  if (!listedUrl) return true;
  try { const p = new URL(listedUrl).pathname; return p === '' || p === '/'; } catch { return true; }
}
// The homepage-check target of a listing: root-listed -> the host (the legacy cache key); otherwise
// key = host + the listed path + query, fetched by future online runs (homepage_check.fetch:
// "listed_url").
export function checkTarget(host, listedUrl) {
  if (rootListed(listedUrl)) return { key: host, host, path: '/' };
  const u = new URL(listedUrl);
  const p = `${u.pathname}${u.search}`;
  return { key: `${host}${p}`, host, path: p };
}
// Record for a target: the listed-URL record when cached (`listed: true`), else the host-root record
// (`listed` = whether the root IS the listed URL). checks: Map key -> record.
export function resolveCheck(checks, target) {
  if (target.key !== target.host && checks.has(target.key)) return { check: checks.get(target.key), key: target.key, listed: true, deep: true };
  return { check: checks.get(target.host), key: target.host, listed: target.key === target.host, deep: false };
}
// 3.1.6 outcome of a listing (homepage_check.site_dead_rule "listed_url"): confirmed NXDOMAIN stays
// site_dead (the whole host is gone); parked / 404-410 are site_dead only when the record judged
// the listed URL - root-listed, or (future online runs) a 404/410 on the fetched deep listed URL.
// Otherwise `root_only_inconclusive`. Without the rule: siteOutcome() unchanged.
export function listingOutcome(check, cfg, res) {
  const o = siteOutcome(check, cfg);
  if (o !== 'site_dead' || cfg?.site_dead_rule !== 'listed_url' || check.reason === 'dns_nxdomain') return o;
  if (res?.listed && !res.deep) return o;
  if (res?.listed && res.deep && check.reason === 'status_404_410') return o;
  return 'root_only_inconclusive';
}

// Back-compat wrapper: the derived record only.
export async function checkHomepage(host, opts) {
  return (await checkHomepageFull(host, opts)).record;
}

// 3.5 outcome of a cached record: `site_dead` = NXDOMAIN confirmed by a second resolver (DoH),
// parked, or 404/410 (configured in homepage_check.site_dead); every other `failed` stays `failed`.
// An unconfirmed NXDOMAIN (local resolver only) is `failed`. Without the config: legacy outcomes.
export function siteOutcome(check, cfg) {
  if (!check) return null;
  if (check.site_check !== 'failed') return check.site_check;
  const dead = cfg?.site_dead;
  if (!Array.isArray(dead)) return 'failed';
  if (check.reason === 'dns_nxdomain') return dead.includes('dns_nxdomain_confirmed') && check.nxdomain_confirmed === true ? 'site_dead' : 'failed';
  return dead.includes(check.reason) ? 'site_dead' : 'failed';
}

// 3.5 second-resolver confirmation of a cached `dns_nxdomain` record over DNS-over-HTTPS (free).
// Status 3 = NXDOMAIN (confirmed); Status 0 = the name resolves elsewhere (the caller re-fetches
// the homepage once); anything else = unconfirmed. Never throws.
export const DOH_RESOLVERS = {
  google: host => `https://dns.google/resolve?name=${encodeURIComponent(host)}&type=A`,
  cloudflare: host => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`,
};
export async function dohStatus(host, { fetchImpl, resolver = 'google', timeoutMs = 10000 }) {
  try {
    const res = await fetchImpl(DOH_RESOLVERS[resolver](host), { headers: { Accept: 'application/dns-json' }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { status: null, error: `http_${res.status}` };
    const body = await res.json();
    return { status: typeof body.Status === 'number' ? body.Status : null, answers: (body.Answer ?? []).length };
  } catch (err) {
    return { status: null, error: err?.name ?? 'fetch_failed' };
  }
}

// Confirms every cached dns_nxdomain record once (idempotent: records with doh_status are skipped).
// Resolves elsewhere -> one re-fetch (checkHomepageFull) replaces the record.
export async function confirmNxdomains({ cache, textStore = null, fetchImpl, siteFetchImpl = fetchImpl, cfg, now = () => new Date(), resolvers = ['google', 'cloudflare'], log = () => {} }) {
  const out = { candidates: 0, confirmed: 0, resolves_refetched: 0, refetch_outcomes: {}, unconfirmed: 0 };
  for (const key of cache.hosts().sort()) {
    const rec = cache.get(key);
    if (!rec || rec.reason !== 'dns_nxdomain' || rec.doh_status !== undefined) continue;
    const host = rec.host ?? key;
    out.candidates += 1;
    let r = null;
    let used = null;
    for (const name of resolvers) {
      r = await dohStatus(host, { fetchImpl, resolver: name });
      used = name;
      if (r.status === 0 || r.status === 3) break;
    }
    const stamp = { doh_status: r.status, doh_resolver: used, doh_checked_at: now().toISOString() };
    if (r.status === 3) { cache.set(key, { ...rec, ...stamp, nxdomain_confirmed: true }); out.confirmed += 1; continue; }
    if (r.status === 0) {
      const { record, text } = await checkHomepageFull(host, { fetchImpl: siteFetchImpl, cfg, now, path: rec.fetched_path ?? '/' });
      const next = { ...record, ...stamp, nxdomain_confirmed: false, nxdomain_refetched: true };
      cache.set(key, next);
      if (textStore && text) textStore.set(key, { host, checked_at: record.checked_at, title: text.title.slice(0, 200), first_h1: text.h1.slice(0, 200) });
      out.resolves_refetched += 1;
      const k = `${record.site_check}:${record.reason ?? ''}`;
      out.refetch_outcomes[k] = (out.refetch_outcomes[k] ?? 0) + 1;
      continue;
    }
    cache.set(key, { ...rec, ...stamp, nxdomain_confirmed: false });
    out.unconfirmed += 1;
  }
  log(`nxdomain confirmation: ${JSON.stringify(out)}`);
  return out;
}

// R8 weak-site rule for one cell context (2.5 outcomes): not checked -> null (w_b 1.00);
// failed -> weak (hard); ok -> R8 hard / soft rule on the private title + first h1 text.
export function siteVerdict(check, ctxOrText, cfgOrCtx, maybeCfg) {
  // siteVerdict(check, text, ctx, cfg) - or legacy siteVerdict(check, ctx, cfg) with text on the record.
  const [text, ctx, cfg] = maybeCfg === undefined ? [check, ctxOrText, cfgOrCtx] : [ctxOrText, cfgOrCtx, maybeCfg];
  if (!check || ['skipped_robots', 'blocked', 'timeout'].includes(check.site_check)) return null;
  if (check.site_check === 'failed') return { city_hit: false, service_hit: false, hard: true, soft: null, weak_site: true };
  const { cityNames, titleTerms, cityHit } = ctx;
  const t = `${text?.title ?? ''} ${text?.h1 ?? ''}`;
  // 3.1.6: cityHit (title and h1 judged apart) = the 3.1.1 / 3.1.4 matcher; legacy = substring.
  const city_hit = cityHit ? Boolean(cityHit(text?.title ?? '') || cityHit(text?.h1 ?? '')) : cityNames.some(n => n && t.includes(n));
  const service_hit = titleTerms.some(x => x && t.includes(x));
  const hard = !check.fetch_ok || !check.https || !check.viewport;
  const soft = Number(!service_hit) + Number(!city_hit) + Number(!check.multi_page) + Number((check.fetch_ms ?? 0) > cfg.slow_fetch_ms);
  return { city_hit, service_hit, hard, soft, weak_site: hard || soft >= cfg.weak_soft_min };
}

// ---- cache (derived records only) + private text store (2.7) ----------------------------------
const hostFile = (dir, host) => path.join(dir, `${createHash('sha256').update(`homepage\n${host}`).digest('hex')}.json`);
function retentionStore(dir, maxAgeMs, now, valid = () => true) {
  const fresh = rec => rec && valid(rec) && now() - new Date(rec.checked_at) <= maxAgeMs;
  return {
    dir,
    get(host) {
      const f = hostFile(dir, host);
      if (!fs.existsSync(f)) return undefined;
      const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
      return fresh(rec) ? rec : undefined;
    },
    set(host, rec) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(hostFile(dir, host), JSON.stringify(rec));
    },
    // Keys of every fresh record (host, or 3.1.6 host + listed path; file names are hashes).
    hosts() {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir).map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter(fresh).map(r => r.key ?? r.host).filter(Boolean);
    },
    // 30-day retention, like the audit reports. Stale-schema records are dropped too.
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

export function homepageCache(cacheDir, cfg, now = () => new Date()) {
  return retentionStore(path.join(cacheDir, HOMEPAGE_CACHE_SUBDIR), cfg.cache_retention_days * 864e5, now, rec => (rec.schema ?? 1) >= HOMEPAGE_SCHEMA);
}

// Tag-stripped <title> and first <h1> (each <= 200 chars), private dir only, 30-day retention.
export const HOMEPAGE_TEXT_SUBDIR = 'homepage-text';
export function homepageTextStore(privateDir, cfg, now = () => new Date()) {
  const st = cfg.store_text_private ?? {};
  return retentionStore(path.join(privateDir, HOMEPAGE_TEXT_SUBDIR), (st.retention_days ?? cfg.cache_retention_days) * 864e5, now);
}

// targets: host strings (GET /) or 3.1.6 { key, host, path } (GET the listed URL), cached by key.
export async function runHomepageChecks(hosts, { cache, textStore = null, fetchImpl, cfg, now, log = () => {} }) {
  const byKey = new Map(hosts.map(t => (typeof t === 'string' ? { key: t, host: t, path: '/' } : t)).map(t => [t.key, t]));
  const queue = [...byKey.values()].filter(t => cache.get(t.key) === undefined).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const max = cfg.store_text_private?.max_chars ?? TEXT_MAX;
  let done = 0;
  async function worker() {
    while (queue.length) {
      const { key, host, path: pagePath } = queue.shift();
      const { record, text } = await checkHomepageFull(host, { fetchImpl, cfg, now, path: pagePath });
      cache.set(key, record);
      if (textStore && text) textStore.set(key, { host, checked_at: record.checked_at, title: text.title.slice(0, max), first_h1: text.h1.slice(0, max) });
      done += 1;
      if (done % 100 === 0) log(`homepage checks: ${done} fetched, ${queue.length} queued`);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, cfg.concurrency) }, worker));
  log(`homepage checks: ${done} fetched`);
  return done;
}
