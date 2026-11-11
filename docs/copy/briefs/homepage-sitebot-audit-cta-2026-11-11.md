# Brief: homepage Site-Bot path-card button → now opens the free audit (2026-11-11)

**Reader:** an Israeli hands-on micro-business owner (plumber, electrician, AC tech…), singular male, landing on the WAO homepage, choosing the "business website" path card.

**Change:** the card's primary button (`src/content/astra-authority-first-homepage-copy.json` → `paths.business_website.primary_cta.label`, current text "נתחיל עם האתר שלי") used to go to the paid sign-up. It now opens /site-bot/audit — a FREE check of how his business shows up on Google (no payment, no sign-up commitment). The current label promises a site build, which no longer matches the destination. The text link right under it, "עוד על האתר לעסק", stays and keeps going to the product page.

**Job:** a button label that honestly says "free check of your business on Google" as the first step toward the site. Must fit a mobile button (short). Voice exemplar: the /site-bot/audit page.

**Rules:** native Sabra Hebrew, singular male, no "we" hype, gershayim/geresh not ASCII quotes. Return JSON: {"patches":[{"file":"src/content/astra-authority-first-homepage-copy.json","old":"נתחיל עם האתר שלי","new":"…","why":"…"}]}.
