# Market scan — stop-and-see check (one page)

Yonatan · 2026-11-07 · final version · runs 73ecfd6063af (first check), 7f91346fefc5 and 8684c8405951 (free
re-scores), final state **f354d8b0c7e7** · anonymized (no business names, phones or websites)

## What we checked
The scanner ranked 410 profession-by-city "cells". Before any outreach I hand-checked them in three rounds. Round 1:
the engineer's top 5, movers in Ashdod, and pilot cells A (roofing, Petah Tikva), C (pergolas, Karmiel) and
D (roofing, Rehovot). Round 2, after the free re-score: every new entrant near the top: the two small-town locksmith
clusters, electricians in Holon, aluminum in Tel Aviv and AC repair in Rishon LeZion. Round 3: renovation in Tel
Aviv, which jumped to #1 after a re-score. For each one I looked at the
businesses Google actually shows in the top 3 (from the saved Google responses of 2026-11-07). For the 5 final cells
I read the whole list of businesses we counted as "weak and reachable". I asked two questions: is the top 3 really
as strong as the score says, and are the weak ones real owner-run businesses we could talk to? No business was
contacted and nothing extra was bought.

## What matched
- **The three pilots look right.** Roofing in Petah Tikva really is locked up: three established contractors with
  66–88 reviews each. Pergolas in Karmiel is too, with hundreds of reviews and a national chain. Roofing in Rehovot
  really is in the middle: two strong roofers, one fake-looking listing, and 8 real small contractors below them.
- **In electricians, AC repair and Jerusalem locksmiths, the "weak" lists are mostly real.** They're one-person
  businesses with a first name in the title, a mobile number, few reviews and usually no website. That's exactly
  who we want.

## What didn't match, and why
1. **Movers (4 of the top 10) was a data error.** For movers, Google's list didn't include review counts, so the
   scanner counted strong movers as having zero reviews. Example: a mover with 259 reviews was scored as brand new.
   A national moving marketplace (a lead broker) sits in the top 3 almost everywhere, and it was scored the same way.
   So movers looked easy when they aren't.
2. **Some "weak" top-3 listings are lead networks, not businesses.** Batches of fake-looking listings ("locksmith in
   <town> <first name>") use phone numbers from the same number block and hold first place in several towns. One
   network appears in locksmiths, AC repair, roofing, movers and plumbing. They look weak on paper, but they're
   built to rank, so they're harder to move than their 1–4 reviews suggest.
3. **About 1 in 6 counted prospects shouldn't count.** These are car-electric garages counted as electricians,
   AC-accessory shops, a hardware store, a "nationwide" operator, duplicate listings, and businesses from a
   neighbouring big city that got counted in a small town next to it.

I wrote the fix rules into the scoring spec (Revision 3) and the engineer re-scored from saved data at no cost.
The fixes did what they should: movers dropped out, AC repair in Petah Tikva fell to #12 (its whole top 3 is one
network), and the network-held locksmith towns are now visible as such.

## What round 2 found
- **Small-town locksmiths (Gush Dan ring and Shfela ring): still no.** In all 5 towns, the top 3 is mostly
  network listings with 0–2 reviews, often sharing a phone-number block with the Jerusalem network. The weak lists
  are thin: 8 and 9 names, and over half have no reviews at all and look like network filler. One "prospect" is an
  established shop with 150+ reviews.
- **Holon electricians: yes.** The top 3 are three real electricians (28–93 reviews) with no proper website of
  their own. About 15 of the 20 names below them are real one-person electricians. The rest are an off-trade
  listing, a cross-city listing and two keyword-only listings.
- **AC repair, Rishon LeZion: yes, but harder.** Two of the top 3 are real companies with 79 and 130 reviews and
  their own websites; the third slot is a thin listing. About 17 of the 25 names are real small technicians (the
  others are a training school, a distributor and a few strong firms).
- **Aluminum, Tel Aviv: no.** We have no demo kit for it, and the list mixes in shutter repairers, iron welders
  and a builder. That leaves about 6 real prospects.
- **Roofing, Rehovot: dropped out on its own.** Once network listings are removed, only 6 names are left, and
  2 of them are larger firms. That's below our minimum of 8.
## What changed since the provisional list
- **Three small counting errors, fixed.** A town's own top-3 businesses had been counted as its weak prospects. The
  city check missed everyday city names like "Tel Aviv". And a dead website on a top-3 listing still counted as a
  real site.
- **The dead-website fix had a side effect of its own, also fixed.** Free Wix sites live on a page *under* the
  address. The checker opened only the bare address, which always shows "not found", so live sites were scored as
  dead. That briefly put renovation in Tel Aviv at #1. The scanner now judges the exact page the Google listing
  links to. With that fixed, Tel Aviv renovation, Hod HaSharon electricians, Petah Tikva aluminum and the small-town
  aluminum cluster are all locked up again.
- **Close calls are now flagged.** If changing one website result would flip a cell, it's flagged for a hand check
  before it can enter the top 10. 12 cells are flagged. All of them are already ruled out, and none is near the top.
- The final five didn't change. Each moved up one place.

## Final top 5 (run f354d8b0c7e7)
| # | Rank | Cell | Real weak prospects | Why it's winnable |
|---|---|---|---|---|
| 1 | #1 | Locksmith, Jerusalem | ≈ 32 | Network listings hold the whole top 3. Below them are dozens of real local locksmiths with 10–75 reviews and no website. |
| 2 | #2 | Electrician, Rehovot | ≈ 18 | The top 3 are real one-person businesses (28–74 reviews), beatable with a better profile, more reviews and a site. |
| 3 | #3 | Electrician, Ramla | ≈ 12 | The weakest top 3 of the five. It sits next to Rehovot, so one case study serves both. |
| 4 | #7 | Electrician, Holon | ≈ 15 | Same picture as Rehovot, and the same kit. |
| 5 | #11 | AC repair, Rishon LeZion | ≈ 17 | A second trade. It's off-season, so technicians have time to talk and can have a site ready before summer. |

## Held back, and why
- **Movers:** a data error had made strong movers look brand new, and a national lead broker sits in the top 3
  almost everywhere.
- **Small-town locksmith clusters:** fake network listings hold the top 3, and the weak lists are thin.
- **Renovation, Tel Aviv:** truly locked up (one contractor with 300+ reviews tops every part of the city). We also
  have no renovation demo kit.
- **Aluminum (Tel Aviv, Petah Tikva, small-town cluster):** no demo kit and mixed lists. Petah Tikva and the
  cluster are locked up.
- **Roofing, Rehovot:** only about 4 real names once network listings are removed.
- **Reserves** if a top-5 cell fails at outreach: electricians in Kfar Saba and Modiin. Neither is hand-checked yet.

## Slot 5 — decided
**Approved by Eitan 2026-11-08: AC repair in Rishon LeZion.** The final top 5 is locked as listed above.

Yonatan's recommendation was **AC repair in Rishon LeZion**. The trade-off: we get a second trade and an off-season pitch, but its top 3
is tougher (two real firms with websites) and we can't reuse the electrician kit. Roofing stays parked until a
roofing cell has enough names.

Pilot check 6 (your look at pilots A, C and D) is closed: all three match.
