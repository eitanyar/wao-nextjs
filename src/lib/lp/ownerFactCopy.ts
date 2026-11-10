/**
 * Copy v2 slice 1 (docs/missions/site-bot-code-owns-facts-2026-11-10.md): code owns the owner facts. The trust bar and the
 * B6 proof items are built here from the owner's answers through fixed templates; the model never writes them (slice 2
 * wires this in, only while the templates are complete).
 *
 * Owner facts that arrive as free text (any language):
 * - numbers are parsed and rendered through a template: years (digits), response time (minutes / hours), warranty duration
 *   (the fixed set 6 months / 1 year / 2 years / N years), rating and review count;
 * - text that is not a number renders only verbatim, only when it is mostly Hebrew (isMostlyHebrew) and within the length
 *   cap: the licence wording and a warranty that cannot be parsed. English non-numeric text is dropped (never translated)
 *   and, in slice 2, never shown to the model as a fact (droppedOwnerFactKeys).
 *
 * HEBREW-SAFETY: the only Hebrew in this module is OWNER_FACT_TEMPLATES, written byte-exact by
 * scripts/apply-fact-templates.mjs from the Tamar -> Noa file docs/copy/site-bot-fact-templates-2026-11-10.json; the engineer
 * never authors it. While that file is missing or incomplete, the constant holds `__HE_TODO_<key>__` placeholders,
 * FACT_TEMPLATES_PENDING_COPY is true, and generation keeps today's model-written path (nothing here reaches a page).
 */
import type { CollectedData } from '../bot/prompts';
import type { PageBrief } from '../site-bot/research/pageBrief';
import { buildAreaTile, codePointLength, isMostlyHebrew } from './copyGates';
import { DEPTH_BLOCK_LIMITS, wordCount, type DepthProofItem } from './depthBlocks';
import { FIX_TIME_LEAD_TOKENS, TRUST_BAR_MAX_CHARS, TRUST_BAR_MAX_ITEMS } from './generationData';
import { PREFIX_LETTERS } from './hebrewPrefixLetters';
import { HE_TODO_PREFIX } from './researchedSiteLabels';
import { parseContractorLicense } from '../site-bot/contractorRegistration';

/** The template file the apply script reads (Tamar -> Noa). */
export const FACT_TEMPLATES_SOURCE = 'docs/copy/site-bot-fact-templates-2026-11-10.json';

/**
 * Template strings: key -> the slots the patched text must carry (every slot, and no other). A key with no slots is a
 * fixed phrase. Trust items must fit TRUST_BAR_MAX_CHARS once filled; proof items are full first-person sentences.
 * Noa's code rules (2026-11-10, with the templates): branch on n / count (One / Two / N keys), never fill a same-day answer
 * into a duration slot, proofLicense only for licence text that opens with a document noun, verbatim slots lose their
 * trailing punctuation (the template closes the sentence), verbatim / licence-number chips at most VERBATIM_CHIP_MAX_CHARS.
 */
export const FACT_TEMPLATE_SLOTS = {
  // Trust bar (bare noun phrases).
  /** "{n} years in the trade" (n >= 3; the single site term). */
  trustYears: ['{n}'],
  /** "one year in the trade" (n = 1). */
  trustYearsOne: [],
  /** "two years in the trade" (n = 2, dual form). */
  trustYearsTwo: [],
  /** The owner's Hebrew licence wording, verbatim. */
  trustLicense: ['{license}'],
  /** "licence no. {number}" when the owner gave only a number. */
  trustLicenseNumber: ['{number}'],
  /** "{duration} warranty", bare form (C4); {duration} from the warrantyBare* set. */
  trustWarranty: ['{duration}'],
  /** A Hebrew warranty answer the parser could not read, verbatim. */
  trustWarrantyVerbatim: ['{warranty}'],
  /** "arrives within {time}"; {time} from the response* set (never the same-day phrase). */
  trustResponse: ['{time}'],
  /** "arrives the same day" (a same-day answer). */
  trustResponseSameDay: [],
  /** "{rating} stars from {count} reviews" (count >= 2). */
  trustRating: ['{rating}', '{count}'],
  /** "{rating} stars from one review" (count = 1). */
  trustRatingOneReview: ['{rating}'],
  /** "{rating} stars" (a rating with no review count). */
  trustRatingNoCount: ['{rating}'],
  // B6 proof items (full sentences, first person singular).
  proofYears: ['{n}'],
  proofYearsOne: [],
  proofYearsTwo: [],
  /** "I have {license}." Only for licence text that opens with a document noun (LICENSE_DOCUMENT_NOUNS). */
  proofLicense: ['{license}'],
  /** "{license}." Any other Hebrew licence text. */
  proofLicenseVerbatim: ['{license}'],
  proofLicenseNumber: ['{number}'],
  /** Warranty sentence with the lamed form (C4); {duration} from the warrantyLamed* set. */
  proofWarranty: ['{duration}'],
  proofWarrantyVerbatim: ['{warranty}'],
  proofResponse: ['{time}'],
  proofResponseSameDay: [],
  // Warranty durations: bare (trust bar) and with lamed (proof sentence). Months 1 / 2 / 6 and years 1 / 1.5 / 2 have their
  // own forms; other whole years are NYears, other months NMonths.
  warrantyBareOneMonth: [],
  warrantyBareTwoMonths: [],
  warrantyBareNMonths: ['{n}'],
  warrantyBareSixMonths: [],
  warrantyBareOneYear: [],
  warrantyBareOneAndHalfYears: [],
  warrantyBareTwoYears: [],
  warrantyBareNYears: ['{n}'],
  warrantyLamedOneMonth: [],
  warrantyLamedTwoMonths: [],
  warrantyLamedNMonths: ['{n}'],
  warrantyLamedSixMonths: [],
  warrantyLamedOneYear: [],
  warrantyLamedOneAndHalfYears: [],
  warrantyLamedTwoYears: [],
  warrantyLamedNYears: ['{n}'],
  // Response times (the {time} slot of trustResponse / proofResponse).
  responseOneMinute: [],
  responseMinutes: ['{n}'],
  responseHalfHour: [],
  responseOneHour: [],
  responseTwoHours: [],
  responseHours: ['{n}'],
  // Noa r2 (2026-11-10). A warranty with a scope tail ("{duration} on repairs"): the owner's tail verbatim.
  /** "There is a {duration} warranty {scope}." {duration} from the warrantyLamed* set; {scope} the owner's tail. */
  proofWarrantyScoped: ['{duration}', '{scope}'],
  /** Arrival with a place tail (Adam: a place-scoped response gets only this proof, no trust chip). */
  proofResponseScoped: ['{time}', '{scope}'],
  proofResponseSameDayScoped: ['{scope}'],
  /** Adam: the intake asks how fast the owner CALLS BACK, so the response fact renders with the callback set. */
  trustCallback: ['{time}'],
  trustCallbackSameDay: [],
  proofCallback: ['{time}'],
  proofCallbackSameDay: [],
  /** Slice 6: the code-built lead in front of a model-written Q&A answer ("At {business} in {city}:"). */
  qaAnswerLead: ['{business}', '{city}'],
  /**
   * Noa r3: the Q&A answer to an arrival-shaped (or neutral) response question when the owner fact is a callback time:
   * "I will call you back within {time} and set an arrival time with you." It never states an arrival time.
   */
  proofCallbackArrival: ['{time}'],
  proofCallbackArrivalSameDay: [],
  /** Noa r3: the contractor tier ("registered contractor"): chip, proof, and proof with the owner's branch / class detail. */
  trustContractorRegistered: [],
  proofContractorRegistered: [],
  proofContractorRegisteredDetail: ['{detail}'],
} as const satisfies Record<string, readonly string[]>;

export type FactTemplateKey = keyof typeof FACT_TEMPLATE_SLOTS;

/**
 * Parse token lists (Hebrew words the parser needs to read a Hebrew owner answer; each list non-empty). Matched as whole
 * words, with at most ONE attached prefix letter stripped (the letters the lexicon itself attaches; parsePrefixLetters).
 * English unit words are parsed in code (ASCII).
 */
export const FACT_PARSE_TOKEN_KEYS = [
  /** Minutes, with a number ("20 minutes"). */
  'parseMinuteWords',
  /** Hours, plural, with a number ("3 hours"). */
  'parseHourWords',
  /** "an hour" (one word, no number; counts only right after a "within" word). */
  'parseOneHourWords',
  /** "two hours" (dual form, no number). */
  'parseTwoHourWords',
  /** "half an hour". */
  'parseHalfHourWords',
  /** Months, with a number ("6 months"). */
  'parseMonthWords',
  /** "a month" (no number). */
  'parseOneMonthWords',
  /** "two months" (dual form, no number). */
  'parseTwoMonthWords',
  /** Years, with a number ("3 years"; the singular form used after numbers above 10 too). */
  'parseYearWords',
  /** "a year" (one word, no number). */
  'parseOneYearWords',
  /** "a year and a half". */
  'parseOneAndHalfYearWords',
  /** "two years" (dual form, no number). */
  'parseTwoYearWords',
  /** "half a year". */
  'parseHalfYearWords',
  /** Words that may stand next to a licence number in a number-only answer ("no.", "number", "licence"). */
  'parseLicenseNumberWords',
  /** A response answer that means "the same day". */
  'parseSameDayWords',
] as const;

export type FactParseTokenKey = (typeof FACT_PARSE_TOKEN_KEYS)[number];

/**
 * Noa r2 rule lists (2026-11-10). Unlike FACT_PARSE_TOKEN_KEYS they are matched as whole words with NO prefix stripping,
 * and they are kept out of parsePrefixLetters (which reads FACT_PARSE_TOKEN_KEYS only).
 */
export const FACT_RULE_TOKEN_KEYS = [
  /** The warranty noun, removed before the scope test. */
  'parseWarrantyWords',
  /** The standalone preposition a warranty scope tail opens with. */
  'warrantyScopeLeadWords',
  /** Words ignored before a warranty scope tail / a response place tail. */
  'parseFillerWords',
  /** An answer opening with one of these is a "no": no guarantee / licence fact. */
  'parseNegationWords',
  /** Approximate / conditional answers: no code-rendered number (years, warranty, response). */
  'parseHedgeWords',
  /** Response only: "up to" leads that let a bare hour / minute word (the last word) count. Hedges for warranty / years. */
  'parseWithinWords',
  /** proofLicense only when the licence text's first word equals one of these exactly. */
  'licenseDocumentNouns',
  /** The attached letter a response place tail opens with. */
  'responseScopeLeadLetters',
  /** Slice 6: cost / price question tokens (buildQuestionPool). */
  'costQuestionTokens',
] as const;

export type FactRuleTokenKey = (typeof FACT_RULE_TOKEN_KEYS)[number];

/** Template keys the loader accepts but never requires (absent = not used). responseSameDay is never a {time} value. */
export const FACT_OPTIONAL_TEMPLATE_KEYS = [
  'responseSameDay',
] as const;
export type FactOptionalTemplateKey = (typeof FACT_OPTIONAL_TEMPLATE_KEYS)[number];

/**
 * Copy v2 slice 6: optional Noa question-topic lists (qaCodeOwned.ts). Absent = the topic falls back to the restatement
 * spec's lists (licence, warranty, years) or stays undetected (callback / response). Copied when present, never required.
 */
export const FACT_OPTIONAL_LIST_KEYS = [
  'qaLicenseQuestionTokens',
  'qaResponseQuestionTokens',
  'qaWarrantyQuestionTokens',
  'qaYearsQuestionTokens',
  // Noa r3 (qaCodeOwned.ts `_rules._matching`): per-topic exclude lists (consulted only for the detected topic; they never
  // create one), the response shape lists, the availability drop list and the conditional price / warranty-scope lists.
  'qaResponseQuestionExcludeTokens',
  'qaResponseCallbackShapeTokens',
  'qaResponseArrivalShapeTokens',
  'qaAvailabilityQuestionTokens',
  'qaPriceQuestionExcludeTokens',
  'qaPriceCalloutQuestionTokens',
  'qaPriceSurchargeQuestionTokens',
  'qaLicenseQuestionExcludeTokens',
  'qaYearsQuestionExcludeTokens',
  'qaWarrantyQuestionExcludeTokens',
  'qaWarrantyScopeQuestionTokens',
] as const;
export type FactOptionalListKey = (typeof FACT_OPTIONAL_LIST_KEYS)[number];

export type OwnerFactTemplates = Readonly<Record<FactTemplateKey, string> & Record<FactParseTokenKey | FactRuleTokenKey, readonly string[]> & Partial<Record<FactOptionalTemplateKey, string>> & Partial<Record<FactOptionalListKey, readonly string[]>>>;

/** Every key the template file must hold, in file order (templates, then parse token lists, then the r2 rule lists). */
export const FACT_TEMPLATE_KEYS: readonly string[] = [...Object.keys(FACT_TEMPLATE_SLOTS), ...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS];

// BEGIN OWNER_FACT_TEMPLATES (written by scripts/apply-fact-templates.mjs from FACT_TEMPLATES_SOURCE; never hand-edit)
export const OWNER_FACT_TEMPLATES: OwnerFactTemplates = {
  "trustYears": "{n} שנים במקצוע",
  "trustYearsOne": "שנה במקצוע",
  "trustYearsTwo": "שנתיים במקצוע",
  "trustLicense": "{license}",
  "trustLicenseNumber": "רישיון מס׳ {number}",
  "trustWarranty": "אחריות {duration}",
  "trustWarrantyVerbatim": "{warranty}",
  "trustResponse": "הגעה תוך {time}",
  "trustResponseSameDay": "הגעה באותו יום",
  "trustRating": "{rating} ★ · {count} ביקורות",
  "trustRatingOneReview": "{rating} ★ · ביקורת אחת",
  "trustRatingNoCount": "{rating} ★",
  "proofYears": "אני במקצוע כבר {n} שנים.",
  "proofYearsOne": "אני במקצוע כבר שנה.",
  "proofYearsTwo": "אני במקצוע כבר שנתיים.",
  "proofLicense": "יש לי {license}.",
  "proofLicenseVerbatim": "{license}.",
  "proofLicenseNumber": "יש לי רישיון מס׳ {number}.",
  "proofWarranty": "יש אחריות {duration} על העבודה שלי.",
  "proofWarrantyVerbatim": "{warranty}.",
  "proofResponse": "אני אצלך תוך {time}.",
  "proofResponseSameDay": "אני אצלך עוד באותו יום.",
  "warrantyBareOneMonth": "חודש",
  "warrantyBareTwoMonths": "חודשיים",
  "warrantyBareNMonths": "{n} חודשים",
  "warrantyBareSixMonths": "חצי שנה",
  "warrantyBareOneYear": "שנה",
  "warrantyBareOneAndHalfYears": "שנה וחצי",
  "warrantyBareTwoYears": "שנתיים",
  "warrantyBareNYears": "{n} שנים",
  "warrantyLamedOneMonth": "לחודש",
  "warrantyLamedTwoMonths": "לחודשיים",
  "warrantyLamedNMonths": "ל־{n} חודשים",
  "warrantyLamedSixMonths": "לחצי שנה",
  "warrantyLamedOneYear": "לשנה",
  "warrantyLamedOneAndHalfYears": "לשנה וחצי",
  "warrantyLamedTwoYears": "לשנתיים",
  "warrantyLamedNYears": "ל־{n} שנים",
  "responseOneMinute": "דקה",
  "responseMinutes": "{n} דקות",
  "responseHalfHour": "חצי שעה",
  "responseOneHour": "שעה",
  "responseTwoHours": "שעתיים",
  "responseHours": "{n} שעות",
  "proofWarrantyScoped": "יש אחריות {duration} {scope}.",
  "proofResponseScoped": "אני אצלך תוך {time} {scope}.",
  "proofResponseSameDayScoped": "אני אצלך עוד באותו יום {scope}.",
  "trustCallback": "מענה תוך {time}",
  "trustCallbackSameDay": "מענה באותו יום",
  "proofCallback": "אחזור אליך תוך {time}.",
  "proofCallbackSameDay": "אחזור אליך עוד באותו יום.",
  "qaAnswerLead": "אצל {business} ב{city}:",
  "proofCallbackArrival": "אחזור אליך תוך {time} ואתאם איתך מועד הגעה.",
  "proofCallbackArrivalSameDay": "אחזור אליך עוד באותו יום ואתאם איתך מועד הגעה.",
  "trustContractorRegistered": "קבלן רשום",
  "proofContractorRegistered": "יש לי רישום בפנקס הקבלנים.",
  "proofContractorRegisteredDetail": "יש לי רישום בפנקס הקבלנים, {detail}.",
  "parseMinuteWords": [
    "דקות",
    "דקה",
    "דק׳",
    "דק'"
  ],
  "parseHourWords": [
    "שעות",
    "שעה",
    "שע׳",
    "שע'"
  ],
  "parseOneHourWords": [
    "שעה"
  ],
  "parseTwoHourWords": [
    "שעתיים"
  ],
  "parseHalfHourWords": [
    "חצי שעה"
  ],
  "parseMonthWords": [
    "חודשים",
    "חודש"
  ],
  "parseOneMonthWords": [
    "חודש",
    "לחודש"
  ],
  "parseTwoMonthWords": [
    "חודשיים",
    "לחודשיים"
  ],
  "parseYearWords": [
    "שנים",
    "שנה"
  ],
  "parseOneYearWords": [
    "שנה",
    "לשנה"
  ],
  "parseOneAndHalfYearWords": [
    "שנה וחצי",
    "לשנה וחצי"
  ],
  "parseTwoYearWords": [
    "שנתיים",
    "לשנתיים"
  ],
  "parseHalfYearWords": [
    "חצי שנה",
    "לחצי שנה"
  ],
  "parseLicenseNumberWords": [
    "מס׳",
    "מס'",
    "מס.",
    "מס",
    "מספר"
  ],
  "parseSameDayWords": [
    "באותו יום",
    "אותו יום",
    "באותו היום",
    "עוד באותו יום",
    "עוד היום",
    "עד סוף היום",
    "ביום הפנייה",
    "ביום הקריאה"
  ],
  "parseWarrantyWords": [
    "אחריות"
  ],
  "warrantyScopeLeadWords": [
    "על"
  ],
  "parseFillerWords": [
    "יש",
    "של",
    "כן",
    "אני",
    "נותן",
    "נותנת",
    "מגיע",
    "מגיעה",
    "הגעה",
    "זמן"
  ],
  "parseNegationWords": [
    "אין",
    "ללא",
    "בלי",
    "לא",
    "עדיין לא"
  ],
  "parseHedgeWords": [
    "בערך",
    "בסביבות",
    "סביב",
    "בקירוב",
    "משהו כמו",
    "פחות או יותר",
    "כמעט",
    "בדרך כלל",
    "בד״כ",
    "בד\"כ",
    "לרוב",
    "בממוצע",
    "תלוי",
    "לפעמים",
    "כ־",
    "כ-"
  ],
  "parseWithinWords": [
    "עד",
    "לכל היותר",
    "מקסימום"
  ],
  "licenseDocumentNouns": [
    "רישיון",
    "רשיון",
    "רישיונות",
    "תעודה",
    "תעודת",
    "תעודות",
    "הסמכה",
    "הסמכת",
    "הסמכות",
    "היתר",
    "היתרים",
    "אישור",
    "אישורים",
    "רישום",
    "תואר"
  ],
  "responseScopeLeadLetters": [
    "ב"
  ],
  "costQuestionTokens": [
    "מחיר",
    "המחיר",
    "מחירים",
    "המחירים",
    "במחיר",
    "מחירון",
    "הצעת מחיר",
    "מה המחיר",
    "עלות",
    "העלות",
    "עלויות",
    "תעריף",
    "התעריף",
    "תעריפים",
    "כמה עולה",
    "כמה עולים",
    "כמה עולות",
    "כמה זה עולה",
    "כמה יעלה",
    "כמה זה יעלה",
    "כמה תעלה",
    "כמה לוקחים",
    "כמה אתה לוקח",
    "כמה את לוקחת",
    "כמה גובים",
    "כמה צריך לשלם",
    "יקר",
    "זול",
    "תקציב",
    "₪",
    "ש״ח",
    "שקל",
    "שקלים"
  ],
  "responseSameDay": "אותו יום",
  "qaLicenseQuestionTokens": [
    "רישיון",
    "רשיון",
    "רישיונות",
    "מוסמך",
    "מוסמכת",
    "מוסמכים",
    "הסמכה",
    "קבלן רשום",
    "קבלנים רשומים",
    "רשם הקבלנים",
    "פנקס הקבלנים",
    "סיווג קבלני",
    "חשמלאי ראשי",
    "חשמלאי מוסמך",
    "חשמלאי מעשי",
    "הנדסאי",
    "מהנדס חשמל"
  ],
  "qaResponseQuestionTokens": [
    "כמה מהר",
    "תוך כמה זמן",
    "בתוך כמה זמן",
    "תוך כמה דקות",
    "תוך כמה שעות",
    "אחרי כמה זמן",
    "כמה זמן לוקח להגיע",
    "כמה זמן לוקח לך להגיע",
    "כמה זמן לוקח לכם להגיע",
    "כמה זמן עד שמגיעים",
    "כמה זמן עד שאתה מגיע",
    "כמה זמן עד שאתם מגיעים",
    "כמה זמן עד שחוזרים",
    "כמה זמן מחכים",
    "כמה צריך לחכות",
    "כמה לחכות",
    "מתי תגיע",
    "מתי תגיעו",
    "מתי אתה מגיע",
    "מתי אתם מגיעים",
    "מתי מגיעים",
    "מתי יגיע",
    "מתי יגיעו",
    "מתי תחזור",
    "מתי תחזרו",
    "מתי חוזרים",
    "מתי עונים",
    "מגיע מהר",
    "מגיעים מהר",
    "להגיע מהר",
    "תגיע מהר",
    "תגיעו מהר",
    "חוזרים מהר",
    "עונים מהר",
    "מגיע היום",
    "מגיעים היום",
    "להגיע היום",
    "תגיע היום",
    "תגיעו היום",
    "עוד היום",
    "כבר היום",
    "באותו יום",
    "באותו היום",
    "עוד באותו יום",
    "זמן הגעה",
    "זמני הגעה",
    "זמן תגובה",
    "זמני תגובה",
    "זמן מענה",
    "זמני מענה",
    "מענה מהיר",
    "הגעה מהירה",
    "שירות מהיר",
    "דחוף",
    "דחופה",
    "דחופים",
    "בדחיפות"
  ],
  "qaWarrantyQuestionTokens": [
    "אחריות",
    "גרנטי",
    "התקלה חוזרת",
    "התקלה תחזור",
    "יתקלקל שוב",
    "תתקלקל שוב",
    "שוב אותה תקלה"
  ],
  "qaYearsQuestionTokens": [
    "שנים במקצוע",
    "שנים בתחום",
    "שנים בענף",
    "שנות ניסיון",
    "כמה ניסיון",
    "ניסיון",
    "ותק",
    "וותק",
    "מנוסה",
    "מנוסים",
    "כמה זמן אתה בתחום",
    "כמה זמן אתם בתחום",
    "כמה זמן אתה במקצוע",
    "כמה זמן אתם במקצוע",
    "כמה שנים אתה",
    "כמה שנים אתם"
  ],
  "qaResponseQuestionExcludeTokens": [
    "מסיימים",
    "לסיים",
    "תסיים",
    "תסיימו",
    "מסתיים",
    "מסתיימת",
    "נגמר",
    "נגמרת",
    "גומרים",
    "לגמור",
    "יתוקן",
    "מוכן",
    "מוכנה",
    "יבש",
    "מתייבש",
    "להתייבש",
    "ייבוש",
    "תוצאות",
    "תוצאה",
    "משפיע",
    "להשפיע",
    "יעבוד",
    "תעבוד",
    "לגור",
    "לישון",
    "להיכנס",
    "לחזור הביתה",
    "להשתמש",
    "אספקה",
    "משלוח",
    "להזמין",
    "חלק",
    "חלקים",
    "חלפים",
    "מה עושים",
    "מה לעשות",
    "בינתיים",
    "נחשב",
    "נחשבת",
    "זה דחוף",
    "חירום"
  ],
  "qaResponseCallbackShapeTokens": [
    "חוזר",
    "חוזרים",
    "תחזור",
    "תחזרו",
    "יחזרו",
    "לחזור אליי",
    "עונה",
    "עונים",
    "תענה",
    "תענו",
    "לענות",
    "מענה",
    "תגובה",
    "טלפון",
    "להתקשר",
    "מתקשרים",
    "שיחה",
    "הודעה",
    "וואטסאפ",
    "ווטסאפ",
    "פנייה",
    "פניה"
  ],
  "qaResponseArrivalShapeTokens": [
    "מגיע",
    "מגיעה",
    "מגיעים",
    "תגיע",
    "תגיעו",
    "להגיע",
    "יגיע",
    "יגיעו",
    "הגעה",
    "לבוא",
    "תבוא",
    "תבואו",
    "באים",
    "יבוא",
    "יבואו",
    "שולחים",
    "לשלוח",
    "טכנאי"
  ],
  "qaAvailabilityQuestionTokens": [
    "עובד בשבת",
    "עובדים בשבת",
    "מגיע בשבת",
    "מגיעים בשבת",
    "פתוחים בשבת",
    "עובד בלילה",
    "עובדים בלילה",
    "מגיע בלילה",
    "מגיעים בלילה",
    "בשעות הלילה",
    "בחגים",
    "בסוף השבוע",
    "בסופ״ש",
    "בסופ\"ש",
    "בסופש",
    "24/7",
    "24 שעות ביממה",
    "מסביב לשעון",
    "שירות חירום",
    "קריאת חירום",
    "קריאות חירום"
  ],
  "qaPriceQuestionExcludeTokens": [
    "יקפוץ",
    "יעלה באמצע",
    "באמצע",
    "יתייקר",
    "להתייקר",
    "ישתנה",
    "משתנה",
    "להשתנות",
    "הפתעות",
    "נוסף",
    "נוספת",
    "נוספים",
    "נוספות",
    "תוספות",
    "מוסתר",
    "מוסתרות",
    "נסתרות",
    "חבויות",
    "סופי",
    "קבוע",
    "סגור",
    "מראש",
    "מתחייב",
    "מתחייבים",
    "התחייבות",
    "מובטח",
    "מבטיחים",
    "להבטיח",
    "כולל",
    "כלול",
    "כלולה",
    "כלולים",
    "מע״מ",
    "מע\"מ",
    "חשבונית",
    "איך משלמים",
    "אמצעי תשלום",
    "בתשלומים",
    "באשראי",
    "במזומן",
    "בביט",
    "חינם",
    "ללא עלות",
    "בלי עלות",
    "איך מקבלים",
    "לקבל הצעת",
    "בטלפון",
    "חלק",
    "חלקים",
    "חלפים",
    "חומרים",
    "לקנות",
    "קונים",
    "רכישה",
    "לרכוש",
    "דגם",
    "מותג",
    "יותר",
    "הכי",
    "למה",
    "משפיע",
    "משפיעים",
    "נקבע",
    "מורכב",
    "תלוי",
    "כדאי",
    "שווה",
    "משתלם",
    "עדיף"
  ],
  "qaPriceCalloutQuestionTokens": [
    "דמי הגעה",
    "דמי ביקור",
    "ביקור",
    "תשלום על הגעה",
    "על ההגעה",
    "על הבדיקה",
    "בדיקה בתשלום",
    "אבחון",
    "קריאת שירות",
    "פתיחת קריאה"
  ],
  "qaPriceSurchargeQuestionTokens": [
    "תוספת",
    "לילה",
    "בלילה",
    "שבת",
    "חג",
    "חגים",
    "סופ״ש",
    "סופ\"ש"
  ],
  "qaLicenseQuestionExcludeTokens": [
    "צריך",
    "צריכים",
    "חובה",
    "נדרש",
    "נדרשת",
    "נדרשים",
    "דרוש",
    "להוציא",
    "להגיש",
    "מותר",
    "חוקי",
    "חוק",
    "רישיון עסק",
    "רישיון נהיגה",
    "רישיון רכב",
    "רישוי",
    "יצרן",
    "ביטוח",
    "טכנאים",
    "העובדים",
    "עובדים",
    "צוות",
    "כולם"
  ],
  "qaYearsQuestionExcludeTokens": [
    "לפי הניסיון",
    "מהניסיון",
    "מניסיונך",
    "מניסיונכם",
    "ניסיון עם",
    "ניסיון בעבודה עם",
    "צריך",
    "חשוב",
    "טכנאים",
    "העובדים",
    "עובדים",
    "צוות",
    "העסק",
    "החברה",
    "קיים",
    "קיימים"
  ],
  "qaWarrantyQuestionExcludeTokens": [
    "יצרן",
    "מכשיר",
    "המכשיר",
    "מוצר",
    "המוצר",
    "עצמו",
    "עצמה",
    "חלקים",
    "חלפים",
    "בכתב",
    "כתובה",
    "תעודת אחריות",
    "מסמך",
    "לממש",
    "מממשים",
    "מימוש",
    "איך פונים",
    "מורחבת",
    "להאריך",
    "הארכת",
    "לא באחריות",
    "מחוץ לאחריות",
    "אחרי האחריות",
    "פג",
    "פגה",
    "נגמרה",
    "הסתיימה",
    "מבטל",
    "מבטלת",
    "יבטל",
    "תבטל",
    "לבטל",
    "באחריות מי",
    "באחריות של",
    "ועד הבית",
    "המשכיר",
    "השוכר",
    "בעל הדירה"
  ],
  "qaWarrantyScopeQuestionTokens": [
    "מה כוללת",
    "מה כולל",
    "מה מכסה",
    "מה מכוסה",
    "על מה",
    "כוללת",
    "מכסה",
    "מכוסה",
    "חלה על",
    "תקפה"
  ]
};
// END OWNER_FACT_TEMPLATES

/** The slots of a template text, in order of appearance. */
export function templateSlots(text: string): string[] {
  return text.match(/\{[a-z]+\}/g) ?? [];
}

/**
 * Why a template set is not usable (empty = complete). A key is missing, empty, still a placeholder, has the wrong slots,
 * or a parse list is empty / holds an empty or placeholder entry. Key names only, never copy text.
 */
export function factTemplateProblems(templates: unknown): string[] {
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) return ['$type'];
  const record = templates as Record<string, unknown>;
  const problems: string[] = [];
  for (const [key, slots] of Object.entries(FACT_TEMPLATE_SLOTS) as Array<[FactTemplateKey, readonly string[]]>) {
    const value = record[key];
    if (typeof value !== 'string' || !value.trim()) { problems.push(`${key}:missing`); continue; }
    if (value.includes(HE_TODO_PREFIX)) { problems.push(`${key}:pending`); continue; }
    const found = templateSlots(value);
    if (found.length !== slots.length || slots.some(slot => !found.includes(slot))) problems.push(`${key}:slots`);
  }
  for (const key of [...FACT_PARSE_TOKEN_KEYS, ...FACT_RULE_TOKEN_KEYS]) {
    const value = record[key];
    if (!Array.isArray(value) || value.length === 0) { problems.push(`${key}:missing`); continue; }
    if (value.some(item => typeof item !== 'string' || !item.trim() || item.includes(HE_TODO_PREFIX))) problems.push(`${key}:pending`);
  }
  // Optional keys: absent is fine; present must be a filled fixed phrase.
  for (const key of FACT_OPTIONAL_TEMPLATE_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (typeof value !== 'string' || !value.trim() || value.includes(HE_TODO_PREFIX) || templateSlots(value).length) problems.push(`${key}:optional`);
  }
  for (const key of FACT_OPTIONAL_LIST_KEYS) {
    if (!(key in record)) continue;
    const value = record[key];
    if (!Array.isArray(value) || !value.length || value.some(item => typeof item !== 'string' || !item.trim() || item.includes(HE_TODO_PREFIX))) problems.push(`${key}:optional`);
  }
  return problems;
}

/** True while any template is missing, a placeholder or malformed: generation then keeps the model-written path. */
export const FACT_TEMPLATES_PENDING_COPY: boolean = factTemplateProblems(OWNER_FACT_TEMPLATES).length > 0;

let templatesOverride: OwnerFactTemplates | null | undefined;

/**
 * The templates generation uses, or null while they are pending (today's model-written path). Tests inject a stand-in set
 * (or null) with setOwnerFactTemplatesForTests; production never calls it.
 */
export function codeOwnedFactTemplates(): OwnerFactTemplates | null {
  if (templatesOverride !== undefined) return templatesOverride;
  return FACT_TEMPLATES_PENDING_COPY ? null : OWNER_FACT_TEMPLATES;
}

/** Tests only: inject a template set (null = force pending; undefined = back to the real flag). Throws on an incomplete set. */
export function setOwnerFactTemplatesForTests(templates: OwnerFactTemplates | null | undefined): void {
  if (templates) {
    const problems = factTemplateProblems(templates);
    if (problems.length) throw new Error(`incomplete fact templates: ${problems.join(', ')}`);
  }
  templatesOverride = templates;
}

// ---------------------------------------------------------------------------
// Parsing the owner's answers.
// ---------------------------------------------------------------------------

/** Longest owner text accepted verbatim (licence wording, an unparsed warranty); longer text is dropped, never cut. */
export const OWNER_FACT_VERBATIM_MAX_CHARS = 60;
/** Noa's length guard: a licence-number or verbatim trust chip longer than this is dropped (never cut). */
export const VERBATIM_CHIP_MAX_CHARS = 24;
/** Years in the trade accepted from the owner (anything else is treated as not given). */
export const OWNER_YEARS_MAX = 70;
/** Longest response time accepted, in minutes (48 hours). */
export const OWNER_RESPONSE_MAX_MINUTES = 48 * 60;
/** Longest warranty accepted, in months (50 years). */
export const OWNER_WARRANTY_MAX_MONTHS = 50 * 12;

export type OwnerFactSource = 'parsed' | 'verbatim';

/** One owner fact: the slot values of its templates, where it came from, and the brief proof id it traces to. */
export interface OwnerFact {
  kind: OwnerFactKind;
  source: OwnerFactSource;
  /**
   * Slot values (without braces), e.g. { n: '15' }. Warranty: { months } plus scope / proofVerbatim / noProof (Noa r2).
   * Contractor: optional { detail }. Response: { minutes } (with form 'halfHour' when the owner said "half
   * an hour") or { sameDay: '1' }.
   */
  slots: Readonly<Record<string, string>>;
  /** The CollectedData key the fact came from (null for the area, which comes from the brief). */
  dataKey: keyof CollectedData | null;
  /** The firstPartyProof id the proof item cites (null when the fact has no proof form). */
  factId: string | null;
}

export type OwnerFactKind = 'years' | 'license' | 'licenseNumber' | 'contractorRegistered' | 'warranty' | 'warrantyVerbatim' | 'response' | 'rating' | 'area';

export interface OwnerFacts {
  years?: OwnerFact;
  /**
   * The licence: Hebrew wording verbatim (kind license), a number only (kind licenseNumber), or a registered contractor
   * (kind contractorRegistered, Noa r3: optional { detail }).
   */
  license?: OwnerFact;
  /** The warranty: a parsed duration (kind warranty) or Hebrew text verbatim (kind warrantyVerbatim). */
  warranty?: OwnerFact;
  response?: OwnerFact;
  rating?: OwnerFact;
  area?: OwnerFact;
}

const HEBREW_LETTER = '\u05D0-\u05EA';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

/** Every integer in a text (digits only; "4.9" counts as one decimal number, not two integers). */
function integers(value: string): number[] {
  return (value.match(/\d+(?:[.,]\d+)?/g) ?? []).map(part => Number(part.replace(',', '.')));
}

const PREFIX_CACHE = new WeakMap<object, string>();

/**
 * Noa: at most ONE leading prefix letter is stripped before whole-word matching, and only the letters the lexicon itself
 * attaches (taken from the template file by slicing, never typed): every parse word that is another parse word with one
 * prefix letter in front gives that letter (the lamed of the "for a year" form, for example). Empty for a lexicon with no such pair (ASCII stand-ins).
 */
export function parsePrefixLetters(templates: OwnerFactTemplates): string {
  const cached = PREFIX_CACHE.get(templates);
  if (cached !== undefined) return cached;
  const words = new Set(FACT_PARSE_TOKEN_KEYS.flatMap(key => templates[key]).flatMap(item => item.normalize('NFC').split(/\s+/u)).filter(Boolean));
  const letters = new Set<string>();
  for (const word of words) {
    const head = word[0];
    if (word.length > 2 && PREFIX_LETTERS.includes(head) && words.has(word.slice(1))) letters.add(head);
  }
  const out = [...letters].sort().join('');
  PREFIX_CACHE.set(templates, out);
  return out;
}

function wordRegExp(word: string, prefixes: string, flags = 'iu'): RegExp {
  const prefix = prefixes ? `[${prefixes}]?` : '';
  return new RegExp(`(?<![${HEBREW_LETTER}A-Za-z])${prefix}${escapeRegExp(word.normalize('NFC'))}(?![${HEBREW_LETTER}A-Za-z])`, flags);
}

/** A whole-word token test, at most one stripped prefix letter (Hebrew) or a plain word boundary (Latin). */
function hasToken(value: string, tokens: readonly string[], prefixes: string): boolean {
  return tokens.some(token => token.trim() !== '' && wordRegExp(token.trim(), prefixes).test(value));
}

/** "a number followed by a unit word" for any of the unit tokens (Hebrew lists from the templates, English in code). */
function numberWithUnit(value: string, tokens: readonly string[]): number | null {
  for (const token of tokens) {
    const word = token.trim();
    if (!word) continue;
    const match = new RegExp(`(\\d+)\\s*[-\u05BE]?\\s*${escapeRegExp(word)}(?![${HEBREW_LETTER}A-Za-z])`, 'iu').exec(value);
    if (match) return Number(match[1]);
  }
  return null;
}

/** Noa: a bare unit word ("hour", "minute") counts only right after a "within" word (FIX_TIME_LEAD_TOKENS), one word apart at most. */
function afterWithin(value: string, tokens: readonly string[], prefixes: string): boolean {
  const prefix = prefixes ? `[${prefixes}]?` : '';
  return FIX_TIME_LEAD_TOKENS.some(lead => tokens.some(token => token.trim() && new RegExp(
    `(?<![${HEBREW_LETTER}])${escapeRegExp(lead)}\\s+(?:\\S+\\s+)?${prefix}${escapeRegExp(token.trim())}(?![${HEBREW_LETTER}])`, 'u').test(value)));
}

/**
 * Noa r2 (parseWithinWords, response only): an "up to" lead lets a bare hour / minute word count, one word apart at most,
 * and only when that unit word is the LAST word of the answer (trailing punctuation stripped).
 */
function afterUpTo(value: string, tokens: readonly string[], templates: OwnerFactTemplates, prefixes: string): boolean {
  const raw = stripTrailingPunctuation(value);
  const prefix = prefixes ? `[${prefixes}]?` : '';
  return templates.parseWithinWords.some(lead => lead.trim() && tokens.some(token => token.trim() && new RegExp(
    `(?<![${HEBREW_LETTER}])${escapeRegExp(lead.normalize('NFC').trim())}\\s+(?:\\S+\\s+)?${prefix}${escapeRegExp(token.trim())}$`, 'u').test(raw)));
}

const EN = {
  minutes: ['minutes', 'minute', 'mins', 'min'],
  hours: ['hours', 'hour', 'hrs', 'hr', 'h'],
  oneHour: ['an hour'],
  twoHours: [],
  halfHour: ['half an hour', 'half hour'],
  months: ['months', 'month', 'mos', 'mo'],
  oneMonth: ['a month'],
  twoMonths: [],
  years: ['years', 'year', 'yrs', 'yr'],
  oneYear: ['a year'],
  oneAndHalfYears: ['a year and a half', 'one and a half years', 'year and a half'],
  twoYears: [],
  halfYear: ['half a year', 'half year'],
  sameDay: ['same day', 'same-day', 'the same day'],
  licenseNumber: ['license', 'licence', 'lic', 'no', 'number', 'num', 'nr'],
} as const;

/** English number words one to twelve as digits ("Six-month warranty" -> "6-month warranty"); other text unchanged. */
const EN_NUMBER_WORDS: Readonly<Record<string, string>> = {
  one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12',
};
function withEnglishDigits(value: string): string {
  // "one and a half" stays words (it is a phrase of its own, matched before the numbers).
  return value.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b(?! and a half)/gi, word => EN_NUMBER_WORDS[word.toLowerCase()]);
}

/**
 * Years in the trade: the one integer in the answer, 1 to OWNER_YEARS_MAX (any language). With the templates, a Hebrew
 * answer with no digits reads its dual ("two years") and bare ("a year") words (never "a year and a half" or "half a year").
 */
export function parseYears(value: unknown, templates?: OwnerFactTemplates): number | null {
  const raw = withEnglishDigits(text(value));
  const numbers = integers(raw);
  if (numbers.length === 0 && templates) {
    const prefixes = parsePrefixLetters(templates);
    if (hasToken(raw, [...templates.parseOneAndHalfYearWords, ...templates.parseHalfYearWords], prefixes)) return null;
    if (hasToken(raw, templates.parseTwoYearWords, prefixes)) return 2;
    if (hasToken(raw, templates.parseOneYearWords, prefixes)) return 1;
    return null;
  }
  if (numbers.length !== 1 || !Number.isInteger(numbers[0])) return null;
  return numbers[0] >= 1 && numbers[0] <= OWNER_YEARS_MAX ? numbers[0] : null;
}

/** A parsed response answer: a duration in minutes (form halfHour when said as "half an hour") or the same day. */
export type ParsedResponse = { minutes: number; form?: 'halfHour' } | { sameDay: true };

/**
 * Response time (any language). Noa's order, most specific first: half an hour, two hours, a number with its unit, a bare
 * hour / minute word right after "within", then the same-day words. Null when the answer is not one clear answer.
 */
export function parseResponse(value: unknown, templates: OwnerFactTemplates): ParsedResponse | null {
  const raw = withEnglishDigits(text(value));
  if (!raw) return null;
  const prefixes = parsePrefixLetters(templates);
  const numbers = integers(raw);
  const ok = (minutes: number): number | null => (minutes > 0 && minutes <= OWNER_RESPONSE_MAX_MINUTES ? minutes : null);
  if (hasToken(raw, [...templates.parseHalfHourWords, ...EN.halfHour], prefixes)) return numbers.length ? null : { minutes: 30, form: 'halfHour' };
  if (hasToken(raw, [...templates.parseTwoHourWords, ...EN.twoHours], prefixes)) return numbers.length ? null : { minutes: 120 };
  if (numbers.length > 1 || numbers.some(number => !Number.isInteger(number))) return null;
  if (numbers.length === 1) {
    const asMinutes = numberWithUnit(raw, [...templates.parseMinuteWords, ...EN.minutes]);
    const asHours = numberWithUnit(raw, [...templates.parseHourWords, ...EN.hours]);
    const minutes = asMinutes !== null && asHours === null ? ok(asMinutes) : asHours !== null && asMinutes === null ? ok(asHours * 60) : null;
    return minutes === null ? null : { minutes };
  }
  if (afterWithin(raw, templates.parseOneHourWords, prefixes) || afterUpTo(raw, templates.parseOneHourWords, templates, prefixes) || hasToken(raw, EN.oneHour, '')) return { minutes: 60 };
  if (afterWithin(raw, templates.parseMinuteWords, prefixes) || afterUpTo(raw, templates.parseMinuteWords, templates, prefixes)) return { minutes: 1 };
  if (hasToken(raw, [...templates.parseSameDayWords, ...EN.sameDay], prefixes)) return { sameDay: true };
  return null;
}

/** Response time in minutes (any language), or null (also for a same-day answer, which has no duration). */
export function parseResponseMinutes(value: unknown, templates: OwnerFactTemplates): number | null {
  const parsed = parseResponse(value, templates);
  return parsed && 'minutes' in parsed ? parsed.minutes : null;
}

/**
 * Warranty length in months (any language), or null. Noa's order, most specific first: a year and a half, half a year,
 * two years, two months, a number with its unit, then the bare year / month words.
 */
export function parseWarrantyMonths(value: unknown, templates: OwnerFactTemplates): number | null {
  const raw = withEnglishDigits(text(value));
  if (!raw) return null;
  const prefixes = parsePrefixLetters(templates);
  const numbers = integers(raw);
  const ok = (months: number): number | null => (months > 0 && months <= OWNER_WARRANTY_MAX_MONTHS ? months : null);
  const phrase = (tokens: readonly string[]) => hasToken(raw, tokens, prefixes);
  if (phrase([...templates.parseOneAndHalfYearWords, ...EN.oneAndHalfYears])) return numbers.length ? null : 18;
  if (phrase([...templates.parseHalfYearWords, ...EN.halfYear])) return numbers.length ? null : 6;
  if (phrase([...templates.parseTwoYearWords, ...EN.twoYears])) return numbers.length ? null : 24;
  if (phrase([...templates.parseTwoMonthWords, ...EN.twoMonths])) return numbers.length ? null : 2;
  if (numbers.length > 1 || numbers.some(number => !Number.isInteger(number))) return null;
  if (numbers.length === 1) {
    const asMonths = numberWithUnit(raw, [...templates.parseMonthWords, ...EN.months]);
    const asYears = numberWithUnit(raw, [...templates.parseYearWords, ...EN.years]);
    return asMonths !== null && asYears === null ? ok(asMonths) : asYears !== null && asMonths === null ? ok(asYears * 12) : null;
  }
  if (phrase([...templates.parseOneYearWords, ...EN.oneYear])) return 12;
  if (phrase([...templates.parseOneMonthWords, ...EN.oneMonth])) return 1;
  return null;
}

/** A licence answer that is only a number (with optional "no." / "licence" words): the number, else null. */
export function parseLicenseNumber(value: unknown, templates: OwnerFactTemplates): string | null {
  const raw = text(value);
  const digits = raw.match(/\d[\d-]*\d|\d/g) ?? [];
  if (digits.length !== 1 || digits[0].replace(/-/g, '').length < 3) return null;
  let rest = raw.replace(digits[0], ' ');
  const prefixes = parsePrefixLetters(templates);
  for (const word of [...templates.parseLicenseNumberWords, ...EN.licenseNumber].map(item => item.trim()).filter(Boolean).sort((a, b) => b.length - a.length)) {
    rest = rest.replace(new RegExp(wordRegExp(word, prefixes).source, 'giu'), ' ');
  }
  return /[\p{L}]/u.test(rest) ? null : digits[0];
}

/** Star rating 1-5 with at most one decimal, as the owner wrote it (comma decimal normalised to a point). */
export function parseRating(value: unknown): string | null {
  const raw = text(value).replace(',', '.');
  const match = /^([1-5])(?:\.(\d))?$/.exec(raw);
  if (!match || (match[1] === '5' && match[2] && match[2] !== '0')) return null;
  return match[2] && match[2] !== '0' ? `${match[1]}.${match[2]}` : match[1];
}

/** Review count: a positive integer (number or digit string), else null. */
export function parseReviewCount(value: unknown): number | null {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(number) && number > 0 && number <= 100_000 ? number : null;
}

/** Noa: a verbatim slot loses its trailing punctuation (the templates close the sentence themselves). */
export function stripTrailingPunctuation(value: string): string {
  return value.replace(/[\s.,;:!?…\u05C3]+$/u, '');
}

/** Owner text that may render verbatim: mostly Hebrew and within OWNER_FACT_VERBATIM_MAX_CHARS, trailing punctuation removed. */
export function verbatimHebrew(value: unknown): string | null {
  const raw = stripTrailingPunctuation(text(value));
  return raw && raw.length <= OWNER_FACT_VERBATIM_MAX_CHARS && isMostlyHebrew(raw) ? raw : null;
}

/**
 * Noa r2: the document nouns that let a licence text take proofLicense ("I have {license}."): the template file's
 * licenseDocumentNouns list, plus the noun sliced from trustLicenseNumber (kept as a guaranteed member). Never typed.
 */
export function licenseDocumentNouns(templates: OwnerFactTemplates): string[] {
  const first = templates.trustLicenseNumber.replace(/\{[a-z]+\}/g, ' ').trim().split(/\s+/u)[0] ?? '';
  const sliced = first && /[\u05D0-\u05EA]/u.test(first) ? [first.normalize('NFC')] : [];
  return [...new Set([...sliced, ...(templates.licenseDocumentNouns ?? []).map(noun => noun.normalize('NFC').trim()).filter(Boolean)])];
}

/** Noa r2: true when a licence text's FIRST word equals a document noun EXACTLY (no prefix-letter stripping). */
export function opensWithDocumentNoun(license: string, templates: OwnerFactTemplates): boolean {
  const first = license.normalize('NFC').trim().split(/\s+/u)[0] ?? '';
  return licenseDocumentNouns(templates).includes(first);
}

// ---------------------------------------------------------------------------
// Noa r2 rules: negation, hedges, "up to" leads, scope tails (whole words, no prefix stripping).
// ---------------------------------------------------------------------------

/** A whole-word / whole-phrase test with no prefix stripping. */
function hasPlainToken(value: string, tokens: readonly string[]): boolean {
  return hasToken(value, tokens, '');
}

/** English negation openers (code, Noa: English equivalents belong in code). Only for answers without digits ("No. 4821"). */
const EN_NEGATION = ['no', 'none', 'not', 'without', 'n/a'];

/**
 * Noa r2 (parseNegationWords): an answer whose first word(s) match an entry is a "no" answer: no fact of that kind (guarantee
 * and licence), never verbatim. Whole words, no prefix stripping.
 */
export function opensWithNegation(value: unknown, templates: OwnerFactTemplates): boolean {
  const raw = text(value);
  if (!raw) return false;
  const opens = (token: string) => new RegExp(`^${escapeRegExp(token.normalize('NFC').trim())}(?![${HEBREW_LETTER}A-Za-z])`, 'iu').test(raw);
  if (templates.parseNegationWords.some(token => token.trim() && opens(token))) return true;
  return !/\d/.test(raw) && EN_NEGATION.some(token => new RegExp(`^${escapeRegExp(token)}(?![A-Za-z.])`, 'i').test(raw));
}

/** English hedges (code). */
const EN_HEDGES = ['about', 'around', 'approx', 'approximately', 'roughly', 'almost', 'nearly', 'usually', 'typically', 'depends', 'up to'];

/**
 * Noa r2 (parseHedgeWords): an approximate or conditional answer. Entries ending in maqaf / hyphen match directly before a
 * digit, and so does their bare first letter; whole words otherwise. English hedges and "~" in code. For warranty and years,
 * parseWithinWords count as hedges too (withinIsHedge).
 */
export function hasHedge(value: unknown, templates: OwnerFactTemplates, withinIsHedge: boolean): boolean {
  const raw = text(value);
  if (!raw) return false;
  if (/~/.test(raw)) return true;
  const beforeDigit: string[] = [];
  const words: string[] = [...EN_HEDGES, ...(withinIsHedge ? templates.parseWithinWords : [])];
  for (const entry of templates.parseHedgeWords.map(item => item.normalize('NFC').trim()).filter(Boolean)) {
    if (/[-\u05BE]$/u.test(entry)) beforeDigit.push(entry, entry.slice(0, -1).slice(0, 1));
    else words.push(entry);
  }
  if (beforeDigit.some(lead => lead && new RegExp(`(?<![${HEBREW_LETTER}A-Za-z])${escapeRegExp(lead)}\\d`, 'u').test(raw))) return true;
  return hasPlainToken(raw, words);
}

/** Noa r2: a scope tail carries no internal , ; : ( ) or dash, no digits. */
const SCOPE_FORBIDDEN = /[\d,;:()\-\u05BE\u2010-\u2015]/u;
/** Longest scope tail (warranty and response), code points. */
export const SCOPE_TAIL_MAX_CHARS = 30;

/** Remove the first match of any pattern (longest pattern first) from a text; returns null when none matched. */
function removeFirst(value: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(value);
    if (match) return `${value.slice(0, match.index)} ${value.slice(match.index + match[0].length)}`;
  }
  return null;
}

function phrasePatterns(tokens: readonly string[], prefixes: string): RegExp[] {
  return [...tokens].map(token => token.normalize('NFC').trim()).filter(Boolean).sort((a, b) => b.length - a.length).map(token => wordRegExp(token, prefixes));
}

/** A number with one of its unit words, with an attached prefix letter plus maqaf / hyphen in front ("for-3 years"). */
function numberUnitPatterns(tokens: readonly string[], prefixes: string): RegExp[] {
  const prefix = prefixes ? `(?:[${prefixes}][-\u05BE]?)?` : '';
  return [...tokens].map(token => token.trim()).filter(Boolean).sort((a, b) => b.length - a.length)
    .map(word => new RegExp(`(?<![${HEBREW_LETTER}A-Za-z])${prefix}\\d+\\s*[-\u05BE]?\\s*${escapeRegExp(word)}(?![${HEBREW_LETTER}A-Za-z])`, 'iu'));
}

/** The answer with its warranty duration phrase removed (same order as parseWarrantyMonths), or null. */
function withoutWarrantyDuration(raw: string, templates: OwnerFactTemplates): string | null {
  const prefixes = parsePrefixLetters(templates);
  const groups: RegExp[][] = [
    phrasePatterns([...templates.parseOneAndHalfYearWords, ...EN.oneAndHalfYears], prefixes),
    phrasePatterns([...templates.parseHalfYearWords, ...EN.halfYear], prefixes),
    phrasePatterns([...templates.parseTwoYearWords, ...EN.twoYears], prefixes),
    phrasePatterns([...templates.parseTwoMonthWords, ...EN.twoMonths], prefixes),
    numberUnitPatterns([...templates.parseMonthWords, ...EN.months, ...templates.parseYearWords, ...EN.years], prefixes),
    phrasePatterns([...templates.parseOneYearWords, ...EN.oneYear], prefixes),
    phrasePatterns([...templates.parseOneMonthWords, ...EN.oneMonth], prefixes),
  ];
  for (const group of groups) {
    const out = removeFirst(raw, group);
    if (out !== null) return out;
  }
  return null;
}

const EN_WARRANTY_WORDS = ['warranty', 'guarantee', 'guaranteed'];
const EN_FILLER_WORDS = ['a', 'an', 'the', 'i', 'we', 'give', 'offer', 'yes', 'within', 'in', 'under', 'max', 'maximum', 'is', 'of'];

/** The words of a text that are not punctuation-only. */
function words(value: string): string[] {
  return value.normalize('NFC').split(/\s+/u).filter(word => /[\p{L}\p{N}]/u.test(word));
}

/** A word with its edge punctuation removed (for the whole-word list tests). */
function bare(word: string): string {
  return word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** Scope tail checks shared by warranty and response (Noa r2). */
function scopeTailFits(tail: string, minWords: number, maxWords: number): boolean {
  const count = words(tail).length;
  return count >= minWords && count <= maxWords && codePointLength(tail) <= SCOPE_TAIL_MAX_CHARS && isMostlyHebrew(tail) && !SCOPE_FORBIDDEN.test(tail);
}

/** The whitespace-normalised original contains the tail as one contiguous run (the tail is the owner's words, verbatim). */
function isVerbatimRun(original: string, tail: string): boolean {
  return original.replace(/\s+/g, ' ').includes(tail.replace(/\s+/g, ' '));
}

export type WarrantyScope = { kind: 'none' } | { kind: 'scoped'; scope: string } | { kind: 'unfit' };

/**
 * Noa r2 warranty scope: remove the warranty words, the filler words and the matched duration phrase; the tail opens at the
 * first STANDALONE warrantyScopeLeadWords word and runs to the end; nothing else may remain before it; 2-5 words including
 * the lead, at most SCOPE_TAIL_MAX_CHARS code points, mostly Hebrew, no digits or , ; : ( ) dash. 'none' = only the
 * duration (and ignorable words) remain; 'unfit' = something remains but is not a fitting tail.
 */
export function warrantyScope(value: unknown, templates: OwnerFactTemplates): WarrantyScope {
  const raw = stripTrailingPunctuation(text(value));
  const rest = withoutWarrantyDuration(raw, templates);
  if (rest === null) return { kind: 'unfit' };
  const ignorable = new Set([...templates.parseWarrantyWords, ...templates.parseFillerWords, ...EN_WARRANTY_WORDS, ...EN_FILLER_WORDS].map(item => item.normalize('NFC').trim().toLowerCase()));
  const leads = new Set(templates.warrantyScopeLeadWords.map(item => item.normalize('NFC').trim()));
  const list = words(rest);
  const at = list.findIndex(word => leads.has(word));
  const before = at < 0 ? list : list.slice(0, at);
  if (before.some(word => !ignorable.has(bare(word).toLowerCase()))) return { kind: 'unfit' };
  if (at < 0) return { kind: 'none' };
  const tail = stripTrailingPunctuation(list.slice(at).join(' '));
  return scopeTailFits(tail, 2, 5) && isVerbatimRun(raw, tail) ? { kind: 'scoped', scope: tail } : { kind: 'unfit' };
}

export type ResponseScope = { kind: 'none' } | { kind: 'scoped'; scope: string } | { kind: 'unfit' };

/** The answer with its response duration / same-day phrase removed (same order as parseResponse), or null. */
function withoutResponseDuration(raw: string, templates: OwnerFactTemplates): string | null {
  const prefixes = parsePrefixLetters(templates);
  const groups: RegExp[][] = [
    phrasePatterns([...templates.parseHalfHourWords, ...EN.halfHour], prefixes),
    phrasePatterns([...templates.parseTwoHourWords, ...EN.twoHours], prefixes),
    numberUnitPatterns([...templates.parseMinuteWords, ...EN.minutes, ...templates.parseHourWords, ...EN.hours], prefixes),
    phrasePatterns([...templates.parseOneHourWords, ...EN.oneHour, ...templates.parseMinuteWords], prefixes),
    phrasePatterns([...templates.parseSameDayWords, ...EN.sameDay], prefixes),
  ];
  for (const group of groups) {
    const out = removeFirst(raw, group);
    if (out !== null) return out;
  }
  return null;
}

/**
 * Noa r2 response place tail: after removing the duration phrase, FIX_TIME_LEAD_TOKENS, parseWithinWords and the filler
 * words, the remaining tail's first word opens with a responseScopeLeadLetters letter; at most SCOPE_TAIL_MAX_CHARS code
 * points, mostly Hebrew, no digits. Leads and fillers count only before the tail.
 */
export function responseScope(value: unknown, templates: OwnerFactTemplates): ResponseScope {
  const raw = stripTrailingPunctuation(text(value));
  const rest = withoutResponseDuration(raw, templates);
  if (rest === null) return { kind: 'unfit' };
  let remaining = rest;
  // Multi-word leads first (whole phrases), then single words.
  for (const lead of [...FIX_TIME_LEAD_TOKENS, ...templates.parseWithinWords, 'up to'].map(item => item.normalize('NFC').trim()).filter(item => /\s/.test(item))) {
    remaining = remaining.replace(new RegExp(wordRegExp(lead, '').source, 'giu'), ' ');
  }
  const ignorable = new Set([...FIX_TIME_LEAD_TOKENS, ...templates.parseWithinWords, ...templates.parseFillerWords, ...EN_FILLER_WORDS].map(item => item.normalize('NFC').trim().toLowerCase()));
  const list = words(remaining);
  const at = list.findIndex(word => !ignorable.has(bare(word).toLowerCase()));
  if (at < 0) return { kind: 'none' };
  const tail = stripTrailingPunctuation(list.slice(at).join(' '));
  const letters = templates.responseScopeLeadLetters.map(item => item.normalize('NFC').trim()).filter(Boolean);
  const fits = letters.some(letter => tail.startsWith(letter) && tail.length > letter.length) && scopeTailFits(tail, 1, Number.POSITIVE_INFINITY) && isVerbatimRun(raw, tail);
  return fits ? { kind: 'scoped', scope: tail } : { kind: 'unfit' };
}

/** The brief's owner places, base city first (mirrors researchPageCopy.gatePlaces; kept here to avoid an import cycle). */
function briefPlaces(brief: Pick<PageBrief, 'site'>): string[] {
  const site = brief.site;
  return site ? [...new Set([...(site.city ? [site.city] : []), ...site.serviceArea])] : [];
}

/** The proof id a brief carries for one owner answer (researchToSite: `proof-<CollectedData key>`), else null. */
function proofIdFor(brief: Pick<PageBrief, 'firstPartyProof'>, key: keyof CollectedData): string | null {
  const id = `proof-${String(key)}`;
  return brief.firstPartyProof.some(item => item.id === id) ? id : null;
}

/**
 * The owner facts of one page, parsed (numbers, any language) or verbatim (mostly-Hebrew text only). A fact the rules do not
 * accept is absent (never guessed, never translated).
 */
export function ownerFacts(data: CollectedData, brief: Pick<PageBrief, 'site' | 'firstPartyProof'>, templates: OwnerFactTemplates): OwnerFacts {
  const facts: OwnerFacts = {};
  const fact = (kind: OwnerFactKind, source: OwnerFactSource, slots: Record<string, string>, dataKey: keyof CollectedData | null): OwnerFact => ({
    kind, source, slots, dataKey, factId: dataKey ? proofIdFor(brief, dataKey) : null,
  });
  // Noa r2: a hedged years answer renders no number.
  const years = hasHedge(data.yearsInField, templates, true) ? null : parseYears(data.yearsInField, templates);
  if (years !== null) facts.years = fact('years', 'parsed', { n: String(years) }, 'yearsInField');
  // Noa r3: a registered contractor (the credentials step's code value) never goes through trustLicense / proofLicense.
  const contractor = parseContractorLicense(data.license);
  if (contractor) {
    const detail = contractor.detail === null ? null : contractorDetail(contractor.detail, templates);
    facts.license = fact('contractorRegistered', 'parsed', detail === null ? {} : { detail }, 'license');
  } else if (!opensWithNegation(data.license, templates)) {
    // Noa r2: a licence answer that opens with a negation word is a "no" (no chip, no proof, never verbatim).
    const licenseNumber = parseLicenseNumber(data.license, templates);
    const license = licenseNumber === null ? verbatimHebrew(data.license) : null;
    if (licenseNumber !== null) facts.license = fact('licenseNumber', 'parsed', { number: licenseNumber }, 'license');
    else if (license !== null) facts.license = fact('license', 'verbatim', { license }, 'license');
  }
  const warranty = warrantyFact(data.guarantee, templates);
  if (warranty) facts.warranty = fact(warranty.kind, warranty.source, warranty.slots, 'guarantee');
  const response = responseFact(data.responseTime, templates);
  if (response) facts.response = fact('response', 'parsed', response, 'responseTime');
  const rating = parseRating(data.starRating);
  if (rating !== null) {
    const count = parseReviewCount(data.reviewCount);
    facts.rating = fact('rating', 'parsed', count === null ? { rating } : { rating, count: String(count) }, 'starRating');
  }
  const tile = buildAreaTile(briefPlaces(brief), TRUST_BAR_MAX_CHARS);
  if (tile) facts.area = fact('area', 'parsed', { area: tile }, null);
  return facts;
}

/** Longest contractor detail kept verbatim (Noa r3: proofContractorRegisteredDetail), code points. */
export const CONTRACTOR_DETAIL_MAX_CHARS = 30;

/**
 * Noa r3: the words a contractor detail may not open with (it would repeat the sentence): the first word of
 * trustContractorRegistered ("contractor") and the third word of proofContractorRegistered ("registration"), sliced from the
 * template file, never typed.
 */
export function contractorDetailRepeatWords(templates: OwnerFactTemplates): string[] {
  const wordsOf = (value: string) => value.replace(/\{[a-z]+\}/g, ' ').replace(/[.,]/g, ' ').normalize('NFC').trim().split(/\s+/u);
  return [wordsOf(templates.trustContractorRegistered)[0], wordsOf(templates.proofContractorRegistered)[2]].filter((word): word is string => Boolean(word));
}

/**
 * Noa r3 contractor detail guards: the owner's text verbatim, trailing punctuation stripped, when mostly Hebrew, at most
 * CONTRACTOR_DETAIL_MAX_CHARS code points (digits allowed), not opening with a parseNegationWords entry and not opening with
 * a contractorDetailRepeatWords word. Anything else -> null (the yes holds; the detail is dropped, never paraphrased).
 */
export function contractorDetail(value: string, templates: OwnerFactTemplates): string | null {
  const raw = stripTrailingPunctuation(text(value));
  if (!raw || codePointLength(raw) > CONTRACTOR_DETAIL_MAX_CHARS || !isMostlyHebrew(raw)) return null;
  if (opensWithNegation(raw, templates)) return null;
  return contractorDetailRepeatWords(templates).some(word => raw.startsWith(word)) ? null : raw;
}

/**
 * Noa r2 warranty: a negation opener -> none; a hedge (or an "up to" word) -> the verbatim fallback; a parsed duration with
 * no scope tail -> warranty (proofWarranty); with a fitting tail -> warranty + scope (proofWarrantyScoped); with a tail that
 * does not fit -> warranty + proofVerbatim (proofWarrantyVerbatim with the owner's full answer) or noProof. Never the
 * unscoped proof when a tail exists. An unparsed Hebrew answer stays verbatim (unchanged).
 */
function warrantyFact(value: unknown, templates: OwnerFactTemplates): { kind: OwnerFactKind; source: OwnerFactSource; slots: Record<string, string> } | null {
  if (!text(value) || opensWithNegation(value, templates)) return null;
  const verbatim = verbatimHebrew(value);
  const months = hasHedge(value, templates, true) ? null : parseWarrantyMonths(value, templates);
  if (months === null || !warrantyDurationKeys(months)) return verbatim === null ? null : { kind: 'warrantyVerbatim', source: 'verbatim', slots: { warranty: verbatim } };
  const scope = warrantyScope(value, templates);
  const slots: Record<string, string> = { months: String(months) };
  if (scope.kind === 'scoped') slots.scope = scope.scope;
  else if (scope.kind === 'unfit') {
    if (verbatim !== null) slots.proofVerbatim = verbatim;
    else slots.noProof = '1';
  }
  return { kind: 'warranty', source: 'parsed', slots };
}

/**
 * Noa r2 response: a hedge -> no fact; a parsed duration / same day with no tail -> the callback chip and proof (Adam);
 * with a place tail (responseScopeLeadLetters) -> scope, which renders only the scoped proof and no chip (Adam); a tail that
 * does not fit -> no fact.
 */
function responseFact(value: unknown, templates: OwnerFactTemplates): Record<string, string> | null {
  if (hasHedge(value, templates, false)) return null;
  const response = parseResponse(value, templates);
  if (!response) return null;
  const scope = responseScope(value, templates);
  if (scope.kind === 'unfit') return null;
  const slots: Record<string, string> = 'sameDay' in response ? { sameDay: '1' } : { minutes: String(response.minutes), ...(response.form ? { form: response.form } : {}) };
  if (scope.kind === 'scoped') slots.scope = scope.scope;
  return slots;
}

/**
 * The CollectedData keys whose answer is neither parsed nor accepted verbatim (English non-numeric text): slice 2 keeps them
 * out of the model's prompt so they are never translated. An empty answer is not listed.
 */
export function droppedOwnerFactKeys(data: CollectedData, templates: OwnerFactTemplates): Array<keyof CollectedData> {
  const out: Array<keyof CollectedData> = [];
  // Noa r2: a "no" answer (negation opener) is never a fact and never shown to the model as one.
  // Noa r3: the contractor code value is English by design: the model never sees it (code renders the fact).
  if (parseContractorLicense(data.license)) out.push('license');
  else if (text(data.license) && (opensWithNegation(data.license, templates) || (parseLicenseNumber(data.license, templates) === null && verbatimHebrew(data.license) === null))) out.push('license');
  const months = parseWarrantyMonths(data.guarantee, templates);
  if (text(data.guarantee) && (opensWithNegation(data.guarantee, templates) || (!(months !== null && warrantyDurationKeys(months)) && verbatimHebrew(data.guarantee) === null))) out.push('guarantee');
  if (text(data.responseTime) && parseResponse(data.responseTime, templates) === null && !isMostlyHebrew(text(data.responseTime))) out.push('responseTime');
  return out;
}

// ---------------------------------------------------------------------------
// Filling the templates.
// ---------------------------------------------------------------------------

/** Fill a template's slots; throws when a slot has no value (a code bug, never a silent blank). */
export function fillTemplate(template: string, slots: Readonly<Record<string, string>>): string {
  return template.replace(/\{([a-z]+)\}/g, (_, name: string) => {
    const value = slots[name];
    if (typeof value !== 'string' || !value) throw new Error(`fact template slot {${name}} has no value`);
    return value;
  }).replace(/\s+/g, ' ').trim();
}

/**
 * The duration template keys of a warranty length (Noa: months 1 / 2 / 6 and years 1 / 1.5 / 2 have their own forms;
 * other whole years take NYears, any other number of months NMonths).
 */
export function warrantyDurationKeys(months: number): { bare: FactTemplateKey; lamed: FactTemplateKey; n?: number } | null {
  if (!Number.isInteger(months) || months <= 0) return null;
  if (months === 1) return { bare: 'warrantyBareOneMonth', lamed: 'warrantyLamedOneMonth' };
  if (months === 2) return { bare: 'warrantyBareTwoMonths', lamed: 'warrantyLamedTwoMonths' };
  if (months === 6) return { bare: 'warrantyBareSixMonths', lamed: 'warrantyLamedSixMonths' };
  if (months === 12) return { bare: 'warrantyBareOneYear', lamed: 'warrantyLamedOneYear' };
  if (months === 18) return { bare: 'warrantyBareOneAndHalfYears', lamed: 'warrantyLamedOneAndHalfYears' };
  if (months === 24) return { bare: 'warrantyBareTwoYears', lamed: 'warrantyLamedTwoYears' };
  if (months > 24 && months % 12 === 0) return { bare: 'warrantyBareNYears', lamed: 'warrantyLamedNYears', n: months / 12 };
  return { bare: 'warrantyBareNMonths', lamed: 'warrantyLamedNMonths', n: months };
}

/**
 * The {time} text of a parsed duration (Noa: 1 minute and half an hour have their own forms; 1 / 2 hours too; whole hours
 * above 2 take responseHours, anything else responseMinutes). Never called for a same-day answer.
 */
export function responseTimeText(minutes: number, templates: OwnerFactTemplates, form?: string): string {
  if (form === 'halfHour') return fillTemplate(templates.responseHalfHour, {});
  if (minutes === 1) return fillTemplate(templates.responseOneMinute, {});
  if (minutes === 60) return fillTemplate(templates.responseOneHour, {});
  if (minutes === 120) return fillTemplate(templates.responseTwoHours, {});
  if (minutes > 120 && minutes % 60 === 0) return fillTemplate(templates.responseHours, { n: String(minutes / 60) });
  return fillTemplate(templates.responseMinutes, { n: String(minutes) });
}

function durationText(fact: OwnerFact, form: 'bare' | 'lamed', templates: OwnerFactTemplates): string {
  const keys = warrantyDurationKeys(Number(fact.slots.months));
  if (!keys) throw new Error('warranty fact without a duration');
  return fillTemplate(templates[keys[form]], keys.n === undefined ? {} : { n: String(keys.n) });
}

/** Years: n = 1 / 2 have their own forms (Noa); n >= 3 fills the {n} template. */
function yearsText(fact: OwnerFact, one: FactTemplateKey, two: FactTemplateKey, many: FactTemplateKey, templates: OwnerFactTemplates): string {
  const n = Number(fact.slots.n);
  return n === 1 ? fillTemplate(templates[one], {}) : n === 2 ? fillTemplate(templates[two], {}) : fillTemplate(templates[many], fact.slots);
}

function sameDay(fact: OwnerFact): boolean {
  return fact.slots.sameDay === '1';
}

/** A parsed warranty whose answer had a tail (scoped proof, verbatim proof, or no proof). */
export function warrantyHasTail(fact: OwnerFact): boolean {
  return fact.kind === 'warranty' && Boolean(fact.slots.scope || fact.slots.proofVerbatim || fact.slots.noProof);
}

/**
 * Noa r3: the Q&A answer to a response question. Callback-shaped (a qaResponseCallbackShapeTokens match and no
 * qaResponseArrivalShapeTokens match) -> proofCallback / proofCallbackSameDay; any other question -> proofCallbackArrival /
 * proofCallbackArrivalSameDay (never lets a callback time read as an arrival time).
 */
export function responseQaAnswer(fact: OwnerFact, callbackShaped: boolean, templates: OwnerFactTemplates): string | null {
  if (fact.kind !== 'response') return null;
  if (callbackShaped) return proofText(fact, templates);
  return sameDay(fact)
    ? fillTemplate(templates.proofCallbackArrivalSameDay, {})
    : fillTemplate(templates.proofCallbackArrival, { time: responseTimeText(Number(fact.slots.minutes), templates, fact.slots.form) });
}

/** The trust-bar text of one fact (null when the kind has no trust form). */
export function trustText(fact: OwnerFact, templates: OwnerFactTemplates): string | null {
  switch (fact.kind) {
    case 'years': return yearsText(fact, 'trustYearsOne', 'trustYearsTwo', 'trustYears', templates);
    case 'license': return fillTemplate(templates.trustLicense, fact.slots);
    case 'licenseNumber': return fillTemplate(templates.trustLicenseNumber, fact.slots);
    // Noa r3: the detail is never in the chip.
    case 'contractorRegistered': return fillTemplate(templates.trustContractorRegistered, {});
    case 'warranty': return fillTemplate(templates.trustWarranty, { duration: durationText(fact, 'bare', templates) });
    case 'warrantyVerbatim': return fillTemplate(templates.trustWarrantyVerbatim, fact.slots);
    // Adam: the callback set (the intake asks how fast the owner calls back); a place-scoped answer has no chip.
    case 'response': if (fact.slots.scope) return null;
      return sameDay(fact)
        ? fillTemplate(templates.trustCallbackSameDay, {})
        : fillTemplate(templates.trustCallback, { time: responseTimeText(Number(fact.slots.minutes), templates, fact.slots.form) });
    case 'rating': return fact.slots.count
      ? fillTemplate(fact.slots.count === '1' ? templates.trustRatingOneReview : templates.trustRating, fact.slots.count === '1' ? { rating: fact.slots.rating } : fact.slots)
      : fillTemplate(templates.trustRatingNoCount, fact.slots);
    case 'area': return fact.slots.area;
  }
}

/** The B6 proof sentence of one fact (null when the kind has no proof form: rating, area). */
export function proofText(fact: OwnerFact, templates: OwnerFactTemplates): string | null {
  switch (fact.kind) {
    case 'years': return yearsText(fact, 'proofYearsOne', 'proofYearsTwo', 'proofYears', templates);
    case 'license': return fillTemplate(opensWithDocumentNoun(fact.slots.license, templates) ? templates.proofLicense : templates.proofLicenseVerbatim, fact.slots);
    case 'licenseNumber': return fillTemplate(templates.proofLicenseNumber, fact.slots);
    case 'contractorRegistered': return fact.slots.detail
      ? fillTemplate(templates.proofContractorRegisteredDetail, { detail: fact.slots.detail })
      : fillTemplate(templates.proofContractorRegistered, {});
    // Noa r2: no tail -> proofWarranty; a fitting tail -> proofWarrantyScoped; a tail that does not fit -> the owner's full
    // answer through proofWarrantyVerbatim, else no sentence (never the unscoped form when a tail exists).
    case 'warranty':
      if (fact.slots.scope) return fillTemplate(templates.proofWarrantyScoped, { duration: durationText(fact, 'lamed', templates), scope: fact.slots.scope });
      if (fact.slots.proofVerbatim) return fillTemplate(templates.proofWarrantyVerbatim, { warranty: fact.slots.proofVerbatim });
      if (fact.slots.noProof) return null;
      return fillTemplate(templates.proofWarranty, { duration: durationText(fact, 'lamed', templates) });
    case 'warrantyVerbatim': return fillTemplate(templates.proofWarrantyVerbatim, fact.slots);
    // Adam: the callback set; a place-scoped answer takes the scoped arrival proof (proofResponseScoped / SameDayScoped).
    case 'response':
      if (fact.slots.scope) return sameDay(fact)
        ? fillTemplate(templates.proofResponseSameDayScoped, { scope: fact.slots.scope })
        : fillTemplate(templates.proofResponseScoped, { time: responseTimeText(Number(fact.slots.minutes), templates, fact.slots.form), scope: fact.slots.scope });
      return sameDay(fact)
        ? fillTemplate(templates.proofCallbackSameDay, {})
        : fillTemplate(templates.proofCallback, { time: responseTimeText(Number(fact.slots.minutes), templates, fact.slots.form) });
    default: return null;
  }
}

/** Kinds whose trust chip carries owner text or a licence number: Noa's VERBATIM_CHIP_MAX_CHARS guard applies. */
const GUARDED_CHIP_KINDS: readonly OwnerFactKind[] = ['license', 'licenseNumber', 'warrantyVerbatim'];

/**
 * Trust-bar kind order (B2: years, credential, warranty, area, response). The rating is not a B2 kind; it sits after the
 * area and before the response time (the response time is the one B2 makes conditional).
 */
export const TRUST_BAR_FACT_ORDER: ReadonlyArray<keyof OwnerFacts> = ['years', 'license', 'warranty', 'area', 'rating', 'response'];
/** B6 proof order (the facts with a proof sentence). */
export const PROOF_FACT_ORDER: ReadonlyArray<keyof OwnerFacts> = ['years', 'license', 'warranty', 'response'];

export interface FactPageOptions {
  /** An installation page never states an arrival / response time (item 6). */
  installPage: boolean;
}

/**
 * The code-built trust bar: at most TRUST_BAR_MAX_ITEMS items in TRUST_BAR_FACT_ORDER, one per kind; an item longer than
 * TRUST_BAR_MAX_CHARS code points is skipped (never cut); no response time on an installation page.
 */
export function trustBarFromFacts(facts: OwnerFacts, options: FactPageOptions, templates: OwnerFactTemplates): string[] {
  const items: string[] = [];
  for (const kind of TRUST_BAR_FACT_ORDER) {
    if (items.length >= TRUST_BAR_MAX_ITEMS) break;
    const fact = facts[kind];
    if (!fact || (kind === 'response' && options.installPage)) continue;
    const item = trustText(fact, templates);
    if (item && GUARDED_CHIP_KINDS.includes(fact.kind) && codePointLength(item) > VERBATIM_CHIP_MAX_CHARS) continue;
    if (item && codePointLength(item) <= TRUST_BAR_MAX_CHARS && !items.includes(item)) items.push(item);
  }
  return items;
}

/**
 * The code-built B6 proof items: one sentence per fact in PROOF_FACT_ORDER that traces to a brief proof id (so factIds stay
 * valid references), within the proof block limits (an item over them is skipped, never cut); no response time on an
 * installation page. May be empty (withSystemFields then sets proofItems to null).
 */
export function proofItemsFromFacts(facts: OwnerFacts, options: FactPageOptions, templates: OwnerFactTemplates): DepthProofItem[] {
  const limits = DEPTH_BLOCK_LIMITS.proof;
  const items: DepthProofItem[] = [];
  for (const kind of PROOF_FACT_ORDER) {
    if (items.length >= limits.maxItems) break;
    const fact = facts[kind];
    if (!fact || !fact.factId || (kind === 'response' && options.installPage)) continue;
    const sentence = proofText(fact, templates);
    if (sentence && sentence.length <= limits.maxChars && wordCount(sentence) <= limits.maxWords) items.push({ text: sentence, factIds: [fact.factId] });
  }
  return items;
}
