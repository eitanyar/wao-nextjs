# Site Bot MVP: hard audit (Adam, 2026-11-24)

Requested by Eitan: audit the Site Bot MVP as an outside auditor would, without assuming the MVP's capabilities, so that
no client is harmed by the September/November 2026 Google updates or by anything WAO does to their Google profile.
Evidence is code and docs as of commit `eb58589`. Google rules were fetched on 2026-11-24 (sources at the end).

## 0. Two corrections to the starting brief (the Qwen audit prompt)

1. **Its Google quotes are not on Google's page.** The Qwen prompt says the representative rules require the profile
   website to be "the single authoritative site" and "owned and managed by the business owner". Neither phrase is on
   the current Business Profile third-party policies page (fetched 2026-11-24). Auditing against rules that don't exist
   would waste effort on the wrong P0s. The rules that do exist are in section 4.
2. **The updates.** The September 2026 spam update started on 24 Sep. The November 2026 core update started on 10 Nov,
   and was still rolling out around 24 Nov. Google has **not** said that either one targets AI-made sites. The real
   documented risk is the same as before: *scaled content abuse* (many pages or sites with little value per page,
   however they were made) and *doorway pages* (near-identical "service + city" pages). The videos that say "Google
   kills AI websites" overstate what Google has said. The underlying risk is real, though, and it is the right one to
   design against: if a site says nothing its competitors don't already say, it has no reason to rank.

## 1. Verdict

**APPROVE WITH CONDITIONS, for the capped pilot of 10 only. DO NOT SCALE past the pilot until the P1 list is closed.**

Generation is safer than the Qwen prompt assumes. It has fact-trace gates, a "never pad, log a fact gap" rule,
doorway-risk rejection of service-area pages, a cap of 30 pages, no AggregateRating schema, a block on business-name
edits, and no call-tracking numbers. Site Bot will not be a spam factory.

The weak links sit on both sides of the generator:
- **Before it: the intake.** It collects too little unique material, so the sites will be thin and look alike.
- **After it: the Google profile and the exit.** Nothing written down protects the client's existing ranking when we
  point his profile at our site, or when he leaves.

These are the places where a client can actually get hurt.

## 2. Findings

### P0: must be fixed before the first paying client's profile is touched

| # | Finding | Evidence | Fix |
|---|---|---|---|
| P0-1 | **No runbook for switching the profile's website link to our site, no snapshot of the old values, no rollback.** The rehearsal runbook (S0–S21) never changes the profile's website. `executePatch.ts` writes without recording the previous value. | `docs/specs/site-bot-launch-rehearsal-runbook-fable52-2026-11-13.md`; `src/lib/gbp/executePatch.ts:163-225` (no prior read); grep for rollback/previousValue = 0 hits | Adopt the runbook in section 5. Make the snapshot code-enforced: a write is refused unless the current value was read and stored first. |
| P0-2 | **Policy settled by Eitan (2026-11-24): the main target is businesses with no website. We never replace an existing site, except on its own domain with real, relevant 1:1 redirects.** What's left is a guard in code: today `hasWebsite` is captured but nothing acts on it, so nothing stops a staff mistake from pointing a profile with an old site at a new one. M4 migration is not built, so a same-domain replacement is manual-only. | `auditStore.ts:27 hasWebsite`; `src/lib/site-migration/` missing | The website-switch step and the domain attach refuse to run when the profile already has a website, unless staff record a same-domain migration with a reviewed 1:1 redirect map. |
| P0-3 | **No "Working with a third party" disclosure on wao.co.il.** Google requires third parties that mainly serve small businesses to link this notice from a clearly discoverable place (for example the footer), and to tell each new client by email that it is there. | grep for 7353941 / third-party disclosure in src/app, src/components, src/lib = 0 hits | Add a footer link to `support.google.com/business/answer/7163406`, plus one line in the welcome/manage email. About one hour of work. |
| P0-4 | **Every change to the client's profile must be logged and reported to him.** Google: "Ensure that end customers are informed of all changes and edits to their profile. Changes … without the business owner's consent is prohibited." Consent must be written or a positive action (a checkbox), and WAO must be able to produce proof. Today the writes are off (`fix-execute` and `gbp/oauth/start` return 503), so this is a gate on turning them on, not a live breach. | `src/app/api/site-bot/fix-execute/route.ts`; `src/app/api/site-bot/gbp/oauth/start/route.ts`; terms §5 | Before any write: (1) store the consent proof (timestamp, terms version, the checkbox text he saw); (2) keep a change log per client (field, old → new, when, why); (3) send the owner a "what we changed on your Google profile" message within 24 hours, and include the log in the monthly report. |
| P0-5 | **One request can change several profile fields at once.** `buildPatchPayloadAndMask` can put `regularHours`, `websiteUri`, `phoneNumbers` and `profile.description` into one update. Changing the website together with the phone or categories is the classic trigger for re-verification or suspension. | `src/lib/gbp/executePatch.ts:91-154` | Code rule: one field family per write. `websiteUri`, `phoneNumbers` and `categories` are always solo changes, at least 7 days apart, with the profile's status checked between them. |

### P1: close before scaling past 10 clients

| # | Finding | Evidence | Fix |
|---|---|---|---|
| P1-1 | **The intake can't produce enough unique content.** The owner gets a confirm card (Google data), at most 3 typed questions (priority services, travel area, what makes him different), then optional years, licence and warranty. The voice note is OFF. We never ask for photos or a real job. Most page substance therefore comes from Google data plus SERP research, and research tells you what competitors say, not what's unique about this business. | `startIntake.ts:103-108`; `StartPaidFlow.tsx:42-53`; `VOICE_NOTE_STEP_ENABLED=false` (content-depth mission) | Add the intake list in section 3. Turn on the voice note (it needs the private upload route plus transcription), so a 2-minute talk replaces 10 typed answers. |
| P1-2 | **The owner's research questions never block anything, and they expire after 24 hours.** "Research gates never block the research or generation." So a site can ship without the owner confirming his service boundaries, his areas or his money services. | `research/ownerGates.ts:14-19, 30` | The `geography` and `money_services` answers block deploy (owner or staff, logged). Others stay soft. |
| P1-3 | **The owner never approves the claims before the site goes live.** Terms §2: "a person at WAO checks the site". That is a staff review. The owner never sees the list of factual claims we make about his business. | terms §2; deploy route has no owner-approval state | A "these are the facts your site says about you" screen: each claim with its source (Google / you said / review), with Approve or Fix. Deploy is blocked until he approves, or until 72 hours pass with a staff call logged. |
| P1-4 | **No similarity check across clients in production.** `ngramJaccard` / `CROSS_CLIENT_JACCARD_MAX = 0.25` is an offline, warn-only helper. `checkNearDuplicates` at deploy compares pages within one site only (the older core-30 path). | `src/lib/lp/depthBlocks.ts:402-424`; `deploy/route.ts:422-437` | At deploy, compare the new site's rendered text (hero, service blocks, Q&A, about) with every live site in the same niche. Above 0.25 → block, and route to the owner for more facts. Run a weekly fleet report as well. |
| P1-5 | **A shared AI photo library per trade means the same images on competing sites.** Two plumbers in one city with 3 variants each will show identical image files. | memory: per-trade atmosphere library, 3 variants per trade+service | The owner's own Google profile photos come first. A library image is never used by two clients in the same niche and region. Each use gets a per-client crop/colour variant (a different file hash). |
| P1-6 | **Leaving strands the profile.** 30 days after the last paid month the site goes offline. A copy costs ₪900+VAT before 12 months (terms §8). The profile then points at a dead site, which is the worst outcome for the client. Google's rules don't forbid this, so it is P1, not P0. It does contradict "our success is only as strong as our clients", and it is a reputational risk once 50 clients exist. | terms §8, §15, §18 | **Decision for Eitan (section 4).** |
| P1-7 | **Clients on wao.co.il subdomains.** These clients don't own their address (terms §6), every later move to their own domain is a site move, and the subdomain sites build a fleet footprint on WAO's own domain. | terms §6; `ownerIntake.ts:225-232` | For the pilot, buy a .co.il in the client's name during onboarding (WAO does the work, the client pays about ₪60/yr). The subdomain becomes a short staging step that is noindexed and never linked from the profile. |
| P1-8 | **The page promises things that are turned off.** Manager connection, profile sync and posting review replies return 503. The monthly report was not built as of the 11-12 truth check. The 11-19 mission's own rule: "Never ship copy for a piece that isn't live once the stamp is gone." | `docs/reviews/site-bot-product-truth-check-2026-11-12.md`; `gbp/oauth/*` 503 | Before 29.11, rerun the truth check. For each line: live, done by hand for the pilot (named owner, date), or remove the line. |
| P1-9 | **No ranking baseline or tripwire around the switch.** We own a grid-rank scanner (`src/lib/geo/gridRank.ts`, `api/site-bot/grid-scan`) but nothing uses it before and after the website change. | — | Part of the runbook in section 5: a grid scan before the switch and on days 7, 14 and 28. Rollback trigger defined in advance. |

### P2/P3: improvements

- **P2: Change freeze during Google updates.** Don't switch a profile's website, or launch a client's domain, inside an
  announced core or spam rollout window (check the Search Status Dashboard). Otherwise you can't tell our effect from
  Google's.
- **P2: The review-request flow must ask every customer.** Never filter for happy customers first ("review gating"),
  and never offer an incentive. Check the review-kit copy against this before it ships.
- **P2: Monthly growth stays evidence-driven.** New pages only when the owner gives us new material (a job, photos, a
  new service, a new area with real jobs). No calendar quotas. The content-depth mission already says "one owner
  question a month". Write it into the roadmap as a hard rule.
- **P3: Leftover noindex / demo text.** Add a post-deploy check that production has no `noindex` except on pages meant
  to have it (the contact fallback), no `fixture-` IDs, and no "demo" strings.

## 3. Intake: questions to add (content specs; the Hebrew wording comes from waocopy)

Priority order. The first five give the most unique content.

1. **Photos (required, at least 3, real):** your work, your van or tools, you on the job. We fall back to the Google
   profile photos only if he has none.
2. **One real recent job:** what the customer called about, what you found, what you did, how long it took, roughly
   where. Voice note preferred. This is our biggest source of unique content.
3. **What you won't take on.** Jobs you refuse or refer on. This marks the service boundary and is very credible.
4. **The question customers ask on every call,** and your honest answer. This becomes Q&A that no SERP has.
5. **Price behaviour:** call-out fee, a "from" price for 1–3 common jobs, the night/Shabbat rule, or which pricing
   promise you give. Already designed in content-depth; make it a required choice, never a blank field.
6. **Local reality:** neighbourhoods or building types you work in most, and the local problem that comes up (old
   buildings, hard water, parking). This is the only legitimate base for any future area page.
7. **The brands and equipment you work with,** and any certificate or supplier you're authorised by.
8. **Real response time,** with its condition ("within 2 hours on weekdays in X"). A number with a condition, never
   "fast".
9. **How a job runs, step by step** (the voice note can cover it).
10. **Vague-answer probe:** if any answer contains only generic claims ("quality, reliable, professional"), ask one
    follow-up: "give me one example from the last month". If he still has nothing, the field is dropped and logged as
    a fact gap, never inflated.

## 4. Contract changes and the one decision for Eitan

**Decision (recommended: yes): free handover on exit.** When a client cancels at any time, he gets a static copy of his
site free, and if it's on his own domain we set up a free redirect or a one-page holding site for 90 days. That way his
Google profile never points at a dead page. It costs WAO almost nothing: a zip of files we already render. It removes
the strongest objection a smart buyer has ("what happens if I leave?"). Today's ₪900 fee makes the subscription feel
like a hostage arrangement, which is the opposite of the message. If you prefer to keep a fee, the minimum is: never
let the profile point at a dead page. At exit we remove our link from the profile, or ask him to.

Other changes (for the lawyer pass already on the list):
- §5: written consent to profile management, and a promise that every change is logged and reported (P0-4).
- §5: a link to Google's "Working with a third party" notice (P0-3).
- §6: the domain is in the client's name from day one (P1-7). We never register a domain in WAO's name for a client.
- §15/§8: the site's text and photos are licensed to the client permanently after he leaves (follows from the
  decision above).
- New: "We never change your business name, phone or address on Google without asking you first." The code already
  blocks name edits. Put it in writing.

## 5. Proposed runbook: switching the profile's website (proposal)

1. **Check the profile first:** does the name carry keywords, is the address a virtual office, are the categories
   right, is it suspended or under review? If yes → fix with the owner first, or don't take the client. Our edit must
   not set off an existing problem.
2. **Snapshot the current state:** website, phone, hours, categories, description (code-enforced, P0-1). Take a
   grid-rank baseline and a GBP Performance baseline (calls, website clicks, directions).
3. **Existing site?** → P0-2 path. No automatic replacement.
4. **The new site is ready first:** on the client's own domain, indexable, in the sitemap, Search Console verified,
   and name, address and phone exactly as on the profile. Not inside a Google update window.
5. **Owner consent for this specific change** is logged. He is told what will change and when.
6. **Change one field:** `websiteUri` only. Nothing else that week.
7. **Watch:** profile status at 24 h, 72 h and 7 days. Grid scan on days 7, 14 and 28.
8. **Rollback trigger** (set in advance): a re-verification or suspension notice, or a drop in Local Pack top-3
   coverage of more than 30% that holds for 14 days → restore the old URL from the snapshot, tell the owner, review.
9. **Report:** the change log entry goes to the owner (P0-4).

## 6. Month-1 launch checklist: blocking tests

- [ ] Every rendered claim traces to an owner answer, a Google fact or a review (`gate_fact_trace` = 0 failures).
- [ ] The owner approved the claims list (P1-3).
- [ ] At least 3 real photos, or the photo sections are cut (no placeholders).
- [ ] Similarity with every live site in the same niche is at most 0.25 (P1-4).
- [ ] No service × other-city pages. Areas appear only in `areaServed`.
- [ ] Name, address and phone are byte-equal to the profile. The phone is the business's own (no tracking numbers).
- [ ] Links, form (a real lead lands within 1 minute), schema valid, mobile 390px, bidi grep = 0, no foreign-script
      characters, no stray noindex, no fixture IDs.
- [ ] Every line on /site-bot is either live, delivered by hand with an owner and a date, or removed (P1-8).
- [ ] The website-switch runbook is done, including the snapshot and baseline (section 5).
- [ ] The third-party disclosure is linked on wao.co.il and in the welcome email (P0-3).

## 7. Plain answer: 50 clients = 50 businesses, or one site in 50 skins?

**Today: 50 honest but thin sites that look like siblings.** The generator won't invent facts or build doorway pages, so
they won't be spam. But with 3 typed answers, no photos and no real job, the parts that make a page worth ranking (how
this person works, what he refuses, the question his customers ask, his local reality) are mostly empty. What's left
is name, address, phone, services, areas, reviews and one sentence about what makes him different, wrapped in the same
structure. Google won't punish that, but it won't reward it either. (Replacing an established site is ruled out by
policy, P0-2.) With the section 3 intake and the P0/P1 gates, the sites become distinct
businesses, because each one carries material that only that owner could have given us.

## Sources (fetched 2026-11-24)
- Google, Business Profile third-party policies: https://support.google.com/business/answer/7353941?hl=en
- Google, Guidelines for representing your business: https://support.google.com/business/answer/3038177?hl=en
- Google, "Working with a third party" notice: https://support.google.com/business/answer/7163406
- November 2026 core update coverage (secondary): https://momenticmarketing.com/google-updates/november-2026-core-update ,
  https://digitalmindmetrics.com/blog/seo/google-november-2026-core-update/
- September 2026 spam update coverage (secondary): https://webdivine.agency/insights/google-september-2026-spam-update ,
  https://www.intuicodigital.com/blog/google-september-2026-spam-update-smb-checklist
