# Review: A2-15 end screen

**Files read:** `/home/eitanya/wao/docs/copy/a2-15-end-screen-and-demo-leads-2026-11-14.waocopy.json`, `/home/eitanya/wao/docs/copy/briefs/a2-15-end-screen-and-demo-leads-2026-11-14.md`, `/home/eitanya/wao/src/lib/google-ads/landingCopy.generated.ts`, `/home/eitanya/wao/docs/missions/claims-ledger-2026-11-12.md`, `/home/eitanya/wao/src/app/(app)/google-ads/onboarding/page.tsx`, `/home/eitanya/wao/src/components/crm/LeadsTable.tsx`. Nothing edited.

**Hero test (end card):** He gets a Google Ads campaign for ₪249 + VAT a month with no commitment, and he believes it because he can try a free demo before he pays. **PASS** once the stamp is fixed. As written, the stamp promises something the demo does not do (see below).

**Overall verdict: FIX.** Two fields need changes: `stamp` (a claim problem) and `demo_leads.source` (labels don't match the UI). The message previews in `flags[0]` are **blocked**. The rest pass.

---

## 1. stamp: FIX (⚖️ route to Adam)

`"תראה את המודעה שלך לפני שאתה משלם שקל"`

The grammar, register and length are fine: 8 words, Sabra, reads in one pass. The problem is the claim, specifically **«המודעה שלך»**.

- In the landing copy (`proof.items[0].desc`), the demo runs the bot "על עסק אינסטלציה לדוגמה" and shows "מודעה לדוגמה". So it's a sample ad, not his.
- Ledger A31 (PROVEN) says the same: "Free demo on a sample plumbing business".
- The code agrees. `onboarding/page.tsx:48-78` loads a fixed `DEMO_PROFILE` ("אינסטלטור תל אביב מהיר", owner "דני"). In demo mode the inputs are disabled (`disabled={!queryReady || isDemo}`, lines 694, 750, 760, 785, 811). The banner says "הכנסתי לך עסק לדוגמה" (line 421).
- So Eitan's 2026-11-14 description ("he fills a questionnaire and sees his ad") does **not** match the live demo or the live page. This is a contradiction for Adam to resolve: either the demo changes, or the stamp does. The stamp can't say "your ad" today.

**Strongest true version (recommended, it sells):**
`"תראה את המודעה שלך לפני שאתה משלם שקל"` → `"תראה את הבוט עובד לפני שאתה משלם שקל"`
This keeps "before you pay a shekel", which is what answers his fear. It matches the page heading "דמו חינם, לפני שאתה משלם", it's 7 words, and it's true today.

**Fallback (safer, weaker):** `"המודעות עולות רק אחרי שראית את התוכנית"`. This is near-verbatim from `start.steps[2]`. It's true for paying clients, but it reads like a process and loses the shekel hook.

**If Adam/Eitan get the demo changed** so it takes his own details: the original stamp is the strongest line and should come back. It would also need a ledger entry.

## 2. cta: PASS

`"לראות דמו חינם"` is identical to `hero.cta_secondary` and `close.cta_secondary` in `landingCopy.generated.ts` (one literal pattern matched both files, 2 hits in the TS). It does not name the founder.

## 3. price_line: PASS (one 🟡 optional)

`"249 ₪ + מע״מ לחודש · בלי התחייבות"`
- **מע״מ:** real gershayim (U+05F4), confirmed by codepoint grep.
- **₪ placement:** "249 ₪", with the number first and a space, the same as the landing page.
- **· separator:** single spaces on both sides. Clean.
- **Claim:** «בלי התחייבות» matches the start of `hero.cta_note` («בלי התחייבות, עם הסכם כתוב»). Ledger A27 ("No commitment; leave any month; written agreement") is PROVEN (terms). The line implies nothing about cancelling online, so A27's "no online cancel" note doesn't matter here. The price matches the subhead and Ads Bot offer facts.
- 🟡 **To Tamar, optional:** the hero subhead says «בחודש». «לחודש» is also on the page (SEO title, FAQ). Both are correct, so it's fine as is. Use «בחודש» only if you want a byte-exact match with the hero.
- **Render note → Maya:** the line starts with digits, and the source text is correct. The video text renderer must use RTL base direction with real bidi shaping. For example, ffmpeg `drawtext` without libfribidi prints Hebrew reversed. Check one rendered frame.

## 4. url_line: PASS

`"wao.co.il/google-ads"` is all Latin with only `.` `/` `-` between letters, so it can't reorder even inside an RTL box. Keep it on its own line, with no Hebrew in the same text run and no trailing punctuation. Dropping `https://www.` is correct.

## 5. banner: PASS

`"הקהל גדל, הקופה ריקה"` vs. spoken `«הקהל גדל, הקופה ריקה.»`: all four words, same order, nothing added. It's the full line, which counts as a strict subset. The comma stays and only the final period goes, which is normal for a banner. A muted viewer reads it once at a glance, and the contrast lands without sound.

## 6. demo_leads: names PASS, sources FIX

**Names: PASS.** נועם ב., מיכל ש., עומר ד., רונית ק. are common first names with a surname initial and a period. They read as ordinary people, not public figures, and contain no phone numbers. Exactly one is `real: true`, the leak, as the brief asks.

**Sources: FIX (🟠 consistency with the live UI).** The real leads screen (`LeadsTable.tsx:47-51`) uses only three keys and labels:
- `form` → «טופס»
- `phone-click` → «לחיצה על טלפון»
- `whatsapp-click` → «לחיצה על וואטסאפ»

The source column shows **only an icon** (📋/📞/💬). The label appears only as a hover tooltip (line 179). So the `source` values should be the type keys, not free text:

- `"source": "טופס באתר"` (×2: נועם, רונית) → `"type": "form"` (label «טופס»)
- `"source": "שיחה מהמודעה"` (מיכל) → `"type": "phone-click"` (label «לחיצה על טלפון»). «שיחה מהמודעה» is also inaccurate: per the landing copy, clicks are tracked from the landing page, not from the ad itself.
- `"source": "וואטסאפ"` (עומר) → `"type": "whatsapp-click"` (label «לחיצה על וואטסאפ»)

**→ Eitan-Dev:** in the live table, click leads are *stubs*. Until the owner adds a name, the name cell shows the italic source label (lines 200-201), so «מיכל ש.» and «עומר ד.» would show as «לחיצה על טלפון» and «לחיצה על וואטסאפ». For the names to show, those two rows must be enriched (non-stub) records. The "real" mark renders as «🔥 אמיתית» / «❌ לא אמיתית» (line 260), which fits the gag.

## 7. Message previews (flags[0]): BLOCKED (⚖️ route to Adam), language notes below

**Claim problem:** `LeadsTable.tsx` has no message column. The columns are source icon, date, name, phone, real-or-not and deal (lines 140-144). Phone and WhatsApp clicks capture no text at all. The brief calls this "the real Ads Bot leads screen", so adding message previews to it would show a feature that doesn't exist. Two options:
- (a) Drop the previews.
- (b) Show them as illustrated speech bubbles **outside** the table, so they read as the customer talking, not as UI. Even then, מיכל, a phone click, would be a call and not typed text.

Adam decides.

**If (b) is chosen, language pass:**
- `«יש נזילה מהתקרה, אפשר להגיע היום?»` PASS.
- `«איך מחליפים ברז לבד?»` PASS.
- `«מחפשים עובדים?»` PASS.
- `«כמה עולה פתיחת סתימה? רק משווה מחירים»` 🤖 / 🟡 → Tamar. The second sentence has the customer narrating the joke about himself, and no real customer writes that. Suggested: `«כמה עולה פתיחת סתימה? רק משווה מחירים»` → `«כמה עולה פתיחת סתימה? כבר יש לי שתי הצעות»`. This shows the price-shopper in his own voice. Tamar decides the wording.
- Typography: the «» quotes and · separators are clean, with no ASCII quotes and no double spaces.

## Read-once test (muted)

| Field | Result |
|---|---|
| stamp | PASS after the fix (7 words) |
| cta | PASS |
| price_line | PASS (one line, two facts) |
| url_line | PASS |
| banner | PASS (4 words, held 6-8 s) |

🟡 The card stacks stamp, button, price and URL. That's fine if it stays on screen for at least 3 s. If it's shorter, the price line is the one to drop (Eitan's call, already flagged in `why`).

## Aside → Adam (out of scope, one line)

`DEMO_PROFILE` in `onboarding/page.tsx:74-75` hard-codes `052-614-8860` as the sample plumber's phone. If that's a real person's number, it shows in a public demo. Worth a check.

---

## Handoffs

- **Adam:** stamp claim («המודעה שלך» vs. the sample-business demo) and the message-preview decision.
- **Tamar:** the רונית preview wording, and «לחודש»/«בחודש» if wanted.
- **Eitan-Dev:** source type keys and enriched (non-stub) rows for the click leads.
- **Maya:** check RTL/bidi on a rendered end-card frame.

## Writing upgrades (for waocopy)

1. **Never upgrade a sample into the reader's own.** Use "your X" only when the product actually runs on his inputs. If the page says "sample" or "example", the copy must not say "yours".
   *Could this worsen a great page?* No. It only blocks a false possessive, and "see it working before you pay" sells just as hard.
2. **Copy that depicts a real product screen may only show columns, labels and data that screen actually has.** Free invention belongs in the illustrated story around the screen, never inside it.
   *Could this worsen a great page?* No. It limits only what's drawn as UI, not the story.
3. **Invented in-world speech (a customer's message, a caller's line) must sound like that person, never explain the joke.** If a line exists only to tell the viewer what the character is, cut it or show it through what he asks.
   *Could this worsen a great page?* No. Gags land harder when the character doesn't narrate himself.
