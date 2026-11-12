# /google-ads + /site-bot full proofread: Noa (language-qa), 2026-11-11

This was a review only. I edited no files. The tags are the same as in the homepage review: [RED] breaks meaning or promises something false, [ORANGE] objective error, [YELLOW] style, [AI] AI tell.
Sources. Both pages keep all their copy inline. Nothing is imported from JSON:
- `/home/eitanya/wao/src/app/(app)/google-ads/page.tsx` (STEPS, INCLUDED, STATS, FAQS, inline JSX, plus `PhoneReveal` default label "הצג מספר טלפון" from `/home/eitanya/wao/src/components/PhoneReveal.tsx`)
- `/home/eitanya/wao/src/app/(app)/site-bot/page.tsx` (FAQS, STEPS, COMPARE, inline JSX)

I checked every flagged string against its JSX render. Every array item renders. The google-ads step `tags` render as visible pills.
Citations: approved rules are R1–R10, in the order listed in docs/copy/writing-upgrades.md. Pending rules are P1–P5, from homepage-rewrite-noa-qa-2026-11-11.md.

---

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

# Page 2: /site-bot

## 1. Verdict
About 60% human. The hero scene ("אתה באמצע יום עבודה וצריך לעדכן מחיר באתר?") and the h2 "אתה מספר על העסק. אנחנו מעלים את האתר." sound like a person, and so does comparison card 2. The weak spots:
- **Eitan is named about 10 times and never introduced.**
- Nearly every element opens with a rhetorical question and then answers it (about 10 times).
- The free audit is mentioned about 8 times, and "החבילה המלאה" 6 times.
- Key facts contradict each other, or the page promises things the terms may not support.

There's no corrupted text and no ASCII quotes: geresh is correct throughout ("צ׳אט").

Worst three:
1. [RED, fact] **"עריכה בצ׳אט … לתמיד"** (FAQ 4 and FAQ 6). The offer is a ₪199/month retainer. "Forever" promises editing after the customer stops paying. Under consumer-protection rules that's a false promise unless the terms really say it. Eitan or Adam must confirm.
2. **FAQ 1 (price) and FAQ 2 (timing) don't answer their own questions** (R6, R7). Either publish the facts or drop the questions. Don't ask a question the page refuses to answer.
3. **Intake channel contradicts itself.** The h1 says the build starts with a *call with Eitan*. FAQ 3 says *you tell us about the business in a chat*. Editing is described three ways: "בהודעה", "הודעת WhatsApp" and "עריכה בצ׳אט". The reader can't tell what actually happens.

## 2. Per section (render order)

**Meta (SERP gate)**
- Title "בניית אתר לעסק קטן — בלי עורך, עדכונים בהודעה‏ | WAO" is about 52 characters, ends in Hebrew plus an RLM, and is safe. **Flag only (anchor).** [YELLOW, to Yonatan] To this reader, "עורך" means a *person* (an editor) before it means a site editor.
- [YELLOW] Description, about 125 characters: "איתן" means nothing to a stranger in Google results. It says "לעסק שלך … העסק שלך" twice. It could also use about 30 more characters. Yonatan signs off.

**Hero**
- Badge **flag only**: same "עורך" note as the title.
- h1 **flag only**. [YELLOW, to Yonatan/Adam] Eitan appears here with no role. The fix doesn't need the h1: introduce him once in the body (see the hero sub-line below).
- Hero body: keep the scene. [YELLOW] "והאתר מתעדכן" hides who does the work. **Open fact:** is the update automatic or done by a person, and how fast? "החבילה המלאה" implies a smaller package that the page never describes. **Open fact:** is there another package? If not, drop "המלאה" everywhere.
- [YELLOW, R4] The button "דבר עם איתן על האתר שלך" leads to a contact form, not a conversation. The sub-line underneath tells the truth ("משאירים פרטים"). Either the label matches the form, or the sub-line carries the expectation. The second option is fine if it stays.
- [AI] Hero sub-line: its second sentence repeats the button directly above it (R1, P2). The whole line is repeated word for word in the final CTA. "משאירים … חוזר אליך" mixes the impersonal form with second person.
  - old: "משאירים פרטים, ואיתן חוזר אליך לשיחה על האתר. אפשר גם להתחיל בבדיקה חינמית של העסק שלך בגוגל."
  - suggested: "תשאיר פרטים, ואיתן, המייסד של WAO, יחזור אליך לשיחה על האתר."
  - why: this is where Eitan gets introduced (founder status is a settled fact from the homepage review), and the button echo is gone. **Open fact:** a callback time ("עוד היום"?) would be worth adding, but only if Eitan confirms it.

**Steps block**
- The h2 "אתה מספר על העסק. אנחנו מעלים את האתר." is good. Keep it.
- [ORANGE] Steps 1 and 2 have no subject ("מתחיל…", "מספר…"). It's unclear whether "it" or "you" starts. "מספר" can also be read as *number* (מִסְפָּר) at first glance. Step 1's masculine verb also conflicts with the h1's feminine "בנייה מתחילה".
- [ORANGE] Step 3 is a package feature, not a step, so the list stops being a list of steps. The actual steps (build, go live, update) are missing.
  - suggested: "1. אתה מספר לאיתן על העסק, בשיחה. / 2. אנחנו בונים את האתר ומעלים אותו לדומיין שרשום על שמך. / 3. משהו משתנה בעסק? אתה שולח הודעה, והאתר מתעדכן."
  - why: three actions in order with clear subjects. Every fact comes from the h1, the h2 and the hero. If there's a client approval step, Eitan should confirm it and Tamar can add it. I didn't invent one.

**Course-graduate objection**
- [ORANGE] The h2 "עכשיו תבחר איך לבזבז פחות זמן" is an awkward calque, and "עכשיו" refers to nothing.
- [AI] The body's opening question repeats the h2's question (R1). "מצוין, זאת עדיין אפשרות" is a stock opener plus a calque ("still an option"). "אולי לא תרצה" is a hedge.
- [ORANGE] "כשמשהו משתנה באתר" has the logic backwards: something changes *in the business*, and then the site changes.
- [YELLOW] This whole section repeats FAQ 6. Keep one of them. Adam decides whether course graduates are a real audience for this page.

**"Price anchor" block** (the code calls it that, but no price renders)
- [AI] "כל אתר נבנה אחרי שיחה עם איתן" repeats the h1 (R1). It says "העסק" three times in two sentences (R2). The open question gets answered by the next sentence.
- [YELLOW, R4] The paragraph pitches the **audit**, and the button directly below goes to the **contact form**.
- [ORANGE] The line under the button, "רק אחריה תחליט אם לדבר עם איתן", refers to the audit but sits under the talk-to-Eitan button. It also implies you have to do the audit before you can talk to him, which contradicts that button.
- Fact: "צריך רק את שם העסק". The audit flow does ask for the business name and then a pick or confirm step (auditJourneyCopy.ts). Tamar should check it asks for nothing else (e.g. phone or email) before she keeps "רק".
- [AI] The box "מה כוללת החבילה המלאה? …" is another question answered on the spot. [YELLOW] Domain wording drifts: "דומיין פרטי", "בדומיין שלך", "בדומיין שרשום על שמך". In hosting, "פרטי" can also mean WHOIS privacy. Use "דומיין על שמך". "GSC" and "לידים" are jargon; say what they do (a Google tool that shows how people find you; a form that sends you inquiries). **Open fact:** is the Google Business Profile *set up* as part of the package, or only linked? The ₪199 bundle includes GBP.

**Comparison**
- [ORANGE] The h2 "לבנות לבד, לשכור מפתח, או לשלוח הודעה?" has a serial comma before "או", which Hebrew doesn't use. Fix: "לבנות לבד, לשכור מפתח או לשלוח הודעה?" [YELLOW] The h2's order doesn't match the cards (developer, Wix, AI), and it has 2 alternatives while there are 3 cards.
- [ORANGE] Card 1 "בתהליך ובמחיר שיסוכמו מול הספק" is bureaucratic, and "מול" is a calque. Tamar should rewrite it as a lived moment (waiting on someone for a small change). Don't add claims about other vendors' prices.
- Card 2: keep.
- [AI] Card 3 says "לבנות לבד" in both the label and the body (R1), has a semicolon, and doesn't say what goes wrong. Suggested: "בונים מהר, ואז כל תיקון, כל עדכון וכל תקלה נופלים עליך."
- [YELLOW] The box "Site Bot: …" is a colon-label restatement. It's acceptable, but it's the fourth description of the package.

**FAQ**
- [ORANGE] The eyebrow "שאלות נפוצות" and the h2 "שאלות נפוצות" are identical (R1). Cut the eyebrow or change the h2.
- [ORANGE] Same FAQ-voice problem as /google-ads. Q2 ("לעסק שלך") and Q6 ("כבר למדת…") are questions addressed to the reader. The others are neutral or in his voice.
- [AI, R7] Q1 "המחיר נקבע בשיחה אישית" sends the reader somewhere else for the price. **Open decision (Adam/Eitan):** ₪199/month was approved on 2026-11-07, but the page is still running the 11-06 "no prices" funnel. Either publish the price (and the 30-day notice term), or remove Q1. Its second sentence is the eighth mention of the free audit.
- [AI, R6] Q2 "המועד נקבע בשיחה" is a non-answer, and the second sentence answers a different question. **Open fact:** the typical time from first call to live site (Eitan).
- [ORANGE] Q3 has a semicolon. Its second clause (the domain) has nothing to do with "do I need to code?". "בצ׳אט" contradicts the h1's call.
  - suggested: "לא. אתה מספר לנו על העסק, ואנחנו בונים ומעלים את האתר. אחר כך כל שינוי הוא הודעה."
- [RED, fact] Q4 "כלולה בחבילה המלאה לתמיד" (see worst item 1). Until the terms are confirmed, the safe version is "כל עוד המנוי פעיל". There's also a semicolon. [YELLOW] The scene "לקוח שואל על שירות חדש?" doesn't explain why the site needs to change. The hero's price-update scene is stronger.
- [YELLOW] Q5: "Cloudflare ו-GitHub" are meaningless to this reader. Say what they mean for him.
  - suggested sentence 2: "בחבילה שלנו האתר, הדומיין והאחסון רשומים על שמך, כך שהם נשארים שלך גם אם תעזוב."
  - why: the client owning the domain after cancellation was resolved on 2026-11-07 (memory). **Confirm** the hosting accounts are covered by the same terms.
- [ORANGE] Q6 "הזמן שלך לא בחינם" is a calque of "your time isn't free". Fix: "הזמן שלך שווה כסף". Sentence 2 repeats the package box almost word for word (R1/R2), and "לתמיד" appears again (RED fact).

**Cross-link**
- [AI] "רוצה שגם ימצאו אותך בגוגל? קרא על הפרופיל העסקי." The "גם" implies the site doesn't help you get found. It also contradicts the box saying the profile is already part of the package. Tamar should rewrite it once the GBP fact is settled.

**Final CTA**
- [AI] The heading "Site Bot — אתר לעסק" is a label, not a heading. The body is a copy of the hero sub-line (R2). Suggested: give it the hero scene's payoff (you update by message, no editor) and drop the repeated sentence. Tamar writes it.

## 3. Brief for Tamar (/site-bot)
**Rewrite.** One arc: the mid-workday scene, then who Eitan is (one line), then 3 real steps, then what you get and what you own, then two clear doors: talk to Eitan, or the free audit.
- Introduce Eitan once.
- Cut the audit mentions to 2 (hero button, final CTA).
- Cut "החבילה המלאה" to 1, or remove it if there's only one package.
- One term for the edit channel.
- At most one rhetorical-question opener per section.
- FAQ questions in the reader's voice; answers open with the answer itself.
- Merge the course-graduate section with FAQ 6.
- Remove the semicolons.
- Fix the reversed "משתנה באתר" logic.

**Keep.** Title, h1 and badge (anchors; the "עורך" note goes to Yonatan). The hero scene. The h2 "אתה מספר על העסק. אנחנו מעלים את האתר." Comparison card 2. The audit button label. Singular masculine throughout.

**Open facts (Eitan/Adam, before writing):**
- "לתמיד": what really happens to editing after cancellation?
- publish ₪199/month or drop FAQ 1
- typical time to go live
- intake by call or chat; editing via WhatsApp or another chat
- is the update automatic or done by a person, and how fast?
- is there more than one package?
- is GBP set up, or only linked?
- callback time after the form
- what the audit asks for besides the business name
- do the hosting accounts stay with the client like the domain?

---

# NEW proposed writing upgrades (deduplicated against R1–R10 and P1–P5)

1. At most one rhetorical question followed by its own answer per section, and never in two neighbouring elements.
2. No semicolons in marketing copy. Split into two sentences or join with a conjunction.
3. Use the "X, not Y" contrast at most once per page.
4. FAQ questions are written in the reader's own voice, first person, the way he'd type them, and consistently across the whole FAQ.
5. A named person is introduced with his role the first time he appears on a page.
6. Each point on a page lives in one section only. A step list and a feature grid must not cover the same items.
7. Numbered steps are actions in time order, with an explicit subject and the same grammatical form. A feature isn't a step, and the first step must match what the page says comes first.
8. One name per product, per channel and per offer across a page. Don't alternate synonyms or switch between forms with and without the definite article.
9. Unlimited promise words (forever, always, guaranteed, never) appear only when the settled terms say exactly that.
10. When a platform's official term means something else in the reader's daily life, replace it with a plain description.
11. Use active voice with a person as the subject. No passive-with-agent constructions and no formal or legal negation forms.
12. Tags, pills and labels use the reader's own words and name only what the text next to them actually describes.

Coverage notes:
- The jargon problem on /google-ads is already covered by pending P3 ("a technical term needs its plain-language effect"). Approving P3 covers it; I didn't add a duplicate.
- The brand-person switch on /google-ads is pending P4.
- The repeated audit, "30 דקות" and "החשבון שלך" mentions are R2.
- The button echoes are R1 and P2.

# Handoffs (for Adam to route)
- **Maya + Eitan-Dev:** the /google-ads OG title is missing the RLM before "| WAO". Fix it in the template for all OG titles.
- **Yonatan:** /google-ads title length (about 63 characters). The h1 calque "להינעל על". The MCC in the badge. The "עורך" ambiguity in the site-bot title and badge. Both meta descriptions. Whether the INCLUDED h2 is a keyword.
- **Dror:** stats sources and benchmark, Fraud Blocker, "הכול אוטומטית".
- **Eitan/Adam:** all open facts above, especially "לתמיד" and the site-bot price decision.
- **Eitan-Dev:** keep the /google-ads FAQPage schema in sync with any FAQ rewrite. The hero `tel:` link skips PhoneReveal attribution (Adam's call).
- **Tamar:** both briefs above. After her rewrite, the copy comes back to me for a correctness pass.

---

# Facts settled by Eitan (2026-11-11)
**/google-ads**
1. Stats (200–400% ROI, 60% CPA drop, 8:1 benchmark): **cannot be backed → remove the whole stats block.** No performance numbers anywhere on the page.
2. Commitment: month to month, **no minimum and no notice period**; billing is at the beginning of the month.
3. What raises the fee above ₪1,500: unclear to Eitan → don't explain it; keep the existing "from ₪1,500" wording as is, add nothing about tiers.
4. Fraud Blocker: **included** in the management fee.
5. The free 30-minute call **does include** a look at the client's account.
**/site-bot**
6. Chat editing after cancellation: **no** → never "forever"; editing is part of an active subscription.
7. Price: **show it** — ₪199 + VAT per month, monthly, no commitment, cancel online any time; cancellation takes effect at the end of the paid month (docs/legal/site-bot-terms-of-use.md §7–§8).
8. Time to live: **one business day** on a WAO address; **three business days** with the client's own domain.
9. The bot runs on its own (chat) from the start; Eitan is one chat message away when needed. Don't name WhatsApp; say "a message"/"chat" consistently.
10. **One package only** → drop "החבילה המלאה".
11. Google Business Profile: we **connect an existing one** (we don't create it). First customers are found through their existing Google Maps listings.
- **Update (Eitan, later 2026-11-11):** Q3: the Google Ads management fee is **always ₪1,500/month**, flat, never "from". The /site-bot h1 changes too, since it says the build starts with a call; Yonatan specs it and Tamar writes it.
- **CORRECTION (Eitan, later 2026-11-11):** ₪1,500/month is the **minimum ad spend (paid to Google)** needed to use the Google Ads Bot, or the manual retainer. It is **not** a management fee. The manual 1:1 retainer costs more than ₪1,500 on its own and is no longer pushed; the Ads Bot is the offer. The "flat ₪1,500 fee" update above is superseded.
- **Ads Bot (Eitan, later 2026-11-11):** ₪249/month from day one, no trial, and open for sign-up once the Takbull gateway is live. The minimum ad spend is ₪1,500/month, paid to Google. A money-back guarantee and the policy on landing pages hosted on WAO subdomains are pending a strategist call (Fable 5.2).
