# Assisted Site-Bot pilot journey — Hebrew microcopy (DRAFT / NOT APPLIED)

- Status: DRAFT / NOT APPLIED — unapplied internal draft. No source bytes, no accepted copy
  packet and no handoff file was changed by this document.
- Revision: 3 — same-card narrow correction (kanban t_a8a053d0, run 1533): the SB_STATUS_MISSING
  client-facing label now reports only an unmet check criterion — no invalidity, incorrectness,
  defect or mandatory-edit implication — per the supervisor's revision-2 review; English
  claim-boundary item 9 reconciled. Revision 2 (run 1529) applied comment810's six material
  claim corrections (playbook §Supervisor draft-acceptance checkpoint). Correction scope is
  this artifact only; no other file was touched.
- Author: waocopy (Hebrew authorship exclusive to this artifact; no Hebrew authored anywhere else
  in this run).
- Actual route: qwen3.8-max / alibaba (DashScope) — task model_override matches the configured
  profile route; context_length 1000000.
- Child task ID: kanban t_a8a053d0. Supervising canonical task: t_41c0e772 (independently reviews
  evidence/claims; reads this artifact back).
- Handoff executed: `handoff/pending/2026-10-11_002_waocopy_assisted-pilot-microcopy-draft.md`
  (read-only input; not moved, not modified).
- Date: 2026-10-11 (task date). Wall-clock timing metrics: unavailable — no-shell boundary; not
  sampled.
- Evidence inputs (read-only; not edited by this run — worker self-report only, no fresh hash or
  byte comparison performed under the no-shell boundary; not offered as independent proof):
  - `docs/research/assisted-sitebot-ads-readiness-pilot-playbook-2026-10-11.md`
  - `docs/research/shortest-real-mvp-path-2026-10-10.md`
  - `docs/copy/site-bot-offer-conversion-redraft-2026-10-08-v2.md` (journey/source/claim sections;
    whole file untouched)
- Fresh source reads for revision 2 (read-only): `src/components/ContactForm.tsx:46,53–80`;
  `src/app/api/lead/route.ts:86–93,96–135`; `src/lib/gbp/auditScore.ts:45–114`;
  `src/app/api/site-bot/audit-result/route.ts:11–17,43–44`;
  `src/app/(app)/site-bot/audit/page.tsx:16,18,141–150,161–163,219–254`.
- Fresh source read for revision 3 (read-only): `src/lib/gbp/auditScore.ts:40–119` — scoreAudit
  fail paths verified: a single category fails the ≥2 check (`:53`); reviews below the count
  threshold fail (`:96`); hours fail when special hours are absent (`:66`); description fails
  when an editorial summary is absent (`:106`). A fail never establishes an invalid profile.
- Review gates: independent Hebrew/claim QA (waohebrewqa) PENDING; founder voice spot-check
  (Eitan) PENDING at the normal later gate. No review is requested by this task; this draft makes
  no self-QA certification.
- Real client data: none. Placeholders only: `{business_name}`, `{address}`, `{phone}`, `{email}`.

## Scope legend

- `[SOURCE]` — existing source-supported interaction seam per the playbook capability register
  (name lookup; candidate selection/confirmation; no-match; check-unavailable; six-dimension
  available-information checklist; fail-gated categories/hours/photos self-fix instructions;
  contact form with machine acknowledgement). Source presence is not configured availability,
  runtime verification, or provider success.
- `[MANUAL]` — proposed/manual service (human assistance, business-specific follow-up, first-1–2-
  month human-reviewed Ads-readiness worklist). Conditional on separate direct agreement and
  later human review; never presented as an implemented automatic feature.
- `[PROPOSED]` — proposed interaction control with no current source evidence: the sole-match
  confirmation gate and its yes/no/reject controls; owner-correction and fix-completion
  record-saving; a separately rendered contact-uncertainty state. Each such message cites its
  neighbor SOURCE seam where one exists; a neighbor seam's existence does not make the control
  implemented. Like `[MANUAL]`, never presented as an existing feature.

## Voice and register

- Native Sabra Hebrew, singular-male address to the owner throughout.
- Sentences kept to 12–15 words; compact labels/buttons may be shorter.
- Positive useful value first; each constraint appears once, quietly, where it belongs — never as
  the lead and never as a recurring disclaimer.
- Busy ROI-minded owner persona: no jargon, no technical shorthand, concrete next steps.
- Keyword targets for natural wording only (no measured SEO/AIO claim): בדיקת הפרופיל העסקי ·
  פרטי הפרופיל · תיקון עצמי · אתר בליווי · מוכנות ל-Google Ads.

## Evidence vocabulary (mirrors playbook §Evidence vocabulary)

- Confirmed / Missing / Unknown are operator-reviewed labels, kept separate from the raw provider
  pass/fail/unknown statuses, which stay internal.
- A raw heuristic fail can occur while data is present (`auditScore.ts:50–108`): one category
  fails the ≥2 check; reviews below the count threshold fail; hours fail when special hours are
  absent; description fails when an editorial summary is absent. The client-facing fail label
  therefore says the check did not pass — never that the real-world field is missing. A raw fail
  or absent provider field is not proof of a real editable defect; owner verification precedes
  any asserted gap or fix.
- Unknown means this check lacked sufficient evidence (e.g. photos not fetched,
  `auditScore.ts:84`; zero categories, `:53`) — not that the information is inherently invisible
  from outside.
- Owner confirmation is attributed evidence alongside other permitted sources — not the sole
  allowable truth.
- Photo counts do not establish authenticity; review counts do not establish or promise ranking.

## Message-ID index (46 authored messages)

Lookup: `SB_SEARCH_PROMPT`, `SB_SEARCH_BUTTON`, `SB_SEARCH_BUSY`, `SB_NAME_INVALID` ·
Match: `SB_PICK_PROMPT`, `SB_PICK_OPTION_BUTTON`, `SB_CONFIRM_SOLEMATCH`, `SB_CONFIRM_YES`,
`SB_CONFIRM_NO`, `SB_NOT_MY_BUSINESS`, `SB_SELECTED_ACK` ·
No match: `SB_NOMATCH_TITLE`, `SB_NOMATCH_BODY` ·
Unavailable: `SB_UNAVAILABLE_TITLE`, `SB_UNAVAILABLE_BODY`, `SB_UNAVAILABLE_ALT` ·
Checklist: `SB_CHECKLIST_INTRO`, `SB_STATUS_CONFIRMED`, `SB_STATUS_MISSING`, `SB_STATUS_UNKNOWN`,
`SB_MISSING_ACTION`, `SB_UNKNOWN_VERIFY`, `SB_CHECKLIST_CANDOR` ·
Self-fix: `SB_SELFFIX_OFFER`, `SB_SELFFIX_ACCESS_NOTE`, `SB_FIX_CATEGORIES`, `SB_FIX_HOURS`,
`SB_FIX_PHOTOS`, `SB_FIX_DONE_CONFIRM`, `SB_FIX_OUT_OF_SCOPE` ·
Optional help: `SB_HELP_OFFER`, `SB_HELP_CONSENT_LINE`, `SB_CONSENT_DECLINED` ·
Contact: `CT_SUCCESS_TITLE`, `CT_SUCCESS_BODY`, `CT_FAILURE_TITLE`, `CT_FAILURE_BODY`,
`CT_UNCERTAIN_TITLE`, `CT_UNCERTAIN_BODY` ·
Readiness worklist: `WR_INTRO_TITLE`, `WR_INTRO_BODY`, `WR_SCOPE_LIST`, `WR_STATUS_LEGEND`,
`WR_GAPS_TITLE`, `WR_GAPS_BODY`, `WR_NOT_A_PROMISE`.

---

## 1. Name search [SOURCE]

### SB_SEARCH_PROMPT
Trigger/evidence: audit entry before submit. Name-only input — no signup, no phone; contact
details are never a condition of the free information check (`audit-lookup/route.ts:POST:72–119`
rejects a `phone` field; playbook §One-owner journey step 1).

> בוא נתחיל בבדיקה חינם של הפרופיל העסקי שלך בגוגל.
> מזינים רק את שם העסק — בלי הרשמה ובלי טלפון.
> הבדיקה מראה אילו פרטי פרופיל זמינים, ואילו לא נמצאו.

### SB_SEARCH_BUTTON (compact)

> לבדיקת הפרופיל העסקי — חינם

### SB_SEARCH_BUSY (compact, loading)
Trigger/evidence: POST in flight; the outcome stays conditional (match, no-match or unavailable
are all possible — `audit-lookup/route.ts:85–122`).

> מחפשים את הפרופיל העסקי בגוגל… עוד רגע נדע אם נמצא מידע זמין.

### SB_NAME_INVALID
Trigger/evidence: empty/invalid name or rejected extra field. Request a corrected name only; do
not infer business details (playbook §Exceptions: invalid input).

> הזן רק את שם העסק, כפי שהוא מופיע בגוגל.
> הבדיקה לא צריכה טלפון, כתובת או פרטים נוספים.

## 2. Correct-match confirmation / selection [pick seam SOURCE; confirmation gate PROPOSED]

### SB_PICK_PROMPT (multiple candidates) [SOURCE]
Trigger/evidence: `audit-result/route.ts:GET:20–52` multi-candidate pick outcome, rendered by
`audit/page.tsx:pick state,141–150`. Selection precedes findings; compare name and address;
ambiguous or wrong-address matches require clarification, never an automatic pick (playbook
step 1 decision).

> נמצאו כמה עסקים עם שם דומה.
> השווה את השם ואת הכתובת של כל אפשרות.
> בחר את העסק שלך — רק אז נציג את תוצאת הבדיקה.

### SB_PICK_OPTION_BUTTON (compact, per candidate) [SOURCE]

> זה העסק שלי — {business_name}, {address}

### SB_CONFIRM_SOLEMATCH (single candidate) [PROPOSED on a SOURCE seam]
Trigger/evidence: the sole-candidate GET currently returns `readyResponse` directly
(`audit-result/route.ts:43–44`) — no confirmation gate is implemented. This message and its
yes/no controls are a proposed interaction control layered on the source-evidenced ready seam;
sole-match owner confirmation is a playbook operating requirement, not an evidenced UI feature.

> נמצא עסק אחד בשם הזה — וצריך לוודא שזה שלך.
> שם: {business_name}. כתובת: {address}.
> אם זה העסק שלך — ממשיכים לבדיקה.

### SB_CONFIRM_YES (compact) [PROPOSED]

> כן, זה העסק שלי

### SB_CONFIRM_NO (compact) [PROPOSED]

> לא, זה לא העסק שלי

### SB_NOT_MY_BUSINESS [PROPOSED; the contact path it points to is SOURCE]
Trigger/evidence: proposed rejection path within the proposed confirmation gate. Business-
specific findings stop until identity is resolved (playbook §Exceptions: incorrect or disputed
candidate); the contact path referenced here stays open as the published source-evidenced
alternative.

> אין בעיה — עוצרים כאן ולא מציגים ממצאים על עסק אחר.
> נחפש שוב: נסה את השם המדויק כפי שהוא מופיע בגוגל.
> אם גם זה לא מסתדר, אפשר לפנות אלינו דרך טופס יצירת הקשר.

### SB_SELECTED_ACK [SOURCE after the pick path / PROPOSED after the sole-match gate]
Trigger/evidence: bridges into the available-data checklist after either the source-evidenced
multi-candidate pick (`audit/page.tsx:141–150`) or the proposed sole-match confirmation gate.

> מעולה — ממשיכים עם {business_name}.
> הנה פרטי הפרופיל הזמינים לבדיקה, עם סימון ברור לכל סעיף.

## 3. No match [SOURCE]

### SB_NOMATCH_TITLE (compact)

> לא נמצא פרופיל עסקי בשם הזה

### SB_NOMATCH_BODY
Trigger/evidence: zero-results outcome (`audit-result/route.ts:20–52`). No match means no
available result — not "no business" and not "no Google presence". No inferred details, no
manufactured report (playbook step 1 decision; V2 claim-check #2).

> זה לא אומר שהעסק שלך לא קיים או לא מופיע בגוגל.
> יכול להיות שהשם רשום קצת אחרת, או שהמידע לא זמין לבדיקה.
> שווה לנסות שוב — עם כתיב אחר או שם מלא יותר.
> אנחנו לא מנחשים פרטים ולא ממציאים ממצאים.

## 4. Check unavailable [SOURCE]

### SB_UNAVAILABLE_TITLE (compact)

> הבדיקה לא זמינה כרגע

### SB_UNAVAILABLE_BODY
Trigger/evidence: 429/503/500 classes — rate guard, valid daily ceiling / durable budget store,
missing provider configuration, provider or storage error (`audit-lookup/route.ts:85–122`;
playbook §Exceptions). Lookup retries stop; no ceiling or policy override is claimed or offered.

> משהו טכני מונע מהבדיקה לרוץ עכשיו.
> יכול להיות שהגענו למגבלת הבדיקות היומית, או שיש תקלה רגעית.
> עצרנו — ולא ננסה שוב ושוב אוטומטית.
> אפשר לחזור ולנסות מאוחר יותר.

### SB_UNAVAILABLE_ALT [MANUAL-conditional]
Trigger/evidence: optional line, clearly conditional. Manual readiness planning may continue from
clearly attributed owner-supplied evidence after separate consent (playbook §Exceptions). Not an
available automatic feature; nothing is promised here.

> יש גם אפשרות אחרת, בתיאום ישיר ובהסכמה:
> תספר לנו על העסק, ונתכנן איתך את הצעדים באופן ידני.

## 5. Available-data checklist [SOURCE]

### SB_CHECKLIST_INTRO
Trigger/evidence: scored snapshot for the confirmed business (`auditScore.ts:scoreAudit:45–114`).
Six dimensions, presented as information available to this check only — not a ranking forecast,
not local/customer visibility (playbook step 2; V2 claim-check #2, #4).

> הנה תמונת מצב של פרטי הפרופיל העסקי שלך בגוגל — לפי המידע שזמין לבדיקה.
> שישה סעיפים: קטגוריות, שעות פתיחה, תמונות, טלפון ואתר, ביקורות ותיאור.
> לכל סעיף יש סימון אחד משלושה: מאושר, לא עבר או לא ידוע.

### SB_STATUS_CONFIRMED (compact label)

> מאושר ✓ — המידע הזה זמין בפרופיל, לפי הבדיקה

### SB_STATUS_MISSING (compact label)
Trigger/evidence: the label renders on a raw `fail` (`auditScore.ts:50–108`) and reports only
that this check's criterion was not met — it never alleges an absent real-world field, and never
an invalid, incorrect or defective profile section or a mandatory edit, because a heuristic fail
can occur while data is present and valid (one category fails the ≥2 check; reviews below the
count threshold fail; hours fail on absent special hours; description on absent editorial summary
— playbook §Evidence vocabulary). Owner verification remains the prerequisite for any asserted
gap or fix (`SB_MISSING_ACTION`).

> לא עבר — הסעיף לא עמד בבדיקה, אבל המידע עדיין יכול להיות קיים

### SB_STATUS_UNKNOWN (compact label)
Trigger/evidence: unknown means this check lacked sufficient evidence (`auditScore.ts:84` photos
unknown when not fetched; `:53` categories unknown at count 0) — not that the information is
inherently invisible from outside.

> לא ידוע — לבדיקה הזו אין מספיק מידע על הסעיף

### SB_MISSING_ACTION [SOURCE for the instruction seam; owner-correction intake PROPOSED]
Trigger/evidence: a genuinely actionable gap gets one next step; owner verification precedes any
asserted gap or fix (playbook step 2 decision; handoff requirement 6). DIY scope stays
categories/hours/photos only. Owner-correction intake/recording is proposed/manual — no
implemented record-saving feature is shown; the correction route offered here is the
source-evidenced contact seam.

> סעיף סומן כ״לא עבר״? קודם בודקים מה באמת רשום אצלך בפרופיל.
> אם משהו באמת חסר בקטגוריות, בשעות או בתמונות — מחכות לך הוראות לתיקון עצמי.
> אם המידע דווקא קיים — אפשר לספר לנו דרך טופס יצירת הקשר.

### SB_UNKNOWN_VERIFY
Trigger/evidence: unknown means insufficient evidence — never a proven defect; absent provider
data is never turned into a confirmed business gap (playbook :38, :40). Verification step, not
a fix. Closing an unknown, or confirming a reviewed gap, needs appropriate permitted evidence:
owner-supplied evidence, attributed owner confirmation, or separately authorized evidence
(playbook :37, :54–55) — owner attestation or an owner-supplied source is not the only route,
and presence alone proves neither accuracy nor suitability (playbook :36). Raw heuristic status
stays separate from this reviewed interpretation (playbook :40). This draft gathers no real
evidence and creates no implemented verification control (playbook :56).

> ״לא ידוע״ לא אומר שמשהו מקולקל — לבדיקה פשוט אין מספיק מידע.
> רוצה לוודא? היכנס לפרופיל העסקי שלך בגוגל ובדוק בעצמך.
> כדי לסגור ״לא ידוע״ צריך ביסוס מתאים: האישור שלך, מקור שתספק או בדיקה שאושרה בנפרד.

### SB_CHECKLIST_CANDOR (single quiet accuracy line)
Trigger/evidence: one candor touch, never a lead (accepted voice direction; V2 claim-check #5–#7):
the check writes nothing to the profile, promises no ranking, and shows unknowns honestly.

> הבדיקה לא כותבת כלום בפרופיל שלך, וגם לא מבטיחה דירוג או חשיפה.
> היא מראה בכנות מה זמין לבדיקה — ומה לא.

## 6. One supported self-fix — categories / hours / photos only [instruction seam SOURCE, fail-gated; completion control PROPOSED]

### SB_SELFFIX_OFFER
Trigger/evidence: rendered only on a fail status in the three `DIY_KEYS` dimensions
(`audit/page.tsx:18`, fail-gated render `:161–163, :219–254`; V2 claim-check #3). One fix, chosen
by the owner, doable today. Instructions describe a review/correction the owner performs — never
an automatic write (playbook step 3).

> יש לך הזדמנות לתיקון עצמי אחד — חינם, ואפשר עוד היום.
> בוחר סעיף אחד: קטגוריות, שעות פתיחה או תמונות.
> מקבל הוראות צעד-צעד, ומתקן לבד בפרופיל העסקי שלך בגוגל.

### SB_SELFFIX_ACCESS_NOTE
Trigger/evidence: the no-password/no-code boundary is stated for THIS workflow only — not a
universal future policy claim. Confirm legitimate access; no profile access leaves the self-fix
pending (playbook step 3 and §Exceptions).

> התיקון מתבצע בידיים שלך, דרך החשבון שלך בגוגל.
> בתהליך הזה אנחנו לא נבקש ממך סיסמה או קוד אימות.
> אין לך גישה לניהול הפרופיל? התיקון פשוט ימתין — וזה בסדר.

### SB_FIX_CATEGORIES (steps)
Trigger/evidence: fail-gated categories DIY instruction (`audit/page.tsx:18,161–163,219–254`).
No minutes-based or any other update-timing expectation — existing evidence does not establish
Google update timing; the last step asks the owner to observe the change, not presume success.

> 1. נכנסים לפרופיל העסקי בגוגל — דרך החיפוש או המפות.
> 2. בוחרים ״עריכת פרופיל״ ואז ״קטגוריות עסקיות״.
> 3. מגדירים קטגוריה ראשית שמדויקת לעסק שלך.
> 4. מוסיפים קטגוריות משנה רק אם באמת צריך.
> 5. שומרים את השינוי, וחוזרים לפרופיל כדי לראות שהוא מופיע.

### SB_FIX_HOURS (steps)
Trigger/evidence: fail-gated hours DIY instruction (same seam). No presumed save success — the
final step is the owner's observed confirmation.

> 1. נכנסים לפרופיל העסקי בגוגל.
> 2. בוחרים ״עריכת פרופיל״ ואז ״שעות פתיחה״.
> 3. מסמנים את ימי הפעילות ואת שעות הפתיחה המדויקות.
> 4. יש חגים או שעות מיוחדות? כדאי לעדכן גם אותן.
> 5. שומרים — וחוזרים לבדוק שהשינוי מופיע בפרופיל.

### SB_FIX_PHOTOS (steps)
Trigger/evidence: photos are presence/count data only — guidance asks for real, current photos;
nothing here validates authenticity or amplifies count as a value claim (playbook §Evidence
vocabulary; V2 claim-check #4). Completion is the owner's observed check, not a presumed upload
success.

> 1. נכנסים לפרופיל העסקי בגוגל.
> 2. בוחרים ״תמונות״ ואז ״העלאה״.
> 3. מעלים תמונות אמיתיות ועדכניות — חזית העסק, פנים, מוצרים או צוות.
> 4. עדיפה תמונה ברורה עם תאורה טובה, בלי עריכה כבדה.
> 5. שומרים ובודקים שהכול הועלה.

### SB_FIX_DONE_CONFIRM [PROPOSED on a SOURCE seam]
Trigger/evidence: the completion-marking control and the saving of owner confirmations are
proposed/manual — no implemented correction/completion-saving feature is shown in source. The
neighbor SOURCE seam is the fail-gated DIY instruction render
(`audit/page.tsx:161–163,219–254`). Playbook rule kept: a completion statement needs owner
confirmation or permitted post-change evidence — never a re-run of the original checklist.

> סיימת לתקן? כל הכבוד — זה צעד אמיתי קדימה.
> סמן כאן שסיימת, ונרשום את זה לפי האישור שלך.
> בלי אישור ממך — לא נציג שום דבר כ"תוקן".

### SB_FIX_OUT_OF_SCOPE
Trigger/evidence: unsupported, unavailable, access-blocked or outside the three dimensions →
offer a verification step or separately scoped manual help; no invented solution (playbook step 3
decision).

> על הסעיף הזה אין לנו כרגע הוראות לתיקון עצמי.
> אנחנו לא ממציאים פתרונות שלא נוכל לגבות.
> מה שכן אפשר: להיכנס לפרופיל ולבדוק בעצמך מה המצב.
> רוצה עזרה בזה? היא אופציונלית, ומסוכמת ישירות מולך.

## 7. Optional consented help [MANUAL — proposed service; the contact seam itself is SOURCE]

### SB_HELP_OFFER [MANUAL]
Trigger/evidence: human assistance and business-specific follow-up are proposed/manual — they
require a named operator, mutual agreement and actual later work; contact submission does not
establish assignment (playbook capability register). No price/package, no scheduled human
availability.

> רוצה יותר מתיקון עצמי? אפשר — אבל רק אם תרצה.
> אתר בליווי אישי, או ליווי למוכנות ל-Google Ads — הכול מסוכם ישירות מולך.
> מגדירים יחד מה עושים ומה התנאים, בהסכמה, לפני כל פעולה.
> אין מחירון בעמוד ואין הבטחות גורפות — הכול מסוכם מולך אישית.

### SB_HELP_CONSENT_LINE
Trigger/evidence: scoped strictly to this form's observed validation — the submit handler returns
early without consent (`ContactForm.tsx:handleSubmit:55`) and the lead API rejects a missing
consent flag (`lead/route.ts:POST:100`). Not a blanket assertion about all transmissions.
Consent is never a contract or live-account permission (playbook step 4). The free check stays
ungated.

> לטופס יש אישור פרטיות אחד — בלי לסמן אותו, הטופס לא נשלח.
> הבדיקה החינמית לא מותנית בפנייה — היא נשארת שלך בכל מקרה.

### SB_CONSENT_DECLINED
Trigger/evidence: consent declined → optional help stays unstarted; free findings are not
withheld (playbook §Exceptions). The no-send statement is scoped to this form's observed
validation (`ContactForm.tsx:55`) — not a universal transmission claim.

> ויתרת על הפנייה? לגמרי בסדר.
> כל מה שכבר קיבלת — הבדיקה והוראות התיקון — נשאר שלך.
> שום דבר לא נחסם — ובלי סימון האישור, הטופס פשוט לא שולח פנייה.

## 8. Contact acknowledgements [success/error states SOURCE; separate uncertainty state PROPOSED]

### CT_SUCCESS_TITLE (compact)

> הפנייה נשלחה — שרת הדואר אישר קבלה

### CT_SUCCESS_BODY
Trigger/evidence: renders only after HTTP OK plus parsed `ok:true`, which the lead API returns
only on exact-recipient SMTP acceptance (`ContactForm.tsx:handleSubmit:71–78`;
`lead/route.ts:sendLeadEmail:86–93`, `:130–134`). This is explicitly machine SMTP acceptance —
NOT confirmed inbox delivery, human receipt, assigned operator, reply or timing. Acknowledged
send stays the lead; phone remains the verify-or-urgent path. The absence of a response promise
is one honest subordinate line, never the headline.

> שרת הדואר אישר שקיבל את הפנייה לכתובת הנכונה.
> זה אישור טכני של המערכת — לא אישור שהמייל הגיע לתיבה או נקרא.
> אנחנו לא מבטיחים זמן מענה, ועדיף להיות כנים איתך.
> רוצה לוודא שקיבלנו, או שזה דחוף? התקשר ישירות: {phone}.

### CT_FAILURE_TITLE (compact)

> לא קיבלנו אישור שהפנייה נשלחה

### CT_FAILURE_BODY
Trigger/evidence: the form collapses HTTP error, non-true `ok` and transport/parse exceptions
into one error state (`ContactForm.tsx:53–80`), and the API can return an error after a send
attempt (`lead/route.ts:130–134`). No rendered state therefore proves nothing was sent;
definitive not-sent wording is reserved for an established pre-send rejection, which the current
source never separately renders (client-side validation at `:55` returns early with no message).
Wording is unconfirmed-send plus a verification alternative; a retry is explicitly not presented
as guaranteed duplicate-free (playbook step 4 decision; §Exceptions).

> משהו השתבש — לא קיבלנו אישור שהפנייה נשלחה.
> שים לב: ייתכן שהפנייה בכל זאת עברה — התשובה שקיבלנו לא שוללת את זה.
> הדרך הבטוחה לוודא: התקשר אלינו ישירות — {phone}, או כתוב ל-{email}.
> אפשר גם לנסות לשלוח שוב, אבל אם הפנייה הקודמת עברה — תהיה כפילות.

### CT_UNCERTAIN_TITLE (compact) [PROPOSED]

> לא הצלחנו לוודא שהפנייה עברה

### CT_UNCERTAIN_BODY [PROPOSED]
Trigger/evidence: a separately rendered uncertainty state is not implemented — ContactForm
status has idle/loading/success/error only (`ContactForm.tsx:46,78–80`). This pair is proposed
for a future form that distinguishes transport ambiguity; today's single error state is covered
by CT_FAILURE_* above. No successful-send and no human-receipt claim; no automatic
resubmission; retry-or-published-contact alternative only (playbook §Exceptions: contact
failure/uncertainty).

> קיבלנו תשובה שלא מאשרת שליחה מוצלחת — ואנחנו לא מנחשים.
> כדי לא לשכפל פניות, לא נשלח שוב אוטומטית.
> רוצה לוודא? נסה שוב פעם אחת, או פנה ישירות: {phone}.

## 9. First-1–2-month Ads-readiness worklist [MANUAL — proposed, human-reviewed]

### WR_INTRO_TITLE (compact)

> מוכנות ל-Google Ads — תכנון ידני, עם בדיקת אדם

### WR_INTRO_BODY [MANUAL]
Trigger/evidence: the selected assisted service scope (shortest-real-MVP report lines 13, 38, 49;
playbook §Manual first-1–2-month readiness worklist). Conditional on separate direct agreement
and later human review; not an implemented automatic feature. The worklist plans only: it does
not create an account, connect a manager, accept billing, launch ads, or promise results.
Client-owned Google Ads account and payment stated as owner property (playbook month-1 rows).

> רוצה ליווי למוכנות ל-Google Ads? חשוב שתדע בדיוק מה מקבלים כאן.
> אם נסכם ישירות ובהסכמה, נכין עבורך רשימת עבודה לחודש-חודשיים הראשונים.
> כל רשימה עוברת בדיקה של אדם לפני שהיא מגיעה אליך — זו לא אוטומציה.
> התכנון לא פותח חשבון, לא מחבר הרשאת ניהול, לא מבצע חיוב ולא מריץ מודעות.
> חשבון ה-Google Ads ואמצעי התשלום נשארים בבעלותך — אנחנו רק מתכננים איתך.

### WR_SCOPE_LIST [MANUAL]
Trigger/evidence: plain-language cover of the worklist rows — account/payment ownership,
permissions, goal/offer, landing-page fit, tracking evidence, follow-up capacity, release gates
(playbook §Manual worklist table). No SLA, no campaign-management promise, no volume prediction.

> מה יש ברשימה?
> • חשבון Google Ads בבעלותך, כולל אמצעי התשלום — שלך.
> • מה נחשבת פנייה טובה עבורך — איזה לקוח באמת שווה לך.
> • התאמת דף הנחיתה או האתר שלך לפנייה.
> • בדיקת מעקב המרות — מה נמדד בפועל ומה לא.
> • מי מטפל בפניות שמגיעות, ואיך.
> • וכל דבר שחסר לפני שאפשר בכלל לדבר על השקה.

### WR_STATUS_LEGEND [MANUAL]
Trigger/evidence: the worklist uses the same evidence vocabulary; every unknown stays visible in
the delivered draft (playbook :94 schema row: item; confirmed/missing/unknown; exact supporting
source/date; gap; next safe action; responsible role; consent gate; human reviewer). These labels
are operator-reviewed interpretations, kept distinct from raw heuristic pass/fail/unknown
statuses (playbook :40). "Confirmed" needs an identified source or owner-authorized evidence
positively supporting the exact statement, with source/date attribution — presence alone proves
neither accuracy nor suitability (playbook :36). "Missing" is a reviewed gap established only by
appropriate permitted evidence of absence (which source, what was checked) or by attributed owner
confirmation — owner attestation or an owner-supplied source is not the only route (playbook
:37, :54). "Unknown" means insufficient evidence, never a proven defect (playbook :38). This
draft gathers no real evidence and creates no implemented verification control.

> כל סעיף ברשימה מקבל סימון כנה:
> מאושר — יש ביסוס: מקור מתאים עם תאריך, מידע שתספק, או האישור שלך.
> לא נמצא — נבדק מול מקור מתאים ונעדר, או שאישרת שזה באמת חסר.
> לא ידוע — אין מספיק מידע; זה לא מוכיח פגם, ואנחנו לא ממציאים.

### WR_GAPS_TITLE (compact) [MANUAL]

> יש פערים פתוחים — והרשימה עדיין שימושית

### WR_GAPS_BODY [MANUAL]
Trigger/evidence: missing or unknown launch-critical prerequisites mean not ready for launch; a
readiness draft is still delivered with those gaps clearly named; each gap gets its next safe
action. Never create accounts, connect MCC, accept billing or spend to make a checklist green
(playbook step 5 decision; §Exceptions).

> חלק מהסעיפים לא סגורים — וסימנו אותם בכנות, בלי להחביא.
> "לא מוכן להשקה" זה לא פסילה; זו מפה של מה שצריך לסגור.
> כל פער מקבל את הצעד הבטוח הבא שלו.
> בלי השערות, בלי מספרים באוויר, ובלי הבטחות על תוצאות.

### WR_NOT_A_PROMISE (single quiet transparency line) [MANUAL]

> נקודה אחת לשקיפות: הרשימה היא תכנון מוקפד עם בדיקת אדם — לא הבטחה לפניות, לדירוג או לתוצאות.

---

## Claim-boundary summary (English; draft-time self-check, not QA certification)

1. Provider success never claimed: lookup/checklist wording is conditional ("אם נמצא", "לפי
   המידע שזמין לבדיקה"); busy state promises no guaranteed answer.
2. No visibility/ranking claim: exactly one quiet candor line (`SB_CHECKLIST_CANDOR`); review
   counts never linked to ranking; no exposure promise anywhere.
3. No photo-authenticity claim: photo guidance requests real, current photos; presence/count data
   is never presented as authenticity validation.
4. No guaranteed outcome: `WR_NOT_A_PROMISE` states the limit once; no lead volume, revenue or
   timing forecast in any message.
5. No product-feature overclaim: every [MANUAL] message frames assistance and the worklist as
   conditional on separate direct agreement plus later human review — never an implemented
   automatic feature. Every [PROPOSED] control (sole-match confirmation gate and its yes/no/
   reject controls; owner-correction and completion record-saving; separately rendered contact
   uncertainty state) is labeled as proposed and distinguished from its neighbor SOURCE seams; a
   neighbor seam's existence is never presented as an implemented control. The sole-candidate GET
   currently returns ready without a confirmation gate (`audit-result/route.ts:43–44`), and this
   is stated in the affected trigger notes.
6. No pricing/package claim: zero ₪ figures; commercial posture is only "terms agreed directly,
   by mutual consent, before any work".
7. No human-availability/response-timing claim: success is machine acknowledgement only; the
   missing response-time promise appears once as candor, never as a headline.
8. No account/ad mutation or launch claim: `WR_INTRO_BODY` explicitly denies account creation,
   manager connection, billing and ad running; client ownership of the Google Ads account and
   payment is stated.
9. Confirmed/missing/unknown boundaries preserved: labels are separate from raw pass/fail. The
   client-facing fail label (`SB_STATUS_MISSING`) says only that the section did not meet this
   check's criterion — never that the real-world field is absent, and never that the profile or
   the section is invalid, incorrect, defective or in need of a mandatory edit — because
   heuristic fails can occur with present, valid data (a single category; reviews below the
   count threshold; absent special hours; absent editorial summary — `auditScore.ts:50–108`).
   Owner verification remains the prerequisite for any asserted gap or fix (`SB_MISSING_ACTION`).
   "Unknown" (`SB_STATUS_UNKNOWN`) reads as this check lacking sufficient evidence, not as
   inherently invisible from outside. Owner confirmation is attributed evidence alongside other
   permitted sources, not the sole allowable truth (`SB_UNKNOWN_VERIFY`, `SB_MISSING_ACTION`).
10. Contact claim boundaries: success = machine exact-recipient SMTP acceptance only, explicitly
    not inbox delivery, human receipt, assigned operator, reply or timing (`CT_SUCCESS_*`). The
    failure/error state never asserts nothing was sent: the implemented error state collapses
    pre-send rejection, post-send errors and transport exceptions (`ContactForm.tsx:53–80`;
    `lead/route.ts:130–134` can error after a send attempt), so wording reports unconfirmed send
    with a verification alternative, and a retry is not presented as guaranteed duplicate-free.
    The separately rendered uncertainty state is proposed only (form statuses: idle/loading/
    success/error — `ContactForm.tsx:46`).
11. No real client data: placeholders `{business_name}`, `{address}`, `{phone}`, `{email}` only.
12. Register: singular male throughout; 12–15-word sentences; compact buttons/labels shorter;
    impersonal-plural instruction voice used only inside step lists (standard Hebrew how-to
    voice, matching accepted V2 convention).
13. Entities woven naturally: Google Business Profile, categories, hours, photos, contact
    consent, client-owned Google Ads account/payment, landing page, tracking, lead follow-up.
    Keyword targets used for wording only — no measured SEO/AIO claim is made or implied.
14. Self-fix guidance makes no update-timing claim (the minutes-based expectation was removed
    from `SB_FIX_CATEGORIES`) and is conditional on actual access and the owner's observed
    completion — never presumed save/upload success (`SB_FIX_CATEGORIES/HOURS/PHOTOS`,
    `SB_SELFFIX_ACCESS_NOTE`). The no-password/no-code statement is scoped to this workflow, and
    consent/no-send statements are scoped to this form's observed validation
    (`SB_HELP_CONSENT_LINE`, `SB_CONSENT_DECLINED`).

## Untouched scope and pending gates

- Created by this task: this file only —
  `docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md` (originally run 1526;
  revision 2 corrected in place by run 1529; revision 3 corrected in place by run 1533, scope
  limited to the single remaining SB_STATUS_MISSING label claim and its reconciliations).
- Not edited by this run: the three named input documents, the accepted V2 packet, all source
  files, and all handoff directories (nothing moved, reconciled or edited). This is a worker
  self-report only — no fresh hash or byte comparison was performed (no-shell boundary); it is
  not offered as independent proof.
- Boundary honored: no shell commands, no tests/builds, no network or provider calls, no
  credentials, no preview/application/publication/deployment, no watcher, no child tasks, no
  engineering/setup task altered or unblocked, no founder review requested.
- Pending before any use of this copy: independent Hebrew/claim QA (waohebrewqa) on these exact
  bytes; founder voice spot-check (Eitan) at the normal later gate; any application requires a
  separate scoped engineer contract plus existing independent runtime/desktop/mobile gates.
- Pending acceptance: the supervisor's revision-2 independent review FAIL (one remaining
  SB_STATUS_MISSING claim) stands until a fresh exact-artifact/source review of this revision
  passes.
- Report posture: focused_acceptance = draft-completeness self-check only; release_health =
  false; language/voice review = pending.
