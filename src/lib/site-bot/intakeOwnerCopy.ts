/**
 * Site Bot launch step 1: the owner-contact and domain steps of the /site-bot/start intake (src/lib/site-bot/ownerIntake.ts).
 * Kept out of intakeCopy.ts so the placeholders never ride along with the audit page's copy import.
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every value starts as a `__HE_TODO_<key>__ <English gloss>`
 * placeholder (the researchedSiteLabels.ts convention) and is replaced by a byte-exact Tamar -> Noa patch. When the last
 * placeholder is patched, set INTAKE_OWNER_COPY_PENDING to false. ownerIntake.test.ts fails while the flag disagrees
 * with the values, and fails if the start page or its production redirect is opened at all: un-gating /site-bot/start
 * is a separate launch decision, not a side effect of this flag.
 * 2026-11-12: all 18 values applied from docs/copy/site-bot-intake-owner-contact-domain-FINAL-2026-11-12.json (Noa).
 * The trailing comment on each line is the original English gloss.
 */
export const INTAKE_OWNER_COPY = {
  contactTitle: 'איך משיגים אותך?', // H2 of the owner-contact step: where we reach you
  contactIntro: 'לכאן אנחנו שולחים לך קבלות, את הקישור לביטול המנוי, טיוטות תשובות לביקורות ואת הדוח החודשי. הנייד והמייל לא מופיעים באתר שלך.', // Why we ask: receipts, cancel link, review drafts and the monthly report go here; not shown on the site
  contactMobileLabel: 'הנייד שלך', // Label: your mobile
  contactMobilePrefillNote: 'לקחנו את המספר מהפרופיל העסקי שלך בגוגל. זה לא הנייד שלך? תחליף אותו.', // Shown under a pre-filled mobile: taken from your Google listing, fix it if needed
  contactMobileInvalid: 'תכתוב מספר נייד ישראלי: 10 ספרות שמתחילות ב־05, למשל 050-1234567.', // Error: not an Israeli mobile number
  contactEmailLabel: 'המייל שלך', // Label: your email
  contactEmailInvalid: 'המייל לא נראה תקין. תבדוק את הכתובת ותנסה שוב.', // Error: email address does not look right
  contactContinue: 'המשך', // Button: continue
  domainQuestion: 'יש לך דומיין — כתובת אתר משלך?', // Question (fieldset legend): do you have a domain?
  domainChoiceYes: 'כן, יש לי', // Choice: yes, I have a domain
  domainChoiceNo: 'אין לי', // Choice: no domain
  domainChoiceNotSure: 'לא בטוח', // Choice: not sure
  domainNoNote: 'אין בעיה. תקבל מאיתנו כתובת חינם שמסתיימת ב־wao.co.il. השם המדויק תלוי במה שפנוי.', // Shown after No: we give you a free address on wao.co.il
  domainNotSureNote: 'בסדר גמור. אחרי ההרשמה נבדוק את זה יחד איתך.', // Shown after Not sure: fine, we check it with you after sign-up
  domainInputLabel: 'הדומיין שלך', // Label: your domain
  domainInvalid: 'זה לא נראה כמו דומיין. תכתוב רק את כתובת האתר, למשל example.co.il.', // Error: this does not look like a domain
  domainSubdomain: 'תכתוב רק את הדומיין הראשי, בלי תוספת לפניו. למשל example.co.il.', // Error: enter the main domain, without a prefix before it
  domainContinue: 'המשך לתשלום', // Button: continue to payment
} as const;

export type IntakeOwnerCopyKey = keyof typeof INTAKE_OWNER_COPY;

/** True while any INTAKE_OWNER_COPY value is still a placeholder. False does not un-gate the start page (launch decision). */
export const INTAKE_OWNER_COPY_PENDING = false;
