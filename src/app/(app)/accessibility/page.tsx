import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description: "הצהרת הנגישות של אתר WAO — רמת הנגישות, מגבלות ידועות ודרכי יצירת קשר לפניות נגישות.",
  robots: { index: false, follow: true },
};

const SECTION: React.CSSProperties = {
  marginBottom: "40px",
};

const H2: React.CSSProperties = {
  fontFamily: "var(--font-rubik), sans-serif",
  fontWeight: 800,
  fontSize: "1.2rem",
  marginBottom: "12px",
  color: "var(--text)",
};

const P: React.CSSProperties = {
  color: "var(--muted)",
  fontFamily: "var(--font-body), sans-serif",
  lineHeight: 1.85,
  fontSize: "0.97rem",
  marginBottom: "10px",
};

const LI: React.CSSProperties = {
  ...P,
  marginBottom: "6px",
};

export default function AccessibilityPage() {
  return (
    <section style={{ paddingTop: "clamp(100px,14vw,140px)", paddingBottom: "clamp(64px,8vw,96px)" }}>
      <div className="wao-container" style={{ maxWidth: "760px" }}>

        <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "36px" }}>
          <Link href="/">דף הבית</Link>
          <span className="breadcrumb-sep" aria-hidden>›</span>
          <span aria-current="page">הצהרת נגישות</span>
        </nav>

        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.9rem,4vw,2.8rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
          הצהרת נגישות
        </h1>
        <p style={{ ...P, color: "var(--muted)", fontSize: "0.85rem", marginBottom: "48px" }}>
          עודכן לאחרונה: יוני 2026
        </p>

        {/* 1 */}
        <div style={SECTION}>
          <h2 style={H2}>מחויבות WAO לנגישות</h2>
          <p style={P}>
            WAO שיווק דיגיטלי מחויבת להנגיש את שירותיה לאנשים עם מוגבלויות, בהתאם ל-חוק שוויון זכויות לאנשים
            עם מוגבלות, התשנ"ח-1998, ולתקנות שוויון זכויות לאנשים עם מוגבלות (נגישות לשירות), התשע"ג-2013.
          </p>
          <p style={P}>
            אנו שואפים לעמוד ברמת ה-WCAG 2.0 AA (תקן ישראלי SI 5568) ככל שניתן, ופועלים לשיפור מתמיד של
            הנגישות באתר.
          </p>
        </div>

        {/* 2 */}
        <div style={SECTION}>
          <h2 style={H2}>מצב הנגישות הנוכחי — ציות חלקי</h2>
          <p style={P}>
            כעסק זעיר (פחות מ-25 עובדים), WAO פועל לנגישות מלאה ככל האפשר. להלן מה שכבר מיושם:
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            {[
              "ניווט מלא במקלדת בכל האתר",
              "תמיכה בקורא מסך (NVDA, VoiceOver) עם תיוג ARIA מתאים",
              "כיוון טקסט ימין-לשמאל (RTL) בהתאם ל-עברית",
              "ניגודיות צבעים העומדת בתקן WCAG AA (4.5:1 לפחות לטקסט רגיל)",
              "פונטים גדולים וקריאים — Rubik ו-Assistant עם display:swap",
              "טקסט חלופי (alt) לתמונות",
              "כותרות (h1–h6) בהיררכיה עקבית בכל הדפים",
              "שדות טפסים עם תיוג (label) מפורש",
              "קישורי דילוג (skip links) לתוכן הראשי",
              "הגדרת שפה: lang=\"he\" dir=\"rtl\" על תגית html",
            ].map((item) => (
              <li key={item} style={LI}>{item}</li>
            ))}
          </ul>
        </div>

        {/* 3 */}
        <div style={SECTION}>
          <h2 style={H2}>מגבלות ידועות</h2>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            {[
              "תוכן וידאו — לחלק מסרטוני ה-YouTube המשובצים אין כתוביות בעברית. הסרטונים מסופקים על-ידי צד שלישי.",
              "תוכן ישן מיובא — חלק מהשיעורים המיובאים ממערכת ישנה עשויים להכיל HTML שלא עמד בדיקת נגישות מלאה.",
              "מסמכי PDF — במידה ויצורפו בעתיד, ייתכן שלא יהיו נגישים במלואם.",
            ].map((item) => (
              <li key={item} style={LI}>{item}</li>
            ))}
          </ul>
          <p style={P}>
            אנו עובדים על שיפור הנקודות הללו ומקבלים פניות ציבור בנושא.
          </p>
        </div>

        {/* 4 */}
        <div style={SECTION}>
          <h2 style={H2}>פנייה בנושא נגישות</h2>
          <p style={P}>
            נתקלתם בבעיית נגישות? נשמח לשמוע ולטפל. רכז/ת הנגישות שלנו:
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            <li style={LI}>שם: איתן יריב</li>
            <li style={LI}>
              טלפון:{" "}
              <a href="tel:0526148860" style={{ color: "var(--accent)", direction: "ltr", display: "inline-block" }}>
                052-614-8860
              </a>
            </li>
            <li style={LI}>
              אימייל:{" "}
              <a href="mailto:eitan@wao.co.il" style={{ color: "var(--accent)", direction: "ltr", display: "inline-block" }}>
                eitan@wao.co.il
              </a>
            </li>
            <li style={LI}>זמן מענה מקסימלי: 5 ימי עסקים</li>
          </ul>
        </div>

        {/* 5 */}
        <div style={SECTION}>
          <h2 style={H2}>מעבר לנציב שוויון זכויות</h2>
          <p style={P}>
            אם הפנייה לא טופלה לשביעות רצונכם, ניתן לפנות לנציב שוויון זכויות לאנשים עם מוגבלות
            במשרד המשפטים בכתובת:{" "}
            <a
              href="https://www.gov.il/he/departments/bureaus/molj-commissioner-equal-rights-disabilities"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              www.gov.il
            </a>
          </p>
        </div>

        <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
          <p style={{ ...P, fontSize: "0.82rem" }}>
            הצהרה זו הוכנה בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (נגישות לשירות), התשע"ג-2013.
            המצב תואם את מצב האתר כפי שנבדק ביוני 2026.
          </p>
        </div>

      </div>
    </section>
  );
}
