# Brief: keyword pivot for /google-ads and /site-bot heads, 2026-11-27

**Why:** the top nav now links "ניהול קמפיין בגוגל" → /google-ads and "קידום עסק בגוגל" → /site-bot (Eitan's labels, approved by Lior + Yonatan). Each page's head must carry its phrase. Both pages are new and have no search traffic yet, so nothing existing is at risk.

**Reader:** Israeli one-man trade/service business owner (plumber, electrician, etc.), busy, ROI-minded, allergic to agency talk.

**Edit ONLY these source files** (format `key :: value`, one field per line; return byte-exact `old` → `new` patches of whole lines):
- `docs/copy/google-ads-r2-final-candidate-2026-11-12.txt` (Ads Bot: a managed Google Ads campaign, {net} ₪ + מע״מ per month, account in the client's name, he marks which leads were real and the campaign chases more of those)
- `docs/copy/site-bot-r2-final-candidate-2026-11-12.txt` (Site Bot: organic exposure system: service-tree site + matching Google Business Profile + reviews; 199 ₪ + מע״מ per month; no ads)

Read both files fully first. Keep every `{net}` token and every price/fact exactly as it is. Do not invent facts.

## /google-ads (target: «ניהול קמפיין בגוגל», singular, exact)
1. `seo.title`: must START with «ניהול קמפיין בגוגל», then the offer (price token as in the current title). "Google Ads" may appear mid-string but must NOT be the last token (the brand " | WAO" is appended by code; a Latin word right before it flips in RTL results). Max ~60 characters.
2. `hero.h1`: must contain «ניהול קמפיין בגוגל» and keep today's promise (real leads, not clicks). The current H1 leads with «פרסום בגוגל»; that phrase moves out of the H1.
3. `hero.badge`: short, contains «ניהול קמפיין בגוגל» (it is the small pill above the H1).
4. One existing H2 (your choice of which) reworked to contain «קידום ממומן בגוגל» naturally. Do not touch the H2 that already says «ניהול קמפיינים בגוגל» (that plural mention stays).
5. `seo.description`: include «קידום ממומן בגוגל» once and keep «פרסום בגוגל» once (it should survive somewhere on the page, body or meta).

## /site-bot (target: «קידום עסק בגוגל», exact)
1. `seo.title`: must START with «קידום עסק בגוגל», then what he gets (a site for a small business + Google profile + reviews). It must make clear this is organic, not paid ads, so it is not confused with /google-ads. Keep «בניית אתר לעסק קטן» or «אתר לעסק קטן» in it if it fits. Do NOT use «קידום אתרים» (another page's phrase). No Latin word as the last token. Max ~60 characters.
2. `hero.badge`: becomes «קידום עסק בגוגל» plus at most a short organic qualifier. The price that is in the badge today must stay visible somewhere in the hero (move it into `hero.subhead` or `hero.cta_note` only if it is not already there).
3. `hero.h1`: keep «בניית אתר לעסק קטן» as is. Change it only if needed for flow with the new badge.
4. One existing H2 reworked to contain «קידום עסק בגוגל» naturally, OR a sentence in an existing body field; your choice.
5. If the hero doesn't already say organic / not ads within its first lines, add that in `hero.subhead` in a few words.

**Rules:** singular male, flawless native Hebrew, em-dash single-spaced, Hebrew gershayim/geresh only. Keep each heading roughly the length of the one it replaces. The keyword phrases must appear exactly as written (no attached prefix letters, e.g. not «לניהול קמפיין בגוגל» or «בקידום עסק בגוגל»).
