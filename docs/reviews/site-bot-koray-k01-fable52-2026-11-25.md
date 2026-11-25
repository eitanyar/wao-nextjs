# Koray K-01 audit vs Site Bot process (Fable 5.2, 2026-11-25)

Asked by Eitan: is anything in the pasted K-01 checklist (Koray Tuğberk GÜBÜR, Chat with Sha, 2026-11-17) new and worth adding? Model confirmed: claude-fable-5-2 (modelUsage), cost $1.51. Prompt: the K-01 text verbatim plus our step 2 mission, launch review, Lior intake review and VISION.md.

**Short answer:** almost nothing in the K-list is new. Eight of the ten rules are already in our plan or code, and one idea is worth adding now, in step 2c.

## 1. Already covered
- **K1 (facts with source):** the fact schema keeps his exact words, and a fact is dropped if the quote isn't in his answer; vague answers get a probe (step 2 mission, 2b). Confidence classes are in Lior's review §3.
- **K2 (swap + "only he could say"):** the similarity thresholds exist (`reviewPreflight.ts:102-107`). "At least 3 owner facts and one only-he-could-say item per money page" is on Lior's §4 add-list for step 3.
- **K3 (server-rendered):** sites are static HTML checked by the pre-flight (`reviewPreflight.ts:19`, `src/lib/lp/renderStaticHtml.ts`). I did not measure page weight.
- **K5 (no page quotas):** the shrink rule and "no generic text fills the gap" are in Lior §3–4, and the facts-intake gate is at `VISION.md:265`.
- **K6 (real business):** the call button, hours, areas and business schema are covered in `researchedSite.test.ts:127-157`; real photos come after payment (mission, decision 2).
- **K7 (no ranking dates):** `VISION.md:263`.
- **K8 (mobile check before deploy):** step 4's review screen has a phone preview (launch review §2 item 4), and Maya checks mobile (mission, Verifier).
- **K10 (human approval):** the deploy route requires an admin token and a matching approved review packet (`deploy/route.ts:221`, `308-314`), and Eitan reads the first 10.

## 2. New and worth adding
**a. One owner fact on the first screen (K3 "centerpiece")**
- **What:** the home page's first phone screen must show one confirmed owner fact. The H1 gate today only enforces service name + city (`researchedSite.ts:231-237`).
- **Step:** 2c, with the count enforced in step 3.
- **Why:** the preview is now the sales moment. A tradesman who sees his own job or rule at the top recognises himself before he pays, and it is the cheapest swap-test proof.
- **Cost:** small.

**b. Compare code-built fields across same-trade clients (K4)**
- **What:** a same-trade comparison of the code-built fields (FAQ questions, service items), which the similarity check skips today (`reviewPreflight.ts:126-131`). First confirm whether they actually repeat.
- **Step:** 3.
- **Why:** `VISION.md:265` requires a distinct FAQ per page, and nothing measures that for these fields.
- **Cost:** small. This is lower priority, because at 10 sites Eitan's full read catches it.

## 3. Not worth it now
- **2MB fetch limit:** verified. Google's March 2026 Search blog says Googlebot stops fetching HTML at 2MB uncompressed (checked 2026-11-25). It doesn't apply to small static pages, so a page-weight budget would be busywork.
- **K1 full entity–attribute–value model:** our quote-anchored facts do the same job; re-modelling would delay 2b for nothing.
- **K4 "tables, dl, steps parseable":** any ranking benefit is UNVERIFIED vendor opinion.
- **K9 local mentions:** plausible, but it is off-site work with no owner at a cap of 10. Hand it to Amit after launch. We run none of the link schemes it quarantines.
- **K2's "≥95%" and K1's "≥90%" thresholds:** these are the vendor's numbers. Lior's point stands that thresholds get tuned on real pilot sites.
- **The audit itself:** Lior already deferred a paper audit to about 15.12 on real output. K-01 would be a third one.

## 4. One recommendation
Add to the step 2 mission under **2c**:

> **First-screen fact.** The home page's first phone screen (hero subheadline or trust bar; never the title or H1) must carry at least one confirmed owner fact, linked to its fact id. If no confirmed fact fits, the preview still shows and the gap is logged for step 3's gate. Yonatan signs off the subheadline rule, because the subheadline is also the meta description.

And under **Acceptance**:

> In the fixture run, the preview's hero block contains text traced to a confirmed fact id.

The Yonatan sign-off is there because the subheadline doubles as the meta description (`researchedSite.ts:452`).

Sources:
- [Google Search blog: Inside Googlebot (March 2026)](https://developers.google.com/search/blog/2026/03/crawler-blog-post)
- [Search Engine Land: Googlebot file limits](https://searchengineland.com/google-lists-googlebot-file-limits-for-crawling-468226)
- [DebugBear: Googlebot file size limit](https://debugbear.com/blog/googlebot-crawler-file-size-limit)