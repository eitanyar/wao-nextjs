# Noa: /site-bot rewrite, correctness and full proofread (2026-11-11)

Files reviewed:
- After: /tmp/claude-1000/-home-eitanya-wao/1553f1ef-8011-4106-a89a-7298f7a4acec/scratchpad/rw/site-bot.final.page.tsx
- Patches: /home/eitanya/wao/docs/copy/site-bot-page-rewrite-2026-11-11.ordered-patches.json
- Also checked: /home/eitanya/wao/docs/legal/site-bot-terms-of-use.md §7–§8, /home/eitanya/wao/src/app/(app)/site-bot/start/page.tsx, /home/eitanya/wao/src/app/(app)/google-business/page.tsx

No source files were edited.

## Verdict

**BLOCK if it deploys on its own today. SHIP WITH FIXES if it goes out together with the paid chat flow.**

The h1, the meta description and FAQ 3 all say the bot builds the site with him in a chat. In production that chat doesn't exist yet. `/site-bot/start` renders only when `SITE_BOT_PAID_FLOW=1` on a non-production server, and otherwise 404s or 307s back to /site-bot. Every button on the page goes to the contact form ("תשאיר פרטים… איתן יחזור אליך"). "אפשר לבטל אונליין" also assumes self-service billing is live. So the page's main promise doesn't match what the buttons deliver (R4). Adam decides whether this ships with the flow launch.

The rest is fixable with the byte-exact strings below.

Things that are now clean:
- No "לתמיד", no "החבילה המלאה", no WhatsApp.
- No semicolons in the copy.
- Gershayim and geresh are the real Hebrew characters (U+05F4 and U+05F3) everywhere. No ASCII quotes.
- No double spaces inside strings, and every em-dash has single spaces.
- Every FAQ question is in first person.
- The hero sub-line and the final CTA are no longer identical.
- Eitan is introduced with his role.

## Per-patch issues

Patch references are `stage#idx` from the ordered file. Each `new` replaces that patch's `new` value.

### anchors#0 and anchors#1 (title + OG title): [RED] meaning. Needs Yonatan's sign-off.

"בניית אתר לעסק קטן — עולה החל מיום עסקים". In Hebrew, "עולה החל מ…" is the standard way to say a price ("costs from…"). On the SERP of a paid offer, the reader first reads "costs from" and then hits "יום עסקים". It's also unnatural, because it's missing "אחד", and "החל מ" puts the fast case as a minimum.

Length: 61 code points including the RLM, 60 visible. That's right at the limit. The OG title is identical, with the RLM in place.

The speed claim is technically true, but the wording isn't natural. The truthful, footnote-free version uses the three-day ceiling, which is true for every customer:
- anchors#0 new: `    absolute: "בניית אתר לעסק קטן תוך 3 ימי עסקים, עדכון בהודעה‏ | WAO",`
- anchors#1 new: `    title: "בניית אתר לעסק קטן תוך 3 ימי עסקים, עדכון בהודעה‏ | WAO",`

Notes on the new title:
- 54 visible characters plus the RLM (U+200F, already present before " | WAO"; copy it from the existing string).
- The head term is first, and the title ends in Hebrew.
- It must say "ימי עסקים" and not "ימים": three calendar days would be false over a weekend.
- If Yonatan wants to keep "one day", the only version that fits is "בניית אתר לעסק קטן — באוויר מיום עסקים, עדכון בהודעה" (58 visible). It's weaker. If the open fact below confirms that every customer is live on a WAO address on day 1, "באוויר תוך יום עסקים" becomes true for everyone.

### anchors#2 and anchors#3 (meta + OG description): pass, with [YELLOW] notes to Yonatan

- 152 characters, within 140–155.
- The head term appears once, Eitan isn't named, and "לעסק שלך" isn't doubled.
- The facts are correct.
- [YELLOW] "הבוט" has the definite article but is undefined for a stranger in Google.
- [YELLOW] "בדומיין שלך" doesn't match the body's "בדומיין על שמך" (rule 33). Optional.

### anchors#4 (badge): pass

Matches the spec.

### anchors#5 (h1): agreement OK, 75 characters

- The "starts with a call" wording is gone. "מתחילה" agrees with "בנייה".
- [YELLOW, Yonatan] "הבוט בונה איתך" has no object, and "האתר" only arrives after "מעדכן". A Sabra would say "הבוט בונה איתך את האתר ואתה מעדכן אותו בהודעה".
- The h1 is true only once the chat is live (see the verdict).

### body#2 and body#3 (steps 1–2): [RED] fact 9

The h1 says the bot builds in a chat. Step 1 now says "אתה מדבר עם איתן", which brings back exactly what Eitan removed from the h1. Step 2 says "we build" and assumes the customer's own domain, which contradicts the WAO-address option.
- body#2 new: `אתה מספר לבוט על העסק בצ׳אט, בלי לפתוח עורך אתרים.`
- body#3 new: `הבוט בונה איתך את האתר ומעלה אותו לאוויר.`

[YELLOW, Tamar] The kept h2 "אנחנו מעלים את האתר" now mixes "we" with "the bot" in one block (rule 14). Consider "אתה מספר על העסק. הבוט מעלה את האתר."

### body#20 (FAQ 3 answer): [ORANGE] fact 9 consistency

- new: `לא. אתה מספר לבוט על העסק במילים שלך, והוא בונה איתך את האתר. אחר כך כל עדכון הוא הודעה.`

### body#7 (price block): [ORANGE] unsettled term, legal register, word-for-word duplicate of FAQ 1

- "בלי הודעה מוקדמת" is a /google-ads fact (item 2). It's not in the /site-bot facts or in terms §7–§8.
- "בכל עת" and "ששולם" are formal or passive (rule 36).
- The paragraph is a copy of FAQ 1 (rule 31).
- new: `אתה משלם 199 ₪ + מע״מ לחודש ויכול לבטל אונליין מתי שתרצה.`

### body#16 (FAQ 1 answer): [ORANGE] same unsettled term and register

FAQ 1 keeps the full terms.
- new: `199 ₪ + מע״מ לחודש, בלי התחייבות. אתה יכול לבטל אונליין מתי שתרצה, והביטול נכנס לתוקף בסוף החודש ששילמת עליו.`

### body#8 (line under the price-block button): [ORANGE] plus filler

- "האתר עולה" sits directly under the price paragraph, so it reads as "the site costs…". This is the same homograph as the title.
- "בלי התחייבות." repeats the paragraph above it (R1).
- new: `עם כתובת של WAO, האתר באוויר תוך יום עסקים אחד.`

### body#22 (FAQ 4 answer): [ORANGE] stilted wording, dangling phrase, two terms for one thing

- "בהודעה אחת, התוכן באתר משתנה" is a fronted phrase with a comma, and it hides who does the update.
- "בלי לגעת בקוד" hangs off the subscription clause instead of the editing clause.
- "העריכה" and "עדכונים" are two terms for one concept.
- new: `אתה שולח הודעה עם השינוי, והבוט מעדכן את האתר. העדכונים כלולים במחיר כל עוד המינוי פעיל.`
- Eitan should confirm that the bot performs the update (fact 9 implies it does).

### body#23 (FAQ 5 question): [ORANGE] syntax

"למה לי לא לבנות" isn't idiomatic. "למה לי + infinitive" works only in the positive, as in FAQ 6.
- new: `למה שלא אבנה לבד ב-Wix או ב-WordPress?`

### body#24 (FAQ 5 answer): [AI] to Tamar, not fixed

- It opens by restating the question instead of answering (rule 16).
- "הדומיין רשום על שמך" isn't a real contrast with Wix.
- It makes the same argument as FAQ 6 (rule 31).
- Suggestion: FAQ 5 carries ownership and FAQ 6 carries time. FAQ 5 should open with "אתה יכול, אבל…" and give one reason that's different from FAQ 6's.

### body#26 (FAQ 6 answer): [AI] filler cut plus one verb

- "בלי לפתוח עורך" restates "יחזיר אותך לעורך", so "עורך" appears twice (R1/R2).
- "מעביר הודעה" should be "שולח הודעה", which is used everywhere else (rule 33).
- new: `הזמן שלך שווה כסף. אתה יכול לבנות לבד, אבל כל עדכון יחזיר אותך לעורך. כאן אתה שולח הודעה.`

### body#29 (final CTA body): [ORANGE] unsettled promise

- "ובלי לחכות" promises that updates are instant. Update speed isn't a settled fact (rule 34).
- new: `                {renderMixed("אחרי הודעה אחת, השינוי כבר באוויר. בלי עורך אתרים.")}`
- [AI, Tamar] Even after this fix, the line restates the heading "אתר שמתעדכן בהודעה" directly above it (R1). Suggestion, which also carries fact 9: "ואם משהו לא ברור, איתן זמין לך בהודעה." Tamar decides.

### body#0 (hero body): [AI] cut the third sentence

- "האתר כולל חמישה עמודים בדומיין על שמך." comes right after a scene and reads as a spec dump. It's repeated in the package box and the comparison box, and it states the own domain as a given, which contradicts the WAO-address option.
- new: `אתה באמצע יום עבודה וצריך לעדכן מחיר? אתה שולח הודעה, והמחיר החדש כבר באתר.`
- "כבר" claims instant updates (see the open facts).

### body#9 (package box): [ORANGE] term consistency

- "עריכה בהודעה" should be "עדכונים בהודעה", the page's term.
- new: `החבילה כוללת אתר בן חמישה עמודים בדומיין על שמך ועדכונים בהודעה. יש גם חיבור לפרופיל העסקי הקיים שלך בגוגל, לכלי של גוגל שמראה איך אנשים מוצאים אותך ולטופס שמעביר אליך פניות.`
- [YELLOW, Tamar] Sentence 2 is 27 words long, says "גוגל" twice and opens with "יש גם". Suggested split: "האתר מחובר לפרופיל העסקי הקיים שלך בגוגל, ולכלי שמראה לך איך אנשים מוצאים אותך שם. יש בו גם טופס שמעביר אליך פניות."
- GBP is "existing, connected", which matches fact 11.

### body#27 (cross-link): [ORANGE] the label doesn't match the destination (R4)

- The label promises an explanation of how his profile connects to the site.
- The link goes to /google-business, which is a separate product (GMB Bot, ₪149 a month, posts and review replies).
- new: `יש גם בוט שמנהל לך את הפרופיל העסקי בגוגל, עם פוסטים ותגובות לביקורות.`
- Adam may prefer to drop the link.

### body#13 (comparison payoff box): [AI] to Tamar

- It's the third time "אתר בן חמישה עמודים בדומיין על שמך" appears (R2, rule 31).
- It doesn't answer the h2's choice.
- Suggestion: "עם Site Bot אתה לא בונה ולא מחכה. אתה שולח הודעה, והבוט מעדכן את האתר."

### body#14 (FAQ h2 "מה חשוב לך לדעת"): [YELLOW] to Tamar

It reads like a question that's missing its "?". Consider "לפני שאתה מתחיל". The eyebrow/h2 duplicate is fixed.

### Patches that pass as is

- body#1 (hero sub-line): passes for the current contact-form funnel. It becomes false once the chat flow is the primary button.
- body#4 (step 3): passes.
- body#10 (comparison h2): passes, serial comma fixed. [YELLOW] The h2's order still differs from the cards.
- body#11 and body#12 (cards 1 and 3): pass. [YELLOW] Cards 2 and 3 share the same "אתה בונה…, ואז…" frame.
- body#15, body#17, body#19, body#21, body#25 (FAQ questions): pass.
- body#28 (CTA heading): passes.
- body#5 and body#6: emptied. See the next section.

## Empty wrappers for the engineer

In the after-file, lines 220–241: the whole `{/* ── Objection: Module-5 graduate ── */}` `<section>`. It now renders an empty `<h2>{renderMixed("")}</h2>` and an empty `<p>{renderMixed("")}</p>`, plus `wao-section` padding, which leaves a visible blank gap. Remove the entire section. There are no other empty wrappers. The course-graduate point now lives only in FAQ 6, which is correct.

## Repetition count (after the fixes above)

- "הודעה" is still about 10 times. It's the core message, so it's acceptable.
- "בדומיין על שמך" drops from 6 times to 4.
- "בלי התחייבות" drops from 5 times to 3 (badge, FAQ 1, meta).

## Open facts (Eitan/Adam)

1. **Launch coupling.** Does this copy ship only together with the live chat flow and online cancellation? When the chat goes live:
   - Does the primary button move to /site-bot/start?
   - The hero sub-line "תשאיר פרטים… יחזור אליך" then becomes wrong and needs a fact-9 version ("Eitan one message away").
2. **Update speed and who does it.** The page says "כבר באתר" and "כבר באוויר". Is the bot's update instant, or does a person review it?
3. **Own domain.**
   - Is it included in the ₪199 (and who pays the registration), or is it an optional extra? The package box says it's included, while FAQ 2 and the meta present the WAO address as an alternative.
   - Does a customer with his own domain also go live on the WAO address on day 1?
4. **When the clock starts.** Do the 1 and 3 business days count from sign-up, from the end of the chat, or from DNS?
5. **"בלי הודעה מוקדמת".** I removed it. Add it back only if Eitan confirms it for Site Bot. The 14-day proportional refund (§7) could be mentioned, but that's optional.
6. **No profile.** Customers who have no Google Business Profile: who serves them? Fact 11 assumes an existing one.

## Human-sounding

- About 74% now.
- About 85% after the required fixes.
- About 90% once Tamar takes the FAQ 5/6 split, the comparison box and the CTA body.

## Handoffs

- **Yonatan:** title wording ("עולה החל מ" reads as a price; proposed "תוך 3 ימי עסקים"), the h1 object placement, and "הבוט" being undefined in the meta.
- **Tamar:** body#24, body#13, the body#29 follow-up, the body#9 split, body#14, and the steps h2's "we vs bot".
- **Eitan-Dev:** apply the replacement `new` values in the ordered file, delete the empty section at lines 220–241, and keep the FAQPage schema in sync (it maps FAQS automatically).
- **Adam/Eitan:** open facts 1–6. Fact 1 gates the deploy.

## Writing upgrades (proposed, abstract)

1. On a page that shows a price, never use a word that is also the everyday price verb with another meaning, in body text or in the title.
2. Commercial terms are per offer. Never carry a term settled for one product onto another product's page.
3. Speed and immediacy words ("already", "instantly", "without waiting") appear only when the settled facts state the speed.
4. The actor who does the work (the bot, "we", or a named person) stays the same across the h1, the steps and the FAQ.
5. A trailing phrase attaches to the clause it describes. Never hang a benefit off a terms or condition clause.
6. A link label describes what the destination page delivers, not a feature of the current page.
7. FAQ answers to related questions make different arguments. If two answers share a reason, merge the questions or give one of them a different reason.

---
## Eitan's decisions (2026-11-11)
- **Don't hold the copy.** Ship both page rewrites now; the pages get almost no traffic.
- **Open fact 2 (update speed):** updates go live **right away**, so "כבר באתר" and "כבר באוויר" are true. Body#0 and body#29 stand, with Noa's fix.
- **Open fact 3 (own domain):** still undecided commercially. The settled policy stays: the client buys and pays for his own domain, WAO connects it, and month 1 runs on a WAO address. Copy must not imply WAO pays for the domain.
- **Open fact 4 (clock):** the 1 and 3 business days count from sign-up, meaning payment.
- **Open fact 6 (no GBP):** Site-Bot targets only owners who already have a Google Business Profile (Phase 1 segment: GBP rated 4.0+ with 10+ reviews). Owners with no profile are out of scope. The Ads Bot doesn't depend on a GBP.
