/**
 * WordPress → Next.js Migration Planner
 * Uses curl for HTTP (Node.js fetch blocked in this WSL environment).
 *
 * Run:  node scripts/wp-migration-plan.mjs
 *
 * Outputs:
 *   content-migration/manifest.json          full decision list per post
 *   content-migration/redirects.json         301 entries ready for next.config.ts
 *   content-migration/to-build.json          posts to build as pages / blog entries
 *   content-migration/lessons-by-course.json training posts grouped by destination course
 */

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT  = join(ROOT, "content-migration");
mkdirSync(OUT, { recursive: true });

const WP_BASE = "https://www.wao.co.il/wp-json/wp/v2";

function curlJson(url) {
  const raw = execSync(`curl -s --max-time 30 "${url}"`, { maxBuffer: 10 * 1024 * 1024 }).toString();
  return JSON.parse(raw);
}

async function fetchAll(endpoint, params = {}) {
  const items = [];
  let page = 1;
  while (true) {
    const qs = new URLSearchParams({ per_page: "100", page: String(page), ...params }).toString();
    const url = `${WP_BASE}/${endpoint}?${qs}`;
    process.stdout.write(`  GET ${url.slice(0, 100)}...\r`);
    const data = curlJson(url);
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    // get total pages from a HEAD request
    if (page === 1) {
      const headers = execSync(`curl -sI --max-time 10 "${url}"`).toString();
      const match = headers.match(/x-wp-totalpages:\s*(\d+)/i);
      const totalPages = match ? parseInt(match[1], 10) : 1;
      if (totalPages <= 1) break;
      page++;
      // fetch remaining pages
      for (let p = 2; p <= totalPages; p++) {
        const qs2 = new URLSearchParams({ per_page: "100", page: String(p), ...params }).toString();
        const u2 = `${WP_BASE}/${endpoint}?${qs2}`;
        process.stdout.write(`  GET ${u2.slice(0, 100)}...\r`);
        const d2 = curlJson(u2);
        if (!Array.isArray(d2) || d2.length === 0) break;
        items.push(...d2);
      }
      break;
    }
    page++;
  }
  process.stdout.write("\n");
  return items;
}

// ── Category ID → destination mapping ────────────────────────────────────────
// Resolved against actual WP category IDs from https://www.wao.co.il/wp-json/wp/v2/categories
const TRAINING_CAT_IDS = {
  29: "/training/google-tag-manager",  // עושים הכל עם גוגל תג מנג'ר
  32: "/training/google-ads-course",   // פרסום בגוגל שמביא תוצאות
  31: "/training/google-my-business",  // חשיפה עצומה עם Google My Business
  35: "/training/affiliate-marketing", // שיווק שותפים
  36: "/training/make-money-online",   // איך לעשות כסף
};

// Category IDs that are blog/editorial content
const BLOG_CAT_IDS = new Set([1, 11, 47, 10]); // קידום-אתר, הבלוג, שיווק, דעה-אישית

// Readable category names for hub matching
const CAT_HUB_MAP = {
  1:  "/seo",        // קידום אתרים
  11: "/blog",       // הבלוג
  47: "/blog",       // שיווק
  10: "/blog",       // דעה אישית
  30: "/training",   // הדרכות (parent)
  63: "/blog",       // השקעות
  48: "/blog",       // כסף ועסקים
  45: "/blog",       // איך לחסוך כסף
};

// Best redirect destination for a post
function closestHub(p) {
  // First try category ID mapping
  for (const catId of p.categoryIds) {
    if (TRAINING_CAT_IDS[catId]) return TRAINING_CAT_IDS[catId];
    if (CAT_HUB_MAP[catId])      return CAT_HUB_MAP[catId];
  }
  // Fallback on title keywords
  const text = (p.title + " " + p.categories.join(" ")).toLowerCase();
  if (/seo|קידום/.test(text))                   return "/seo";
  if (/google ads|פרסום/.test(text))            return "/google-ads";
  if (/tag manager|תג/.test(text))              return "/training/google-tag-manager";
  if (/social|פייסבוק/.test(text))              return "/social";
  if (/affiliate|שותפים/.test(text))            return "/training/affiliate-marketing";
  return "/blog";
}

// ── Decision rules (first match wins) ────────────────────────────────────────
function decide(p) {
  // 1. Training lesson content
  if (p.trainingDest) {
    return { action: "LESSON", destination: p.trainingDest,
      reason: `Training content → lesson material for ${p.trainingDest}` };
  }

  // 2. Remove — thin + old, not worth any real estate
  if (p.wordCount < 150 && p.year < 2021) {
    return { action: "REMOVE", redirectTo: closestHub(p),
      reason: `Too thin (${p.wordCount}w, ${p.year}) — 301 to ${closestHub(p)}` };
  }

  // 3. Strong standalone blog post — migrate and keep as /blog/[slug]
  if (p.wordCount >= 500 && p.year >= 2019) {
    return { action: "BLOG_POST", destination: `/blog/${p.slug}`,
      reason: `Quality post (${p.wordCount}w, ${p.year}) → /blog/${p.slug}` };
  }

  // 4. Medium-length older post — consolidate (redirect to hub, content absorbed later)
  if (p.wordCount >= 250) {
    return { action: "CONSOLIDATE", redirectTo: closestHub(p),
      reason: `Medium post (${p.wordCount}w) — consolidate into ${closestHub(p)}` };
  }

  // 5. Everything else — redirect
  return { action: "REDIRECT", redirectTo: closestHub(p),
    reason: `Short/old — 301 to ${closestHub(p)}` };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function countWords(html) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ")
    .split(/\s+/).filter(Boolean).length;
}
function hasYT(html)  { return /youtube\.com\/embed|youtu\.be/.test(html || ""); }
function hasImg(html) { return /<img /i.test(html || ""); }

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n── WAO WordPress Migration Planner ─────────────────────────────\n");

console.log("Fetching categories...");
const rawCats = curlJson(`${WP_BASE}/categories?per_page=100`);
const catMap  = Object.fromEntries(rawCats.map((c) => [c.id, { slug: c.slug, name: c.name }]));
console.log(`  Found ${rawCats.length} categories\n`);

console.log("Fetching all posts...");
const rawPosts = await fetchAll("posts", {
  _fields: "id,slug,link,title,content,date,categories,status",
});
console.log(`  Found ${rawPosts.length} posts\n`);

const manifest = rawPosts.map((p) => {
  const html       = p.content?.rendered || "";
  const categories = (p.categories || []).map((id) => catMap[id]?.slug).filter(Boolean);
  const wordCount  = countWords(html);
  const year       = new Date(p.date).getFullYear();

  // Determine training destination via category ID lookup
  let trainingDest = null;
  for (const catId of (p.categories || [])) {
    if (TRAINING_CAT_IDS[catId]) { trainingDest = TRAINING_CAT_IDS[catId]; break; }
  }

  const postData = {
    id: p.id, title: p.title?.rendered || p.slug, slug: p.slug,
    originalUrl: p.link, date: p.date, year,
    categoryIds: p.categories || [],
    categories,
    wordCount, hasVideo: hasYT(html), hasImages: hasImg(html),
    trainingDest, isBlog: trainingDest === null,
    excerpt: html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 220),
  };

  const decision = decide(postData);

  return {
    ...postData,
    ...decision,
    // Keep raw HTML only for posts we'll build from
    rawHtml: ["LESSON", "BLOG_POST"].includes(decision.action) ? html : undefined,
  };
});

// ── Stats ─────────────────────────────────────────────────────────────────────
const byAction = manifest.reduce((acc, p) => { acc[p.action] = (acc[p.action] || 0) + 1; return acc; }, {});
console.log("── Decision summary ──────────────────────────────────────────────");
for (const [action, count] of Object.entries(byAction).sort((a, b) => b[1] - a[1]))
  console.log(`  ${action.padEnd(14)} ${count}`);
console.log(`  ${"TOTAL".padEnd(14)} ${manifest.length}\n`);

// ── Write outputs ─────────────────────────────────────────────────────────────

// 1. Full manifest (without bulky rawHtml)
const slim = manifest.map(({ rawHtml, ...rest }) => rest);
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(slim, null, 2));
console.log("✓ content-migration/manifest.json");

// 2. Redirects — everything that isn't BLOG_POST gets a 301
const redirects = manifest
  .filter((p) => p.action !== "BLOG_POST")
  .map((p) => {
    let source = p.originalUrl.replace(/^https?:\/\/www\.wao\.co\.il/, "").replace(/\/$/, "") || "/";
    const dest = p.redirectTo || p.destination || "/";
    return { source, destination: dest, permanent: true };
  })
  .filter((r) => r.source !== r.destination);

writeFileSync(join(OUT, "redirects.json"), JSON.stringify(redirects, null, 2));
console.log("✓ content-migration/redirects.json");

// 3. To-build list (blog posts + lessons)
const toBuild = slim.filter((p) => ["BLOG_POST", "LESSON"].includes(p.action));
writeFileSync(join(OUT, "to-build.json"), JSON.stringify(toBuild, null, 2));
console.log("✓ content-migration/to-build.json");

// 4. Lessons grouped by course (with full content for building)
const lessonsByCourse = {};
manifest
  .filter((p) => p.action === "LESSON")
  .forEach((p) => {
    const dest = p.destination || "unknown";
    if (!lessonsByCourse[dest]) lessonsByCourse[dest] = [];
    lessonsByCourse[dest].push({
      title: p.title, slug: p.slug, date: p.date,
      wordCount: p.wordCount, hasVideo: p.hasVideo, hasImages: p.hasImages,
      originalUrl: p.originalUrl, excerpt: p.excerpt,
      rawHtml: p.rawHtml,
    });
  });

writeFileSync(join(OUT, "lessons-by-course.json"), JSON.stringify(lessonsByCourse, null, 2));
console.log("✓ content-migration/lessons-by-course.json");

// 5. Blog posts with full content for building
const blogContent = manifest
  .filter((p) => p.action === "BLOG_POST")
  .map((p) => ({ title: p.title, slug: p.slug, date: p.date, categories: p.categories,
    wordCount: p.wordCount, hasVideo: p.hasVideo, hasImages: p.hasImages,
    originalUrl: p.originalUrl, excerpt: p.excerpt, rawHtml: p.rawHtml }));

writeFileSync(join(OUT, "blog-posts.json"), JSON.stringify(blogContent, null, 2));
console.log("✓ content-migration/blog-posts.json");

console.log(`\n── Next steps ────────────────────────────────────────────────────`);
console.log(`  1. Review content-migration/manifest.json (override any decisions)`);
console.log(`  2. Run: node scripts/wp-migration-execute.mjs`);
console.log(`     → Applies all redirects to next.config.ts`);
console.log(`     → Seeds blog posts into Payload CMS`);
console.log(`     → Maps lesson content to course pages\n`);
