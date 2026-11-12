# AI video tooling for WAO YouTube ads: ElevenLabs v4 and realistic AI characters

*Researched 2026-11-12. Every external fact is dated to that day unless stated. Nothing was generated or tested; the Hebrew quality questions can only be settled by the pilot in section 5.*

## Bottom line

- **"ElevenLabs v4" is real.** Eleven v4 launched 2026-09-28, supports Hebrew, and supports cloning Eitan's own voice.
- **Hebrew lip-sync quality is unknown for every tool.** I found no review, demo or forum report testing any of them on Hebrew, so the plan starts with a cheap test.
- **Recommendation:** make the bot's real screen plus Eitan's voice the primary ad, and treat the lip-synced AI character as a challenger that must earn its place. A slightly-off talking mouth is the fastest way to lose a sceptical tradesman.
- **Spend to approve:** about $70–120 in tools, plus an optional ~$150 YouTube test budget.

## 0. What the repo does today

The course video engine is `scripts/render_lesson.py`: ElevenLabs TTS → Marp slides → ffmpeg MP4.

| Setting | Current value |
|---|---|
| Model | `eleven_v3` (`render_lesson.py:201`) |
| Voice | "Suburb", ID `bfGb7JTLUnZebZRiFYyq` (line 200) |
| Voice settings | stability 0.5, similarity_boost 0.75 |
| API call | Direct HTTP POST; the SDK is banned (v2.53.0 corrupted audio, per `.agents/skills/course-production/SKILL.md`) |
| Hebrew handling | Noa adds selective nikud (vowel marks) for ambiguous words, because the engine misreads homographs like ספק and לאתר |

- **Naming drift:** the skill file calls the voice "ElevenLabs Adam" while the code calls the same ID "Suburb", and `docs/missions/google-ads-course.md` says `eleven_multilingual_v3` while the code says `eleven_v3`. It is harmless but should be tidied when the model is bumped.
- **No ads brief yet:** there is no mission file for the YouTube-ads big ideas in `docs/missions/`.
- **Layout gap:** the engine is slide-based 16:9, so 9:16 Shorts need a new ffmpeg layout step. The TTS step is reusable as is.

## 1. ElevenLabs today

| Question | Answer | Source |
|---|---|---|
| Is there a v4? | Yes. Eleven v4 (`eleven_v4`) and v4 Turbo (`eleven_v4_turbo`) launched 2026-09-28. Use plain v4 for ads; Turbo is for live voice agents. | [TechCrunch](https://techcrunch.com/2026/09/28/elevenlabs-new-v4-speech-model-supports-more-expression-control-and-90-languages/), [models docs](https://elevenlabs.io/docs/overview/models) |
| Hebrew | Listed as supported (`he`) on v4, v4 Turbo and v3. Not supported on Multilingual v2 or Flash v2.5. | [models docs](https://elevenlabs.io/docs/overview/models) |
| Hebrew quality | Unknown on v4: no independent Hebrew test exists. The launch's biggest gains were cited for Japanese, Portuguese, Mandarin and Cantonese. | [TechCrunch](https://techcrunch.com/2026/09/28/elevenlabs-new-v4-speech-model-supports-more-expression-control-and-90-languages/) |
| Known Hebrew issue | Homographs. Other Hebrew teams also add nikud before the TTS call (one uses Dicta Nakdan). Whether v4 honours nikud the way v3 does is untested. | [GitHub PR](https://github.com/aios-co-il/aios/pull/1127) |
| v4 limits | No SSML, no Style or Speed sliders, and audio-tag following is "not yet fully reliable". The 10,000-character limit is ample for ads. | [v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4) |
| Voice cloning | Instant clones (1–2 minutes of audio) and Professional clones (30+ minutes of clean audio) both work on v4. | [v4 docs](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4) |
| Cloning Eitan | Allowed with his "explicit and informed consent". Record in Hebrew, in one speaking style, in a quiet room, because v4 copies noise and flaws. | [use policy, updated 2026-10-09](https://elevenlabs.io/use-policy) |
| API | Same endpoint the repo already uses; only the `model_id` changes. | [models docs](https://elevenlabs.io/docs/overview/models) |
| Commercial licence | Included from the Starter plan up; the free plan may not be used commercially. | [pricing](https://elevenlabs.io/pricing), [use policy](https://elevenlabs.io/use-policy) |
| Price tier | Creator, $22/month ($11 first month), 121,000 credits, includes one Professional clone. Starter is $6 with instant clones only; Pro is $99. | [pricing](https://elevenlabs.io/pricing) |

A 15-second Hebrew script is about 250 characters, so even 50 retakes use roughly 10% of a Creator month. The v4 credit rate is not printed on the pricing page; secondary sources quote $0.08 per 1,000 characters on the API ([eesel](https://www.eesel.ai/blog/eleven-v4)).

ElevenLabs also sells video now. "Avatars" (launched 2026-06-11, all paid plans) builds a reusable character from photos or a prompt, with TTS built in ([ElevenLabs blog](https://elevenlabs.io/blog/introducing-avatars)). Its Image & Video area also hosts third-party lip-sync models: HeyGen Avatar 4, Veed Fabric, Creatify Aurora, Sync Lipsync 2 Pro and OmniHuman 1.5 ([docs](https://elevenlabs.io/docs/eleven-creative/playground/image-video)). One Creator subscription can therefore run most of the lip-sync bake-off.

## 2. Realistic AI characters lip-synced to an external audio track

The tools split into three kinds:

- **Photo + audio → talking character.** This is what Eitan described.
- **Existing video + audio → re-synced mouth.** This needs a base clip first.
- **Text prompt → video with its own invented voice.** This cannot use an ElevenLabs track.

| Tool | Photorealism | Lip-sync from uploaded audio | Hebrew lip-sync evidence | Max clip | 9:16 | API | Ad rights | Price | Watermark |
|---|---|---|---|---|---|---|---|---|---|
| **HeyGen Avatar IV** | High; reviewers' most common top pick | Yes, photo + audio; API takes an audio asset | **Unknown.** One user anecdote says non-English results are poor | 30 min on Creator | Not verified | Yes, pay-as-you-go, about $2.31–3/min for photo avatars (sources conflict) | Not stated on pricing page; check ToS | Creator $29/mo | None on paid plans |
| **Hedra Character-3** | High; praised for expressions | Yes, photo + audio (audio required) | **Unknown** | Up to 10 min (secondary source) | Not verified | Yes, separate prepaid wallet | Yes, on all paid plans | Basic $20/mo | Not stated for paid plans |
| **Sync Lipsync 2 Pro** | Depends on the base video; output up to 4K | Yes, video + audio | **Unknown**; no language list published | 1 min on Hobbyist, 5 min on Creator | Follows input | Yes, about $0.07–0.08/sec | Not checked | About $1.25 per 15s clip | Not checked |
| **ElevenLabs Avatars** | Unknown; no independent reviews found | Uses its own built-in TTS; own-voice clone support not stated | **Unknown** | Not stated | Not stated | No direct API reported at launch (secondary source); Flows node only | Paid plans carry a commercial licence | Inside the $22 Creator plan | Not stated |
| **Kling Avatar 2.0 / Lip Sync** | High | Yes, audio upload | **Unlisted.** Official speech languages are EN/ZH/JA/KO | 60s (Lip Sync) or 5 min (Avatar), secondary sources | Yes | Via fal.ai, about $0.06–0.12/sec | Not checked | About $1–2 per 15s clip | Not checked |
| **Google Veo 3.1** | Very high | **No.** It invents the voice from the prompt | Hebrew speech not documented | 8s | Yes | Yes | Not checked | Not checked | SynthID invisible mark |
| **Runway Act-Two** | High | **No.** Needs a filmed "driving" performance | Not applicable | 3–30s driving clip | Not checked | Not checked | Not checked | Not checked | Not checked |
| **Synthesia** | Corporate-presenter look | Unclear for own audio | Third-party reviews claim Hebrew support; unverified | Not checked | Not checked | Not checked | Not checked | Not checked | Not checked |
| **Captions** | No data found | No data found | Unknown | — | — | — | — | — | — |

Sources: [HeyGen pricing](https://www.heygen.com/pricing), [HeyGen API docs](https://docs.heygen.com/docs/create-avatar-iv-videos), [HeyGen API pricing analysis](https://www.nocode.mba/articles/heygen-pricing), [HeyGen user reviews](https://www.producthunt.com/products/heygen/reviews), [Hedra pricing](https://www.hedra.com/play/pricing), [Hedra review](https://droidcrunch.com/hedra-review/), [Sync billing](https://sync.so/docs/product/billing), [Kling Avatar on fal.ai](https://fal.ai/models/fal-ai/kling-video/ai-avatar/v2/standard), [Kling lip-sync tutorial](https://www.atlascloud.ai/blog/tips/kling-ai-lip-sync), [Veo dialogue analysis](https://prompt-architects.com/blog/310-dialogue-and-lip-sync-in-ai-video), [lip-sync roundup](https://uselamina.ai/blog/best-ai-lip-sync-video-generators-in-2026), [Synthesia review](https://looksright.pages.dev/tools/synthesia).

**Ranking for this job (a provisional shortlist until the Hebrew test):**

1. **HeyGen Avatar IV** has the most mature photo + audio lip-sync and a real API.
2. **Hedra Character-3** is the best challenger, with clear commercial rights and a low price.
3. **Sync Lipsync 2 Pro** suits a full-scene character (a tradesman in a van, generated by Veo or Kling) rather than a talking portrait.
4. **ElevenLabs Avatars** is the most convenient but has the least evidence and weak automation.
5. **Kling Avatar** does not list Hebrew.
6. **Veo 3.1** is excellent for silent B-roll (background footage) but cannot follow our audio.
7. **Runway Act-Two, Synthesia and Captions** do not fit this job or have no data.

Lip-sync engines map sounds to mouth shapes, so in principle language should not matter (HeyGen's own claim). A competing vendor argues Hebrew throat sounds are under-represented in training data. Both are marketing claims, not tests.

## 3. Alternatives that avoid the lip-sync risk

| Option | Why it builds trust | Why it might not | Lip-sync risk |
|---|---|---|---|
| **A. AI character, no visible speech, plus voice-over** (plumber checking his phone, shot from behind or in a wide frame) | Shows the customer's world; cheap to vary by trade | Still synthetic; a generic "AI look" reads as stock footage | None |
| **B. Eitan on camera plus AI B-roll** | A real, named founder is the strongest trust signal for a ₪249/month service from an unknown brand; no disclosure issues | Needs his time per ad; harder to make 20 variants | None |
| **C. Screen capture of the real bot plus voice-over** (leads list, weekly report) | It is proof; tradesmen buy what they can see working; fully automatable in the existing engine | Can be dry; needs a strong first two seconds | None |
| **D. Lip-synced AI character** (Eitan's idea) | Scales to many variants and trades; novel | If the mouth is off in Hebrew it looks fake; must never pose as a customer | High until tested |

My read is that the strongest combination is **C with Eitan's own voice**, opened by two to three seconds of A or B as the hook. If Eitan narrates 15 seconds himself, a phone recording is free and fully authentic. The clone only pays off when we want many variants without booking him each time.

## 4. Policy

- **Google Ads AI label (2026-07-09).** Google added a "How this ad was made" panel on Search, YouTube and Discover ads. Ads made with Google's own AI tools are labelled automatically, and advertisers get "a control" to declare AI made elsewhere. A visible on-ad label "may" appear "based on local requirements". The official post does not say declaring is mandatory, although several blogs claim it is. Declare it anyway. ([Google blog](https://blog.google/products/ads-commerce/google-ads-ai-transparency-labels/))
- **YouTube upload disclosure.** A realistic AI-generated scene or person requires ticking "AI use: Yes" in YouTube Studio, and photorealistic content may get a label on the player. Cloning your own voice for voice-overs is explicitly listed as not needing disclosure. Repeated non-disclosure can lead to removal. The page does not say how this applies to ads specifically. ([YouTube Help](https://support.google.com/youtube/answer/14328491))
- **Google Ads misrepresentation.** "Manipulating media to deceive, defraud, or mislead others is not allowed", and neither are false endorsements or claims promising "an improbable result". There is no ban on synthetic people as such. ([Google Ads policy](https://support.google.com/adspolicy/answer/6020955))
- **What that means for us.** The AI character must be an obvious spokesperson or dramatisation: no invented name and business, no "I got 14 leads this week" in the first person. Real testimonials need real customers.
- **US benchmark.** The FTC rule in force since 2024-10-21 bans testimonials from people who do not exist. It is not Israeli law, but it is a sensible standard to follow. ([Sidley](https://datamatters.sidley.com/2024/08/30/u-s-ftcs-new-rule-on-fake-and-ai-generated-reviews-and-social-media-bots/))
- **Israeli law.** I did not verify Israeli consumer-protection rules on synthetic spokespeople. Add one question to the next legal review.
- **ElevenLabs use policy (2026-10-09).** It bans "deceptive advertisements" and false endorsement, and requires consent for cloning. It also requires AI disclosure where the law demands it or where silence would materially mislead. ([use policy](https://elevenlabs.io/use-policy))
- **Avatar-tool terms.** I did not read the HeyGen or Hedra terms of service line by line. Hedra's pricing page states commercial use on every paid plan; HeyGen's does not say. Check before the first paid ad runs.

## 5. Recommended stack and one-week pilot

**Primary stack (low risk):**
- **Voice:** ElevenLabs `eleven_v4` with Eitan's instant clone, and the current Suburb voice as the comparison.
- **Picture:** real UI capture of the leads list and weekly report, with animated captions.
- **Hook:** an optional two to three seconds of silent AI B-roll from Veo 3.1.
- **Assembly:** the existing ffmpeg engine with a new 9:16 layout.

**Challenger (Eitan's idea):** the same audio track drives a photoreal character through HeyGen Avatar IV, with Hedra Character-3 as the fallback. Add Sync Lipsync 2 Pro over a generated scene if neither portrait tool passes.

**Voice fallback:** stay on `eleven_v3` with the current nikud workflow if v4 misreads Hebrew, or have Eitan record the lines himself.

| Day | Step | Owner |
|---|---|---|
| 1 | Brief and two 15-second Hebrew scripts (one per bot), singular male, 12–15 words per sentence | Adam briefs; Tamar writes via waocopy |
| 1 | Proofread, homograph scan, nikud where needed | Noa |
| 2 | Eitan records about two minutes of clean Hebrew for the clone and approves the scripts | Eitan |
| 2 | Voice spike: each script on v4 with the clone, v4 with Suburb, and v3 with Suburb | Engineer; Noa listens |
| 3 | Lip-sync bake-off: the same audio through HeyGen, Hedra and ElevenLabs Avatars; one character per bot | Engineer |
| 3 | Hebrew lip-sync acceptance test (below) | Noa and Eitan |
| 4 | Build the 9:16 assembly; render version C for both bots, and version D only if it passed | Engineer; Roni verifies the files |
| 5 | Eitan's gut check on voice and look; set the AI disclosure; upload as unlisted | Eitan; Adam |
| 6–7 | Optional: small in-feed YouTube test of C against D | Dror sets up; Eitan approves spend |

**Cost estimate (USD):**

| Item | Cost |
|---|---|
| ElevenLabs Creator, one month | $22 ($11 if first month; $0 if WAO already subscribes) |
| HeyGen Creator, one month | $29 |
| Hedra Basic, one month | $20 |
| Sync and Veo credits, only if needed | $10–40 |
| **Tools total** | **about $70–120** |
| Optional YouTube test spend | about $150 (roughly ₪550) |

**Pass/fail criteria:**

- **Hebrew voice.** Zero mispronounced words across both scripts, as judged by Noa. Eitan says "that sounds like me" or "like a person". Otherwise fall back.
- **Hebrew lip-sync.** Play each clip muted, then with sound, to Noa, Eitan and two outsiders who are not told it is AI. It passes if lips close on every מ, ב and פ, there is no visible drift over 15 seconds, and no outsider says "fake" or "dubbed" unprompted. Any miss means D is dropped for now and C ships.
- **View-through.** If the paid test runs, D must match or beat C's view-through rate to stay in rotation. With about $150 this is a directional read, not a statistically solid one.
- **Eitan's gut check.** "Would I be comfortable if a client's plumber saw this with my name on it?" A no ends it.

## Decisions for Eitan

1. **Tool spend of about $70–120** for one month of ElevenLabs Creator, HeyGen and Hedra.
2. **Voice clone consent:** are you willing to record about two minutes of Hebrew so your voice is cloned on ElevenLabs?
3. **Ad test spend of about $150**, optional, for days 6–7.
4. **Publication:** nothing goes public without your day-5 approval.