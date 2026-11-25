Inputs: docs/reviews/site-bot-semantic-ranking-plan-yonatan-2026-11-26.md; Eitan 26.11 "leave the launch date... cannot settle on less". Model confirmed claude-fable-5-2. Supersedes the launch parts of site-bot-ranking-launch-plan-fable52-2026-11-26.md. Status: PROPOSED, awaiting Eitan.

# Site Bot: sites that can rank — re-decision (Fable 5.2 seat, 2026-11-26)

**Decision: 29.11 is cancelled as a launch. No paid site goes live until it passes a blocking "can rank" gate on its own domain. Realistic first paid site: target Thu 17.12, honest range 14–24.12.**

The gate proves a site *can* rank, not that it will. Every winner Yonatan measured had age and links, and only E2's day-90 result turns the thresholds into data.

Not verified by me: the state of steps 3–7 (fact ledger, Eitan's review screen, Google sign-in, terms, Takbull recurring billing), the multi-tenant Worker, photo intake, the registrar price, and what the closed pay flow shows today.

## 1. Target architecture

Yonatan's ranked list, anatomy and data plan are accepted, with these amendments:

- **Interview channel:** v1 is typed answers with the phone keyboard's microphone, reusing the 2b fact extractor and confirm screen. Recorded voice is the first run after the first paid site, pulled forward if owners average under 5 facts per service.
- **Owner-fact share ≥50%:** WARN, not BLOCK, until E1 gives data. Blocking on it with a 5-fact floor rewards stretching five facts into 225 words.
- **NeuronWriter:** one query per service cluster at trade level, reused across clients. One log-only evaluation per page at publish, never regenerating to chase the score.
- **Go-live minimum:** home plus at least 3 passing service pages plus about. Fewer goes to Eitan's exception list.
- **E1 pass rule:** the same thresholds as the publish gate. The competitor median score is a diagnostic there too.
- **Trade order:** plumber first. Electrician follows once it has its own map, library read and verified licence lookup.
- **Ads geography:** only cities the classifier marks winnable for a small site.

**Required before any paid site goes live (all BLOCK):**

1. A real plumber topical map; fixture question pools are gone.
2. Post-pay depth interview: per service (max 5), caller questions, price range or rule, with owner confirmation.
3. Service pages built only for services with ≥5 unique facts; the pricing page only from his own numbers.
4. Trade library ≤30%, with no first person or digits.
5. Own domain with HTTPS, Search Console verified by DNS, and sitemap equal to the indexable set.
6. One page per anchor, no Latin in title or H1.
7. Similarity: same-site ≤0.35, cross-client ≤0.10 with library text masked.
8. NAP byte-equal to GBP, and no rating or review markup.
9. At least 3 real photos.
10. Mobile LCP under 2.5 s.
11. Every owner-voice sentence traced to a confirmed fact.

Reviews on home come in the same window but do not hold the site: without the 30-day refresh job, it goes live with no reviews.

**After go-live:** rank tracker and Bing by day 14; job log v1 and Amit's citations by day 30; first Search Console loop at day 60. Yonatan's 14/30/60/90 thresholds are accepted as internal checks, never as a client promise.

## 2. Sequencing

E1 is first and needs no engineer, so it runs alongside runs 1–4.

| # | Engineer run (one outcome) | Needed before |
|---|---|---|
| 0 | In-flight run finishes unchanged | — |
| 1 | Home structure (old run 1) | ads |
| 2 | Plumber library on home (old run 2) | ads |
| 3 | Plumber map + winnability classifier, real pools, "real pool or no pages" block | ads |
| 4 | Preview ends in a no-charge "hold my place"; the 29.11 stamp is removed | ads |
| 5 | Post-pay depth interview + fact ledger with sentence-to-fact trace | first paid site |
| 6 | Service and pricing pages from the ledger | first paid site |
| 7 | Photos; GBP reviews with 30-day re-read and purge | first paid site |
| 8 | Own-domain attach, staging subdomain noindexed, Search Console by DNS | first paid site |
| 9 | Publish gate as blocks in `reviewPreflight.ts`, cross-client check switched on | first paid site |
| 10 | Rehearsal: the E1 plumber's real site through runs 5–9 (this is E2) | opening payment |

**What E1 needs from Eitan:** one real plumber from his network.
- In a Holon / Bat Yam / Rehovot-class city, with a Google profile and ratings, and no website.
- Written consent to a recorded 15-minute call, to his answers and price ranges being published, and to a live site on his own domain.
- Three photos, and later his Google sign-in.
- Eitan runs the call himself. The questions come from waocopy, then Noa.

## 3. Launch and ads

- **Ads start** only when E1 passes and the home preview reaches 450–600 words. Expected 2–6.12.
- **Budget and cap:** minimum budget, 3 interview starts a week, ending in interview, preview and a no-charge hold. Those owners' typed answers also measure fact yield.
- **Payment opens** when the rehearsal site passes the full gate, about 10–13.12.
- **Effort:** nine serial runs at the recent pace is 6–9 working days if nothing breaks. E1 failing once, the Worker, or Takbull recurring billing can each add days.

## 4. Own domain

- **Default:** a .co.il in the business's own name for every client. The subdomain is noindexed staging only.
- **Who pays:** WAO, inside the ₪199 (roughly ₪70–100 a year, registrar price to verify), with no minimum term.
- **How:** registered with the client as registrant and WAO as technical contact. DNS sits in WAO's Cloudflare so Search Console and Bing verify by DNS.
- **First ten:** registered by hand; no registrar API yet.
- **Existing domain:** used only if no live site is on it, or with real redirects.

## 5. Work in flight

- **Engineer run:** keep all of it. Every item fits the target.
- **Trade libraries:** finish both, Noa reads, Eitan's 15-minute read stays but is no longer tied to Saturday. The library is the floor and extends to service pages. The electrician one ships with that trade.
- **Promise truth pass:** ship it regardless. Still no ranking or timeframe promise until E2's day 90.
- **"What gets added" preview lines:** recheck against the new flow (depth interview, own domain) before applying.
- **Saturday go/no-go:** dissolved into the preview-bar condition in section 3.
- **VISION.md lines 35 and 259:** Adam fixes them. Yonatan already signed off.

## 6. What Adam tells Eitan

1. You were right, so Sunday is off: no site goes live until it passes a hard "can this rank" check.
2. A ranking site is like a tradesman's reputation: it needs things only he can say, so after paying he answers about five questions per service and we build pages only where he gave real answers.
3. Every client gets his own .co.il from day one, paid by us, because links and Google history need a permanent address.
4. First we test the idea on one real plumber in two days: his answers against the pages ranking today.
5. Ads start small in early December into interview, preview and a free place in line; the first paying site goes live around 17.12, possibly a week later.
6. I can promise a site built to rank, not a ranking: the first real proof comes about 90 days after the first site is live.

**Eitan's own decisions:**

1. Name the plumber, get his consent, and offer him the site free for 12 months.
2. Approve WAO paying each client's domain, and open the registrar account.
3. Approve the ads rule (none on 29.11, minimum budget after E1) and about $50 of DataForSEO and NeuronWriter queries.
4. Approve removing the public 29.11 date from `/site-bot`.
5. Send the lawyer three items: call-recording consent, domain registration in the client's name, and the GBP review-display gap.
6. Confirm where Takbull recurring billing stands.

**Next prompt to paste after /clear:** "Adam: apply the Fable 5.2 re-decision of 26.11 (sites that can rank). Let the in-flight run finish; brief runs 1–4 in order (home structure, plumber library on home, plumber map + winnability classifier, hold-my-place ending + remove the 29.11 stamp). In parallel start E1: ask Eitan for the plumber and consent, get the E1 call questions from waocopy then Noa, and have Yonatan score the three builds. Check the real state of steps 3–7, the Worker and photo intake before briefing runs 5–9. Bring Eitan the six decisions as one bundle."
