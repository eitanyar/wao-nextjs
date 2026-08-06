# Site Bot — "Year of Updates" Content Bundle

*Drafted by Lior (mission-planner), Aug 2026. Status: proposal, awaiting Dror (ppc-strategist) sanity
check against the July 2026 buyer-routing ladder before scoping further.*

## The idea (Eitan, Aug 2026)

Site Bot currently sells as a one-time build (₪1,490–1,990). Bundle ongoing value into the first
year — specifically, a monthly relevant blog post per client — to make year one lucrative and turn
the sale from "we build you a static site" into "we build you a site that keeps growing."

This is not a new concept out of nowhere — VISION.md already names the destination:

> **Phase 2 pricing trigger — Site Bot subscription model (DEFERRED, decision July 2026):** The
> subscription model (₪249–299/mo, includes build + ongoing edit-via-chat + GSC/GMB health checks)
> is the right long-term frame but requires edit-via-chat to be bot-executed, not WoZ-manual.
> **Trigger:** when Eitan-Dev ships automated edit-via-chat.

This proposal is a way to get *some* of that recurring-value model's benefit now, before the
automation trigger fires — without waiting for edit-via-chat to ship.

## The real constraint: delivery capacity, not pricing

Content Bot's generation pipeline (Tamar→Noa two-pass Hebrew content, same engine GEO Bot uses)
exists. The **publish/send step is still Wizard-of-Oz** — same manual bottleneck GEO Bot has today
(manual GSC pull, manual content generation via script, manual WhatsApp send, per VISION.md's
Phase 1R delivery model). "A year of monthly blog posts, included" is a recurring labor commitment
on every Site Bot sale. Fine at 5 clients. Breaks at 50.

**Any structure chosen here should launch as a capped pilot (5–10 clients), not a blanket sitewide
commitment**, until real cost-to-serve is known.

## Three structures considered

**1. "Founding Year" — priced in, not free.**
Raise Site Bot base price (~₪1,790–1,990 from ₪1,490) and frame the premium as 12 months of
content — "a site that keeps growing, not a site that goes stale." No new billing complexity
(still one-time), no margin bleed from a "free" perk, and it pre-builds the narrative bridge to the
real subscription model once the automation trigger fires.

**2. Teaser hook — 3 months bundled at ~2 months' price (~₪980 vs. ₪1,470 standalone Content Bot).**
Pulls Content Bot's attach point from **month 6** (the buyer ladder validated by Lior, July 2026 —
see VISION.md "Buyer routing") to **month 1**. Worth noting: Content Bot is keyword-cluster-driven,
not GSC-Pareto-driven like GEO Bot — it doesn't need existing traffic/GSC history to produce useful
content, so a month-1 delivery isn't premature the way early GEO Bot content would be. If pilot
conversion-to-continue is strong, this is the data point that would justify moving the ladder up,
not just a one-off promo.

**3. Pure paid add-on at checkout.**
Safest on margin, weakest as a differentiator — doesn't really deliver on "make year one lucrative,"
just adds an SKU next to the existing offer.

## Recommendation (Lior)

Pilot **#2** with the next 5–10 Site Bot buyers to learn: (a) true cost-to-serve per monthly post at
current WoZ delivery speed, (b) conversion rate from the 3-month teaser into full paid Content Bot
continuation. That data is what determines whether **#1** (bake into the base price for every buyer)
is safe to roll out sitewide, or whether this stays a capped/opt-in pilot indefinitely.

## Open questions for Dror

- Does pulling Content Bot's attach point to month 1 (option 2) conflict with or strengthen the
  July-validated buyer-routing logic — was month 6 chosen for a reason beyond "give the site time to
  exist" that a fresh site with zero traffic history would still hit?
- What's a defensible bundled price for the 3-month teaser that doesn't undercut Content Bot's
  standalone ₪490/mo positioning once a client is asked to continue paying for it?
- Should the pilot cohort be selected by segment (e.g. only content-ready-adjacent micro-SMBs) or
  random, to get a clean read on conversion-to-continue?

## Status / routing

Held pending deploy (Eitan is conserving session budget) — route to **Dror (ppc-strategist)** for
the pricing/ladder sanity check once the current Home/Header/popup work is deployed and confirmed.
