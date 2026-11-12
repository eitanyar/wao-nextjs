# Knowledge article: Quality Score and Ad Rank, explained for a tradesman (2026-11-12)

For Tamar (waocopy). The first article of a new paid-search cluster in the knowledge base (today the
base has no Google Ads articles). Yonatan owns the cluster, the title formula and the internal links;
Dror owns the facts. The angle, the analogies and the structure are yours. Draft only: it ships after
their sign-off, and the engineer places it.

## Persona
An Israeli owner of a small hands-on business who pays for Google ads himself, or is about to. He
heard that "whoever pays more is on top" and that there is some "score". He wants to understand, in
ten minutes, why two plumbers pay different prices for the same click, and what he can actually do
about it. He is not a marketer and does not want to become one.

## Situation
He searched for an explanation and landed here. The article must answer the question honestly and
completely before it mentions any product, and must be quotable: short definitions near the top that
an AI answer or a featured snippet can lift as they are. Analogy first, from his world.

## Facts (Google Ads Help, all read 2026-11-12; attribute to Google; do not add figures that are not here)
- Quality Score is a diagnostic tool that shows how the quality of his ads compares with other
  advertisers. It is a number from 1 to 10, given per keyword. [support.google.com/google-ads/answer/6167118]
- It has three parts: expected clickthrough rate, ad relevance, landing page experience. Each part is
  rated above average, average or below average, compared with other advertisers whose ads showed for
  the same search over the last 90 days. [same]
- Google states that Quality Score is not an input in the ad auction. It is a report card, not the
  exam. [same]
- What decides the auction is Ad Rank. Google lists six things: the bid; the quality of the ads and the
  landing page; the Ad Rank thresholds; the competitiveness of the auction; the context of the
  person's search; the expected impact of the ad's assets and other ad formats. [support.google.com/google-ads/answer/1722122]
- Google says higher quality ads can often lead to lower costs per click. [same]
- A responsive search ad holds up to 15 headlines (30 characters each) and 4 descriptions (90
  characters each); Google assembles combinations and tests the most promising over time. [support.google.com/google-ads/answer/7684791]
- "Ad Strength" is a separate label: feedback on how varied the ad's texts are and how they relate to
  the keywords. Google says it is not used to calculate Ad Rank, Quality Score or auction wins. [support.google.com/google-ads/answer/9921843]
- Negative keywords do not match look-alike words or other expansions; an ad is blocked only when the
  search contains the blocked terms. [support.google.com/google-ads/answer/2453972]

## What he can do about each part (practical, no product needed)
- Expected click rate: one service per group of keywords; a headline that repeats the words he typed;
  block the searches that are not his customers.
- Ad relevance: the ad talks about the exact service searched, not about the business in general.
- Landing page experience: the page opens on that same service, loads fast on a phone, and makes it
  easy to call or leave details.
- The extra lines under the ad (call button, proof points, links) are part of what Google weighs.

## Where WAO may appear
One short passage near the end, not before: Ads Bot does these things by construction. True and
usable: one main service per campaign with 3–5 phrases; 10–15 blocked words from day one; an ad of up
to 15 headlines and 4 descriptions built from the owner's real selling points; a landing page whose
headline area must contain the exact service name; extra lines under the ad where his details allow.
[`src/lib/bot/prompts.ts:400-403, 433-443`; `src/app/api/google-ads/create-campaign/route.ts:246-396, 686-706`; `src/lib/lp/lpCopyPrompt.ts:191-192`]
One link to `/google-ads`. No price in the article.

## Must not be stated or implied (omit the subject; never announce the limit)
- Any formula with numbers for Ad Rank or Quality Score, any weighting of the three parts, any
  "a score of X cuts the price by Y%".
- That Quality Score is used in the auction, or that Ad Strength affects rank.
- That any tool or agency, including ours, can set or guarantee a score, a rank or a click price.
- Advice that depends on Google screens that change (menu paths, button names).
- That Google endorses WAO.

## SEO and structure (Yonatan decides; give options)
- Three title options and three H1 options. Candidate head terms, in the form Israelis search them:
  the Hebrew for "quality score" in Google Ads, and "Ad Rank". Say which each option targets.
- Title rule: a Hebrew title must not end in a Latin word (the site adds "| WAO" after it). If a Latin
  term is needed, place it mid-title.
- A two-sentence definition of each term directly under its heading.
- 5–6 FAQ pairs at the end, phrased as people ask them.
- Suggest (in English) three follow-up articles for the cluster and which existing topics to link to.

## Voice
Knowledge-base register: clear, warm, expert, analogy-first; not salesy. Singular male. Latin terms
(Quality Score, Ad Rank, Ad Strength, CTR) appear once next to their Hebrew explanation, then the
Hebrew is used. Not voiced.

## Output
One JSON object, no markdown:

    {
      "angle": "<two English sentences>",
      "title_options": ["...", "...", "..."],
      "h1_options": ["...", "...", "..."],
      "meta_description_options": ["...", "..."],
      "lede": "<Hebrew, 2–3 sentences that answer the question outright>",
      "sections": [ { "h2": "<Hebrew>", "definition": "<Hebrew, 2 sentences, or null>", "body": "<Hebrew paragraphs>" } ],
      "faq": [ { "q": "<Hebrew>", "a": "<Hebrew, 2–3 sentences>" } ],
      "wao_passage": "<Hebrew>",
      "cluster_followups": ["<English>", "<English>", "<English>"],
      "flags": ["<English: anything you wanted to say that the facts above do not cover>"]
    }

→ Noa proofs. Dror re-reads each Google statement against its page on the day of publishing. Yonatan
signs the title, H1 and links. The engineer adds it to `knowledge.ts` by script, never by hand.
