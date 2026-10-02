# Addendum 1 (2026-09-30, post-C4 FAIL) — Astra homepage release-blockers

C4 (t_4651a687) FAILed 3 of 6 checks. Strategist decisions (owner escalation criteria applied):

F1 — FAQ cost item (check 4 FAIL): src/content/astra-homepage-copy.json faq.items[4]
("מה עולה אחרי שמתחילים?" → ₪9.90 / "אינן כלולות" / budget-separate) is cost-structure framing.
DECISION: DELETE that one item (byte deletion; items 0-3 and 5 retained: buyer-benefit/objection
handling and neutral terms pointer). Engineer adjusts contract test if it pins faq item count.

F2 — Commercial exit popup (checks 1+4 FAIL): src/components/ExitSurveyPopup.tsx renders a
site-wide exit-intent dialog with ₪9.90 offer + /site-bot CTA (layout.tsx:142). On the Astra
homepage it is a competing third offer foregrounding price.
DECISION: suppress on the Astra homepage route ONLY — inside ExitSurveyPopup (client component)
return null when usePathname() === '/'. No copy edits; other routes keep existing behavior
(separate product surface, out of this mission's scope).

F3 — Mobile launcher overlap (check 6 FAIL): fixed .wao-a11y-trigger (48px, left:16) intersects
video-heading glyphs and the full-width final CTA at 390/320.
DECISION (CSS-only, ≤480px media block in src/app/globals.css):
  - .astra-home .astra-button { max-width: calc(100% - 60px); margin-inline-end: 60px; }
    (RTL inline-end = left; keeps the launcher column free of primary CTAs)
  - .astra-home .astra-section-copy, .astra-home .astra-faq-section h2,
    .astra-home .astra-section-intro { padding-inline-end: 60px; }
    (keeps wrapped heading/body lines out of the launcher column)
  - keep launcher size/position/z-index/focus rules unchanged.
No Hebrew, no copy JSON, no component logic beyond F2.

Protected (unchanged): v3 copy fields, SEO anchors, routes, video embed, partner/founder blocks,
arrows mirroring, no PIN gate, production boundary.

Acceptance (objective): served HTML zero "₪9.90"; faq renders 5 items; exit popup never mounts on
'/' (DOM check after engagement simulation); at 390x844 and 320x700 the .wao-a11y-trigger box
intersects zero text-node rects AND zero .astra-button rects (Range.getClientRects sweep);
focused contract + canonical tests + build pass. Then C4b re-review (waouxtester) repeats the six
checks; material fail blocks release again.

Cards: F-fix = waoengineer (one writer); C4b = waouxtester (independent, gated on F-fix).
