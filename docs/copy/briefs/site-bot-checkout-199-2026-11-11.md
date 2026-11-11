# Brief: Site-Bot pay page + two stale price lines (2026-11-11)

**Reader:** an Israeli hands-on micro-business owner (plumber, electrician, AC tech…), singular male, busy, suspicious of subscriptions. He just finished a 3-question chat about his business and the free preview of his site; this is the moment he decides to pay.

**Offer (fixed, do not change):** Site-Bot monthly plan — ₪199 + VAT per month (card charged {total} incl. VAT), charged today and then on the same date every month. No trial. Month-to-month, no minimum commitment. Cancel online any time; cancellation takes effect at the end of the month already paid for. Includes the website, Google Business Profile management, reviews flow and a monthly digest. The client owns his domain and Google profile.

**Where it goes:** `src/lib/site-bot/checkout/checkoutCopy.ts`, on the pay page under a big "₪199". Code injects numbers via tokens — keep the tokens exactly as written, never write digits yourself: `{net}`, `{total}`, `{vatPercent}`.

**Keys to write (one string each):**
1. `priceSuffix` — sits right after the big ₪199: "+ VAT, per month".
2. `priceTotalLine` — "{total} including VAT ({vatPercent}%). Charged today, then on the same date every month."
3. `termsNoCommitment` — month-to-month, no minimum commitment.
4. `termsCancelOnline` — cancel online anytime; takes effect at the end of the month already paid for.
5. `pageSubheading` — after the first payment clears, the site is built, reviewed by a person and published (do not promise instant/automatic go-live; a human reviews before go-live).
6. `payButton` — pay {total} and start the monthly plan. Must fit a mobile button (short).

**Two stale homepage lines (currently say "from ₪9.90", which no longer exists):**
- `src/components/Hero.tsx` — `ctaPrimary: "בניית אתר — מתחילים ב-₪9.90"` (a hero CTA button label).
- `src/components/Services.tsx` — Site Bot card desc ending "…בלי מעצב ובלי טפסים. מתחילים ב-₪9.90."
Context: the /site-bot funnel leads with a FREE audit and a talk with Eitan; prices are shown on the pay page, not as a homepage hook. You choose the angle for these two (they are entry points, not the pay moment). Keep the Hero CTA button-short.

**Rules:** native Sabra Hebrew, singular male, no "we", no hype, no "only ₪…" cheapness framing, gershayim/geresh not ASCII quotes, em-dash single-spaced. Return JSON: {"checkout": {key: string, …}, "patches": [{"file","old","new","why"}]} — patches old strings must be the exact current strings above.
