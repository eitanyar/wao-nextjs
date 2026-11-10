/**
 * Intake credentials step (docs/missions/site-bot-code-owns-facts-2026-11-10.md, "Intake credentials step", Eitan approved
 * 2026-11-10): one optional, skippable step after the 3 intake questions. Years in the trade (a number), the licence (only
 * for licensed trades) and the warranty (chips). The answers land in the existing CollectedData fields yearsInField /
 * license / guarantee (buildIntakeCollectedData), so the code-owned trust bar and proof fill on real sites.
 *
 * HEBREW-SAFETY: the only Hebrew in this module is CREDENTIALS_STEP_SOURCE, written byte-exact by
 * scripts/apply-credentials-copy.mjs from docs/copy/site-bot-credentials-step-2026-11-10.json (Tamar -> Noa),
 * docs/copy/site-bot-licensed-trades-2026-11-10.json (Yonatan -> Noa) and the fact templates' parseNegationWords and
 * contractor* strings (Noa r3). The engineer never authors it. Pure and browser-safe.
 */
import type { CollectedData } from '../bot/prompts';
import { contractorLicenseValue } from './contractorRegistration';

export type CredentialsCopyKey =
  | 'stepIntro' | 'yearsQuestion' | 'yearsPlaceholder' | 'licenseQuestion' | 'licenseYes' | 'licenseNo' | 'licenseTypePrompt'
  | 'licenseTypePlaceholder' | 'warrantyQuestion' | 'warrantyNone' | 'warrantySixMonths' | 'warrantyOneYear' | 'warrantyTwoYears'
  | 'warrantyOther' | 'warrantyOtherPlaceholder' | 'continueButton' | 'skipButton'
  // Noa r3 (from the fact template file): the contractor tier's licence wording.
  | 'contractorLicenseQuestion' | 'contractorLicenseYes' | 'contractorLicenseNo' | 'contractorLicenseTypePrompt' | 'contractorLicenseTypePlaceholder';

export interface CredentialsStepSource {
  copy: Record<CredentialsCopyKey, string>;
  trades: { licenseExclude: string[]; licensedTrades: string[]; contractorKeywords: string[] };
  negationWords: string[];
}

// BEGIN CREDENTIALS_STEP_SOURCE (written by scripts/apply-credentials-copy.mjs; never hand-edit)
export const CREDENTIALS_STEP_SOURCE: CredentialsStepSource = {
  "copy": {
    "stepIntro": "עוד כמה שאלות קצרות, לא חובה. התשובות מופיעות באתר שלך — ככה הלקוח רואה ניסיון ואחריות, ומרגיש ביטחון.",
    "yearsQuestion": "כמה שנים אתה במקצוע?",
    "yearsPlaceholder": "למשל: 12",
    "licenseQuestion": "יש לך רישיון מקצועי?",
    "licenseYes": "כן, יש לי",
    "licenseNo": "אין לי",
    "licenseTypePrompt": "איזה רישיון? כתוב את השם או המספר.",
    "licenseTypePlaceholder": "למשל: שם הרישיון ומספרו",
    "warrantyQuestion": "איזו אחריות אתה נותן על העבודה?",
    "warrantyNone": "ללא אחריות",
    "warrantySixMonths": "חצי שנה",
    "warrantyOneYear": "שנה",
    "warrantyTwoYears": "שנתיים",
    "warrantyOther": "אחר",
    "warrantyOtherPlaceholder": "למשל: 3 שנים על העבודה",
    "continueButton": "שמור והמשך",
    "skipButton": "לא עכשיו",
    "contractorLicenseQuestion": "אתה קבלן רשום?",
    "contractorLicenseYes": "כן, אני רשום",
    "contractorLicenseNo": "לא",
    "contractorLicenseTypePrompt": "באיזה ענף וסיווג אתה רשום?",
    "contractorLicenseTypePlaceholder": "למשל: ענף 100, סיווג ג1"
  },
  "trades": {
    "licenseExclude": [
      "קוסמטיק",
      "מכון יופי",
      "מכון לייזר",
      "הסרת שיער",
      "פילינג",
      "אנטי אייג",
      "אנטי-אייג",
      "אנטיאייג",
      "אירופא",
      "רופא עצים",
      "רופא מחשב",
      "רופא טלפונ",
      "רופא פלאפונ",
      "חשמלאי רכב",
      "חשמלאי לרכב",
      "חשמל רכב",
      "חשמלאות רכב",
      "חשמלאות לרכב",
      "גזיבו",
      "גז למזג",
      "גז מזגנ",
      "יועץ מסע",
      "יועצת מסע",
      "יועץ מסח",
      "יועצת מסח",
      "ייעוץ מסע",
      "ייעוץ מסח",
      "יעוץ מסע",
      "יעוץ מסח",
      "תיווך עסקים",
      "מתווך עסקים",
      "מתווכת עסקים",
      "תיווך משכנתא",
      "מתווך משכנתא",
      "מתווכת משכנתא",
      "קבלן ניקיון",
      "קבלני ניקיון",
      "קבלן כוח אדם",
      "קבלן כח אדם",
      "קבלני כוח אדם",
      "קבלן הסעות",
      "קבלן אירועים"
    ],
    "licensedTrades": [
      "חשמלאי",
      "חשמלאות",
      "עבודות חשמל",
      "טכנאי חשמל",
      "הנדסאי חשמל",
      "טכנאי גז",
      "טכנאית גז",
      "גז ביתי",
      "התקנת גז",
      "התקנות גז",
      "מתקין גז",
      "צנרת גז",
      "בודק גז",
      "בדיקת גז",
      "מדביר",
      "הדברה",
      "הדברת",
      "הדברות",
      "רופא",
      "מרפאת שיניים",
      "אורתודונט",
      "דרמטולוג",
      "בוטוקס",
      "פסיכיאטר",
      "עורך דין",
      "עורכת דין",
      "עורכי דין",
      "עו\"ד",
      "עו״ד",
      "נוטריון",
      "רואה חשבון",
      "רואת חשבון",
      "רואי חשבון",
      "ראיית חשבון",
      "ראית חשבון",
      "רו\"ח",
      "רו״ח",
      "יועץ מס",
      "יועצת מס",
      "יועצי מס",
      "ייעוץ מס",
      "יעוץ מס",
      "סוכן ביטוח",
      "סוכנת ביטוח",
      "סוכני ביטוח",
      "סוכנות ביטוח",
      "סוכנות לביטוח",
      "יועץ ביטוח",
      "יועצת ביטוח",
      "יועץ פנסיוני",
      "יועצת פנסיונית",
      "סוכן פנסיוני",
      "יועץ השקעות",
      "יועצת השקעות",
      "ייעוץ השקעות",
      "יעוץ השקעות",
      "מנהל השקעות",
      "מנהלת השקעות",
      "ניהול השקעות",
      "תיקי השקעות",
      "שיווק השקעות",
      "משווק השקעות",
      "בית השקעות",
      "מתווך",
      "מתווכת",
      "תיווך",
      "סוכן נדל",
      "סוכנת נדל",
      "פסיכולוג",
      "תזונאי",
      "דיאטן",
      "עובד סוציאלי",
      "עובדת סוציאלית",
      "עובדים סוציאליים",
      "עו\"ס",
      "עו״ס",
      "מורה נהיגה",
      "מורה לנהיגה",
      "מורת נהיגה",
      "בית ספר לנהיגה",
      "בית ספר נהיגה",
      "בי\"ס לנהיגה",
      "בי״ס לנהיגה",
      "שיעורי נהיגה",
      "לימודי נהיגה",
      "לימוד נהיגה"
    ],
    "contractorKeywords": [
      "קבלן",
      "קבלנ"
    ]
  },
  "negationWords": [
    "אין",
    "ללא",
    "בלי",
    "לא",
    "עדיין לא"
  ]
};
// END CREDENTIALS_STEP_SOURCE

export const CREDENTIALS_COPY = CREDENTIALS_STEP_SOURCE.copy;

/** Which licence wording a niche gets: licensed trades, contractors ("registered contractor?"), or none (never asked). */
export type CredentialTier = 'licensed' | 'contractor' | 'none';

/**
 * The tier of a businessNiche: substring match in the order licenseExclude -> licensedTrades -> contractorKeywords
 * (docs/copy/site-bot-licensed-trades-2026-11-10.json `_matching`). Case-folded for the Latin letters some niches carry.
 */
export function credentialTier(niche: string | undefined, source: CredentialsStepSource = CREDENTIALS_STEP_SOURCE): CredentialTier {
  const text = (niche ?? '').normalize('NFC').toLowerCase();
  if (!text.trim()) return 'none';
  const has = (list: readonly string[]) => list.some(token => token && text.includes(token.normalize('NFC').toLowerCase()));
  if (has(source.trades.licenseExclude)) return 'none';
  if (has(source.trades.licensedTrades)) return 'licensed';
  if (has(source.trades.contractorKeywords)) return 'contractor';
  return 'none';
}

/**
 * The contractor wording ("registered contractor?", Yonatan's research): Noa r3 supplied it (the contractor* keys of the
 * fact template file). While pending, contractors saw no licence question (never the generic licence wording).
 */
export const CONTRACTOR_LICENSE_WORDING_PENDING = false;

/** The five licence strings a niche sees: the contractor wording for the contractor tier, else the licence wording. */
export interface LicenseQuestionCopy {
  question: string;
  yes: string;
  no: string;
  typePrompt: string;
  typePlaceholder: string;
}

export function licenseQuestionCopy(niche: string | undefined, source: CredentialsStepSource = CREDENTIALS_STEP_SOURCE): LicenseQuestionCopy {
  const copy = source.copy;
  return credentialTier(niche, source) === 'contractor'
    ? { question: copy.contractorLicenseQuestion, yes: copy.contractorLicenseYes, no: copy.contractorLicenseNo, typePrompt: copy.contractorLicenseTypePrompt, typePlaceholder: copy.contractorLicenseTypePlaceholder }
    : { question: copy.licenseQuestion, yes: copy.licenseYes, no: copy.licenseNo, typePrompt: copy.licenseTypePrompt, typePlaceholder: copy.licenseTypePlaceholder };
}

/** True when the licence questions render for this niche. */
export function showsLicenseQuestions(niche: string | undefined, source: CredentialsStepSource = CREDENTIALS_STEP_SOURCE): boolean {
  const tier = credentialTier(niche, source);
  return tier === 'licensed' || (tier === 'contractor' && !CONTRACTOR_LICENSE_WORDING_PENDING);
}

export type WarrantyChoice = 'none' | 'sixMonths' | 'oneYear' | 'twoYears' | 'other';
export const WARRANTY_CHOICES: readonly WarrantyChoice[] = ['none', 'sixMonths', 'oneYear', 'twoYears', 'other'];
export const WARRANTY_CHOICE_COPY_KEY: Readonly<Record<WarrantyChoice, CredentialsCopyKey>> = {
  none: 'warrantyNone', sixMonths: 'warrantySixMonths', oneYear: 'warrantyOneYear', twoYears: 'warrantyTwoYears', other: 'warrantyOther',
};

/** What a "no warranty" answer stores (code, never the chip label): ownerFacts reads it as a negation, so no fact renders. */
export const NO_WARRANTY_VALUE = 'no warranty';
/**
 * Picker durations stored as code values (never the chip labels): the fact parser reads them as a bare duration with no
 * scope tail, so they always produce the unscoped warranty proof.
 */
export const WARRANTY_PICKER_VALUES: Readonly<Record<'sixMonths' | 'oneYear' | 'twoYears', string>> = {
  sixMonths: '6 months', oneYear: '1 year', twoYears: '2 years',
};

/** Years accepted from the number field (ownerFacts' own cap). */
export const CREDENTIALS_YEARS_MAX = 70;
/** Longest free text kept from the licence / warranty "other" fields (ownerFacts drops longer verbatim text anyway). */
export const CREDENTIALS_TEXT_MAX_CHARS = 60;

export interface CredentialsAnswers {
  years?: string;
  license?: 'yes' | 'no';
  licenseText?: string;
  warranty?: WarrantyChoice;
  warrantyOther?: string;
}

/** True when a typed answer opens with a negation word (the fact templates' parseNegationWords, or English in code). */
export function opensWithNegationWord(value: string, source: CredentialsStepSource = CREDENTIALS_STEP_SOURCE): boolean {
  const text = value.normalize('NFC').trim();
  if (!text) return false;
  const boundary = '(?![\\u05D0-\\u05EAA-Za-z])';
  const escape = (token: string) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (source.negationWords.some(token => token.trim() && new RegExp(`^${escape(token.normalize('NFC').trim())}${boundary}`, 'iu').test(text))) return true;
  return !/\d/.test(text) && /^(no|none|not|without|n\/a)(?![A-Za-z.])/i.test(text);
}

function clean(value: string | undefined): string {
  return (value ?? '').replace(/[⁦-⁩]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * The CollectedData fields one credentials answer set writes (absent = not given). A skipped step writes nothing.
 * - years: a whole number 1..CREDENTIALS_YEARS_MAX, stored as digits;
 * - licence: only when the questions render for the niche and the owner said yes. Licensed trades: a typed text that is
 *   not a "no". Contractors (Noa r3): the code value of contractorRegistration.ts (yes alone counts; the typed branch /
 *   class detail rides along and is guarded at render time, never here);
 * - warranty: none -> NO_WARRANTY_VALUE; a picker duration -> its code value; other -> the typed text, or
 *   NO_WARRANTY_VALUE when the typed text opens with a negation word.
 */
export function credentialsCollectedFields(
  answers: CredentialsAnswers | undefined,
  niche: string | undefined,
  source: CredentialsStepSource = CREDENTIALS_STEP_SOURCE,
): Pick<CollectedData, 'yearsInField' | 'license' | 'guarantee'> {
  const out: Pick<CollectedData, 'yearsInField' | 'license' | 'guarantee'> = {};
  if (!answers) return out;
  const years = clean(answers.years);
  if (/^\d{1,2}$/.test(years) && Number(years) >= 1 && Number(years) <= CREDENTIALS_YEARS_MAX) out.yearsInField = String(Number(years));
  const license = clean(answers.licenseText).slice(0, CREDENTIALS_TEXT_MAX_CHARS).trim();
  if (showsLicenseQuestions(niche, source) && answers.license === 'yes') {
    if (credentialTier(niche, source) === 'contractor') out.license = contractorLicenseValue(license);
    else if (license && !opensWithNegationWord(license, source)) out.license = license;
  }
  const choice = answers.warranty;
  if (choice === 'none') out.guarantee = NO_WARRANTY_VALUE;
  else if (choice === 'sixMonths' || choice === 'oneYear' || choice === 'twoYears') out.guarantee = WARRANTY_PICKER_VALUES[choice];
  else if (choice === 'other') {
    const typed = clean(answers.warrantyOther).slice(0, CREDENTIALS_TEXT_MAX_CHARS).trim();
    if (typed) out.guarantee = opensWithNegationWord(typed, source) ? NO_WARRANTY_VALUE : typed;
  }
  return out;
}
