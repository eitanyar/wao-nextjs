# Homepage v7 — Founder-Audit Draft, QA-Corrected (2026-10-20)

- Task: t_3586891d — execute `handoff/pending/2026-10-20_001_waocopy_correct-homepage-v6-qa.md`. Homepage only; Site Bot and Google Ads are subsequent drafts, not part of this packet.
- Author: waocopy (Tamar), qwen3.8-max via alibaba — canonical profile, no model switch. Draft only: nothing applied to source, nothing published, committed or deployed.
- Base and sources: v6, `docs/copy/homepage-founder-audit-2026-10-19-v6.md` — verified byte-identical in terminal before and after authoring (sha256 2065c52481a8f431c17ae13ca36244afa8238806272c5c808d5d23f1075b696f), preserved unchanged. v6 lineage carried: v5 Page 1, `docs/copy/three-page-sales-draft-2026-10-14-v5.md` (sha256 39704c748a0d8c0843f8c60ba7d932bbaac09188a596d1745d8dce0dbf2860ab), plus Eitan's founder homepage audit (Telegram message, 2026-10-19 21:11 +07, session `default/20261015_095733_109d92b9`, msg 19469 — full text recovered from session history in the v6 run). Resident waocopy commercial-voice memory applied.
- Scope of v7 (exact corrections for the two material findings of independent Hebrew QA t_1b77569d — nothing else): (1) §1.6 heading pronoun aligned with its body, so heading and answer address the same recipient — the customer (`אליך`); (2) spoken-comprehension splits in §1.3 hero body, §1.5 two-path intro, §1.5 local-presence card description and §1.9 FAQ #4 answer: every spoken sentence now within the 12–15-word resident rule, one idea each, with no fact, offer term, benefit, route or anchor added, removed or altered. All other content preserved from v6 byte-identically; full change log in note N13.
- Method: every founder-approved wording adopted; every founder wording that crosses the contract's claim boundaries (guaranteed outcomes, ₪49 offer, competitor prices, "all risk is ours", Google recommendation, superlatives, invented features) is rewritten to preserve his commercial intent in positive, evidence-safe language, and flagged in the internal English note at the end — never as customer-facing disclaimers.
- Protected anchors kept byte-exact: hero eyebrow, hero H1 (both lines), video embed/links, founder photo/name/role/accountability line, Google Partner status line/badge/directory link, all v5 route destinations, footer (per contract §29 — founder's pasted footer was corrupted; see internal note N9).
- Gates PENDING (none claimed here): independent Hebrew QA (waohebrewqa) on this exact v7; founder review; SEO gate on every title/H1 proposal; engineering confirmation of `/site-bot/audit`; publication revalidation of proof claims.

---

## 1.1 Metadata (all proposals SEO-gated)

- Title tag (PROPOSAL, founder wording): `שיווק בגוגל — תוצאות חזקות במינימום מאמץ לאנשי מקצוע ‏| WAO`
  - Bidi note: ends with the RLM-anchored `‏| WAO` suffix per site template rule. Founder's paste used a plain hyphen; em dash used per template convention (see note N8).
- Meta description (PROPOSAL, founder wording, line-break paste artifacts cleaned): `יותר פניות מתאימות מהאזור שלך: אתר ונוכחות בגוגל באזור השירות, או פרסום מדויק ללקוחות שמחפשים עכשיו. דוח נוכחות חינם — ואת הפערים שנוכל לסגור עבורך.`
- Open Graph title (PROPOSAL, unchanged from v5 — founder kept it): `שיווק בגוגל לבעלי מקצוע ונותני שירות — WAO`
- Open Graph description (PROPOSAL, unchanged from v5 — founder kept it): `נוכחות מקומית חזקה בגוגל ופרסום שמביא פניות ששווה לענות עליהן. דוח נוכחות ראשון — חינם.`
- Canonical: `https://www.wao.co.il/` (existing).
- OG image: UNRESOLVED — no approved social-share asset found; carried from v5, engineering/strategist to supply.

## 1.2 Header (site-wide; desktop + mobile)

- Logo: `WAO` → `/` (aria-label: `WAO`)
- Primary nav links:
  - `פרסום בגוגל` → `/google-ads`
  - `אתר מדויק ונוכחות מקומית` → `/site-bot` (FOUNDER label change from v5 `אתר ונוכחות מקומית`)
  - `מי אנחנו` → `/about`
- Help link (desktop lg+): `יש שאלה? דבר איתנו` → `/contact#contact-form`
- Header primary CTA (button): `לדוח הנוכחות שלי — חינם` → `/site-bot/audit`
- Mobile menu: same three nav links, then help link, then CTA button. Menu button aria-label: `Menu`.

## 1.3 Hero

- Eyebrow (PROTECTED — byte-exact): `שיווק בגוגל לבעלי מקצוע ונותני שירות`
- H1 (PROTECTED — byte-exact, two visual lines):
  - line 1: `יותר לקוחות מגוגל.`
  - line 2: `פחות שיווק על הראש.`
- Body (FOUNDER rewrite, claim-cleaned per contract — see notes N1, N2; v7 narration splits only, facts unchanged):
  > יש לך עסק טוב. הלקוחות הכי טובים שלך מגיעים מהמלצות. אבל המלצות לבד לא מספיקות. גוגל משלים את התמונה. כשמישהו מחפש את השירות שלך באזור שלך, הוא צריך למצוא אותך. וגם להעדיף אותך. WAO מסדרת לך נוכחות אורגנית חזקה, שעובדת בשבילך כל הזמן. בלי תשלום על כל קליק. וכשתרצה להתחיל מהר יותר, נקים איתך קמפיין בגוגל. קמפיין שמכוון לפניות שמתאימות לך. היום שלך חוזר אליך. השיווק יורד ממך.
- Primary CTA (button): `קבל את הדוח שלי — חינם` → `/site-bot/audit`
- Supporting line (under CTA): `דוח נוכחות בגוגל לעסק שלך, עם התיקונים שאפשר לעשות לבד.`
- Secondary CTA (link): `מעדיף להתחיל מפרסום בגוגל?` → `/google-ads` (kept from v5 — not listed in the founder's paste but not explicitly removed; supports the audit's distinct-paths direction; see note N10)

## 1.4 Proof — customer video (preserved from v5)

- Section heading: `סרטון ההמלצות של לקוחות WAO`
- Player: non-autoplay iframe.
  - iframe title (aria): `סרטון המלצות לקוחות WAO ביוטיוב`
  - embed: `https://www.youtube-nocookie.com/embed/zrgqx7OOtcc`
- Direct link (fallback): `לצפות בסרטון ביוטיוב` → `https://www.youtube.com/watch?v=zrgqx7OOtcc` (opens new tab)
- Copy rule honored: no characterization, quotation or description of anyone in the video.

## 1.5 Two paths

- Section heading: `מאיפה יגיע הלקוח הבא שלך?`
- Intro (FOUNDER rewrite — distinct organic-local vs paid-search explanation; v7 narration splits only, facts unchanged): `יש שתי דרכים טובות להתחיל. הראשונה מסדרת ומשפרת את הנוכחות הקבועה שלך בגוגל. הכוונה לפרופיל העסקי במפות, ולאתר המדויק שלך. השנייה שמה אותך מול אנשים שמחפשים אותך עכשיו. זאת מודעה מדויקת, שמובילה לדף נחיתה תואם. בוא לגלות מה מתאים לך. ואפשר גם את שתיהן יחד.`

- Card A — local presence (featured first, matches free-report front door; founder kept v5 text; v7 narration splits only, facts unchanged):
  - Eyebrow: `אתר ונוכחות מקומית`
  - Heading: `שמי שמחפש בעל מקצוע באזור — יוכל למצוא אותך`
  - Description: `פרופיל עסקי מסודר בגוגל ואתר ברור עושים את ההבדל. ההבדל בין "מצאתי מישהו" ל"מצאתי אותו". מתחילים בדוח חינם. הוא מראה אילו פרטים של העסק שלך מוצגים בגוגל. משם ממשיכים בקצב שלך, עד למסלול אחד. שם האתר, האחסון והניהול השוטף מטופלים בשבילך.`
  - Primary CTA: `קבל את הדוח חינם` → `/site-bot/audit`
  - Supporting link: `כל הפרטים על המסלול` → `/site-bot`

- Card B — Google Ads:
  - Eyebrow: `פרסום בגוגל`
  - Heading: `להגיע למי שמחפש את השירות שלך היום`
  - Description (v5 preserved; founder's added lead-scoring sentence not adopted — see note N3): `מודעה מדויקת שמה אותך מול הלקוח ברגע החיפוש. הוא נכנס לדף נחיתה ברור, מבין מה אתה מציע — ומשאיר פנייה. מדידת ההמרות מחוברת לקמפיין, וכל פנייה שמגיעה מהמודעות נספרת ומוצגת לך.`
  - Primary CTA (benefit-led conversation — owner rejected "see an ad" as the central proposition): `דבר איתנו על הפרסום של העסק שלך` → `/contact#contact-form`
  - Secondary CTA (supporting proof — demo): `תראה לי מודעה לעסק שלי — יש הדגמה` → `/google-ads/onboarding`
  - Demo value line (FOUNDER addition — demo useful before spend): `מתאים לך לראות את המודעה ואת הדף לפני ששמת על זה שקל? עכשיו זה אפשרי.`
  - Demo status note (under secondary, required mode disclosure): `ההדגמה פועלת במצב הדגמה, בלי פרסום חי ובלי חיוב.`
  - Supporting link: `עוד על ניהול פרסום` → `/google-ads`

- Choosing help:
  - Line: `מתלבט במה להתחיל? ספר לנו על העסק שלך, ונבחר יחד כיוון.`
  - Link: `נדבר על העסק שלי` → `/contact#contact-form`

## 1.6 Lead handling (FOUNDER simplification — heading and single routing line; see note N4; v7 heading pronoun aligned with body per QA)

- Section heading: `איך מגיעות אליך הפניות?`
- Body: `הפניות מגיעות אליך ישירות — לטלפון, לוואטסאפ, למייל או לטופס. אתה בוחר את הערוץ שנוח לך ומתאים לעסק שלך.`
- Removed per founder audit (were in v5): call-tracking extension line, lead-management extensions line, Maoved ₪160 line and its CTA. `/maoved` remains linked from the footer.

## 1.7 Method and price logic (FOUNDER rewrite, claim-cleaned — see note N5)

- Section heading: `איך זה עובד במחיר שמתאים לעסק קטן?`
- Lines:
  - `את השיטה מובילים אנשי השיווק של WAO. יש להם 20 שנות ניסיון אמיתי בהתאמת לידים מגוגל לבעלי מקצוע ואנשי שירות.`
  - `כלי אוטומציה מתקדמים מבצעים חלק גדול מהמחקר, מהכתיבה ומההקמה.`
  - `ואנחנו תמיד בלופ — מאשרים כל שלב ומשפרים אותו.`
  - `ככה אתה נהנה ממחיר כניסה נמוך, בלי לוותר על רמה מקצועית גבוהה.`
- Human seam line (single plain disclosure, preserved from v5): `וכל תוצאה עוברת בדיקה אנושית לפני שאתה רואה אותה, וצוות WAO זמין לך בשאלות.`
- Note: zero AI-themed positioning on the customer page; mechanism explained once, as capability and affordability only.

## 1.8 People — founder and Partner proof

- Section heading: `מי עומד מאחורי WAO?`
- Intro: `אנשים אמיתיים, עם ניסיון בשיווק דיגיטלי מאז 2006.`
- Photo: `/eitan-yariv.avif` — alt: `איתן יריב, מייסד WAO` (the only approved real-person photo)
- Name: `איתן יריב`
- Role: `מייסד WAO, יועץ שיווק ופרסום בגוגל`
- Accountability line: `איתן עומד מאחורי הכיוון המקצועי של העבודה ב-WAO.` (no claim of personal oversight of every job)
- About link (button): `להכיר את איתן` → `/about`
- Partner proof block:
  - Heading: `WAO היא Google Partner`
  - Founder-intent line (evidence-backed replacement of "מומלצת גוגל" — see note N6): `כשאתה בוחר מי מטפל בשיווק שלך בגוגל — אל תתפשר. תבחר סוכנות שרשומה רשמית כ-Google Partner.`
  - Status line (preserved from v5, evidence-backed): `WAO רשומה בספריית השותפים הרשמית של גוגל כ-Google Partner, עם הסמכות Search ו-Display.`
  - Badge image: `/google-partner-badge.svg` — alt: `תג Google Partner של WAO`
  - Directory link: `לבדוק בספריית השותפים` → `https://partnersdirectory.withgoogle.com/partners/7030100386` (new tab)

## 1.9 FAQ (supporting, not main narrative)

- Section heading: `שאלות שבעלי עסקים שואלים`
- Items:
  1. Q: `יש לי כבר אתר. זה רלוונטי אליי?`
     A: `בהחלט. דוח הנוכחות בודק את ששת שדות המידע של הפרופיל העסקי שלך בגוגל, כולל קישור האתר. ומסלול הפרסום שם אותך מול מי שמחפש את השירות שלך עכשיו. כל פנייה שמגיעה נכנסת ישירות לאתר שלך, או לדף נחיתה ממוקד.`
  2. Q: `מה צריך להכין לפני שמתחילים?`
     A: `לדוח מספיק שם העסק. את השאר נשלים יחד, בקצב שלך ובגובה העיניים.`
  3. Q: `אין לי רקע בשיווק. זה בעיה?`
     A: `בשביל זה אנחנו כאן. אתה איש המקצוע — ואנחנו מטפלים בצד השיווקי, בשפה פשוטה ובגובה העיניים.`
  4. Q: `מתי יתחילו להגיע פניות?`
     A (FOUNDER intent — see before you spend; ₪49/competitor-price/risk-reversal wording not adopted, see note N7; v7 narration splits only, facts unchanged): `הקצב תלוי בביקוש, בתחרות, בתקציב ובהצעה שלך. אנחנו בונים מדידה שקופה מהיום הראשון. אתה רואה את הנתונים האמיתיים לאורך כל הדרך. אתה גם לא משקיע שקל בפרסום לפני שראית את הכיוון. בהדגמה אתה רואה מודעה ודף נחיתה לעסק שלך. בלי פרסום חי ובלי חיוב. יוצאים לדרך רק כשזה מתאים לך.`
  5. Q: `יש התחייבות או חוזה ארוך טווח?`
     A: `במסלול האתר והנוכחות המקומית, השירות פועל כל עוד המינוי החודשי פעיל. אם תחליט לעצור, השירות מסתיים והאתר לא ממשיך איתך — אנחנו אומרים את זה מראש. על שאר המסלולים תקבל מאיתנו תשובה מלאה וגלויה בשיחה, לפני כל תשלום.`

## 1.10 Final CTA (preserved from v5 — founder kept it unchanged)

- Heading: `כשהלקוח הבא שלך יחפש בגוגל, נסדר לך נוכחות שתאפשר לו למצוא אותך.`
- Body: `הדוח החינמי הוא הצעד הראשון — תמונה ברורה של איך העסק שלך מוצג היום, ומה כדאי לסדר קודם. משם ממשיכים למה שמתאים לך: נוכחות מקומית, פרסום, או שניהם. והשיווק יורד ממך — אתה חוזר להתרכז בעבודה עצמה.`
- Primary CTA: `קבל את הדוח חינם` → `/site-bot/audit`
- Secondary CTA: `מעדיף לדבר עם בן אדם?` → `/contact#contact-form`

## 1.11 Footer (site-wide; byte-exact from v5 per contract §29 — founder's pasted footer was corrupted; see note N9)

- Brand: `WAO` → `/`
- Brand blurb: `אנשי שיווק בגוגל לעסקים קטנים, עם ניסיון אמיתי בשטח מאז 2006.`
- Phone (PhoneReveal, source `footer`): reveal button `הצג מספר טלפון`; revealed: `052-614-8860` (tel: `0526148860`); plain tel link on mobile.
- Location: `ראשון לציון, ישראל`
- Column `שירותים`:
  - `קידום אתרים (SEO)` → `/seo`
  - `פרסום בגוגל` → `/google-ads`
  - `שיווק תוכן` → `/content`
  - `יועץ שיווקי` → `/consulting`
  - `בוט גוגל לעסק שלי` → `/google-business`
  - `מה מקבלים ואיך ממשיכים?` → `/site-bot`
  - `תראה לי מודעה לעסק שלי` → `/google-ads/onboarding`
- Column `חברה`:
  - `אודות WAO` → `/about`
  - `הבלוג שלנו` → `/blog`
  - `צור קשר` → `/contact`
- Column `שירותים נוספים`:
  - `מערכת "מה עובד" (CRM)` → `/maoved`
  - `בניית אתרים ו-LP` → `/build`
  - `מדיה חברתית` → `/social`
  - `הכשרות שיווק` → `/training`
- Column `מדריכים וכלים`:
  - `מדריך קידום אתרים` → `/seo/guide`
  - `מדריך שיווק שותפים` → `/training/affiliate-marketing`
  - `מילון מונחים` → `/glossary`
  - `כל הקורסים` → `/training`
- Bottom bar: `© {year} WAO. כל הזכויות שמורות.` + `מדיניות פרטיות` → `/privacy` + `נגישות` → `/accessibility`

---

# INTERNAL ENGLISH NOTE — proposed vs verified, unresolved claims (not customer-facing)

## N0. Provenance and method
- Authored by waocopy, qwen3.8-max via alibaba (canonical profile, no fallback), kanban task t_3586891d, run 1625, 2026-10-20, under `handoff/pending/2026-10-20_001_waocopy_correct-homepage-v6-qa.md`. Single new artifact; v6 preserved byte-identical (sha256 2065c524… verified in terminal before and after authoring). Base: the v6 draft (t_37dfb4af, authoring DONE) corrected only for the two material findings of independent Hebrew QA t_1b77569d — the §1.6 pronoun mismatch and the spoken-comprehension splits in §1.3, §1.5 intro, §1.5 local card and §1.9 FAQ #4. Founder audit text remains recovered verbatim in the v6 lineage (session `default/20261015_095733_109d92b9`, msg 19469). No source/runtime edits; no QA, application, publication, commit, push or deploy. Spoken body/FAQ sentences target 12–15 words, singular male, native Sabra register. Full change log: N13.

## N1. Founder wordings softened for outcome certainty (intent preserved)
- Hero, founder original: "נוכחות אורגנית, שתמיד שם להביא את הפניות האיכותיות יותר" — implies guaranteed inquiry volume/quality. v7 (v6 wording, narration-split): "נוכחות אורגנית חזקה, שעובדת בשבילך כל הזמן. בלי תשלום על כל קליק" — always-on benefit and no-per-click-cost contrast kept; no promised inquiries.
- Hero, founder original: "תוכל ברגע להקים את הקמפיין... שיביא הכי מהר את הפניות שמתאימות לך" — implies immediate launch and guaranteed fastest inquiries. v7 (v6 wording, narration-split): "וכשתרצה להתחיל מהר יותר, נקים איתך קמפיין בגוגל. קמפיין שמכוון לפניות שמתאימות לך" — speed-as-positioning and fit-as-targeting kept; no launch-timing or outcome guarantee.
- Two-paths intro, founder original: "קרא לזה 'אופטימיזציה' ושיפור הנראות בתוצאת המפות" — as a promised result this edges into ranking implication. v7 (v6 framing, narration-split) frames it as the work performed ("מסדרת ומשפרת את הנוכחות הקבועה שלך בגוגל. הכוונה לפרופיל העסקי במפות, ולאתר המדויק שלך"), matching the contract's distinct-paths direction without promising map results.

## N2. "חובה שימצא אותך וגם יעדיף אותך על אחרים" (hero)
- Kept as the customer's need, not a WAO guarantee: "הוא צריך למצוא אותך. וגם להעדיף אותך" (v6 dash phrasing narration-split in v7; same framing class the v5 review passed). "על אחרים" dropped to avoid a competitive-superiority claim.

## N3. Founder's lead-quality scoring sentence (card B) — NOT adopted
- Founder original: "דירוג איכות הפניה, מאפשרת למע' ללמוד איך לטייב את הבאות." Contract forbids inventing lead-quality scoring/learning; no evidence such a feature exists. Removed. UNRESOLVED: if the founder confirms a real lead-rating capability, it can return in a future version with verified wording.

## N4. Lead-handling section — email routing UNVERIFIED
- Founder simplified the section to one routing line and added email ("למייל הכי טוב שלך"). v5 evidence supports phone/WhatsApp/form only; email lead routing is not verified against the product. v7 keeps the founder's channel list ("לטלפון, לוואטסאפ, למייל או לטופס") per his explicit wording — FLAGGED: engineering/strategist must confirm email routing exists before publication, or drop "למייל". QA fix (t_1b77569d finding 1): the v6 heading used the first-person pronoun ("אלי") while the body addressed the customer ("אליך"); the v7 heading reads "איך מגיעות אליך הפניות?" — heading and answer now address the same recipient, the customer; the body wording is unchanged.
- The v5 separately priced extension lines (call tracking, lead management, Maoved from ₪160) were removed per the founder's simplification; `/maoved` remains reachable from the footer. No pricing fact was lost from the page (those were optional paid add-ons, and Maoved keeps its own page).

## N5. Method section — superlative and AI contrast softened
- Founder original: "בלי לוותר על המקצועיות הגבוהה ביותר- מה שקורה לרבים שמשחררים את המושכות ל-AI." Superlative service claims are forbidden, and the AI-contrast clause violates the zero-AI-positioning / no-contrast-scaffolding rules. v6: "בלי לוותר על רמה מקצועית גבוהה" — the low-price-without-compromise intent is preserved.
- "20 שנה" experience wording: consistent with the evidenced "since 2006" (2026−2006). Founder wording adopted, using his own phrase "בהתאמת לידים מגוגל לבעלי מקצוע ואנשי שירות" (lead-matching experience — not a promise of future leads). Publication revalidation of the 2006 claim remains pending (carried from v5 L5).
- Narration splits (facts unchanged): per the independent-QA finding on v6, the §1.3 hero body, §1.5 two-path intro, §1.5 local-presence card description and §1.9 FAQ #4 answer were split in v7 into single-idea sentences within the 12–15-word resident rule; v6's earlier splits (two-paths intro, 1.7 first line, 1.8 founder-intent line, FAQ #4) remain in place. The only word-level additions are grammatical echo subjects required when a clause becomes its own sentence, and two dropped sentence-initial conjunctions (ו) where a comma became a period; no fact was added, removed or altered by any split. v5-protected/byte-preserved lines were not re-split.

## N6. "סוכנות מורשה ומומלצת גוגל" — Google recommendation NOT supported
- Founder original: "אל תתפשר על עבודה עם פחות מסוכנות מורשה ומומלצת גוגל!" "Recommended by Google" is explicitly unsupported by the reviewed evidence. v7 keeps the founder's don't-compromise intent with evidence-backed wording: "סוכנות שרשומה רשמית כ-Google Partner", followed by the unchanged v5 status line (directory listing + Search/Display certifications).

## N7. FAQ #4 — ₪49 offer, competitor prices, risk reversal NOT adopted
- Founder original: "חברות אחרות יבטיחו ויגהצו מאות עד אלפי שקלים... אצלנו הניסיון שלך מתחיל מ 49 ש"ח למודעה הנכונה ודף הנחיתה המושלם... כל הסיכון עלינו וההצלחה שלך."
- Contract forbids: the ₪49 offer (no evidence; the verified deposit is ₪9.90 build-slot for the site path), competitor price claims, and "all risk is ours". v7 preserves the founder's actual commercial intent (wording unchanged from v6; narration-split only) — see the ad and landing page before spending anything, decide only when it fits — using the v5-reviewed demo wording. UNRESOLVED: if the founder intends a real ₪49 Ads-path entry offer, it must be confirmed and specced before it can appear in copy.

## N8. Title tag punctuation
- Founder's paste used " - " between phrases; normalized to em dash "—" per the site template convention seen in v5. SEO gate still applies to the whole proposal.

## N9. Footer paste corruption
- Founder's pasted footer blurb read "אנשי שיווק בגוגל אם אהבה לאנשי שירות וניסיון אמיתי בשטח מאז 2006" — "אם" is an obvious corruption of "עם". Per contract §29 the entire footer is kept byte-exact from v5 until Eitan corrects that text. FLAGGED for founder confirmation: does he want the brand blurb changed to something like "אנשי שיווק בגוגל, עם אהבה לאנשי שירות וניסיון אמיתי בשטח מאז 2006"? If yes, it lands in the next version with his exact wording.

## N10. Kept-from-v5 items not listed in the founder's paste
- Hero secondary CTA (`מעדיף להתחיל מפרסום בגוגל?` → `/google-ads`) and the video section heading were not enumerated in the founder's paste but were not explicitly removed; both are kept because they serve the audit's distinct-paths direction and the protected proof assets. If the founder meant to drop the hero secondary CTA, say so and it comes out in the next version.
- Meta description: "חינם" added to the founder's "דוח נוכחות ואת הפערים שנוכל לסגור עבורך" — the report is verified-free and the contract directs showing it as a useful free report.

## N11. Unresolved evidence items carried from v5 (still open)
- `/site-bot/audit` route readiness — publication-blocking until engineering confirms the free ungated report-first flow is live there.
- OG share image asset — none approved.
- Publication revalidation: "since 2006", Google Partner listing and Search/Display certifications.
- All prices referenced anywhere on this page path remain the approved set: ₪199/month (site + hosting + management), ₪9.90 build-slot deposit credited to month 1, ₪249/month Ads management with media paid separately to Google. No new price, term or guarantee was introduced in v6 or v7.

## N12. Status
- Authoring-complete only (v7 corrections within contract scope; nothing else touched). No self-QA, independent QA, founder approval, SEO approval, source application or release readiness is claimed. After formal DONE, waostrategy routes one exact-version independent Hebrew QA on this v7 artifact; founder review remains required before any application or publication.

## N13. v7 change log (exact scope; everything else byte-identical to v6)
1. Header block: title, task, base/sources, scope and gates lines updated for v7 provenance. Method and protected-anchor lines unchanged; no protected anchor was touched.
2. §1.3 hero body — narration split only (7 sentences → 12). Word-level changes are limited to punctuation, two dropped sentence-initial conjunctions (ו) where a comma became a period, and one grammatical echo subject ("קמפיין שמכוון לפניות שמתאימות לך"); "וגם להעדיף אותך" kept verbatim as its own sentence. Eyebrow and H1 untouched.
3. §1.5 two-path intro — narration split only (4 sentences → 7): the colon list became "הכוונה לפרופיל העסקי במפות, ולאתר המדויק שלך"; the dash appositive became "זאת מודעה מדויקת, שמובילה לדף נחיתה תואם"; the closing line became two sentences. Same items, same meaning, no new claim.
4. §1.5 local-presence card description — narration split only (3 sentences → 6): the "מצאתי מישהו" / "מצאתי אותו" contrast preserved verbatim as an echo sentence; relative clauses became standalone sentences with echo connectors ("הוא מראה…", "שם האתר…").
5. §1.6 heading — recipient pronoun changed from first-person "אלי" to second-person "אליך", so the heading now reads "איך מגיעות אליך הפניות?" and matches the body, which always said the inquiries reach the customer (QA finding 1). Body unchanged; old string intentionally not reproduced here.
6. §1.9 FAQ #4 answer — narration split only (5 sentences → 7): punctuation and one dropped sentence-initial conjunction (ו); every content word preserved.
7. Internal notes: N0 rewritten for v7 provenance; N1/N2 quotes refreshed to the split wording (facts unchanged); N4 documents the heading fix; N5 narration-split bullet updated; N6/N7/N11/N12 version references refreshed; N9/N10 "lands in v7" rephrased to "the next version" since this is v7. Section labels of corrected passages marked "v7 narration splits only, facts unchanged".
8. Not touched: §1.1 metadata (no spoken-passage correction required a title/meta change), §1.2 site header, §1.4 video proof, §1.5 card B and choosing-help lines, §1.7 method/price, §1.8 people/Partner, §1.9 FAQ items 1/2/3/5, §1.10 final CTA, §1.11 footer; notes N3, N8, N9 content, N10 content and the N11 open-items list.
