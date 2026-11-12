# Brief: /google-ads — facts pass (2026-11-12)

**Reader:** a hands-on Israeli one-man-show business owner (plumber, electrician, AC tech, beautician…), singular male, busy, burned before by paying for clicks with no idea what came of them. Voice: the /site-bot/audit exemplar (loaded) — blunt, concrete, Sabra, proud of the product. Apply every approved writing-upgrade rule (loaded).

**Job:** the page below is already rewritten and approved in voice. Fix the lines that now contradict the founder's settled facts (below), and land the selling point described after them. Touch nothing else.

**New settled facts (Eitan, 2026-11-12) — these override anything the page says:**
1. **Price:** ₪249 + VAT per month (write "₪249 + מע״מ", the page's own ₪-first format). Every place that states the ₪249 fee must say + מע״מ — including the title/meta/OG/JSON-LD strings at the top of the file (Yonatan signs off the title; keep it ≤60 chars incl. "‏ | WAO" and keep "פרסום בגוגל" first).
2. **The service doesn't work on an existing account.** Ads Bot opens a NEW Google Ads account for him, in his name, and builds everything from scratch: campaigns, ads and the landing page. It never audits or edits an account he already has. So the SERVICE never fixes his current account. (The free 30-minute call is different — see the final CTA note.)
3. **Where it starts:** the bot starts with the one main service that has the best return and the biggest opportunity for his business (the 20% that brings 80%), not with everything he does.
4. **Leads are the point.** Every form, call and WhatsApp click from the landing page is recorded as a lead. He marks each lead in a simple lead list: good or junk, and whether it closed. That feedback goes back to Google, so the campaigns learn which searches bring real work. The weekly report shows how many leads came in and what each lead cost — not just clicks, impressions and cost.
5. Still true and unchanged: at least ₪1,500/month ad budget paid directly to Google from his own account; account and data are his, WAO manages through a manager account with a written agreement; month to month, billed at the start of the month, no trial; 30-day refund of the ₪249 service fee only; landing pages stay 30 days after the paid month, then go down (₪900 buyout, free after 12 paid months); Fraud Blocker included; Eitan, WAO's founder, is one chat away.
6. Still forbidden: no promised number of leads, no performance stats, no "guaranteed results" — the refund is a service-fee refund, never a results guarantee.

**Make fact 4 a selling point (Eitan):** this is what sets WAO apart. A lot of Google Ads management — especially the cheap kind — just drives clicks, because clicks are easy to show. Ads Bot optimises for the leads he himself marked as real work. Say that proudly and plainly, once, where it lands hardest (you choose: hero body, a step, a feature card or the FAQ) — you may change a line outside the "known lines" list for this. Don't name any competitor and don't use numbers or "most agencies" statistics; frame it as the common practice he's already met ("paid for clicks and didn't know what came of them" is his lived experience).

**Known lines that break these facts (check the whole file for others):** step 01 (checks the account and measurement; "you define what counts as a lead"), step 04 (optimises by clicks, impressions and cost), the FAQ "how do I know if it brings leads" (answer only promises clicks/impressions/cost) — this FAQ is duplicated in the JSON-LD near the top, patch both identically — and the final CTA block (eyebrow, h2 span, body: "check your account before adding budget"). For the final CTA: the free 30-minute call stays, and on the call we DO look at what he already has — his current Google Ads setup, site and profile — to see where the opportunity is. But what comes after is a fresh build from scratch, not a repair of the old account. Rewrite the final CTA so it doesn't promise to "check your account before you add budget" (that implies we fix and keep it); it may promise a look at his current setup on the call. Ignore the STATS array (it's being deleted).

**Hard keeps:** h1 and hero badge (SEO anchors). Singular masculine. ״ ׳ never ASCII quotes. Em-dash — single-spaced. One product name: "Ads Bot". Plain words for the lead list (don't say CRM).

**Output:** JSON patches only. Each `old` copied byte-for-byte from the file below (the exact content of one string literal or JSX text node, without surrounding quotes), `new` = replacement. Note: the same string may appear more than once (FAQ text + JSON-LD) — say which olds occur more than once.

=== FILE: src/app/(app)/google-ads/page.tsx (after the approved rewrite) ===
import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: {
    // title.absolute bypasses the root "%s‏ | WAO" template — this string
    // already ends in the RLM-anchored "‏ | WAO" suffix (same pattern as site-bot/page.tsx).
    absolute: "פרסום בגוגל — Google Ads עם Ads Bot ב-₪249 לחודש‏ | WAO",
  },
  description:
    "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 לחודש, ולפחות ₪1,500 למודעות ישירות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל — Google Ads עם Ads Bot ב-₪249 לחודש‏ | WAO",
    description: "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 לחודש, ולפחות ₪1,500 למודעות ישירות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
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
    description: "ניהול Google Ads עם Ads Bot ב-₪249 לחודש, בחשבון ובפרופיל תשלומים בבעלות הלקוח",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול קמפיינים בגוגל בחשבון של הלקוח",
    description: "ניהול Google Ads עם Ads Bot ב-₪249 לחודש. הלקוח משלם לפחות ₪1,500 לחודש למודעות ישירות לגוגל.",
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
        name: "כמה אני משלם על Ads Bot, ומי מקבל את תקציב המודעות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "₪249 לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads שלך. יש הסכם בכתב.",
        },
      },
      {
        "@type": "Question",
        name: "איך אני יודע אם הפרסום בגוגל מביא פניות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "אתה רואה בחשבון שלך קליקים, חשיפות ועלות בכל רגע, ו-Ads Bot שולח לך דוח כל שבוע. אף אחד לא יכול להבטיח מספר פניות מראש.",
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
    title: "אנחנו בודקים את החשבון",
    desc: "אנחנו בודקים את החשבון ואת המדידה לפני כל החלטה. אתה מגדיר מה נחשב פנייה, ורק אז מחליטים איפה נכון לפרסם.",
    tags: ["Google Ads Audit", "CPA Target", "ROAS", "Competitor Analysis"],
  },
  {
    n: "02",
    title: "Ads Bot מקים את הקמפיינים",
    desc: "Ads Bot כותב את המודעות, בוחר חיפושים מתאימים ומקים דפי נחיתה במערכת של WAO. הבוט מחבר הכול לחשבון Google Ads שלך.",
    tags: ["Performance Max", "Search Campaigns", "YouTube Ads", "Demand Gen"],
  },
  {
    n: "03",
    title: "אתה משלם את התקציב לגוגל",
    desc: "אתה משלם ל-WAO ₪249 לחודש. את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "אתה מקבל דוח שבועי",
    desc: "Ads Bot משפר את הקמפיינים לפי קליקים, חשיפות ועלות. אתה מקבל דוח שבועי, ו-Fraud Blocker חוסם קליקים מזויפים.",
    tags: ["RSA", "PMax Assets", "Ad Copy", "A/B Testing"],
  },
  {
    n: "05",
    title: "אתה יכול לבטל בכל חודש",
    desc: "אתה יכול לבטל בכל חודש. הבוט מתריע ביום הביטול ושוב 7 ימים לפני כיבוי דפי הנחיתה, ומציע להשהות את הקמפיינים או להפנות אותם לאתר שלך.",
    tags: ["GA4", "Conversion Tracking", "GTM", "Attribution"],
  },
];

const INCLUDED = [
  { icon: "🔬", title: "₪249 לחודש ל-WAO", desc: "החיוב בתחילת כל חודש, ואין תקופת ניסיון. אפשר לעזוב בכל חודש, בלי התחייבות." },
  { icon: "🎯", title: "תקציב מודעות לגוגל", desc: "אתה משלם מינימום של ₪1,500 לחודש ישירות לגוגל מחשבון Google Ads שלך." },
  { icon: "▶️", title: "החשבון והנתונים שלך", desc: "חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב. אתה רואה קליקים, חשיפות ועלות בכל רגע." },
  { icon: "📊", title: "מה Ads Bot עושה", desc: "הבוט מקים קמפיינים, מודעות ודפי נחיתה, מבצע אופטימיזציה ושולח דוח שבועי. Fraud Blocker כלול, ואיתן, מייסד WAO, זמין בצ׳אט." },
  { icon: "✍️", title: "החזר דמי שירות", desc: "לא מרוצה ב-30 הימים הראשונים? אנחנו מחזירים ₪249, דמי השירות בלבד. הספירה מתחילה כשהמודעה הראשונה עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ובקשה עד 7 ימים אחרי סוף התקופה." },
  { icon: "📈", title: "דפי נחיתה וביטול", desc: "דפי הנחיתה פועלים במערכת WAO כחלק מהמנוי. אחרי ביטול הם נשארים 30 יום, ואפשר לקנות אותם ב-₪900 או לקבל חינם אחרי 12 חודשי תשלום." },
];

const STATS = [
  { n: "200–400%", l: "ROI מדווח ללקוחות WAO", sub: "נתונים פנימיים WAO 2025" },
  { n: "60%", l: "ירידה מדווחת ב-CPA", sub: "נתונים פנימיים WAO 2025" },
  { n: "8:1", l: "ROAS לפי בנצ'מרק ענפי, לא נתון מהחשבון שלך", sub: "Google Ads Benchmarks 2025" },
];

const FAQS = [
  {
    q: "כמה אני משלם על Ads Bot, ומי מקבל את תקציב המודעות?",
    a: "₪249 לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads שלך. יש הסכם בכתב.",
  },
  {
    q: "מה קורה אם אני מבטל את המנוי?",
    a: "אתה יכול לבטל בכל חודש, בלי התחייבות ובלי הודעה מוקדמת. דפי הנחיתה נשארים באוויר עוד 30 יום אחרי סוף החודש ששילמת, ואז יורדים. אפשר לקנות אותם ב-₪900, ואחרי 12 חודשי תשלום תקבל אותם בחינם. הבוט מזהיר אותך ביום הביטול ושוב 7 ימים לפני שהדפים יורדים, ומציע להשהות את הקמפיינים או להפנות אותם לאתר שלך.",
  },
  {
    q: "אם לא אהיה מרוצה, אני מקבל את הכסף בחזרה?",
    a: "כן, את דמי השירות, ₪249. את תקציב המודעות שילמת לגוגל, ולכן הוא לא חוזר. התקופה היא 30 יום, והיא מתחילה כשהמודעה הראשונה שלך עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ואתה מבקש עד 7 ימים אחרי סוף 30 הימים. אם לא הצלחנו להעלות את המודעות שלך, ההחזר אוטומטי. זה בנוסף לזכות שלך לבטל תוך 14 יום לפי החוק.",
  },
  {
    q: "איך אני יודע אם הפרסום בגוגל מביא פניות?",
    a: "אתה רואה בחשבון שלך קליקים, חשיפות ועלות בכל רגע, ו-Ads Bot שולח לך דוח כל שבוע. אף אחד לא יכול להבטיח מספר פניות מראש.",
  },
  {
    q: "מה ההבדל מבחינתי בין פרסום בגוגל לקידום אורגני?",
    a: "בפרסום בגוגל אתה משלם על כל קליק, וכשאתה מפסיק לשלם, המודעות יורדות. בקידום אורגני אתה לא משלם לגוגל על קליקים, אבל לוקח חודשים עד שמטפסים בתוצאות.",
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
            חודש בחודש. בלי התחייבות ובלי הודעה מוקדמת.
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
            {" "}— בלי להיות כבול לסוכנות
          </h1>
          <p style={{ ...bodyStyle, fontSize: "clamp(1rem,1.8vw,1.2rem)", marginBottom: "40px", maxWidth: "620px" }}>
            כבר שילמת על קליקים ולא ידעת כמה פניות קיבלת? Ads Bot מקים את הקמפיינים, מנהל אותם ושולח דוח שבועי — ב-₪249 לחודש. אתה רואה כל שקל.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
            <a href="tel:0526148860" className="btn-primary" style={{ fontSize: "1.05rem", padding: "15px 36px" }}>
              דבר איתנו 30 דקות, חינם
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
            <Link href="/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox" className="btn-outline" style={{ fontSize: "1rem" }}>
              תראה הדגמה בלי להוציא שקל ←
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
            <div className="eyebrow">התהליך</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              איך{" "}
              <span className="text-gradient">Ads Bot עובד</span>
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
            <div className="eyebrow">מה אתה מקבל ומה אתה משלם</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(1.6rem,3vw,2.4rem)" }}>
              ניהול קמפיינים בגוגל —{" "}
              <span className="text-gradient">עם Ads Bot</span>
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>רוצה לבדוק את החשבון לפני שמוסיפים תקציב?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחת ייעוץ של 30 דקות —{" "}
                <span className="text-gradient">נבדוק את החשבון שלך</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                בשיחה חינם של 30 דקות אנחנו נבדוק את החשבון ונגיד לך מה לבדוק לפני שאתה מוסיף תקציב.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                <PhoneReveal
                  source="google-ads-bottom-cta"
                  className="btn-primary"
                  style={{ fontSize: "1.05rem", padding: "16px 40px" }}
                  icon="📞 "
                />
                <Link href="/google-ads/onboarding" className="btn-outline" style={{ fontSize: "1rem" }}>
                  תראה איך Ads Bot עובד ←
                </Link>
              </div>
              <p style={{ marginTop: "20px", fontSize: "0.8rem", color: "var(--muted)", fontFamily: "var(--font-body), sans-serif" }}>
                ✓ ₪249 לחודש · ✓ מינימום ₪1,500 לגוגל · ✓ החזר דמי שירות בכפוף לתנאים
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
