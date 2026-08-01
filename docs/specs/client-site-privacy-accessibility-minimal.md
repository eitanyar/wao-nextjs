# Technical Specification — Minimal Legal Privacy & Accessibility Disclosure for Client-Generated LPs/Sites

Author: Dror/Lior (Search & Paid-Media Strategist), on behalf of WAO strategy
Owner for implementation: Eitan-Dev (Next.js Engineer)
Verification owner: Roni (Verifier)
Status: Ready for implementation

Scope note: this spec governs the **per-client generated output** — the LP built by
`renderStaticHtml.ts` (ads-lp mode) and the 5-page site built by `renderSitePages.ts`
(site mode), deployed per-client to `{slug}.wao.co.il` via `site-bot/deploy/route.ts`.
It does **not** touch `wao.co.il`'s own `/privacy` or `/accessibility` pages, which
already exist, are correctly scoped to WAO itself, and must not be copied verbatim
into client output — the client business, not WAO, is the data controller for its
own lead form.

---

## 0. Legal basis (verified live, dated)

- **Privacy**: Section 11, Privacy Protection Law 5741-1981 ("חוק הגנת הפרטיות"),
  as clarified by the Privacy Protection Authority's live guidance
  (gov.il "חובת יידוע במסגרת איסוף ושימוש במידע אישי"). Applies to any active
  request for personal info — a lead form qualifies. Requires 5 disclosure
  elements at point of collection: purpose, third-party recipients (if any),
  voluntary/mandatory + consequence of refusal, controller identity + contact,
  and access/correction rights (§13/§14).
  - Amendment 13 (תיקון 13, passed 5.8.2024, key duties in force 14.8.2025)
    adds heavier obligations (DPO appointment, breach reporting, etc.) but those
    thresholds (10,000+ records, sensitive-data processing at scale) do not
    apply to a single-business lead form. Not in scope here.
  - Israel has **no EU-style cookie-consent-banner law**. A banner is only
    self-imposed best practice when analytics/ad-personalization cookies are
    set. Client sites do not run GA4. The only script call is
    `gtag('event','conversion',{send_to, transaction_id})` — no PII, just an
    orderId. **No consent banner is legally required. Do not build one.**
  - Communications Law §30A ("חוק הספאml") — the law behind unbundled marketing
    consent — governs unsolicited **repeat marketing** communications, not a
    single callback responding to the visitor's own inquiry. Not triggered
    here since clients only call back about the specific lead. Do not add
    ECL-style granular marketing consent copy to this flow (that remains
    correctly gated in VISION.md Gate 1 for if/when WAO adds Enhanced
    Conversions for Leads).

- **Accessibility**: Equal Rights for Persons with Disabilities Regulations
  (Service Accessibility Adjustments) 5773-2013 ("תקנות נגישות לשירות"), Siman ג',
  giving effect to Israeli Standard SI 5568 (WCAG 2.0 Level AA). Verified live
  via gov.il's accessibility guide (last updated 16.03.2026) and FAQ:
  - A **floating accessibility widget/toolbar is explicitly NOT required**
    ("אין כל חובה להשתמש ב'סרגל נגישות'") and does not by itself satisfy the
    law even if added ("שילובם של סרגלים אלו אינו פוטר מחובת העמידה"). **Do
    not build a floating widget.** Compliance = the underlying markup meeting
    WCAG AA (semantic headings, ARIA/labels, 4.5:1 contrast, full keyboard
    operability, skip-link, `lang="he" dir="rtl"`).
  - A published accessibility statement naming a contact is still legally
    required regardless of exemption status determination (see §1 below) —
    but it can and should be one short paragraph, not a multi-section document.
  - **Revenue-based exemption ladder** (self-declared, no filing needed unless
    above the top tier):
    - Revenue < ₪120,000/yr, OR registered as "עוסק פטור" → full exemption,
      self-declared.
    - Revenue ₪120,000–1,000,000/yr → exemption applies **only to sites that
      existed before 26.10.2017**. Every WAO-generated site is new →
      **no exemption in this bracket.**
    - Revenue > ₪1,000,000/yr → must petition the Commission directly; not
      self-declared. Out of scope for typical WAO clients but flag if it comes up.

---

## 1. New onboarding field — revenue/VAT-status tier

Add one field to `CollectedData` (`src/lib/bot/prompts.ts`) captured during bot
onboarding, alongside the existing financial fields (`revenueModel`,
`avgJobValue`, etc.):

```ts
// Legal/compliance
vatStatus?: 'osek_patur' | 'under_120k' | 'between_120k_1m' | 'over_1m';
```

- Ask this as a single low-friction question, phrased simply — do not use legal
  jargon like "תקנות נגישות". Suggested phrasing for Tamar/Noa to refine:
  "רק כדי לדעת מה נדרש מבחינה חוקית באתר — אתה עוסק פטור, או שהמחזור השנתי שלך
  מעל 120 אלף ₪?" Two-tap answer is enough; the exact ₪ bracket only matters
  for the accessibility-page decision below.
- Persist the answer + collection timestamp on the site/campaign record
  (same file the existing consent log lives in, e.g. `data/sites/{slug}.json`)
  so the exemption basis is auditable if ever challenged — mirrors the existing
  consent-log pattern already required for Google Ads (VISION.md Gate:
  "every budget change... must write an immutable record").
- Default behavior if the client declines to answer or the bot can't get a
  clear answer: **treat as non-exempt** (build the accessibility page). Never
  default to skipping a legally-required disclosure on missing data.

---

## 2. Privacy micro-page (build for every client, no exemption exists for this one)

- New render function alongside the existing `buildAboutHtml` /
  `buildServicesHtml` / `buildContactHtml` pattern in `renderSitePages.ts`:
  `buildPrivacyHtml(p, siteUrl)` → emits `privacy.html`. In `renderStaticHtml.ts`
  (single-page ads-lp mode), the equivalent output is a build-time static file
  written alongside the one HTML page, same `mode` branching already used for
  `ads-lp` vs `site`.
- Content is ONE templated paragraph, not a multi-section document like
  `wao.co.il/privacy`. Fields interpolated from `CollectedData`:
  `businessName`, `ownerName`, `phone`, `email`.

  Template (Tamar/Noa to finalize tone, this is the legal content floor):
  > "הפרטים שתשאיר/י בטופס באתר זה (שם, טלפון) משמשים את **{businessName}**
  > ליצירת קשר חוזר בנוגע לפנייתך בלבד, ולא יועברו לצד שלישי. מסירת הפרטים
  > היא לפי בחירתך — ללא מסירתם לא נוכל לחזור אליך. ניתן לבקש בכל עת לעיין
  > במידע שנמסר או למחוק אותו, בפנייה ל-{ownerName} בטלפון {phone}
  > {email ? 'או במייל ' + email : ''}."
- `robots: noindex,follow` (matches existing `wao.co.il/privacy` pattern —
  legal utility page, not a ranking asset; no cannibalization risk against
  `/seo` or `/seo/guide` since this is a per-client disclosure page, not
  content).
- Footer/nav link text changes from plain-text "מדיניות הפרטיות" (currently
  dead text in `LandingPage.tsx` line 185, `renderStaticHtml.ts` line 200,
  `renderSitePages.ts` lead-form section) to an actual `<a href="/privacy.html">`
  (site mode) or `<a href="/privacy">` (ads-lp mode, if routed) resolving to
  this page.
- Lead-form consent checkbox copy also needs the same 5-element notice inline
  or via that link — currently reads only "אני מסכים/ה למדיניות הפרטיות" with
  no link at all. Minimum fix: make it a real link to `privacy.html`.

## 3. Accessibility micro-page (build only for non-exempt clients)

- Same pattern: `buildAccessibilityHtml(p, siteUrl)` → `accessibility.html`,
  gated on `data.vatStatus !== 'osek_patur' && data.vatStatus !== 'under_120k'`.
- One paragraph, not a multi-section document:
  > "אתר זה נבנה תוך התייחסות לדרישות תקן ישראלי 5568 (התאמות נגישות בהתאם ל-
  > WCAG 2.0 רמה AA) ככל הניתן. לפניות או הערות בנושא נגישות ניתן לפנות ל-
  > {ownerName} בטלפון {phone}{email ? ' או במייל ' + email : ''}."
- Same `noindex,follow`, same footer link treatment as privacy.html.
- If `vatStatus` indicates exemption, **do not build this file or the footer
  link** — but the `vatStatus` answer + timestamp must still be persisted per
  §1, since the exemption is only valid if the basis is on record.

## 4. Explicitly out of scope for this pass — do not build

- No cookie/consent banner component of any kind (`CookieBanner.tsx`-style)
  on client-generated sites. Not legally required (no GA4, no ad-personalization
  cookie use); do not port the WAO marketing site's banner pattern here.
- No floating accessibility widget/toolbar (e.g. AudioEye/UserWay-style
  overlay). Explicitly non-mandatory per gov.il FAQ and does not confer
  compliance on its own even if added.
- No multi-section privacy policy or accessibility statement matching
  `wao.co.il/privacy`/`wao.co.il/accessibility`'s depth — those serve WAO's
  own GA4 + broader data-handling footprint, not a single-business lead form.
- No granular/unbundled marketing-consent language (Gate 1 ECL pattern) —
  not triggered since clients don't send marketing materials, only
  responsive callbacks.

## 5. Acceptance checklist (for Roni to verify)

- [ ] Every newly deployed client site has a resolvable `privacy.html` (or
      equivalent ads-lp static file) naming the client business, not WAO, as
      controller, with real phone/email pulled from `CollectedData`.
- [ ] Lead-form consent checkbox links to that page instead of dead text.
- [ ] `accessibility.html` exists and is linked ONLY when `vatStatus` indicates
      non-exemption; absent entirely (not a stub) when exempt.
- [ ] `vatStatus` + collection timestamp is persisted per site/campaign record
      regardless of which branch fires.
- [ ] No cookie banner, no floating accessibility widget present in any
      client-generated output.
- [ ] Both pages are `noindex,follow`, matching existing WAO legal-page pattern.
