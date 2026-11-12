# Brief: /site-bot — human rewrite (2026-11-11)

**Reader:** a hands-on Israeli micro-business owner (plumber, electrician, AC tech, beautician…), singular male, busy, ROI-minded, burned before by agencies or by paying for clicks, allergic to jargon and AI-sounding copy. Voice target: the /site-bot/audit exemplar (loaded) — blunt, concrete, Sabra. Apply every approved writing-upgrade rule (loaded).

**Job:** rewrite the RENDERED Hebrew strings of this page so it reads like a person who knows the trade wrote it. Noa's review (below) lists every problem in render order with suggested lines — use it as input, not as final copy; you own wording, angle and structure within the scope below.

**Hard keeps:** page `<title>`, h1 and hero badge (SEO anchors — do not change them even where Noa flags them). Every fact must come from the settled facts below or from what the page already states; invent nothing (no results, numbers, guarantees, timings, client counts). Singular masculine. No ASCII quotes inside Hebrew (use ״ ׳). Em-dash — single-spaced.

**Facts (Eitan, 2026-11-11):**
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


**Scope / structure:** you may cut strings (return new value "") and merge sections by emptying one and enriching the other, but you cannot add new JSX elements — only replace existing string literals. If a section should disappear entirely, empty all its strings and say so in your angle note so the engineer removes the wrapper.

**Output:** JSON patches only. Each `old` copied byte-for-byte from the file below (the exact content of one string literal or JSX text node, without surrounding quotes), `new` = replacement. Also list any FAQ strings that are duplicated in a JSON-LD schema block in the file, so the engineer keeps them in sync.

=== NOA'S REVIEW ===
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


=== FILE: src/app/(app)/site-bot/page.tsx ===
import type { Metadata } from "next";
import Link from "next/link";
import { renderMixed } from "@/lib/bidi";

const CANONICAL = "https://www.wao.co.il/site-bot";

export const metadata: Metadata = {
  // title.absolute bypasses the root "%s‏ | WAO" template — this string already
  // ends in the RLM-anchored "‏ | WAO" suffix, so the template must not append a second one.
  title: {
    absolute: "בניית אתר לעסק קטן — בלי עורך, עדכונים בהודעה‏ | WAO",
  },
  description:
    "בניית אתר לעסק קטן מתחילה בשיחה עם איתן על האתר שמתאים לעסק שלך. רוצה לראות קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "בניית אתר לעסק קטן — בלי עורך, עדכונים בהודעה",
    description:
      "בניית אתר לעסק קטן מתחילה בשיחה עם איתן על האתר שמתאים לעסק שלך. רוצה לראות קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית.",
    url: CANONICAL,
    type: "website",
  },
};

const FAQS = [
  {
    q: "כמה עולה בניית אתר לעסק קטן ב-Site Bot?",
    a: "המחיר נקבע בשיחה אישית עם איתן, לפי מה שהעסק שלך צריך. אפשר להתחיל קודם בבדיקה חינמית של העסק שלך בגוגל.",
  },
  {
    q: "מתי האתר לעסק שלך עולה לאוויר?",
    a: "המועד נקבע בשיחה עם איתן, לפי היקף האתר. אתה לא צריך להקים כלום בעצמך.",
  },
  {
    q: "צריך לדעת לבנות אתר או לעבוד עם קוד?",
    a: "לא. אתה מספר על העסק בצ׳אט; החבילה המלאה כוללת אתר בדומיין פרטי, בלי להקים אותו בעצמך.",
  },
  {
    q: "איך משנים מחיר או שירות אחרי שהאתר עלה?",
    a: "לקוח שואל על שירות חדש? אתה שולח הודעת WhatsApp, והאתר מתעדכן. העריכה בצ׳אט כלולה בחבילה המלאה לתמיד; אין צורך לגעת בקוד.",
  },
  {
    q: "למה לא לבנות לבד ב-Wix או ב-WordPress?",
    a: "ב-Wix או ב-WordPress אתה בונה ומעדכן בעצמך. בחבילה המלאה הדומיין, Cloudflare ו-GitHub רשומים על שמך. רוצה לשנות משהו? אתה שולח הודעת WhatsApp במקום לפתוח שוב את העורך.",
  },
  {
    q: "כבר למדת לבנות אתר בקורס של WAO. למה לשלם?",
    a: "אתה יכול לבנות לבד, אבל הזמן שלך לא בחינם. החבילה כוללת חמישה עמודים, דומיין פרטי ועריכה בצ׳אט לתמיד, וגם חיבור GSC, פרופיל עסקי בגוגל וטופס לידים.",
  },
];

const schemas = [
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    name: "Site Bot — בניית אתר לעסק קטן",
    serviceType: "בניית אתר לעסק קטן",
    provider: {
      "@type": "Organization",
      name: "WAO",
      url: "https://www.wao.co.il",
    },
    areaServed: "IL",
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${CANONICAL}#faq`,
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.a,
      },
    })),
  },
];

const STEPS = [
  "מתחיל בשיחה על העסק שלך, בלי לפתוח עורך אתרים.",
  "מספר מה אתה עושה ולמי אתה רוצה שהאתר יפנה.",
  "החבילה המלאה כוללת אתר בדומיין שרשום על שמך.",
];

const COMPARE = [
  {
    label: "לשכור מפתח או סוכנות",
    body: "אתה תלוי בתהליך ובמחיר שיסוכמו מול הספק, גם כשתרצה לעדכן.",
  },
  {
    label: "Wix או WordPress לבד",
    body: "אתה בונה בעצמך, ואז חוזר לעורך בכל פעם שמשהו בעסק משתנה.",
  },
  {
    label: "לבנות לבד בעזרת AI",
    body: "אתה יכול לבנות לבד; רק תחליט כמה זמן תרצה להקדיש לתחזוקה.",
  },
];

export default function SiteBotPage() {
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
          <p className="badge" style={{ marginBottom: "28px" }}>
            <span className="badge-dot" />
            בניית אתר לעסק קטן, בלי להתעסק עם עורך
          </p>

          <h1
            className="text-3xl sm:text-4xl md:text-5xl"
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              marginBottom: "24px",
            }}
          >
            בניית אתר לעסק קטן מתחילה בשיחה עם איתן, ואחר כך אתה מעדכן את האתר בהודעה.
          </h1>

          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "24px", maxWidth: "640px" }}>
            {renderMixed(
              "אתה באמצע יום עבודה וצריך לעדכן מחיר באתר? שלח הודעת WhatsApp והאתר מתעדכן. החבילה המלאה כוללת חמישה עמודים בדומיין שלך."
            )}
          </p>

          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <Link
              href="/contact?ref=site-bot-build#contact-form"
              className="btn-primary w-full sm:w-auto justify-center"
              style={{ fontSize: "1.05rem", padding: "16px 40px" }}
            >
              {renderMixed("דבר עם איתן על האתר שלך")}
            </Link>
            <Link href="/site-bot/audit" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
              {renderMixed("בדוק איך העסק שלך נראה בגוגל — חינם")}
            </Link>
          </div>

          <p style={{ marginTop: "18px", fontSize: "0.85rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
            {renderMixed("משאירים פרטים, ואיתן חוזר אליך לשיחה על האתר. אפשר גם להתחיל בבדיקה חינמית של העסק שלך בגוגל.")}
          </p>
        </div>
      </section>

      {/* ── Proof block: 3 steps ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <div
            className="rounded-xl p-4 sm:p-6"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 800,
                fontSize: "1.15rem",
                marginBottom: "18px",
                color: "var(--text)",
              }}
            >
              אתה מספר על העסק. אנחנו מעלים את האתר.
            </h2>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "14px" }}>
              {STEPS.map((step, i) => (
                <li key={step} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <span
                    aria-hidden
                    style={{
                      flexShrink: 0,
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "var(--accent-dim)",
                      border: "1px solid var(--accent-border)",
                      color: "var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      marginTop: "2px",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span style={{ ...bodyStyle, color: "var(--text)" }}>{renderMixed(step)}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── Objection: Module-5 graduate ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.25rem,2.2vw,1.6rem)",
              lineHeight: 1.25,
              marginBottom: "16px",
              color: "var(--text)",
            }}
          >
            {renderMixed("כבר למדת לבנות אתר לבד? עכשיו תבחר איך לבזבז פחות זמן.")}
          </h2>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.12rem)", color: "var(--text)" }}>
            {renderMixed(
              "למדת בקורס של WAO לבנות אתר בעצמך? מצוין, זאת עדיין אפשרות. אבל כשלקוח מחכה לתשובה, אולי לא תרצה לפתוח עורך אתרים. בחבילה המלאה אתה שולח הודעת WhatsApp כשמשהו משתנה באתר."
            )}
          </p>
        </div>
      </section>

      {/* ── Price anchor block ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.15rem)", marginBottom: "24px", color: "var(--text)" }}>
            {renderMixed(
              "כל אתר נבנה אחרי שיחה עם איתן על העסק שלך. רוצה לבדוק קודם איך העסק שלך נראה בגוגל? הבדיקה חינמית, וצריך רק את שם העסק."
            )}
          </p>

          <Link
            href="/contact?ref=site-bot-build#contact-form"
            className="btn-primary w-full sm:w-auto justify-center"
            style={{ fontSize: "1.05rem", padding: "16px 40px", marginBottom: "18px" }}
          >
            {renderMixed("דבר עם איתן על האתר שלך")}
          </Link>

          <p style={{ ...bodyStyle, fontSize: "0.95rem", color: "var(--text)", marginTop: "18px" }}>
            {renderMixed(
              "הבדיקה לא מחייבת אותך לכלום. רק אחריה תחליט אם לדבר עם איתן על האתר."
            )}
          </p>

          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              marginTop: "20px",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <p style={{ ...bodyStyle, color: "var(--text)", margin: 0 }}>
              {renderMixed(
                "מה כוללת החבילה המלאה? חמישה עמודים, דומיין פרטי ועריכה בצ׳אט. גם GSC, הפרופיל העסקי בגוגל וטופס הלידים מחוברים לאתר."
              )}
            </p>
          </div>
        </div>
      </section>

      {/* ── Three-way comparison ── */}
      <section className="wao-section">
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem,2.5vw,2rem)",
              lineHeight: 1.2,
              marginBottom: "24px",
              color: "var(--text)",
            }}
          >
            {renderMixed("לבנות לבד, לשכור מפתח, או לשלוח הודעה?")}
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
            {COMPARE.map((row) => (
              <div
                key={row.label}
                className="rounded-xl p-4 sm:p-5"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <p
                  style={{
                    fontFamily: "var(--font-rubik), sans-serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    margin: "0 0 6px",
                    color: "var(--text)",
                  }}
                >
                  {renderMixed(row.label)}
                </p>
                <p style={{ ...bodyStyle, margin: 0 }}>{renderMixed(row.body)}</p>
              </div>
            ))}
          </div>

          <div
            className="rounded-xl p-4 sm:p-5"
            style={{
              background: "var(--accent-dim)",
              border: "1px solid var(--accent-border)",
              borderInlineStartWidth: "4px",
              borderInlineStartColor: "var(--accent)",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-rubik), sans-serif",
                fontWeight: 800,
                fontSize: "1.05rem",
                margin: 0,
                color: "var(--text)",
              }}
            >
              {renderMixed("Site Bot: אתר לעסק קטן, בדומיין שלך ועם עריכה בצ׳אט.")}
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="wao-section" style={{ background: "var(--surface)" }}>
        <div className="wao-container" style={{ maxWidth: "800px" }}>
          <div className="eyebrow">שאלות נפוצות</div>
          <h2
            style={{
              fontFamily: "var(--font-rubik), sans-serif",
              fontWeight: 800,
              fontSize: "clamp(1.5rem,2.5vw,2rem)",
              lineHeight: 1.2,
              marginBottom: "40px",
              color: "var(--text)",
            }}
          >
            שאלות נפוצות
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 0,
                }}
              >
                <summary
                  style={{
                    padding: "22px 24px",
                    cursor: "pointer",
                    listStyle: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <h3
                    style={{
                      fontFamily: "var(--font-rubik), sans-serif",
                      fontWeight: 700,
                      fontSize: "1.02rem",
                      lineHeight: 1.4,
                      margin: 0,
                      color: "var(--text)",
                    }}
                  >
                    {renderMixed(faq.q)}
                  </h3>
                  <span aria-hidden style={{ fontSize: "1.2rem", color: "var(--accent)", flexShrink: 0 }}>+</span>
                </summary>
                <div style={{ padding: "0 24px 22px", ...bodyStyle }}>{renderMixed(faq.a)}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cross-links ── */}
      <section className="wao-section" style={{ paddingTop: 0 }}>
        <div className="wao-container" style={{ maxWidth: "860px" }}>
          <Link
            href="/google-business"
            style={{
              display: "block",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "20px",
              textDecoration: "none",
              color: "var(--text)",
              fontFamily: "var(--font-body), sans-serif",
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {renderMixed("רוצה שגם ימצאו אותך בגוגל? קרא על הפרופיל העסקי.")}
          </Link>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="wao-section">
        <div className="wao-container">
          <div className="cta-banner" style={{ padding: "clamp(48px,8vw,80px) clamp(24px,6vw,64px)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse at center, rgba(74,227,181,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <p style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px", color: "var(--text)" }}>
                {renderMixed("Site Bot")} — <span className="text-gradient">אתר לעסק</span>
              </p>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                {renderMixed("משאירים פרטים, ואיתן חוזר אליך לשיחה על האתר. אפשר גם להתחיל בבדיקה חינמית של העסק שלך בגוגל.")}
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/contact?ref=site-bot-build#contact-form"
                  className="btn-primary w-full sm:w-auto justify-center"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                >
                  {renderMixed("דבר עם איתן על האתר שלך")}
                </Link>
                <Link href="/site-bot/audit" className="btn-outline w-full sm:w-auto justify-center" style={{ fontSize: "1rem" }}>
                  {renderMixed("בדוק איך העסק שלך נראה בגוגל — חינם")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

