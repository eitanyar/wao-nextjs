# Astra Homepage — Route & Shell Copy Recommendations

- Task ID: 2026-09-22_002 (recovery: 2026-09-22_008)
- Kanban task: t_1b67c4df (supersedes execution of blocked t_5ec6ef7d)
- Companion artifact: `docs/copy/astra-homepage-copy.json`
- Scope: recommendations only — not implementation scope. Every Hebrew replacement string below is byte-final and may be consumed by the engineer only after Hebrew QA and owner gates.
- SEO policy: existing title tags, H1s, and hero badges on non-home routes are preserved and only flagged. No silent SEO anchor change without explicit SEO approval.

---

## 1. `/google-ads/onboarding`

**Current mismatch:** The public route is an internal test/simulation flow. Code truth (`src/app/(app)/google-ads/onboarding/page.tsx:91-95,587-645`): default `mode = "test"`, sandbox badge `● Sandbox / מצב הדגמה`, the line `אתה במצב בדיקה פנימי. אין פרסום חי, חיוב או גישה לחשבון לקוח.`, and a disabled Live button (`מצב Live נעול עד להשלמת בדיקות ה-Sandbox`). The new homepage CTA `תראה לי את המודעה שלי` sends the public here, so any wording implying live campaign activation would be false.

**Proposed customer-facing treatment (homepage side is already in the copy bundle):**
- Keep the sandbox badge and the test-mode sentence exactly as rendered today; they are the truthful demo label the homepage promises (`hero.demo_note`, `paths.path_ads.status_note`).
- Do not add pricing to this route until the Ads price conflict (§9.1) is resolved.

**CTA destination:** homepage primary CTA → `/google-ads/onboarding` (demo preview flow).

**Truth/precondition:** Demo mode only; no live publishing, no billing, no client-account access. Live activation is not public.

**Status: SAFE NOW** — only with the visible demo/sandbox labeling kept. **BLOCKED** for any copy implying public live activation or for rendering the new Ads prices.

---

## 2. `/site-bot`

**Current mismatch:**
1. FAQ item 3 (`src/app/(app)/site-bot/page.tsx:37`) claims `אתה עונה על 15 שאלות בצ׳אט` — the intake actually defines 14 steps with the address step conditionally skipped (`src/app/(app)/site-bot/start/page.tsx:69-168`). The number is wrong in at least one flow.
2. The page renders full-package terms (`₪1,490 חד-פעמי`, five pages, private domain, chat edits — lines 26-51, 252-290) while continuation, VAT, automatic billing, hosting/domain ownership change scope, and refund terms remain unresolved per owner brief. The homepage therefore states only the proven trial facts and links here for details.

**Proposed exact replacement (FAQ item 3 answer, first sentence):**
- Current: `לא. אתה עונה על 15 שאלות בצ׳אט, כמו בוואטסאפ. הבוט בונה, ותוך 24 שעות האתר באוויר בכתובת שלך.`
- Replace with: `לא. אתה עונה על כמה שאלות קצרות בצ׳אט, כמו בוואטסאפ. הבוט בונה, ותוך 24 שעות האתר באוויר בכתובת שלך.`
- Rule: never state a question count on any surface.

**Proven copy that may stay (matches homepage bundle):** trial ₪9.90 = one live homepage at a WAO address before further commitment (`page.tsx:269-288`).

**CTA destination:** homepage `paths.path_local.cta` → `/site-bot/start`; details link `מה מקבלים ואיך ממשיכים?` → `/site-bot`.

**Truth/precondition:** Only the ₪9.90 trial and one live homepage are proven. Continuation/VAT/billing/hosting/refund terms must not be invented or locked anywhere.

**Status: SAFE NOW** — question-count removal and homepage alignment. **BLOCKED** — publishing continuation/subscription/refund terms until owner defines them (§9.2).

---

## 3. `/site-bot/start`

**Current mismatch:** The intake itself is truthful (14 defined steps, conditional address skip, first question opens with `יאללה` — `start/page.tsx:69-168`). The mismatch is external: sales copy elsewhere says 15 questions and the owner brief mentions 13. The homepage bundle already avoids any count.

**Proposed treatment:** No replacement text needed inside the intake. Keep step wording as-is; apply the "never state a count" rule to all marketing surfaces pointing here. The homepage secondary CTA (`רוצה לבנות נוכחות מקומית? מתחילים כאן` / `בוא נבנה את האתר שלי`) lands here directly.

**CTA destination:** `/site-bot/start` from hero, paths, and final CTA.

**Truth/precondition:** Intake collects business basics only; the ₪9.90 trial terms live on `/site-bot` and must stay unresolved-terms-free.

**Status: SAFE NOW** (no change required in this route; count claims removed elsewhere).

---

## 4. `/google-business`

**Current mismatch:** None material. Page truthfully presents GMB Bot at ₪149/month with WhatsApp approvals (`google-business/page.tsx:1-45`). Risk is only contextual: visitors from the new homepage must not read GBP management as included in the Site Bot path or in any entry price.

**Proposed treatment:** Keep page copy and SEO anchors unchanged. The homepage already carries the seam line: `ניהול שוטף של פרופיל גוגל עסקי הוא שירות נפרד — לא כלול במסלול הזה.` (`paths.path_local.not_included_line`). Present this route as an optional extension in the footer, never as part of 9.90/249 ILS.

**CTA destination:** optional extension only; no homepage primary CTA points here.

**Truth/precondition:** ₪149/month, separate service, optional.

**Status: SAFE NOW.**

---

## 5. `/about`

**Current mismatch:** The About FAQ (`about/page.tsx:99-116`) defines the ideal client as B2C with ₪10,000+/month marketing budget and management from ₪3,500/month. The new homepage targets tradespeople and small service businesses at a low entry price. Unmarked, the About page contradicts the entry positioning and can deter the exact persona the homepage invites.

**Proposed exact addition (top-of-FAQ qualifier, one item):**
- `שאלה: יש שירותי פרימיום — למי הם מתאימים?`
- `תשובה: ניהול השיווק השוטף של WAO (מ-₪3,500 לחודש, לתקציבי מדיה של ₪10,000+) הוא שירות פרימיום נפרד. המסלולים בדף הבית — מודעות בגוגל ואתר עם נוכחות מקומית — הם מוצרי הכניסה, במחיר שמתאים לעסק קטן.`

**CTA destination:** homepage `people.cta` (`להכיר אותנו`) → `/about`.

**Truth/precondition:** Premium figures are existing displayed-site facts, presented strictly as a separate premium service — not entry-plan terms.

**Status: SAFE NOW** for the premium-vs-entry labeling. **BLOCKED** for changing any premium price until owner confirms.

---

## 6. `/maoved`

**Current mismatch:** None material. Page truthfully shows plans starting at ₪160/month with call tracking and lead management (`maoved/page.tsx:145-170`). Risk is contextual only: the homepage must not imply a full CRM is included in any entry price.

**Proposed treatment:** Keep page copy and SEO anchors unchanged. Homepage seam lines already state: `מעקב שיחות וניהול לידים פשוט — הרחבות לפי המסלול, בתשלום נפרד.` and `שום הרחבה לא כלולה אוטומטית במחיר הכניסה.` Homepage CTA `פרטים על מערכת הלידים` → `/maoved`.

**CTA destination:** `/maoved` from the lead-handling section only.

**Truth/precondition:** From ₪160/month, optional extension, separate payment.

**Status: SAFE NOW.**

---

## 7. `src/components/Header.tsx`

**Current mismatch:** Primary nav is agency-service oriented (`קידום אתרים · פרסום בגוגל · הכשרות · יועץ שיווקי · בלוג · אודות`, `Header.tsx:6-13`) with CTA `התחל ב-₪9.90` → `/site-bot`. The approved homepage story is two paths with Ads preview as primary conversion; blog/training/secondary services belong in the footer.

**Proposed exact replacement strings (from the copy bundle `navigation`):**
- Nav links: `איך זה עובד` → `/#proof` · `המסלולים והמחירים` → `/#paths` · `מי אנחנו` → `/#people` (separator ` · `).
- Primary CTA: `תראה לי את המודעה שלי` → `/google-ads/onboarding`.
- Small help link: `יש שאלה? דבר איתנו` → `/contact#contact-form` (anchor exists, `contact/page.tsx:168`).
- Move `בלוג`, `הכשרות`, and complementary services out of primary nav into the footer — not deleted, only demoted.
- Mobile quick actions (contact form + WhatsApp) may stay as-is.

**CTA destination:** primary → `/google-ads/onboarding`. Replace the existing Site Bot price CTA; do not retain a second primary CTA in the header.

**Truth/precondition:** Anchor targets `#proof`, `#paths`, `#people` must exist on the rebuilt homepage before the nav ships.

**Status: SAFE NOW** — conditional on the engineer shipping the matching homepage section ids in the same change.

---

## 8. `src/components/Footer.tsx` and retained main-nav destinations

**Current mismatch (Footer.tsx):**
1. No footer link to `/site-bot` although it is a primary conversion path.
2. Brand line `סוכנות שיווק דיגיטלי מובילה בישראל מאז 2006...` (`Footer.tsx:88-89`) uses unmeasured-superlative agency framing (`מובילה`) that the new tone rules avoid; `מאז 2006` is consistent with `people.intro` and may stay.
3. The footer must absorb the demoted nav items (blog, training, complementary services) without deleting them.

**Proposed exact replacement strings:**
- Brand line: `אנשי שיווק ותיקים מובילים את הדרך, וסוכני AI מבצעים חלק מהעבודה. שיווק בגוגל לעסקים קטנים — מודעות, אתרים ונוכחות מקומית, מאז 2006.`
- Add to `שירותים` column: `{ label: "Site Bot — אתר לעסק", href: "/site-bot" }`.
- Add to `שירותים` column: `{ label: "תצוגת מודעה לעסק שלך", href: "/google-ads/onboarding" }`.
- Keep all existing columns/links; they already host blog, training, and complementary services.

**Retained main-nav destinations (demoted to footer):**
- `/seo`, `/google-ads`, `/training`, `/consulting`, `/blog` — keep pages, copy, and all SEO title/H1/badge anchors unchanged in this outcome. `/about` stays linked (see §5).
- `/google-ads` specifically: page displays legacy `דמי ניהול מ-1,500 ₪/חודש` (`google-ads/page.tsx:38,53,127`). This is the corroborated public price and it conflicts with owner-reported new Ads terms (9.90 setup / first month free / 249 per month). Do not edit either side until the owner resolves the conflict (§9.1); the homepage renders no Ads price meanwhile.

**CTA destination:** footer links only; no primary conversion CTA changes beyond §7/§8 additions.

**Truth/precondition:** Footer additions must not present optional extensions as included features.

**Status: SAFE NOW** — footer link additions and brand-line alignment. **BLOCKED** — any price edit on `/google-ads` pending §9.1.

---

## 9. Unresolved owner/product decisions (do not block the truthful homepage)

1. **Ads price conflict.** Owner-reported terms (₪9.90 setup, first management month free, ₪249/month, media budget separate) are not corroborated by the public `/google-ads` page, which shows legacy ₪1,500/month management. Decision needed: which terms are real, and where each appears. Until then the homepage renders no Ads price and the copy bundle omits it deliberately (`paths.path_ads.pricing_guidance`).
2. **Site Bot continuation terms.** Continuation/subscription after the ₪9.90 trial, VAT treatment, automatic billing, hosting/domain ownership-change scope, and refund window/amount/channel are undefined. Do not invent or lock them on any surface; `/site-bot` detail wording stays bounded until the owner decides.
3. **Public live Ads activation.** Live mode is locked pending sandbox validation. Decision needed: when (and for whom) public live activation opens, and what the public CTA may promise then. Until then all public Ads copy must stay demo-labelled.
4. **Absent proof assets.** No approved product asset matches the homepage proof section (ad + landing page for one fictional business); the only approved person photo is `/eitan-yariv.avif`; no case study has complete repository evidence (owner, city, need, work, period, result, measurement). Decision needed: approve a clean labelled UI demonstration build (recommended, per `proof.asset_guidance`) or supply real assets. No fabricated screenshots, leads, rankings, or results in the meantime.
5. **Question-count treatment.** Public copy has said 13 and 15; the intake defines 14 steps with a conditional skip. Recommended single treatment (already applied in the bundle): never state a count anywhere. Owner confirmation requested for the `/site-bot` FAQ fix in §2.

These open items are recorded here as required; none of them blocks shipping the truthful homepage copy.
