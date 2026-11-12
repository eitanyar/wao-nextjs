# Video narration: Site Bot intro, "how it works" (2026-11-12)

For Tamar (waocopy). Storyboard and visuals: `docs/missions/video-intro-site-bot-2026-11-12.md`.
The angle, the wording and the rhythm are yours. The facts, the beat order and the limits below are fixed.

## Situation
- **Who is listening:** a one-man business that works with its hands (plumber, electrician, locksmith and the like). He is busy, sceptical, and has been burned by "a website that brought nothing".
- **Where he is:** he is already on the `/site-bot` page, or he just finished the free check, or he saw one of the cartoon ads. He knows the name. He does not yet understand what he actually gets.
- **What this video is:** a straight explanation in one calm voice (Nimrod). It is not an ad and has no jokes and no cartoon character. The cartoon ads show the problem to strangers; this shows the solution to someone who already came.
- **What he should know at the end:** what the system does, what his own part is, what stays his, and that the first step is a free check.

## The one idea
Site Bot is not a website. It is one system that makes his Google profile, his site and his reviews
tell the same story, and keeps doing it every month. A customer makes three stops before she calls
(profile, site, reviews); when the three don't agree, she calls someone else.

## Facts you may use
- The site is built as the tree of his services: every job he does gets its own page.
- Every page shows his opening hours and a button that calls him.
- His Google profile is kept in line with the site: the same services, areas and hours. WAO joins the profile as a manager; he stays the owner.
- After a good job, he forwards the customer a ready message with his own review link. He sends it; WAO never contacts his customers.
- Once a month he gets one report: calls, requests for directions, new reviews.
- His part: he tells the bot about the business once, and approves.
- The site runs on his own domain. The domain and the profile are in his name.
- The free check: he types only the business name and sees within seconds what a customer sees. No sign-up.
- Monthly price, plus VAT, no commitment, cancel online at any time.

## Limits
- **Eyes-closed rule.** He must understand every line on first hearing with the screen off. No line may lean on the picture, and no metaphor that only exists in a drawing.
- **Price:** only in the last line of each section. No number, and no hint about cost, anywhere earlier.
- **No founder name.** No person's name at all.
- **Brand:** WAO appears twice in the master (the line that introduces the product, and the last line) and once in each cut. Put the audio tag `[excited]` directly before the brand word. Every other line is a straight, calm register; use tags sparingly and only where the meaning calls for one.
- **No promises of results:** no more calls, more customers, higher ranking, first place, or any count of calls or leads. The report line names what is reported, not how much.
- **Reviews:** we only help his customers leave one. Nothing about getting, raising or fixing ratings.
- **Not a website builder,** and never "five pages" or any page count.
- **No timing claim** for the domain or the build. No launch date.
- **Do not mention:** replies to reviews, a link from the site to the profile, review quotes on the site, payment or checkout. They are not in this video.
- **Language:** singular male, spoken Israeli Hebrew, 12–15 words per sentence at most, one idea per line. Prefer words with one obvious reading without vowels; where a text-to-speech voice could read a word two ways, add niqqud on that word only.
- **Approved spellings:** write the product name, the brand and the price in their plain forms in `voice`; the script swaps in the spoken forms from the pronunciation lexicon (`data/voice/pronunciation-lexicon.json`) and the price lexicon (`docs/copy/site-bot-price-lexicon-2026-11-10.json`). The last line must end with the price in the same pattern as the approved Dash closing lines (product, price, "a month").

## What to write
Five sections. Each line is one beat on one visual, so keep the number of lines and their order exactly
as listed. The intent column says what the line must get across, not how to say it.

### `master_90`: 13 lines, about 175 words, 80–90 seconds
| Line | Must get across | Removable |
|---|---|---|
| B01 | A customer needs a tradesman tonight; before she calls, she makes three stops. | no |
| B02 | The three stops: his profile, his site, his reviews. | no |
| B03 | When they don't agree (hours, services), she doesn't ask; she calls the next one. | no |
| B04 | Site Bot from WAO is one system that makes all three tell the same story. | no |
| B05 | The site is the tree of his services: a page for every job. | no |
| B06 | On every page: his hours and a button that calls him. | no |
| B07 | The profile is kept in line with the site: same services, areas, hours. | **yes** |
| B08 | After a good job he forwards a ready message with his review link. | **yes** |
| B09 | Once a month, one report: calls, directions, new reviews. | **yes** |
| B10 | His part: tell it about the business once, and approve. | **yes** |
| B11 | It runs on his own domain; the domain and the profile stay in his name. | no |
| B12 | Start with the free check: type the business name, see in seconds what a customer sees. | no |
| B13 | Site Bot from WAO, the monthly price, no commitment. | no |

**Removable lines.** B07–B10 describe parts that go live with the launch. Any of them may be deleted
before the render if its part is not live. Write them so that the script still flows when any one, or
all four, are removed: no line may refer back to a removable line, and B11 must work directly after B06.

**B11 card.** For B11 also give `card`: two short on-screen lines (each 22 characters or fewer) that say
the same thing as the voice in fewer words. This is the only on-screen text besides captions.

### `cut_45`: 6 lines, at most 90 words. For someone who just ran the free check.
K1 the system in one line (as B04) · K2 the service-tree site (as B05) · K3 the profile in line with the
site (removable) · K4 the review message and the monthly report in one line (removable) · K5 own domain,
his name (as B11, with `card`) · K6 closing line with the price (as B13).
He has already seen his result, so do not explain the check.

### `cut_30`: 6 lines, at most 58 words. For YouTube.
T1 three stops before she calls (B01 + B02 in one line) · T2 they don't agree, she calls someone else ·
T3 the system in one line · T4 the service-tree site · T5 the free check · T6 closing line with the price.

### `cut_15`: 3 lines, at most 26 words.
F1 the problem in one line · F2 the solution in one line · F3 closing line with the price.

### `cut_6`: 2 lines, at most 9 words.
X1 the idea in six words or fewer · X2 product and brand only (the price is shown, not spoken).

## Also needed
- `demo_label`: one or two words for a small on-screen tag that marks the business in the screen recordings as a fictional example.
- `demo_business_name`: a plausible, clearly fictional name for a one-man plumbing business, which will be typed into the free check on screen. It must not match a real business.

## Output
One JSON object, no markdown, in the same shape as the Dash scripts:

    {
      "angle": "<two English sentences: the angle you chose and why it fits this listener>",
      "episodes": {
        "SB-INTRO": {
          "title": "Site Bot intro",
          "master_90": [ { "beat": "B01", "voice": "...", "display": "...", "tag_why": "...", "card": null } ],
          "cut_45": [ ... ], "cut_30": [ ... ], "cut_15": [ ... ], "cut_6": [ ... ]
        }
      },
      "demo_label": "...",
      "demo_business_name": "..."
    }

- `voice`: the spoken line, with audio tags and any niqqud.
- `display`: the same words for captions: no tags, no niqqud, WAO in Latin, the price in digits with the currency sign and the VAT term.
- `tag_why`: English, why the tag (or no tag) fits the meaning of the line.
- `card`: only where asked (B11, K5); otherwise null.

→ Noa proofs the whole file (including `card`, `demo_label`, and the end-screen stamp and CTA that are
still waiting for her from `docs/copy/video-end-screen-cta-2026-11-12.waocopy.json`). Then Eitan listens
with his eyes closed before any hash is approved.
