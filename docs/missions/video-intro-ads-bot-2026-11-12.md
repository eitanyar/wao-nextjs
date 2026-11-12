# Mission: Ads Bot intro video, storyboard + shot list + visual spec (Fable 5.2, 2026-11-12)

Design only. Nothing here is rendered, and no Hebrew is authored here. Narration comes from
`docs/copy/briefs/video-intro-ads-bot-2026-11-12.md` (Tamar → Noa → Eitan's ear).
Sister document: `video-intro-site-bot-2026-11-12.md` (the visual system is shared and is not repeated here).
Claims source: `claims-ledger-2026-11-12.md` section A, re-checked in code today.

## Outcome
One 65–70s master ("how it works, stage by stage") and three cuts (30s / 15s / 6s), each in 9:16, 1:1
and 16:9, built by `scripts/video/build-video.mjs` from one script JSON. The viewer is already on
`/google-ads` or in onboarding. He should finish knowing what the bot does with his money before it
has data, what changes once he has marked enough real jobs, and that he can watch all of it himself.

**One idea:** two stages, in the open. First the bot guards his money while the new account still
knows nothing. Once he has marked enough real jobs, bidding aims at a cost per enquiry. He sees
every enquiry and every shekel in his own account the whole way.

This replaces the plan's earlier idea ("Google learns from what you feed it"). The code check below
shows that sentence is not true in stage one, so the video is built on the stages instead.

## Code check: does marking a lead feed Google?
Checked in the working tree on 2026-11-12.

| Question | Answer | Where |
|---|---|---|
| Does a mark trigger an upload to Google? | **Yes.** "Good" sends a `verified-lead` conversion; "closed" sends a `closed-deal` conversion with the amount he typed. | `src/app/api/client/leads/route.ts:70-77` → `src/lib/crm/clientLeadsActions.js:43-61` → `src/lib/google-ads/conversion-upload.ts:119-254` |
| Is "junk" sent? | No. Only the list changes. | `clientLeadsActions.js:43-45` |
| Is every enquiry covered? | No. An enquiry without a Google click ID is skipped. | `conversion-upload.ts:149-155` |
| Does Google accept the upload? | **Unproven.** The time stamp is about 3 hours early (Google rejects a conversion dated before its click), and the screen reports "ok" even when the upload failed. | `src/lib/google-ads/data-manager-events.js:163-168`; `clientLeadsActions.js:57-68` |
| Does Google bid on those marks today? | **No.** A new account runs on Maximize Clicks with a ₪15 click-price cap, which ignores conversions. | `src/app/api/google-ads/create-campaign/route.ts:591-597` |
| Does anything move the account to a target cost per enquiry? | No code. It is a team step today; the automatic version is a spec. | `docs/specs/ads-bot-phase2-auto-graduation-2026-11-12.md` |

**Wording rule that follows (binding for the script):**
- **Allowed:** he marks; his marks are what the next stage is built on; after enough marked jobs the campaign moves to a target cost per enquiry, and *from then* Google aims at that price.
- **Allowed only behind gate GA1:** each mark is passed to Google.
- **Forbidden:** "Google learns from your marks" (or any present-tense "learns from closed jobs") as a description of how the account works now; "learns only from closed jobs"; "the bot switches automatically".

## Founder decisions applied
| Decision | How it shows up |
|---|---|
| No founder name in ads | No name in narration, captions or end screen. The page's "call with Eitan" is not the video's CTA. |
| Price only on the end screen | No price and no shekel figure of ours earlier. The ad budget is described as "paid by you straight to Google", with no amount. |
| "Cancel anytime, no commitment" stamp | End screen only, from `data/video/config.json` `stampText` (still pending). See decision D3. |
| WAO said upbeat by Nimrod | `[excited]` directly before the brand word, in A03 and the end beat only. Everything else is a straight register. |
| Eyes-closed rule | Every line makes sense with the screen off. The stage track and the real screens add proof only. |
| Phases transparency | A03–A08 are the phases, in the founder's order: stage one guards and marking, stage two target, visibility throughout. |
| Site Bot own domain, launch 19.11 | Not relevant to this video; no date appears in it. |

## What is true today
| Thing | Status today | Rule for the video |
|---|---|---|
| Click-price cap at launch | **In code** (₪15 ceiling) | Say it, without the number. |
| Blocks searches that burn money | In code (`search_term_cleanup`); runs only with the owner's autonomy consent | Gate GA2. |
| Fake-click filtering | Tracker in code; active blocking not confirmed on a live account | Gate GA2 (the line has a shorter alternate without it). |
| No budget increase above his target cost per enquiry | **In code** (`executor.ts:211-216`); the measured cost is lenient because it counts every conversion action | Say it as a rule about budget, not as a cap on what an enquiry costs. |
| Enquiries in one list; mark good / junk / closed | **Built** (`/client/leads`, `LeadsTable.tsx`), behind client login | Real screen R1, demo data, demo label. |
| Mark is passed to Google | In code; acceptance unproven | Gate GA1. Optional line only. |
| Move to target cost per enquiry after about 15–30 marked jobs | Manual team step; number is the founder's (the spec gates on 15 verified enquiries plus 2 closed jobs) | Gate GA4. Spoken as "the campaign moves", future tense for what Google then does. |
| Account in his name, he sees clicks and cost, pays Google directly | Account is created and named in code; owner access and his own payment profile are a manual checklist | Gate GA3. |
| Free demo on a sample business | Route exists (`/google-ads/onboarding?demo=1…`, sample plumber) | Real screen R2 after Roni confirms what it shows. |
| Weekly summary in shekels | Message holds enquiries, closed deals and alerts; sent by staff by hand | **Not in this video** (the plan's 34–46s beat is dropped). |
| Refund, Partner badge, ad credit, call with Eitan | Terms / founder-confirm items | Not in this video. |
| `/google-ads` shows ₪249 | **No** on the live site (round 2 is in the working tree, not deployed) | Blocks placing the video on that page. |
| Ads Bot checkout | None | No media spend behind this video until charging is live. |

## Gates
A gated line ships only if its gate is passed by the lock date. If it fails, the line is deleted or
its alternate is used; every gated line is written to be removable.

| Gate | Passes when | Owner | If it fails |
|---|---|---|---|
| **GA1** Signal | Step 0 of the phase-2 spec is shipped (time stamp, visible upload result) and one upload on a real or test account shows as accepted in Google's diagnostics | Engineer + Dror; Roni confirms | A08 is deleted. Nothing else changes. |
| **GA2** Guards | (a) Search-term clean-up is on for every new account by default consent; (b) fake-click blocking, not only tracking, is confirmed on one live account | Dror; Roni | (a) fails → A05 deleted. Only (b) fails → A05 uses its alternate without fake clicks. |
| **GA3** Ownership | One real Ads Bot account where the owner logs in as admin and his own payment profile pays Google | Eitan | A10 is cut to "you see every enquiry in your list"; the card C1 is dropped. |
| **GA4** Stage two | Eitan confirms the trigger number and that the team makes the move for every account until the automatic version ships; the bidding consent clause is in the terms | Eitan; lawyer for the clause | A09 loses the number and says only "once you have marked enough real jobs". |
| **GA5** Demo | The demo route shows the sample plan and no screen that looks like Google's interface | Roni; Maya | A11 uses illustration J7 instead of R2. |

## Storyboard: master (target 68s, 12 beats)
One beat = one narration line = one visual. Times are targets; real lengths come from the audio
(`gapSeconds` 0.4). Cap: 12 lines, about 150 words in total. Zones, plate and caption rules are the
Site Bot intro's ("Safe zones", "Visual design spec").

| Beat | Time | Narration intent (English) | Visual | Caption intent | Framing per aspect |
|---|---|---|---|---|---|
| A01 | 0–5 | The money went out, the clicks came in, and the phone stayed quiet. | **Illustration J1.** Coins leave a drawn wallet toward a row of small cursor arrows; a plain drawn phone lies face-up, still. No ringing, no screen content. | The hook, verbatim. | 9:16 wallet top, phone bottom. 1:1 and 16:9 wallet on the physical right, phone left. |
| A02 | 5–11 | A click is not a job. A new account does not yet know which searches bring you work. | **Illustration J2.** The cursor arrows pile up in one tray; a second tray with a wrench glyph stays empty; a blank drawn gauge between them has no needle. | "A click is not a job." | Trays side by side, read right to left; stacked in 9:16. |
| A03 | 11–17 | Ads Bot from `[excited]` WAO opens a new account in your name and works in two stages, in the open. | **Illustration J3, the stage track.** A horizontal line with two segments and a gate between them; segment one lights mint. Wordmark in the corner. This track stays as a thin strip at the top of the stage through A09. | Product name, then "two stages". | Track runs right to left: stage one on the physical right. Wordmark physical top-left. |
| A04 | 17–22 | Stage one, while it learns: the bot puts a ceiling on the price of a click. | **Illustration J4.** A coin rises toward a drawn horizontal bar and stops under it. No number. | "A ceiling on the click price." | Centred in the stage. |
| A05 **GA2** | 22–28 | It blocks the searches that burn money without bringing enquiries, and filters fake clicks. | **Illustration J5.** Three blank search pills slide in; two turn grey and dashed and drop out; one cursor arrow with a dashed outline is stopped at a sieve. No search-engine layout. | "Blocks wasteful searches." | Pills enter from the physical right. |
| A06 | 28–33 | And it does not raise the budget while an enquiry costs you more than the target you set. | **Illustration J6.** A budget dial with a small lock on it; next to it a short bar sits above a marked line. When the bar is above the line the lock stays shut. No digits. | "No budget increase above your target." | Dial on the physical right, bar left; stacked in 9:16. |
| A07 | 33–41 | Your part takes a second: every enquiry lands in one list, and you mark it, real or junk, and when a job closes. | **Real screen R1.** `/client/leads` on the demo business: the list, one tap that marks an enquiry good, one tap that marks another junk, then a third marked closed. Demo label on. | "You mark. Real or junk." | 9:16 and 1:1 mobile plate, zoomed to the name, quality and deal columns. 16:9 desktop plate, full table. |
| A08 **GA1** | 41–45 | Every mark is passed to Google, tied to the click that brought the enquiry. | **Illustration J3b.** On the track, small mint ticks appear one after another along segment one, moving toward the gate. No digits, no counter. | "Every mark is passed on." | Track enlarged to the centre of the stage. |
| A09 **GA4** | 45–53 | Stage two: after about 15–30 jobs you marked, the campaign moves to a target cost per enquiry, and from then Google aims at the price that fits your business. | **Illustration J3c.** The gate opens; segment two lights mint; a drawn target ring settles on a single enquiry glyph. | "Stage two: a target cost per enquiry." | As A08. |
| A10 **GA3** | 53–59 | The whole way, every enquiry and every shekel is in front of you, in your own account. The ad budget goes from you straight to Google. | **Card C1.** Two short on-screen lines from the script's `card` field, mint keyline under the first. | Off (the card is the text). | Text block centred; max width 80% of the safe box. |
| A11 **GA5** | 59–63 | Want to see it first? There is a free demo on a sample business. | **Real screen R2.** The demo route: the sample plan (area, budget line, search terms). Demo label on. | "A free demo." | Plates as A07. |
| A12 | 63–68 | Ads Bot from `[excited]` WAO. The monthly price plus VAT. No commitment. | **End screen E1** (Site Bot spec, product `ads-bot`). Held at least 3s after the voice ends. | Off (`captions: false`). | End-screen layout per aspect. |

**Fallback if every gate fails:** A01–A04, A06, A07, A09 without the number, A10 cut down, A11 on J7,
A12 (about 55s). It still holds, because A03 only promises two open stages and A07 shows the part
that exists.

## Cuts
Each cut is its own section in the script JSON with its own, shorter lines. The plan's 60s cut is
dropped: the master is already 68s.

| Cut | Where | Beats (visuals reused) | Word cap | Notes |
|---|---|---|---|---|
| 30s | YouTube, WhatsApp follow-up | T1 = A01 (J1), T2 = A03 (J3), T3 = one line for stage one: cap and blocked searches (J4 then J5, hard cut at the midpoint; GA2a), T4 = A07 (R1), T5 = A09 (J3c; GA4), T6 = A12 (E1) | 58 | T5 without the number if GA4 fails. Needs pipeline change P6 (two visuals in one beat). |
| 15s | Remarketing offer card | F1 = problem in one line (J1), F2 = two stages, you mark, you see everything (R1), F3 = A12 (E1) | 26 | No gated claim if F2 says "you see every enquiry" rather than "your account". |
| 6s | Bumper | X1 = one line, at most 6 words (J3: the track lighting stage one), X2 = E1 with product and brand spoken, price shown, not spoken | 9 | Same open question as the Site Bot bumper: Dror confirms under-10s can serve before it is built. |

## Shot list

### Illustrations (one layered SVG each; Site Bot illustration rules apply)
| ID | Beats | Content | Layers that animate | Arrangements |
|---|---|---|---|---|
| J1 | A01, T1, F1 | Wallet, coins, cursor arrows, still phone | Coins (3), arrows (5, staggered 120ms) | Stacked; row |
| J2 | A02 | Two trays, wrench glyph, gauge without needle | Arrows dropping into tray one | Stacked; row |
| J3 | A03, T2, X1 | Stage track: two segments, gate, wordmark | Segment one fill; gate | One (horizontal); a strip version 64px high for A04–A07 |
| J3b | A08 | Track with ticks | 7 ticks, staggered, no numerals | One |
| J3c | A09, T5 | Gate opens, segment two, target ring, enquiry glyph | Gate, fill, ring settle (180ms, 4% overshoot) | One |
| J4 | A04, T3 | Coin under a ceiling bar | Coin rise and stop | One |
| J5 | A05, T3 | Search pills, sieve, dashed cursor | Two pills drop; cursor stops | One |
| J6 | A06 | Budget dial with lock, bar above a line | Lock closes once | Stacked; row |
| J7 | A11 fallback | A drawn page with three blank rows and a "sample" corner tab | Rows fade in | One |

- **New glyph set:** coin, cursor arrow, wrench, ceiling bar, sieve, dial with lock, target ring, tick. All in `headline` stroke; `accent` only for "guarded / stage reached".
- **Money is never shown going up.** No rising chart, no counter, no before/after, no digits inside any drawing.
- **Still forbidden:** Google logos, colours, search layout or ad layout; ringing phone; notification banners; faces.

### Real screens
| ID | Beat | Route | Steps | Needs | Checks that stop the shot |
|---|---|---|---|---|---|
| R1 | A07, T4, F2 | `/client/leads` | Load list (5 seeded enquiries, all unmarked) → tap quality on row 1 until "good" → tap quality on row 2 until "junk" → on row 1 tap the deal button, type a round demo amount, confirm → hold 1s | Demo client session; seeded enquiries; the write call answered from the seed | Three marked states visible; no real name or number; no call to Google leaves the machine |
| R2 | A11 | `/google-ads/onboarding?demo=1&mode=test&clientId=google-ads-sandbox` | Load → slow scroll over area, budget line, search terms → stop before the sample ad if it resembles a Google result | Local server | Sample-business name visible; no login prompt; no Google-style ad frame in the crop |

- **Recording sets, plate, demo label, pointer, text-size rule:** as in the Site Bot spec.
- **R1 on mobile:** the table has six columns, so the mobile recording zooms to the name, quality and deal columns (text at least 24px tall in the output frame). The phone column stays out of the crop.
- **Demo data for R1:** five fictional enquiries on the same fictional plumber as the Site Bot demo. First names only, from Tamar; phones `050-000000X`; dates relative to the recording day; each with a made-up click ID so the product treats them as campaign enquiries. Nothing is written to `data/clients/` or to `src/data/leads.json`.
- **The amount typed in R1** is the value of his job, not our price, and is covered by the demo label. Use one round figure.
- **R1 is not recordable today without an engineer change:** the page reads the live enquiry store at a fixed path and needs a client session (see PA1).

### Card and end screen
| ID | Beat | Source | Notes |
|---|---|---|---|
| C1 | A10 | Script `card` field: two lines, 22 characters or fewer each | Site Bot card spec. Dropped if GA3 fails. |
| E1 | A12, T6, F3, X2 | `data/video/config.json` product `ads-bot` | Price digits from `ADS_BOT_MONTHLY_NET_ILS` (`src/lib/payments/plans.ts:59`); stamp and CTA still `_PENDING`; URL `wao.co.il/google-ads`. |

## Visual spec: what differs from the Site Bot intro
Everything not listed here (colours, fonts, caption typography, plate, motion, safe zones, end-screen
layout) is taken unchanged from `video-intro-site-bot-2026-11-12.md`.

| Item | Ads Bot intro |
|---|---|
| Recurring device | The stage track (J3). In A04–A07 it sits as a strip at the top of the stage: 64px high at 1080 width, 24px under the safe box's top edge, stage one lit. It tells a viewer who looks up mid-video which stage is being described. It is absent in A01–A02 and on the end screen. |
| Meaning of mint | "Guarded" in stage one (ceiling, lock, sieve) and "stage reached" on the track. The wasteful state is grey and dashed, as in the Site Bot intro. No red. |
| Stage labels | The words for "stage one" and "stage two" appear only in captions, never drawn into the art, so no Hebrew is baked into an SVG. |
| Numbers on screen | Only inside captions when spoken (the 15–30 range in A09, isolated as one no-wrap unit) and on the end screen. None inside drawings, none in R2's crop beyond what the product itself shows. |
| Real-screen plate colours | R1 and R2 are WAO's own dark product screens, so the plate border is 3px (not 2px) to keep the frame visible against the same background. |
| Sound | Voice only. No coin, click or notification sounds. |

## Pipeline changes this design needs (scripts/video, not done here)
P1–P8 from the Site Bot mission apply. In addition:

| # | Change | Needed by |
|---|---|---|
| PA1 | A way to record `/client/leads` on seeded data: a data-root override for the enquiry store plus a demo client session, or a recorder-served harness that renders the real `LeadsTable` component with seeded rows and answers its write call locally. Engineer picks; no live store may be written. | R1 |
| PA2 | Recorder shots R1 and R2 in `scripts/video/record/lib/shots.mjs`, with the checks above; the network policy must block the conversion upload. | R1, R2 |
| PA3 | An `alt` line per beat, chosen by gate state (A05, A09, A10), and included in the script hash. | GA2–GA4 |
| PA4 | `products.ads-bot.pageSource` in `data/video/config.json` set to `plans.ts` with the pattern `ADS_BOT_MONTHLY_NET_ILS\s*=\s*(\d+)`, so the end-screen price is checked like Site Bot's. | E1 |
| PA5 | A persistent overlay layer (the track strip) across a range of beats. | A04–A07 |

## Claims ledger for this video
| Claim (spoken or shown) | Backed by | Status |
|---|---|---|
| New account in his name | `create-campaign/route.ts:462-470` | In code |
| Ceiling on the click price in stage one | `create-campaign/route.ts:596` | In code |
| Blocks wasteful searches | `autonomous-cycle.ts:24` | GA2 |
| Filters fake clicks | Fraud Blocker tracker | GA2 |
| No budget increase above his target | `executor.ts:211-216` | In code (lenient measure) |
| One list; he marks real, junk, closed | `/client/leads`, `LeadsTable.tsx` | Built |
| Marks are passed to Google | `conversion-upload.ts` | GA1 |
| Target cost per enquiry after about 15–30 marked jobs | Founder direction; spec | GA4 |
| Sees every enquiry and shekel in his own account; pays Google directly | Terms; manual checklist | GA3 |
| Free demo on a sample business | Demo route | GA5 |
| Monthly price plus VAT, no commitment | `plans.ts:59`; Ads Bot terms §7 | In code and terms; **not on the live page** |
| "Google learns from your marks", results, cost per enquiry achieved, more calls, refund, credit, Partner badge | — | Never claimed |

## Files
- `docs/missions/video-intro-ads-bot-2026-11-12.md` (this file)
- `docs/copy/briefs/video-intro-ads-bot-2026-11-12.md` (narration brief)
- Later: script JSON in `docs/copy/`, `scripts/video/specs/adsbot-intro-*.video.json`, recordings and art under `data/video/`

## Constraints
- Hebrew only from Tamar → Noa; Eitan's ear on the voiced result.
- `data/clients/` and `src/data/leads.json` are never written; the demo business is fictional and labelled.
- No Google logos or interface; Google may be named in speech.
- No results promises, no achieved cost per enquiry, no date for stage two.
- Dror checks the stage-one and stage-two lines against Google's misrepresentation policy before lock.
- AI voice and AI-assisted visuals are declared in Google Ads and YouTube Studio (check the current rule before upload).

## Acceptance
- Script hash approved in `scripts/video/approved-hashes.json`; build passes stage 1 with the price check (PA4).
- Every output is at or under its slot length; ffprobe confirms size and duration.
- No placeholder visuals and no `_PENDING` text in a release render.
- One exported frame per caption card, card and end screen, per aspect, passed by Maya; Noa passes captions and card text.
- Gated lines present only with a passed gate; no line breaks the wording rule in "Code check".

## Verifier
Roni: runs the build, checks the manifest, confirms R1 and R2 match the product on the lock date,
confirms each passed gate with its evidence, and confirms `/google-ads` shows the same price as the
end screen.
