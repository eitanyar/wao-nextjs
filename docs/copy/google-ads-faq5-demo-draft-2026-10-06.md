# Draft — truthful Google Ads FAQ5 answer and sandbox-demo CTA label

- Status: DRAFT ONLY — UNAPPLIED. No source file was modified; no application authority is granted by this file.
- Author: waocopy (kanban t_ab12e62f), Contract v3 `handoff/pending/2026-10-06_023_waocopy_draft-ads-faq5-demo-label.md` (SHA-256 `22976a34b9c31b1b999d179418ea43c36f2b01456d1edccdc1dbc34e5465f152`, matched at preflight).
- Sole parent: t_16fa03ad (formal DONE; independent bounded PASS for corrected STEPS row3/row5 delta only — not an approval of FAQ5 or of the whole page).
- Preflight pins (all matched before authoring, re-verified after):
  - `src/app/(app)/google-ads/page.tsx` = `2ac114c9f289ab36a9ead483a4fdaf9882ea89c9d2839036bb14efd887e418af`
  - `src/app/(app)/google-ads/onboarding/page.tsx` = `3537c8773657df9619540ea33019dee3ab8317b80d5b007ae8ee7e743af33928`
  - `docs/copy/google-ads-trust-flow-draft-2026-10-05.md` = `83999415771fa4b65f78eaf84697f33e08cdc475840a5462b2eecc252dfe5d1e`
  - `docs/copy/google-ads-protected-anchors-draft-2026-10-06.md` = `89ec7a0392de62aa5588d43be08c06868866a34e6d769895e1e29e16fcd78058`
  - `docs/copy/google-ads-uncertain-sections-draft-2026-10-06.md` = `4002eda04e20692e008ed18593c216a53ddf58203ad5b6e4d27086f7c7c114a4`
- Hebrew-safety: only waocopy authored the new Hebrew below. Existing source Hebrew is cited by file:line and deliberately NOT retyped here, so no stale copy of the rejected strings propagates into engineer-facing guidance.

---

## KEY googleAds.faq5.answer

Seam: `src/app/(app)/google-ads/page.tsx:147` — the `a:` string of `FAQS[4]` (visible FAQ row 5, rendered in the FAQ accordion). The question string at `:146` (the long-term-commitment question; cited by line, not retyped per Hebrew-safety rule) stays UNCHANGED. The old answer (cited at `:147`, not retyped) is replaced byte-exactly with:

> זו שאלה חשובה, ואת התשובה כדאי לברר ישירות — אצל כל ספק, כולל אותנו. לפני התקשרות על ניהול Google Ads, שאל: מה אורך ההתקשרות, ואיך יוצאים ממנה? למי יש גישה לחשבון הפרסום, ומה קורה איתה אם תרצה לעבור הלאה? רוצה לברר את זה אצלנו? אפשר להתקשר ולשאול — זו רק שיחה, בלי לחץ.

Claims (English, compact):
- Why it avoids the old claim: the old `:147` answer categorically asserted WAO's no-long-contract term, client ownership of the account and payment profile, MCC operation, and separate media-payment mechanics — all unverified (Rev 3 matrix A/D, companion `google-ads-trust-flow-draft-2026-10-05.md:63-65` and `:186`). The replacement states none of them, in any form. It answers the commitment question honestly by reframing it as buyer diligence: contract length, cancellation/exit, and account access are things to clarify directly with any provider — including WAO — not terms this page asserts or promises.
- No rhetorical-question laundering (contract "Don't"): no removed categorical claim reappears as a question followed by the same assurance. The questions are genuinely reader-directed and receive no WAO-specific answer here; the only follow-through is an invitation to ask by phone, with no consultation length, price, availability, or response SLA.
- The "כולל אותנו" phrasing keeps WAO subject to the same diligence instead of exempting it, and the closing invitation mirrors the already-drafted low-pressure conversation framing (companion Rev 2 hero, trust-flow draft `:110`, and the Rev 4 `anchors.faq1` redirect pattern) without duplicating the Rev 4 FAQ1 wording — deliberately distinct phrasing, consistent with the corrected uncertain-sections draft's non-duplication rule (`:62`).
- Entity anchors kept: ניהול Google Ads (keyword target), התקשרות/יציאה/גישה לחשבון (account-control and exit/contract questions). Register: singular male, direct, native Israeli ("שאל", "רוצה", "אותנו"); sentences short.
- Prohibited-claim scan (this cell): no price or number; no no-contract/termination term; no ownership/MCC/payment-profile assertion; no media-payer or invoicing mechanic; no free-consultation or 30-minute term; no results, lead counts, deadlines, or SLA; no service-availability promise.

Schema note: there is NO FAQPage schema mirror for FAQ5 — the structured-data `FAQPage` (`page.tsx:50-68`) pairs correspond only to visible FAQ rows 1 and 4 (`:54-57` and `:62-65`). This key therefore has a single seam (`:147`); no schema sync is required or proposed, and the Rev 4 synced-pair rule for `anchors.faq1`/`anchors.faq2` is untouched by this draft.

---

## KEY googleAds.hero.cta.sandboxLabel

Seam: `src/app/(app)/google-ads/page.tsx:216` — the link text inside the `<Link>` whose `href` is at `:215`. The `href` (`/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox`), the `className`/`style` attributes, the adjacent phone CTA (`:211-214`) and the Ads Bot CTA (`:218-220`) all stay UNCHANGED. The old label text (cited at `:216`, not retyped) is replaced byte-exactly with:

> צפה בהדגמת ה-Ads Bot ←

Claims (English, compact):
- Why it avoids the old claim: the old label (cited at `:216`, not retyped) asserted a no-live-budget property NOT established by the narrower supported fact (Rev 3 matrix D flag, companion `:64` and `:123`). The supported reality anchor is only that the demo can be viewed while online registration and payment are unavailable (`src/app/(app)/google-ads/onboarding/page.tsx:557`). The new label invites exactly that — viewing the existing Ads Bot demo — and nothing more: no no-live-budget, no no-ads, no sandbox-isolation claim (the word "Sandbox" is dropped because isolation is unverified here), and no implication that this is a paid signup path or a signup at all. The trailing arrow character is preserved for visual parity with the sibling outline CTAs.
- Keyword anchor kept: "הדגמת ה-Ads Bot" (Ads Bot demo target), matching the hero paragraph's existing Ads Bot mention (`:208`) and the companion Rev 2 demo-viewing sentence (trust-flow draft `:110`; cited by line). Register: singular male imperative ("צפה").
- SEO adjacency note (flag for gate 2, not a defect): after this replacement two sibling CTAs both mention the Ads Bot — this one (demo view) and the unchanged label at `:219` (onboarding track). The distinction (demo vs. track) is faithful to the two destinations; SEO may still want to weigh label similarity.
- Prohibited-claim scan (this cell): no demo-property claim of any kind beyond viewability; no paid/signup/availability statement; no price.

---

## Preservation and scope (what this draft does NOT touch)

- Exactly two keyed replacements above. All other FAQ rows (`:130-144`), the FAQ questions including `:146`, all CTAs other than the `:216` label text, the `:215` href, the FAQPage/Service/Breadcrumb schemas, and every other string on both pages are OUT OF SCOPE and unchanged.
- No source file, companion draft (`google-ads-trust-flow-draft-2026-10-05.md`, `google-ads-protected-anchors-draft-2026-10-06.md`, `google-ads-uncertain-sections-draft-2026-10-06.md`), copy bundle, or handoff-status file was modified. This file is the only new artifact.
- Rev 4 protected anchors (`anchors.faq1`, `anchors.faq2` synced pairs, badge/H1 gates) remain governed solely by their own pinned draft; this draft neither duplicates nor amends them.

## Open gates (none passed by this draft)

1. Independent two-cell claim-truth review (waoverifier, dispatched by waostrategy after this card is formal DONE/local PASS).
2. SEO review of the FAQ5 answer and CTA label; founder Hebrew spot-check (Eitan's human voice gate — grammatical correctness is not voice approval).
3. Full-page A/D/F reconciliation (badge/H1/hero paragraph and remaining matrix flags stay blocked on their own gates).
4. Separate byte-exact engineer application contract (waoengineer; no Hebrew typing), then runtime/RTL/visual verification.
5. Owner publication/deployment decision. release_health=false; no partial application authority.
