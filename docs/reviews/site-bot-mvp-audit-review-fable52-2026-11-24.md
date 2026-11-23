# Independent review: Site Bot MVP hard audit (Fable 5.2, 2026-11-24)

## 1. Verdict

**AGREE WITH CORRECTIONS.** Adam's direction is right: generation is safe, and the intake, profile switch and exit are the weak points. Two of his P0s target code that nothing calls, and one P1 is already half-built. He also missed that the human review step the terms promise has almost no tooling, and that the monthly report and the "fact gap → owner question" loop do not exist. His exit recommendation (free copy at any time) gives away the reason to stay; I replace it in section 4.

## 2. Corrections to the audit

| Item | Adam said | Actually | Severity |
|---|---|---|---|
| P0-1 | `executePatch.ts` writes without recording the prior value; make the snapshot code-enforced | True of the file, but `executeGbpLocationPatch` has **zero callers** (`executePatch.ts:163` is the only reference besides tests) and `fix-execute/route.ts` is an 8-line 503 stub. In the pilot the website switch happens by hand in Google's UI, where no code guard applies. The pilot fix is a written form with screenshots and the old values. | Stays P0, but the fix is a manual runbook; the code guard moves to "before writes are enabled" |
| P0-5 | One request can change several fields | Same dead code. He also missed the fallback branch at `executePatch.ts:146-149`, which copies an unvalidated payload under mask `profile`. | P0 → P1 (gate on enabling writes) |
| P0-2 | `hasWebsite` is captured but not acted on | Understated. The intake card carries the URL into the paid record (`startIntake.ts:29,56,171`), so the gate data already exists. Terms §6 (`site-bot-terms-of-use.md:57`) **promises** that a client with a domain gets the new site on it within three business days, which is exactly the action P0-2 forbids. | Stays P0; add the contract conflict |
| P0-3 | No third-party disclosure | Confirmed: no code hits for either Google answer ID. Google also asks for the notice at each renewal, so it belongs in the monthly report footer too (web check 2026-11-24). | Same |
| P0-4 | Quotes Google: "informed of all changes and edits" | My search (2026-11-24) confirmed the disclosure and written-notice rules but not this sentence verbatim. Adam should paste the exact passage. A per-audit approval log already exists (`site-bot/fixLog.ts` over `shared/approvalLog`); extend it. | Same; quote unverified |
| P1-1 | Intake is 3 questions, no photos, voice note off | Confirmed (`startIntake.ts:52,103-108`; `voiceNote.ts:17`; `StartPaidFlow.tsx:463`). The vague-answer probe already exists for the differentiator only (`StartPaidFlow.tsx:345-346`), so his item 10 is an extension. | Same |
| P1-3 | Owner never approves claims; block deploy until he does or 72 hours pass | Finding confirmed: deploy needs only the staff packet (`deploy/route.ts:308-310`). The fix conflicts with the one-business-day promise in §6. Better: he confirms extracted facts at intake, before generation (section 6). | Same; change the fix |
| P1-4 | Cross-client check is offline and warn-only; deploy compares pages within one site | Worse. `crossClientSimilarity` has no caller at all. `checkNearDuplicates` runs only on legacy core-30 nodes (`deploy/route.ts:409-422`), so a researched site gets **no** duplicate check at deploy. His fix ("block and route to the owner") sends our problem to the client. | Same; change the fix |
| P1-5 | Two plumbers in one city will show identical image files | Overstated. `assignHeroVariants` (`heroLibrary.ts:143-166`, called at `heroLibraryStore.ts:276`) picks the least-used variant per city and service; an owner photo wins on every page (`:174-175`). The collision starts at the fourth same-trade client in a city, and files repeat across cities. His "per-client crop for a different hash" hides a footprint without adding value; drop it. | P1 → P2 |
| P1-6 | Exit strands the profile | Confirmed (terms §8, lines 75 and 83). He missed the order problem: §18 removes WAO's manager access at termination, after which we cannot fix the link. Take-down is a manual staff reminder (`cancelNotices.ts:7`). | Same |
| P1-2 | Research gates never block, expire in 24 hours | Confirmed (`ownerGates.ts:14-19,30`). | Same |

I did not re-check P1-7, P1-9 beyond confirming `gridRank.ts` and the grid-scan route exist.

## 3. Missed risks

**P1-A (pilot-critical). The human review the terms promise has no real tool.** Terms §2 says a person at WAO checks every site. The console requires typing a research ID and slug by hand (`CopyReviewViewer.tsx:216-223`), shows raw copy fields by JSON path (`:269-274`), and offers one approve-all button (`:257`). It has no rendered page, no evidence per sentence, no edit, no queue. The only claims it checks are licence and warranty. I found no code in `src/` or `scripts/` that sets Hebrew QA to pass (only the `pending` initialiser at `researchedSiteGeneration.ts:441`), so that step appears to be a hand edit of a JSON file. Fix: section 5.

**P1-B. The monthly report is not built.** No report code exists under `src/lib/site-bot`; the 11-12 truth check said the same. Terms §2 and §15 promise it, and the first one falls due around 29.12. Adam buried this inside P1-8. Retention depends on it.

**P1-C. Fact gaps are computed and then dropped.** `researchPageCopy.ts:2684` emits `fact_gap`; nothing reads it. The "one owner question a month" loop, which is the answer to both thin pages and retention, does not exist.

**P1-D. Terms forbid Search Console.** §5 line 50 and §10 line 124 say there is no Search Console connection. Adam's own runbook step 4 requires it, and so does any honest report. Amend the terms.

**P2-E. Logo marks can collide in one city.** Trades have 4–8 marks picked by hash (`logoMarks.ts:155-161`) with no city awareness, unlike heroes.

**P2-F. One layout for every client.** Eight colour themes (`verticalThemes.ts:4-12`), one font (`siteDesign.ts:22`), one stylesheet function. See section 7.

**P2-G. Update window.** The November core update began 10 Nov with "up to 2 weeks"; I found no completion notice as of 24.11. No profile website changes until Google marks it complete.

## 4. Retention engine and exit policy

A static copy is a brochure. The subscription must be things that stop the day he leaves, and that he sees every month.

| # | Recurring benefit (live subscription only) | How he notices it | Status |
|---|---|---|---|
| 1 | **Lead delivery**: form and call-button leads reach him at once | Every alert email carries the running count for the month | Built (form, email alerts) |
| 2 | **Monthly proof report**: contacts from the site, plus calls, directions and clicks from the profile, plus review count | One headline number, month over month, by email and on the account page | Not built. By hand for the pilot; automate by 20.12 |
| 3 | **Map position picture**: a grid showing where he appears around his base | A before/after map image in the report | Scanner built, not wired |
| 4 | **Reviews flywheel**: request kit, new-review alert, drafted reply | "New review from X, here is a reply, tap to approve" | Kit built; polling and drafts exist; posting off. By hand in the pilot |
| 5 | **The site grows**: one question a month, answered in a voice note, becomes a new block, photo or page | "Added this month" section in the report with a link | Not built (P1-C) |
| 6 | **Profile watch**: hours, holiday hours, and changes Google or strangers make | "We caught and fixed" line in the report; the change log doubles as proof of work | `driftMonitor.ts` exists; needs the manager connection |
| 7 | **Changes on request** | Reply with the live link | Built (message box) |
| 8 | Later: profile posts, review strips on service pages, galleries | — | After the pilot |

**Cost to serve (my estimates, not measured; the pilot must measure them).** Hosting is near zero. Model calls for a monthly update cost cents; the mission file records US$1.50 for a full eval generation. Grid scans depend on the DataForSEO rate, which I did not verify. Staff time dominates: target 25 minutes for the first version and 10–15 minutes a month per client. Above 20 minutes a month the margin at ₪199 is in question.

**Recommended exit policy.**
1. **The address never dies.** On the offline date the site drops to a single business-card page on the same address: name, phone, hours, link to his Google profile. It is free and kept for 12 months. Every old page redirects to it.
2. **We fix the profile link before we leave.** Before manager access is removed, staff set the profile website to his choice: the card, his previous site (from the snapshot), or blank.
3. **His material is always his, free:** his photos, his voice-note transcripts, his facts, his leads.
4. **The full site stays as today:** a static copy free after 12 paid months, ₪900 before. The copy never includes the living parts (lead delivery, reviews, report, updates).
5. **Win-back:** the full site is restored if he returns within 90 days.
6. **The cancel screen shows his numbers** and exactly what stops and what he keeps.

This is fair: no dead link, no lost domain or profile, no held data. It is also honest that a one-page card will rank below a full site, and the cancel screen should say so.

## 5. Human review station

**Time budget:** 25 minutes target, 40 maximum, for a first version of 6–10 pages. Time is logged per site.

**Screen order**
1. **Queue.** Paid sites awaiting review, with age against the one-business-day promise.
2. **Pre-flight.** All automated checks as pass, warn or fail. A hard fail cannot be opened for approval.
3. **Facts sheet.** Every fact with its source (owner typed, owner said, Google profile, review), the gaps, and the claims needing a manual check.
4. **Pages.** Phone-width render on one side, fields on the other. Clicking a sentence shows its source facts. Order: home, top money page, other services, about, contact. Flagged sentences are highlighted so the reviewer reads those first.
5. **Look.** Hero, logo and photos beside thumbnails of same-trade peers.
6. **Profile coherence.** Name, phone, address and hours compared with the profile; categories against the service tree; the existing-website flag.
7. **Decision.** Approve, approve with an owner question queued, or hold.

**Pre-computed checks:** fact trace per sentence; generic-adjective and repetition hits (already in `copyGates.ts`); words and substance units per page (section 6); similarity against same-trade peers on model-written text; name/phone/address equality; foreign-script and bidi checks; links, form test and schema; photo quality scores; existing-site flag; leftover fixture or noindex strings.

**Left to the human:** Does this sound like this person? Is any claim risky or unprovable? Does each page deserve to exist or should it fold into the hub? Is the photo really his and suitable? Licence check against the registry. Go or hold.

**Fix flow, three buttons per field**
- **Regenerate** with a reviewer note as a constraint; gates rerun on that field only.
- **Edit by hand**; the diff and a reason code are stored, and the field is locked against later regeneration. Reason codes feed the weekly writing-rule upgrades.
- **Ask the owner**; a prefilled question goes to the message box, and the field is dropped meanwhile so the site still ships.

Approval is per page hash, so one fix does not force a full re-read.

| Exists | To build |
|---|---|
| Admin auth; packet bound to exact bytes; stale-record refusal; licence and warranty checks with name and date; deploy refuses without the packet; operator preview renderer (`localPreview.ts`) | Queue; pre-flight panel; rendered view with evidence; per-field regenerate, edit and ask; per-page approval; reason codes; timer; Hebrew QA and deploy-ready buttons; peer comparison; profile coherence panel |

## 6. Genuine and not-thin bars

**Genuine**
- **G1 Trace:** 100% of factual sentences in every rendered model-written field map to a fact ID. Today fact IDs cover only the depth blocks.
- **G2 Owner origin:** each money page uses at least 3 owner-origin facts beyond name, phone and service label; the site uses at least 12.
- **G3 Only-he-could-say:** each money page carries at least one of: a real job, a refusal, a price rule, a local detail, a named tool or brand, a number with its condition.
- **G4 Swap test:** against every same-trade peer, 5-gram similarity on model-written fields ≤ 0.15 and no shared run of 8 words. The current 0.25 over all block text is too loose.
- **G5 Voice:** at least one verbatim owner sentence on home or about.
- **G6 Zero generic-adjective hits** after the probe.

**Not thin**
- **N1 Substance units.** A unit is a process step from his facts, a question answered from his facts, a proof item, a price rule, or a real captioned photo. A service gets its own page only with at least 5 units and 250 visible non-boilerplate words (the existing floor). Otherwise it becomes a section on the services hub. Page count is earned; expect 4–8 pages for most pilot clients.
- **N2 Home** names a real person and shows who, what, where, proof and how to reach him.
- **N3** At least 70% of a page's sentences appear on no other page of the site.
- **N4 Gap budget:** every page under the floor has a queued owner question; closed within 60 days or folded into the hub.

**Intake changes** (after payment, so checkout conversion is untouched)
- A 2-minute voice note with three prompts: a recent job, what you refuse, the question every customer asks.
- At least 3 real photos.
- A required price-behaviour choice.
- One short question per priority service.
- The system shows him the extracted facts as a list to confirm or fix. This is also the owner approval from P1-3.
- For the pilot this is a 10-minute recorded call with Eitan.

**Generation changes:** one fact ledger with IDs and origin for all fields; page gating by substance units; job-story and refusal blocks; gaps become next month's question. Nothing is padded.

## 7. Real-effort design bars

**Checklist**
1. A real photo of the person or his work above the fold, or an honest typographic hero. Never AI people or AI "jobs".
2. Captions with place and month on work photos.
3. His own logo; otherwise a typeset name with a mark unique within his city and trade.
4. Colours taken from his logo or van when one exists.
5. Sections appear only when content exists, and the home composition follows his content: photo-rich, review-rich, call-first for emergencies, or process-led.
6. Two or three Hebrew type pairings per vertical.
7. Micro-details: live open/closed state, favicon from the mark, a share image built from his photo, a useful 404 with his phone, verified licence number shown.
8. An about page with a named person. Quality raters look for who is responsible and for visible effort.

**Built:** owner photo pipeline with quality scoring; AI atmosphere heroes restricted to the hero, labelled, city-aware; 4–8 approved marks per trade; generated name lockups; owner logo handling; blocks hidden when facts are missing.

**Missing:** photo collection in intake; work galleries; owner portrait; review strips; the owner's approval screen for the look; layout compositions; type pairings; colour from logo; city-aware mark assignment; automatic profile-photo fetch.

**Fleet-look risks:** identical page structure and stylesheet on every site; one font; 8 palettes; shared hero files across cities; shared marks; the same section order; many sites on wao.co.il subdomains. A shared template is not a violation by itself. The risk is a shared template plus thin, similar content. Variation must follow content. Random skins or re-cropped files to change a hash are concealment and should not be built.

## 8. Build plan

**Before 29.11** (Takbull and the rehearsal stay first)

| Item | Owner | Size |
|---|---|---|
| Manual profile-switch form: old values, screenshots, consent, one field only | seo-strategist, Eitan | S |
| Rule: no domain attach or profile switch for a client with an existing site until an equity check | Eitan | S |
| Third-party disclosure link in footer and welcome email | engineer, copywriter | S |
| Pilot depth intake by hand: call script, photo collection | seo-strategist, copywriter, Eitan | S |
| One-page review checklist plus operator preview per site | engineer | S |
| Similarity script run by hand per site | engineer | S |
| Rerun the truth check on /site-bot; name who hand-delivers the report | verifier, Eitan | S |
| Terms list for the lawyer: §5 Search Console, §6 domain promise, §8 exit card, §18 order | Eitan | S |

**During the pilot, by 20.12**

| Item | Owner | Size |
|---|---|---|
| Review station v1 | engineer, ux | L |
| Voice note, photo upload, facts-confirmation screen | engineer, copywriter | M |
| Fact ledger for all fields; substance-unit page gating | engineer, seo-strategist | L |
| Monthly report v0 with grid baseline | engineer, copywriter | M |
| Fact gap → monthly owner question | engineer, copywriter | M |
| Exit card mode and cancel screen | engineer, copywriter | M |
| Similarity check at deploy | engineer | S |
| Manager connection, change log, change notice | engineer | M |

**Before scaling past 10**

| Item | Owner | Size |
|---|---|---|
| Content-driven compositions, type pairings, colour from logo | brand-designer, ux, engineer | L |
| Galleries, profile-photo fetch, city-aware marks | engineer | M |
| Review alerts and reply posting | engineer | M |
| Profile write path: one field per write, enforced snapshot | engineer | M |
| Site migration (M4) | engineer, seo-strategist | L |
| Weekly fleet similarity and look report; fleet audit | engineer, verifier | S |

## 9. Three decisions for Eitan

1. **Exit policy.** Recommended: the card downgrade in section 4, keeping the 12-month / ₪900 rule for the full copy. Reject the free copy at any time.
2. **Is the depth intake a condition of going live?** Recommended: yes. A voice note and 3 real photos after payment; in the pilot, a 10-minute call with you. A client who gives nothing gets a small honest site (home plus services hub), not a service tree.
3. **Clients who already have a working site.** Recommended: the pilot takes only businesses with no site or a dead one. The rest wait for migration, and the §6 promise is reworded now.

Sources (web checks, 2026-11-24):
- [Search Engine Roundtable: November 2026 core update](https://www.seroundtable.com/google-november-2026-core-update-42504.html)
- [PPC Land: core update timing](https://ppc.land/googles-core-update-shifts-rankings-for-up-to-2-weeks-before-black-friday/)
- [Google Search Status Dashboard](https://status.search.google.com/products/rGHU1u87FJnkP6W2GwMi/history)
- [Google: Business Profile third-party policies](https://support.google.com/business/answer/7353941?hl=en)
- [Google: Working with a third party notice](https://support.google.com/business/answer/7163406)