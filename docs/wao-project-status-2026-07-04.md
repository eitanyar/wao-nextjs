# WAO — Project Status
*Adam · 2026-07-04 · all tracks*

## Course — "Build & SEO in the Age of AI"
22 / 23 lessons scripted & Noa-approved. 0 lessons in TTS, 0 videos rendered, 0 on YouTube.
Pipeline: Scripts ✓ → Review ← → TTS → Render → YouTube (currently at Review, ~8% overall).

**TTS GATE (all modules):** Review artifact not yet built. Eitan must approve slides + narration separately before any ElevenLabs credits are spent. Build artifact first.

| Module | Status |
|---|---|
| M1 · הראש לפני המקלדת | Not started (comes after M2 per production order) |
| M2 · בונים עם AI | L2-1→L2-3 Noa ✓; L2-4 Slides 1-9 Noa ✓; L2-4 Slide 10 Gil pending; TTS blocked |
| M3 · שגוגל יבין אותך | L3-1→L3-4 Noa ✓ (6 fixes applied); Gate 0 (Yonatan) not cleared; TTS blocked |
| M4 · להיות התשובה | L4-1→L4-4 Noa ✓ (7 fixes, L4-4 clean pass); Gate 0 not cleared; TTS blocked |
| M5 · עולים לאוויר | L5-1→L5-5 Noa ✓ (3 fixes); Gate 0 (Yonatan) cleared 2026-07-04; TTS blocked |
| M6 · האתר חי, ואתה עסוק | L6-1→L6-3 Noa ✓ (10 fixes); L6-3 CTA block Tamar+Noa locked; Gate 0 not cleared; TTS blocked |

## Bots

### GEO Bot (₪199/mo) — first cycle pending
Most advanced product — pipeline built, first cycle not yet complete.
- ✓ Pipeline built: gsc-pareto, geo-generate-content, geo-verify
- ✓ LP live at /geo, client portal at /client/login + /client/dashboard
- ✓ Pilot retter.co.il — 20 actions generated, quality-gated
- ⚠ **Actions not yet sent to Hadas** — first complete cycle (send → implement → verify) is the Phase 1R milestone
- ✗ GSC OAuth (/api/gsc/auth + /api/gsc/callback) not built — currently manual setup
- Ads Bot LP (/ads-bot) drafted but held until retter cycle completes

### Site Bot (₪9.90 trial → ₪1,490 one-time) — MVP not built
Front door for micro-SMBs.
- ✓ Onboarding chat: 15-turn schema T0–T14 in bot code (route.ts + prompts.ts)
- ✓ CF deploy script exists (scripts/test-cf-deploy.mjs)
- ✗ **renderStaticHtml currently = 1 page.** MVP needs 5 linked pages deployed to WAO CF subdomain ({slug}.wao.co.il)
- ✗ Course CTAs (L2-4 Slide 10 + L6-3) reference wao.co.il/site-bot — product must be live before those lessons ship

### Ads Bot (₪249/mo) — held
Deliberately held — two external gates blocking.
- Google Ads API compliance RFI — response drafted, awaiting Eitan to send + approval
- Build dependency: GEO Bot first complete cycle must happen first (per Lior)
- Build not started — ads-pull-report, ads-recommend, ads-execute scripts all pending

### GMB Bot (₪149/mo) — waiting API approval
GBP API applied — hard external gate, correctly blocked.
- ✓ GBP API application submitted 2026-07-04
- ⏳ Approval window: 1–4 weeks from July 4. Write operations (review responses, posts) will fail without it
- Build not started — MVP = gmb-review-responder.mjs (read→draft→approve→write loop)
- Attach play: NOT at Site Bot onboarding — pitch at site completion (month-1 add-on)

### Content Bot (₪490/mo) & Lead Bot (₪199–249/mo) — not started
Strategy defined, not yet scoped for build.
- Content Bot: fills missing pages GSC gaps can't cover. Dependency: retter first cycle + established data
- Lead Bot: upstream data engine (not retention) — feeds Ads Bot ROAS + Review Bot. May need to come before Phase 3.5, not after

## Awaiting — action queue

1. **[Immediate]** Build course review artifact — M2–M6 slides + narration rendered side-by-side. Eitan must approve before any ElevenLabs TTS call. *(Adam → Eitan)*
2. **[Immediate]** Send GEO Bot actions to retter (Hadas) — /geo/dashboard → top 3 by impressions → wa.me links. No blockers. Starts the Phase 1R clock. *(Eitan WoZ)*
3. **[Immediate]** Send Google Ads API RFI reply — drafted, Eitan to cross-check and send. Compliance clock is running. *(Eitan)*
4. **[High]** Gil: write narration for L2-4 Slide 10 — CTA copy written/approved; embed as presenter notes, then Noa proofs, then TTS. *(Gil → Noa)*
5. **[High]** Site Bot MVP — extend renderStaticHtml to 5 pages, deployed to {slug}.wao.co.il, lead form + WhatsApp button, edit-via-chat. *(Eitan-Dev)*
6. **[High]** Yonatan: Gate 0 currency check — M3 + M4 lessons (on-page SEO keywords; FAQ/AIO citation mechanics). Dated sign-off needed before TTS. *(Yonatan)*
7. **[Medium]** Azure budget alert — portal.azure.com → Cost Management → Budgets → alert at ₪100/month. *(Eitan)*
8. **[Medium]** Investigate wao-ai-bot (West US Azure resource) — check for deployments carrying background cost. *(Eitan)*
9. **[Medium]** GSC OAuth build — /api/gsc/auth + /api/gsc/callback, webmasters.readonly scope, vault.ts. Needed before client #2. *(Eitan-Dev)*
10. **[Medium]** Tamar: "9.90 שקל" vs "9.90 ש״ח" consistency across CTA slides. Low priority, fix before final render. *(Tamar)*
11. **[External]** GMB Bot build — waiting GBP API approval, submitted 2026-07-04, expected 1–4 weeks. *(Google)*
12. **[External]** Ads Bot build — waiting GEO Bot cycle completion + Ads API approval. *(Google + retter)*

---
*Note: this snapshot is from 2026-07-04. See `docs/hermes-kb/wao-status.md` for the current live status as of 2026-07-11 (4 clients live, admin login + Ads Overlap Bot shipped, deployed to production).*
