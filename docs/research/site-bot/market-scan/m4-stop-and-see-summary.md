# Market scan — stop-and-see check (one page)

Yonatan · 2026-11-07 · final version · runs 73ecfd6063af (first check) and 7f91346fefc5 (free re-score with the
fixes) · anonymized (no business names, phones or websites)

## What we checked
The scanner ranked 410 profession-by-city "cells". Before any outreach I hand-checked them in two rounds. Round 1:
the engineer's top 5, movers in Ashdod, and pilot cells A (roofing, Petah Tikva), C (pergolas, Karmiel) and
D (roofing, Rehovot). Round 2, after the free re-score: every new entrant near the top: the two small-town locksmith
clusters, electricians in Holon, aluminum in Tel Aviv and AC repair in Rishon LeZion. For each one I looked at the
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
- **Three small counting errors still to fix** (free, no new data): (1) Two of Rehovot's own top-3 electricians
  were also counted as its weak prospects. They had been moved in from the town next door. (2) The "this business
  belongs to another city" check only knows each city's official name ("Tel Aviv-Yafo", "Modiin-Maccabim-Re'ut"),
  so it misses titles that use the everyday name. (3) A dead website on a top-3 listing still counts as a real site.
  None of these changes the list below. Rehovot drops by about 2 names.

## Final top 5
| # | Cell | Real weak prospects | Why it's winnable |
|---|---|---|---|
| 1 | Locksmith, Jerusalem | ≈ 32 | Network listings hold the whole top 3. Below them are dozens of real local locksmiths with 10–75 reviews and no website. |
| 2 | Electrician, Rehovot | ≈ 18 | The top 3 are real one-person businesses (28–74 reviews), beatable with a better profile, more reviews and a site. |
| 3 | Electrician, Ramla | ≈ 12 | The weakest top 3 of the five (11 reviews, 1 review, and one out-of-town electrician). It sits next to #2, so one case study serves both. |
| 4 | Electrician, Holon | ≈ 15 | Same picture as Rehovot. Same kit as #2 and #3. |
| 5 | AC repair, Rishon LeZion | ≈ 17 | A second trade. It's off-season now, so technicians have time to talk and a site ready before summer. |

Held back: all movers cells, both small-town locksmith clusters, aluminum in Tel Aviv, and roofing in Rehovot.
Reserves if a top-5 cell fails at outreach: electricians in Kfar Saba (#8) and Modiin (#9). I haven't hand-checked
either one yet.

## The slot-5 decision, closed
Your open choice was roofing in Rehovot or electricians in Holon. Holon is now in at #4 on its own merits. For slot 5
I am **not** forcing roofing back in: 6 names (about 4 real) is too few for even one proof case. Instead I pick
**AC repair in Rishon LeZion**. The trade-off: we get a second trade and an off-season pitch, but its top 3 is tougher
(two real firms with websites) and we can't reuse the electrician kit. The roofing demo stays ready for a roofing
cell with enough names.

Pilot check 6 (your look at pilots A, C and D) is closed: all three match.
