/**
 * Site Bot paid-journey v2 M1: every NEW user-facing string of the buy CTA, the
 * pre-fill confirm card and the 3 intake questions lives here as a named slot.
 *
 * Hebrew values: authored by waocopy (Tamar), approved by Noa, applied byte-exact from
 * the approved JSON by script (2026-11-09). Never retype; change only via byte-exact patches.
 */
export const INTAKE_COPY = {
  // Audit result (flag-gated buy CTA, src/app/(app)/site-bot/audit/paidBuyCta.tsx)
  M1_CTA_LABEL: 'לבנות את האתר שלי',
  M1_CTA_SUBLINE: 'כמה שאלות קצרות, והפרטים מגוגל כבר ממולאים.',

  // Start page: pre-fill fetch in progress
  M1_PREFILL_LOADING: 'טוענים את הפרטים שלך מגוגל…',

  // Step A: confirm card
  M1_CARD_TITLE: 'זה מה שגוגל מציג עליך',
  M1_CARD_INTRO: 'תבדוק את הפרטים, תתקן כאן מה שצריך ואז תאשר.',
  M1_CARD_FALLBACK_NOTE: 'לא הצלחנו לטעון את הפרטים מראש, אבל אפשר למלא כאן את העיקר.',
  M1_CARD_REQUIRED_HINT: 'כדי להמשיך, צריך שם עסק, תחום עיסוק, טלפון ועיר.',
  M1_CARD_CONFIRM: 'הפרטים נכונים, המשך',
  M1_FIELD_BUSINESS_NAME: 'שם העסק',
  M1_FIELD_NICHE: 'תחום עיסוק',
  M1_FIELD_PHONE: 'טלפון',
  M1_FIELD_ADDRESS: 'כתובת',
  M1_FIELD_CITY: 'עיר',
  M1_FIELD_HOURS: 'שעות פתיחה',
  M1_FIELD_WEBSITE: 'אתר אינטרנט, אם יש',
  M1_FIELD_SERVICE_MODEL: 'איך אתה עובד עם לקוחות',

  // Service-model options (card select, and Q2 buttons when the card could not infer it)
  M1_SERVICE_MODEL_FIELD: 'אני מגיע ללקוח',
  M1_SERVICE_MODEL_LOCATION: 'לקוחות מגיעים אליי',
  M1_SERVICE_MODEL_MIXED: 'גם אצלי וגם אצל הלקוח',
  M1_SERVICE_MODEL_REMOTE: 'בטלפון או אונליין',

  // Step B: the 3 questions
  M1_Q1_PRIORITY_SERVICES: 'אילו שירותים אתה הכי רוצה שלקוחות יזמינו — אלה שמכניסים לך את הכסף? אפשר להפריד בפסיקים.',
  M1_Q2_SERVICE_MODEL: 'איך אתה עובד עם הלקוחות?',
  M1_Q2_TRAVEL_BOUNDARY: 'כמה רחוק אתה מוכן לנסוע, ואילו אזורים אתה מכסה בדרך כלל?',
  M1_Q2_SERVICE_AREA: 'בוא נבין את אזור השירות — מאילו אזורים הלקוחות שלך מגיעים אליך בדרך כלל?',
  M1_Q3_USP: 'למה לבחור בך ולא במתחרה ממול? משהו קונקרטי, לא רק מקצועי ואמין.',
} as const;

export type IntakeCopyKey = keyof typeof INTAKE_COPY;
