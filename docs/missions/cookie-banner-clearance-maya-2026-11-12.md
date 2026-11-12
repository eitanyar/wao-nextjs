# Cookie banner clearance (Maya, 2026-11-12)

## Outcome
The fixed bottom cookie banner never covers a focused or tappable control on any page, at any text size or orientation. This is site-wide, not intake-only.

Trigger: Roni found that at 390×844 the banner (about 165px, `z-index: 9999`) covers "Continue" on the new /site-bot/start domain step. Touch users get no focus-scroll at all.

## Files
- `src/components/CookieBanner.tsx`: add a ref on the banner div, and a ResizeObserver effect that sets `--wao-cookie-h` on `<html>` while the banner is visible and removes it on dismiss. Declare the hook above the early `return null` (line ~27).
- `src/app/globals.css`:
  - Add `html:has(.wao-cookie-banner){scroll-padding-bottom:calc(var(--wao-cookie-h,0px) + 16px)}` and `body:has(.wao-cookie-banner){padding-bottom:var(--wao-cookie-h,0px)}` near the cookie rules (~1425).
  - DELETE the guessed intake values at ~1449-1461: the scroll-margin 120/240/400 and padding 220/380 rules, including the ≤640 media block. Keep the `:focus-visible` rules at ~1446-1448.
- `src/app/(app)/site-bot/start/StartPaidFlow.tsx`:
  - Add `minHeight:"44px"` to `fieldInputStyle` (~114-125).
  - Optional: `scrollIntoView({block:"start"})` after the heading focus on the contact and domain steps (~273-275).
  - Lower priority: `aria-disabled` plus a hint (copy from Tamar) instead of `disabled` on the domain Continue. Confirm that the choice buttons sit in a fieldset with a legend or `role="group"`.
- `CookieBanner.tsx` buttons (~88-110): `minHeight:44px`, and `display:inline-flex;align-items:center` on the link.

## Constraints
- Don't add `/site-bot/start` to the banner's `SUPPRESS_ON`. That would drop the privacy disclosure on the paid path, which is a legal call, and Maya recommends against it.
- No consent-logic change: same `localStorage` key (`wao-privacy-consent`), same show and hide rules.
- No Hebrew authored.

## Acceptance
`npm run test` and the webpack build pass, plus a scoped lint.

## Verifier (Roni)
Run with the banner not yet accepted, at 390×844, 1440×900 and 844×390, plus the a11y large-text mode:
1. `--wao-cookie-h` equals the banner height, and it is cleared after accepting.
2. Tabbing to Continue on the contact and domain steps leaves the button fully above the banner top.
3. At rest, the step heading and the first choice are above the banner.
4. The home page lead form at 390 shows the same clearance. /site-bot/audit and /contact are unchanged (the banner stays suppressed there).
5. No horizontal overflow, and the bidi grep returns 0.
