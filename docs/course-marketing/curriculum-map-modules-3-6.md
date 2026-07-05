---
author: Gil (instructional-designer)
date: 2026-07-04
status: planning-only — no scripting started
course: Build AND SEO in the Age of AI
scope: Modules 3-6 lesson-by-lesson map (Modules 1-2 already produced)
production-order: Module 5 -> Module 3 -> Module 4 -> Module 6
needs: Yonatan (SEO strategist) brief for all [Yonatan: ...] placeholders before scripting Modules 3 and 4
---

# Curriculum Map — Modules 3-6

## Status check against the 23-lesson target

Tamar's title sheet (`docs/course-marketing/lesson-titles.md`) proposed a 3/4/4/4/5/3
distribution. Modules 1-2 as actually produced (`src/data/website-course-data.ts`) came in
at 2+4 = 6 lessons, not 3+4 = 7 — one fewer than the title sheet planned for Module 1.
This map does not try to manufacture a lesson to close that gap. Modules 3-6 below total
**16 lessons** (4+4+5+3), matched to content, not padded to hit 17. Combined with the 6
already-produced lessons, the course lands at 22 total — close enough to the original 23
estimate that no one should treat the number itself as a spec.

Titles below are working titles for the actual lesson (matching the plain, functional style
already used in `website-course-data.ts`, e.g. "שיעור 1: איך מתארים את העסק שלך ל-AI" rather
than Tamar's clickbait hook version). Tamar's marketing hook per lesson is noted alongside —
useful for the landing page / WhatsApp teasers, not necessarily the on-screen lesson title.

Every lesson gets a downloadable checklist. Modules 3 and 4 additionally get a copy-paste
Hebrew AI-prompt template as the retention asset (per the course-wide rule that Modules 2-4
carry prompt templates). Recurring example throughout: **Avi, plumber from Holon** — old
apartments, hidden leaks without breaking walls, arrives within an hour.

---

## MODULE 3 — שגוגל יבין אותך

**Module objective:** learner rewrites titles/headings to match what customers actually search.
**Yonatan dependency:** every lesson in this module needs his brief before scripting — this
module is pure search-intent substance, and none of it should be invented from memory.

### 3.1 — הלקוח לא מחפש אותך, הוא מחפש את הבעיה שלו
*(Tamar hook: "הלקוח לא מחפש אותך. הוא מחפש את הבעיה שלו")*

- **Objective:** learner can distinguish between how he describes his own business and how
  a customer searches for the problem it solves.
- **Core concept:** search intent — the gap between business-owner vocabulary
  ("שירותי אינסטלציה") and customer-in-pain vocabulary at the moment of searching ("נזילה
  מתחת לרצפה", "אינסטלטור דחוף בהולון"). Google — and now AI answer engines — match pages to
  the customer's words, not the business's words.
- **Active task:** Avi (and the learner, in parallel) writes 3 ways he'd describe his
  business to a colleague, then 3 ways a panicked customer would type the same need into
  Google. Compares the two lists side by side.
- **Downloadable asset:** "מתרגם השפה" two-column worksheet (עסק אומר / לקוח מחפש).
  [Yonatan: insert 3-5 real Israeli search-query examples per common vertical to seed the
  worksheet with credible phrasing instead of guessed examples.]
- **Duration:** 4-5 min
- **Yonatan dependency:** Yes.

### 3.2 — הכותרת שמכניסה אותך לעמוד הראשון (וזו שקוברת אותך)
*(Tamar hook: same)*

- **Objective:** learner can identify what makes a page title (title tag / H1) effective vs.
  ineffective for search visibility.
- **Core concept:** the title formula — [מה + איפה + מה מייחד אותך]. One clear good/bad
  contrast (generic "דף הבית" vs. intent-matched "איתור נזילות בלי לשבור קירות — הולון
  והסביבה") teaches more than a list of rules.
- **Active task:** learner takes the homepage title he built in Module 2 and rewrites it
  once, live, using the formula.
- **Downloadable asset:** title-formula prompt template — feeds business description +
  location + differentiator into an AI prompt that returns 3 title variants.
  [Yonatan: confirm current title-tag length / keyword-placement guidance is still accurate
  before this is scripted — don't script from stale memory.]
- **Duration:** 5 min
- **Yonatan dependency:** Yes.

### 3.3 — גוגל קורא רק את הכותרות שלך — הנה מה לכתוב בהן
*(Tamar hook: same)*

- **Objective:** learner can apply a simple H1 -> H2 -> H3 hierarchy so each of his 5 pages
  signals its topic clearly.
- **Core concept:** heading hierarchy as a table of contents — for the human skimming and
  for the machine parsing. One H1 per page (the topic), H2s for sub-topics, no skipped
  levels, no keyword stuffing.
- **Active task:** learner opens each of his 5 pages from Module 2 and runs a pass/fail
  heading check, fixing what fails.
- **Downloadable asset:** heading-hierarchy prompt template ("תבדוק את מבנה הכותרות בעמוד
  הזה ותציע תיקון") + a structural checklist.
- **Duration:** 4-5 min
- **Yonatan dependency:** Light — mostly structural/pedagogical, but flag so Yonatan can
  confirm no outdated heading-SEO myths (e.g. keyword-density advice) sneak in.

### 3.4 — עמוד לכל שירות: הטריק שמכפיל את החשיפה שלך בגוגל
*(Tamar hook: same)*

- **Objective:** learner can decide which of his services deserve a dedicated page vs. a
  shared section.
- **Core concept:** topical depth — a plumber with several distinct high-search services
  (leak detection, drain clearing, emergency call-out, old-building plumbing) gains more
  visibility from 4 focused pages than 1 page briefly mentioning all 4. Extends Module 2's
  "5 pages" into "which services split out."
- **Active task:** learner lists his own services and marks each "own page" or "merge," using
  the decision rule taught in the lesson.
- **Downloadable asset:** service-page prompt template that turns one merged section into a
  standalone page draft. [Yonatan: supply the search-volume/intent threshold for when a
  service justifies its own page — this cannot be a gut-feel rule.]
- **Duration:** 5-6 min
- **Yonatan dependency:** Yes.

---

## MODULE 4 — להיות התשובה

**Module objective:** learner adds FAQ blocks so AI Overviews cite him.
**Binding fact-check constraint (already resolved — see
`docs/scripts/website-course/module-4-5-narration-constraints.md`, Fix 1):** FAQPage rich
results were deprecated by Google on May 7, 2026. No lesson in this module may imply
"Google will show your FAQ in the search results." Frame throughout as an AEO/GEO play —
being the answer AI Overviews, AI Mode, ChatGPT Search, and Perplexity quote — never as a
classic rich-snippet play.

### 4.1 — הלקוח שואל, גוגל עונה — ואתה יכול להיות התשובה
*(Tamar hook: same)*

- **Objective:** learner can explain in plain terms what an AI answer/AI Overview is, and
  why being "the cited source" matters more than ranking #1 in the old sense.
- **Core concept:** the mindset shift — search moved from "10 blue links" to "one AI-written
  answer with citations." Analogy: a teacher calling on the student with the clearest raised
  hand, not the loudest voice. No technical task yet — this lesson is the "why" before the
  "how."
- **Active task:** learner picks one question customers actually ask before hiring him
  ("אפשר לתקן נזילה בלי לשבור קיר?") and writes it down verbatim — carried into 4.2.
- **Downloadable asset:** "שאלת הלקוח שלי" one-line capture worksheet.
- **Duration:** 4 min
- **Yonatan dependency:** Yes — needs a current, dated framing of how AI Overviews/AI Mode
  actually select and cite sources (this is exactly the kind of time-sensitive claim that
  must not come from memory).

### 4.2 — שאלות ותשובות: הבלוק שה-AI מצטט הכי הרבה
*(Tamar hook: same)*

- **Objective:** learner can write FAQ questions phrased the way real customers actually
  type or ask them.
- **Core concept:** good FAQ questions mirror the customer's own words, not the business's
  jargon — the same intent-matching principle from Module 3, now applied to question
  phrasing. Bad: "מהם שירותי האינסטלציה שלנו?" Good: "כמה עולה לתקן נזילה בבניין ישן?"
- **Active task:** learner turns the question captured in 4.1 into 3 real, customer-phrased
  FAQ questions for his own site.
- **Downloadable asset:** FAQ-question generator prompt template (feeds the business
  description into an AI prompt that returns 8-10 candidate questions in real customer
  phrasing). [Yonatan: insert real "people also ask" / query examples per vertical if
  available.]
- **Duration:** 5 min
- **Yonatan dependency:** Yes.

### 4.3 — התשובה המושלמת: שלושה משפטים שגוגל בוחר להציג
*(Tamar hook: same)*

- **Objective:** learner can write a direct 2-3 sentence answer to each FAQ question,
  structured the way AI engines prefer to quote.
- **Core concept:** the answer formula — lead with the direct answer in sentence one, back
  it with one concrete detail, stop. No hedging opener ("זה תלוי במקרה"). Analogy: answering
  a friend's WhatsApp question, not writing an essay.
- **Active task:** learner writes direct 2-3 sentence answers to his 3 FAQ questions from
  4.2, using the formula.
- **Downloadable asset:** answer-formula prompt template + a short before/after example
  bank. [Yonatan: confirm the current best-evidence answer length/structure for
  citation-likelihood before this is scripted.]
- **Duration:** 5-6 min
- **Yonatan dependency:** Yes.

### 4.4 — המתחרה שלך כבר מצוטט ב-AI. בוא נעקוף אותו
*(Tamar hook: same)*

- **Objective:** learner can add his finished FAQ block to his page with the correct
  machine-readable markup (FAQPage schema) and understand what it's actually for.
- **Core concept:** FAQPage JSON-LD is a clean signal telling AI Overviews, Google AI Mode,
  ChatGPT Search, and Perplexity how to read and cite the page — an AEO/GEO play, explicitly
  **not** a rich-snippet play (FAQPage rich results were deprecated May 7, 2026 — say this
  plainly, in one sentence, don't over-explain). The exact click-path (asking the AI builder
  to add the schema) is abstracted to a resource link; the concept is what's taught.
- **Active task:** learner asks his AI website builder to "add FAQPage schema to this FAQ
  block" and confirms it validates via an external schema-validator link (not scripted UI).
- **Downloadable asset:** FAQ-schema request prompt template + external resource link to a
  current schema-validator tool.
- **Duration:** 5 min
- **Yonatan dependency:** No new dependency — the Fix 1 framing is already locked; this
  lesson just needs to execute it faithfully.

---

## MODULE 5 — עולים לאוויר

**Module objective:** learner buys domain, deploys to Cloudflare Pages, connects GSC.
**Pre-lesson prerequisite (module-intro callout, not a lesson):** "לפני שמתחילים במודול הזה
— תפתח שני חשבונות חינמיים: GitHub ו-Cloudflare. זה לוקח כמה דקות ונעשה פעם אחת." Keeps the
module from becoming a signup tutorial.
**Locked timing caveats (see `module-4-5-narration-constraints.md`, Fix 2) — apply verbatim
in 5.2 and 5.3 when scripted.**

### 5.1 — דומיין במאה שקל: כתובת שהיא שלך לכל החיים
*(Tamar hook: same)*

- **Objective:** learner purchases and registers the domain name he shortlisted back in
  Module 1.
- **Core concept:** buying is a transaction, not a decision — the decision (the name)
  already happened in Module 1; this lesson is execution: pick a registrar, pay, confirm
  ownership. Analogy: signing the lease on an apartment you already chose.
- **Active task:** learner completes the purchase at his chosen registrar using the name
  shortlisted in Module 1, and confirms the registrant/ownership confirmation email.
- **Downloadable asset:** "לפני שקונים" checklist (ownership email correct, auto-renew on,
  no unnecessary add-ons).
- **Duration:** 4-5 min
- **Yonatan dependency:** No.

### 5.2 — האתר באוויר תוך עשר דקות — בלי לשלם על אחסון
*(Tamar hook: same)*

- **Objective:** learner deploys the site he built in Module 2 to Cloudflare Pages and gets
  a live, working URL.
- **Core concept:** deploying = handing finished files to a free global host. The 10-minute
  claim covers deploy mechanics only — account creation is the pre-lesson prerequisite, not
  inside this clock (locked caveat: "לפני שמתחילים — תפתח חשבון חינמי ב-Cloudflare Pages. זה
  לוקח שלוש דקות ונעשה פעם אחת"). Analogy: dropping a finished package at the post office —
  the building is already there.
- **Active task:** learner drags his site folder into Cloudflare Pages and confirms the
  auto-generated URL loads correctly.
- **Downloadable asset:** pre-deploy checklist (all 5 pages present, no broken links) +
  external resource link to Cloudflare Pages' current deploy docs.
- **Duration:** 5 min
- **Yonatan dependency:** No (deploy mechanics, not SEO strategy) — flag to verifier that
  the "free tier" claim is spot-checked as current at scripting time.

### 5.3 — לחבר את הדומיין: השלב שמפחיד את כולם ולוקח חמש דקות
*(Tamar hook: same)*

- **Objective:** learner connects the domain purchased in 5.1 to the live site from 5.2, and
  understands why there's a wait afterward.
- **Core concept:** connecting a domain is a name change at the "phone book" level
  (DNS/nameservers) — the click-work is 5 minutes; propagation is out of anyone's control
  (locked caveat: "השינוי עצמו לוקח חמש דקות. אחרי זה — ממתינים. לפעמים הדומיין חי תוך כמה
  דקות, לפעמים כמה שעות. זה נורמלי לגמרי"). Frame as "do it before bed, check in the
  morning," never as an anxious blocking wait.
- **Active task:** learner updates nameservers/DNS records per Cloudflare's current
  instructions, then checks the next morning that the domain resolves to his site.
- **Downloadable asset:** "מה עושים עד שזה מתעדכן" one-pager (what's normal, when to
  actually worry) + external resource link to Cloudflare's current domain-connect docs.
- **Duration:** 5-6 min
- **Yonatan dependency:** No.

### 5.4 — המסך שמראה לך מה גוגל באמת חושב על האתר שלך
*(Tamar hook: same)*

- **Objective:** learner sets up and verifies Google Search Console for his live domain, and
  can read the numbers that matter (impressions, clicks, coverage).
- **Core concept:** Search Console is the site's report card from Google — verification
  proves ownership; the dashboard shows what Google actually sees, not what the learner
  assumes. Set the expectation up front: verification is instant, but meaningful data can
  take several days to populate.
- **Active task:** learner verifies his domain in GSC (DNS or HTML-tag method) and locates
  the Performance and Coverage tabs.
- **Downloadable asset:** "3 מספרים לבדוק בחודש הראשון" checklist + external resource link
  to GSC's current verification docs.
- **Duration:** 5 min
- **Yonatan dependency:** Yes (light) — GSC verification methods and the data-lag timeline
  are time-sensitive; needs a dated confirmation before scripting.

### 5.5 — גוגל עוד לא יודע שאתה קיים. ככה מזרזים אותו
*(Tamar hook: same)*

- **Objective:** learner submits his sitemap and requests indexing so Google discovers his
  new site faster.
- **Core concept:** a new site isn't automatically crawled — submitting a sitemap and
  requesting indexing is "raising your hand" instead of waiting to be noticed. Honest
  expectation: this speeds up discovery; it does not guarantee ranking or same-day
  AI-citation.
- **Active task:** learner submits his sitemap URL in GSC and uses URL Inspection to request
  indexing for his homepage.
- **Downloadable asset:** "השבוע הראשון באוויר" checklist (sitemap submitted, homepage
  inspected, one page requested for indexing) + external resource link to current
  sitemap-submission docs.
- **Duration:** 5 min
- **Yonatan dependency:** Yes — sitemap/indexing-request mechanics and realistic timelines
  are time-sensitive; needs current confirmation before scripting.

---

## MODULE 6 — האתר חי, ואתה עסוק

**Module objective:** learner updates site via AI conversation and knows when to hand off.

### 6.1 — לעדכן את האתר בשיחה — כמו לשלוח הודעה לעובד
*(Tamar hook: same)*

- **Objective:** learner can make a real content change to his live site (new price, new
  hours, new testimonial) by describing it in Hebrew to his AI builder, and redeploy it.
- **Core concept:** updating closes the loop from Module 2's conversational workflow —
  describe the change in plain Hebrew, AI edits the file, redeploy via the same drag-and-drop
  from 5.2. This is the payoff of the "no code" promise: proving the loop still works after
  launch, not just during the build weekend.
- **Active task:** learner picks one real, small update his site needs right now and
  executes it end-to-end — prompt, edit, redeploy, verify live.
- **Downloadable asset:** "איך מבקשים עדכון מה-AI" prompt-phrasing template (what to say for
  a clean, contained edit vs. a prompt that breaks the layout).
- **Duration:** 5-6 min
- **Yonatan dependency:** No.

### 6.2 — רבע שעה בחודש ששומרת על המקום שלך בגוגל
*(Tamar hook: same)*

- **Objective:** learner can run a realistic 15-minute monthly maintenance pass using only
  what he already learned in Modules 3-5.
- **Core concept:** upkeep isn't a new skill — it's a short, repeatable checklist that reuses
  Module 5's GSC dashboard and Module 4's FAQ pattern: check GSC for new questions customers
  are searching, add one new FAQ if a pattern emerges, glance for anything broken. Realistic
  framing: this is maintenance, not a part-time job.
- **Active task:** learner runs the checklist once, live in the lesson, on his own site and
  GSC dashboard.
- **Downloadable asset:** "רבע שעה בחודש" recurring checklist — the retention artifact,
  designed to be reused every month, not just followed once.
- **Duration:** 5 min
- **Yonatan dependency:** No — reuses facts already established/verified in Modules 4-5; no
  new claims introduced.

### 6.3 — מתי כדאי להפסיק לעשות את זה לבד — והתשובה מפתיעה [COURSE CTA — locked]
*(Tamar hook: same. CTA copy already locked — see memory `project_lesson63_cta`, Noa-approved
2026-07-03. Gil scripts the lead-in only; does not alter the CTA block itself.)*

- **Objective:** learner can honestly assess, using a short decision framework, whether
  continuing DIY or handing off to a managed service fits where his business is now.
- **Core concept:** the DIY skill is real and permanent — he can always come back to it —
  but time has a price, and growth changes the math. Frame the hand-off as "you outgrew the
  free-time bracket," never as "you failed at DIY." This is where the module closes into the
  Site Bot ₪9.90 trial CTA.
- **Active task:** learner answers 3 short self-assessment questions (time available per
  month, comfort with the tools, growth stage of the business) that lead directly into the
  CTA decision.
- **Downloadable asset:** "לבד או עם עזרה" self-assessment one-pager + course-completion
  summary.
- **Duration:** 5-6 min (includes CTA)
- **Yonatan dependency:** No.

---

## Open items before scripting can begin

1. **Modules 3 and 4 are blocked on Yonatan's brief.** Every `[Yonatan: ...]` placeholder
   above needs real, dated, web-verified Israeli search data before Gil writes a single line
   of narration — per the course's forward-radar mandate, none of it can come from training
   data.
2. **Module 5 lessons 5.4 and 5.5** need a light, dated confirmation from Yonatan on current
   GSC verification/indexing mechanics and timelines — not full strategic substance, just a
   currency check.
3. **Module 6 lesson 6.3** is ready to script as soon as its turn comes in the production
   order — no external dependency, CTA copy already locked.
4. Recommended scripting order matches the decided production order: **Module 5 first**
   (no Yonatan dependency, unblocks immediately), **then Module 3, then Module 4** (as
   Yonatan's brief lands), **then Module 6** (fully self-contained, best saved for last so
   it can reference the completed skills from all prior modules in its recap language).
