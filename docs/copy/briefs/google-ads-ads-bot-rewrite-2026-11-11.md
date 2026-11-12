# Brief: /google-ads — rewrite around the Google Ads Bot (2026-11-11)

**Reader:** a hands-on Israeli micro-business owner (plumber, electrician, AC tech…), singular male. He's busy and ROI-minded, has been burned by agencies or by paying for clicks with nothing to show for it, and is allergic to jargon and AI-sounding copy. Voice: the /site-bot/audit exemplar (loaded). Apply every approved writing rule (loaded).

**The offer changed. The live page is wrong.** The page currently sells human campaign management "from ₪1,500 per month". That is not the offer. The offer is the **WAO Google Ads Bot**:
- **₪249/month** to WAO, from day one, with no trial. Month to month, with no minimum and no notice period. Billed at the start of the month.
- The client must spend **at least ₪1,500/month on ads**. That money is **paid directly to Google from his own Google Ads account, not to WAO**. Call it a minimum, not a recommendation.
- The client owns his Google Ads account, campaigns and data. WAO manages through its MCC (manager account). He sees clicks, impressions and total cost at any time. There is a written agreement (the terms).
- The bot runs the campaigns: setup, ads, landing pages, optimisation and a weekly report. Fraud Blocker (blocks fake clicks) is included. Eitan is one chat message away when needed.
- A free 30-minute call includes a look at his account.
- **30-day money-back commitment:** a refund of WAO's ₪249 service fee only, never the ad spend. The 30 days start when his first ad goes live. State the three conditions right next to the offer: the ads ran at the ₪1,500 pace; one refund per business; he asks within 7 days of the 30 days ending. If WAO fails to get his ads live, the refund is automatic. It comes on top of the legal 14-day cancellation right.
- **Landing pages** run on WAO's system as part of the subscription. If he cancels, they stay up 30 more days and then go offline. He can buy them out for ₪900, and they're his free after 12 paid months. When he cancels, the bot warns him and offers to pause the ads or point them to his own site. State this openly in the FAQ.
- A fully managed human option exists but is **not promoted**. Don't mention it.
- The page must give the product one name. Use "Ads Bot" or a Hebrew name of your choice, consistently.

**Google policy (Dror, verified 2026-11-11):**
- Describe the refund as a refund of the service fee, never as a guarantee of leads, results or position.
- Never use: guaranteed results, first place or top of Google, always visible, unlimited clicks, "official" Google partner, approved, recommended or certified by Google, in partnership with Google, iron-clad, unconditional. A plain "Google Partner" is fine.
- Keep any Google Partner mention apart from the refund text.

**Remove completely:**
- the stats block (no performance numbers anywhere);
- the step tag pills (the engineer deletes them, so don't patch them);
- "MCC" in visible copy, except once if it's explained in plain words;
- GA4, GTM, Sandbox, ROAS, CPA.

**SEO (Yonatan's spec below, adapted):**
- Title: keep "פרסום בגוגל" first, then "Google Ads". Replace the price part with the ₪249 bot offer. 60 characters or fewer. End on a Hebrew word; the RLM + " | WAO" stays as in the file.
- OG title: identical to the title.
- h1: keep "פרסום בגוגל" as the opening words. Keep the ownership idea, and fix the calque.
- Badge: 45 characters or fewer, commercial terms, no MCC.
- Meta and OG description: 140–155 characters, with the pain point, the head term once, ₪249, the ₪1,500 minimum paid to Google, and the refund. No semicolons.
- The secondary anchor "ניהול קמפיינים בגוגל" must survive in some h2.
- The JSON-LD description strings: no MCC, no "from", ₪249. The numeric `price` field is code; the engineer changes it.

**Hard keeps:**
- singular masculine;
- no invented facts;
- no ASCII quotes inside Hebrew;
- em-dash — with single spaces.

**Patch rules:**
- JSON patches only, each with `old` and `new`.
- Each `old` is copied byte-for-byte from the file below. It must be a whole string literal or a whole JSX text node, long enough to be **unique in the file**.
- If the same text appears twice on purpose (an FAQ copied into the FAQPage JSON-LD), make one patch and say "both occurrences".
- To remove a section, empty its strings and name it in your angle note. You can't add new JSX elements, only replace existing text. Where new facts need room (the refund, the pages policy, the disclosures), reuse existing slots: FAQ items, the INCLUDED cards, steps, and the CTA strip.
- In your angle note, list the character counts for the title, h1, badge and descriptions.

=== DECISIONS (Eitan + Dror) ===
## DECIDED (Eitan, 2026-11-11): all three approved
1. **30-day satisfaction refund:** WAO's ₪249 only. The clock starts at the first live ad. Three conditions: the ads ran at the ₪1,500 pace, one refund per business, and the claim is made within 7 days of the window ending. If WAO fails to launch, the refund is automatic. Never call it "iron-clad" or "unconditional". It comes on top of the statutory 14-day right.
2. **Pages policy:** landing pages on {slug}.wao.co.il belong to the subscription. They stay live for 30 days after cancellation, then go offline. Buyout is **₪900** (Adam's default; Eitan approved the suggestions), and it's free after 12 paid months. Disclosed in the FAQ and the terms.
3. **On cancel:** the bot warns on the cancel day and again 7 days before the pages go offline, and offers to pause the campaigns or repoint them to the client's own site.

## Dror: Google policy check (web-verified 2026-11-11): OK with CHANGES
1. **Refund:** a refund of WAO's ₪249 fee is fine. Describe it as a refund of the service fee, never as a guarantee of leads, position or results. Name the 3 conditions next to the offer, not only in the terms.
2. **Partner badge:** only on WAO's own site, linked to WAO's public Partner profile, with no implied Google endorsement. Keep it visually apart from the refund block. Never on client landing pages ({slug}.wao.co.il) or invoices.
3. **Disclosures the page must state:**
   - the ₪249 fee is separate from the ad spend, which goes directly to Google;
   - each client gets his own Google Ads account, owned by him and linked to WAO's MCC;
   - he can see clicks, impressions and total cost at any time;
   - there is a written agreement.
4. **₪1,500 floor:** OK to state up front. Say it goes to Google, not to WAO, and call it a minimum, not a recommendation. That's about ₪50/day; it's thin for expensive niches.
5. **Avoid:** "guaranteed results", "first place"/"top of Google", "always visible", "unlimited clicks", "official Google partner", "approved, recommended or certified by Google", "in partnership with Google", "iron-clad", "unconditional". A plain "Google Partner" is fine.

Sources (fetched 2026-11-11): support.google.com/adspolicy/answer/6086450 · /6086777 · /9457109 · support.google.com/google-ads/answer/9028798

=== YONATAN'S ORIGINAL ANCHOR SPEC (price parts superseded by the brief above) ===
## /google-ads (commercial intent)
- **Title:** keep "פרסום בגוגל" first, then "ניהול Google Ads". Change "מ-₪1,500" to a flat "₪1,500 לחודש". Drop "בחשבון שלך" (the h1 carries it) to get ≤60 chars. End on "לחודש".
- **h1:** keep "פרסום בגוגל" as the opening words and keep "שנשאר שלך". Fix the calque "להינעל על" (direction: "כבול לסוכנות"). Approved.
- **Badge:** remove MCC. Use the commercial terms: month to month, no minimum, no notice. ≤45 chars, and don't repeat the h1's ownership line.
- **Meta description:** 140–155 chars. Open with the pain (paid for clicks, no idea what came of them). Include: the head term once, the flat ₪1,500, the ad budget paid to Google separately, and the free 30-minute call that includes a look at the account. No MCC, no semicolon.
- **OG title:** the title string.
- **INCLUDED h2:** "ניהול קמפיינים בגוגל" is a secondary anchor and must survive. "— בחשבון שלך" can go. If the section merges into Methodology, the phrase moves to the merged section's h2.
- **Also flat-fee sync:** FAQ 1 and the JSON-LD descriptions (page.tsx:33, :42, and FAQPage :57) drop "from/starting at" and MCC.


=== NOA'S REVIEW OF THE LIVE PAGE (still valid for language; facts superseded by the brief above) ===
# Page 1: /google-ads

## 1. Verdict
About 45% human. The best lines are step 01's title "קודם בודקים לאן הכסף הולך", the hero opening question, and INCLUDED #6's point that you can see your own spend. Almost everything else is an English jargon stack (MCC, GA4, GTM, ROAS, CPA, Sandbox, English tag pills) aimed at a marketer, not a plumber. The page says one idea ("the account stays yours") about nine times. A full section repeats the section above it. There's no corrupted text and no ASCII quote that breaks code. There is one ASCII geresh.

Worst three:
1. **Stats block.** "200–400% ROI" and "60% ירידה ב-CPA" are big performance claims sourced only to "נתונים פנימיים WAO 2025". Next to them sits an industry benchmark (8:1) shown in the same format as WAO's own results. That's a trust and legal risk until someone confirms the numbers. The label "ROI מדווח ללקוחות WAO" also uses the wrong preposition.
2. **"What's included" repeats "Methodology" almost point for point** (audit, Search/PMax, YouTube, measurement, ad copy, data). The GA4 + Google Tag Manager sentence appears 4 times (R1, R2).
3. **Step order contradicts the hero.** The hero says "מתחילים ממדידת המרות", but conversion tracking is step 05, titled "לפני עוד שקל על פרסום". Steps 01, 03 and 05 all say "check conversions before spending".

## 2. Per section (render order)

**Meta (SERP gate)**
- Title: "פרסום בגוגל בחשבון שלך — ניהול Google Ads מ-₪1,500 לחודש‏ | WAO". It's about 63 characters, so "| WAO" may be cut off. It ends in Hebrew plus an RLM, so it's bidi-safe. **Flag only** (SEO anchor), routed to Yonatan for length.
- [ORANGE] **OG title** "פרסום בגוגל בחשבון שלך — ניהול Google Ads | WAO": a Latin token ("Ads") sits directly against the Latin brand with **no RLM**. That's the exact swap pattern, and it will show in WhatsApp and Facebook share previews. I won't hand-patch it: Maya decides the technique and Eitan-Dev applies it to OG titles everywhere, not just this page.
- [YELLOW] Description, about 95 characters: uses barely 60% of the space, and the first thing it explains is "דרך MCC", a term the reader doesn't know. There's also a semicolon. Tamar should rewrite it around the pain point plus the price. Yonatan signs off.
- Schema note for the engineer: the FAQPage JSON-LD hand-copies FAQ 1 and FAQ 4. When Tamar rewrites them, the schema copies must change too (site-bot builds its schema from FAQS automatically; this page doesn't).

**Hero**
- Badge "החשבון שלך. התקציב שלך. אנחנו מנהלים דרך MCC." **Flag only (anchor).** It's a reflex group of three, and MCC means nothing to this reader. Routed to Yonatan.
- h1 "…בלי להינעל על סוכנות" **Flag only (anchor).** [ORANGE] Calque: in Hebrew, "להינעל על" means to lock onto a target. "Locked in with an agency" is "להיות תקוע עם סוכנות" or "כבול לסוכנות". Routed to Yonatan.
- [AI] Hero body. It repeats the badge (account plus MCC; R1). It has 3 acronyms in 3 sentences, a semicolon, and a final sentence that repeats the third button (P2). The brand switches person: the badge says "אנחנו מנהלים", the body says "WAO מנהלת" (P4).
  - old: "כבר שילמת על קליקים בלי לדעת כמה פניות קיבלת? החשבון ופרופיל התשלומים נשארים שלך; WAO מנהלת את הקמפיינים דרך MCC. מתחילים ממדידת המרות עם GA4 ו-Google Tag Manager. מעדיף להתחיל בעצמך? בדוק את אפשרות ה-Ads Bot."
  - suggested: "כבר שילמת על קליקים ולא ידעת כמה מהם הפכו לשיחה? קודם מחברים מדידה, כדי שתדע מה כל שקל מביא. החשבון והחיוב נשארים על שמך, ואנחנו מנהלים אותו."
  - why: the answer follows straight from the pain point, the jargon is gone, and every fact is already on the page (measurement first, account and payment profile owned by the client).
- [ORANGE] **One product, three names.** The product is called "אפשרות ה-Ads Bot" (hero body), "מסלול ה-Ads Bot" (hero button) and "Ads Bot" with no article (bottom CTA). Pick one form, and say once what it is. Nothing on the page explains it.
- [YELLOW] There are 3 buttons in the hero. "ראה הדגמת Sandbox בלי תקציב חי": "Sandbox" is jargon and "תקציב חי" is a calque of "live budget". Suggested: "תראה הדגמה, בלי להוציא שקל ←". The demo really does run without spending, so that wording is accurate. "ראה" is also the short imperative form that can be misread as past tense.
- [YELLOW] One action, two labels (R8): the hero says "דבר איתנו 30 דקות, בחינם" and the bottom says "הצג מספר טלפון". Engineer side note: the hero uses a plain `tel:` link while the bottom uses PhoneReveal, so hero phone clicks aren't attributed. That's Adam's call.

**Stats**
- [RED, fact] All three numbers need a source before this ships. Who confirms "200–400% ROI" and "60% CPA decrease" (how many clients, which period)? Dror or Adam. What is "Google Ads Benchmarks 2025" (publisher?), and does 8:1 apply to local service businesses? Dror, web-verified and dated. If the numbers can't be backed, cut the block. Don't soften the wording.
- [ORANGE] "ROI מדווח ללקוחות WAO" reads as "ROI reported **to** WAO clients". Fix: "ROI מדווח אצל לקוחות WAO".
- [ORANGE] "בנצ'מרק" uses an ASCII apostrophe. Fix: "בנצ׳מרק". (The string uses double quotes, so the code doesn't break; it's a typography fix only.)
- [YELLOW] Showing an industry benchmark in the same card format as WAO's own results reads as a WAO result, even with the disclaimer. Either move it out of the row or drop it.
- The en-dash in "200–400%" is correct for a number range. It's not a defect.

**Methodology**
- [AI] h2 "חמישה צעדים בדרך להחלטות מבוססות נתונים" combines the buzzword "data-driven decisions" with a count the list already shows. Suggested: "מה עושים בחשבון שלך, לפי הסדר".
- [AI] Step 01 desc "כבר שילמת על קליקים ולא ידעת מי פנה?" is the hero's opening question a second time. It appears a third time in the CTA eyebrow (R2).
- [ORANGE] Tags. "CPA Target" isn't a Google term (it's "Target CPA"). "Competitor Analysis" and "Demand Gen" are things the step text never mentions (R4: the pill promises something the text doesn't). [AI] All 20 pills are English keyword decoration. My recommendation is to remove the pills; that's a layout decision for Adam. If they stay, use Hebrew, and each pill names only what its step actually describes.
- [ORANGE] Step 02 "חיפוש ממוקד ב-Search" says "search in Search". "בוחנים … מול המטרה" is a calque.
  - suggested: "מודעות חיפוש מופיעות למי שמקליד בגוגל את מה שאתה עושה. Performance Max מראה אותך גם ביוטיוב, במפות ובאתרים אחרים, ומפעילים אותו רק כשהנתונים מצדיקים."
  - why: it says plainly what each campaign type does. The PMax channels are Google's own. The "only when data justifies it" condition already appears in FAQ 3.
- [YELLOW] Step 03 "המערכת" doesn't point to anything named. "הצעות מחיר" (bids) means *a quote to a customer* in this reader's daily life. Suggest "כמה משלמים על כל קליק".
- [AI] Steps 01, 03 and 05 make the same point ("check conversions before spending"). Tamar could make them 3 real steps, with measurement first so it matches the hero.
- [YELLOW] Step 04 "מודעות שמדברות ללקוח הנכון": "the right customer" is a generic calque. "נכסים" (assets) is a UI term the reader won't know; suggest "כותרות ותמונות".
- [ORANGE] Step 05 "כך אפשר לבדוק אם הקמפיין מביא פניות מול הכסף" reads awkwardly. Suggested: "כך רואים כמה פניות הקמפיין מביא על כל שקל שאתה מוציא."

**What's included**
- [AI] The whole section repeats Methodology. I recommend merging the two. If both stay, each point appears once.
- [YELLOW] The h2 "ניהול קמפיינים בגוגל — בחשבון שלך" uses a dash to set up a reveal (R5), and "בחשבון שלך" is the ninth time the page says it (R2). This is probably a secondary keyword, so it's flag-only for Yonatan before anyone changes it.
- [AI, fact] #1 "Fraud Blocker מסייע בהגנה מפני הונאת קליקים" is bureaucratic. **Fact:** is Fraud Blocker included in the ₪1,500 fee, or is it a paid add-on? Adam or Dror. If it's included, suggested: "וכלי בשם Fraud Blocker עוזר לזהות ולחסום קליקים מזויפים."
- [ORANGE] #2 "מתאימים את סוג הקמפיין לחיפוש": "לחיפוש" is unclear (adapted to the search?). There's also a semicolon and a "not X" tail. Suggested: "בוחרים סוג קמפיין לפי מה שאנשים מחפשים, המטרה והתקציב שלך." Cut "לא מפעילים הכול אוטומטית" unless Dror can say what it refers to.
- [AI] #4 body repeats its own title (R1). It writes both "GTM" and "Google Tag Manager" on one card, and "פניות והמרות" are the same thing to this reader.
- [YELLOW] #6 title "החלטות לפי נתונים מהחשבון שלך" doesn't match its body. The body is about transparency, and the body is the stronger point. Suggested title: "אתה רואה כל שקל בעצמך".

**FAQ**
- [AI] The h2 "כל מה שאתה צריך לדעת על Google Ads" is the stock "everything you need to know" calque. Suggested: "לפני שמתחילים".
- [ORANGE] **Inconsistent FAQ voice.** Q1, Q2 and Q4 are neutral. Q3 ("לעסק שלך") and Q5 ("האם אתה חייב") are questions addressed *to* the reader, as if WAO were asking. The reader is the one asking, so his questions should be in first person ("זה מתאים לעסק שלי?").
- [ORANGE] Q1 "ומשולם על ידך" uses a passive-with-agent, legal register, plus a semicolon. Suggested: "דמי הניהול מתחילים ב-₪1,500 לחודש. את המודעות עצמן אתה משלם ישירות לגוגל, מהחשבון שלך." **Open fact (R7):** what pushes the fee above ₪1,500? Adam or Dror.
- [YELLOW] Q2: the question says "פרסום בגוגל", the answer switches to "קידום ממומן" (term drift). "אינו מחייב" is formal. The third sentence is vague and ends in a "not X" tail.
  - suggested: "בפרסום בגוגל אתה משלם על כל קליק, וכשמפסיקים לשלם המודעות יורדות. בקידום אורגני לא משלמים לגוגל על קליקים, אבל לוקח חודשים עד שמטפסים בתוצאות."
  - why: it answers the actual difference. "חודשים" matches Yonatan's settled timing.
- [ORANGE] Q3: "והאם" is formal in a question, and "של Google" mid-Hebrew breaks the page's spelling "גוגל". "לא מתאים אוטומטית" is a calque, and there's a semicolon. Suggested answer: "סוג קמפיין שמציג את המודעות שלך בכמה מקומות של גוגל, כמו חיפוש, יוטיוב ומפות. הוא לא מתאים לכל עסק, ולכן בודקים קודם נתוני המרות, מטרה ותקציב."
- [AI] Q4 starts by answering a question nobody asked (no guarantee) instead of "how do I know" (R6).
  - suggested: "מודדים. מחברים לאתר את כלי המדידה של גוגל, ורואים כמה פניות הגיעו מהמודעות ובכמה כסף. מספר פניות אף אחד לא יכול להבטיח מראש."
- [ORANGE] Q5 says "ארוך טווח" twice. Fix: "לטווח ארוך" (same fix as the homepage). "חייב להתחייב" repeats the same root. [AI] "לא. אין חוזה ארוך טווח" says no twice, and the last sentence repeats Q1 (R1).
  - suggested: "לא. אין התחייבות מינימלית, משלמים חודש בחודש. ואם תעזוב, החשבון והנתונים נשארים אצלך, כי הם תמיד היו שלך."
  - **Open fact (R7):** the homepage terms (month to month, no minimum) were confirmed for subscriptions. Is it the same for ₪1,500 Google Ads management? Is there a notice period? Eitan or Adam must confirm.

**Final CTA**
- [AI] The eyebrow "משלם על קליקים, ולא יודע כמה פניות הגיעו?" is the hero question for the third time (R2). The h2 "לאן התקציב הולך" repeats step 01's title.
- [AI] The body repeats the h2 ("30 דקות" ×2) and goes in a circle: "נבחן … תראה מה כדאי לבדוק". [YELLOW, R4] Can WAO actually review the account during a phone call without access? And what about a reader who has no account yet?
  - suggested: "תספר לנו מה קורה היום בחשבון, ונגיד לך מה לבדוק לפני שאתה מוסיף תקציב."
- [AI] The "✓ … · ✓ … · ✓ …" strip is a reflex group of three that repeats the h2 and the body. Keep only "בלי חוזה ארוך", or cut the strip.
- [YELLOW] The page writes "free" three ways: "בחינם", "חינם" and "חינמית". Pick one.

## 3. Brief for Tamar (/google-ads)
**Rewrite.** Who's reading: a hands-on owner who has been burned by an agency or by paying for clicks. One page arc: the pain (paid for clicks, don't know what came of it), then measurement first, then a campaign that matches local search, then you see every shekel in your own account.
- Merge Methodology and "What's included" into one list of 3–4 steps, with measurement first.
- Say "the account stays yours" in two places at most: the h1 and one body line.
- Remove the jargon: no MCC, GA4, GTM, Sandbox, ROAS or CPA in body copy unless the reader will see it, and then say what it does for him.
- Give the product one name, and explain Ads Bot in one line.
- Use one call label.
- Put every FAQ question in the reader's first-person voice.
- FAQ answers open with the answer itself.
- Replace the semicolons and the "not X" tails.
- If anything changes, keep the FAQPage schema strings in sync.

**Keep.** Title, h1 and badge (anchors; my calque note on the h1 goes to Yonatan). "פרסום בגוגל" as the head term. ₪1,500 as the starting fee. "Ad budget paid separately". Step 01's title. INCLUDED #6's transparency point. Singular masculine throughout.

**Open facts (don't write until answered):**
- the stats sources, or cut the block (Dror/Adam)
- what raises the fee above ₪1,500 (Adam)
- Google Ads commitment terms and notice period (Eitan/Adam)
- whether Fraud Blocker is included (Adam/Dror)
- what "לא מפעילים הכול אוטומטית" refers to (Dror)
- whether the 30-minute call includes an account review, and whether that needs access (Adam)

**Routing.** OG title bidi goes to Maya and Eitan-Dev. Title length and the h1/badge notes go to Yonatan.

---


=== FILE: src/app/(app)/google-ads/page.tsx ===
import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: {
    // title.absolute bypasses the root "%s‏ | WAO" template — this string
    // already ends in the RLM-anchored "‏ | WAO" suffix (same pattern as site-bot/page.tsx).
    absolute: "פרסום בגוגל בחשבון שלך — ניהול Google Ads מ-₪1,500 לחודש‏ | WAO",
  },
  description:
    "ניהול קמפיינים בגוגל בחשבון שבבעלותך, דרך MCC. דמי ניהול מ-₪1,500 לחודש; תקציב הפרסום שלך נפרד.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל בחשבון שלך — ניהול Google Ads | WAO",
    description: "ניהול Google Ads בחשבון שלך, בלי חוזה ארוך. דמי ניהול מ-₪1,500 לחודש, תקציב המדיה נפרד.",
    url: CANONICAL,
    type: "website",
  },
};

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${CANONICAL}#webpage`,
    url: CANONICAL,
    name: "פרסום בגוגל בחשבון בבעלותך — WAO",
    description: "ניהול Google Ads דרך MCC בחשבון ובפרופיל תשלומים בבעלות הלקוח",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול קמפיינים בגוגל בחשבון של הלקוח",
    description: "ניהול Google Ads בחשבון הלקוח דרך MCC, החל מ-₪1,500 לחודש; תקציב מדיה נפרד.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: { "@type": "Offer", priceCurrency: "ILS", price: "1500" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "דמי הניהול מתחילים ב-₪1,500 לחודש; תקציב המדיה נפרד ומשולם על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.",
        },
      },
      {
        "@type": "Question",
        name: "איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "אין תאריך קבוע לתוצאות או מספר פניות שאפשר להבטיח. מחברים GA4 ו-Google Tag Manager, ואז בודקים פניות מול ההוצאה.",
        },
      },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "דף הבית", item: "https://www.wao.co.il" },
      { "@type": "ListItem", position: 2, name: "פרסום בגוגל", item: CANONICAL },
    ],
  },
];

const STEPS = [
  {
    n: "01",
    title: "קודם בודקים לאן הכסף הולך",
    desc: "כבר שילמת על קליקים ולא ידעת מי פנה? מתחילים בבדיקת החשבון וההמרות. מגדירים מה נחשב פנייה, ורק אז מחליטים איפה נכון לפרסם.",
    tags: ["Google Ads Audit", "CPA Target", "ROAS", "Competitor Analysis"],
  },
  {
    n: "02",
    title: "מפרסמים במקום שבו הלקוח מחפש",
    desc: "מפרידים בין חיפוש ממוקד ב-Search לבין חשיפה רחבה יותר ב-Performance Max. כשזה מתאים לעסק, בוחנים גם YouTube Ads מול המטרה והתקציב שלך.",
    tags: ["Performance Max", "Search Campaigns", "YouTube Ads", "Demand Gen"],
  },
  {
    n: "03",
    title: "מחליטים לפי נתוני העסק, לא לפי תחושת בטן",
    desc: "המערכת צריכה לדעת איזו פנייה חשובה לך, ולא רק מי לחץ. בודקים את נתוני ההמרות לפני שמשנים הצעות מחיר או מרחיבים קמפיין.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "מודעות שמדברות ללקוח הנכון",
    desc: "המודעה שלך צריכה לענות על מה שהלקוח מחפש באותו רגע. בוחנים ניסוחים ונכסים לפי הפניות שהם מביאים, לא לפי קליקים בלבד.",
    tags: ["RSA", "PMax Assets", "Ad Copy", "A/B Testing"],
  },
  {
    n: "05",
    title: "מעקב המרות לפני עוד שקל על פרסום",
    desc: "מחברים GA4 ו-Google Tag Manager כדי למדוד מה קורה אחרי הקליק. כך אפשר לבדוק אם הקמפיין מביא פניות מול הכסף שאתה מוציא.",
    tags: ["GA4", "Conversion Tracking", "GTM", "Attribution"],
  },
];

const INCLUDED = [
  { icon: "🔬", title: "בדיקת חשבון Google Ads", desc: "בודקים את מבנה הקמפיינים ואת מדידת ההמרות לפני החלטות על התקציב. Fraud Blocker מסייע בהגנה מפני הונאת קליקים." },
  { icon: "🎯", title: "ניהול Search ו-Performance Max", desc: "מתאימים את סוג הקמפיין לחיפוש, למטרה ולתקציב שלך; לא מפעילים הכול אוטומטית." },
  { icon: "▶️", title: "YouTube Ads כשזה מתאים לעסק", desc: "בוחנים גם פרסום בווידאו כשהקהל והמטרה שלך מצדיקים את תקציב המדיה." },
  { icon: "📊", title: "מדידת המרות עם GA4 ו-GTM", desc: "מחברים GA4 ו-Google Tag Manager כדי לראות פניות והמרות לצד ההוצאה." },
  { icon: "✍️", title: "ניסוח מודעות ובדיקת מסרים", desc: "בוחנים איזה ניסוח מדבר ללקוחות שלך ומביא פניות, לא רק חשיפות." },
  { icon: "📈", title: "החלטות לפי נתונים מהחשבון שלך", desc: "חשבון Google Ads נשאר שלך; אתה יכול לראות בעצמך את ההוצאה והביצועים." },
];

const STATS = [
  { n: "200–400%", l: "ROI מדווח ללקוחות WAO", sub: "נתונים פנימיים WAO 2025" },
  { n: "60%", l: "ירידה מדווחת ב-CPA", sub: "נתונים פנימיים WAO 2025" },
  { n: "8:1", l: "ROAS לפי בנצ'מרק ענפי, לא נתון מהחשבון שלך", sub: "Google Ads Benchmarks 2025" },
];

const FAQS = [
  {
    q: "כמה עולה ניהול קמפיינים בגוגל, ומי משלם על המודעות?",
    a: "דמי הניהול מתחילים ב-₪1,500 לחודש; תקציב המדיה נפרד ומשולם על ידך. חשבון Google Ads ופרופיל התשלומים בבעלותך, ו-WAO מנהלת דרך MCC.",
  },
  {
    q: "מה ההבדל בין פרסום בגוגל לבין קידום אורגני?",
    a: "בקידום ממומן אתה משלם על תנועה מהמודעות, והיא תלויה בתקציב. קידום אורגני אינו מחייב תשלום לקליק, אבל דורש עבודה וזמן. בוחרים ערוץ לפי העסק שלך, לא לפי הבטחה לתוצאות מיידיות.",
  },
  {
    q: "מה זה Performance Max, והאם הוא מתאים לעסק שלך?",
    a: "Performance Max הוא סוג קמפיין שמציג מודעות בכמה ערוצים של Google. הוא לא מתאים אוטומטית לכל עסק; בודקים נתוני המרות, מטרה ותקציב לפני שבוחרים בו.",
  },
  {
    q: "איך יודעים אם הפרסום בגוגל מביא פניות אמיתיות?",
    a: "אין תאריך קבוע לתוצאות או מספר פניות שאפשר להבטיח. מחברים GA4 ו-Google Tag Manager, ואז בודקים פניות מול ההוצאה.",
  },
  {
    q: "האם אתה חייב להתחייב לניהול ארוך טווח?",
    a: "לא. אין חוזה ארוך טווח. חשבון Google Ads ופרופיל התשלומים נשארים בבעלותך; WAO פועלת דרך MCC. תקציב הפרסום משולם בנפרד מדמי הניהול.",
  },
];

export default function GoogleAdsPage() {
  const glass: React.CSSProperties = {
    background: "rgba(13,15,21,0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
  };

  const h2Style: React.CSSProperties = {
    fontFamily: "var(--font-rubik), sans-serif",
    fontWeight: 800,
    fontSize: "clamp(1.5rem,2.5vw,2rem)",
    lineHeight: 1.2,
    marginBottom: "1rem",
    color: "var(--text)",
    marginTop: 0,
  };

  const bodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-body), sans-serif",
    lineHeight: 1.8,
    color: "var(--muted)",
    fontSize: "1rem",
    margin: 0,
  };

  return (
    <>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      {/* ── Hero ── */}
      <section style={{ paddingTop: "clamp(110px,14vw,160px)", paddingBottom: "clamp(64px,8vw,96px)", position: "relative", overflow: "hidden" }}>
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(74,227,181,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div className="hero-grid" />
        <div className="wao-container" style={{ position: "relative", zIndex: 1, maxWidth: "860px" }}>
          <div className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            החשבון שלך. התקציב שלך. אנחנו מנהלים דרך MCC.
          </div>
          <h1
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              fontSize: "clamp(2.4rem,5.5vw,4.2rem)",
              lineHeight: 1.08,
              letterSpacing: "-0.025em",
              marginBottom: "24px",
            }}
          >
            פרסום בגוגל, בחשבון{" "}
            <span className="text-gradient">שנשאר שלך</span>
            {" "}— בלי להינעל על סוכנות
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            כבר שילמת על קליקים בלי לדעת כמה פניות קיבלת? החשבון ופרופיל התשלומים נשארים שלך; WAO מנהלת את הקמפיינים דרך MCC. מתחילים ממדידת המרות עם GA4 ו-Google Tag Manager. מעדיף להתחיל בעצמך? בדוק את אפשרות ה-Ads Bot.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              דבר איתנו 30 דקות, בחינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox" className="btn-outline" style={{ fontSize: "1rem" }}>
              ראה הדגמת Sandbox בלי תקציב חי ←
            </Link>
            <Link href="/google-ads/onboarding" className="btn-outline" style={{ fontSize: "1rem" }}>
              בדוק את מסלול ה-Ads Bot ←
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ background: "var(--surface)", paddingBlock: "clamp(48px,6vw,72px)" }}>
        <div className="wao-container">
          <div className="eyebrow" style={{ justifyContent: "center", marginBottom: "40px" }}>נתוני עבר מדווחים — לא הבטחה לקמפיין שלך</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
            {STATS.map((s) => (
              <div key={s.n} style={{ ...glass, padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(2.4rem,4vw,3.2rem)", lineHeight: 1, background: "linear-gradient(135deg,#4AE3B5,#00C3FF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: "10px" }}>{s.n}</div>
                <div style={{ fontFamily: "var(--font-body), sans-serif", fontSize: "0.95rem", color: "var(--text)", marginBottom: "6px", fontWeight: 600 }}>{s.l}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Methodology ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div style={{ marginBottom: "60px" }}>
            <div className="eyebrow">כך ניגשים לחשבון שלך</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              חמישה צעדים בדרך להחלטות{" "}
              <span className="text-gradient">מבוססות נתונים</span>
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {STEPS.map((step) => (
              <div
                key={step.n}
                className="process-step"
                style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "40px", alignItems: "start", ...glass, padding: "clamp(24px,3vw,36px)" }}
              >
                <div style={{ paddingTop: "4px" }}>
                  <span className="process-number">{step.n}</span>
                </div>
                <div>
                  <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.25rem", marginBottom: "10px" }}>{step.title}</h3>
                  <p style={{ ...bodyStyle, marginBottom: "16px" }}>{step.desc}</p>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {step.tags.map((tag) => (
                      <span key={tag} style={{ padding: "3px 12px", borderRadius: "var(--radius-pill)", background: "var(--elevated)", border: "1px solid var(--border)", fontSize: "0.78rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What's included ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div style={{ marginBottom: "56px" }}>
            <div className="eyebrow">מה עושים בפועל</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              ניהול קמפיינים בגוגל —{" "}
              <span className="text-gradient">בחשבון שלך</span>
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1px", background: "var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--border)" }}>
            {INCLUDED.map((item) => (
              <div key={item.title} className="why-cell">
                <div style={{ fontSize: "1.8rem", marginBottom: "14px", lineHeight: 1 }}>{item.icon}</div>
                <h3 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.05rem", marginBottom: "8px" }}>{item.title}</h3>
                <p style={{ ...bodyStyle, fontSize: "0.9rem" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)", marginBottom: "48px" }}>
            כל מה שאתה צריך לדעת על{" "}
            <span className="text-gradient">Google Ads</span>
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details key={faq.q} style={{ ...glass, padding: "0" }}>
                <summary style={{ padding: "22px 24px", cursor: "pointer", fontFamily: "var(--font-rubik), sans-serif", fontWeight: 700, fontSize: "1.02rem", lineHeight: 1.4, listStyle: "none", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
                  {faq.q}
                  <span style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div className="eyebrow" style={{ justifyContent: "center" }}>משלם על קליקים, ולא יודע כמה פניות הגיעו?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחת ייעוץ של 30 דקות —{" "}
                <span className="text-gradient">נבדוק יחד לאן התקציב הולך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                בשיחה חינמית של 30 דקות נבחן את החשבון ואת מדידת ההמרות. תראה מה כדאי לבדוק לפני שאתה מוסיף עוד כסף לפרסום.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <PhoneReveal
                  source="google-ads-bottom-cta"
                  className="btn-primary"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                  icon="📞 "
                />
                <Link href="/google-ads/onboarding" className="btn-outline" style={{ fontSize: "1rem" }}>
                  מעדיף להתחיל לבד? בדוק את Ads Bot ←
                </Link>
              </div>
              <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                ✓ שיחת ייעוץ חינם, 30 דקות · ✓ בלי חוזה ארוך · ✓ החשבון שלך
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

