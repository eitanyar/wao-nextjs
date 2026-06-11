import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "מדיניות פרטיות",
  description: "מדיניות הפרטיות של WAO — איזה מידע נאסף, לשם מה, כיצד הוא מאוחסן וכיצד ניתן לממש זכויות בנוגע אליו.",
  robots: { index: false, follow: true },
};

const SECTION: React.CSSProperties = { marginBottom: "44px" };
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
const LI: React.CSSProperties = { ...P, marginBottom: "6px" };

export default function PrivacyPage() {
  return (
    <section style={{ paddingTop: "clamp(100px,14vw,140px)", paddingBottom: "clamp(64px,8vw,96px)" }}>
      <div className="wao-container" style={{ maxWidth: "760px" }}>

        <nav aria-label="breadcrumb" className="breadcrumb" style={{ marginBottom: "36px" }}>
          <Link href="/">דף הבית</Link>
          <span className="breadcrumb-sep" aria-hidden>›</span>
          <span aria-current="page">מדיניות פרטיות</span>
        </nav>

        <h1 style={{ fontFamily: "var(--font-rubik), sans-serif", fontWeight: 900, fontSize: "clamp(1.9rem,4vw,2.8rem)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
          מדיניות פרטיות
        </h1>
        <p style={{ ...P, fontSize: "0.85rem", marginBottom: "48px" }}>
          תאריך עדכון אחרון: יוני 2026
        </p>

        {/* 1 */}
        <div style={SECTION}>
          <h2 style={H2}>מי אנחנו</h2>
          <p style={P}>
            WAO שיווק דיגיטלי בע"מ (להלן: "WAO" / "אנחנו") היא סוכנות שיווק דיגיטלי הפועלת
            מראשון לציון, ישראל. לשאלות בנושא פרטיות ניתן לפנות לאיתן יריב, מייסד WAO:
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 10px" }}>
            <li style={LI}>
              אימייל:{" "}
              <a href="mailto:eitan@wao.co.il" style={{ color: "var(--accent)", direction: "ltr", display: "inline-block" }}>
                eitan@wao.co.il
              </a>
            </li>
            <li style={LI}>
              טלפון:{" "}
              <a href="tel:0526148860" style={{ color: "var(--accent)", direction: "ltr", display: "inline-block" }}>
                052-614-8860
              </a>
            </li>
          </ul>
        </div>

        {/* 2 */}
        <div style={SECTION}>
          <h2 style={H2}>איזה מידע נאסף ולשם מה</h2>
          <p style={P}>
            <strong style={{ color: "var(--text)" }}>מידע שמוסרים ישירות:</strong>
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>טופס יצירת קשר</strong> — שם, טלפון, אימייל (אופציונלי), תחום עניין, הודעה.
              המידע נאסף לשם מתן מענה לפנייה ויצירת קשר עסקי בלבד.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>שיחות טלפון ומיילים</strong> — תוכן שיחות ומיילים שמתנהלים ישירות עם WAO.
            </li>
          </ul>
          <p style={P}>
            <strong style={{ color: "var(--text)" }}>מידע שנאסף אוטומטית (עוגיות ואנליטיקה):</strong>
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>Google Analytics 4</strong> — נתוני גלישה אנונימיים: עמודים שנצפו, זמן שהייה,
              מדינת מקור, סוג מכשיר. לא נאסף מידע מזהה אישי דרך GA4. ניתן לבטל מעקב
              דרך
              <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                Google Analytics Opt-out
              </a>
              .
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>עוגיות הכרחיות</strong> — שמירת העדפות (כגון הסכמה לעוגיות). אינן כוללות מידע אישי.
            </li>
          </ul>
        </div>

        {/* 3 */}
        <div style={SECTION}>
          <h2 style={H2}>בסיס החוקי לעיבוד המידע</h2>
          <ul style={{ paddingRight: "20px", margin: "0 0 10px" }}>
            <li style={LI}>עיבוד מידע מטפסי יצירת קשר — הסכמה מפורשת שנמסרת בעת שליחת הטופס (תיבת הסימון).</li>
            <li style={LI}>אנליטיקה — הסכמה (בנר העוגיות בעת הכניסה לאתר).</li>
            <li style={LI}>עיבוד מידע לצורך מתן השירות — אינטרס לגיטימי עסקי.</li>
          </ul>
          <p style={P}>
            בהתאם לחוק הגנת הפרטיות, התשמ"א-1981 ותיקוניו, לרבות תיקון 13 שנכנס לתוקף בשנת 2024.
          </p>
        </div>

        {/* 4 */}
        <div style={SECTION}>
          <h2 style={H2}>העברת מידע לצד שלישי</h2>
          <p style={P}>
            WAO אינה מוכרת, משכירה או סוחרת במידע אישי. המידע עשוי להיות מועבר אך ורק למקרים הבאים:
          </p>
          <ul style={{ paddingRight: "20px", margin: "0 0 10px" }}>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>ספקי שירות טכנולוגי</strong> — כגון שרתי אחסון (Hetzner, גרמניה/EU) וספקי
              אימייל. ספקים אלו מחויבים בסודיות.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>Google LLC</strong> — לצורך Google Analytics, בהתאם למדיניות הפרטיות של Google.
            </li>
            <li style={LI}>
              <strong style={{ color: "var(--text)" }}>חובה חוקית</strong> — בהתאם לצו שיפוטי או דרישה מרשויות מוסמכות.
            </li>
          </ul>
        </div>

        {/* 5 */}
        <div style={SECTION}>
          <h2 style={H2}>תקופת שמירת המידע</h2>
          <ul style={{ paddingRight: "20px", margin: "0 0 10px" }}>
            <li style={LI}>פניות שלא הפכו ללקוחות — נמחקות לאחר 24 חודשים.</li>
            <li style={LI}>מידע על לקוחות פעילים — נשמר לאורך תקופת ההתקשרות ועד 7 שנים לאחריה (דרישת חוק החשבונות).</li>
            <li style={LI}>נתוני אנליטיקה — מאוחסנים ב-Google לפי הגדרות החשבון (13 חודשים כברירת מחדל).</li>
          </ul>
        </div>

        {/* 6 */}
        <div style={SECTION}>
          <h2 style={H2}>זכויות הנושא (זכויותיכם)</h2>
          <p style={P}>בהתאם לחוק, יש לכם זכות ל:</p>
          <ul style={{ paddingRight: "20px", margin: "0 0 16px" }}>
            {[
              "עיון במידע שנאסף עליכם",
              "תיקון מידע שגוי",
              "מחיקת המידע (\"הזכות להישכח\") — למעט מקרים שבהם קיימת חובה חוקית לשמר",
              "התנגדות לעיבוד המידע לצורכי שיווק",
              "קבלת המידע בפורמט ניתן להעברה (ניידות נתונים)",
            ].map((item) => <li key={item} style={LI}>{item}</li>)}
          </ul>
          <p style={P}>
            לממוש זכויות אלו פנו אלינו ל
            <a href="mailto:eitan@wao.co.il" style={{ color: "var(--accent)" }}>eitan@wao.co.il</a>.
            נשיב תוך 30 ימים.
          </p>
        </div>

        {/* 7 */}
        <div style={SECTION}>
          <h2 style={H2}>אבטחת מידע</h2>
          <p style={P}>
            האתר פועל תחת HTTPS. המידע מאוחסן בשרת בגרמניה (EU) עם הצפנה ברמת דיסק.
            גישה למידע מוגבלת לבעלי הרשאה בלבד. עם זאת, אין אבטחה מוחלטת — במקרה של אירוע
            אבטחה שיפגע בפרטיות, נודיע לנפגעים בהתאם לחוק.
          </p>
        </div>

        {/* 8 */}
        <div style={SECTION}>
          <h2 style={H2}>שינויים במדיניות</h2>
          <p style={P}>
            WAO רשאית לעדכן מדיניות זו מעת לעת. שינויים מהותיים יפורסמו באתר. המשך השימוש
            באתר לאחר פרסום שינויים מהווה הסכמה למדיניות המעודכנת.
          </p>
        </div>

        {/* 9 */}
        <div style={SECTION}>
          <h2 style={H2}>רשות הגנת הפרטיות</h2>
          <p style={P}>
            יש לכם זכות להגיש תלונה לרשות להגנת הפרטיות בישראל:
            <a
              href="https://www.gov.il/he/departments/the-privacy-protection-authority"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--accent)" }}
            >
              www.gov.il — הרשות להגנת הפרטיות
            </a>
          </p>
        </div>

        <div style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid var(--border)" }}>
          <p style={{ ...P, fontSize: "0.82rem" }}>
            מדיניות זו חלה על אתר
            <span dir="ltr" style={{ display: "inline-block" }}>www.wao.co.il</span>{" "}
            בלבד. עודכן לאחרונה: יוני 2026.
          </p>
        </div>

      </div>
    </section>
  );
}
