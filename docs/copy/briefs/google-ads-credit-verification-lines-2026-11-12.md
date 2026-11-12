# Brief: /google-ads — credit + Google approval lines (2026-11-12)

**Reader:** a hands-on Israeli one-man-show business owner, singular male, busy, burned before by paying for clicks. Voice: the /site-bot/audit exemplar (loaded) — blunt, concrete, Sabra, proud. Apply every approved writing-upgrade rule (loaded).

**Job:** the page below is final in voice. Add three facts by REPLACING existing strings (you can't add elements — extend or rewrite the string where each fact fits best; you choose the spot). Touch nothing else.

1. **Google ad credit (a selling point of the fresh account):** businesses that are new to Google Ads may be eligible for an advertising credit from Google when the account is opened through a Google Partner (WAO is one), under Google's terms. NO amount, no numbers. It's Google's credit, not part of what the ₪249 buys and not a WAO discount. Never say "you'll get it", "your new account qualifies" or "guaranteed".
2. **Google approves the payment details first:** his ads go live after Google confirms his payment details (and his identity, if Google asks). It usually takes a few business days, and that part is Google's. Say it plainly, as an honest expectation, not as a warning.
3. **He owns the card and the account:** the account and the payment method are in his name, and he enters them directly with Google. WAO never handles his card or his ID.

Facts already on the page stay as they are (₪249 + מע״מ, ≥₪1,500 to Google, new account from scratch, leads he marks, 30-day service-fee refund from the first ad going live, free 30-min call). Don't repeat facts another string already says (rule 31). Hard keeps: title, h1, hero badge. ״ ׳ never ASCII quotes. Em-dash — single-spaced. One name: "Ads Bot". If you change an FAQ answer, it is duplicated in the JSON-LD near the top — say which olds occur more than once.

**Output:** JSON patches only. Each `old` copied byte-for-byte from the file below, `new` = replacement.

=== FILE: src/app/(app)/google-ads/page.tsx (current) ===
import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: {
    // title.absolute bypasses the root "%s‏ | WAO" template — this string
    // already ends in the RLM-anchored "‏ | WAO" suffix (same pattern as site-bot/page.tsx).
    absolute: "פרסום בגוגל — Google Ads עם Ads Bot ב-₪249 + מע״מ‏ | WAO",
  },
  description:
    "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 + מע״מ לחודש, ולפחות ₪1,500 למודעות ישירות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל — Google Ads עם Ads Bot ב-₪249 + מע״מ‏ | WAO",
    description: "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 + מע״מ לחודש, ולפחות ₪1,500 למודעות ישירות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
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
    description: "ניהול Google Ads עם Ads Bot ב-₪249 + מע״מ לחודש, בחשבון ובפרופיל תשלומים בבעלות הלקוח",
    isPartOf: { "@type": "WebSite", "@id": "https://www.wao.co.il/#website" },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${CANONICAL}#service`,
    serviceType: "Google Ads Management",
    name: "ניהול קמפיינים בגוגל בחשבון של הלקוח",
    description: "ניהול Google Ads עם Ads Bot ב-₪249 + מע״מ לחודש. הלקוח משלם לפחות ₪1,500 לחודש למודעות ישירות לגוגל.",
    url: CANONICAL,
    provider: { "@type": "Organization", "@id": "https://www.wao.co.il/#org" },
    areaServed: { "@type": "Country", name: "Israel" },
    offers: { "@type": "Offer", priceCurrency: "ILS", price: "249" },
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
          text: "₪249 + מע״מ לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads חדש שנפתח על שמך. יש הסכם בכתב.",
        },
      },
      {
        "@type": "Question",
        name: "איך אני יודע אם הפרסום בגוגל מביא פניות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "כל פנייה מדף הנחיתה, בין אם טופס, שיחה או לחיצת וואטסאפ, נכנסת לרשימה פשוטה. אתה מסמן כל פנייה כטובה או לא רלוונטית, ואם היא נסגרה. הסימון חוזר לגוגל, והקמפיינים לומדים אילו חיפושים מביאים עבודה. הדוח השבועי מראה כמה פניות הגיעו ומה עלתה כל פנייה. אף אחד לא יכול להבטיח מספר פניות מראש.",
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
    title: "Ads Bot מתחיל מהשירות המשתלם ביותר",
    desc: "Ads Bot פותח חשבון Google Ads חדש בבעלותך ומתחיל מהשירות המרכזי עם ההזדמנות הגדולה ביותר, בלי לגעת בחשבון ישן.",
    tags: ["Google Ads Audit", "CPA Target", "ROAS", "Competitor Analysis"],
  },
  {
    n: "02",
    title: "Ads Bot מקים את הקמפיינים",
    desc: "Ads Bot כותב את המודעות, בוחר חיפושים מתאימים ומקים דפי נחיתה במערכת של WAO. הבוט מחבר הכול לחשבון החדש שנפתח בבעלותך.",
    tags: ["Performance Max", "Search Campaigns", "YouTube Ads", "Demand Gen"],
  },
  {
    n: "03",
    title: "אתה משלם את התקציב לגוגל",
    desc: "אתה משלם ל-WAO ₪249 + מע״מ לחודש. את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מהחשבון החדש שנפתח בבעלותך.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "אתה מקבל דוח שבועי",
    desc: "Ads Bot מכוון את הקמפיינים לפי הפניות שאתה מסמן כעבודה אמיתית. הסימון חוזר לגוגל, והקמפיינים לומדים אילו חיפושים מביאים עבודה. הדוח השבועי מראה כמה פניות הגיעו ומה עלתה כל פנייה, ו-Fraud Blocker חוסם קליקים מזויפים.",
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
  { icon: "🔬", title: "₪249 + מע״מ לחודש ל-WAO", desc: "החיוב בתחילת כל חודש, ואין תקופת ניסיון. אפשר לעזוב בכל חודש, בלי התחייבות." },
  { icon: "🎯", title: "תקציב מודעות לגוגל", desc: "אתה משלם מינימום של ₪1,500 לחודש ישירות לגוגל מחשבון Google Ads שלך." },
  { icon: "▶️", title: "החשבון והנתונים שלך", desc: "חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב. בדוח השבועי אתה רואה פניות ועלות לפי פנייה." },
  { icon: "📊", title: "מה Ads Bot עושה", desc: "הבוט מקים קמפיינים, מודעות ודפי נחיתה, מבצע אופטימיזציה ושולח דוח שבועי. Fraud Blocker כלול, ואיתן, מייסד WAO, זמין בצ׳אט." },
  { icon: "✍️", title: "החזר דמי שירות", desc: "לא מרוצה ב-30 הימים הראשונים? אנחנו מחזירים ₪249 + מע״מ, דמי השירות בלבד. הספירה מתחילה כשהמודעה הראשונה עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ובקשה עד 7 ימים אחרי סוף התקופה." },
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
    a: "₪249 + מע״מ לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads חדש שנפתח על שמך. יש הסכם בכתב.",
  },
  {
    q: "מה קורה אם אני מבטל את המנוי?",
    a: "אתה יכול לבטל בכל חודש, בלי התחייבות ובלי הודעה מוקדמת. דפי הנחיתה נשארים באוויר עוד 30 יום אחרי סוף החודש ששילמת, ואז יורדים. אפשר לקנות אותם ב-₪900, ואחרי 12 חודשי תשלום תקבל אותם בחינם. הבוט מזהיר אותך ביום הביטול ושוב 7 ימים לפני שהדפים יורדים, ומציע להשהות את הקמפיינים או להפנות אותם לאתר שלך.",
  },
  {
    q: "אם לא אהיה מרוצה, אני מקבל את הכסף בחזרה?",
    a: "כן, את דמי השירות, ₪249 + מע״מ. את תקציב המודעות שילמת לגוגל, ולכן הוא לא חוזר. התקופה היא 30 יום, והיא מתחילה כשהמודעה הראשונה שלך עולה לאוויר. התנאים: המודעות רצו בקצב של ₪1,500 לחודש, החזר אחד לכל עסק, ואתה מבקש עד 7 ימים אחרי סוף 30 הימים. אם לא הצלחנו להעלות את המודעות שלך, ההחזר אוטומטי. זה בנוסף לזכות שלך לבטל תוך 14 יום לפי החוק.",
  },
  {
    q: "איך אני יודע אם הפרסום בגוגל מביא פניות?",
    a: "כל פנייה מדף הנחיתה, בין אם טופס, שיחה או לחיצת וואטסאפ, נכנסת לרשימה פשוטה. אתה מסמן כל פנייה כטובה או לא רלוונטית, ואם היא נסגרה. הסימון חוזר לגוגל, והקמפיינים לומדים אילו חיפושים מביאים עבודה. הדוח השבועי מראה כמה פניות הגיעו ומה עלתה כל פנייה. אף אחד לא יכול להבטיח מספר פניות מראש.",
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
            כבר שילמת על קליקים ולא ידעת מה יצא מזה? Ads Bot פותח חשבון Google Ads חדש על שמך ומכוון לפי הפניות שאתה מסמן כעבודה, לא רק לפי קליקים. ב-₪249 + מע״מ לחודש.
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>רוצה לדעת איפה ההזדמנות לפני שאתה מוסיף תקציב?</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחת ייעוץ של 30 דקות —{" "}
                <span className="text-gradient">נסתכל על מה שיש לך היום</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                בשיחה חינם של 30 דקות אנחנו מסתכלים על מה שיש לך היום: פרסום, אתר ופרופיל, ומראים לך איפה ההזדמנות. אם אתה ממשיך, Ads Bot בונה הכול מאפס בחשבון חדש על שמך.
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
                ✓ ₪249 + מע״מ לחודש · ✓ מינימום ₪1,500 לגוגל · ✓ החזר דמי שירות בכפוף לתנאים
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
