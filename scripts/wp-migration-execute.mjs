/**
 * WordPress → Next.js Migration Executor
 *
 * 1. Reads content-migration/redirects.json
 * 2. Deduplicates against existing redirects in next.config.ts
 * 3. Appends new redirects to next.config.ts  (grouped by course)
 * 4. Extracts YouTube video IDs from training lesson content
 * 5. Writes content-migration/video-map.json  (video IDs per course)
 *
 * Run: node scripts/wp-migration-execute.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT  = join(ROOT, "content-migration");

// ── Load manifests ────────────────────────────────────────────────────────────
const redirects        = JSON.parse(readFileSync(join(OUT, "redirects.json"), "utf8"));
const lessonsByCourse  = JSON.parse(readFileSync(join(OUT, "lessons-by-course.json"), "utf8"));

// ── 1. Apply redirects to next.config.ts ─────────────────────────────────────
console.log("\n── Applying redirects ───────────────────────────────────────────");

const configPath = join(ROOT, "next.config.ts");
let configText   = readFileSync(configPath, "utf8");

// Extract sources that are already defined
const existingSources = new Set(
  [...configText.matchAll(/source:\s*["']([^"']+)["']/g)].map((m) => m[1])
);

// Deduplicate and also skip anything that targets /blog (no page yet)
const newRedirects = redirects.filter((r) => !existingSources.has(r.source));
console.log(`  Total in manifest : ${redirects.length}`);
console.log(`  Already defined   : ${redirects.length - newRedirects.length}`);
console.log(`  New to add        : ${newRedirects.length}`);

if (newRedirects.length > 0) {
  // Group by destination for readable comments
  const grouped = {};
  for (const r of newRedirects) {
    const key = r.destination;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(r);
  }

  const lines = ["\n  // ── Auto-migrated from WordPress (" + new Date().toISOString().slice(0, 10) + ") ──"];
  for (const [dest, entries] of Object.entries(grouped).sort()) {
    lines.push(`  // → ${dest}`);
    for (const e of entries) {
      const src = e.source.replace(/'/g, "\\'");
      lines.push(`  { source: '${src}', destination: '${e.destination}', permanent: true },`);
    }
  }

  // Insert before the closing `] as const`
  configText = configText.replace("] as const;", lines.join("\n") + "\n] as const;");
  writeFileSync(configPath, configText, "utf8");
  console.log(`  ✓ next.config.ts updated with ${newRedirects.length} new redirects`);
} else {
  console.log("  ✓ No new redirects to add — all already present");
}

// ── 2. Extract YouTube video IDs from training posts ─────────────────────────
console.log("\n── Extracting YouTube video IDs ─────────────────────────────────");

function extractYTIds(html) {
  const matches = [...(html || "").matchAll(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/g)];
  return [...new Set(matches.map((m) => m[1]))];
}

function ytLink(id) {
  return { label: "▶ צפייה ביוטיוב", href: `https://www.youtube.com/watch?v=${id}` };
}

const videoMap = {};

for (const [course, posts] of Object.entries(lessonsByCourse)) {
  const lessons = posts
    .filter((p) => p.hasVideo && p.rawHtml)
    .map((p) => {
      const ids = extractYTIds(p.rawHtml);
      return {
        title:       p.title.replace(/&#\d+;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&"),
        slug:        p.slug,
        originalUrl: p.originalUrl,
        date:        p.date,
        wordCount:   p.wordCount,
        hasImages:   p.hasImages,
        videoIds:    ids,
        links:       ids.map(ytLink),
      };
    })
    .filter((p) => p.videoIds.length > 0);

  videoMap[course] = lessons;
  const withVideo = lessons.length;
  const totalVids = lessons.reduce((n, l) => n + l.videoIds.length, 0);
  console.log(`  ${course.padEnd(40)} ${withVideo} lessons, ${totalVids} videos`);
}

writeFileSync(join(OUT, "video-map.json"), JSON.stringify(videoMap, null, 2), "utf8");
console.log("\n  ✓ content-migration/video-map.json");

// ── 3. Summary ────────────────────────────────────────────────────────────────
console.log("\n── Course video summary ─────────────────────────────────────────");
for (const [course, lessons] of Object.entries(videoMap)) {
  console.log(`\n  ${course} (${lessons.length} video lessons):`);
  lessons.forEach((l, i) =>
    console.log(`    ${String(i + 1).padStart(2)}. [${l.videoIds[0]}] ${l.title.slice(0, 60)}`)
  );
}

console.log("\n── Done ─────────────────────────────────────────────────────────");
console.log("  Next: node scripts/wp-build-courses.mjs");
console.log("        → Rebuilds course pages with actual lesson titles + video links\n");
