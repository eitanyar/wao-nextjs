# Dash v2: on-screen text (2026-11-12)

For Tamar (waocopy), then Noa. This brief contains no Hebrew on purpose: every existing string is
referenced by its path in `docs/copy/video-dash-v2-scripts-2026-11-12.json`. Copy strings from the
file byte-exact; do not retype them.

## Situation
The six Dash v2 ads (A1–A3 Ads Bot, S1–S3 Site Bot; 30s and 15s cuts) are scripted and voiced.
The visual design (`docs/missions/video-dash-v2-design-2026-11-12.md`) needs a few short pieces of
on-screen text that the scripts do not yet supply. The viewer is the same tradesman, often
watching on mute on his phone. Captions already show each line's `display` text in 2–4 word
cards; the items below are the other text he sees.

The angle is yours. Positioning and the facts are fixed by the scripts.

## What to write

### A. End-screen price line (one per product)
- **Where:** the largest line on the last screen, under the product name, above the stamp.
- **Why it is needed:** the founder decided the price is seen only on the end screen and is not spoken, so no script line carries it. Without this, the screen shows a bare number.
- **Facts:** Ads Bot is 249 a month before VAT; the ad budget is paid to Google separately. Site Bot is 199 a month before VAT.
- **Must say:** the amount, that it is monthly, and that VAT is added. Nothing else.
- **Shape:** one line, as short as it can be. It should match how the price is stated on the product's page.
- **Give:** two options per product and your pick.

### B. Mute banner (one per cut)
- **Where:** a cartoon speech tab above Dash's face on the verdict beat, shown whole for the beat. Captions are off on that beat, so the banner is the only text.
- **Job:** a muted viewer must be able to say what the problem is.
- **Default:** the verdict line's `display` string, unchanged. For each one, either confirm it as is or give a shorter banner (six words at most) that says the same thing.

| Cut | Default source | Question |
|---|---|---|
| A1 30s | `episodes.A1.script_30[3].display` | Confirm. |
| A1 15s | `episodes.A1.script_15[1].display` | Confirm. |
| A2 30s | `episodes.A2.script_30[4].display` | Confirm. |
| A2 15s | `episodes.A2.script_15[1].display` | Confirm. |
| A3 30s | `episodes.A3.script_30[4].display` | Confirm. The same word is also stamped across the report stack just before (item C). Is that one repeat too many? |
| A3 15s | `episodes.A3.script_15[1].display` | Same. |
| S1 30s | `episodes.S1.script_30[3].display` | Confirm. |
| S1 15s | `episodes.S1.script_15[1].display` | Two sentences. The design shows only the second as the banner. Confirm or supply. |
| S2 30s | `episodes.S2.script_30[4].display` | Read alone on mute, does it state the problem (customers who never get round to writing a review)? If not, supply a banner that does. |
| S2 15s | none planned | The verdict is merged into the product line. Say if this cut needs a banner, and on which line. |
| S3 30s | `episodes.S3.script_30[3].display` | Confirm, or keep only the second sentence. |
| S3 15s | `episodes.S3.script_15[1].display` | Two sentences. Confirm or shorten. |

### C. Words inside the picture
The scripts' `screen` fields put a few words into the drawing. They will be rendered as text from
your strings, not drawn. Confirm the exact standalone form of each (for example, whether the
geresh quotes stay when the word stands alone).

| Id | What | Source |
|---|---|---|
| `T-A3-stamp` | The one word stamped across the stack of report pages | The quoted word in `episodes.A3.script_30[4].display` |
| `T-S3-yes` | The owner's one-word answer, floating alone | The quoted word in `episodes.S3.script_30[2].display` |
| `T-S3-labelSite` | The trade on his site card | The first trade word in `episodes.S3.script_30[0].display` |
| `T-S3-labelProfile` | The trade on his profile card | The second trade word in `episodes.S3.script_30[0].display` |
| `T-S3-svc1`, `2`, `3` | Three service lines, shown on both cards with a tick | The three service words in `episodes.S3.script_30[5].display` |

### D. Demo label
Real product screens carry a small label saying the data is a demonstration. Use the same string
as the Site Bot intro video so the two never differ. If the intro's label is not written yet,
write it once here for both.

## Constraints
- No price anywhere except item A. No founder name.
- No promise of results, rankings or calls. No new claim that the spoken line does not make.
- Banners must not read like a phone notification (no sender, no time, no "new message" phrasing).
- Singular male address. Gershayim and geresh, never ASCII quotes. No niqqud.
- The stamp and the CTA are already written and are with Noa; do not rewrite them here.

## Output
One JSON object:
```json
{
  "price_line": { "ads_bot": { "options": [], "pick": "" }, "site_bot": { "options": [], "pick": "" } },
  "banners": { "A1_30": "", "A1_15": "", "A2_30": "", "A2_15": "", "A3_30": "", "A3_15": "", "S1_30": "", "S1_15": "", "S2_30": "", "S2_15": null, "S3_30": "", "S3_15": "" },
  "overlays": { "T-A3-stamp": "", "T-S3-yes": "", "T-S3-labelSite": "", "T-S3-labelProfile": "", "T-S3-svc1": "", "T-S3-svc2": "", "T-S3-svc3": "" },
  "demo_label": "",
  "notes": ""
}
```
Then to Noa for proofing, including the bidi of the price line (currency sign, digits, VAT term).
