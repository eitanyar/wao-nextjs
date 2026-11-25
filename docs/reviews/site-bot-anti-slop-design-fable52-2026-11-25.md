# Site Bot anti-slop design decision (Fable 5.2, founder seat, 2026-11-25)

Input: outside 7-point anti-slop proposal + Lior's verdict; Eitan: "every website design slop free". Prompt: scratchpad fable-slop-prompt.md. Model: claude-fable-5-2.

**Basis:** I read the renderer, themes, logo, hero library, preview code and copy gates, plus the step 2c verifier's rendered preview frames and screenshots. Those renders use fixture copy, so my findings are about layout and structure, not live-model wording. Nothing was edited or run.

**One conflict to settle first:** your constraint says AI images never appear in the hero, and the 16.11 spec says the same. The code does the opposite for plumbers: the 17.11 atmosphere library renders as the hero backdrop, including in the pre-payment preview (`heroLibrary.ts`, `previewFrame.ts`). I treat 17.11 as the live decision (backdrop only, darkened, flagged, never og/gallery/about). If "never in hero" is the real rule, the fix is one switch: plumbers get the solid hero like every other trade.

## Decision table

| # | Item | Decision | Timing | Owner | Acceptance |
|---|---|---|---|---|---|
| 1a | Accent colour from logo/van photo | Defer, as Lior | Post-launch, with owner approval screen | Engineer + Maya | Override only at ≥4.5:1; no photo → theme unchanged, byte-identical |
| 1b | Trade font pairing | Drop | — | — | Heebo only |
| 1c | Collect the brand photo | Do (see answer 4) | Before first photo request | waocopy + engineer | Slot exists, skippable, stored |
| 2 | Per-trade norms study | Defer | Post-launch, once | Yonatan | Fixed config, no live lookup per build |
| 3a | Layout from photo inventory | Defer | After GBP photo access works | Engineer | — |
| 3b | No-AI-enhancement test | Proceed, tightened (answer 2) | Step 3 | Engineer | Test fails on any non-whitelisted image operation |
| 4 | Section order from evidence | Proceed | Step 3 | Engineer | Empty section never renders; order recorded per site |
| 5 | Paid designer | Trigger-based (answer 3) | Mid-December check | Adam | — |
| 6 | One fact per screenful | Proceed | Step 3 | Engineer | Each 390×800 slice of the home page has a ledger fact, phone, hours or credential |
| 7 | Subheadline phrase blocklist | Already built; extend only | Step 3 | waocopy | `genericAdjectiveHits` already blocks about 40 empty words and phrases on every field; waocopy adds "partner / solutions under one roof" class phrases to the data file |
| T1 | Anti-slop lint on rendered HTML | Move forward | Before 29.11, polish run | Engineer | Test over preview and full site: no gradient outside the hero overlay, no `backdrop-filter`, no emoji, no centred section, no stock host; AI images only by library hash |
| T2 | Lineup, perceptual hash, vision rubric | Defer | About 10 same-trade live sites | Adam, Gemini only | — |
| X1 | Zero-photo preview looks finished | Do | Before 29.11 | Roni + Maya | Electrician fixture (solid hero), 390px and 1440px screenshots, live-model copy, no empty band |
| X2 | Core-30 old hero | Drop as a launch item | — | — | Those pages render only for legacy or simulation records (`deploy/route.ts:406`), not the new flow |
| X3 | Gradient tokens | Later cleanup, widened (answer 5, finding 7) | Post-launch | Dana + engineer | — |
| P1–P5 | Polish items (answer 5) | Do | P1 in step 2; rest in one polish run before the first site goes live | Engineer | Per item below |

## 2. AI boundary

Lior's rule is confirmed, with a whitelist instead of a ban list.

- **Owner and GBP photos:** only downscale, crop, EXIF rotate and strip, and format conversion. Nothing else: no upscale, sharpening, colour grading, background removal or generative fill.
- **Owner logo file:** trim and resize only.
- **AI atmosphere images:** hero backdrop only, under the overlay, carrying `data-ai-generated="atmosphere"`, matched by sha256 to the approved library. The owner's photo always wins.
- **AI logo marks:** header logo slot only, never when an owner logo exists, never sent to Google.
- **Test:** any `<img>` without the atmosphere flag must trace to an owner upload or the GBP store.

## 3. Designer

Trigger-based, not now. Run the lineup in mid-December on real sites. If a blinded reviewer calls 10 same-trade homepages "one template", first spend one Dana + Fable run on a second page skeleton. Hire the designer only if that also fails, capped at ₪8K for skeletons, not themes.

## 4. Van, sign or business card photo

Yes. Make it the third photo slot, worded "van, sign or business card, whichever you have", and skippable. It is the only real brand evidence these owners have, and it feeds 1a later. Collect it from day one even though colour extraction ships after launch. No photo means no section and no change.

## 5. Slop tells Lior missed

1. **P1: identical icon on every service card in the preview.** The preview renders only the home page, so no card finds its service page and every card gets the neutral check-in-a-square tile (`researchedSite.ts:756`). On live sites, any service outside seven plumbing, electric and lock patterns gets it too. Fix: render no tile when the icon is the neutral one.
2. **P2: trust bar.** A bare city name gets a trust checkmark, and two items sit in a four-column desktop grid, leaving half the row empty. Fix: columns equal the item count. Whether the city tile stays is waocopy's call.
3. **P3: hero overlay is hard-coded navy** (`siteLook.ts:67`), not the theme colour. In the fixture screenshot that gives a navy hero, a green and beige page and an orange button. Real Hebrew plumbers get the navy theme, so it only bites when trade detection falls through to the default. Fix: no library photo unless the theme is `emergency-trades`; otherwise the solid hero.
4. **P4: footer.** Name, phone and hours are start-aligned, while the three rows below are centred. The Google profile link also appears twice, once above the form and once in the footer. Fix: start-align everything; Yonatan picks which link stays.
5. **P5: contact page.** It ships on every new site and still has the old centred white intro, unlike the home hero (`renderSitePages.ts:755`). Fix: use the solid hero shell, start-aligned.
6. **One palette for six trades.** Plumbers, electricians, locksmiths, AC, pest control and gas all get the same navy and burnt orange. Two same-city plumbers differ only in name, photo variant and copy. Acceptable at three starts a week; item 1a is the real fix.
7. **Dead theme tokens.** The theme file still names Secular One and Assistant fonts, centred heroes and badge shapes. The button colour is parsed out of a gradient string (`siteDesign.ts:35`). Nothing renders them on the new path, but the next engineer may. Replace with a plain `ctaSolid` token.
8. **Preview honesty.** The preview screen says every line comes from the owner and Google, but the plumber's backdrop photo is not his. I only checked the screenshot, not every string. Add one waocopy line outside the frame: the background picture is an illustration, and his own photo replaces it after payment.

## Engineer additions for the step-2 run now

Only P1: in `serviceDetailsSection`, omit the `.tile` span when `serviceIcon()` returns `svc`. Acceptance: the fixture preview has zero `#i-svc` uses, and matched cards keep their icons. No Hebrew is touched.

## Lines for the step-3 brief

- Section inventory and order are computed from ledger evidence, with the order recorded on the site record.
- Per-screenful fact check on the home page at 390px.
- Image-operation whitelist test and the AI-image hash allowlist (answer 2).
- Same-trade comparison also covers which trust-bar items and service-card names repeat across sites.
- The anti-slop lint (T1) becomes a blocking part of the per-page gate.
- Extend the generic-phrase data file through waocopy; do not build a new gate.
- Before step 3 and before the first site goes live, one polish run: P2–P5, T1, X1 and the finding-8 preview line (waocopy first).

**Next prompt to paste after /clear:** "Adam: apply the Fable 5.2 slop decision of 25.11. Add P1 (no neutral icon tile) to the step-2 engineer brief. Queue one polish run before the first live site: P2–P5, the anti-slop lint test, the electrician zero-photo preview check by Roni and Maya, and a waocopy line for the preview screen about the illustration photo. Ask Eitan one question: does the plumber AI backdrop stay in the hero, or does 'never in hero' win?"
