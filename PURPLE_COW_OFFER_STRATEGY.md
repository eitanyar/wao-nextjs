# Purple Cow Offer Strategy — Value-Idea Exhaustion Pass
**Author:** Lior (Strategist, Fable pass at max depth) · **Date:** 2026-08-23
**Inputs:** `VISION.md`, `blue_ocean_strategy.md`, `red_ocean_summary.md`, `AGENTS.md`, `CLAUDE.md`
**Status:** Strategy only. No implementation specs. All Hebrew below is a **strategist draft** —
singular male, NOT voice-approved, must pass Tamar → Noa → Eitan before it touches anything live.

---

## The frame I reasoned from (stated up front so you can audit it)

The persona's entire economy runs through **one device (his phone), one channel (WhatsApp +
phone calls), and one metric (did the phone ring / did I get paid)**. Every idea below was
tested against a single question: *does this convert something the owner already does anyway —
answering calls, finishing jobs, taking photos, getting thanked — into marketing output, with
one "yes" as his only labor?* Ideas that require the owner to do something NEW (log in, write,
learn, attend) were treated as structurally suspect regardless of how clever they were.

That frame produced the central finding of this pass, stated early because it reorganizes
everything after it:

> **The current strategy is excellent at "found" and almost silent on "captured" and
> "compounded."** Site Bot makes an invisible business findable. But the moment the phone rings,
> WAO's current product suite exits the story — and that moment is where this persona bleeds the
> most money (missed calls, slow quotes, unanswered reviews, forgotten past customers). The
> biggest purple-cow territory is not a better way to be found. It is owning the 90 seconds
> after the phone rings and the 90 days after the job is done.

---

## Part A — Purple Cow Audit of the CURRENT Strategy

Grading rule: a purple cow = an owner would spontaneously tell another owner about it at a
supplier counter. "Solid and correct" is not a cow.

### Keep & double down

| Element | Why it's a genuine cow |
|---|---|
| **₪9.90 generate-only preview** (VISION §Bots table) | "Pay 10 shekels, see your entire 30-page site before committing" is a magic trick, not a lead magnet. No competitor can demo the finished product for coffee money. This is the anti-"free consultation" (red_ocean §2.2) done right. |
| **OAuth / "you own everything"** (VISION §Infrastructure, blue_ocean Gap 2) | The only player in the market whose retention model is *not* hostage-taking. "Fire us and keep everything" is a sentence owners repeat to each other — it names the scar every burned owner carries. |
| **Approve-don't-manage master narrative** (blue_ocean Gap 1/G4) | The third door is real and empty. AI-as-doer with a one-word approval is structurally unavailable to the 8 red-ocean competitors — their business model *is* the labor. |
| **GBP merged into Site Bot as delivery step one** (VISION §Phase 1) | "From invisible to on the map, with a real site behind it" is one unified promise in the owner's language. Correct instinct, correctly shaped. |
| **Per-page authored core-30 under Gate 1** (VISION §Phase 1 gates) | Not marketable as a feature, but it is the moat that survives the June 2026 doorway-page purge while template competitors get deindexed. A silent cow: it becomes remarkable retroactively, when others vanish from the map. |
| **Month-4 GEO upgrade** (VISION §Bots) | "Am I showing up when someone asks ChatGPT for a plumber?" is a question owners are *starting to ask each other* — being the only one with a real answer is a cow, if it's framed in his words (see Part C). |

### Cut

| Element | Why it slid back into agency-land |
|---|---|
| **Mass webinar onboarding** (VISION §Growth Model, §Phase 2) | Plumbers do not attend webinars. This growth step is a fossil from the pre-pivot knowledge-worker persona and directly contradicts the unified-persona lock. A webinar funnel selects *against* the target owner. Replace with WhatsApp-native onboarding + referral (Part B ideas #11, #26). |
| **Courses as the primary trust layer** (VISION §Iceberg, §Phase 1 Trust & Funnel) | *Flagging a conflict, per the ground-truth rule:* VISION still names "Agentic Website Building + SEO" as the highest-priority content mission. For THIS persona — "near-zero time, allergic to jargon, doesn't want to learn marketing" — a course is homework, and homework is Gap 1's losing door. The course funnel harvests knowledge workers, the segment we demoted on 2026-08-21. Trust for this persona = **receipts** (live client sites, before/after Local Pack screenshots, a neighbor's referral), not education. Keep the course pipeline as internal capability (it prototypes Phase 4), stop treating it as the funnel top. |
| **Weekly digest denominated in impressions/clicks** (VISION §Phase 1.5 table) | "Impressions, clicks, leads this week vs last week" is a dashboard read aloud. The persona measures in "did the phone ring / did I get paid." Every digest line must be denominated in **calls, jobs, and shekels** — anything else is agency reporting with a bot accent. (This is a cut of the *unit*, not the digest — the digest itself is load-bearing.) |

### Pivot

| Element | Right instinct | New shape |
|---|---|---|
| **Content Bot (₪490/mo, "keyword cluster → article pipeline")** (VISION §Bots) | Ongoing content is the correct retention engine | The input is wrong. For this persona, content raw material is not a keyword plan — it's **his camera roll and voice notes**. Pivot Content Bot into the **Proof Engine** (Part B card #3): every finished job becomes the content. Same engine plumbing (Tamar→Noa pipeline, GEO scripts), radically different front door. The keyword-cluster shape re-emerges later only as internal targeting logic, never as the sold thing. |
| **Voice-first as Phase 1 design constraint** (VISION §Interaction Model) | Zero-keyboard is the right destination | Honesty check: the persona's *actual* zero-friction habitat today is **WhatsApp voice notes**, not a bespoke voice interface. Pivot the Phase 1 constraint from "every flow completable by a voice UI" to "every flow completable inside WhatsApp (voice note or one-tap)." Same principle, met where the owner already lives, with zero new-app adoption risk. The full voice agent stays the Phase 2/3 orchestrator surface. |
| **₪199/mo retainer bundle** (VISION §Bots table) | Recurring value justifying a retainer | As currently listed (page growth + GBP upkeep + digest), month 2 *feels* like maintenance — the classic churn shape ("what did I pay for this month?"). Pivot: load the rung with **visible weekly aliveness** — Proof Engine posts, review flywheel activity, the Local-Pack score (Part B #8) — so the owner *sees* his presence move every single week. Price stays ₪199; the contents get louder. Detail in Part C. |
| **Ads Bot as presumptive product #2** (VISION §Bots — "deferred behind Site Bot proof") | Sequencing behind proof is right | The presumption that Ads is *next* deserves a challenge. For this persona the next bleeding wound after "found" is not "more demand" — it's **captured demand leaking** (missed calls, slow quotes). Part C argues the Phone/Lead-Rescue Bot has a stronger claim to the #2 slot than Ads Bot. This is Eitan's fork #1. |

---

## Part B — Exhaustive Value-Idea Generation

**A design pattern worth naming (found in the codebase, git `828f45e`):** the shipped review
flywheel never messages the end-customer — WAO drafts, notifies the *owner*, and hands him a
ready-to-forward text, because the owner already holds the consent relationship
(`src/lib/crm/reviewFlywheelCopy.ts`, Amendment-13 note inline). Call this the
**owner-forwards pattern**. It converts most outbound-shaped ideas below (Memory Loop, seasonal
campaigns, win-back, referral cards) from §30A-gated to compliance-light at launch, at the cost
of one owner tap — which fits "approve, don't manage" perfectly anyway. It is the default
outbound posture for everything in this document.

### B.1 The raw list — 36 ideas before any filtering

Organized by the owner's moments of pain. **[NN] = net-new** (owner cannot buy this today from
WAO or the red-ocean market), **[RP] = repackaging/reuses existing arsenal as its core**.
Net-new count: 27/36 (75% — clears the two-thirds bar).

**"The phone rang and I was on a job — I lost the lead."**
1. [NN] **Missed-call WhatsApp rescue** — unanswered call triggers an instant WhatsApp from the business number: "אני באמצע עבודה — שלח לי תמונה של הבעיה ואחזור אליך" (draft). AI triages, collects details, proposes a callback slot. Inbound-initiated → §30A-clean.
2. [NN] **Hebrew AI phone receptionist** — the business line answers itself when the owner can't: qualifies the job, gives a ballpark from the owner's price rules, books a slot. The full ambition of #1.
3. [NN] **Tire-kicker filter** — AI pre-qualifies every lead (location, urgency, budget signals) so the owner's limited callback time goes only to real jobs.
4. [NN] **End-of-day voice digest** — one WhatsApp voice note at 18:00: "היו לך 4 פניות היום; שתיים קבעתי, אחת מחכה לאישור מחיר" (draft). One yes/no decision per item.
5. [NN] **Business-line virtual number** — separable, trackable, AI-answerable second number. (Really plumbing for #1/#2/#19, listed for completeness.)

**"It takes me two days to send a quote — by then they hired someone else."**
6. [NN] **Photo-quote bot** — customer WhatsApps a photo of the problem → vision model + the owner's price rules draft a quote range → owner approves with one tap → quote lands in 5 minutes. Speed-to-quote as the product.
7. [NN] **Quote pages that sell** — the approved quote arrives as a mini-page: price + the owner's reviews + before/after photos of similar jobs, not a bare number in a text bubble.
8. [NN] **Lost-quote chaser** — un-answered quotes get one polite, timed follow-up nudge (owner-approved batch). Quotes die of silence more than of price.

**"A bad review is killing me and I don't know how to answer it."**
9. [RP] **Review flywheel** — post-job, perfectly-timed WhatsApp review ask, one tap to Google. (Partially built — see git `828f45e`; reuses wa.me delivery + approval log.)
10. [NN] **Bad-review first-responder** — new ≤3★ review → AI drafts the calm Hebrew reply within minutes → owner approves by voice → posted. Also detects policy-violating reviews and files the Google removal request.
11. [RP] **Review recycler** — 5★ reviews auto-become GBP posts, site testimonials, and quote-page proof strips. (Reuses GEO content engine + verify crawler.)
12. [NN] **Mention radar** — watches the places Israeli owners actually get discussed (Google, Facebook groups, מדרג-class directories) and alerts with a drafted response.

**"My best customers forget I exist until they need me again."**
13. [NN] **Memory bot** — service-interval nudges from CRM history ("דוד שמש טופל אצלך באוגוסט שעבר — לקבוע בדיקה?" draft). Owner approves each batch. §30A existing-customer conditions apply.
14. [NN] **Seasonal campaigner** — the bot knows the vertical's calendar (מזגנים לפני הקיץ, מרזבים לפני הגשם) and proposes the timed past-customer batch + matching GBP post, pre-written, one yes.
15. [NN] **Maintenance-plan builder** — WAO builds the *owner* his own subscription: annual service plans sold to his past customers, billed and reminded automatically. WAO gives the plumber recurring revenue — the most ambitious idea on this list.
16. [NN] **Win-back sweep** — customers gone quiet 18+ months get one respectful "still here" touch. Same §30A gate as #13.

**"I did a beautiful job but have no way to show it."**
17. [NN] **Before/after proof bot** — owner snaps two photos on-site → AI produces the GBP post, the site gallery entry, and the review-ask, all from those two frames. His camera IS his marketing department.
18. [NN] **Job-to-page engine** — each completed job (with end-customer consent) becomes an authored case-study page on the core-30 site. *Strategic double-win: this is a live feed of the real local facts Gate 1 requires* — the facts-intake gate stops being a form and becomes a byproduct of working.
19. [NN] **Voice-note-to-content** — 30 seconds of the owner talking ("החלפתי היום דוד בחולון, היה מסובך כי…") → an authored page section, GBP post, or FAQ answer. (VISION Phase 4 pulled forward as a narrow, buildable slice.)
20. [NN] **60-second reel maker** — job clips → captioned vertical short → GBP/Meta. (Phase 4 territory; listed, culled below.)

**"Am I even showing up when someone asks ChatGPT for a plumber?"**
21. [RP] **AI-citation monitor** — monthly "here's what ChatGPT/Gemini say when asked for your trade in your city" report + the fix loop. (The Foresight lead-magnet, matured into the month-4 GEO upgrade's public face.)
22. [NN] **Agent-bookable business** — structured data + endpoints so a customer's AI assistant can get a quote and book directly. "When someone's AI searches for a plumber, you're the one it can actually *talk to*." The far-horizon ambitious bet.

**"I never know which marketing actually made the phone ring."**
23. [RP] **"What made the phone ring" ledger** — monthly plain-Hebrew answer: "8 שיחות: 5 מגוגל מפות, 2 מהאתר, 1 מהמלצה" (draft). (Reuses reveal-number tracker + CRM gclid base; the net-new part is the unified owner-language rollup.)
24. [NN] **Revenue voice-logging** — "WAO, סגרתי את הדוד בחולון, 2,400 שקל" → CRM ties shekels to source → "האתר הכניס לך 18 אלף שקל ברבעון." Turns attribution from a dashboard into a bank statement.
25. [RP] **₪49 desktop DNI add-on** — already speced/priced (VISION DNI gate). Listed as arsenal, not a new idea.

**"Getting paid is its own job."** *(admin-adjacent — the persona's pain doesn't stop at marketing)*
26. [NN] **Payment-nudge bot** — polite automated Hebrew reminders on unpaid invoices. Transactional to an existing customer → compliance-light.
27. [NN] **Voice invoicing** — "תוציא חשבונית" → integration with Green-Invoice-class Israeli providers. (Listed, culled — off-core.)
28. [NN] **Price-benchmark whisper** — anonymized cross-client data: "אינסטלטורים באזורך גובים 450 ₪ על זה." (Needs scale that doesn't exist yet.)

**"I win jobs from people, not platforms."** *(referral & local fabric)*
29. [NN] **Referral engine** — right after a 5★ review lands, the happy customer gets a shareable "friend card" link. Catches advocacy at its peak second.
30. [NN] **WAO trade network** — WAO's own clients cross-refer: the plumber's bot recommends the WAO electrician for the job he can't take. A network effect literally no agency can copy, and it compounds with every onboarded client.
31. [NN] **QR proof kit** — printed QR for the van/invoice → review flow + tracked link. Offline→online bridge. (Physical logistics; culled.)
32. [NN] **Neighborhood echo** — post-job flyer/notice to the building ("תיקנו הרגע נזילה אצל השכן"). (Culled — physical labor + consent optics.)

**"I don't know where I stand."** *(status & competitive)*
33. [NN] **Local-Pack sports score** — weekly: your map position for your top queries vs. the three names around you; alert + proposed fix when overtaken. Turns SEO into a league table the owner *wants* to check. (Reuses the verification crawler as its sensor.)
34. [NN] **"You got overtaken" instant alert** — the event-driven sibling of #33; the push that makes the retainer feel like a bodyguard.
35. [RP] **GBP Q&A auto-seeder** — monitors/answers the GBP Q&A section. (Feature, not product; folds into retainer.)
36. [NN] **Emergency-slot yield** — owner says "פנוי אחר הצהריים" → "available now" badge on site/GBP. (Culled — thin, real-time-fragile.)

### B.2 First cull → the surviving cards

Cull logic: merge duplicates (#1+#2+#3+#5 → one Phone Bot ladder; #17+#18+#19 → one Proof
Engine; #9+#10+#11 → one Reputation loop; #13+#14+#16 → one Memory loop; #33+#34 → one Score),
cut the physical-labor and premature ideas (rationale in Part E). Ten cards survive.

---

#### Card 1 — Phone Bot (Lead Rescue → AI Receptionist ladder)
| Field | Content |
|---|---|
| Owner's-words pain | "הייתי מתחת לכיור, הטלפון צלצל שלוש פעמים — הלך לי לקוח." |
| Why the market ignores it | Agencies sell *demand generation* because that's what they can invoice for; captured-demand leakage has no billable-hours shape. Call-answering services exist but are human, expensive, and know nothing about the trade. |
| WAO's unfair right to win | Approve-don't-manage loop + WhatsApp delivery + CRM signal base; and only WAO sits on both the marketing AND the lead record, so the rescue message knows what the business does and what a job is worth. |
| Build cost | **Net-new-heavy** (call-event detection / virtual number, real-time messaging), staged: v1 = missed-call → WhatsApp text rescue (moderate); v2 = AI qualification dialogue; v3 = Hebrew voice answering. WoZ throughput: v1 fine (async, batchable); v3 hard (real-time, can't be Wizard-of-Oz'd at scale) — which is exactly why v1 ships first. |
| Remarkability test | **Y — the strongest on this list.** "הטלפון שלי עונה לבד וסוגר לי עבודות" is a sentence that travels between vans at the supplier counter unaided. |
| Compliance gate | None for inbound-triggered response (caller initiated contact). §30A applies only if messaging extends beyond the inquiry context; Amendment 13 if call recording/identifier-sharing is added (same regime as the DNI gate). |

#### Card 2 — Photo-Quote Bot
| Field | Content |
|---|---|
| Owner's-words pain | "עד שישבתי בערב להוציא הצעת מחיר — הוא כבר סגר עם מישהו אחר." |
| Why the market ignores it | Quoting is "operations," invisible to marketing vendors; and until multimodal LLMs, a photo of a burst pipe wasn't machine-readable. The capability window opened recently and nobody in this market has walked through it. |
| WAO's unfair right to win | Vision-LLM + the owner's own price rules + one-tap approval is the approve-don't-manage loop applied to the highest-intent moment in the funnel. Quote pages (idea #7) reuse the site engine + review assets WAO already holds. |
| Build cost | **Net-new-light/medium** — WhatsApp intake + vision call + template + approval tap; no real-time constraint (5 minutes is the promise, not 5 seconds). WoZ throughput: excellent — founder can literally be the approval fallback at pilot scale. |
| Remarkability test | **Y.** "שלחתי תמונה, קיבלתי מחיר תוך חמש דקות" — the *customer* tells the story too, which markets the owner AND WAO simultaneously. |
| Compliance gate | None (customer-initiated). Price-rule liability is contractual, not regulatory: quotes go out as ranges, owner-approved. |

#### Card 3 — Proof Engine (job → photos/voice-note → pages, posts, review-ask)
| Field | Content |
|---|---|
| Owner's-words pain | "עשיתי עבודה יפה — ואין לי שום דרך להראות את זה." |
| Why the market ignores it | Agencies need the owner to *supply* content, he never does, so they fill sites with stock filler — which is exactly what Google's June 2026 spam update now punishes. The market's laziness became a policy liability they can't escape. |
| WAO's unfair right to win | The Tamar→Noa authoring pipeline + GEO engine + Gate-1 discipline already exist. Crucially, **this idea *solves* Gate 1's hardest problem**: the per-page real-local-facts requirement is fed by an automatic stream of genuinely local, genuinely real jobs. Compliance constraint → content moat. |
| Build cost | **Reuses-existing-plumbing** (heaviest reuse on the list): intake via WhatsApp, authoring via the existing pipeline, publishing via the existing deploy path. WoZ throughput: excellent — inherently batchable, no real-time. |
| Remarkability test | **Y.** "אני מצלם את העבודה — והאתר שלי מתעדכן לבד" is approve-don't-manage made visible weekly. |
| Compliance gate | End-customer consent for photos/addresses (privacy, but contractual/consent-form level — a checkbox in the job flow, not a legal build). No §30A (nothing outbound to third parties). |

#### Card 4 — Reputation Loop (flywheel + bad-review first-responder + recycler)
| Field | Content |
|---|---|
| Owner's-words pain | "ביקורת אחת רעה יושבת לי בראש הדף — ואני לא יודע מה לענות." |
| Why the market ignores it | Review management exists as enterprise SaaS (English, dashboard-heavy, self-serve) — nothing serves a Hebrew micro-owner who will never log into a reputation dashboard. The response itself is a *writing* problem, which agencies can't do at ₪-viable cost and SaaS can't do in native Hebrew. |
| WAO's unfair right to win | Hebrew authoring quality (the Tamar→Noa chain) is the core differentiator here; plus GBP API access already in the delivery path, plus timing signals from the CRM (job closed = the perfect review-ask second). Flywheel v1 is *already built* (git `828f45e`): lead-closed trigger in `leads/route.ts` → owner-notify wa.me message + ready-to-forward customer template (`reviewFlywheelCopy.ts`, copy pending Tamar) + per-client queue store + read-only `/reviews/dashboard`. What's missing is the loop's back half: review polling, the bad-review first-responder, and the recycler. |
| Build cost | **Reuses-existing-plumbing** + light new (review polling, response drafting). WoZ: excellent — async, batchable. |
| Remarkability test | **Y.** "ענו לי על ביקורת רעה תוך עשר דקות, בעברית שנשמעת כמוני" — and the removal-request service on policy-violating reviews is a story owners actively swap. |
| Compliance gate | None material. Google review-policy process only. |

#### Card 5 — Memory Loop (service-interval nudges + seasonal campaigner + win-back)
| Field | Content |
|---|---|
| Owner's-words pain | "הלקוחות הכי טובים שלי שוכחים שאני קיים עד שמשהו מתפוצץ אצלם." |
| Why the market ignores it | Requires per-customer job history + service-interval knowledge per trade — data no agency holds and no horizontal CRM ships pre-configured for an Israeli plumber. Email-marketing tools exist but assume a marketer operates them. |
| WAO's unfair right to win | The CRM signal base (slug/customerId/closedAt) already records exactly when what was done; the bot only needs trade-interval rules on top. Approval-batch UX already designed. |
| Build cost | **Net-new-light** on top of existing CRM. WoZ: excellent — monthly batches. |
| Remarkability test | **Y (quiet cow).** The owner won't rave about the mechanism — he'll rave about the outcome: "החודש חזרו אליי ארבעה לקוחות ישנים בלי שהרמתי טלפון." |
| Compliance gate | **§30A — real but manageable, and largely sidestepped by a pattern already in the codebase:** the shipped review flywheel (git `828f45e`, `reviewFlywheelCopy.ts`) deliberately has WAO message only the *owner*, handing him a ready-to-forward text — WAO never contacts the end-customer, whose consent relationship the owner already holds. **Adopt this owner-forwards pattern as the default for all Memory Loop sends.** Direct-send automation (with existing-customer exemption + opt-out) becomes a later optimization, not a launch gate. |

#### Card 6 — Local-Pack Sports Score (+ "overtaken" alerts)
| Field | Content |
|---|---|
| Owner's-words pain | "אין לי מושג איפה אני בגוגל — ואם מישהו עקף אותי, אני אחרון שיודע." |
| Why the market ignores it | Rank trackers exist for SEO professionals — priced, worded, and dashboarded for marketers. Nobody has translated "rank tracking" into a weekly one-line league table a tradesman reads in WhatsApp. |
| WAO's unfair right to win | The verification crawler already exists as the sensor; the digest channel already exists as the screen. This is also the retention spine of the ₪199 rung — it makes the retainer *observable*. |
| Build cost | **Reuses-existing-plumbing** + light new (scheduled position checks, delta logic). WoZ: excellent. |
| Remarkability test | **Y.** Competitive standing is supplier-counter conversation by nature: "אני מספר 2 במפות בעיר שלי" is a brag with WAO's name attached to it. |
| Compliance gate | None. |

#### Card 7 — Owner-Language ROI Ledger (attribution + revenue voice-logging)
| Field | Content |
|---|---|
| Owner's-words pain | "אני משלם — אבל אין לי מושג מה מזה בכלל עובד." |
| Why the market ignores it | Real attribution threatens the agency's own invoice; vagueness is their business model (red_ocean §3.2 — bold claims, zero attribution). Structural conflict of interest → structurally unserved. |
| WAO's unfair right to win | The gclid-to-revenue CRM chain is already architected (VISION Phase 3.5); reveal-number tracker shipped; voice-logging closes the loop with 10 seconds of owner effort. Proof-not-promises (blue_ocean Gap 5) becomes a monthly personal bank statement. |
| Build cost | **Reuses-existing-plumbing** + light new (rollup + voice-log intake). WoZ: excellent. |
| Remarkability test | **Borderline-Y.** Not a story on its own — but it is the *evidence layer* that makes every other story credible, and it feeds the public case-study moat (red_ocean §5.3). Keep as infrastructure-grade priority. |
| Compliance gate | Amendment 13 only if identifiers flow to third parties (the existing ECL/DNI gates); the WAO-internal ledger itself is clean. |

#### Card 8 — Referral Engine + WAO Trade Network
| Field | Content |
|---|---|
| Owner's-words pain | "כל העבודות הטובות שלי מגיעות מפה לאוזן — אבל אין לי שליטה על זה." |
| Why the market ignores it | Referrals happen *between* businesses and *between* customers — no single-client agency has standing to operate that graph. It's structurally invisible to a vendor who serves clients one at a time. |
| WAO's unfair right to win | Only WAO will hold a *portfolio* of same-area, adjacent-trade micro-businesses under one bot fabric. The plumber's bot recommending the WAO electrician is a compounding network moat: **every new client makes every existing client's product better.** No competitor can copy it without first building WAO. |
| Build cost | Referral cards: **net-new-light** (timed shareable link post-review). Trade network: **net-new-medium**, and gated on density (needs N clients per area). WoZ: fine — async. |
| Remarkability test | **Y, double.** The friend-card is remarkable to customers; the trade network is remarkable to *owners* — "ה-AI של האינסטלטור שולח לי עבודות" is also WAO's own best acquisition channel. |
| Compliance gate | Referral consent from the sharing customer (light). Trade-network lead-passing: none material (B2B, opt-in). |

#### Card 9 — AI Visibility, Owner-Worded (month-4 GEO upgrade's public face)
| Field | Content |
|---|---|
| Owner's-words pain | "הבן שלי שאל את ChatGPT מי מתקן דודים באזור — ואני לא הייתי שם." |
| Why the market ignores it | The GEO/AEO category is hyped at enterprises and content-brands; for micro-local trades nobody even measures it, and the funded players fight over the keyword auction WAO deliberately avoids (blue_ocean §8, banned lane). |
| WAO's unfair right to win | The entire GEO engine + verify crawler + citation-checking already exist; the ≥90-day GSC gate is already wired into Site Bot delivery. This card is *packaging*, not build: the upgrade's story becomes "אתה מופיע כשה-AI עונה" instead of "GEO optimization." |
| Build cost | **Reuses-existing-plumbing** almost entirely (citation checks + report skin). WoZ: excellent. |
| Remarkability test | **Y.** Showing an owner a screenshot of ChatGPT recommending him — or failing to — is a jaw-drop demo. It's also inherently shareable ("תראה מה זה אמר עליי"). |
| Compliance gate | None. |

#### Card 10 — Maintenance-Plan Builder (WAO gives the OWNER a subscription business)
| Field | Content |
|---|---|
| Owner's-words pain | "כל חודש מתחיל מאפס — אין לי הכנסה קבועה." |
| Why the market ignores it | This is a *business-model upgrade*, not a marketing service — outside every agency's category. It needs billing + reminders + service history + customer comms in one fabric, which only WAO's stack assembles for this segment. |
| WAO's unfair right to win | Memory Loop (Card 5) + payment rails (Takbull) + CRM history are the three ingredients, all on the roadmap anyway. WAO selling retainers *understands* retainers — it teaches its own model to its clients. |
| Build cost | **Net-new-heavy** (billing on behalf of the owner, plan terms, churn handling) and gated on Takbull being fully closed. WoZ: moderate — plan sales are batchable, but money-handling raises the floor on reliability. |
| Remarkability test | **Y — category-breaking.** "WAO הפך לי את העסק לעסק עם מנויים" is the single most repeatable owner story on this list. Also the deepest lock-in WAO could ever have: cancelling WAO would mean dismantling the owner's own recurring revenue. |
| Compliance gate | Consumer-billing/renewal regulations (Israeli continuous-transaction rules) + §30A for plan-marketing messages to past customers (same consent capture as Card 5). The heaviest gate on the list — priced into its later sequencing. |

---

## Part C — The Offer Ladder

Current ladder (locked 2026-08-21): **₪9.90 preview → ₪199/mo retainer → ₪299/mo GEO at month 4.**
Verdict: **the skeleton holds — no rung's price needs changing.** What needs changing is what
each rung *visibly does*, plus one genuinely new rung. No random numbers below; every pricing
thought is flagged as a range for Eitan/Dror, not a decision.

### Rung 0 — ₪9.90 preview: reinforce, add one twist
Keep exactly as is. One high-leverage addition from this pass: bundle the **AI-visibility
snapshot** (Card 9's checker, run once, read-only) into the preview — "here's the site you could
have, AND here's what Google Maps + ChatGPT say about you today (nothing)." The
before-state makes the ₪199 decision emotional, and it costs ~nothing (the checker exists as a
lead-magnet design in the Foresight doc). The preview stops being "look at a site" and becomes
"look at your absence."

### Rung 1 — ₪199/mo retainer: same price, louder contents (this is the churn defense)
Current bundle (page growth + GBP upkeep + digest) is real value that *reads* like maintenance.
Reinforce with the three near-pure-plumbing cards so month 2+ is visibly alive weekly:
- **Proof Engine (Card 3)** — replaces "2–4 refreshed pages/month" as the *story*: "your jobs
  become your site." Same engine underneath, Gate-1-compliant by construction.
- **Reputation Loop (Card 4)** — review flywheel + bad-review first-responder in the base rung.
  The first-responder is the emotional insurance policy that makes ₪199 non-cancellable.
- **Local-Pack Sports Score (Card 6)** — the digest's spine, denominated in map positions,
  calls, and shekels (Card 7 ledger as the units). Never impressions.

Rationale for bundling rather than à-la-carte: each is cheap (plumbing reuse), and the rung's
job is retention density — one fat, alive rung beats three thin upsells that each add a
cancellation decision. This *raises* delivered value at flat price, which is deliberate: the
₪199 lock was priced against the maintenance bundle; the purple-cow bundle makes it a bargain,
and bargains at the retention rung are how a one-founder company survives churn math.

### Rung 2 — month-4 ₪299/mo: keep, re-skin in owner language
Keep the GSC-gated mechanics untouched — the upgrade's checkout scaffolding already exists
(`/geo/upgrade` product page + init/callback routes + pay page, git `828f45e`), so this rung is
a packaging task, not a build. Sell it as **"תופיע גם כשה-AI עונה"** (Card 9), never as
"GEO upgrade." The monthly citation screenshot is the renewal ritual.

### The NEW rung — Phone Bot (Cards 1+2 merged: rescue + photo-quote)
This is the pass's structural proposal: **a second product rung between the retainer and the
GEO upgrade — the "capture" rung.** Site Bot makes the phone ring; Phone Bot makes sure ringing
becomes jobs. Staged exactly like Site Bot was:
- **v1 (buildable near-term):** missed-call WhatsApp rescue + photo-quote with owner approval.
  Async, WoZ-friendly, no real-time infrastructure.
- **v2/v3:** AI qualification dialogue → Hebrew voice receptionist (the Phase-2/3 orchestrator's
  first customer-facing voice surface — this is where VISION's voice-first principle lands
  *naturally* instead of being forced into Phase 1).
- **Pricing posture (range, not a number — Dror to price):** ₪149–₪249/mo add-on territory,
  anchored to "one saved job pays the month." Margin is LLM + WhatsApp API — near-zero marginal,
  consistent with the property-manager model (WhatsApp Business API costs ride per-client, like
  DNI's pass-through logic).
- **Why this challenges Ads Bot for the #2 slot:** Ads Bot spends the owner's money to create
  more of the demand he's currently *leaking*. Sequencing capture before amplification is both
  better product logic and a better story ("first we stopped your bucket leaking — now let's
  pour more in"), and it de-risks Ads Bot's own ROI case later. Ads Bot doesn't die; it moves
  to #3, arriving when the phone-answer + attribution fabric can prove its value honestly.

### Net-new products proposed (the required ≥3, majority-net-new)
1. **Phone Bot** (Cards 1+2) — the new rung/standalone. Near-zero marginal cost, highest
   remarkability, staged v1→v3. **This is the ambitious new-rung requirement, satisfied.**
2. **Referral Engine → WAO Trade Network** (Card 8) — starts as a retainer feature (friend
   cards), matures into a standalone network layer that is simultaneously WAO's own acquisition
   engine. Near-zero marginal; compounding moat.
3. **Maintenance-Plan Builder** (Card 10) — a second ambitious standalone for the post-Takbull,
   post-density phase: WAO installs a subscription business inside the client's business.
   High-margin (billing rails + messages), category-breaking, deliberately sequenced last.
4. *(Infrastructure-grade, bundled not sold):* **Owner-Language ROI Ledger** (Card 7) — not a
   SKU; it is the units every SKU reports in, and the public-case-study moat feeder.

---

## Part D — The One Purple Cow Line

Every idea above is one sentence wearing different clothes:

> **The owner's ordinary workday IS the marketing. He fixes, snaps, and answers "כן" — and the
> site, the map, the reviews, the quotes, and the phone handle themselves.**

The single "wait, nobody does that" formulation — the sentence for the top of every page:

> **"אתה עושה את העבודה. השיווק עושה את עצמו."**

And the moment-of-magic proof line behind it: *"צילמת את העבודה? זהו. האתר שלך כבר יודע."*

### Sabra-voice positioning narrative
**(STRATEGIST DRAFT — singular male, 12–15 word sentences, explicitly NOT voice-approved.
Route: Tamar → Noa → Eitan human gate before any use.)**

> אתה לא צריך ללמוד שיווק. אתה צריך שהטלפון יצלצל.
> WAO בונה לך אתר אמיתי, ומכניס אותך למפה של גוגל.
> ומשם — העבודה שלך היא הפרסום שלך.
> צילמת תיקון יפה? האתר שלך מתעדכן לבד.
> קיבלת ביקורת? יש תשובה מוכנה תוך דקות, בעברית שלך.
> פספסת שיחה על הסולם? הלקוח כבר קיבל הודעה ממך.
> אתה רק אומר ״כן״ — וחוזר לעבודה.
> והכול נשאר שלך: החשבונות, האתר, הלקוחות. תמיד.

---

## Part E — Kill-List & the Top 3

### Killed ideas — what would have made each a purple cow, but doesn't
- **#20 Reel maker** — would be a cow if AI video output were reliably native-feeling in Hebrew
  today; it isn't at the quality bar the brand needs, and it's VISION Phase 4's job (2027). Not
  dead — premature.
- **#22 Agent-bookable business** — the most purple idea on the list, killed *for now* because
  customer-side AI-agent commerce has no Israeli install base yet; a cow nobody can see is a
  cow that doesn't market. Park inside Card 9's radar; revisit the moment agentic booking
  traffic appears in any client's logs.
- **#27 Voice invoicing** — would be a cow as part of an ops suite; standalone it's a feature of
  Green-Invoice-class incumbents' territory with zero marketing moat. Integrate later (Card 10
  needs the rails anyway), never sell alone.
- **#28 Price benchmark** — a cow only with cross-client density WAO doesn't have; with n=2
  it's fabrication. Auto-revives at 10+ clients per vertical (same trigger as VISION Gate 3
  portfolio bidding).
- **#31 QR proof kit** — physical printing/logistics breaks near-zero-marginal; the digital half
  (tracked link) already lives inside Cards 4/8. The atom version stays dead.
- **#32 Neighborhood echo** — needs the *customer's neighbors'* goodwill and skirts privacy
  optics ("we were just inside your neighbor's home"); the trust cost exceeds the lead value.
  A cow with a bad smell is not a cow.
- **#36 Emergency-slot yield** — real-time state on GBP/site is fragile, and one stale
  "available now" badge burns trust permanently. The value doesn't cover the failure mode.
- **#26 Payment nudges** — genuinely valuable, but it's Card 10's embryo; selling it alone
  creates a cheap anchor for what should later be the premium product. Deferred into Card 10.
- **#12 Mention radar** — Facebook-group monitoring is ToS-fragile and scraping-shaped;
  Google-surface monitoring already lives in Card 4. The extended version dies of compliance
  overhead per lead delivered.

### The Top 3 to pursue now

**1. Proof Engine (Card 3)** — *(Impact × Urgency) ÷ Effort: highest on the board.*
Impact: converts the ₪199 rung from "maintenance" to "alive," feeds Gate-1 compliance
automatically, and generates the public case-study moat. Urgency: the retainer's churn story
starts with pilot client #1 — month 2 must already feel alive. Effort: lowest of any card
(heaviest plumbing reuse: WhatsApp intake → Tamar/Noa pipeline → existing deploy).
**Dependency that must be true first:** one live pilot client actually delivering jobs (the
current critical path — GBP credentials → first WoZ delivery — is unchanged by this pass).
**Riskiest assumption:** the owner will actually send photos/voice notes without being nagged.
De-risk in WoZ: Eitan personally prompts pilot #1 after each job and measures how much prompting
"consistent" costs.

**2. Phone Bot v1 — missed-call rescue + photo-quote (Cards 1+2)** — *the remarkability engine.*
Impact: attacks the persona's single loudest pain and creates the word-of-mouth line the whole
brand can ride ("הטלפון שלי עונה לבד"). Urgency: high — this is the differentiation that makes
WAO's #2 product a category of one instead of "another Ads manager"; every month it doesn't
exist, Site Bot is selling "found" into a market whose real scream is "leaking."
Effort: moderate (WhatsApp Business API + call-event detection; no real-time voice yet).
**Dependency that must be true first:** a reliable missed-call detection path per client
(virtual/business number strategy — idea #5's plumbing decision) plus WhatsApp Business API
capacity per client under the property-manager model.
**Riskiest assumption:** missed-call events can be captured cleanly *without* forcing the owner
to change his phone number or carrier setup — if number-porting friction is high, v1's funnel
dies at onboarding. Spike this technically before any build commitment.

**3. Reputation Loop (Card 4)** — *the trust-compounder, front half already shipped.*
Impact: reviews are the highest-weight local ranking + conversion factor for this segment, and
the bad-review first-responder is emotional insurance that retains. Urgency: every pilot client
job without a timed review-ask is compounding value permanently lost. Effort: lowest of the
three — flywheel v1 (trigger → owner-notify → forward template → queue → dashboard) is committed
in git `828f45e`; remaining work is Tamar's copy pass on the placeholder Hebrew
(`handoff/pending/2026-08-22_006`), review polling, and drafted responses.
**Dependency that must be true first:** GBP API credentials live in the environment (the same
blocker already flagged as critical-path in VISION §Phase 1) — review read/reply rides on it.
**Riskiest assumption:** Hebrew review replies pass the Sabra human gate at a batchable rate —
if every reply needs deep human editing, WoZ throughput per client per week gets ugly. Measure
edit-distance on the first 20 real replies.

---

## The three forks — RESOLVED 2026-08-23 (decision delegated by Eitan to Lior-on-Fable)

1. **#2 product = Phone Bot, not Ads Bot.** Capture before amplification: Ads Bot spends the
   owner's money into a leaking funnel and carries the roadmap's heaviest external gates
   (Developer Token production approval, RMF dashboard, billing isolation); Phone Bot v1 is
   async, WoZ-friendly, gate-light, and owns the remarkability lane no competitor can say.
   Ads Bot moves to #3, arriving once the answer + attribution fabric can prove its ROI
   honestly. **Escape hatch:** if the missed-call-detection spike fails, v1 pivots to
   photo-quote-first (customer-initiated — no number plumbing) and rescue follows later.
   The ₪199 digest starts seeding Phone Bot now (the proven DNI digest-seeding pattern).
2. **Fat ₪199 bundle — Proof Engine + Reputation Loop + Sports Score all in the base rung.**
   The components are near-pure plumbing reuse, so add-on pricing would capture little margin
   while adding cancellation decisions to the churn-critical rung. Over-deliver at rung 1;
   monetize at rung 2 (GEO) and the Phone Bot rung. Revisit only if pilot delivery cost per
   client proves not-near-zero.
3. **Courses/webinars demoted to internal-capability status.** Existing assets stay live (sunk,
   residual SEO); the pipeline survives as the Phase-4 prototype; no new course build; mass
   webinars out of the growth model. Funnel top becomes receipts (₪9.90 preview + AI-visibility
   snapshot, case studies, referrals). **VISION.md amendment pending Eitan's go-ahead** — the
   ground-truth doc is his to change.

**Execution order under these decisions:** (1) Reputation Loop back-half — cheapest, front half
shipped, and its GBP-credential dependency is the critical path anyway; (2) Proof Engine;
(3) Phone Bot missed-call-detection technical spike (spike before any build commitment).
