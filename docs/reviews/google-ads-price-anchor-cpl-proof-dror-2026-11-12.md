# /google-ads price anchor + CPL proof (Dror, web-checked 2026-11-12)

Saved by Adam from Dror's hand-back.

## Price anchor
"Certified Google Partners charge at least ₪2,000 a month" is **false as a floor**. Agencies charge from below ₪2,000, including one with a Partner badge.

Sources, read 2026-11-12:
- **AdsAgency** (Partner badge): ₪1,500–2,500, updated 7 Nov 2026.
- **AirDigital:** ₪1,500–12,000 a month, pre-VAT; local small businesses ₪1,500–3,500. Published 2 May 2026.
- **DigitalSecrets:** agencies ₪1,800–4,500. Updated 4 Nov 2026.
- **Dan Gil:** from ₪1,400. Updated 11 Nov 2026.
- **PPC Israel:** from ₪849 in one place, ₪1,500 flat in another.

No Israeli source prices Partner agencies separately.

**Safe claim:** agency management in Israel typically starts at about ₪1,500 a month before VAT, with the ad budget on top (roughly 6× ₪249).
- Name the category only. Never name a competitor.
- Never attach "Partner" to a competitor's price.
- Use "typically" + "from".
- Re-check every 6 months.

## CPL proof
- **Source:** `buildAllClientDigests()`. 30 days ending mid-August 2026 (signed off 2026-08-16). Counts `metrics.all_conversions`, blended across all enabled campaigns. These are Google Ads conversions, **not verified leads**.
- **Kosher catering for family events** (Jerusalem, centre, south): ₪69.51 per enquiry.
- **Training college for therapists and coaches** (centre, north, online): ₪29.47 per enquiry. The narrower label ("NLP college", 30 years) identifies the client.
- Both are existing accounts WAO connected on 2026-08-04, **not Ads Bot**.
- **HOLD until Eitan confirms:**
  - WAO manages both accounts, and since when;
  - consent for the labels.
- **Before publishing:** refresh read-only (engineer, `npx tsx`, no mutations, `git diff data/clients/` clean).
- **Caption must say:**
  - real accounts WAO manages;
  - average cost per enquiry recorded in Google Ads;
  - the named period;
  - results vary by trade, area, budget and season;
  - not a forecast or a guarantee.

## Eitan's decision (2026-11-12)
- **Anchor:** "about ₪1,500" (typically from, before VAT, ad budget on top).
- **WAO handles both accounts.** Do NOT use Retter: "the lead here is just not correct at the moment". Only the kosher catering account may be used, after a read-only refresh with its own period.
- **Superseded (Eitan, 2026-11-12):** no real client examples on the page at all. The CPL section above is not used.
