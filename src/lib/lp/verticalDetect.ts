import type { VerticalKey } from './verticalThemes';

// Keyword → vertical mapping. Longer/more-specific entries win (checked first).
const VERTICAL_MAP: Array<{ keywords: string[]; vertical: VerticalKey }> = [
  // Emergency Trades — urgency-first, field services
  {
    keywords: ['אינסטלטור', 'שרברב', 'נזיל', 'נזילות', 'מנעולן', 'מנעול', 'חשמלאי', 'חשמל', 'מדביר', 'הדבר', 'מזיק', 'ג\'וק', 'עכבר', 'מזגן', 'אינסטל'],
    vertical: 'emergency-trades',
  },
  // Skilled Trades — craftsmanship, project-based
  {
    keywords: ['שיפוצניק', 'שיפוץ', 'גנן', 'גינה', 'גינון', 'צבע', 'צביעה', 'רהיט', 'נגר', 'נגרות', 'ריצוף', 'אלומיניום', 'תריס', 'מסגר', 'איטום', 'טיח'],
    vertical: 'skilled-trades',
  },
  // Medical & Aesthetics — clinical trust
  {
    keywords: ['רופא', 'שיניים', 'דרמטולוג', 'עור', 'קוסמטיק', 'אסתטיק', 'לייזר', 'בוטוקס', 'פילינג', 'מכון יופי', 'רפואה', 'אנטי אייג'],
    vertical: 'medical-aesthetics',
  },
  // Legal & Financial — authority
  {
    keywords: ['עורך דין', 'עו"ד', 'משפט', 'נוטריון', 'רואה חשבון', 'חשבונאי', 'יועץ מס', 'ביטוח', 'השקעות', 'פיננסי', 'מסים', 'ירושה', 'גירושין', 'פשיטת רגל'],
    vertical: 'legal-financial',
  },
  // Events & Creative — portfolio-driven
  {
    keywords: ['צלם', 'צלמת', 'צילום', 'חתונה', 'אירוע', 'DJ', 'דיג\'יי', 'קייטרינג', 'אוכל אירועים', 'פרחים', 'עיצוב אירועים', 'וידאוגרף', 'מוזיקאי'],
    vertical: 'events-creative',
  },
  // Fitness & Wellness — transformation
  {
    keywords: ['מאמן כושר', 'כושר', 'אישי', 'פילאטיס', 'יוגה', 'תזונה', 'תזונאי', 'דיאטן', 'ספורט', 'מאמן', 'חדר כושר', 'פיטנס'],
    vertical: 'fitness-wellness',
  },
  // Beauty & Grooming — lifestyle
  {
    keywords: ['ספר', 'ספרית', 'תספורת', 'נייל', 'ציפורן', 'מניקור', 'פדיקור', 'איפור', 'מאפר', 'שיער', 'הארכת ריסים', 'גבות'],
    vertical: 'beauty-grooming',
  },
  // Remote Professional — expertise/consulting
  {
    keywords: ['פסיכולוג', 'מטפל', 'טיפול', 'קואצ\'ר', 'מאמן אישי', 'יועץ', 'ייעוץ', 'מורה', 'שיעורים', 'אנגלית', 'מתמטיקה', 'מנטור', 'פסיכותרפיסט', 'עו"ס'],
    vertical: 'remote-professional',
  },
];

/**
 * Maps a free-text businessNiche string to one of the 8 vertical keys.
 * Falls back to 'skilled-trades' (neutral, not urgency-colored) if unknown.
 */
export function detectVertical(businessNiche: string): VerticalKey {
  if (!businessNiche) return 'skilled-trades';
  const lower = businessNiche.toLowerCase();
  for (const entry of VERTICAL_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.vertical;
    }
  }
  return 'skilled-trades';
}

/**
 * Infers whether urgency language should be used in the hero.
 * True = "דחוף / חירום" framing. False = "מקצועי / מומחה" framing.
 */
export function isUrgencyVertical(vertical: VerticalKey): boolean {
  return vertical === 'emergency-trades';
}
