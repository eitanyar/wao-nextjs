/**
 * Verbatim Hebrew UI display strings for Scorecard Share & Acquisition affordances.
 * Spec: 2026-08-27_002
 *
 * HEBREW-SAFETY: All strings authored in spec. waoengineer does not retype or invent Hebrew.
 */

export const SHARE_DISPLAY_COPY = {
  SECTION_TITLE: 'הפצת הבדיקה וכלים להשגת לקוחות',
  SECTION_SUBTITLE: 'שתף בוואטסאפ, פרסם בקהילות עסקיות, או שלח פנייה יזומה מותאמת אישית.',
  TAB_WHATSAPP: 'וואטסאפ ועמיתים',
  TAB_COMMUNITY: 'קבוצות וקהילות',
  TAB_OUTBOUND: 'פנייה יזומה קרה',
  MODE_PEER_LABEL: 'עמית בעל עסק',
  MODE_MARKETER_LABEL: 'משווק / שותף',
  BTN_WHATSAPP_DIRECT: 'שלח בוואטסאפ',
  BTN_COPY_MESSAGE: 'העתק הודעה',
  BTN_COPY_POST: 'העתק פוסט מוכן',
  BTN_COPY_HOOK: 'העתק פנייה ראשונה',
  BTN_COPY_FOLLOWUP: 'העתק הודעת מעקב',
  BTN_COPY_LINK: 'העתק קישור לדוח',
  LABEL_COPIED: 'הועתק ללוח!',
  LABEL_OUTBOUND_DETECTED: 'מותאם אישית לפי ממצאי הבדיקה:',
  LABEL_OUTBOUND_CATEGORIES: 'זוהו קטגוריות חסרות בפרופיל',
  LABEL_OUTBOUND_HOURS: 'זוהו שעות פעילות חסרות',
  LABEL_OUTBOUND_PHOTOS: 'זוהה מחסור בתמונות אותנטיות',
  LABEL_OUTBOUND_GENERAL: 'פנייה כללית לבדיקת פרופיל',
  LABEL_HOOK_STEP_1: 'הודעה ראשונה (הוק):',
  LABEL_HOOK_STEP_2: 'הודעת פולו-אפ (מעקב לאחר כמה ימים):',
  PREVIEW_TITLE: 'תצוגה מקדימה:',
} as const;

export function getFailingDimensionLabel(dim: 'categories' | 'hours' | 'photos' | null): string {
  if (dim === 'categories') return SHARE_DISPLAY_COPY.LABEL_OUTBOUND_CATEGORIES;
  if (dim === 'hours') return SHARE_DISPLAY_COPY.LABEL_OUTBOUND_HOURS;
  if (dim === 'photos') return SHARE_DISPLAY_COPY.LABEL_OUTBOUND_PHOTOS;
  return SHARE_DISPLAY_COPY.LABEL_OUTBOUND_GENERAL;
}
