/**
 * Site page-count signal — Readiness Gate §2.3.
 *
 * Source: a direct crawl of the known `siteUrl`, NEVER Google Search Console
 * — web-verified 2026-08-07 that GSC's API requires OAuth from a verified
 * property owner, a relationship WAO doesn't have pre-onboarding
 * (docs/specs/readiness-gate.md §2.3). This is a hard constraint, not a
 * build shortcut.
 *
 * Method, in priority order:
 *   1. `{siteUrl}/sitemap.xml` (resolving one level of child sitemaps if
 *      it's a sitemap index) → count `<url>` entries.
 *   2. No sitemap found: a shallow, same-domain, breadth-first crawl from
 *      the homepage, depth <= 2, capped at 50 pages, respecting robots.txt.
 *      Plain HTML fetch + link extraction — no headless browser, no JS
 *      rendering (matches this project's "no queue, no infra" posture).
 *   3. Both fail (no site, or blocked/timed out) → `siteFound: false`,
 *      `pageCount: null`, `method: 'none'` — itself a routing signal
 *      (routing rule 1), not an error state.
 *
 * Defaults (50-page cap, depth-2) are Lior's Q4 resolution: ship as-is,
 * tune only if real prospect crawls show systematic mis-bucketing near the
 * 15/30-page routing thresholds — not a pre-launch bikeshed.
 */

/** @typedef {{ siteFound: boolean, pageCount: number|null, method: 'sitemap'|'shallow-crawl'|'none', sitemapUrl?: string }} SiteCrawlResult */

async function fetchText(url, fetchImpl) {
  try {
    const res = await fetchImpl(url);
    if (!res || !res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function countUrlEntries(xml) {
  const matches = xml.match(/<url\b/gi);
  return matches ? matches.length : 0;
}

function extractSitemapIndexLocs(xml) {
  if (!/<sitemapindex/i.test(xml)) return null;
  return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].trim());
}

async function tryCrawlViaSitemap(base, fetchImpl) {
  const sitemapUrl = `${base}/sitemap.xml`;
  const xml = await fetchText(sitemapUrl, fetchImpl);
  if (!xml) return null;

  const childLocs = extractSitemapIndexLocs(xml);
  if (childLocs && childLocs.length > 0) {
    let total = 0;
    for (const loc of childLocs) {
      const childXml = await fetchText(loc, fetchImpl);
      if (childXml) total += countUrlEntries(childXml);
    }
    return { siteFound: true, pageCount: total, method: 'sitemap', sitemapUrl };
  }

  return { siteFound: true, pageCount: countUrlEntries(xml), method: 'sitemap', sitemapUrl };
}

/** Very small robots.txt parser — Disallow rules under `User-agent: *` (or the first block, if none is explicitly `*`). */
async function loadRobotsDisallow(base, fetchImpl) {
  const txt = await fetchText(`${base}/robots.txt`, fetchImpl);
  if (!txt) return [];

  const disallows = [];
  let inRelevantBlock = false;
  for (const rawLine of txt.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const sepIdx = line.indexOf(':');
    if (sepIdx === -1) continue;
    const key = line.slice(0, sepIdx).trim().toLowerCase();
    const value = line.slice(sepIdx + 1).trim();
    if (key === 'user-agent') {
      inRelevantBlock = value === '*';
    } else if (key === 'disallow' && inRelevantBlock && value) {
      disallows.push(value);
    }
  }
  return disallows;
}

function isDisallowed(pathname, disallows) {
  return disallows.some(rule => pathname.startsWith(rule));
}

function normalizeUrl(url) {
  return url.replace(/\/$/, '');
}

function extractLinks(html, base) {
  const hrefs = [...html.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => m[1]);
  const links = [];
  const baseOrigin = new URL(base).origin;
  for (const href of hrefs) {
    try {
      const url = new URL(href, base);
      if (url.origin !== baseOrigin) continue;
      url.hash = '';
      links.push(url.toString());
    } catch {
      // malformed href — skip
    }
  }
  return links;
}

async function shallowCrawl(base, { fetchImpl, maxPages, maxDepth }) {
  const baseHtml = await fetchText(base, fetchImpl);
  if (baseHtml === null) return null; // homepage itself unreachable

  const disallows = await loadRobotsDisallow(base, fetchImpl);
  const seenUrls = new Set([normalizeUrl(base)]);
  const discovered = new Set(); // pages found beyond the homepage — this is pageCount
  const queue = [{ html: baseHtml, depth: 0 }];

  while (queue.length && discovered.size < maxPages) {
    const { html, depth } = queue.shift();
    if (depth >= maxDepth) continue;

    for (const link of extractLinks(html, base)) {
      if (discovered.size >= maxPages) break;

      const norm = normalizeUrl(link);
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);

      let pathname;
      try {
        pathname = new URL(link).pathname;
      } catch {
        continue;
      }
      if (isDisallowed(pathname, disallows)) continue;

      discovered.add(norm);

      const nextDepth = depth + 1;
      const childHtml = nextDepth < maxDepth ? await fetchText(link, fetchImpl) : null;
      queue.push({ html: childHtml || '', depth: nextDepth });
    }
  }

  return { siteFound: true, pageCount: discovered.size, method: 'shallow-crawl' };
}

/**
 * @param {string|undefined} siteUrl
 * @param {{ fetchImpl?: typeof fetch, maxPages?: number, maxDepth?: number }} [opts]
 * @returns {Promise<SiteCrawlResult>}
 */
export async function crawlSite(siteUrl, { fetchImpl = fetch, maxPages = 50, maxDepth = 2 } = {}) {
  if (!siteUrl) {
    return { siteFound: false, pageCount: null, method: 'none' };
  }

  const base = siteUrl.replace(/\/$/, '');

  const sitemapResult = await tryCrawlViaSitemap(base, fetchImpl);
  if (sitemapResult) return sitemapResult;

  const crawlResult = await shallowCrawl(base, { fetchImpl, maxPages, maxDepth });
  if (crawlResult) return crawlResult;

  return { siteFound: false, pageCount: null, method: 'none' };
}
