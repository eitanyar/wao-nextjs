I could not save the file (write permission was not granted in this session), so the full document is below. Suggested path: `docs/copy/strategy/youtube-short-video-big-ideas-lior-fable52-2026-11-12.md`.

---

_Lior (mission planner) on claude-fable-5-2, 2026-11-12. Web facts fetched 2026-11-12, each with its source. Ideas are in English on purpose: Tamar (waocopy) writes the Hebrew. Awaiting Eitan's decisions in §7._

# YouTube short video: verdict, audience and the six big ideas (Ads Bot + Site Bot)

**In one paragraph.** Run the Site Bot video now, on a small test budget, pointed at the free check. Prepare the Ads Bot video now, but spend nothing on it until the ₪249 plan can be charged. The first two to produce are **S1 "Three stops before she calls"** (Site Bot) and **A1 "The one tap"** (Ads Bot). Google has no "plumber who owns a business" audience to buy, so the targeting is built from what owners search for, and the first second of each video does the rest of the filtering.

---

## 1. Mission verdict

### Where this sits in VISION.md (flag)
- **Paid video is not in VISION.** The growth model is "receipts": free preview, case studies, referrals. The closest fit is decision-framework question 2 (trust that fills the funnel). I am treating the video as *distribution for a receipt* (the free check), not as a new channel strategy. Eitan should confirm that reading, or add one line to VISION.
- **Ads Bot is product #3 in VISION, deferred behind Phone Bot** (2026-08-23). The 11-11/12 decisions (price, refund, page rewrite) have in practice pulled it forward, but VISION has not been amended. This needs one sentence from Eitan before media money goes behind Ads Bot.

### Verdicts

| Mission | Verdict | Impact | Urgency | Effort | Score | One-sentence reason |
|---|---|---|---|---|---|---|
| Site Bot short video, small test now | **PROCEED** | 4 | 4 | 2 | **8.0** | The free check is live, needs no billing, and is itself the proof; the first pilot clients are invoiced by hand, so Takbull does not block it. |
| Ads Bot: scripts + one finished video now | **PROCEED (creative only)** | 3 | 3 | 2 | **4.5** | Cheap, reuses the same production fork, and the video is ready the day billing opens. |
| Ads Bot media spend now | **DEFER** | 3 | 2 | 2 | 3.0 | Today a convinced viewer reaches a page that says sign-up and payment are unavailable; we would pay to send our best prospects into a dead end. |
| Ads Bot media spend after Takbull | **PROCEED when gates clear** | 4 | 3 | 2 | 6.0 | Same creative, now with somewhere to land. |

Effort is a real constraint in only one place: Eitan's own hours (on camera, and delivering by hand to whoever says yes).

### Dependency check

**Site Bot video (all must be true before the first shekel of spend):**
1. `/site-bot/audit` works end to end on a phone, and the screen after the result gives a clear next step (today: the contact form; the paid chat is flag-gated off).
2. A Google Ads conversion fires on "free check completed" and on "call requested". GTM is on the site (`GTM-PQP3PVB`); the conversion actions themselves are unverified.
3. A consent answer for remarketing lists (Amendment 13). Amit grades it; if unclear, run without remarketing in round 1.
4. Eitan can call every qualified lead within one working day. Budget is capped to his capacity.
5. The rewritten `/site-bot` page carries the same positioning as the video. If the video ships first, it lands on the free check only, never on the old page.

**Ads Bot media spend (in addition to 2–3 above):**
1. Takbull ₪249 recurring plan live (as of the 11-11 MVP review the provider still throws).
2. Rewritten `/google-ads` live with the four Google-policy disclosures.
3. Eitan confirms Ads Bot is on the near-term roadmap.
4. Dror confirms the Developer Token access level can carry real new client accounts.

---

## 2. Audience: who sees these first

### The best prospects
| | Site Bot | Ads Bot |
|---|---|---|
| Who | One-man trade business, Google is his main source of work, no site or a dead one, Google profile already rated 4.0+ with 10+ reviews | Same owner, one stage on: has paid for clicks or an agency and saw no work, or watches competitors advertise and fears burning money |
| Where first | The five locked cells: locksmiths in Jerusalem; electricians in Rehovot, Ramla and Holon; AC repair in Rishon LeZion (`docs/research/site-bot/market-scan/m4-stop-and-see-summary.md`). About 94 hand-counted real weak prospects | Same trades, wider geography (Dan and Shfela), because ₪1,500/month of ad spend needs a market big enough to absorb it |
| Awareness | Problem-aware. Does not want "a website"; wants the next searcher to call him | Solution-aware and burned. Lead with mechanism, not a bigger promise |

Note: your brief names plumbers; the locked cells in the repo are locksmiths, electricians and AC repair. I planned around the locked cells.

**The first honest limit.** Google cannot target "profile rated 4.0+, 10+ reviews, no website". The ad gets the right trade in the right city; **the free check does the qualifying**, because its result shows his real profile. So the success metric is "qualified checks", not views (§5).

**The second honest limit.** The five cells hold roughly a hundred real prospects. An audience that small may not serve at all. Plan two ad groups: the five cells first, and the same trades across the rest of the centre as a second ring that opens only if the first under-delivers.

### How Google Ads can reach them (verified 2026-11-12)

| Lever | What it does | Status and source |
|---|---|---|
| **Custom segment, "people who searched for these terms on Google"** | The strongest lever. Built from what *owners* search, never what their customers search | Verified: applies on campaigns running on Google properties (Google.com, YouTube); elsewhere the terms fall back to interests. [Help 9805516](https://support.google.com/google-ads/answer/9805516?hl=en) |
| Custom segment by URLs and apps | People who browse sites / use apps *similar to* those listed. Ads do not appear on those sites | Verified, same page. Looser; use as a second ad group |
| Location | Presence in the five cities (and the second ring) | Standard |
| Demographics | Start with men 25–64; the voiced copy is singular male anyway. Widen if delivery is thin | Planning choice, not a Google fact |
| Your data: site visitors, video viewers | People who watched video 1 see video 2; check starters who did not finish | Needs the consent answer |
| Customer Match | Minimum reported as 100 matched users across networks. **Only from WAO's own consented contacts** | Medium confidence, secondary source. [Search Engine Land](https://searchengineland.com/google-slashes-customer-match-list-minimums-in-search-campaigns-to-100-users-455912) |
| Lookalikes (Demand Gen only) | Since March 2026 they are a *suggestion* to the system, not a hard limit | Verified. [Help 13541369](https://support.google.com/google-ads/answer/13541369?hl=en) |
| Life events / detailed demographics | Google's page lists graduating, moving, marrying; homeowners, parents. **Nothing about business owners** | Do not build on it. Dror checks the Israel account UI. [Help 2497941](https://support.google.com/google-ads/answer/2497941?hl=en) |
| Placements (specific channels and videos) | Trade-tool reviews, professional how-to channels | **Unverified** whether Demand Gen accepts placement targeting on Shorts; may need a classic Video campaign |

**Owner-intent search themes for the custom segment** (Dror builds the Hebrew keyword lists; these are themes):
- licensing, certification and trade courses for the profession;
- professional liability insurance for the trade; van and tool purchase and leasing;
- wholesale and supplier searches a householder never makes;
- invoicing and bookkeeping for a sole trader; opening a sole-trader business;
- "how do I get more customers / leads" for the trade; joining lead marketplaces and directories as a professional;
- Google Business Profile management, how to get Google reviews, building a site for a small business;
- for Ads Bot only: Google Ads cost, agency pricing, advertising on Google for the trade.

**Two settings that decide whether any of this works:**
- **Turn optimized targeting off.** It is reported as on by default in Demand Gen ad groups and turns chosen audiences into suggestions (secondary sources). Left on, the videos drift to householders.
- **Never upload the market-scan phone list to Customer Match.** Those numbers came from public listings, not from people who gave them to WAO. Customer Match requires first-party data, and Amendment 13 applies.

### Exclusions
- People searching for a tradesman (trade + city, "emergency", "price of repair"). The single biggest waste risk.
- Job seekers in the trade (employees, not owners).
- Marketers, agencies and digital-marketing students.
- WAO's own clients and existing leads (once the list clears 100).
- People who already completed the free check (move them to a follow-up video).
- Made-for-kids, gaming and music placements; app placements; anyone outside Israel.
- Knowledge workers are excluded by the creative: every video names a hands-on trade in the first second.

---

## 3. The big ideas

**Rules every idea already obeys** (each "hard-line check" lists only what is specific to it):
- No real client, no client number, no results promise, no "first on Google", no time-to-rank, no page count, no credit amount.
- The feeling is relief and pride. The customer is the one in a hurry; the owner is never pressured.
- The only thing AI replaces is the agency's manual work.
- All spoken lines are *concepts in English*. Tamar chooses the words and the angle inside each idea.

**Proof devices available without client examples:** the free check (he sees his own profile), the no-cost demo, the real product on screen, Eitan by name and face, Google Partner stated plainly, the mechanism itself, a detail only an insider knows.

### Site Bot — all three carry "the complete organic Google exposure system for a one-man business"

#### S1. "Three stops before she calls" — recommended first
- **Idea:** Between her search and her call, the customer makes three stops: your Google profile, your site, your reviews. When all three tell the same story about what you do, she calls you. The bot builds all three and keeps them telling one story, every month.
- **Enemy:** The patchwork. A profile somebody opened once, a site that is missing or dead, reviews left to luck.
- **Emotional turn:** From "I'm the better professional, why did she call him?" to "it was never my work; it is three things that don't line up, and lining them up is not my job."
- **Hook, 0–3s.** *Visual:* a phone in a hand, a search for his trade, a thumb moving down three business cards and stopping. *Spoken:* "She needs an electrician now. Before she calls anyone, she makes three stops."
- **Beat sheet (about 28s):**
  1. 0–3s: hook.
  2. 3–8s: stop one, the profile. One word about a man who does a dozen kinds of jobs.
  3. 8–12s: stop two, she taps "website". Nothing there, or a page from years ago.
  4. 12–16s: stop three, the reviews. Good ones, few, old. She goes back and calls someone else.
  5. 16–22s: the turn. Same three stops, built as one system: the site laid out like his tree of services, the profile matching it, his customers helped to leave reviews.
  6. 22–26s: Eitan, to camera: he does the work, the bot does everything that gets him found and chosen. Price as the punchline (₪199 + VAT a month).
  7. 26–30s: CTA card, spoken and written.
- **Proof device:** The free check: "see your own three stops, the way a customer sees them". He verifies the claim on himself. Second: Eitan by name and role.
- **CTA and destination:** "See what she sees about you" → `/site-bot/audit`.
- **Hard-line check:** "She calls you" is a scene, never "you will get calls". The mechanism claim (site, profile and reviews reinforce each other in local results) needs Yonatan's sign-off on wording.

#### S2. "Google knows one word about you"
- **Idea:** He does many kinds of jobs; Google has one word for him. Customers search for the job, not the trade. The bot lays out his whole tree of services on a site built for it, and makes his Google profile say the same.
- **Enemy:** The business-card website and the do-it-yourself builder: one page saying "electrician, quality service, fair prices".
- **Emotional turn:** Pride. "I do far more than they know" becomes "now every branch of my work is on the map".
- **Hook, 0–3s.** *Visual:* the side of his van listing his services, cut to his Google profile showing a single category word. *Spoken:* "On your van it says everything you do. On Google it says one word."
- **Beat sheet (about 22s):**
  1. 0–3s: hook.
  2. 3–8s: a customer types the specific job. He is not there, though he did that exact job yesterday.
  3. 8–14s: a tree grows: trunk is the trade, branches are his services; each branch becomes a place on his site, and the profile lights up to match.
  4. 14–18s: "This is not a website. It is how a one-man business gets seen on Google." Site, profile, reviews in one breath.
  5. 18–22s: CTA.
- **Proof device:** The insider detail (people search the job, not the trade), which he recognises from his own calls. Then the free check.
- **CTA and destination:** "Check which of your services Google can see" → `/site-bot/audit`.
- **Hard-line check:** The live product ships one page per service the owner names, so "a place for every service you name" is true today; anything implying thirty pages is not. **[CONFIRM]** the free check actually shows services, or the CTA wording changes.

#### S3. "The thank-you that stayed in the stairwell"
- **Idea:** His best advertising is said out loud at the customer's door and then lost. The bot helps that customer leave it on Google, where the next customer is looking, and ties those reviews to his profile and site.
- **Enemy:** Luck. Reviews that happen only when a customer remembers.
- **Emotional turn:** Pride, then relief. His reputation already exists; it is just not written where it counts, and he does not have to be the one who asks.
- **Hook, 0–3s.** *Visual:* a doorway, a relieved customer thanking a tradesman packing his tools. *Spoken:* "She just said the best thing anyone said about you this month. And it stayed in the stairwell."
- **Beat sheet (about 22s):**
  1. 0–3s: hook.
  2. 3–7s: he drives off. Nobody asked her; he had the next job.
  3. 7–13s: same doorway. Later her phone lights up with a short, polite request and a direct link. She writes two lines.
  4. 13–18s: those lines appear on his profile and on his site. "Reviews are one part. The bot runs the whole thing: site, Google profile, reviews."
  5. 18–22s: CTA.
- **Proof device:** The real review-request screen from the product (no client name). Then the free check.
- **CTA and destination:** "See how your reviews look to a new customer" → `/site-bot/audit`.
- **Hard-line check:** Google forbids paying for reviews, asking only happy customers, and writing reviews for them. The video shows every customer asked and the customer's own words. **Flag:** your phrase "the right written reviews" must not become "we steer what they write"; the repo already removed content steering from the review request (`scripts/remove-review-content-steering.mjs`). Yonatan confirms. Alone, this idea can read as "a review tool", so it runs second, to people who saw S1.

### Ads Bot

#### A1. "The one tap" — recommended first
- **Idea:** Google's ads learn from whatever they are fed. Agencies feed them clicks. The bot feeds them the jobs he actually closed, and it takes him one tap.
- **Enemy:** The click report: a monthly PDF full of clicks, and a phone that stayed quiet.
- **Emotional turn:** From "ads burned me" to "they were teaching Google the wrong thing, and now I am the one teaching it".
- **Hook, 0–3s.** *Visual:* a working hand, close up, tapping one button on a phone: "job closed". *Spoken:* "This one tap is the thing your last agency never gave Google."
- **Beat sheet (about 28s):**
  1. 0–3s: hook.
  2. 3–8s: the burned scene in one breath: money out, clicks in, phone quiet, nobody could say why.
  3. 8–15s: the mechanism as a week in his life. An enquiry lands in his list. He marks it real or junk, closed or not. Google learns which searches bring work, and the budget moves there.
  4. 15–20s: what he sees each week: every enquiry and what it cost, in shekels.
  5. 20–25s: Eitan, to camera: a bot runs it, the account is in his name, ₪249 + VAT a month.
  6. 25–30s: CTA.
- **Proof device:** The mechanism itself, on the real product screen with the demo business. Google Partner, stated plainly. Eitan by name.
- **CTA and destination:** "Talk to Eitan, 30 minutes, free" → `/google-ads` (demo as the second door).
- **Hard-line check:** "Learns from closed jobs" is true of the design; it must never become "you will get more jobs". On-screen figures come from the demo business and are labelled as an illustration. **[CONFIRM]** the marking → Google upload runs for real accounts before the video says "learns" in the present tense.

#### A2. "Where did the money go?"
- **Idea:** Every week he sees each enquiry and what it cost him. No report to decode, nobody to chase.
- **Enemy:** The black box. The card statement says "Google Ads" and nothing explains it.
- **Emotional turn:** From helpless to in control. He does not have to trust anyone; he can see.
- **Hook, 0–3s.** *Visual:* a card statement with one line highlighted, next to a silent phone on a dashboard. *Spoken:* "The money went out. The phone stayed quiet. And nobody could tell you why."
- **Beat sheet (about 22s):**
  1. 0–3s: hook.
  2. 3–7s: he asks the agency; he gets a chart.
  3. 7–14s: the weekly message opens: how many enquiries, which were real, what each cost. One scroll. Done.
  4. 14–18s: "Your account, your numbers, open to you any time." Bot, price.
  5. 18–22s: CTA.
- **Proof device:** The real weekly summary on screen (demo data, labelled). The demo he can try without spending.
- **CTA and destination:** "See it running on a sample business" → `/google-ads` (demo door first).
- **Hard-line check:** Sample numbers can be read as typical results; label them or blur the values. **[CONFIRM]** the weekly report's channel before the video shows a specific app.

#### A3. "Paid before your ad runs once"
- **Idea:** With an agency, the management fee comes off the top before a single ad shows. A bot does that work for ₪249, so his money goes to ads.
- **Enemy:** The retainer.
- **Emotional turn:** Fairness. "That is how it should have been all along."
- **Hook, 0–3s.** *Visual:* two piles of coins on a workbench, "management" and "ads"; a hand slides most of the first pile to the second. *Spoken:* "Before your ad runs even once, the agency has already been paid."
- **Beat sheet (about 22s):**
  1. 0–3s: hook.
  2. 3–8s: the category anchor: agency management typically starts at about ₪1,500 a month before VAT, ad budget on top.
  3. 8–14s: what the bot does for ₪249 + VAT: builds the account, ads and landing pages, guards the budget, reports weekly.
  4. 14–18s: "You pay Google directly. The account is yours."
  5. 18–22s: CTA.
- **Proof device:** The arithmetic, which he can check. Google Partner. Eitan by name.
- **CTA and destination:** "Talk to Eitan, 30 minutes, free" → `/google-ads`.
- **Hard-line check:** Only Dror's verified anchor, with "typically" and "from", category only; recheck every six months. It leads with price, which the selling rules place after desire, so it is a third video for people who watched A1, not an opener.

**The Google credit stays out of all video.** Twenty seconds has no room for "businesses new to Google Ads may be eligible", and without that clause the line breaks a hard line. It lives on the page.

---

## 4. First two to produce, and the format plan

### The picks
- **Site Bot: S1.** It is the only idea that carries the whole system (site + profile + reviews + coherence) inside one concrete scene. S2 leans "website"; S3 leans "review tool". Both become follow-ups for people who watched S1.
- **Ads Bot: A1.** It is the approved big idea (jobs, not clicks), mechanism-first for a burned audience, with a single image that works with the sound off.

### Format (facts verified 2026-11-12)
| Decision | Recommendation | Basis |
|---|---|---|
| Campaign type | **Demand Gen**, YouTube channels only, optimized targeting off | Video Action Campaigns were replaced by Demand Gen (final upgrades by April 2026). [Help 15110871](https://support.google.com/google-ads/answer/15110871?hl=en) |
| Placement | One ad group **Shorts only**; a second for in-feed + in-stream | Channel controls are per ad group; Shorts, in-feed and in-stream are separately selectable and reported. Google warns an isolated channel may cost more. [Help 15973205](https://support.google.com/google-ads/answer/15973205?hl=en) |
| Master cut | **9:16, 1080×1920**, 20–30s | 9:16 is "recommended for YouTube Shorts"; minimum 5s; under 10s cannot serve in-stream. [Help 13704860](https://support.google.com/google-ads/answer/13704860?hl=en) |
| Second cut | 16:9, 1920×1080, same audio, for in-stream | Same page |
| Text assets | At least 3 headlines (max 40 characters), 3 long headlines (90), 3 descriptions (90), business name (25) | [Help 17141078](https://support.google.com/google-ads/answer/17141078?hl=en) |
| Hosting | Upload to WAO's YouTube channel first (unlisted allowed) | Same page; `scripts/upload_to_youtube.py` exists |
| Sound | Design for sound on, survive sound off | Shorts ads default to sound on (same page) |

**Why not buy impressions only?** A Video reach campaign buys impressions more cheaply, but the audience here is a few hundred to a few thousand people. The limit is audience size, not price, and Demand Gen lets the same campaign count free checks. If delivery is too thin, Dror tests a Video reach campaign as the fallback.

### The first three seconds
- **What Google publishes:** principles, not a second count. From its Shorts ABCD one-sheet: "Announce yourself with audio", "Be unavoidable", "Use tight framing", "Give real people a real stage", "Hook them with the benefits that matter most", "Anchor with supers", "Show your CTA more than once but anchor it visually at the end", "Show off the price". From Google's blog (17 April 2024): the best Shorts ads "feel like they're part of a viewer's Shorts feed", casual, with everyday people addressing the viewer directly.
- **WAO's working rule (ours, not Google's):** the trade is named and the scene has started before second two; no logo intro; the first spoken sentence is about eight words at most; the brand is a small corner mark from frame one and spoken by second 20.
- **Unverified:** what currently counts as a billable or "engaged" view on Shorts. Secondary sources disagree. Dror reads it off the account.

### Who is on camera
**Eitan, briefly, plus the real product on screen.** Google's guidance favours a real person speaking directly, and "Eitan by name" is one of the few proof devices left without client examples.
- **Version 1 (recommended):** staged scene or screen capture for the hook and middle; Eitan to camera for 4–6 seconds near the end, filmed vertically on a phone, one take. About half an hour of his time for both videos.
- **Version 2 (control):** no Eitan; pipeline voice, screen capture and caption cards. It tells us whether his face earns its place before we ask for more of his time.

### What the existing pipeline can and cannot do
**Exists:** `scripts/render_lesson.py` (ElevenLabs voice → Marp slides rendered through Chrome → ffmpeg → MP4), `scripts/upload_to_youtube.py`, the RTL theme `docs/scripts/website-course/wao-rtl.css`, and the course-production skill with Noa's voice checks. The skill's own rule: ffmpeg only, never MoviePy (it took 14+ hours).

**Missing for Shorts (one engineer run, a fork such as `render_short.py`):**
1. A 9:16 theme and a 16:9 export of the same script.
2. One caption card per spoken phrase, timed to the audio.
3. Video inserts per beat (screen recordings, Eitan's clip) under the captions.
4. **Two texts per line: a voice text and a display text.** The voice text carries the vowel marks and phonetic spellings ElevenLabs needs; none of that may appear on screen.

**Hebrew and RTL captions:**
- I found no Google guidance on right-to-left captions in Shorts ads. It is ours to get right.
- Burn the captions in, rendered through the existing HTML → Chrome path, which handles mixed Hebrew and Latin ("Google", "WAO", "₪199"). Avoid ffmpeg's text drawing, which often breaks Hebrew.
- Two to four words per card, two lines at most, centred, large.
- Keep text out of the bottom band and the right-hand button column. Third-party guides put the bottom dead zone at roughly 300–350px of 1920 and disagree; check in the Google Ads preview on a real phone.

### What the repo's Google Ads code supports
The campaign builder creates **Search campaigns only** (`src/app/api/google-ads/create-campaign/route.ts:594`); search-term, CPL-ceiling and digest code all filter to Search. **Dror builds this campaign by hand in WAO's own account. No engineering is needed for the test.**

---

## 5. Measurement

"Impressions in front of best prospects" is only real if the people are the right ones.

| Level | Metric | What it tells us | Source |
|---|---|---|---|
| 1. Reach | Unique users and average frequency, per ad group, per city | Are we reaching the segment at all | Google Ads |
| 2. Hold | Share of impressions reaching 25% and 100% of the video; view rate | Does the hook work | Google Ads quartile columns |
| 3. Response | Click-through rate; free checks started and **completed** | Does the idea move them | Google Ads + conversion tag |
| 4. **Fit (the real one)** | **Qualified checks**: a completed check whose result shows the Phase-1 profile (right trade, 4.0+, 10+ reviews, no or dead site) | Were they our best prospects | The check's own data, joined weekly by Adam |
| 5. Outcome | Calls booked with Eitan; clients signed | Money | CRM, by hand |
| Side signal | Brand searches in Search Console, 28 days before against the test period | Whether the name is sticking | Small, noisy numbers; directional only |

### Test budget shape (planning assumptions; the amounts are yours to approve)
- **Round 1, Site Bot only, three weeks.** About ₪50–70 a day, roughly ₪1,200–1,500 in total. Two creatives (S1 with and without Eitan), two ad groups.
- **Bidding:** start on clicks. Google's guidance for conversion bidding is a daily budget above 20 times the expected cost per conversion and 4–6 weeks of running ([Help 15110871](https://support.google.com/google-ads/answer/15110871?hl=en)); a test this size cannot meet that.
- **Cap by your capacity:** if qualified checks exceed what you can call within a working day (assume five a week), lower the budget.
- **Ads Bot round** mirrors this once its gates clear.

### Kill or scale
There are no paid clients yet, so every threshold is an assumption to be replaced by the first real numbers.
- **Kill a creative** after about 3,000 in-segment impressions if it is the weaker variant on both hold and click-through. Replace with S3, then S2.
- **Fix targeting, not creative,** if more than half of completed checks come from the wrong kind of business or from householders.
- **Kill the channel for now** if a full round produces fewer than three qualified checks. The budget returns to in-person and phone outreach.
- **Scale** (double the budget, add S3 as the follow-up, open the second ring) when cost per qualified check holds at or under about ₪60 for two weeks. Working: three months of revenue at ₪199 is about ₪600; if one in ten qualified checks becomes a client, ₪60 per check keeps acquisition inside that. Both numbers are guesses.
- **Stop regardless** if a viewer complaint or Google policy flag lands on any claim.

---

## 6. Handoffs

| Owner | Task | Output |
|---|---|---|
| **Eitan** | Decisions in §7; half an hour on camera; spot-check of the voiced Hebrew | Go / no-go; clips |
| **Dror** | Campaign spec for WAO's own account: Demand Gen, channel split, optimized targeting off, Hebrew owner-intent keyword lists, exclusions, conversion actions, bid and budget. Verify in the account: placement targeting on Shorts, any business-owner segment in Israel, the billable-view definition, frequency controls. Policy check on every spoken claim in S1 and A1 | Dated spec + claim sign-off |
| **Yonatan** | Sign the mechanism sentence in S1 and the review wording in S3 against Google's review rules | Two approved English sentences for Tamar |
| **Tamar** (waocopy) | Hebrew for S1 and A1: spoken script (singular male, short sentences, shorter in the hook), caption cards, text assets. Brief her the situation and the idea; angle and words are hers. Three hook options per video | Scripts + assets |
| **Noa** | Correctness and voice pass on both texts per line (voice text and clean display text). Hook test: after three seconds, does he know it is about him | PASS / fixes |
| **Gil** | Turn the approved script into the beat-timed production script. Structure only; no new Hebrew | Production script |
| **Engineer** | `render_short.py` fork; screen recordings of the free check and the Ads Bot demo; confirm conversion tags fire | Two MP4s per idea |
| **Maya** | Caption safe zones and mixed Hebrew/Latin rendering on a real phone | PASS / fixes |
| **Roni** | MP4 structure, duration, resolution, captions on every line, landing pages load on mobile, conversion fires | PASS / FAIL |
| **Amit** | Consent grade for remarketing lists under Amendment 13 | Go / no-go |
| **Adam** | Routing; weekly join of completed checks to the Phase-1 profile; kill/scale call with Dror | Weekly one-page readout |

**Recommended next single action for Adam:** send Dror the §2 and §4 tables for account-level verification and the claim check on S1 and A1, in parallel with briefing Tamar on S1. Nothing else starts until Eitan answers the blocking question and question 1 below.

---

## 7. Open questions for Eitan

**The one that blocks Phase 1:** when a tradesman watches the video, runs the free check and says "yes, I want it", what happens that same day? Checkout is still the mock provider and the paid chat is off. If the answer is "Eitan calls him and invoices by hand", we size the budget to that. If there is no answer yet, the video fills a funnel with no bottom.

The rest, bundled:
1. **Ads Bot's place.** VISION still lists it third, behind Phone Bot. Confirm it has moved up, so its video is scheduled for the day the ₪249 plan is live.
2. **Test spend.** Approve roughly ₪1,200–1,500 over three weeks for the Site Bot round.
3. **On camera.** Half an hour for two short phone clips, and agreement to test a no-Eitan version alongside.
4. **Out-of-cell clients.** If a qualifying electrician from outside the five cells completes the check, do we take him or waitlist him?
5. **Reading of VISION.** Paid video as distribution for the free check, not a new growth channel. Agree, or amend VISION.

---

## Sources (all fetched 2026-11-12)
- [Demand Gen asset specs (13704860)](https://support.google.com/google-ads/answer/13704860?hl=en) and [video asset specs (17141078)](https://support.google.com/google-ads/answer/17141078?hl=en)
- [Demand Gen channel controls (15973205)](https://support.google.com/google-ads/answer/15973205?hl=en)
- [Video Action Campaigns → Demand Gen (15110871)](https://support.google.com/google-ads/answer/15110871?hl=en)
- [Custom segments (9805516)](https://support.google.com/google-ads/answer/9805516?hl=en)
- [Audience segment types (2497941)](https://support.google.com/google-ads/answer/2497941?hl=en)
- [Lookalike segments (13541369)](https://support.google.com/google-ads/answer/13541369?hl=en)
- [Shorts ABCD one-sheet, Google Creative Works](https://services.google.com/fh/files/misc/formarketingshortsabcdsonesheeters.pdf)
- [Shorts creative guidance, blog.google, 17 April 2024](https://blog.google/products/ads-commerce/youtube-shorts-ads-select-lineups-abcds/)
- [Customer Match 100-user minimum, Search Engine Land (secondary)](https://searchengineland.com/google-slashes-customer-match-list-minimums-in-search-campaigns-to-100-users-455912)
- [Video reach campaigns (10581234)](https://support.google.com/google-ads/answer/10581234?hl=en) — search-result summary only, not fetched

**Not verified, flagged in the text:** the optimized-targeting default (secondary sources only), placement targeting on Shorts inside Demand Gen, any business-owner audience segment in Israel, the billable-view definition for Shorts ads, caption safe-zone pixel values, frequency capping in Demand Gen.