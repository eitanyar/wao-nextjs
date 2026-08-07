/**
 * Vertical archetype classification — Readiness Gate §2.4.
 *
 * A static lookup, not a new judgment call — directly from VISION.md's
 * already-named archetype lists:
 *   - micro-SMB: plumber, tutor, photographer, electrician, locksmith,
 *     AC-repair, mechanic/auto-repair (also the Grade-A archetypes in
 *     docs/specs/grade-a-outreach-playbook.md §0)
 *   - content-ready-SMB: accountant, coach, clinic/physiotherapist/dentist/
 *     aesthetic-doctor, lawyer, architect
 *
 * This is a DIFFERENT taxonomy from src/app/api/bot/route.ts's buyer-intent
 * budget clusters (homeImprovement/autoServices/academicTutoring/
 * fitnessTraining/businessProfessionalSvc/creativeVisualSvc) — that table is
 * for CPC/budget estimation, not Site-vs-GEO routing, and its buckets don't
 * map 1:1 onto micro-SMB/content-ready-SMB. Do NOT repurpose it here
 * (readiness-gate.md §2.4). Where the same vertical appears in both tables,
 * the Hebrew keyword substrings below are kept consistent with route.ts's
 * category-detection keywords so the same prospect doesn't get two
 * different category spellings depending on which script touched them.
 *
 * A shared category-string-constants file spanning both this module and
 * src/app/api/bot/route.ts is flagged as a reasonable future refactor if
 * drift becomes a real problem — NOT built here (spec explicitly marks it
 * "flagged, not mandated, for this pass").
 */

/** @typedef {'micro-smb' | 'content-ready-smb' | 'unclassified'} Archetype */
/** @typedef {'grade-a' | 'grade-b' | 'grade-c'} GradeTier */

// Grade-A archetypes named explicitly in grade-a-outreach-playbook.md §0 —
// solo emergency-trade operators, auto-repair garage owners, independent
// clinic owner-practitioners. Grade B/C are not enumerated as a lookup table
// anywhere in the codebase (playbook §0: "documented in session history, not
// repeated here") — gradeTier stays undefined for anything not on this list,
// per the data model's own "optional" marking (readiness-gate.md §3).
const GRADE_A_KEYWORDS = [
  'אינסטלטור', 'שרברב', 'חשמלאי', 'מנעולן', 'מיזוג', 'מזגן',
  'מוסך', 'מכונאי',
  'פיזיותרפ', 'רופא שיניים', 'שיניים', 'קוסמט', 'אסתט',
];

/**
 * @type {Record<'micro-smb' | 'content-ready-smb', string[]>}
 * Hebrew keyword substrings per VISION.md's named archetype members.
 * Kept consistent, where overlapping, with src/app/api/bot/route.ts's
 * cluster-detection keyword lists (not imported from there — see header).
 */
const ARCHETYPE_KEYWORDS = {
  'micro-smb': [
    'אינסטלטור', 'שרברב',       // plumber
    'מורה פרטי', 'שיעורי',       // tutor
    'צלם', 'צלמ',                // photographer
    'חשמלאי',                    // electrician
    'מנעולן',                    // locksmith
    'מיזוג', 'מזגן',             // AC-repair
    'מוסך', 'מכונאי',            // mechanic / auto-repair
  ],
  'content-ready-smb': [
    'רואה חשבון', 'חשבונאי',     // accountant
    'מאמן', 'קואצ', 'coach',      // coach
    'פיזיותרפ',                  // physiotherapist
    'רופא שיניים', 'שיניים',     // dentist
    'קוסמט', 'אסתט',             // aesthetic-doctor
    'מרפאה', 'קליניקה',          // clinic
    'עורך דין', 'עו"ד', 'משפט',  // lawyer
    'אדריכל',                    // architect
  ],
};

/**
 * Classifies a Hebrew category/vertical label into VISION.md's routing
 * archetype. First keyword match wins; if a category string happens to
 * match both lists (not expected given the source lists don't overlap),
 * micro-smb is checked first since it's the more common Grade-A inbound.
 * @param {string} category Hebrew vertical label
 * @returns {{ archetype: Archetype, gradeTier?: GradeTier }}
 */
export function classifyVertical(category) {
  const value = (category || '').toLowerCase();

  const gradeTier = GRADE_A_KEYWORDS.some(kw => value.includes(kw.toLowerCase()))
    ? 'grade-a'
    : undefined;

  if (ARCHETYPE_KEYWORDS['micro-smb'].some(kw => value.includes(kw.toLowerCase()))) {
    return { archetype: 'micro-smb', ...(gradeTier ? { gradeTier } : {}) };
  }
  if (ARCHETYPE_KEYWORDS['content-ready-smb'].some(kw => value.includes(kw.toLowerCase()))) {
    return { archetype: 'content-ready-smb', ...(gradeTier ? { gradeTier } : {}) };
  }
  return { archetype: 'unclassified', ...(gradeTier ? { gradeTier } : {}) };
}
