# Exit Prompt as Useful Opt-In — Decision Memo (2026-10-03)

Task: t_30bcdc81 (PARKED design decision). Author: waostrategy (Dror/Lior), executed under t_e19bf6ab.
Gate release evidence: parked condition was "do not start until the first production commit lands (Candidate A deployment-security or the homepage v3 commit)". Verified 2026-10-03: origin/hermes-migration contains the homepage commits 1051ad9 "feat(homepage): publish reviewed Astra homepage" and 2cea54d "fix(homepage): suppress exit popup on /, drop FAQ cost item, mobile launcher clearance"; t_fe1b903b (done 2026-10-01, independently verified) pushed beaf348 and activated the Astra release on production www.wao.co.il. Gate SATISFIED. This memo is design-only: no implementation, no copy drafting, no UI change.

## 0. Current state (observed on origin/hermes-migration @ 743abfe, 2026-10-03)

- Mount: src/app/(app)/layout.tsx:142 renders <ExitSurveyPopup /> site-wide for the (app) group.
- Routing (ExitSurveyPopup.tsx getVariant): pathname '/' → null (suppressed since 2cea54d); NO_POPUP_PATHS (course checkout, /contact, /account, /admin, /client, /checkout, /leads, /trainer, /privacy, /accessibility, /preview-lp, /geo tool surfaces) → null; COURSE_VARIANT_PATHS (/training, /blog, /knowledge, /glossary, /about) → 4-step course-lead survey; everything else (incl. /seo, /google-ads, /site-bot, /consulting, /google-business) → 'commercial' exit-intent variant.
- The commercial variant historically sold a ₪9.90 offer and deep-linked WhatsApp (wa.me/972526148860). On '/' it competed with the two approved conversion paths and foregrounded price → C4 conversion FAIL (t_4651a687), fixed by suppression in t_0cf86a44/2cea54d. C4c (t_9f885ee7) then PASSed all six checks with no exit dialog on '/'.
- Persistence gate: localStorage key wao_exit_survey_state; status 'dismissed' suppresses 14 days; 'submitted' suppresses forever.
- Submission path: POST /api/exit-survey requires name + challenge; fires a fire-and-forget SMTP notification email (no double opt-in, no stored consent record beyond the email body).
- A11y geometry: fixed accessibility launcher sits bottom-left (observed at 390×844: rect x16 y788 w40 h40); F3b (t_f125fc1d) added a CSS safe gutter ≤480px with ~180k geometry samples and 0 intersections — the popup must respect the same gutter.
- Email infra available: Resend transactional (src/lib/mail.ts) and the exit-survey SMTP route.

## 1. User value proposition

Replace the price-offer commercial variant with a single useful opt-in asset: a free, no-obligation "10-minute marketing checkup summary" email — three concrete findings about the visitor's own business type (niche bucket already collected: clinic/lawyer/ecommerce/other) plus one next-step recommendation. Value is delivered BY email (the opt-in IS the delivery mechanism), never gated behind payment. No price, no ₪ figures, no add-on mechanics anywhere in the prompt. The prompt must read as a fallback for visitors leaving without converting, not as a third competing offer.

## 2. Consent model (Israeli Privacy Protection Law, Amendment 13 alignment)

- Explicit opt-in: one unchecked-by-default checkbox ("I agree to receive the checkup summary and occasional marketing emails from WAO"), separate from any survey field; submission disabled until checked.
- Prior consent before any marketing email (Amendment 13 spam prohibition); purpose stated at collection; WAO identified as the sender/marketer in the prompt and in every email.
- Every email carries one-click unsubscribe; unsubscribe honored server-side (suppression list), not only via localStorage.
- Data minimization: collect email + niche bucket only for the opt-in variant (name/challenge remain optional and belong to the survey variant, not the opt-in). Store consent timestamp, source pathname, and variant id with the record.
- No pre-checked boxes, no dark patterns, no consent bundled into terms; privacy policy linked inline.
- localStorage gate stays as a UX frequency cap only — it is NOT the consent record.

## 3. Timing / trigger rules (never interfere with the two primary paths)

- '/' stays SUPPRESSED permanently (preserve the C4c win). Opt-in variant enabled only on service/marketing pages: /seo, /google-ads, /site-bot, /consulting, /google-business and their subpaths; NO_POPUP_PATHS and COURSE_VARIANT_PATHS unchanged.
- Exit-intent only (existing desktop mouseleave-top / mobile scroll-up heuristics). Never on first paint.
- Additional intent floor: show only after dwell ≥30s AND at least one full-viewport scroll, so accidental bounces never see it.
- Copy must not mention or restate the primary CTAs' destinations as competing actions; one secondary line may reference "or start now" linking to /google-ads/onboarding and /site-bot/start exactly as the page already does — no new offer, no price.
- Max one impression per session; if the visitor clicked a primary CTA during the session, suppress entirely for that session.

## 4. Suppression rules

- Keep: 'submitted' → never again; 'dismissed' → 14 days (existing gate key reused).
- Add: never render while the cookie consent banner is visible; never render on top of or within 48px of the accessibility launcher rect at any viewport (reuse the F3b ≤480px gutter pattern; modal overlay must leave the launcher hit-target free — C4b item-6 class of defect must not recur).
- Add: global frequency cap of 2 impressions per 7 days across pages (extend the gate state object, backwards-compatible read).
- Add: suppress for returning opted-in users (server-side suppression list checked at render via a lightweight same-origin endpoint or embedded flag).

## 5. Success metrics

- Opt-in rate = submissions / impressions, target ≥2% on enabled pages (course-variant baseline to be measured in the same window for comparison).
- Email engagement: open ≥35%, click ≥8% on the checkup summary (Resend/SMTP reporting).
- Downstream conversion: share of opted-in cohort starting /google-ads/onboarding or /site-bot/start within 30 days vs a matched non-impression control (gclid/UTM-attributed lead records already carry the trace).
- Guardrails: unsubscribe rate <0.5% per send; zero regression in primary-path conversion starts week-over-week; zero a11y-launcher or cookie-banner overlap reports.
- Measurement lives in existing CRM lead records + a new opt-in table/field; no new analytics vendor.

## 6. Go / no-go recommendation

GO, with the constraints in §1-§4 binding: build a NEW 'optin' variant (email checkup summary) for the five service page families, keep '/' suppressed forever, keep the course variant unchanged, and retire the ₪9.90 commercial offer copy from the component. Sequence if approved: (1) waocopy Hebrew bundle for the opt-in prompt + email (singular male, ≤15-word sentences) → (2) waohebrewqa material gate → (3) waoengineer implementation card (variant routing, consent checkbox + server-side consent record + suppression list, frequency caps, launcher/cookie-banner guards, contract tests) → (4) waouxtester visual/RTL QA incl. 320/390 launcher geometry → (5) owner deploy gate. No implementation is authorized by this memo.

## 7. Owner decisions required

- Approve GO (or NO-GO) on §6 and the §1 asset choice.
- Confirm the opt-in email sender identity/domain (Resend verified domain vs exit-survey SMTP) — deliverability/identity is a legal-adjacent choice.
- Everything else in this memo is reversible product design and needs no further owner input.
