# Mission: copy that sells (2026-11-12)

Eitan rejected the /site-bot and /google-ads drafts as "a list of dry almost legal copy". Fable 5.2's diagnosis and plan: docs/copy/strategy/sell-not-hedge-fable52-2026-11-12.md.

## Outcome
Tamar (waocopy / Qwen) writes copy a great marketer would be proud of, and keeps her native Sabra voice. This applies to:
- WAO's own pages (/site-bot and /google-ads first);
- client output: Site Bot generated websites (`src/lib/lp/lpCopyPrompt.ts`, `researchPageCopy.ts`, copy gates) and Ads Bot ad and landing-page copy (`src/lib/bot/prompts.ts`).

Proven over 2–3 rounds of generate → Fable 5.2 assess → adjust the rules.

## Eitan's decisions (2026-11-12)
- The new rulebook is applied (34 rules: 18 selling rules first, 16 craft rules). The test rounds then run on our pages and on client copy.
- /site-bot primary CTA: the free check. The call with Eitan is secondary.
- /google-ads proof: NO real client examples or numbers (Eitan, final). Proof = the free demo, Google Partner, Eitan by name, the mechanism itself.
- /google-ads price anchor: agency management typically from about ₪1,500 a month + VAT, ad budget on top (Dror web-checked; the ₪2,000 floor is false).
- The Google credit is a bonus WAO brings (no amount, no guarantee, not a discount).
- Keep the Sabra tone. Rules must free the voice, not cage it. Fable judges voice as pass/fail.

## Files
- docs/copy/writing-upgrades.md (rules)
- scripts/waocopy.mjs (priority preamble, grouped rules, `--page` mode, exemplar kinds)
- .claude/agents/language-qa.md (Noa protects the sale; 💰 tag; hero test)
- .claude/agents/copywriter.md (voice reference, Mode A letter-first)
- Client generators: src/lib/lp/lpCopyPrompt.ts, src/lib/lp/researchPageCopy.ts, src/lib/lp/copyGates*.ts, src/lib/bot/prompts.ts

## Constraints
- Hard lines: Google Ads policy (no results guarantee, fee-only refund, no credit amount or promise, never sell credits); no false checkable claim. Puffery is allowed.
- data/clients/ is never written. Client rounds use eval fixtures under scratch/ only.
- The engineer never authors Hebrew. Noa gates all shipped Hebrew. Yonatan signs off h1 and badge changes.
- The client generator changes keep the existing correctness gates (plural address, claim tokens) and only relax the persuasion-killing ones.

## Acceptance
- Round N: both WAO pages (full rewrite, `--page` mode) plus at least two client site evals and one Ads Bot copy sample. Fable 5.2 scores them for selling and Sabra voice, then edits the rules if needed. Stop when Fable passes them and Eitan approves the before/after.
- Then: Noa (new mandate) → engineer builds the new page structure → verifier → deploy.

## Verifier
Roni: rendered pages (both pages render the new copy; head tags; JSON-LD) and client eval sites regenerated without gate failures.

## Phase 2: live proof from our own bot clients (Eitan's idea, 2026-11-12)
A results section on /google-ads and /site-bot built only from data of clients who signed up through the bots. It starts hidden and grows as we succeed. Not built now.
- **Ads Bot metrics:** leads per month; share marked relevant in the mini-CRM; share closed; cost per verified lead. Lead QUALITY is the proof agencies can't show.
- **Site Bot metrics:** calls and direction requests from the Google profile; review count and rating growth; time to go live.
- **Rules:**
  - aggregated and anonymised only, with no names;
  - shown only once there's a minimum number of clients and months (Dror sets N);
  - every figure dated and computed by code, never typed by hand;
  - verified-lead tracking must be working per account first (the Retter lesson);
  - captioned "results of Ads Bot / Site Bot clients", with no forecast or guarantee (Google policy).
- **Prerequisite before launch:** a clause in BOTH terms allowing anonymised, aggregated results to be used in WAO's marketing, never the business's name without consent. Written by Tamar → checked by Noa → added to the lawyer list.
- **Owners:** Dror (metrics, thresholds, policy) → engineer (aggregation job + hidden-until-threshold section) → Tamar (section copy) → Noa → Roni.
