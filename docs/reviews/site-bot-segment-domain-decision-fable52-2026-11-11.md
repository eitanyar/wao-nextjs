> **Update 2026-11-11 (Eitan):** decision 2 changed after the registrar research — the client buys his own domain and WAO connects it; WAO does not register or pay for domains. Everything else stands.

# Site-Bot go-to-market decision (2026-11-11)

## Decisions

**1. Segment: do not target "has a website" only.**
- **First:** owners in the five locked cells with a Google profile rated 4.0+ and 10+ reviews (your 11-10 tier rule) and either no site or a dead site.
- **Next:** weak-site owners with nothing to lose, such as one-page sites, free Wix subdomains or zero-impression sites.
- **Not yet:** anyone whose current site earns real rankings. They go on a waitlist until our pages are at least as deep as theirs and the redirect and email-safety work exists.
- **Triggers to revisit:** the count in item 4 shows weak-site owners are 50% or more of qualified prospects; 20+ real sales conversations show no-site owners refusing far more often; or month-1 cancellations exceed about 40%.

**2. Domain: option (b), with a fast lane.**
- **Month 1:** the site runs on `{slug}.wao.co.il`, hidden from Google's index. It still works as the live site and as the profile's website link.
- **After the 2nd payment clears:** WAO registers the .co.il in the client's name and pays for it while he stays subscribed. The site moves there and becomes indexed, with a redirect and an updated profile link.
- **Fast lane:** a client who already owns a domain, or buys one himself, gets it connected within 3 business days once the bind exists.

**3. Pull forward the custom-domain bind only; defer the redirect map.**
1. Launch blockers: billing gating, required contact at sign-up, live terms, Takbull.
2. Core-30 day-one-harm fixes.
3. Promise re-copy.
4. Custom-domain bind, with a hard deadline of 30 days after the first paid client.
5. Content depth.
6. Only then the redirect map, email preservation and the existing-site tier.

**4. Evidence first: count site status in the scan data we already have.**
- Per cell, count no-site, dead, weak and OK among prospects meeting the 4.0 / 10-review bar. It is free and needs no network.
- Run it alongside the blockers; it does not hold anything up.
- Records pulled from Local Finder show "unknown", not "no site", so count those separately.

## Why

**Your premise doesn't match our own scan.** I checked the Nov 7 summary: weak prospects are "usually no website", Holon's top-3 electricians have "no proper website", and Jerusalem has dozens of locksmiths with 10–75 reviews and no site. This is qualitative, which is why item 4 exists. All three specialists independently rejected "existing sites only", and VISION still names the no-website owner as the Phase-1 segment.

**Lior's downgrade argument decides the segment.** Today's generated pages are measured at 45–61 words and near-duplicates of each other. For a no-site owner, anything beats nothing. For an owner with a ranking site, we would swap his pages for thinner ones and call it an upgrade, which ends in a refund. An aged domain doesn't rescue this: Google says domain age does nothing, and small trade sites carry few links.

**I rejected Yonatan's client-paid domain at launch as the default.** His logic is sound, but:
- It needs the bind built before client #1, which delays launch.
- It puts a registrar chore in front of a tradesman at checkout, when our scarcest thing is a first paying client.
- His "own domain is a precondition for ranking" point is true but not urgent. Google profile results bring the calls in months 1–6, and website rankings pay from month 6–12.
- He concedes himself that a hidden month-1 subdomain costs only about 30 days. Hiding it also removes the "all clients clustered on wao.co.il" risk.

His idea survives as the fast lane.

**The ₪89 is not a reason to change segment.** Paying it only after payment 2 removes the month-1 loss, costs about 4% of a year's revenue, and gives the client a reason to stay ("your own .co.il, on us, in month 2").

**On Amit's "dead site first":** it is the best pitch, but I merged it with no-site as one tier. If a dead-site owner uses email on his old domain, we must not touch that domain until email preservation exists.

**Lior's "contradicts the promise" is only partly right.** The approved promise already starts on the subdomain and counts 3 days from "receiving working domain access". It needs one added line, not a rewrite.

## Risks
- **Month 1 shows no website traffic by design.** The digest must lead with Google-profile numbers, or no-site owners will cancel.
- **The bind slips past day 30.** That would break a promise to a paying client, so treat the deadline as hard.
- **The chosen domain name gets taken before month 2.** Check availability at sign-up; the remaining risk is small.

## You must approve
1. Phase-1 stays no-site / dead-site first, with VISION unchanged.
2. WAO pays for the domain after payment 2, in the client's name, with renewal covered while he is subscribed.
3. One added line on the buy-screen promise, written by waocopy and checked by Noa.
4. Later, not now: cold email to weak-site owners.

---
_Model: claude-fable-5-2 (confirmed via modelUsage). Inputs: Yonatan, Amit, Lior arguments below._

# Yonatan (SEO) — Site-Bot segment: existing-site prospects first? (2026-11-11)

**Bottom line: no, not "only" and not "first".** Lead with no-site and nothing-to-lose owners in the five pilot cells already locked. Take a weak-site owner only when his current site has no rankings worth protecting, until M4 (custom domain connect + 301 map) ships. Fix the margin worry by having the client pay for the domain, not by changing segment.

**(1) Aged domain vs new: small upside. Confidence medium-high.**
- Google: domain age itself does nothing (Mueller 2019, "No, domain age helps nothing", SERoundtable). No newer reversal found.
- What an old domain can carry is links, citations and indexed URLs. Most one-person trade sites have almost none.
- Our data (Set A, 2026-11-07): fastest climbers jacksonplumber (first seen 10/2024) and migo-ahzakot (02/2024) both reached top 3 in >12 cells within ~2 years. elecfive (09/2024) ranks with 23 URLs. Ranking is driven by site size, depth and links, not age.
- Would change my mind: backlink data showing a prospect's domain has real referring domains — that one domain is worth keeping; doesn't make the segment better as a whole.

**(2) Migration risk if we replace a ranking site** (Google site-move docs, fetched 2026-11-11):
- Full list of old URLs (crawl + GSC pages report + sitemap + Wayback + backlinked URLs).
- 1:1 permanent redirect per URL (301/308), no chains, ≥1 year. Never all-to-homepage (soft 404).
- Same content on every page with impressions: keep title + H1 head term, subject, similar or greater depth. 404/410 for dropped pages.
- Same NAP, same GBP website link, new sitemap, monitor ~8 weeks.
- Worth migrating carefully: sites with GSC clicks/impressions on trade+city terms or inbound links. Nothing to lose: one-page sites, free Wix subdomains (no own domain), dead sites, Facebook-only, zero-impression sites. Sales friction: many owners don't know who controls DNS; the "web guy" holds it.

**(3) Which segment to lead with**
- Local evidence contradicts Eitan's premise for the approved pilot cells (docs/research/site-bot/market-scan/m4-stop-and-see-summary.md): weak prospects are "one-person businesses… usually no website". Three leading Holon electricians have no proper site; Jerusalem locksmiths below network listings have "no website". Qualitative, no counted share.
- "High-ticket" trades mostly locked up (roofing Petah Tikva, pergolas Karmiel, renovation Tel Aviv, aluminum held by strong businesses).
- Right filter for organic: ticket × search volume × winnable SERP. Electricians (panel replacement, EV chargers), AC install, leak detection fit.
- Blue links pay late: Local Pack above organic in 99% of sampled SERPs, so GBP brings most calls in months 1–6; organic pays from month 6–12.

**(4) Month-1 subdomain then own domain: low harm if the subdomain is never indexed**
- Serve {slug}.wao.co.il noindex,follow, no sitemap, no GSC. Still works as live site + GBP link.
- After 2nd payment: register domain, launch indexed, 301 from subdomain, update GBP link. Cost ~30 days later to first indexing — minor vs a 6–12 month curve.
- If month 1 is indexed, it's a full site move at day 31 — survivable but wasteful, adds to wao.co.il hosting-cluster risk.

**Better margin fix:** client already owns the domain under the resolved cancellation policy, so he registers it in his own name and pays ~₪89 himself as a pass-through at launch. Removes month-1 margin hit and allows own domain from day 1 (own domain is a precondition for organic ranking per my site-size review).

**(5) Recommendation**
1. Pilot segment: no-site + nothing-to-lose owners in the five locked cells.
2. Domain: client-paid, client-owned at launch. Noindexed subdomain only if he refuses.
3. Owners with ranking sites → waitlist until M4 ships with a pre-sale "site equity check" (GSC or DataForSEO ranked keywords + backlink count).
4. Lior to score whether M4 moves up.

**Would flip me to "existing sites first":** a scanner count showing most real prospects in the pilot cells own a domain already earning impressions, or month-1 churn above ~40% even with client-paid domain.

Sources: seroundtable.com/amp/google-domain-age-23697.html ; seroundtable.com/amp/old-new-domain-names-google-seo-27844.html ; developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes

# Amit (distribution) — Site-Bot segment input, 2026-11-11

**Bottom line:** Don't gate on "has a website." Lead with weak-ranking owners who have a live Google profile with 10+ reviews and either no site, a dead site, or a weak site. Order: dead site, then no site, then weak site. "Has a site and it's fine" last. Fix the ₪89 domain worry in billing, not targeting. Confidence: medium.

**Our scan contradicts the premise.** Nov 7 market scan (docs/research/site-bot/market-scan/m4-stop-and-see-summary.md): real weak prospects in the winnable cells are "usually no website". Holon: even top-3 electricians have "no proper website of their own". Jerusalem locksmiths: dozens with 10–75 reviews and no site. A has-site-only filter removes much of the pool in four of the five locked cells (all except AC repair in Rishon). Spec R6 (market-scanner-scoring-spec.md) already weights no-site 1.25, weak-site 1.10.

**(1) Building the lists**
- Google listing website field (via DataForSEO): reliable for has/has-not. R8 homepage check (HTTPS, mobile, city/service in title, page count, platform) grades weak sites. Catch: Local Finder can't say "no site" for unjoined records — there it means unknown.
- Google Places terms: place IDs cacheable, coordinates ≤30 days; re-pull rather than store.
- b144/easy/d.co.il/midrag: terms not verified; manual cross-checks only, no scraping.
- Free audit: opt-in only, no risk.
- Outreach risk: referrals/in-person none; Facebook group value posts low; cold B2B email medium, needs Eitan sign-off (§30A one-time business consent-request carve-out; Amendment 13 likely treats a sole trader's email as personal data); phone medium (do-not-call claim needs re-check); cold WhatsApp/SMS unacceptable.
- Channel split: no-site owners usually have no business email → phone/visit only. Has-site owners show email on site → the only segment cold email can reach.

**(2) Objections & conversion** — zero paid clients, so real conversion/churn unknown.
- Existing site: sunk cost, Wix contract/web designer, "my nephew built it", "will you break my email?" (already raised in paid-journey-m0-report.md item 10). Guess: slower to sign, lower churn once moved.
- No site: "word of mouth is enough". Guess: faster to sign, more likely to quit if digest shows no calls. Confidence low on both.

**(3) Free audit as opener:** best on dead-site owners (broken "Website" button on their Google profile = strongest pitch). Second: no-site owners with real reviews. Weak-site owners only if it shows concrete site failures; otherwise "I already have a site" ends it.

**(4) Share of Israeli trades with a site:** unknown. Only number found: 63% of small businesses without a site (Bezeq Intl survey, Globes 2014) — too old, don't use. Best real number: count no-site/dead/weak/OK per cell from our saved scan data (free).

**(5) Recommendation**
- Keep the five locked cells (AC repair + electricians cover higher-ticket).
- Order: dead site → no site with 10+ reviews → weak site.
- No-site/dead-site: visits, referrals, phone. Weak-site: the only cold-email list (Eitan signs off).
- Domain: launch on WAO subdomain, register .co.il in client's name after 2nd payment.

**Would change my mind:** cell counts showing weak-site ≥50% of prospects → lead with weak-site; 20+ real touches showing no-site owners declining far more often → switch.

Handoffs: engineer per-cell site-status counts (no network); Eitan domain timing + cold-email sign-off; Tamar "will you break my email?" reassurance copy.

# Lior (mission planner) — Site-Bot domain-strategy brainstorm (A/B/C)

Scale: Impact (I), Urgency (U), Effort (E), each 1–5. Score = I×U÷E.

**A. Existing-site prospects ONLY/FIRST: DROP "only", DEFER "first"** (I2·U2÷E4 = 1.0). It reverses the Phase-1 wedge in VISION.md:43,253, which is "single segment: no-website micro-business". Eitan has to amend VISION before anyone builds for it.
- Evidence against the "aged domain ranks sooner" premise (high confidence). Google's Mueller said "domain age helps nothing". The real asset is a site's history (indexed URLs, backlinks), and a weakly ranking site has little of it. Local Pack ranking is relevance, distance and prominence on the GBP, not website content (core30 review §Established).
- Strongest argument (high confidence). The core-30 review says NOT READY: 3–4 pages shipping, 45–61 words each, 0.74–0.98 same-site similarity. For a no-site owner, anything beats nothing. For an existing-site owner, we would swap his pages for thinner ones. That is a ranking *downgrade* sold as an upgrade, and the case study turns into a refund. So existing-site owners raise the content bar we have to clear. They don't lower risk.
- The ₪89/yr domain cost is a small loss on each month-1 churner. It is not a reason to change segment, and C solves it for about 1/10 of the effort.
- Keep: existing-site owners as a later tier, opened once service pages reach at least parity (E3/E4/E12 done).

**B. Pull M4 forward: split it.**
- **B1, binding a custom domain (registered new for the client): PROCEED, after the launch blockers** (I4·U3÷E2 = 6). Every client needs it: C at month 2, and the review's E15 hosting-cluster risk on wao.co.il.
- **B2, 301 map + MX preservation + content-reuse consent: DEFER** (I3·U1÷E4 = 0.75). Only A needs it. A migration that goes wrong breaks the owner's email, which is a worse failure than no site.

**C. Month 1 on {slug}.wao.co.il, domain bought after the 2nd payment: PROCEED, conditional** (I3·U4÷E1 = 12). Mostly a decision, not a build. A 301 from a one-month-old subdomain to the new domain carries almost no equity loss (medium-high confidence). Conditions:
- (a) It contradicts the approved buy-screen promise "own domain within 3 business days" (mission doc :65–69). Must be re-worded through waocopy → Noa.
- (b) Footer link becomes rel="nofollow", shared Unsplash image dropped (E15).
- (c) GBP website link updated at the move, UTM kept.
- (d) 301 and GSC Domain property added at bind, so the month-4 GSC clock isn't lost.

**Recommended sequence**
1. Launch blockers in parallel: billing access gating, required contact at sign-up, live /terms, Takbull connect (≈8).
2. Core-30 day-one-harm fixes: E1 (real page count), E10 (promise gate), E7+E8 (Hebrew hours, GBP link), E5 (thin-page fold), E6 (similarity gate) (≈10).
3. C decision plus promise re-copy.
4. B1 custom-domain bind — hard deadline ≈30 days after the first paid client.
5. E3/E4/E12 content depth.
6. Only then: A tier plus B2 (301/MX).

**Open question for Eitan:** Is Phase-1 still "no-website first" as VISION says? Will he accept C's month-1 subdomain instead of the "own domain in 3 days" promise?

Confidence: domain-age claim high; downgrade risk high (measured review data); 301 equity on young subdomain medium-high; ₪89 churn math high.
Sources: searchenginejournal.com/domain-age-impact/ ; seroundtable.com/old-new-domain-names-google-seo-27844.html ; seroundtable.com/amp/google-domain-age-23697.html
