# YouTube video ads: merged plan (Adam, 2026-11-12)

Merges three Fable 5.2 studies:
- docs/missions/youtube-video-big-ideas-lior-fable52-2026-11-12.md (Lior: verdict, audience, ideas, budget)
- docs/missions/youtube-video-tools-fable52-2026-11-12.md (realistic AI characters + ElevenLabs)
- docs/missions/youtube-video-animated-humour-fable52-2026-11-12.md (Contabo study, original concept, stack)

## Direction (Eitan: animated humour, ads up to 30s)
- **Format:** a 30s master per idea, plus a 15s cut-down, in 9:16 (Shorts) and 16:9 (in-stream). Demand Gen campaign on YouTube channels only.
- **Character:** "Dash", the tradesman's own scuffed work phone on the van dashboard. Its face is drawn on its screen and its jokes arrive as cartoon banners, so the ad works on mute. It is original and borrows nothing from Contabo.
- **Rule:** the cartoon shows only the problem. The solution is always the real product screen plus Eitan's real voice (and optionally 2–3s of him on camera). The split is about 20s cartoon / 10s real.
- **Lipsync risk is gone:** Dash's mouth is a shape on a screen, driven by the audio, so no Hebrew AI lip-sync is needed. Realistic talking AI characters are dropped (Hebrew lip-sync is unproven; character must not pose as a customer).

## First two ads
- **Site Bot: "Ghost van".** The customer searches and walks straight through his see-through van. The turn uses Lior's "three stops before she calls": profile, site, reviews. The real screen shows the service-tree site next to the matching Google profile.
  - CTA: the free check (/site-bot/audit).
  - Positioning: the full organic Google system, never "a website".
- **Ads Bot: "The meter".** Dash's screen is a taxi meter, and every click adds shekels while the phone stays silent. The real screen shows the owner's thumb marking a lead as real.
  - Line: learns from the leads you mark, not from clicks.
  - CTA: call with Eitan.
  - Media spend waits for Takbull ₪249.

## Stack
- **Script:** Tamar (waocopy) → Noa → Eitan's ear.
- **Character art:** Gemini image options → one paid human illustrator redraws the chosen design as layers (for clean ownership).
- **Voice:** ElevenLabs v4 for Dash (tested against v3); Eitan's real recorded voice for the closing line.
- **Gag shots:** Gemini Omni Flash (existing GEMINI_API_KEY).
- **Assembly, captions, end cards:** a scripted ffmpeg step in the repo (course-pipeline pattern). Maya checks RTL.

## One-week pilot
| Day | Work |
|---|---|
| 1 | Scripts + Noa; character options |
| 2 | Eitan picks the character; voice test |
| 3 | Layered art; assembly template |
| 4 | Build "The meter" |
| 5 | Build "Ghost van"; 16:9 and 15s cuts |
| 6 | QA by Noa, Maya and the policy check; Eitan's spot-check |
| 7 | Show to 5 tradesmen who aren't clients; decide |

**Pass criteria:**
- zero mispronunciations;
- on mute, 4/5 viewers get the problem;
- with sound, 4/5 get what the bot does and nobody hears a promise of results;
- nobody calls it a scam or a kids' app;
- a third episode can be made in a day for under $30.

## Cost
- **Tools:** about $60–120 (ElevenLabs Creator $22, Gemini images and video ~$35–50, Hedra fallback ~$20, music $0–30).
- **Illustrator:** a one-off fee; quote needed.
- **Media test (after the pilot passes):** Site Bot only, about ₪1,200–1,500 over 3 weeks, capped to the leads Eitan can call within a day. Ads Bot media waits for Takbull.

## Policy guardrails
- No ringing-phone finale, lead counter or before/after.
- Dash's banners must not look like real phone notifications, and no realistic ringtone.
- No Google logos or UI.
- No credit amount.
- The joke is on the clicks and the invisibility, never on the tradesman.

## Blocking before any media spend
1. The same-day path for a convinced viewer (the paid flow is off in prod; manual invoicing?).
2. Conversion actions firing on "free check completed" and "call requested".
3. The rewritten /site-bot is live, or the ad lands on the free check only.
