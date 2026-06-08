import type { MetadataRoute } from "next";
import { readFileSync } from "fs";
import { join } from "path";

const BASE = "https://www.wao.co.il";

interface Lesson {
  slug: string;
  date: string;
}

function getLessons(): Record<string, Lesson[]> {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/lessons-by-course.json"), "utf8"));
  } catch { return {}; }
}

function getBlogPosts(): { slug: string; date: string }[] {
  try {
    return JSON.parse(readFileSync(join(process.cwd(), "content-migration/blog-posts.json"), "utf8"));
  } catch { return []; }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // ── Static pages ────────────────────────────────────────────────────────────
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                            lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${BASE}/seo`,                   lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/seo/guide`,             lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/seo/consulting`,        lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/seo/international`,     lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/google-ads`,            lastModified: now, changeFrequency: "weekly",  priority: 0.9 },
    { url: `${BASE}/training`,              lastModified: now, changeFrequency: "weekly",  priority: 0.85 },
    { url: `${BASE}/training/google-ads-course`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/training/google-my-business`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/training/google-tag-manager`,  lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/training/affiliate-marketing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/training/make-money-online`,   lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/training/seo-course`,          lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/blog`,                  lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${BASE}/glossary`,              lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`,                 lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/contact`,               lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
  ];

  // ── Lesson pages ────────────────────────────────────────────────────────────
  const lessonPages: MetadataRoute.Sitemap = [];
  const allLessons = getLessons();
  for (const [courseKey, lessons] of Object.entries(allLessons)) {
    const course = courseKey.replace("/training/", "");
    for (const l of lessons) {
      lessonPages.push({
        url: `${BASE}/training/${course}/${l.slug}`,
        lastModified: l.date ? new Date(l.date).toISOString() : now,
        changeFrequency: "yearly",
        priority: 0.65,
      });
    }
  }

  // ── Blog posts ──────────────────────────────────────────────────────────────
  const blogPages: MetadataRoute.Sitemap = getBlogPosts().map((p) => ({
    url: `${BASE}/blog/${p.slug}`,
    lastModified: p.date ? new Date(p.date).toISOString() : now,
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...lessonPages, ...blogPages];
}
