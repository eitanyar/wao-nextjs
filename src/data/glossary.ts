export type GlossaryCategory = "seo" | "ppc" | "analytics" | "tech" | "marketing";

export interface GlossaryEntry {
  short: string;
  body: string;
  category: GlossaryCategory;
  knowledgeSlug?: string;
}

export const CATEGORY_LABELS: Record<GlossaryCategory, string> = {
  seo: "SEO וקידום אתרים",
  ppc: "פרסום ממומן ו-Google Ads",
  analytics: "אנליטיקס ומדידה",
  tech: "טכנולוגיה ופיתוח",
  marketing: "שיווק דיגיטלי כללי",
};

export const CATEGORY_COLORS: Record<GlossaryCategory, string> = {
  seo: "#4ae3b5",
  ppc: "#a78bfa",
  analytics: "#f59e0b",
  tech: "#10b981",
  marketing: "#f97316",
};

export const GLOSSARY: Record<string, GlossaryEntry> = {

  // ── SEO ───────────────────────────────────────────────────────────────────
  "AI Overviews": {
    knowledgeSlug: "ai-overviews",
    category: "seo",
    short: "תשובות AI ישירות של גוגל",
    body: "בלוק שגוגל מציג בראש תוצאות החיפוש עם תשובה AI לפני התוצאות האורגניות. מוצג ב-2026 בכ-63% מהחיפושים. אתרים שמצוטטים בו מקבלים חשיפת מותג גם ללא קליק ישיר.",
  },
  "E-E-A-T": {
    knowledgeSlug: "eeat",
    category: "seo",
    short: "ניסיון · מומחיות · סמכות · אמינות",
    body: "Experience, Expertise, Authoritativeness, Trustworthiness — ארבעת הפרמטרים שגוגל משתמשת בהם להעריך איכות תוכן. חשוב במיוחד בנושאי בריאות, פיננסים ומשפט (YMYL). ה-E הכפול על ניסיון נוסף ב-2022.",
  },
  "Topical Authority": {
    knowledgeSlug: "topical-authority",
    category: "seo",
    short: "סמכות נושאית — בעיני גוגל",
    body: "רמת האמון שגוגל מייחסת לאתר בתחום ספציפי. אתר שמכסה נושא לעומק ומכל הזוויות מדורג גבוה יותר מאתר עם מאמר בודד — גם אם המאמר מצוין. נבנית על פני חודשים ושנים.",
  },
  "Core Web Vitals": {
    knowledgeSlug: "core-web-vitals",
    category: "seo",
    short: "מדדי חוויית משתמש רשמיים של גוגל",
    body: "שלושה מדדי ביצועים שגוגל כולל כגורמי דירוג רשמיים: LCP (מהירות טעינה), CLS (יציבות ויזואלית) ו-INP (תגובתיות). נמדדים מנתוני גלישה אמיתיים של משתמשי Chrome.",
  },
  "LCP": {
    knowledgeSlug: "lcp",
    category: "seo",
    short: "Largest Contentful Paint — מהירות טעינת הרכיב הגדול",
    body: "הזמן שלוקח לרכיב הגדול ביותר בדף (תמונה או בלוק טקסט) להיטען לחלוטין. ציון טוב: פחות מ-2.5 שניות. מעל 4 שניות = ציון אדום וירידה בדירוג.",
  },
  "CLS": {
    knowledgeSlug: "cls",
    category: "seo",
    short: "Cumulative Layout Shift — יציבות ויזואלית",
    body: "מודד כמה הדף 'קופץ' ומשנה פריסה בזמן הטעינה. ציון טוב: מתחת ל-0.1. בעיה נפוצה: תמונות ללא מידות, פרסומות שמזיזות תוכן. אחד משלושת Core Web Vitals.",
  },
  "INP": {
    knowledgeSlug: "inp",
    category: "seo",
    short: "Interaction to Next Paint — תגובתיות הדף",
    body: "מודד את הזמן שבין קלט משתמש (קליק, הקשה) לבין עדכון הדף. החליף את FID כ-Core Web Vital ב-2024. ציון טוב: פחות מ-200 אלפיות השנייה.",
  },
  "FID": {
    category: "seo",
    short: "First Input Delay — הוחלף על ידי INP",
    body: "מדד ישן שמדד את הזמן עד לתגובה ראשונה לקלט משתמש. הוחלף ב-2024 על ידי INP שמספק תמונה מלאה ומדויקת יותר של תגובתיות הדף לאורך זמן.",
  },
  "SERP": {
    knowledgeSlug: "serp-analysis",
    category: "seo",
    short: "Search Engine Results Page — דף תוצאות החיפוש",
    body: "הדף שגוגל מציג בתגובה לשאילתת חיפוש. כולל תוצאות אורגניות, ממומנות, Local Pack, AI Overviews, Featured Snippets ועוד. המיקום ב-SERP קובע כמה תנועה מקבל האתר.",
  },
  "Crawling": {
    knowledgeSlug: "crawling-indexing",
    category: "seo",
    short: "סריקה — Googlebot מבקר באתר",
    body: "התהליך שבו Googlebot (הבוט של גוגל) מבקר בדפי האתר, קורא את תוכנם ומגלה קישורים לדפים חדשים. בלי סריקה אין אינדוקס, בלי אינדוקס אין דירוג. robots.txt שולט מה ייסרק.",
  },
  "Indexing": {
    knowledgeSlug: "crawling-indexing",
    category: "seo",
    short: "אינדוקס — גוגל מוסיף את הדף למאגר שלו",
    body: "לאחר הסריקה, גוגל 'מצלמת' את הדף ומוסיף אותו לאינדקס — מאגר הדפים שממנו מוגשות תוצאות חיפוש. דף שאינו מאונדקס לא יופיע בגוגל לעולם. Search Console מראה מה מאונדקס.",
  },
  "Noindex": {
    knowledgeSlug: "indexing-bloat",
    category: "seo",
    short: "Noindex — הנחיה לגוגל לא לאנדקס דף",
    body: "תגית Meta או כותרת HTTP שאומרת לגוגל לסרוק דף אך לא להוסיף אותו לאינדקס. משמש לדפי תוצאות חיפוש פנימיות, תנאי שימוש, דפי תודה ותוכן רגיש שלא רוצים שיופיע בגוגל.",
  },
  "Robots.txt": {
    knowledgeSlug: "robots-txt",
    category: "seo",
    short: "קובץ הנחיות לבוטים של גוגל",
    body: "קובץ טקסט בשורש האתר שמגדיר אילו דפים ותיקיות Googlebot מורשה לסרוק. טעות בקובץ זה עלולה למנוע מגוגל לסרוק חלקים שלמים מהאתר. לא מחליף Noindex.",
  },
  "Sitemap.xml": {
    knowledgeSlug: "sitemap-xml",
    category: "seo",
    short: "מפת האתר — רשימת כל הדפים לגוגל",
    body: "קובץ XML שמפרט את כל הדפים באתר, תאריכי עדכון ועדיפויות. מאפשר לגוגל לגלות ולסרוק דפים חדשים מהר יותר. מוגש ל-Search Console ומצוין ב-robots.txt.",
  },
  "Meta Description": {
    knowledgeSlug: "meta-description",
    category: "seo",
    short: "תיאור הדף שמופיע מתחת לכותרת בגוגל",
    body: "תגית HTML קצרה (150–160 תווים) שמתארת את תוכן הדף בתוצאות החיפוש. לא גורם דירוג ישיר, אבל משפיעה על CTR — לחיצות על התוצאה. כתיבה שיווקית + מילת מפתח = יותר קליקים.",
  },
  "Title Tag": {
    knowledgeSlug: "title-tag",
    category: "seo",
    short: "כותרת הדף — הטקסט הכחול בתוצאות גוגל",
    body: "תגית ה-<title> שמופיעה כשורה הכחולה הלחיצה בתוצאות גוגל. גורם דירוג חשוב. מומלץ: 50–60 תווים, מילת מפתח ראשית בתחילת הכותרת, שם המותג בסוף.",
  },
  "Redirect 301": {
    knowledgeSlug: "redirect-301",
    category: "seo",
    short: "הפניה קבועה — מעביר כח דירוג לדף חדש",
    body: "קוד HTTP שמעביר ביקורים מ-URL אחד לאחר באופן קבוע. 'קבוע' פירושו שגוגל מעביר ~99% מה-PageRank לדף החדש. משמש בשינוי מבנה אתר, מעבר דומיין ואיחוד תוכן.",
  },
  "Canonical": {
    knowledgeSlug: "canonical-tag",
    category: "seo",
    short: "Canonical Tag — כתובת ה-URL הרשמית",
    body: "תגית HTML שאומרת לגוגל איזו גרסה של דף היא ה'רשמית'. מונעת בעיות Duplicate Content כשאותו תוכן נגיש ממספר URLs שונים — /page, /page/, /page?sort=price.",
  },
  "Backlinks": {
    knowledgeSlug: "backlinks",
    category: "seo",
    short: "קישורים נכנסים מאתרים אחרים",
    body: "קישורים שאתרים חיצוניים מצביעים על האתר שלך. אחד מגורמי הדירוג החזקים ביותר של גוגל. 10 קישורים מאתרים אמינים ורלוונטיים שווים יותר מ-1,000 קישורים מאתרי ספאם.",
  },
  "Domain Authority": {
    knowledgeSlug: "domain-authority",
    category: "seo",
    short: "ציון סמכות הדומיין (Moz) — לא של גוגל",
    body: "מדד של חברת Moz (לא גוגל) שמנבא כמה קל יהיה לאתר לדרג. נע בין 0 ל-100. גבוה יותר = קל יותר לדרג. אינדיקטור שימושי להשוואה עם מתחרים, לא מדד גוגל רשמי.",
  },
  "Anchor Text": {
    knowledgeSlug: "anchor-text",
    category: "seo",
    short: "טקסט עוגן — הטקסט הגלוי של קישור",
    body: "הטקסט הניתן ללחיצה של קישור. גוגל משתמש בו להבין על מה מדבר הדף המקושר. 'מדריך קידום אתרים' טוב בהרבה מ'לחץ כאן'. Anchor Text חוזר מדי על אותה מילת מפתח — עלול להיחשב ספאם.",
  },
  "Internal Linking": {
    knowledgeSlug: "internal-linking",
    category: "seo",
    short: "קישורים פנימיים בין דפי האתר",
    body: "קישורים המקשרים בין דפים שונים בתוך אותו אתר. מחלקים PageRank, עוזרים לגוגל להבין מבנה האתר ומגדילים זמן שהייה. Pillar Page עם קישורים לכל Cluster Pages = SEO חזק.",
  },
  "PageRank": {
    category: "seo",
    short: "ציון סמכות הקישורים — האלגוריתם המקורי",
    body: "האלגוריתם המקורי של גוגל שמדרג דפים לפי מספר ואיכות הקישורים המצביעים אליהם. עדיין גורם מרכזי בדירוג. Internal Links מחלקים PageRank בין דפי האתר הפנימיים.",
  },
  "Penguin": {
    knowledgeSlug: "penguin-update",
    category: "seo",
    short: "Penguin — אלגוריתם נגד ספאם קישורים",
    body: "אלגוריתם גוגל המזהה ומעניש קישורים קנויים, Link Farms ו-PBNs. פועל בזמן-אמת מאז 2016. יכול למחוק שנות עבודה של SEO. קישורים אורגניים מאתרים רלוונטיים — היחיד שעובד.",
  },
  "PBNs": {
    knowledgeSlug: "penguin-update",
    category: "seo",
    short: "Private Blog Networks — רשתות בלוגים מניפולטיביות",
    body: "רשת של אתרים שנוצרה במיוחד לבניית קישורים מניפולטיביים. הפרת תנאי גוגל. מזוהה על ידי Penguin ועלולה לגרום לפנאלטי שמוחק את האתר מתוצאות החיפוש.",
  },
  "Content Cluster": {
    knowledgeSlug: "pillar-cluster-model",
    category: "seo",
    short: "אשכול תוכן — Content Cluster",
    body: "קבוצת דפים המכסים נושא לעומק: Pillar Page מרכזי + דפי Cluster שמכסים כל תת-נושא. כל הדפים מקושרים זה לזה עם Internal Links. הבסיס לבניית Topical Authority.",
  },
  "Pillar Page": {
    knowledgeSlug: "pillar-cluster-model",
    category: "seo",
    short: "דף עמוד — הדף המרכזי בנושא",
    body: "הדף הראשי המכסה נושא רחב ברמה גבוהה. מקושר לדפי Cluster המכסים תת-נושאים לעומק. המבנה הזה מאותת לגוגל על Topical Authority ומוביל לדירוגים גבוהים יותר לכל הדפים בקבוצה.",
  },
  "Featured Snippet": {
    knowledgeSlug: "featured-snippets",
    category: "seo",
    short: "קופסת התשובה — מיקום 0 בגוגל",
    body: "בלוק שגוגל מציג מעל התוצאות הרגילות עם תשובה ישירה לשאלה, לרוב מתוך אחד האתרים המדורגים בעמוד 1. מגדיל CTR משמעותית אך לא מובטח — תלוי בפורמט התוכן.",
  },
  "Local Pack": {
    knowledgeSlug: "local-pack",
    category: "seo",
    short: "תוצאות המפה — 3 עסקים מקומיים",
    body: "3 תוצאות עסקים על המפה המופיעות בחיפושים מקומיים ('...' ליד'). מקבלות 40%+ מהקליקים. נשלטות על ידי גורמי Local SEO: GMB, NAP Consistency, ביקורות, קרבה.",
  },
  "NAP": {
    knowledgeSlug: "nap-consistency",
    category: "seo",
    short: "Name, Address, Phone — עקביות פרטי עסק",
    body: "שם העסק, כתובת ומספר טלפון חייבים להיות זהים בדיוק בכל המקורות ברשת: GMB, אתר, Zap, Yelp ועוד. חוסר עקביות = ספק לגוגל = ירידה בדירוג Local Pack.",
  },
  "Helpful Content System": {
    knowledgeSlug: "helpful-content-system",
    category: "seo",
    short: "מערכת תוכן מועיל של גוגל",
    body: "אלגוריתם שמעדיף תוכן הנכתב לאנשים — לא למנועי חיפוש. מעניש אתרים עם תוכן AI-שטחי, דפים הנכתבו לדירוג בלבד ותוכן ללא ערך מוסף. נמזג עם Core Algorithm ב-2024.",
  },
  "YMYL": {
    knowledgeSlug: "ymyl",
    category: "seo",
    short: "Your Money or Your Life — תוכן בעל השפעה על חיים",
    body: "קטגוריית דפים המשפיעים על בריאות, פיננסים, משפט או בטיחות. גוגל מחיל עליהם סטנדרטי E-E-A-T גבוהים במיוחד — כי טעות בנושאים אלה עלולה לפגוע ממשית ברווחת הקורא.",
  },
  "RankBrain": {
    category: "seo",
    short: "RankBrain — AI של גוגל להבנת כוונת חיפוש",
    body: "אחת ממערכות ה-AI של גוגל המפרשת שאילתות חיפוש לא-מוכרות ומבינה קשרים סמנטיים. חלק ממערכת רחבה יותר הכוללת BERT ו-MUM. עוזרת לגוגל להבין כוונה, לא רק מילים.",
  },
  "BERT": {
    category: "seo",
    short: "BERT — מודל שפה של גוגל להבנת הקשר",
    body: "Bidirectional Encoder Representations from Transformers. מאפשר לגוגל להבין הקשר דו-כיווני בין מילים במשפט. שיפר דרמטית הבנת שאילתות שיחתיות ומורכבות ב-2019.",
  },
  "MUM": {
    category: "seo",
    short: "MUM — מודל AI רב-שפתי ורב-מודלי של גוגל",
    body: "Multitask Unified Model. מעבד מידע ב-75 שפות בו-זמנית, כולל תמונות וווידאו. חזק פי 1,000 מ-BERT. מאפשר הבנה מעמיקה של שאלות מורכבות הדורשות מספר מקורות.",
  },
  "Long-Tail": {
    knowledgeSlug: "long-tail-keywords",
    category: "seo",
    short: "ביטויי חיפוש ארוכים וספציפיים",
    body: "ביטויי חיפוש ספציפיים בעלי כוונה ברורה ותחרות נמוכה. לדוגמה: 'יועץ SEO לעסקים קטנים בתל אביב'. מביאים תנועה ממוקדת עם שיעור המרה גבוה יותר ממילות מפתח כלליות.",
  },
  "CTR": {
    category: "seo",
    short: "Click-Through Rate — שיעור הקלקה מחיפוש",
    body: "אחוז המשתמשים הראו את התוצאה שלכם בגוגל ולחצו עליה. CTR גבוה מאותת לגוגל שהתוצאה רלוונטית — ומוביל לדירוג גבוה יותר. Title Tag ו-Meta Description משפיעים ישירות.",
  },
  "Mobile-First": {
    knowledgeSlug: "mobile-first-indexing",
    category: "seo",
    short: "Mobile-First Index — גוגל מאנדקס ממובייל",
    body: "מאז 2019, גוגל סורק ומאנדקס בעיקר את הגרסה הנייד של אתרים. אם גרסת המובייל חסרה תוכן היש בדסקטופ — גוגל לא יודע שהתוכן קיים. 60%+ מהגלישה העולמית ממובייל.",
  },
  "Search Intent": {
    knowledgeSlug: "search-intent",
    category: "seo",
    short: "כוונת החיפוש — מה המשתמש באמת רוצה",
    body: "הסיבה האמיתית שעומדת מאחורי שאילתת חיפוש. ארבעה סוגים: Informational (ללמוד), Navigational (למצוא אתר), Commercial (להשוות), Transactional (לקנות). תוכן שאינו תואם את הכוונה לא ידורג.",
  },
  "Structured Data": {
    knowledgeSlug: "structured-data",
    category: "seo",
    short: "נתונים מובנים — מידע שמכונות מבינות",
    body: "סימון HTML המאפשר למנועי חיפוש להבין את תוכן הדף בצורה מכונה-קריאה. מאפשר Rich Snippets בגוגל וציטוטים ב-AI Overviews. מוטמע בדרך כלל עם JSON-LD.",
  },
  "JSON-LD": {
    knowledgeSlug: "structured-data",
    category: "seo",
    short: "JSON-LD — הפורמט המומלץ לנתונים מובנים",
    body: "הפורמט המומלץ של גוגל להטמעת Structured Data. מוטמע ב-<script> בתוך ה-HTML — לא ב-HTML עצמו — מה שמקל על תחזוקה. מבוסס על מפרט Schema.org המשותף למנועי החיפוש.",
  },
  "Disavow": {
    knowledgeSlug: "disavow-tool",
    category: "seo",
    short: "Disavow — ביטול קישורים רעים",
    body: "כלי ב-Google Search Console המאפשר לאתר לבקש מגוגל להתעלם מקישורים נכנסים ספציפיים. משמש כשהאתר קיבל קישורים ספאמיים. גוגל ממליץ להשתמש בו בזהירות רבה.",
  },
  "Hreflang": {
    knowledgeSlug: "hreflang",
    category: "seo",
    short: "Hreflang — תגית שפה ומדינה לאתרים בינלאומיים",
    body: "תגית HTML שאומרת לגוגל איזו גרסת שפה/מדינה של הדף להציג לכל קהל. קריטי לאתרים בעברית וגם באנגלית — בלי Hreflang, גוגל עשוי להציג את הגרסה הלא נכונה לכל קהל.",
  },
  "Sandbox Effect": {
    knowledgeSlug: "sandbox-effect",
    category: "seo",
    short: "אפקט Sandbox — עיכוב דירוג לאתרים חדשים",
    body: "תקופת המתנה של 3–6 חודשים שבה אתרים חדשים מדורגים נמוך מהצפוי, גם עם תוכן ו-SEO טוב. גוגל 'בוחן' את האתר לפני שמעניק לו דירוגים יציבים.",
  },
  "Digital PR": {
    knowledgeSlug: "digital-pr",
    category: "seo",
    short: "יחסי ציבור דיגיטליים — קישורים מתוכן ראוי-ציטוט",
    body: "יצירת תוכן שמדיה ועיתונאים מקשרים אליו מרצונם — מחקרים, סקרים, נתונים ייחודיים. מניב קישורים איכותיים ובונה Brand Awareness במקביל. אחת מדרכי Link Building הטובות ביותר.",
  },
  "HARO": {
    knowledgeSlug: "digital-pr",
    category: "seo",
    short: "HARO — פלטפורמה לקישורים ממדיה",
    body: "Help A Reporter Out (כיום Connectively) מחברת עיתונאים עם מומחים. עיתונאים שולחים שאלות, מומחים עונים ומקבלים ציטוט עם קישור ממדיה גדולה. אחת מדרכי Link Building האיכותיות.",
  },

  // ── PPC / Google Ads ───────────────────────────────────────────────────────
  "CPC": {
    category: "ppc",
    short: "Cost Per Click — עלות לקליק",
    body: "הסכום שמשלמים בכל פעם שמשתמש לוחץ על המודעה. נקבע בשיטת מכרז: Ad Rank שלך חלקי Ad Rank של המתחרה מתחתיך + $0.01. מודל הבסיס של Google Ads.",
  },
  "CPM": {
    category: "ppc",
    short: "Cost Per Mille — עלות לאלף הצגות",
    body: "מודל תשלום שבו משלמים לפי אלף חשיפות (הצגות) של המודעה, לא לפי קליקים. נפוץ בקמפיינים של מודעות תצוגה, YouTube ו-Awareness. מתאים כשמטרה היא חשיפה, לא המרה ישירה.",
  },
  "CPL": {
    category: "ppc",
    short: "Cost Per Lead — עלות לליד",
    body: "כמה עולה לייצר ליד אחד (פניה, מילוי טופס, שיחה). KPI מרכזי בקמפיינים לדורות לידים. אם CPL = 150 ₪ ו-20% מהלידים הופכים ללקוחות = עלות לקוח 750 ₪.",
  },
  "CPA": {
    category: "ppc",
    short: "Cost Per Acquisition — עלות לרכישה / המרה",
    body: "עלות הממוצעת לקבלת המרה — רכישה, הרשמה, שיחה. Target CPA הוא אסטרטגיית Smart Bidding שמנסה לשמור על CPA יעד. מדד מרכזי לאפקטיביות קמפיין.",
  },
  "ROAS": {
    category: "ppc",
    short: "Return on Ad Spend — החזר על הוצאת פרסום",
    body: "הכנסה לכל שקל שהוצא על פרסום. ROAS של 4 = 4 ₪ הכנסה על כל שקל פרסום. Target ROAS הוא אסטרטגיית Smart Bidding שמנסה להגיע ליעד זה. שונה מ-ROI שכולל עלויות נוספות.",
  },
  "Quality Score": {
    category: "ppc",
    short: "ציון איכות — 1-10 לכל מילת מפתח",
    body: "ציון גוגל ל-3 גורמים: רלוונטיות המודעה, CTR צפוי ואיכות Landing Page. ציון גבוה = CPC נמוך יותר. ציון 7+ = יתרון מכרזי. ציון 3 ומטה = תשלום יתר על כל קליק.",
  },
  "Ad Rank": {
    category: "ppc",
    short: "Ad Rank — המיקום של המודעה שלך",
    body: "מחשבון גוגל לקביעת מיקום המודעה. נוסחה: Bid × Quality Score × הקשר החיפוש + Ad Extensions. גבוה יותר = מיקום טוב יותר. לא רק תקציב — איכות חשובה כמו כן.",
  },
  "Impression Share": {
    category: "ppc",
    short: "Impression Share — כמה מהחשיפות האפשריות קיבלתם",
    body: "אחוז החשיפות שקיבלתם מתוך כל החשיפות שהמודעות שלכם היו יכולות לקבל. 40% Impression Share = מפספסים 60% מהחשיפות הפוטנציאליות. גורמים: תקציב, Quality Score, Ad Rank.",
  },
  "Smart Bidding": {
    category: "ppc",
    short: "Smart Bidding — בידינג אוטומטי מבוסס AI",
    body: "קבוצת אסטרטגיות הצעות מחיר שגוגל מבצע אוטומטית לפי נתוני המרה. כוללת Target CPA, Target ROAS, Maximize Conversions ועוד. AI מחליט כמה להציע לכל מכרז בזמן-אמת.",
  },
  "Performance Max": {
    category: "ppc",
    short: "Performance Max — קמפיין AI רב-ערוצי",
    body: "סוג קמפיין שמנהל AI של גוגל ורץ בו-זמנית על כל נכסי גוגל: Search, Display, YouTube, Gmail, Maps, Discover. דורש Audience Signals טובים. מחליף את Smart Shopping ו-Local קמפיינים.",
  },
  "Responsive Search Ads": {
    category: "ppc",
    short: "RSA — מודעת חיפוש רספונסיבית",
    body: "מבנה מודעה שמאפשר להכניס עד 15 כותרות ו-4 תיאורים. Google AI בוחר אוטומטית את השילוב הטוב ביותר לכל חיפוש ספציפי. החליף לחלוטין מודעות טקסט מורחבות (ETAs) ב-2022.",
  },
  "Negative Keywords": {
    category: "ppc",
    short: "ביטויים שליליים — מה שלא יפעיל המודעה",
    body: "רשימת ביטויים שמונעים הצגת המודעה. לדוגמה: עורך דין שאינו רוצה לקוחות ב'ייעוץ חינם' יוסיף 'חינם' כביטוי שלילי. ניהול נכון של Negative Keywords הוא אחד ממקורות החסכון הגדולים ביותר.",
  },
  "Match Types": {
    category: "ppc",
    short: "סוגי התאמה — כמה מדויקת צריכה להיות השאילתה",
    body: "שלושה סוגים: Broad Match (כל שאילתה קשורה), Phrase Match (חייבת לכלול הביטוי), Exact Match (הביטוי בדיוק). Exact = שליטה מלאה + פחות תנועה. Broad = יותר תנועה + פחות שליטה.",
  },
  "Remarketing": {
    category: "ppc",
    short: "Remarketing — פרסום למי שכבר ביקר",
    body: "קמפיין שמכוון מודעות למשתמשים שכבר ביקרו באתר, ביצעו פעולה מסוימת או נמצאים ברשימת לקוחות. שיעורי המרה גבוהים פי 2–5 מקמפיינים רגילים כי הקהל כבר מכיר את המותג.",
  },
  "Landing Page": {
    category: "ppc",
    short: "דף נחיתה — הדף שאליו מגיע הגולש לאחר קליק",
    body: "דף ייעודי שנועד להמיר מבקרים — בדרך כלל טופס, שיחה טלפונית או רכישה. הכלל: Message Match בין המודעה לדף = Quality Score גבוה + שיעור המרה גבוה. CTA ברור + מהירות = הצלחה.",
  },
  "Ad Extensions": {
    category: "ppc",
    short: "תוספי מודעה — מידע נוסף מתחת למודעה",
    body: "מידע נוסף שמופיע מתחת לטקסט המודעה הרגיל. כולל: Sitelinks (קישורים נוספים), Callouts (יתרונות), Call (טלפון), Location (כתובת), Structured Snippets (רשימות). מגדילים CTR ב-15–20%.",
  },
  "Conversion Tracking": {
    category: "ppc",
    short: "מעקב המרות — יודעים מה עובד",
    body: "מערכת שמודדת אילו קליקים הפכו להמרות (שיחה, טופס, רכישה). בלי Conversion Tracking, Smart Bidding עיוור לחלוטין. מוטמע עם Google Tag ו-GTM. בסיס לכל אופטימיזציה.",
  },
  "A/B Testing": {
    category: "ppc",
    short: "A/B Testing — השוואת גרסאות לשיפור ביצועים",
    body: "הרצה בו-זמנית של שתי גרסאות שונות (מודעה, Landing Page, כותרת) כדי לדעת מה עובד טוב יותר. תנועה מחולקת שווה בין הגרסאות. מסקנות מבוססות נתונים — לא ניחושים.",
  },

  // ── Analytics ─────────────────────────────────────────────────────────────
  "GA4": {
    category: "analytics",
    short: "Google Analytics 4 — דור חדש של אנליטיקס",
    body: "גרסה הנוכחית של Google Analytics. מבוסס על Events (לא Sessions), עם Funnel Analysis, Predictive Metrics ושילוב מלא עם Google Ads. החליף את Universal Analytics ב-2023.",
  },
  "Google Search Console": {
    knowledgeSlug: "google-search-console",
    category: "analytics",
    short: "Search Console — פאנל ה-SEO של גוגל",
    body: "כלי חינמי של גוגל שמראה: אילו שאילתות מביאות תנועה, CTR ממוצע, מיקומים, שגיאות סריקה, כיסוי אינדוקס ועוד. חיוני לכל אסטרטגיית SEO. ישירות מגוגל — לא הערכה.",
  },
  "GTM": {
    category: "analytics",
    short: "Google Tag Manager — ניהול תגיות בלי קוד",
    body: "מערכת שמאפשרת להוסיף, לערוך ולהסיר תגיות מעקב (Analytics, Pixels, Conversion Tracking) בלי לגעת בקוד האתר. שינוי שלוקח שבועות ב-IT — לוקח דקות ב-GTM.",
  },
  "UTM Parameters": {
    category: "analytics",
    short: "UTM — פרמטרים לזיהוי מקור תנועה",
    body: "5 פרמטרים שמוסיפים לקישורים כדי לדעת בדיוק מאיפה הגיעה התנועה. דוגמה: ?utm_source=facebook&utm_medium=paid&utm_campaign=spring. גוגל Analytics מפרש ומציג אוטומטית.",
  },
  "Bounce Rate": {
    category: "analytics",
    short: "שיעור יציאה מיידית — מדד מעורבות",
    body: "ב-Universal Analytics: אחוז ביקורים בדף יחיד. ב-GA4: אחוז Sessions שלא כללו אפילו Engaged Session אחד (10 שניות+, המרה, או 2+ דפים). שיעור נמוך = תוכן רלוונטי.",
  },
  "Conversion Rate": {
    category: "analytics",
    short: "שיעור המרה — כמה מהמבקרים ממירים",
    body: "אחוז המבקרים שביצעו פעולה רצויה (רכישה, טופס, שיחה). שיעור המרה ממוצע בפרסום גוגל: 2–5%. Landing Page ייעודי + Message Match יכולים להגיע ל-10–15%.",
  },
  "Attribution": {
    category: "analytics",
    short: "Attribution — לאיזה ערוץ לייחס את ההמרה",
    body: "מודל שמחליט לאיזה נקודת מגע לייחס את הקרדיט על ההמרה. Last Click = הקרדיט לערוץ האחרון. Data-Driven (ברירת מחדל ב-GA4) = מחלק קרדיט לפי AI. קריטי להחלטות תקציב.",
  },
  "Impressions": {
    category: "analytics",
    short: "חשיפות — כמה פעמים נראתה התוצאה או המודעה",
    body: "מספר הפעמים שתוצאה בגוגל (אורגנית או ממומנת) הוצגה על המסך של משתמש. לא אומר שלחצו — רק שהוצג. חשיפות גבוהות עם CTR נמוך = בעיה ב-Title/Description.",
  },
  "KPI": {
    category: "analytics",
    short: "Key Performance Indicator — מדד ביצועים מרכזי",
    body: "המדד שמראה אם המטרה העסקית מושגת. לכל עסק ה-KPI שלו: ROI לחנות e-commerce, CPL לעסק שירות, Organic Traffic לאתר תוכן. KPI לא רלוונטי = החלטות לא נכונות.",
  },
  "ROI": {
    category: "analytics",
    short: "Return on Investment — החזר על השקעה",
    body: "הרווח הנקי מחולק בעלות ההשקעה, כאחוז. ROI = (הכנסה - עלות) / עלות × 100. שונה מ-ROAS שמחשב רק הכנסה על הוצאת פרסום. ROI כולל עלויות נוספות: צוות, ייצור, כלים.",
  },
  "Funnel": {
    category: "analytics",
    short: "משפך שיווקי — המסלול מתנועה להמרה",
    body: "מודל שמתאר את שלבי המסע של לקוח: TOFU (מודעות), MOFU (שקילה), BOFU (המרה). כל שלב דורש תוכן ואסטרטגיה שונים. אנליזת Funnel ב-GA4 מגלה איפה גולשים נושרים.",
  },

  // ── Tech / Dev ────────────────────────────────────────────────────────────
  "SSR": {
    category: "tech",
    short: "Server-Side Rendering — עיבוד דף בשרת",
    body: "HTML מוכן נשלח מהשרת לדפדפן — גוגל רואה תוכן מלא מיד. מנגד ל-CSR שבה הדפדפן בונה את הדף עם JavaScript. Next.js תומך ב-SSR מובנה. יתרון SEO משמעותי.",
  },
  "SSG": {
    category: "tech",
    short: "Static Site Generation — דפים שנבנו מראש",
    body: "דפי HTML שנבנים בזמן הבנייה (Build Time) ולא בכל בקשה. הכי מהיר לגולש וה-Google Bot. מתאים לתוכן שמשתנה לעיתים רחוקות. Next.js תומך ב-SSG, SSR ו-ISR יחד.",
  },
  "ISR": {
    category: "tech",
    short: "Incremental Static Regeneration — עדכון דפים סטטיים",
    body: "תכונה של Next.js שמאפשרת לבנות דפים סטטיים ולעדכן אותם ברקע כל X שניות. משלב את המהירות של SSG עם העדכניות של SSR. מתאים לאתרי תוכן וקמרץ בקנה מידה גדול.",
  },
  "CSR": {
    category: "tech",
    short: "Client-Side Rendering — עיבוד דף בדפדפן",
    body: "JavaScript רץ בדפדפן ובונה את הדף — גוגל עשוי לראות דף ריק בביקור ראשון. React Application טיפוסי. פחות מועדף ל-SEO. מתאים לממשקי משתמש מורכבים שלא זקוקים לאינדוקס.",
  },
  "Next.js": {
    category: "tech",
    short: "Next.js — פריימוורק React לאתרי Production",
    body: "פריימוורק מבוסס React שמוסיף SSR, SSG, ISR, Routing ועוד. הפתרון המועדף לאתרים שצריכים גם ביצועים טובים וגם SEO. משמש אתרי WAO. פותח על ידי Vercel.",
  },
  "React": {
    category: "tech",
    short: "React — ספריית JavaScript לממשקי משתמש",
    body: "ספריית JavaScript של Meta לבניית ממשקי משתמש מבוססי-רכיבים. הבסיס של Next.js. לא מספיקה לבד ל-SSR/SEO — לכן Next.js. הפופולרית ביותר לפיתוח Web ב-2026.",
  },
  "CMS": {
    category: "tech",
    short: "Content Management System — מערכת ניהול תוכן",
    body: "תוכנה שמאפשרת לנהל תוכן אתר בלי לגעת בקוד. WordPress הוא CMS הפופולרי ביותר. Payload CMS הוא CMS מודרני מבוסס TypeScript שמשמש את WAO לניהול תוכן דינמי.",
  },
  "Payload CMS": {
    category: "tech",
    short: "Payload CMS — מערכת ניהול תוכן Headless",
    body: "Headless CMS מבוסס TypeScript ו-Node.js עם Admin Panel מובנה. 'Headless' אומר שהתוכן נגיש ב-API — לא מוגבל לעיצוב מסוים. מאפשר לצוות שיווק לנהל תוכן בלי תלות בפיתוח.",
  },
  "API": {
    category: "tech",
    short: "API — ממשק תכנות יישומים",
    body: "דרך תקנית לשני תוכניות לדבר זו עם זו. דוגמה: כשמשלמים ב-PayPal באתר חיצוני — האתר מדבר עם ה-API של PayPal. REST API הוא הפורמט הנפוץ ביותר. JSON הוא פורמט הנתונים.",
  },
  "CDN": {
    category: "tech",
    short: "Content Delivery Network — רשת הפצת תוכן",
    body: "רשת שרתים גלובלית שמגישה קבצים סטטיים (תמונות, CSS, JS) מהשרת הקרוב ביותר לגולש. מורידה זמן טעינה דרמטית. Cloudflare, Akamai ו-Vercel Edge Network הם CDNs נפוצים.",
  },
  "SSL": {
    category: "tech",
    short: "SSL/HTTPS — הצפנת חיבור האתר",
    body: "פרוטוקול שמצפין את החיבור בין הדפדפן לשרת — הופך HTTP ל-HTTPS. גורם דירוג רשמי של גוגל. ה-🔒 בדפדפן. ללא SSL, גוגל Chrome מציג 'לא מאובטח' שמרתיע מבקרים.",
  },
  "Open Graph": {
    category: "tech",
    short: "Open Graph — מידע על שיתוף ברשתות חברתיות",
    body: "תגיות Meta שמגדירות כיצד דף יופיע כשמשתפים אותו בפייסבוק, לינקדאין, ווצאפ ועוד. כוללות: כותרת, תיאור, תמונה. ללא Open Graph — שיתוף יראה גנרי ולא מושך.",
  },
  "TypeScript": {
    category: "tech",
    short: "TypeScript — JavaScript עם בדיקת טיפוסים",
    body: "שפת תכנות שמוסיפה Type System על JavaScript. מאפשרת לתפוס שגיאות לפני הרצה, משפרת אוטוהשלמה ב-IDE ומגדילה אמינות קוד. ב-2026, רוב הפרויקטים המודרניים כתובים ב-TypeScript.",
  },
  "Schema.org": {
    category: "tech",
    short: "Schema.org — מפרט נתונים מובנים אוניברסלי",
    body: "מפרט משותף של גוגל, מיקרוסופט, יאהו ויאנדקס להגדרת סוגי נתונים מובנים. מגדיר אובייקטים כמו Article, Product, Person, FAQ, Course — שמנועי חיפוש ו-AI מבינים ומשתמשים בהם.",
  },

  // ── Marketing ─────────────────────────────────────────────────────────────
  "SEM": {
    category: "marketing",
    short: "Search Engine Marketing — שיווק ממונע במנועי חיפוש",
    body: "מונח כולל לכל פעילות שיווקית במנועי חיפוש — SEO אורגני + PPC ממומן. לפעמים משמש במשמעות צרה יותר לפרסום ממומן (PPC) בלבד. WAO מציעה שירותי SEM מלאים.",
  },
  "PPC": {
    category: "marketing",
    short: "Pay Per Click — תשלום לפי קליק",
    body: "מודל פרסום שבו המפרסם משלם רק כשמישהו לוחץ על המודעה. Google Ads, Meta Ads ו-LinkedIn Ads פועלים על מודל זה. מאפשר שליטה מדויקת על הוצאות ומדידה ישירה של תוצאות.",
  },
  "Content Marketing": {
    category: "marketing",
    short: "שיווק תוכן — משיכת לקוחות דרך ערך",
    body: "אסטרטגיה שיווקית שבה יוצרים ומפיצים תוכן בעל ערך (מאמרים, וידאו, מדריכים) כדי למשוך ולשמר קהל. מוביל ל-SEO, Authority ו-Trust לפני גיוס לקוחות. עלות-תועלת גבוהה לטווח ארוך.",
  },
  "Lead Generation": {
    category: "marketing",
    short: "דור לידים — גיוס לקוחות פוטנציאליים",
    body: "תהליך זיהוי ומשיכת אנשים שמתעניינים במוצר או שירות. לידים = פנייה, מילוי טופס, שיחה טלפונית. ה-CPL (עלות לליד) הוא המדד המרכזי. Landing Page + PPC = שילוב Lead Gen קלאסי.",
  },
  "TOFU MOFU BOFU": {
    category: "marketing",
    short: "Top / Middle / Bottom of Funnel — שלבי משפך שיווקי",
    body: "TOFU (ראש המשפך): מודעות — בלוג, SEO, מדיה חברתית. MOFU (אמצע): שקילה — מדריכים, השוואות, וובינרים. BOFU (תחתית): החלטה — דמו, ייעוץ, Landing Page. תוכן שלא תואם את השלב — לא ממיר.",
  },
  "CTA": {
    category: "marketing",
    short: "Call to Action — קריאה לפעולה",
    body: "הכפתור, הכותרת או הפסקה שמכוונים את הגולש לפעולה הרצויה: 'צרו קשר', 'השאירו פרטים', 'קנו עכשיו'. CTA ברור מעל הקפל (Above The Fold) הוא אחד מגורמי שיפור ה-Conversion המשמעותיים ביותר.",
  },
  "Above The Fold": {
    category: "marketing",
    short: "מעל הקפל — מה הגולש רואה בלי לגלול",
    body: "החלק הגלוי של הדף לפני כל גלילה. מחקרים מראים ש-90%+ מהגולשים שעוזבים — עוזבים בלי לגלול. CTA, כותרת ו-Value Proposition חייבים להיות מעל הקפל בכל מכשיר.",
  },
  "Affiliate Marketing": {
    category: "marketing",
    short: "שיווק שותפים — עמלה על הפניית לקוחות",
    body: "מודל עסקי שבו שותפים (affiliates) מקדמים מוצרים ומקבלים עמלה על כל מכירה או פעולה שמגיעה דרכם. Win-win: המותג מקבל לקוח, השותף מקבל עמלה. קישור ייחודי מזהה את השותף.",
  },
  "Email Marketing": {
    category: "marketing",
    short: "שיווק באימייל — הערוץ הישיר ביותר",
    body: "שליחת מסרים שיווקיים לרשימת אימייל של נרשמים. שיעורי פתיחה 15–25%, ROI הגבוה ביותר מכל ערוץ דיגיטלי ($36 לכל $1 מושקע). כלים: Mailchimp, ConvertKit, ActiveCampaign.",
  },
  "GDN": {
    category: "ppc",
    short: "Google Display Network — רשת המודעות של גוגל",
    body: "רשת של מעל 3 מיליון אתרים, אפליקציות ו-YouTube שמציגים מודעות תמונה של גוגל. מתאים לבניית מודעות (Awareness), Remarketing ו-Reach. עלות CPC נמוכה יחסית לקמפיינים בחיפוש.",
  },

  // ── Additional SEO tech terms ──────────────────────────────────────────────
  "Technical SEO": {
    category: "seo",
    short: "אופטימיזציה טכנית של האתר לגוגל",
    body: "כל מה שגוגל צריך כדי לסרוק, לאנדקס ולדרג את האתר — מהירות טעינה, מבנה URL, תגיות Canonical, Sitemap, Robots.txt, קישורים שבורים וכן הלאה. בלי Technical SEO תקין, תוכן מצוין לא יגיע לשום מקום.",
  },
  "Crawl Budget": {
    category: "seo",
    short: "תקציב סריקה — כמה דפים גוגל סורק בזמן נתון",
    body: "המספר המוגבל של דפים ש-Googlebot יסרוק באתר שלכם בתקופה נתונה. אתרים גדולים עם דפים ללא ערך (פגינציה, פילטרים) 'מבזבזים' את תקציב הסריקה על דפים לא חשובים, ומדפים חשובים שלא נסרקים.",
  },
  "Indexing Bloat": {
    category: "seo",
    short: "ניפוח אינדוקס — יותר מדי דפים מואנדקסים",
    body: "מצב שבו לאתר יש אלפי דפים מואנדקסים שאין להם ערך — דפי פגינציה, פילטרים, תגיות ריקות. גורם לגוגל לדלל את הסמכות בין הדפים ומקשה על דירוג הדפים החשובים. הפתרון: Noindex + XML Sitemap נקי.",
  },
  "Keyword Cannibalization": {
    category: "seo",
    short: "קאניבליזציה — כשדפים שלך מתחרים אחד בשני",
    body: "כשיש לאתר שני דפים או יותר שמתמודדים על אותה מילת מפתח, גוגל לא יודע לאיזה לתת עדיפות — ושניהם מדורגים נמוך. הפתרון: איחוד תוכן קאניבלי ל-Canonical אחד, עם Redirect 301 מהדף החלש.",
  },
  "Local SEO": {
    category: "seo",
    short: "קידום אתרים מקומי — חיפושים עם כוונה גיאוגרפית",
    body: "אופטימיזציה לחיפושים מקומיים: 'רופא שיניים ברמת גן', 'קפה ליד'... כוללת אופטימיזציה של Google My Business, NAP Consistency, ביקורות וקישורים מאתרים מקומיים. מטרה: להופיע ב-Local Pack.",
  },
  "ccTLD": {
    category: "seo",
    short: "Country Code Top-Level Domain — סיומת דומיין לפי מדינה",
    body: "סיומת דומיין שמייצגת מדינה ספציפית: .de (גרמניה), .fr (צרפת), .co.uk (אנגליה). שולח אות גיאוגרפי חזק לגוגל, אך מחייב בניית Domain Authority נפרד לכל מדינה. .co.il הוא ה-ccTLD של ישראל.",
  },
  "Link Equity": {
    category: "seo",
    short: "ערך קישורים — הסמכות שעוברת דרך לינק",
    body: "הכמות של PageRank ו-Authority שעוברת מהדף המקשר לדף המקושר. קישור מאתר סמכותי מעביר Link Equity רב יותר. Redirect 301 מעביר ~99% מה-Link Equity. Nofollow לא מעביר Link Equity.",
  },
  "Geo-Targeting": {
    category: "seo",
    short: "מיקוד גיאוגרפי — הגדרת שוק יעד לפי מיקום",
    body: "הגדרה בגוגל (Search Console, Google Ads) שאומרת לאיזה מדינה/אזור האתר או הקמפיין מכוון. ב-SEO: Google Search Console מאפשר Country Targeting לכל Property. ב-PPC: מגדירים גיאוגרפיה בהגדרות הקמפיין.",
  },
  "WebP": {
    category: "tech",
    short: "WebP — פורמט תמונה מודרני של גוגל",
    body: "פורמט תמונה שגוגל פיתחה — קובץ קטן ב-25–35% מ-JPEG בלי איכות גרועה יותר. תומך בשקיפות (כמו PNG) ואנימציות. תמיכה מלאה בכל הדפדפנים המודרניים. משפר LCP (מהירות טעינה) ו-Core Web Vitals.",
  },
  "AVIF": {
    category: "tech",
    short: "AVIF — פורמט תמונה חדש יותר מ-WebP",
    body: "פורמט תמונה מודרני הנגזר מקודק הווידאו AV1. קטן ב-50% מ-JPEG ו-20% מ-WebP. איכות מעולה, במיוחד לצילומים. תמיכת דפדפן גדלה אך טרם אוניברסלית. next/image ו-Cloudflare תומכים בו אוטומטית.",
  },
  "Meta Pixel": {
    category: "analytics",
    short: "פיקסל של Meta — מעקב המרות לפייסבוק ואינסטגרם",
    body: "קוד JavaScript של Meta (פייסבוק/אינסטגרם) שמוטמע באתר ומאפשר: מעקב המרות ממודעות, בניית קהלים מותאמים (Custom Audiences) ו-Remarketing. הוחלף ב-Conversions API בגלל הגבלות Cookies.",
  },
  "Looker Studio": {
    category: "analytics",
    short: "Looker Studio — כלי הדשבורד של גוגל (בחינם)",
    body: "כלי BI חינמי של גוגל (לשעבר Data Studio) שמחבר נתונים מ-Google Analytics, Search Console, Google Ads ועוד — לדשבורד ויזואלי אחד. מחליף דוחות Excel ומאפשר שיתוף בזמן-אמת עם לקוחות.",
  },
  "B2C": {
    category: "marketing",
    short: "Business to Consumer — מכירה ישירה לצרכן הסופי",
    body: "מודל עסקי שבו העסק מוכר ישירות לאנשים פרטיים — ולא לעסקים אחרים. לדוגמה: חנות אונליין, שירות מנוי, אפליקציה. שיווק B2C מתמקד בקשר רגשי, חוויה מהירה ומחיר. שונה מ-B2B שם מחזור המכירה ארוך יותר.",
  },
  "B2B": {
    category: "marketing",
    short: "Business to Business — מכירה לעסקים אחרים",
    body: "מודל עסקי שבו העסק מוכר לעסקים אחרים — לא לצרכנים פרטיים. לדוגמה: תוכנות לחברות, שירותי ייעוץ, ספקים. מחזור מכירה ארוך יותר, מחיר גבוה יותר, מקבלי ההחלטה מרובים. שיווק B2B מתמקד בלידים ובניית אמון.",
  },
  "Conversion": {
    category: "analytics",
    short: "המרה — כשגולש מבצע פעולה בעלת ערך",
    body: "כל פעולה שגולש מבצע שיש לה ערך עסקי: מילוי טופס, שיחת טלפון, רכישה, הרשמה לניוזלטר. מדידת המרות (Conversion Tracking) היא הבסיס לכל אופטימיזציה של Google Ads ו-SEO.",
  },
};
