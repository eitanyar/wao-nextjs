# Brief for Tamar: intake answers of the video's demo plumber (2026-11-12)

## Situation
The Site Bot intro video shows real screens of a site the bot built. That site must belong to a
business that does not exist. We will run the real site generator once on a made-up plumber's
intake answers, Noa will proofread the pages, and the result is frozen for all screen recordings.

You are not writing the site. You are writing what a **one-man plumber would type into the intake
chat about himself**, in his own words. The generator writes the pages from that.

Spec: `docs/missions/video-demo-business-spec-2026-11-12.md`. The business name itself is already
requested as `demo_business_name` in `docs/copy/briefs/video-intro-site-bot-2026-11-12.md`; use the
same name here.

## Who reads the result
A tradesman watching a 7-second shot of "his kind of site" on a phone. He reads the headline, three
service names and the call button. It should look like a neighbour's site, not like an ad.

## What I need (Hebrew, as the owner would type it)
| Field | What it is | Limits |
|---|---|---|
| `businessName` | Same as `demo_business_name` | Made-up; no person's name; no match on Google. |
| `businessNiche` | His trade in one or two words | |
| `primaryService` | Leak detection | 2–3 words. |
| `secondaryServices` | Drain unblocking; water heater installation | 2–3 words each. |
| `targetLocation` | His home city | A real city. Your choice; the spec only needs two neighbouring cities. |
| `specificCities` | Home city plus one neighbouring city | |
| `travelBoundary` | How far he travels | One short phrase. |
| `usp` | What he does differently, in one sentence | A working habit, not a superlative. No named tool or brand. |
| `idealClientFear` | What his customer is afraid of when calling a plumber | One sentence. |
| `yearsInField` | Years in the trade | A number and the word. |
| `guarantee` | His warranty | One short phrase. |
| `responseTime` | When he arrives | One short phrase. No promise in minutes. |

## Must not appear
- A person's name, a review quote, a star rating, a number of reviews.
- Any price, call-out fee or "from" amount. (A price appears only on the video's end screen.)
- A licence number, a certificate, an award, a named tool or manufacturer.
- A street address.

## Fixed by code, not yours
Phone `050-0000000`; hours `Sun-Thu 08:00-18:00, Fri 08:00-13:00`; pricing promises `free_quote`
and `price_before_work`; service model "comes to the customer".

## Return
JSON with exactly the fields in the table. Then Noa proofreads the answers before the engineer runs
the generator, and proofreads the generated pages after.

## Where it goes
`data/video/demo/` as the generator's input fixture. Never into `data/clients/`.
