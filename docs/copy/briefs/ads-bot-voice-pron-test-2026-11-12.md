# Nimrod pronunciation test: new words for the Ads Bot explainer and ads (2026-11-12)

For Tamar (waocopy). Run this FIRST, before any other voiced brief in this sprint. Eitan listens to the
result once, and only then is any batch voiced. One voice only: Nimrod.

## Situation
We are about to voice about ten short scripts that explain how Ads Bot works to a one-man tradesman.
They use words Nimrod has not been tested on. A text-to-speech voice can misread unvowelled Hebrew,
numbers, currency and Latin words. We need one short numbered test so Eitan can hear every risky word
once, in a natural sentence, and approve or fix its spoken form.

Already approved in `data/voice/pronunciation-lexicon.json` (do not re-test): the product name
"בוט מודעות", the brand WAO, "מודעות", "מקליקים", "מהפניות", "סייט בוט".

## What to write
Numbered sentences, one risky item per sentence, each sentence 6–10 words, plain spoken Hebrew, singular
male. The sentence only has to carry the word naturally; it is never published, so it needs no selling.

Cover each of these once (the concept is given in English; you choose the everyday Hebrew word a
tradesman would use, and that word is what gets tested):
1. Google (the company name, in Hebrew letters).
2. Google Ads (as people say it aloud in Israel).
3. A click, singular, and "per click".
4. An enquiry / lead, singular and plural (the page's approved term is "פניות אמיתיות").
5. "Click mode" and "enquiry mode" (the page's approved terms are "מצב קליקים" and "מצב פניות").
6. A price ceiling on a click (the page says "תקרה של 15 ₪"): test the number with the currency.
7. The number 15 next to "enquiries", and "60 days".
8. "Two to three months".
9. A search term / a search someone typed.
10. Negative keywords, said the way a tradesman would say it (words we block).
11. Headline and description of an ad.
12. Landing page.
13. WhatsApp, and "a tap on the call button".
14. Fake clicks.
15. Daily budget and monthly budget.
16. Quality Score and Ad Rank: give the Hebrew term AND test the English term spoken inside a Hebrew sentence.
17. VAT, in the closing pattern "WAO. בוט מודעות: 249 ₪ + מע״מ לחודש." (test the full closing line once, with `[excited]` directly before the brand word).
18. A word for the tradesman marking an enquiry as real, and as junk.

Where a word has two possible readings without vowels, give two versions of that sentence: one plain,
one with niqqud on that word only.

## Limits
- No claims about the product in these sentences. They are test carriers only.
- No names of people.

## Output
One JSON object, no markdown:

    {
      "angle": "n/a: pronunciation test",
      "items": [
        { "n": 1, "target": "<English: what is being tested>", "voice": "<Hebrew sentence as sent to the voice, with any niqqud or tag>", "display": "<same sentence, plain, no niqqud, no tags>", "risk": "<English: how the voice might misread it>" }
      ]
    }

→ Noa checks spelling and that each chosen term is the natural one. Then one render on Nimrod, and
Eitan marks each number OK or gives the correct spoken form. Fixes go into the pronunciation lexicon.
