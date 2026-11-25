## Site Bot promise truth pass (Yonatan, 2026-11-26)

**Bottom line:** I found 6 live or ready-to-ship surfaces that promise rankings, visibility or jobs from Google, plus one wording that can be misread. The heaviest is a line already recorded in the S1-15 ad and its YouTube title. None of the hits is in the terms page; it carries an explicit no-ranking disclaimer. The pay page and the bot emails are clean. Tamar writes all replacement Hebrew. The "replacement must say" lines below are in English only.

**What the attributed Google claims rest on** (Google Business Profile Help, "Tips to improve your local ranking", support.google.com/business/answer/7091, fetched 2026-11-26):
- "Businesses with complete and accurate info are more likely to show up in local search results."
- "More reviews and positive ratings can help your business's local ranking."
- "There's no way to request or pay for a better local ranking on Google."

Google Search Central ("Do you need an SEO?", fetched 2026-11-26) also says: "No one can guarantee a #1 ranking on Google."

So copy that says "Google says X helps" is true and stays. Copy that says "*we* make you rise / be found / get jobs" is the problem.

---

### 1. /site-bot landing page
**True source:** `/home/eitanya/wao/docs/copy/site-bot-r2-final-candidate-2026-11-12.txt`. The generated file `/home/eitanya/wao/src/lib/site-bot/landingCopy.generated.ts` is rebuilt from it by `node scripts/build-landing-copy.mjs`. Patch the .txt only. Keep the 5 occurrences of 199 or the build fails.

**H1. `claim.body`** (txt:13, gen:22). The part that over-promises:
`גוגל מראה אותך ליותר אנשים שמחפשים לידך`
- **Why:** it says as fact that Google will show him to more people (more visibility). Google's own page says only that this *can help*, and that ranking can't be bought.
- **Must say:** when the site, the profile and the reviews tell one story, he is doing what Google says helps local results. A customer comparing him with a competitor sees a well-run business and picks him. Keep the opening "you were right, a site alone brings nothing" hook.
- The sentence before it, `טלפונים מגיעים כשהאתר, פרופיל גוגל והביקורות אומרים אותו דבר.`, is a general principle, not a WAO promise. Keep it. If Tamar folds it into the new line, that is fine.

**H2. `parts.site.h2`** (txt:14, gen:26):
`שימצאו אותך גם כשמחפשים ״החלפת דוד״`
- **Why:** it reads as a promise that he will rank for service searches like "boiler replacement". A new site's service page in a city has no such guarantee.
- **Must say:** the action, not the ranking result. Each service gets its own page, written for the words people around him actually type ("החלפת דוד" can stay as the example). It is not a head-term anchor, so it is free to change.

**H3. `parts.profile.h2`** (txt:16, gen:30):
`פרופיל ואתר שמספרים אותו סיפור עולים במפה`
- **Why:** "rise on the map" is a flat ranking claim.
- **Must say:** profile and site tell the same story, and that match is what Google asks for and what makes the customer call without checking two more. The body already carries the true attributed Google line. Keep the body unchanged.

**H4. `faq[0].a`** (txt:50, gen:98). Ambiguous wording, not an over-promise:
`האתר עולה ראשון, ובחודש הראשון בן אדם מהצוות שלנו מתאים ידנית את הפרופיל שלך לאתר.`
- **Why:** inside an FAQ about showing up on Google, "האתר עולה ראשון" can be read as "the site ranks first", although it means "goes live first".
- **Must say:** the site goes live (on air) first, then in month one a team member matches the profile to the site by hand. Leave the rest of the answer as it is; its Google claims are attributed and verified.

**Checked and judged fine on the landing page:**
- `hero.h1` and `seo.title`: purpose statements. **I sign off that both keyword anchors stay unchanged.**
- `hero.subhead`, `scene.body` ("שזה יהיה הטלפון שלך"), `close.body`, `close.h2`: wishes ("so that"), not guarantees.
- `parts.site.body`, `parts.profile.body`, `parts.reviews.body`: the Google claims are attributed and match 7091.
- `monthly.*`, `faq[7].a` (the report shows *whether* calls rise), `faq[1..6]`.
- `price.body` "עבודה אחת שנכנסה מגוגל כבר מכסה את החודש" and `faq[1].a` "סכום שעבודה אחת מגוגל מכסה": price framing, not a promise that a job will come.
- `seo.description` and `faq[2].a`: the 1-day / 3-day timings are for the site going live, which is a product fact.
- `alternatives.*`, `proof.*`, `launch_stamp*`.
- Founder block (`src/content/astra-authority-first-homepage-copy.json:58`) `המטרה שלי פשוטה: שתכתוב לי בעוד שנה שאין לך מקום ביומן.`: a stated goal, not a search promise. This is the closest edge case on the page. I keep it; Adam can soften it if he wants zero timeframes.
- `src/content/hero-product-strings-2026-11-15.json` `site_bot.*`: fine.

### 2. /site-bot/audit (including the result screens)
- **Sources:** `src/lib/site-bot/acquisitionCopy.ts` (from `docs/research/site-bot/acquisition-copy-bundle.md`), `scorecardCopy.ts` (from `docs/research/site-bot/scorecard-copy-bundle.md`), `auditJourneyCopy.ts` (from `docs/copy/assisted-sitebot-pilot-microcopy-draft-2026-10-11.md`), `eligibilityCopy.generated.ts` (from the waocopy JSONs of 2026-11-25), `intakeCopy.ts`.
- **No hits.** What renders: the `ENTRY_*` headline/subtitle/value props (questions and checks), `FORM_*`, `PAGE_TITLE`, `AUDIT_DISCLOSURE`, `CTA_TRIAL`, `SB_*`, the dimension cards (`DIM_*_TITLE` only; the FAIL/PASS bodies don't render), all eligibility and waitlist copy, and `M1_CTA_*`.
- **Outbound and fix-plan copy that doesn't render on the page, judged fine:** `OUTBOUND_HOOK_GENERAL` "כדי שיותר לקוחות ימצאו אותך" (a purpose, not a guarantee) and `OUTBOUND_HOOK_CATEGORIES` "מגביל את החשיפה" (true: categories drive relevance). `FIX_APPROVE_CATEGORIES` "קטגוריה אחת פשוט מחביאה אותך" is an overstatement but not a ranking promise. It is low priority, if it ever renders.

### 3. /site-bot/start, the pay page, the bot emails
- **No ranking hits** in `step2aCopy`, `step2bCopy`, `step2cCopy.generated.ts`, `postPayCopy`, `checkout/checkoutCopy.ts`, `cancelNoticeCopy`, `reviewKitCopy`, `clientMessageCopy`, `intakeOwnerCopy`, `researchCopy`, `credentialsCopy`, or `src/lib/payments/accountCopy.ts`. `lifecycleEmail.ts` and `payments/email.ts` contain no Hebrew.
- `reviewKitCopy.ts:39` "כל ביקורת חדשה עוזרת ללקוח הבא למצוא אותך ולבחור בך": soft and consistent with Google's review statement. Fine.
- `intakeCopy.ts:47` (distance and the area cap): true per 7091 ("distance" factor). Fine.

### 4. /site-bot/terms
- **Source:** `src/lib/legal/siteBotTerms.ts`.
- **No ranking warranty.** Line 480 disclaims it explicitly: `איננו מתחייבים לדירוג ב-Google, לחשיפת פרופיל העסק, לשיחות, ללידים, לפניות, להמרות או לכל מדד ביצוע.` Line 1012 excludes liability for "אובדן דירוג או תנועה".

### 5. Site Bot ads (docs/copy is the true source; no generated TS)

**H5. S1 "on the roof" ad, already rendered (20.6s).** File: `/home/eitanya/wao/docs/copy/video-dash-v2-scripts-2026-11-12.json`. The same string appears at :309/:310 (`script_30`) and :335/:336 (`script_15`), as both voice and display:
`[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל. אתה יכול לרדת מהגג.`
- **Why:** "brings you more jobs from Google" is a lead-volume promise.
- **Must say:** what Site Bot does, where she actually looks: one site with all his services, a Google profile that says the same thing, and fresh reviews. Keep the "you can climb down off the roof" callback. The fix is one re-recorded line; the earlier no-ranking candidate in `docs/copy/briefs/video-dash-v2-polish-2026-11-12.md:46` shows the shape.

**H6. Other Site Bot v2 benefit lines in the same file** (if S2/S3 get rendered):
- :398/:399 `[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל, לפני ש׳אחר כך׳ הופך ל׳אף פעם׳.`
- :481/:482 `[calm] Site Bot מביא לך עוד עבודות ועוד ביקורות בגוגל.`
- **Why:** the same "more jobs" promise.
- **Must say:** for S2, it helps his customers leave the review before "later" becomes "never". For S3, it puts all his services in one story on both site and profile.
- Line :424 (S2-15) "Site Bot מביא לך עוד ביקורות בגוגל" is about reviews only. Reviews are allowed; keep it.

**H7. S1-15 YouTube title and description.** File: `/home/eitanya/wao/docs/copy/yt-s1-15-title-2026-11-14.waocopy.json`. There is no FINAL file, so check what was actually uploaded.
- Title (:4): `עוד עבודות מגוגל, בלי לצעוק מהגג | Site Bot`
- Description, part (:5): `Site Bot שם אותך מול מי שמחפש בגוגל ומביא לך עוד ביקורות.`
- **Why:** the title promises more jobs from Google, and the description promises he will be shown to searchers.
- **Must say:** the title keeps the roof gag and Google but sells what he gets (being where she looks, a site and profile that match), not jobs. The description says Site Bot builds the site and profile she sees when she searches, plus reviews.

**H8. ST13 YouTube.** File: `/home/eitanya/wao/docs/copy/yt-st13-st14-st16-titles-FINAL-2026-11-15.json`.
- Title (:3): `באתר שלו כתוב רק ״מנעולן״. עכשיו מי שנתקע מחוץ לרכב מוצא אותו בגוגל`
- Description, part (:4): `מי שנתקע עם רכב נעול מחייג אליך.`
- **Why:** "now finds him on Google" and "dials you" promise ranking and calls.
- **Must say:** a page for every job (car lockouts, safes, cylinders) that answers what people nearby search, so the next customer knows he does car lockouts and doesn't have to guess.
- The ST13 voice script (`docs/copy/stories/story-voice-scripts-2026-11-13.json:242`, "כבר לא מנחשת. היא מתקשרת ישר אליו") is about choosing him, not finding him. Fine.

**H9. ST20.**
- YouTube description, part (`/home/eitanya/wao/docs/copy/yt-st20-title-FINAL-2026-11-15.json:4`): `ככה אתה עולה במפה.`
- Voice script (`/home/eitanya/wao/docs/copy/stories/story-voice-scripts-2026-11-13.json:346`): `[warmly] וזה עוזר לבועז לטפס במפה.`
- **Why:** both say outright that he will rise on the map.
- **Must say:** the site and profile now tell Google and customers the same story. You can still end on the neighbour's "I saw you on the map" punchline, since he already has a profile.
- The later ear-rewrite recording source (`docs/copy/voice-test-st05-st20-ear-rewrite-2026-11-14.waocopy.json:11`, Noa: "ST20 record plain") already drops the climb line. If that is what was recorded, only the YouTube description needs the fix. Confirm which take was rendered.

**Checked and judged fine in the ads:**
- The `fable52-new-ads-NOA-FIXED-2026-11-14.md` Site Bot ads 1–3.
- N1/N2 voice (`stories/n1-n4-voice-scripts-2026-11-14.json`) and their YouTube files (`yt-n1-title-FINAL`, `yt-n2-title-FINAL`).
- ST14 and ST16 voice.
- The ST14 YouTube title, and its description sentence "הלקוח הבא מתקשר אחרי שקרא מה כותבים עליך" (about choosing him).
- The ST16 YouTube title and description (the report).
- The r4 Ghost van / Jar / Level scripts (they describe the problem; the fix is "same story").
- `s1-15-end-screen`, `site-bot-story-endcard-google`, `video-end-screen-cta`.
- `voice-test-15s-before-after-opus-2026-11-14.json:23` "היום מוצאים אותך" is a test file. Fine if it never ships.
- **No new Hebrew in the 2026-11-26 preview lines.**

### 6. Not ranking issues, but found in the same files (for Adam to route)
1. **Go-live time conflict:** `step2cCopy.generated.ts:20` "תוך 2 ימי עסקים מהתשלום" against the landing `faq[2].a`, `seo.description` and `checkoutCopy.ts:42`, which say 1 business day (WAO address) or 3 (own domain). One of them is wrong.
2. **Review-reply drafts were turned OFF on 2026-11-24**, but they are still promised in the ST14 voice (story-voice-scripts:274 "כשמגיעה ביקורת, מחכה לשי תשובה מנוסחת. הוא רק מאשר."), the ST14 YouTube description, and `intakeOwnerCopy.ts:14` ("טיוטות תשובות לביקורות").
3. **Trades:** the launch plan allows ads only for trades with a content library (plumber and electrician). ST13 (locksmith), ST14 (cleaner), ST16 (AC) and ST20 (handyman) should not run from 29.11. S1, N1 (plumber) and N2 (generic) are fine.
4. **Pilot wording:** "פיילוט ראשון ל־10 עסקים" in every Site Bot YouTube description and the S1 end card should be checked against the 2026-11-25 "ads launch, no pilot" decision (the cap of 10 itself is still true).

### Handoffs
- **Tamar (waocopy):** H1–H4 as `old → new` patches on the r2 .txt, and H5–H9 as new voice, display and YouTube lines. Brief her the "Must say" lines above; the angle is hers.
- **Noa:** fresh read of the re-voiced S1 line (and S2/S3, ST20 if they are rendered), since these are voiced.
- **Eitan-Dev:** run `node scripts/build-landing-copy.mjs` and the landing tests after the .txt patch. Apply nothing to the generated TS by hand.
- **Roni:** curl `/site-bot` and confirm none of the H1–H4 strings remain.
- **Adam:** re-record S1 (one line), update the YouTube metadata for S1-15, ST13 and ST20, and decide section 6.
- **Yonatan:** the anchors stay as they are (`hero.h1`, `seo.title`). I will sign off Tamar's H2/H3 headings before they ship.
