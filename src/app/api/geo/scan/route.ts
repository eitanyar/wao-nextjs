/**
 * GEO Scan — public, no-login AI-search-readiness scanner.
 *
 * ISOLATION NOTE: this route makes ZERO calls to any GSC/OAuth endpoint.
 * It only performs anonymous fetch() against the visitor-supplied public
 * URL and that site's own robots.txt / sitemap.xml / pages. Do not import
 * anything from the GSC OAuth modules (scripts/gsc-*.mjs, anomaly-check,
 * crawl-check) into this file — that is /geo/audit's lane, not this one.
 *
 * Scope per Yonatan's spec (SEO-CONTENT-MAP.md §6): shallow heuristic
 * check of up to ~10 pages. Never claims to predict AI Overview ranking —
 * "readiness signals" only.
 */

import { NextRequest, NextResponse } from "next/server";
import { Agent, setGlobalDispatcher } from "undici";

// Force IPv4-only connections for outbound fetches — this sandboxed/dual-stack
// environment hangs on default happy-eyeballs connect otherwise (same fix as
// scripts/crawl-check.mjs, scripts/gsc-pareto.mjs — unrelated to their OAuth
// logic, purely a networking workaround, no GSC/OAuth code is imported here).
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));

export const dynamic = "force-dynamic";

// ── Config ──────────────────────────────────────────────────────────────────
const MAX_PAGES = 10;
const PER_FETCH_TIMEOUT_MS = 8_000;
const OVERALL_TIMEOUT_MS = 45_000;
const MAX_HTML_BYTES = 2_000_000; // 2MB cap per page fetch, avoid memory abuse

// ── SSRF protection ──────────────────────────────────────────────────────────
// Blocks localhost, private/link-local ranges, and non-http(s) schemes.
function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();

  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local")
  ) {
    return true;
  }

  // IPv4 literal checks
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1], 10), parseInt(ipv4[2], 10)];
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 10) return true; // 10.0.0.0/8 private
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  }

  // IPv6 private/link-local literal ranges (basic coverage)
  if (h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd")) return true;

  return false;
}

function validateAndNormalizeUrl(raw: string): URL | null {
  let url: URL;
  try {
    // Default to https if no scheme given
    const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    url = new URL(withScheme);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (isBlockedHostname(url.hostname)) return null;

  return url;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "WAO-GEO-Scan/1.0 (+https://www.wao.co.il/geo/scan)",
      },
    });
    return res;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchTextCapped(res: Response, maxBytes: number): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return await res.text().catch(() => "");

  const decoder = new TextDecoder();
  let received = 0;
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.length;
    if (received > maxBytes) {
      out += decoder.decode(value.slice(0, maxBytes - (received - value.length)));
      try {
        await reader.cancel();
      } catch {}
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

// ── HTML heuristics ───────────────────────────────────────────────────────
interface PageCheckResult {
  url: string;
  ok: boolean;
  html?: string;
  status?: number;
}

function extractHeadings(html: string): { tag: string; text: string }[] {
  const matches = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  return matches.map((m) => ({
    tag: `h${m[1]}`,
    text: m[2].replace(/<[^>]+>/g, "").trim(),
  }));
}

function extractParagraphsAfterHeadings(html: string): string[] {
  // Grab text of first <p> (or text block) following each heading, roughly.
  const sections = html.split(/<h[1-6][^>]*>/i).slice(1);
  return sections.map((sec) => {
    const pMatch = sec.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const text = pMatch ? pMatch[1].replace(/<[^>]+>/g, "").trim() : "";
    return text;
  });
}

const QUESTION_PATTERNS = [/איך/, /מה זה/, /למה/, /מתי/, /כמה/, /מי/, /\?/];

function isQuestionLike(text: string): boolean {
  return QUESTION_PATTERNS.some((p) => p.test(text));
}

function firstSentence(text: string): string {
  const m = text.match(/^[^.!?׳]*[.!?]/);
  return (m ? m[0] : text).trim();
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// ── Check 1+2: Visible Q&A / direct-answer structure (35 pts) ────────────
function scoreQAAndAnswerFirst(pages: PageCheckResult[]): {
  score: number;
  maxScore: number;
  failedExamples: string[];
} {
  let questionHeadingsTotal = 0;
  let questionHeadingsAnswered = 0;
  let sectionsTotal = 0;
  let sectionsAnswerFirst = 0;
  const failedExamples: string[] = [];

  for (const page of pages) {
    if (!page.ok || !page.html) continue;
    const headings = extractHeadings(page.html);
    const paragraphsAfter = extractParagraphsAfterHeadings(page.html);

    headings.forEach((h, i) => {
      if (isQuestionLike(h.text)) {
        questionHeadingsTotal++;
        const answer = paragraphsAfter[i] || "";
        const first = firstSentence(answer);
        // "answered within ~2 sentences" heuristic: non-empty, reasonably short, declarative
        if (answer.length > 0 && wordCount(first) < 40) {
          questionHeadingsAnswered++;
        } else {
          failedExamples.push(`"${h.text}" on ${page.url}`);
        }
      }

      if (h.tag === "h2" || h.tag === "h3") {
        const answer = paragraphsAfter[i] || "";
        if (answer) {
          sectionsTotal++;
          const first = firstSentence(answer);
          if (wordCount(first) < 40) sectionsAnswerFirst++;
        }
      }
    });
  }

  // Combine: 20 pts for Q&A structure, 15 pts for answer-first paragraphing
  const qaScore =
    questionHeadingsTotal > 0
      ? Math.round((questionHeadingsAnswered / questionHeadingsTotal) * 20)
      : 10; // neutral-ish if no question headings found at all (can't penalize absence alone)

  const answerFirstScore =
    sectionsTotal > 0 ? Math.round((sectionsAnswerFirst / sectionsTotal) * 15) : 8;

  return {
    score: qaScore + answerFirstScore,
    maxScore: 35,
    failedExamples: failedExamples.slice(0, 5),
  };
}

// ── Check 3: Heading structure clarity (20 pts) ──────────────────────────
function scoreHeadingStructure(pages: PageCheckResult[]): {
  score: number;
  maxScore: number;
  failedExamples: string[];
} {
  let pagesChecked = 0;
  let pointsEarned = 0;
  const failedExamples: string[] = [];
  const perPagePoints = 20 / Math.max(pages.filter((p) => p.ok).length, 1);

  for (const page of pages) {
    if (!page.ok || !page.html) continue;
    pagesChecked++;
    const headings = extractHeadings(page.html);
    const h1s = headings.filter((h) => h.tag === "h1");
    const nonEmpty = headings.every((h) => h.text.length > 0);

    let nestingOk = true;
    let seenH2 = false;
    for (const h of headings) {
      if (h.tag === "h2") seenH2 = true;
      if (h.tag === "h3" && !seenH2) {
        nestingOk = false;
        break;
      }
    }

    let pagePoints = 0;
    if (h1s.length === 1) pagePoints += perPagePoints * 0.5;
    else failedExamples.push(`${page.url} has ${h1s.length} H1 tags (expected exactly 1)`);

    if (nestingOk) pagePoints += perPagePoints * 0.3;
    else failedExamples.push(`${page.url} has an H3 before any H2`);

    if (nonEmpty) pagePoints += perPagePoints * 0.2;
    else failedExamples.push(`${page.url} has an empty heading tag`);

    pointsEarned += pagePoints;
  }

  return {
    score: Math.round(pointsEarned),
    maxScore: 20,
    failedExamples: failedExamples.slice(0, 5),
  };
}

// ── Check 4: Crawlability basics (20 pts, HARD GATE) ─────────────────────
async function scoreCrawlability(
  origin: string,
  pages: PageCheckResult[]
): Promise<{ score: number; maxScore: number; hardFail: boolean; failedExamples: string[] }> {
  const failedExamples: string[] = [];
  let hardFail = false;
  let score = 20;

  const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`, PER_FETCH_TIMEOUT_MS);
  if (robotsRes && robotsRes.ok) {
    const robotsTxt = await fetchTextCapped(robotsRes, 200_000);
    // Blanket "Disallow: /" under User-agent: * (a rough heuristic)
    const blocksAll = /user-agent:\s*\*[\s\S]{0,200}?disallow:\s*\/\s*($|\n)/im.test(robotsTxt);
    if (blocksAll) {
      hardFail = true;
      score -= 12;
      failedExamples.push("robots.txt has a blanket Disallow: / for all user-agents");
    }
  }

  let noindexCount = 0;
  for (const page of pages) {
    if (!page.ok || !page.html) continue;
    if (/<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(page.html)) {
      noindexCount++;
      failedExamples.push(`${page.url} has a noindex meta tag`);
    }
  }
  if (noindexCount > 0) {
    hardFail = true;
    score -= 8;
  }

  return { score: Math.max(0, score), maxScore: 20, hardFail, failedExamples: failedExamples.slice(0, 5) };
}

// ── Check 5: Sitemap presence/validity (15 pts) ──────────────────────────
async function scoreSitemap(
  origin: string
): Promise<{ score: number; maxScore: number; failedExamples: string[] }> {
  const candidates = [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`, `${origin}/sitemap.xml.gz`];

  // Check robots.txt for a Sitemap: directive too
  const robotsRes = await fetchWithTimeout(`${origin}/robots.txt`, PER_FETCH_TIMEOUT_MS);
  if (robotsRes && robotsRes.ok) {
    const robotsTxt = await fetchTextCapped(robotsRes, 200_000);
    const match = robotsTxt.match(/sitemap:\s*(\S+)/i);
    if (match) candidates.unshift(match[1].trim());
  }

  for (const candidate of candidates) {
    const res = await fetchWithTimeout(candidate, PER_FETCH_TIMEOUT_MS);
    if (res && res.ok) {
      const xml = await fetchTextCapped(res, 500_000);
      const hasUrlEntries = /<url>/i.test(xml) || /<sitemap>/i.test(xml);
      if (hasUrlEntries) {
        return { score: 15, maxScore: 15, failedExamples: [] };
      }
    }
  }

  return {
    score: 0,
    maxScore: 15,
    failedExamples: [`No valid sitemap.xml found (checked ${candidates.length} common locations + robots.txt directive)`],
  };
}

// ── Check 6: Schema presence (10 pts) ────────────────────────────────────
function scoreSchema(pages: PageCheckResult[]): { score: number; maxScore: number; failedExamples: string[] } {
  const targetTypes = ["FAQPage", "Article", "Organization"];
  let pagesWithSchema = 0;
  const checkedPages = pages.filter((p) => p.ok && p.html);

  for (const page of checkedPages) {
    const scriptMatches = [...(page.html || "").matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    let found = false;
    for (const m of scriptMatches) {
      const raw = m[1];
      if (targetTypes.some((t) => raw.includes(t))) {
        found = true;
        break;
      }
    }
    if (found) pagesWithSchema++;
  }

  if (checkedPages.length === 0) return { score: 0, maxScore: 10, failedExamples: ["No pages could be checked for schema"] };

  const ratio = pagesWithSchema / checkedPages.length;
  const score = Math.round(ratio * 10);
  const failedExamples =
    ratio < 1
      ? [`${checkedPages.length - pagesWithSchema} of ${checkedPages.length} scanned pages have no FAQPage/Article/Organization schema`]
      : [];

  return { score, maxScore: 10, failedExamples };
}

// ── Letter grade ──────────────────────────────────────────────────────────
function letterGrade(total: number, crawlabilityHardFail: boolean): string {
  let letter: string;
  if (total >= 85) letter = "A";
  else if (total >= 70) letter = "B";
  else if (total >= 55) letter = "C";
  else if (total >= 35) letter = "D";
  else letter = "F";

  if (crawlabilityHardFail && (letter === "A" || letter === "B" || letter === "C")) {
    letter = "D";
  }
  return letter;
}

// ── Handler ────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const overallDeadline = Date.now() + OVERALL_TIMEOUT_MS;

  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = (body.url || "").trim();
  if (!raw) {
    return NextResponse.json({ error: "Missing 'url'." }, { status: 400 });
  }

  const target = validateAndNormalizeUrl(raw);
  if (!target) {
    return NextResponse.json(
      { error: "That URL isn't valid or isn't allowed (must be a public http/https address)." },
      { status: 400 }
    );
  }

  const origin = target.origin;

  // Fetch the entry page first
  const pages: PageCheckResult[] = [];
  const toVisit: string[] = [target.toString()];
  const visited = new Set<string>();

  while (toVisit.length > 0 && pages.length < MAX_PAGES && Date.now() < overallDeadline) {
    const nextUrl = toVisit.shift()!;
    if (visited.has(nextUrl)) continue;
    visited.add(nextUrl);

    const parsed = validateAndNormalizeUrl(nextUrl);
    if (!parsed || parsed.origin !== origin) continue; // stay same-origin, re-validate SSRF each hop

    const res = await fetchWithTimeout(parsed.toString(), PER_FETCH_TIMEOUT_MS);
    if (!res) {
      pages.push({ url: parsed.toString(), ok: false });
      continue;
    }
    if (!res.ok) {
      pages.push({ url: parsed.toString(), ok: false, status: res.status });
      continue;
    }

    const html = await fetchTextCapped(res, MAX_HTML_BYTES);
    pages.push({ url: parsed.toString(), ok: true, html, status: res.status });

    // Discover a few more same-origin links from the first page only, to reach ~10 pages
    if (pages.length < MAX_PAGES && toVisit.length < MAX_PAGES) {
      const hrefs = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].map((m) => m[1]);
      for (const href of hrefs) {
        if (toVisit.length + pages.length >= MAX_PAGES * 2) break;
        try {
          const abs = new URL(href, origin).toString();
          const absParsed = validateAndNormalizeUrl(abs);
          if (absParsed && absParsed.origin === origin && !visited.has(abs) && !toVisit.includes(abs)) {
            toVisit.push(abs);
          }
        } catch {
          // ignore malformed hrefs
        }
      }
    }
  }

  const okPages = pages.filter((p) => p.ok);
  if (okPages.length === 0) {
    return NextResponse.json(
      { error: "Couldn't reach that site or fetch any pages. Check the URL and try again." },
      { status: 502 }
    );
  }

  const qa = scoreQAAndAnswerFirst(okPages);
  const headingStructure = scoreHeadingStructure(okPages);
  const crawlability = await scoreCrawlability(origin, okPages);
  const sitemap = await scoreSitemap(origin);
  const schema = scoreSchema(okPages);

  const total = qa.score + headingStructure.score + crawlability.score + sitemap.score + schema.score;
  const grade = letterGrade(total, crawlability.hardFail);

  // ── Top 3 fixes ──
  const fixes: string[] = [];
  if (crawlability.hardFail) {
    fixes.push(...crawlability.failedExamples.slice(0, 1));
  }
  if (sitemap.score < sitemap.maxScore && fixes.length < 3) {
    fixes.push(...sitemap.failedExamples.slice(0, 1));
  }

  const remainingCategories = [
    { weight: 35, examples: qa.failedExamples },
    { weight: 20, examples: headingStructure.failedExamples },
    { weight: 20, examples: crawlability.hardFail ? [] : crawlability.failedExamples },
    { weight: 10, examples: schema.failedExamples },
  ].sort((a, b) => b.weight - a.weight);

  for (const cat of remainingCategories) {
    for (const ex of cat.examples) {
      if (fixes.length >= 3) break;
      if (!fixes.includes(ex)) fixes.push(ex);
    }
    if (fixes.length >= 3) break;
  }

  return NextResponse.json({
    url: target.toString(),
    pagesScanned: okPages.length,
    grade,
    // Deliberately no numeric score surfaced to the client-facing summary field —
    // the UI must show only the letter (see project honesty-boundary spec).
    // Included here server-side for QA/debugging transparency only.
    _debugScore: total,
    hardFail: crawlability.hardFail,
    topFixes: fixes.slice(0, 3),
    categories: {
      qaAndAnswerFirst: { score: qa.score, max: qa.maxScore },
      headingStructure: { score: headingStructure.score, max: headingStructure.maxScore },
      crawlability: { score: crawlability.score, max: crawlability.maxScore, hardFail: crawlability.hardFail },
      sitemap: { score: sitemap.score, max: sitemap.maxScore },
      schema: { score: schema.score, max: schema.maxScore },
    },
  });
}
