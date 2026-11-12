/**
 * Site Bot launch step 1: the owner-contact and domain steps of the /site-bot/start intake (src/lib/site-bot/ownerIntake.ts).
 * Kept out of intakeCopy.ts so the placeholders never ride along with the audit page's copy import.
 * HEBREW-SAFETY: the engineer never authors Hebrew. Every value starts as a `__HE_TODO_<key>__ <English gloss>`
 * placeholder (the researchedSiteLabels.ts convention) and is replaced by a byte-exact Tamar -> Noa patch. When the last
 * placeholder is patched, set INTAKE_OWNER_COPY_PENDING to false. ownerIntake.test.ts fails while the flag disagrees
 * with the values, and fails if the start page or its production redirect is opened while the flag is true.
 */
export const INTAKE_OWNER_COPY = {
  contactTitle: '__HE_TODO_contactTitle__ H2 of the owner-contact step: where we reach you',
  contactIntro: '__HE_TODO_contactIntro__ Why we ask: receipts, cancel link, review drafts and the monthly report go here; not shown on the site',
  contactMobileLabel: '__HE_TODO_contactMobileLabel__ Label: your mobile',
  contactMobilePrefillNote: '__HE_TODO_contactMobilePrefillNote__ Shown under a pre-filled mobile: taken from your Google listing, fix it if needed',
  contactMobileInvalid: '__HE_TODO_contactMobileInvalid__ Error: not an Israeli mobile number',
  contactEmailLabel: '__HE_TODO_contactEmailLabel__ Label: your email',
  contactEmailInvalid: '__HE_TODO_contactEmailInvalid__ Error: email address does not look right',
  contactContinue: '__HE_TODO_contactContinue__ Button: continue',
  domainQuestion: '__HE_TODO_domainQuestion__ Question (fieldset legend): do you have a domain?',
  domainChoiceYes: '__HE_TODO_domainChoiceYes__ Choice: yes, I have a domain',
  domainChoiceNo: '__HE_TODO_domainChoiceNo__ Choice: no domain',
  domainChoiceNotSure: '__HE_TODO_domainChoiceNotSure__ Choice: not sure',
  domainNoNote: '__HE_TODO_domainNoNote__ Shown after No: we give you a free address on wao.co.il',
  domainNotSureNote: '__HE_TODO_domainNotSureNote__ Shown after Not sure: fine, we check it with you after sign-up',
  domainInputLabel: '__HE_TODO_domainInputLabel__ Label: your domain',
  domainInvalid: '__HE_TODO_domainInvalid__ Error: this does not look like a domain',
  domainSubdomain: '__HE_TODO_domainSubdomain__ Error: enter the main domain, without a prefix before it',
  domainContinue: '__HE_TODO_domainContinue__ Button: continue to payment',
} as const;

export type IntakeOwnerCopyKey = keyof typeof INTAKE_OWNER_COPY;

/** True while any INTAKE_OWNER_COPY value is still a placeholder. The start page must stay gated off production. */
export const INTAKE_OWNER_COPY_PENDING = true;
