import type { VerticalKey } from './verticalThemes';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';

// Keyword → vertical mapping. Longer/more-specific entries win (checked first).
// keywords: substring match. words: whole-word match (one optional attached prefix letter), for short tokens that sit
// inside unrelated words (2026-11-10: the gas token, Yonatan's licensed-trades research line 48; tokens copied by script).
const VERTICAL_MAP: Array<{ keywords: string[]; words?: string[]; vertical: VerticalKey }> = [
  // Emergency Trades — urgency-first, field services
  {
    keywords: ['אינסטלטור', 'שרברב', 'נזיל', 'נזילות', 'מנעולן', 'מנעול', 'חשמלאי', 'חשמל', 'מדביר', 'הדבר', 'מזיק', 'ג\'וק', 'עכבר', 'מזגן', 'אינסטל', 'טכנאי גז'],
    words: ['גז'],
    vertical: 'emergency-trades',
  },
  // Skilled Trades — craftsmanship, project-based
  {
    keywords: ['שיפוצניק', 'שיפוץ', 'גנן', 'גינה', 'גינון', 'צבע', 'צביעה', 'רהיט', 'נגר', 'נגרות', 'ריצוף', 'אלומיניום', 'תריס', 'מסגר', 'איטום', 'טיח', 'קבלן'],
    vertical: 'skilled-trades',
  },
  // Medical & Aesthetics — clinical trust
  {
    keywords: ['רופא', 'שיניים', 'דרמטולוג', 'עור', 'קוסמטיק', 'אסתטיק', 'לייזר', 'בוטוקס', 'פילינג', 'מכון יופי', 'רפואה', 'אנטי אייג'],
    vertical: 'medical-aesthetics',
  },
  // Legal & Financial — authority
  {
    keywords: ['עורך דין', 'עו"ד', 'משפט', 'נוטריון', 'רואה חשבון', 'חשבונאי', 'יועץ מס', 'ביטוח', 'השקעות', 'פיננסי', 'מסים', 'ירושה', 'גירושין', 'פשיטת רגל', 'מתווך', 'תיווך'],
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
  // Driving teacher: checked before the teacher keyword below (Yonatan 2026-11-10). Vertical: the neutral fallback
  // (skilled-trades) until Yonatan names one; the research line places it but does not name its vertical.
  {
    keywords: ['מורה נהיגה'],
    vertical: 'skilled-trades',
  },
  // Remote Professional — expertise/consulting
  {
    keywords: ['פסיכולוג', 'מטפל', 'טיפול', 'קואצ\'ר', 'מאמן אישי', 'יועץ', 'ייעוץ', 'מורה', 'שיעורים', 'אנגלית', 'מתמטיקה', 'מנטור', 'פסיכותרפיסט', 'עו"ס'],
    vertical: 'remote-professional',
  },
];

const WORD_EDGE = '\u05D0-\u05EAA-Za-z';
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/** A whole-word token test with at most one attached Hebrew prefix letter (the gas token never matches inside a longer word). */
function hasWord(text: string, word: string): boolean {
  return new RegExp(`(?<![${WORD_EDGE}])[${PREFIX_LETTERS}]?${escapeRegExp(word)}(?![${WORD_EDGE}])`, 'u').test(text);
}
function entryMatches(entry: { keywords: string[]; words?: string[] }, lower: string): boolean {
  return entry.keywords.some(k => lower.includes(k)) || (entry.words ?? []).some(word => hasWord(lower, word));
}

/**
 * 2026-11-11 (depth-question relevance): every trade keyword / word of the map that a text names, in map order. Two texts
 * naming the same keyword share a trade anchor even when their word forms differ (a trade noun and its craft noun share
 * the keyword stem), while another trade of the same vertical names a different keyword.
 */
export function tradeKeywordsIn(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return VERTICAL_MAP.flatMap(entry => [...entry.keywords.filter(keyword => lower.includes(keyword)), ...(entry.words ?? []).filter(word => hasWord(lower, word))]);
}

/**
 * Content depth: the vertical whose keywords a text names, or null when it names none (detectVertical falls back to
 * 'skilled-trades' instead, so it cannot tell "no match" apart).
 */
export function matchedVertical(text: string): VerticalKey | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  return VERTICAL_MAP.find(entry => entryMatches(entry, lower))?.vertical ?? null;
}

/**
 * Maps a free-text businessNiche string to one of the 8 vertical keys.
 * Falls back to 'skilled-trades' (neutral, not urgency-colored) if unknown.
 */
export function detectVertical(businessNiche: string): VerticalKey {
  if (!businessNiche) return 'skilled-trades';
  const lower = businessNiche.toLowerCase();
  for (const entry of VERTICAL_MAP) {
    if (entryMatches(entry, lower)) {
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
