# Brief: make Google's new-advertiser credit a bonus WAO brings (2026-11-12)

**Founder's direction (Eitan):** stop writing the credit as limitations ("it's Google's, not ours, not a discount"). Make it a selling point. Most business owners don't know this credit exists or how to get it. Agencies get these offers from Google all the time to pass on to their clients, so WAO is the one who brings it to him. Make it a strong point.

**True facts you may use (Dror, web-checked 2026-11-12):**
- WAO is a Google Partner. Partners get new-advertiser credit offers from Google to apply to client accounts they open.
- It is NOT automatic. WAO applies it from its Partner account to the new account it opens for him, within the first days after the account opens. A business owner on his own usually never sees this option.
- The credit is ad money from Google that goes into his Google Ads account. He spends a set amount in the first period, and Google adds credit on top.
- Because WAO always opens a NEW account (never an existing one), it fits exactly the window where the offer applies.

**Hard lines (Google partner policy; breaking them can suspend the accounts. Not negotiable):**
- No amount, number or ratio anywhere ("spend X, get X" is out).
- Never say he will definitely get it. It applies to businesses that never advertised on Google Ads before, and Google makes the final check. One short honest qualifier is enough, written as "if your business is new to Google Ads".
- Never present it as something he pays for, a discount on the ₪249, or part of our fee (selling credits is prohibited).
- Never say Google Ads "gives" money to WAO.

**Deliver patches for:**
1. `/google-ads` page, card titled "תקציב מודעות לגוגל" (the `desc` string, in FILE 1). Keep the first sentence about the ₪1,500 minimum unchanged. Rewrite the credit part as a benefit WAO brings.
2. Optional: ONE more short benefit line elsewhere on the page where it earns its place (your call where, as a patch on an existing string; don't create new structure). Don't repeat card 1's wording.
3. Terms of use (FILE 2), the paragraph starting "תקציב הפרסום אינו חלק מדמי השירות" in §7. Keep its first three sentences unchanged. Rewrite the credit sentences in positive legal register: we apply the offer for you as a Google Partner, subject to Google's conditions and eligibility. It's not part of the fees and not a discount. Keep it legal-precise, with no promise.

Each `old` must occur exactly once in its file. Patch FILE 1 strings byte-exact, as they appear in the TSX.

=== FILE 1: src/app/(app)/google-ads/page.tsx ===
import type { Metadata } from "next";
import Link from "next/link";
import GT from "@/components/GlossaryTerm";
import PhoneReveal from "@/components/PhoneReveal";

const CANONICAL = "https://www.wao.co.il/google-ads";

export const metadata: Metadata = {
  title: {
    // title.absolute bypasses the root "%s‏ | WAO" template — this string
    // already ends in the RLM-anchored "‏ | WAO" suffix (same pattern as site-bot/page.tsx).
    absolute: "פרסום בגוגל — Google Ads ב-₪249 + מע״מ לחודש‏ | WAO",
  },
  description:
    "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 + מע״מ לחודש, ולפחות ₪1,500 למודעות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: "פרסום בגוגל — Google Ads ב-₪249 + מע״מ לחודש‏ | WAO",
    description: "שילמת על קליקים ולא ראית פניות? פרסום בגוגל עם Ads Bot ב-₪249 + מע״מ לחודש, ולפחות ₪1,500 למודעות לגוגל. החזר דמי שירות אם לא תהיה מרוצה בחודש הראשון.",
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
          text: "₪249 + מע״מ לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads שלך. יש הסכם בכתב.",
        },
      },
      {
        "@type": "Question",
        name: "איך אני יודע אם הפרסום בגוגל מביא פניות?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "כל פנייה מדף הנחיתה, בטופס, בשיחה או בוואטסאפ, נכנסת לרשימת הפניות שלך. בדוח השבועי אתה רואה כמה פניות הגיעו ומה עלתה כל פנייה. אף אחד לא יכול להבטיח מספר פניות מראש.",
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
    title: "Ads Bot פותח לך חשבון חדש",
    desc: "החשבון רשום על שמך, ו-Ads Bot בונה אותו מאפס בלי לגעת בחשבון שכבר יש לך. הוא מתחיל משירות אחד, זה שהכי משתלם לך לפרסם.",
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
    desc: "את תקציב המודעות, לפחות ₪1,500 לחודש, אתה משלם ישירות לגוגל מחשבון Google Ads שלך. המודעות עולות לאוויר אחרי שגוגל מאמתת את פרטי התשלום, ואם היא מבקשת, גם את הזהות שלך. בדרך כלל זה לוקח כמה ימי עסקים, והזמן תלוי בגוגל.",
    tags: ["Smart Bidding", "Target ROAS", "Audience Signals", "First-Party Data"],
  },
  {
    n: "04",
    title: "אתה מסמן את הפניות",
    desc: "ליד כל אחת אתה מציין אם היא רלוונטית ואם היא נסגרה. Ads Bot מכוון את הקמפיינים לפי זה ומעביר את המידע לגוגל, שלומד אילו חיפושים מביאים עבודה.",
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
  { icon: "🎯", title: "תקציב מודעות לגוגל", desc: "אתה משלם מינימום של ₪1,500 לחודש ישירות לגוגל מחשבון Google Ads שלך. אם העסק שלך חדש ב-Google Ads, ייתכן שתהיה זכאי לזיכוי פרסום, כשהחשבון נפתח דרך Google Partner כמו WAO. הזיכוי הוא של גוגל ולפי התנאים שלה, והוא לא חלק מה-₪249 ולא הנחה של WAO." },
  { icon: "▶️", title: "החשבון והנתונים שלך", desc: "חשבון Google Ads, הקמפיינים והנתונים שייכים אליך. WAO מנהלת אותם דרך חשבון ניהול, ויש הסכם בכתב. את פרטי התשלום אתה מזין בעצמך ישירות מול גוגל, על שמך. WAO לא נוגעת בכרטיס האשראי שלך ולא בתעודה המזהה." },
  { icon: "📊", title: "מה Ads Bot עושה", desc: "הבוט מקים קמפיינים, מודעות ודפי נחיתה ושולח דוח שבועי. Fraud Blocker כלול, ואיתן, מייסד WAO, זמין בצ׳אט." },
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
    a: "₪249 + מע״מ לחודש ל-WAO. בנוסף, אתה משלם מינימום של ₪1,500 לחודש למודעות ישירות לגוגל מחשבון Google Ads שלך. יש הסכם בכתב.",
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
    a: "כל פנייה מדף הנחיתה, בטופס, בשיחה או בוואטסאפ, נכנסת לרשימת הפניות שלך. בדוח השבועי אתה רואה כמה פניות הגיעו ומה עלתה כל פנייה. אף אחד לא יכול להבטיח מספר פניות מראש.",
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
            כבר שילמת על קליקים ולא ידעת מה יצא מזה? Ads Bot פותח חשבון Google Ads חדש על שמך, ומכוון את הקמפיינים לפי הפניות שהפכו אצלך לעבודה, לא רק לפי קליקים. וזה עולה ₪249 + מע״מ לחודש.
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
              <div className="eyebrow" style={{ justifyContent: "center" }}>לפני שאתה מוציא עוד שקל על מודעות</div>
              <h2 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.6rem,3.5vw,2.6rem)", lineHeight: 1.15, marginBottom: "16px" }}>
                שיחת ייעוץ של 30 דקות —{" "}
                <span className="text-gradient">נסתכל על מה שיש לך היום</span>
              </h2>
              <p style={{ color: "var(--muted)", fontFamily: "var(--font-body), sans-serif", marginBottom: "32px", maxWidth: "480px", margin: "0 auto 32px", lineHeight: 1.75 }}>
                בשיחה חינם נעבור יחד על הפרסום, האתר והפרופיל שלך בגוגל, ונגיד לך מאיפה כדאי להתחיל. אם תמשיך, Ads Bot בונה הכול מאפס.
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

=== FILE 2: docs/legal/ads-bot-terms-of-use.md ===
# תנאי שימוש — בוט הפרסום בגוגל של WAO

עודכן לאחרונה: 11.11.2026

### 1. כללי

ברוכים הבאים ל-Ads Bot, בוט הפרסום בגוגל, שירות מבית וואו שיווק באינטרנט, ע.מ 034442921, הפרח 80, ראשון לציון (״אנחנו״, ״נותן השירות״).

תנאים אלה, יחד עם מדיניות הפרטיות ומדיניות הביטול וההחזר, מהווים את ההסכם בכתב בינך (״הלקוח״) לבינינו. הרשמה לשירות מהווה הסכמה לתנאים.

השירות מיועד לעסקים — עוסקים מורשים, עוסקים פטורים וחברות — הרוכשים אותו לצורך עסקי. בהרשמה תתבקש למסור מספר עוסק/ח.פ.

### 2. מהות השירות

בוט הפרסום בגוגל הוא שירות חודשי לעסקים מקומיים: הקמה וניהול שוטף של קמפיינים ב-Google Ads, הקמת עמודי נחיתה במערכת שלנו, הגנה מפני הונאות קליקים באמצעות Fraud Blocker, מעקב אחר פעילות הקמפיינים ודוח שבועי. אנחנו פותחים חשבון Google Ads חדש על שמך ובונים מאפס את הקמפיינים, המודעות ועמודי הנחיתה. איננו מקבלים לניהולנו חשבון Google Ads קיים שלך, ואיננו מתקנים אותו.

כל לקוח מקבל חשבון Google Ads משלו, הרשום על שמו ובבעלותו. החשבון מקושר לחשבון המנהל שלנו (MCC) לצורך הפעלת השירות. אתה יכול לראות בכל עת חשיפות, קליקים ועלות כוללת בחשבון.

דמי השירות נפרדים מתקציב הפרסום. תקציב הפרסום משולם ישירות ל-Google. איננו מקבלים את תקציב הפרסום, איננו מחזיקים בו, ולא נחזיר אותו. את פרטי התשלום שלך ואת מסמכי האימות ש-Google מבקשת אתה מוסר ישירות ל-Google. פרטי כרטיס האשראי שלך ומסמכי הזהות אינם מגיעים אלינו, ואיננו מטפלים בהם.

תקציב הפרסום המינימלי הוא 1,500 ₪ לחודש. סכום זה משולם ל-Google, לא לנו. זהו מינימום נדרש להפעלת השירות, לא המלצה על היקף הפרסום. מדובר בכ-50 ₪ ליום בממוצע, וייתכן שהיקף זה לא יספיק בתחומים יקרים או תחרותיים.

החשבון, הקמפיינים, המודעות, מילות המפתח, היסטוריית ההמרות והנתונים נשארים שלך. אנחנו ניגשים לחשבון דרך חשבון המנהל שלנו, ומסירים את הגישה עם סיום השירות.

עמודי נחיתה שניצור עבורך יאוחסנו במערכת שלנו ויפורסמו בתת-דומיין ייעודי תחת wao.co.il. פניות שהלקוחות שלך משאירים דרכם — טפסים, שיחות או לחיצות וואטסאפ — נרשמות ברשימת לידים. אתה יכול לסמן כל ליד כרלוונטי או לא רלוונטי, וכן האם הפנייה נסגרה. אנחנו מעבירים את הסימון הזה ל-Google Ads, יחד עם מזהה הקליק של המודעה ומועד הפנייה, כדי שהקמפיינים יותאמו ללידים אמיתיים.

אתה מאשר את הפרטים והעובדות שמסרת לנו, לרבות שירותים, אזור פעילות, רישיון, אחריות ושנות פעילות, ואתה אחראי לנכונותם.

### 3. השירות מבוסס בינה מלאכותית

חלק מהתכנים בשירות, לרבות ניסוחי מודעות וטקסטים בעמודי נחיתה, עשויים להיות מופקים באמצעות מודלי בינה מלאכותית על בסיס הפרטים שאתה מוסר ומידע ציבורי. ייתכנו שגיאות. אם מצאת בהם אי-דיוק או שגיאה, עליך לדווח לנו על כך, ואנחנו נתקן.

### 4. אחריות הלקוח

אתה האחראי הבלעדי לנכונות הפרטים והעובדות שמסרת, לחוקיות השירותים, המוצרים והתוכן שאתה מציג, לעמידה במדיניות Google ובמדיניות הפרסום החלה עליך, לתשלום תקציב הפרסום ישירות ל-Google, ולשמירת פרטי הגישה לחשבונך.

### 5. הרשאות וחיבורים

בחיבור ובשימוש בשירות אתה מצהיר שאתה מורשה להפעיל את השירות עבור העסק שלך.

ההרשאות והחיבורים שבהם המערכת משתמשת:

| שירות | סוג גישה | מה זה מאפשר |
|---|---|---|
| Google Ads | גישת ניהול דרך חשבון מנהל (MCC) | הקמה וניהול של קמפיינים, מודעות, מילות מפתח, תקציבים, הצעות מחיר, מעקב המרות וכתובות יעד; הבעלות בחשבון נשארת שלך |
| Fraud Blocker | כלי הגנה כלול בשירות | בדיקת תנועה וקליקים, זיהוי דפוסים חשודים וסינונם ככל שהכלי מאפשר |
| Cloudflare Pages ו-Cloudflare DNS | אירוח וניהול רשומות | פרסום עמודי נחיתה בתת-דומיין תחת wao.co.il |
| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה | כתיבה וניתוח של טקסטים למודעות ולעמודי נחיתה |
| DataForSEO | קריאת נתוני חיפוש | מילות מפתח, היקפי חיפוש ותוצאות חיפוש |
| NeuronWriter | ניתוח תוכן | בדיקת תוכן מול ביטויי חיפוש |
| Google Places API | קריאת מידע עסקי ציבורי | שימוש במידע לצורך הקמת הקמפיין ובדיקות נלוות |
| ספקי סליקה ודוא״ל כלליים | חיוב ושליחת הודעות | עיבוד תשלום ושליחת הודעות שירות |

**הערות חשובות:**
- חשבון Google Ads נשאר שלך. אנחנו פועלים בו באמצעות חשבון מנהל, ומסירים את הגישה עם סיום השירות.
- תקציב הפרסום משולם ישירות ל-Google. איננו צד לקבלת התשלום הזה.
- עמודי הנחיתה מתפרסמים בתת-דומיין תחת wao.co.il.
- אין לנו הרשאות כתיבה בחשבונות פרסום אחרים, אלא אם נתת הרשאה מפורשת.

גישתנו לספקי הצד השלישי שלעיל כפופה לתנאיהם, והם רשאים לשנותה או להפסיקה. לא נישא באחריות להפסקה או שינוי כאמור, ובלבד שנפעל באופן סביר להודיע לך.

### 6. חשבון הפרסום, עמודי הנחיתה והנכסים

חשבון Google Ads, הקמפיינים, המודעות, מילות המפתח, היסטוריית ההמרות והנתונים נשארים שלך בכל מקרה. תוכל להמשיך לנהל אותם בעצמך או באמצעות ספק אחר לאחר סיום השירות.

עמודי הנחיתה שנוצרים עבורך הם חלק מהמנוי, ופועלים בתת-דומיין תחת wao.co.il כל עוד השירות פעיל. הם אינם בבעלותך, למעט עותק שתקבל לפי סעיף 8. אם יש לך אתר משלך, נוכל להפנות את כתובות היעד של המודעות אליו לפי בקשתך.

המשך שימוש בעמודי הנחיתה לאחר סיום השירות כפוף לאמור בסעיף 8.

### 7. תשלום, ביטול והחזר

מחיר השירות: 249 ₪ בתוספת מע״מ לחודש. החיוב מתבצע בתחילת כל חודש. אין תקופת ניסיון. ההתקשרות היא חודשית, ללא תקופת מינימום וללא תקופת הודעה מוקדמת. אפשר לבטל באופן מקוון בכל עת. הביטול נכנס לתוקף בתום החודש שכבר שולם, בכפוף לזכויותיך על פי דין ולאמור בסעיף זה.

תקציב הפרסום אינו חלק מדמי השירות. הוא משולם ישירות ל-Google. איננו מקבלים אותו, איננו שולטים בו, ולא נחזיר אותו. עסקים חדשים ב-Google Ads עשויים להיות זכאים לזיכוי פרסום מ-Google, בכפוף לתנאי Google. הזיכוי ניתן על ידי Google, והזכאות לו וסכומו נקבעים על ידה בלבד. איננו מתחייבים לזיכוי, והוא אינו חלק מדמי השירות ואינו הנחה מהם.

עיקרי מדיניות הביטול וההחזר: ביטול עצמאי בלחיצה בכל עת; החזר יחסי בביטול בתוך 14 ימים מההצטרפות; תקופת ביטול מוארכת של ארבעה חודשים לאדם עם מוגבלות, אזרח ותיק ועולה חדש.

**התחייבות להחזר דמי השירות:** אם לא תהיה מרוצה מהשירות, תוכל לבקש החזר של דמי השירות ששילמת לנו, 249 ₪ בתוספת מע״מ, בעד 30 הימים הראשונים. התקופה נספרת ממועד עליית המודעה הראשונה לאוויר. מועד עליית המודעה הראשונה לאוויר הוא מועד רישום החשיפה הראשונה של מודעה בחשבון ה-Google Ads שלך. אם Google משהה או משעה את החשבון לצורך בדיקת תשלום או אימות זהות, תקופת 30 הימים נעצרת למשך ההשהיה או ההשעיה. החזר זה ניתן בנוסף לזכות הביטול על פי דין, ולא במקומה. תנאי ההחזר: הקמפיינים פעלו בתקציב פרסום ל-Google בקצב של לפחות 1,500 ₪ לחודש. לא ניתן יותר מהחזר אחד לעסק. הבקשה נשלחת אלינו לא יאוחר מ-7 ימים לאחר תום 30 הימים. אם לא הצלחנו להעלות מודעה ראשונה לאוויר, נחזיר את דמי השירות ששילמת לנו ללא צורך בבקשה. ההחזר אינו מהווה התחייבות לתוצאות, ללידים, לפניות או למיקום מודעה.

**בדיקות Google:** המודעות עולות לאוויר רק לאחר ש-Google מאשרת את פרטי התשלום שלך, ואת פרטי הזהות שלך אם Google מבקשת זאת. משך הבדיקות הוא של Google ואינו בשליטתנו. אם בדיקות Google לא הושלמו בתוך 21 ימים ממועד תשלום דמי השירות, תוכל לבטל ולקבל החזר מלא של דמי השירות ששילמת לנו.

חשבונית מס תופק ותישלח אליך אוטומטית בגין כל חיוב.

### 8. ביטול והשעיה

ניתן לבטל את השירות באופן מקוון בכל עת. הביטול נכנס לתוקף בתום החודש שכבר שולם, בכפוף לזכויות המפורטות בסעיף 7.

ביום הביטול נשלח אליך הודעה שמפרטת מתי עמודי הנחיתה יפסיקו להיות זמינים. נשלח הודעה נוספת 7 ימים לפני שעמודי הנחיתה יפסיקו להיות זמינים. בהודעות נציע להשהות את הקמפיינים או להפנות את המודעות לאתר שלך, אם יש לך אתר.

לאחר כניסת הביטול לתוקף, עמודי הנחיתה נשארים זמינים 30 ימים נוספים, ולאחר מכן מפסיקים להיות זמינים. אם לא תשהה את הקמפיינים או תפנה אותם לכתובת אחרת, ייתכן שגולשים יגיעו לעמודים שאינם זמינים.

לפני הפסקת הזמינות תוכל לרכוש עותק של עמודי הנחיתה לשימושך בתשלום חד-פעמי של 900 ₪ בתוספת מע״מ. אם שילמת בפועל עבור 12 חודשי שירות לפני הביטול, תקבל את העותק ללא תשלום.

אם חיוב חודשי נכשל ולא הוסדר לאחר ניסיונות חיוב חוזרים במשך 7 ימים, השירות מושעה. פעולות הבוט והניהול נעצרות. אנחנו רשאים להשהות קמפיינים כדי למנוע פעילות ללא ניהול. עמודי הנחיתה נשארים זמינים 30 ימים נוספים, ולאחר מכן מפסיקים להיות זמינים.

תשלום עבור החודש שלא שולם מחזיר את השירות לפעולה, ומועד החיוב החודשי נשאר ללא שינוי. נחדש קמפיינים שהושהו לפי בקשתך ובכפוף למדיניות Google.

חשבון Google Ads, הקמפיינים והנתונים נשארים בבעלותך. עם סיום השירות, נסיר את גישת חשבון המנהל שלנו.

### 9. אין התחייבות לתוצאה

איננו מתחייבים ללידים, לפניות, לשיחות, להמרות, לקליקים, לחשיפות, למיקום מודעה או לכל מדד ביצוע. תוצאות מושפעות מגורמים שאינם בשליטתנו — היקף תקציב הפרסום, תחרות, שינויי אלגוריתם, מדיניות Google ותנאי שוק.

### 10. פרטיות ונתונים

**מידע הרשמה וחיוב** — כמפורט במדיניות הפרטיות.

**מידע ספציפי לבוט הפרסום:**
- פרטי העסק שאתה מוסר: שם העסק, שם בעל העסק, טלפון, כתובת דוא״ל, כתובת ואזור שירות, שירותים, מספר רישיון כאשר הדבר רלוונטי, שנות פעילות בתחום, תנאי אחריות ומה מייחד את העסק.
- מזהה חשבון Google Ads והגדרות החשבון, לרבות קמפיינים, מודעות, מילות מפתח, תקציבים, הצעות מחיר וכתובות יעד.
- נתוני ביצועים מהחשבון, לרבות חשיפות, קליקים, עלויות, המרות ומדדים נלווים.
- תוכן וטקסטים שאתה מזין או שהמערכת מפיקה עבור מודעות ועמודי נחיתה.
- מידע ציבורי על העסק שלך מ-Google ומתוצאות חיפוש.
- פניות שלקוחות שלך משאירים דרך טופס בעמוד נחיתה, שיחות או לחיצות וואטסאפ. אנחנו מעבדים פניות אלה מטעמך לשם העברתן אליך. כדי שהקמפיינים יותאמו ללידים אמיתיים, אנחנו שולחים ל-Google Ads מזהה קליק, מועד פנייה ומצב ליד — רלוונטי או לא רלוונטי, והאם הפנייה נסגרה.
- הגדרות עמודי הנחיתה, מבנה העמודים, נתוני פריסה ומזהה תת-הדומיין.
- נתוני תנועה וקליקים הנדרשים להפעלת Fraud Blocker, לרבות כתובת IP ומזהים טכניים, לצורך זיהוי תנועה חשודה.

**אין איסוף או עיבוד של:**
- נתוני חשבונות פרסום אחרים, אלא אם חיברת אותם בהרשאה מפורשת.
- תוכן מחשבונות צד שלישי אחרים, למעט המפורט לעיל.
- נתונים אישיים של לקוחותיך מעבר לפרטים הנדרשים להעברת פנייה אליך, להתאמת הקמפיינים ללידים אמיתיים ולזיהוי תנועה חשודה, כמפורט לעיל.

**ספקי משנה רלוונטיים:**

| ספק | תפקיד | בסיס |
|---|---|---|
| Google Ads | פלטפורמת הפרסום וניהול הקמפיינים | תנאי השירות של Google |
| Fraud Blocker | הגנה מפני הונאות קליקים | תנאי השירות של הספק |
| Cloudflare Pages | אירוח ופריסת עמודי נחיתה | תנאי השירות של הספק |
| Cloudflare DNS | ניהול רשומות DNS | תנאי השירות של הספק |
| Google Business Profile | מידע עסקי ציבורי, לפי העניין | תנאי השירות של הספק |
| Alibaba Cloud (מודלי Qwen, אזור סינגפור) | עיבוד שפה לכתיבה וניתוח | תנאי השירות של הספק |
| DataForSEO | נתוני חיפוש | תנאי השירות של הספק |
| NeuronWriter | ניתוח תוכן | תנאי השירות של הספק |
| Google Places API | מידע עסקי ציבורי | תנאי השירות של הספק |
| ספקי סליקה ודוא״ל כלליים | עיבוד תשלום ושליחת הודעות | תנאי השירות של הספק |

עיבוד באמצעות Cloudflare מתבצע בהתאם ל-Data Processing Addendum של Cloudflare ולתנאי השירות שלה. עיבוד באמצעות Google Ads כפוף לתנאי השירות ולמדיניות הפרטיות של Google.

### 11. העברת מידע אל מחוץ לישראל

חלק מהספקים המפורטים לעיל מעבדים מידע מחוץ לישראל, לרבות בסינגפור ובארצות הברית. מועבר רק המידע הדרוש לביצוע הפעולה. לצורך התאמת הקמפיינים ללידים אמיתיים נשלחים ל-Google Ads מזהה קליק, מועד פנייה ומצב ליד, כמפורט בסעיף 10. בהצטרפותך לשירות אתה מסכים להעברה זו. הספקים מעבדים את המידע לפי תנאיהם המסחריים.

### 12. התחייבויות עיבוד

בעיבוד המידע במסגרת השירות, אנחנו מתחייבים להתחייבויות הבאות:
- עיבוד לפי הוראה בלבד.
- בידוד מלא בין לקוחות.
- איסור אימון: אנחנו לא נשתמש בנתוני לקוחות לאימון מודלים; העיבוד אצל ספקי המודלים מתבצע במסלולים מסחריים בתשלום, והוא כפוף לתנאיהם.
- סודיות.
- אבטחה סבירה.

**ספקי משנה מאושרים לבוט הפרסום:** Google Ads, Fraud Blocker, Cloudflare Pages, Cloudflare DNS, Google Business Profile, Alibaba Cloud (מודלי Qwen, אזור סינגפור), DataForSEO, NeuronWriter, Google Places API, וספקי סליקה ודוא״ל כלליים.

### 13. הגבלת אחריות

אחריותנו הכוללת, בכל עילה שהיא, לא תעלה על הגבוה מבין: סך התשלומים ששילמת לנו בפועל בשנים-עשר החודשים שקדמו לאירוע, או 3,000 ₪.

מובהר כי לצורך חישוב התקרה, סכומים ששילמת ישירות ל-Google במסגרת תקציב הפרסום אינם נחשבים לתשלומים ששילמת לנו.

תקרה זו חלה על כל אחריותנו בקשר לשירות.

לא נישא באחריות לנזק עקיף, תוצאתי או מיוחד, לרבות אובדן רווח, אובדן הזדמנות עסקית, אובדן תנועה, אובדן פניות או פגיעה במוניטין.

אין באמור כדי לפטור מאחריות בשל מעשה מכוון או רשלנות חמורה, או כדי לגרוע מזכות שאינה ניתנת להתניה על פי דין.

### 14. שיפוי

תשפה אותנו בגין תביעת צד שלישי הנובעת מהפרת תנאים אלה על ידך, מתוכן שפרסמת, מהשירותים או המוצרים שאתה מציע, מהפרת מדיניות Google, או מחיבור חשבון ללא הרשאה.

### 15. קניין רוחני

המערכת, הבוט, המתודולוגיה וכל רכיביהם הם קנייננו ו/או ברשותנו כדין, לרבות כסוד מסחרי. ניתן לך רישיון שימוש אישי, לא בלעדי ולא עביר, לתקופת המנוי בלבד. אינך רשאי להעתיק, להנדס לאחור, או להעמיד את השירות לרשות צד שלישי.

החשבון, הקמפיינים, המודעות, מילות המפתח והנתונים ב-Google Ads הם שלך. הפלטים שהופקו עבורך — דוחות, לרבות הדוח השבועי, ניתוחים והמלצות — ניתנים לשימושך העסקי החופשי. תכנים שהופקו עבורך לקמפיינים ניתנים לשימושך העסקי החופשי לאחר תשלום מלא. עותק עמודי הנחיתה שיועבר לך לאחר רכישה או לאחר 12 חודשי תשלום ניתן לשימושך העסקי, בכפוף לאמור בסעיף 8. הקוד, התבניות והתשתית של עמודי הנחיתה נשארים שלנו.

### 16. זמינות ותמיכה

השירות ניתן כמות שהוא (AS IS). איננו מתחייבים לזמינות רציפה; ייתכנו הפסקות תחזוקה, תקלות ותלות בספקי צד שלישי, לרבות Google ו-Fraud Blocker.

תמיכה: בצ׳אט עם איתן, מייסד WAO, ובדוא״ל בכתובת eitan@wao.co.il. זמן מענה משוער: עד 24 שעות בימי עסקים.

### 17. שינויים

נהיה רשאים לעדכן תנאים אלה ואת השירות. על שינוי מהותי לרעתך — לרבות שינוי מחיר — תימסר הודעה מראש של 30 ימים לפחות, ותעמוד לך זכות לבטל לפני כניסתו לתוקף.

### 18. סיום

כל צד רשאי לסיים את ההתקשרות. עם הסיום: השירות ייפסק בהתאם לסעיף 8. גישת חשבון המנהל שלנו לחשבון Google Ads תוסר. עמודי הנחיתה יטופלו בהתאם לסעיף 8. נתוניך יימחקו או יימסרו לך, לפי בחירתך, בתוך 30 ימים, למעט מה שנדרש לשמור על פי דין. נתונים המוחזקים ישירות אצל Google ימשיכו להיות מוחזקים לפי תנאי Google.

### 19. דין וסמכות שיפוט

על תנאים אלה יחולו דיני מדינת ישראל. סמכות השיפוט נתונה לבתי המשפט המוסמכים בראשון לציון.

### 20. יצירת קשר

וואו שיווק באינטרנט · ע.מ 034442921 · הפרח 80, ראשון לציון · eitan@wao.co.il
