# Market scan — stop-and-see check (one page)

Yonatan · 2026-11-07 · run 73ecfd6063af · anonymized (no business names, phones or websites)

## What we checked
The scanner ranked 410 profession-by-city "cells". Before any outreach I hand-checked 9 of them: the engineer's top 5,
plus movers in Ashdod, plus pilot cells A (roofing, Petah Tikva), C (pergolas, Karmiel) and D (roofing, Rehovot).
For each one I looked at the businesses Google actually shows in the top 3 (from the saved Google responses of
2026-11-07). For the 5 cells that made the final list I read the whole list of businesses we counted as "weak and
reachable". I asked two questions: is the top 3 really as strong as the score says, and are the weak ones real
owner-run businesses we could talk to? No business was contacted and nothing extra was bought.

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

I've written the fix rules into the scoring spec (Revision 3). The engineer can re-score from saved data at **no
cost**, and I'll re-check anything new that enters the top 5.

## Final top 5 (provisional until the free re-score)
| # | Cell | Real weak prospects | Why it's winnable |
|---|---|---|---|
| 1 | Locksmith, Jerusalem | ≈ 35 | The top 3 is a lead network plus an empty listing. There are dozens of real local locksmiths with 10–75 reviews and no website. |
| 2 | AC repair, Petah Tikva | ≈ 31 | The top 3 are three thin listings with 1–2 reviews each. Real technicians sit right below them. |
| 3 | Electrician, Rehovot | ≈ 21 | The top 3 are real one-person businesses (28–74 reviews), beatable with a better profile, more reviews and a site. |
| 4 | Electrician, Ramla | ≈ 15 | A clean, owner-run market next door to #3, so one electrician case study serves both. |
| 5 | Roofing, Rehovot | 8 | The highest-value jobs, and our roofing demo site is ready. The list is small. |

Held back for now: all movers cells, and the two small-town locksmith clusters around Gush Dan and the Shfela (lead
networks in the top 3; too few real prospects once cleaned).

## One decision for you
**Slot 5: roofing in Rehovot or electricians in Holon?**
- Roofing: biggest ticket, demo kit ready, but only 8 businesses to approach.
- Holon electricians: about 29 businesses and the same kit as #3 and #4, but I haven't hand-checked it yet.

My recommendation is **roofing**. Eight high-ticket roofers are enough for one proof case and the demo is already
built. Electricians are already covered twice.

With this summary, pilot check 6 (your look at pilots A, C and D) can be closed: all three match.
