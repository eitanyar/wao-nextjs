# Video narration: Ads Bot intro, "how it works, stage by stage" (2026-11-12)

For Tamar (waocopy). Storyboard and visuals: `docs/missions/video-intro-ads-bot-2026-11-12.md`.
The angle, the wording and the rhythm are yours. The facts, the beat order and the limits below are fixed.

## Situation
- **Who is listening:** a one-man business that works with its hands (plumber, electrician, locksmith and the like). He has paid for Google ads before, or knows someone who did: the money went out, clicks came in, the phone stayed quiet. He trusts nobody who says "leave it to us".
- **Where he is:** already on the `/google-ads` page or in onboarding, or he saw one of the cartoon ads. He knows the name. He does not know what the bot actually does with his money.
- **What this video is:** a straight explanation in one calm voice (Nimrod). Not an ad, no jokes, no cartoon character.
- **What he should know at the end:** the bot works in two stages and tells him so; what guards his money in the first; what his own small part is; what changes in the second; and that he can watch everything himself.
- **Why the founder wants it this way:** being open about the stages is the proof. We do not hide that a new account starts with no data.

## The one idea
Two stages, in the open. First the bot guards his money while the new account still knows nothing.
Once he has marked enough real jobs, bidding aims at a cost per enquiry. The whole way, he sees every
enquiry and every shekel in his own account.

## Facts you may use
- **Start:** a new Google Ads account is opened in his name, from scratch.
- **Stage one, learning:**
  - The bot puts a ceiling on the price of a click.
  - It blocks searches that burn money without bringing enquiries.
  - It filters fake clicks.
  - It does not raise the budget while an enquiry costs more than the target set for his business.
  - Every enquiry (form, call tap, WhatsApp tap) lands in one list. He marks each one with a tap: real or junk, and marks a job when it closes.
- **Stage two:** after about 15–30 jobs he marked, the campaign moves to a target cost per enquiry. From then on, Google aims at the price per enquiry that fits his business. It happens when the data is there, not on a date.
- **Throughout:** he sees every enquiry and every shekel in his own account. The ad budget goes from him straight to Google.
- **First step:** a free demo on a sample business.
- **Close:** the monthly price plus VAT, no commitment.

## Tense and wording rules (checked against the code today)
These are the reason this brief exists. A line that breaks one of them cannot ship.

| You may say | You may not say |
|---|---|
| He marks; his marks are what the next stage is built on. | Google learns from his marks, in the present tense, in any form. |
| After enough marked jobs the campaign moves to a target cost per enquiry. | The bot switches by itself or automatically. Use "the campaign moves" or "we move". |
| From then, Google aims at that price (future, tied to stage two). | Google already aims at, finds or prefers better enquiries in stage one. |
| The bot does not raise the budget above his target. | A cap or guarantee on what an enquiry costs; "stops overspend". |
| Each mark is passed to Google (line A08 only, see below). | It learns "only" from closed jobs; it "knows" which customers are real. |

## Limits
- **Eyes-closed rule.** He must understand every line on first hearing with the screen off. No line may lean on the picture. The words "stage one" and "stage two" must be spoken, because the drawing carries no text.
- **Price:** only in the last line of each section. No number of ours earlier, and no ad-budget amount anywhere.
- **The 15–30 range** is the only other number, and only in the stage-two line.
- **No founder name.** No person's name at all, and no "call with" anyone.
- **Brand:** WAO appears twice in the master (the line that introduces the product, and the last line) and once in each cut. Put the audio tag `[excited]` directly before the brand word. Every other line is a straight, calm register; use tags sparingly and only where the meaning calls for one.
- **No promises of results:** no more calls, more jobs, cheaper enquiries, savings, or any count or cost achieved.
- **Do not mention:** the weekly report, the refund, the ad credit, the Google Partner badge, landing pages, payment or checkout, how long stage one lasts.
- **Language:** singular male, spoken Israeli Hebrew, 12–15 words per sentence at most, one idea per line. Prefer words with one obvious reading without vowels; where a text-to-speech voice could read a word two ways, add niqqud on that word only.
- **Approved spellings:** write the product name, the brand and the price in their plain forms in `voice`; the script swaps in the spoken forms from `data/voice/pronunciation-lexicon.json`. The last line must follow the pattern of the approved Ads Bot closing lines in `docs/copy/video-dash-scripts-r4-final-candidate-2026-11-12.json` (product, price, "a month").

## What to write
Four sections. Each line is one beat on one visual, so keep the number of lines and their order exactly
as listed. The intent column says what the line must get across, not how to say it.

### `master_70`: 12 lines, about 150 words, 65–70 seconds
| Line | Must get across | Removable | Alternate needed |
|---|---|---|---|
| A01 | The money went out, the clicks came in, the phone stayed quiet. | no | — |
| A02 | A click is not a job; a new account does not yet know which searches bring him work. | no | — |
| A03 | Ads Bot from WAO opens a new account in his name and works in two stages, in the open. | no | — |
| A04 | Stage one, while it learns: a ceiling on the price of a click. | no | — |
| A05 | It blocks searches that burn money without enquiries, and filters fake clicks. | **yes** | `alt`: the same line without fake clicks |
| A06 | It does not raise the budget while an enquiry costs more than his target. | no | — |
| A07 | His part takes a second: every enquiry lands in one list and he marks it, real or junk, and when a job closes. | no | — |
| A08 | Every mark is passed to Google, tied to the click that brought the enquiry. | **yes** | — |
| A09 | Stage two: after about 15–30 jobs he marked, the campaign moves to a target cost per enquiry, and from then Google aims at the price that fits his business. | no | `alt`: the same line with "enough real jobs" instead of the number |
| A10 | The whole way, every enquiry and every shekel is in front of him in his own account; the ad budget goes from him straight to Google. | no | `alt`: he sees every enquiry in his list (no account, no budget) |
| A11 | He can see it first: a free demo on a sample business. | no | — |
| A12 | Ads Bot from WAO, the monthly price plus VAT, no commitment. | no | — |

**Removable lines and alternates.** A05 and A08 may be deleted before the render, and an alternate may
replace A05, A09 or A10, depending on checks that are still running. Write so the script flows in every
combination: no line may refer back to A05 or A08, A06 must work directly after A04, and A09 must work
directly after A07. A09 may be split into two sentences if one would pass 15 words.

**A10 card.** For A10 also give `card`: two short on-screen lines (each 22 characters or fewer) that say
the same thing as the voice in fewer words.

### `cut_30`: 6 lines, at most 58 words. For YouTube and WhatsApp.
T1 the problem (as A01) · T2 the product and two open stages (as A03) · T3 stage one in one line: click
ceiling and blocked searches · T4 his part: he marks (as A07) · T5 stage two (as A09, with an `alt`
without the number) · T6 closing line with the price.

### `cut_15`: 3 lines, at most 26 words.
F1 the problem in one line · F2 two stages, he marks, he sees every enquiry · F3 closing line with the price.

### `cut_6`: 2 lines, at most 9 words.
X1 the idea in six words or fewer · X2 product and brand only (the price is shown, not spoken).

## Also needed
- `demo_leads`: five plausible first names (no family names) for fictional enquiries in the on-screen list. Mixed, ordinary Israeli names; none may be the name of a public figure.
- `demo_label` and `demo_business_name`: reuse the ones from the Site Bot intro script if they are approved; do not write new ones.

## Output
One JSON object, no markdown, in the same shape as the Site Bot intro script:

    {
      "angle": "<two English sentences: the angle you chose and why it fits this listener>",
      "episodes": {
        "AB-INTRO": {
          "title": "Ads Bot intro",
          "master_70": [ { "beat": "A01", "voice": "...", "display": "...", "tag_why": "...", "card": null, "alt": null } ],
          "cut_30": [ ... ], "cut_15": [ ... ], "cut_6": [ ... ]
        }
      },
      "demo_leads": ["...", "...", "...", "...", "..."]
    }

- `voice`: the spoken line, with audio tags and any niqqud.
- `display`: the same words for captions: no tags, no niqqud, WAO in Latin, the price in digits with the currency sign and the VAT term, the range as `15–30`.
- `tag_why`: English, why the tag (or no tag) fits the meaning of the line.
- `card`: only for A10; otherwise null.
- `alt`: only where the table asks; an object with its own `voice` and `display`; otherwise null.

→ Noa proofs the whole file (including `card`, every `alt`, `demo_leads`, and the Ads Bot end-screen
stamp and CTA from `docs/copy/video-end-screen-cta-2026-11-12.waocopy.json`). She also checks every
line against the tense and wording table above. Then Eitan listens with his eyes closed before any
hash is approved.
