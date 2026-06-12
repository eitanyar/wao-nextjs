# WAO — מפת תוכן ו-Topical Authority ל"קידום אתרים"

> Baseline inventory of all live SEO content (service `/seo/*` + knowledge `/knowledge/*`).
> Purpose: when analyzing a new/legacy WordPress site, compare its content against this map to
> (a) find **content gaps** worth filling, and (b) **avoid cannibalization** with what already ranks.
> Generated from `src/data/knowledge.ts` + `src/app/(app)/seo/*`. Keep in sync after content changes.

Head term owned by the site: **קידום אתרים**. The architecture splits that head term by **intent**:
commercial pages capture buyers; the guide hub + knowledge spokes capture informational queries.

---

## 1. Pillar architecture (who owns what intent)

| URL | Role | Primary intent | Head query it targets |
|---|---|---|---|
| `/seo` | **Commercial pillar** | Transactional / commercial | קידום אתרים (שירות) |
| `/seo/guide` | **Informational pillar (hub)** | Informational | מדריך קידום אתרים |
| `/seo/keyword-research` | Informational sub-pillar | Informational | מחקר מילות מפתח |
| `/seo/topical-authority` | Informational sub-pillar | Informational | סמכות נושאית / מבנה אתר |
| `/seo/consulting` | Commercial sub-service | Commercial | יועץ קידום אתרים / מנטורינג |
| `/seo/international` | Commercial sub-service | Commercial | קידום אתרים בינלאומי |
| `/knowledge` (81 articles) | **Informational spokes** | Informational (definitional) | long-tail term per article |

**Key non-cannibalization principle already in place:** `/seo` (commercial "קידום אתרים") and
`/seo/guide` (informational "מדריך קידום אתרים") target the *same head term but different intent* —
that's complementary, not competing. Preserve this split for any new "קידום אתרים" content.

---

## 2. Semantic clusters (all 87 URLs)

### Cluster A — Technical SEO (16 spokes)  → supports `/seo` (technical service) + `/seo/guide`
`/knowledge/robots-txt` · `/knowledge/sitemap-xml` · `/knowledge/crawling-indexing` · `/knowledge/canonical-tag` · `/knowledge/redirect-301` · `/knowledge/redirect-chains` · `/knowledge/errors-404` · `/knowledge/errors-5xx` · `/knowledge/mobile-first-indexing` · `/knowledge/crawl-budget` · `/knowledge/hreflang` · `/knowledge/javascript-seo` · `/knowledge/pagination-seo` · `/knowledge/https-ssl` · `/knowledge/indexing-bloat` · `/knowledge/structured-data`

### Cluster B — On-Page SEO (9)
`/knowledge/title-tag` · `/knowledge/meta-description` · `/knowledge/h1-headings` · `/knowledge/url-structure` · `/knowledge/image-seo` · `/knowledge/internal-linking` · `/knowledge/anchor-text` · `/knowledge/featured-snippets` · `/knowledge/keyword-density`

### Cluster C — Content & Topical Authority (12)  → supports `/seo/topical-authority` + `/seo/keyword-research`
`/knowledge/search-intent` · `/knowledge/long-tail-keywords` · `/knowledge/topical-authority` · `/knowledge/pillar-cluster-model` · `/knowledge/content-silos` · `/knowledge/keyword-clustering` · `/knowledge/keyword-cannibalization` · `/knowledge/content-freshness` · `/knowledge/evergreen-content` · `/knowledge/helpful-content-system` · `/knowledge/eeat` · `/knowledge/ymyl`

### Cluster D — Link Building (7)  → no commercial pillar (see Gaps)
`/knowledge/link-building` · `/knowledge/backlinks` · `/knowledge/domain-authority` · `/knowledge/disavow-tool` · `/knowledge/nofollow-links` · `/knowledge/digital-pr` · `/knowledge/toxic-links`

### Cluster E — Performance / Core Web Vitals (7)  → supports `/build` + `/seo`
`/knowledge/core-web-vitals` *(hub)* · `/knowledge/lcp` · `/knowledge/cls` · `/knowledge/inp` · `/knowledge/page-speed-optimization` · `/knowledge/cdn-seo` · `/knowledge/lazy-loading`

### Cluster F — Algorithms & Updates (10)
`/knowledge/google-algorithm` · `/knowledge/core-updates` · `/knowledge/panda-update` · `/knowledge/penguin-update` · `/knowledge/helpful-content-update` · `/knowledge/page-experience-update` · `/knowledge/site-reputation-abuse` · `/knowledge/sandbox-effect` · `/knowledge/google-dance` · `/knowledge/hilltop-algorithm`

### Cluster G — AI / GEO / SGE (7)  → supports `/seo` (AI Overviews angle) + `/content`
`/knowledge/ai-overviews` · `/knowledge/generative-engine-optimization` · `/knowledge/ai-content-seo` · `/knowledge/entity-seo` · `/knowledge/llm-citation-seo` · `/knowledge/voice-search-seo` · `/knowledge/zero-click-searches`

### Cluster H — Local SEO (4)  → **no commercial pillar (gap)**
`/knowledge/local-seo` · `/knowledge/google-my-business` · `/knowledge/nap-consistency` · `/knowledge/local-pack`

### Cluster I — International SEO (4)  → supports `/seo/international`
`/knowledge/international-seo` · `/knowledge/hreflang-implementation` · `/knowledge/cctld-vs-subfolder` · `/knowledge/geo-targeting`

### Cluster J — Tools & Measurement (5)
`/knowledge/google-search-console` · `/knowledge/serp-analysis` · `/knowledge/rank-tracking` · `/knowledge/seo-audit` · `/knowledge/competitive-analysis`

---

## 3. Cannibalization watch-list (existing internal risks)

These are pairs/sets where the **same query intent** may be targeted by more than one URL. Keep them
differentiated (definition vs how-to vs service), interlink with clear canonical direction, and do
**not** add a new page on the same intent.

| Risk | URLs | Status / how to keep separate |
|---|---|---|
| 🔴 **Duplicate: hreflang** | `/knowledge/hreflang` (Technical) **and** `/knowledge/hreflang-implementation` (International) | Two articles on hreflang. Decide one canonical target; make the other a narrow sub-angle or merge. |
| 🟠 helpful content | `/knowledge/helpful-content-system` (Content) **and** `/knowledge/helpful-content-update` (Algorithms) | Keep "system = what it is" vs "update = the algo event". Interlink. |
| 🟠 Topical Authority | `/seo/topical-authority` (guide) **and** `/knowledge/topical-authority` (definition) | Guide = how-to/strategy; knowledge = short definition. Knowledge should link up to the guide. |
| 🟠 Keyword research family | `/seo/keyword-research` (hub) vs `/knowledge/search-intent` · `long-tail-keywords` · `keyword-clustering` · `keyword-cannibalization` | Hub owns "מחקר מילות מפתח"; spokes own their long-tail terms only. Hub links down. |
| 🟠 Content structure | `/knowledge/pillar-cluster-model` · `/knowledge/content-silos` · `/seo/topical-authority` | Overlapping concept. Each must own a distinct query; avoid a 4th page here. |
| 🟡 International | `/seo/international` (commercial) vs `/knowledge/international-seo` (informational) | Intent split is fine; keep service vs guide tone distinct. |
| 🟡 Core Web Vitals | `/knowledge/core-web-vitals` (hub) vs `lcp` / `cls` / `inp` | Healthy hub→spoke; no action. |

---

## 4. Structural gaps (candidates for NEW content — verify demand before building)

Relative to a full "קידום אתרים" topical map, these are the thin/missing areas:

- **Local SEO has no commercial pillar.** Cluster H has 4 informational articles but no money page
  (e.g. `/seo/local` / "קידום אתרים מקומי"). Biggest commercial gap if local is a target market.
- **Link Building has no service/pillar page.** Cluster D is informational-only. No `/seo/link-building`.
- **No dedicated Technical-SEO or On-Page service/guide pillar** — only `/seo/guide` covers them broadly + knowledge spokes. Could warrant a focused guide if those queries matter.
- **No measurement/audit commercial page** — Cluster J is informational; `/knowledge/seo-audit` exists but no `/seo/audit` service.
- **AI/GEO has strong knowledge coverage but no commercial pillar** — Cluster G feeds `/seo` & `/content` only.

---

## 5. How to use this for the next WordPress analysis

When a WP site dump arrives:
1. **Map each WP URL to a cluster (A–J) and an intent** (informational / commercial / transactional).
2. **Gap check:** WP topics with no equivalent here = candidate new content. Prioritize by relevance to
   "קידום אתרים" + the gaps in §4.
3. **Cannibalization check:** before recommending a new page, confirm no existing URL in §2 already owns
   that query+intent. If one does → enrich/merge instead of creating. Add new risks to §3.
4. **Authority check:** new informational content should slot under the right pillar (§1) and interlink
   (spoke → sub-pillar → `/seo/guide` → `/seo`), never compete with the commercial pillar.

---

_Counts: Technical 16 · On-Page 9 · Content 12 · Links 7 · Performance 7 · Algorithms 10 · AI 7 · Local 4 · International 4 · Tools 5 = **81 knowledge** + **6 /seo** = **87 URLs**._
