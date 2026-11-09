# Site-Bot Paid Journey v2 — from free audit to a live site, ₪199/mo, no friction

Approved by Eitan 2026-11-07. Multi-session mission. Owner: Adam.

## Outcome
A business owner who just saw their free audit (or a personal report link from outreach) can go from
"show me" to "buy" to "my site is live on my own domain" with almost nothing to do: we pre-fill from
their Google profile, ask ~3 questions, show a **preview of their site before they pay**, take ₪199/mo
via Takbull, and go live after a human check. The whole flow must be smooth enough that a screen
recording of it (the walkthrough video, later on /site-bot with waocopy + ElevenLabs narration) works
as the pre-frame for BUY.

**Approved terms (2026-11-07):** ₪199/mo + VAT, no one-time fee, no trial, no commitment, cancel online,
one plan. Hosting included (≈ ₪100/mo value — pitch point). Domain stays in the client's name; the client
owns the GBP (we are a manager). Exit: 30-day notice; site export/buyout, free after 12 months.

**Approved decisions (2026-11-07):**
1. Preview before pay.
2. Automatic draft → human review before go-live.
3. GBP via the owner's "add manager" invite (no OAuth consent screen for the owner).
4. Login by WhatsApp code or email magic link (no passwords).

**Targets include businesses that already have a site** that ranks weakly: rebuild on their existing
domain (301s from old URLs, MX/email untouched), not only no-website businesses.

## Files
- Paid routes (currently 503/404 stubs in the audit-only release; full versions in commit `7e2bac9`):
  `src/app/api/site-bot/{checkout,connect-gbp,connect-status,generate,deploy,edit,fix-plan,fix-approve,fix-execute,gbp,re-audit,research}/`.
- Release guard: `src/app/api/site-bot/audit-only-release.security.test.mjs` (must be updated, not deleted,
  as each route is re-enabled), `deploy-client-auth.security.test.mjs`.
- Payments: `src/lib/payments/providers/{takbull,mock}.ts`, `get-provider.ts`, `get-invoice-provider.ts`,
  `cron-charge.ts`. Takbull gaps are marked `TODO(takbull-api)`; Eitan connects Takbull (meeting week of 11-09).
- Domain: `deploy/route.ts:303,436` and `generate/route.ts:174` hard-code `${slug}.wao.co.il` — must become
  the client's domain, with `${slug}.wao.co.il` as the preview/staging host only.
- Copy: all new Hebrew via waocopy (Tamar) → Noa. Voice exemplar `docs/copy/voice-exemplars/site-bot-audit-2026-11-07.md`.

## Constraints
- **Milestone 0 first — dress rehearsal.** Run Half 2 end to end on the mock payment provider against a test
  business (including the existing-domain path), stop before any real GBP write or public publish, and list
  every break and every friction point in the persona's eyes. Later milestones are re-sized from that list.
- Takbull is Eitan's; build against the provider interface + mock until he hands over sandbox creds.
- No real GBP writes, DNS changes, or publishing without Eitan's go per client. No writes to `data/clients/`
  unless the brief names the client and command.
- Engineer never authors Hebrew; patches only. The audit-only release must stay safe in prod until a
  milestone is verified — re-enable routes behind a flag, never by deleting the guard test.
- Deploy per milestone after verifier PASS, not per task.

## Acceptance
- M0: dress-rehearsal report (breaks + friction, ranked) → Adam re-plans M1–M6.
- M1: pre-fill from GBP + ≤ 3 questions.
- M2: preview of the client's site before pay (staging host, noindex).
- M3: ₪199 Takbull hosted checkout (mock until creds), cancel online, account status page, magic-link/WhatsApp login.
- M4: GBP add-manager flow + domain paths: client domain, MX untouched, 301 map from old URLs, domain-access
  guide, content-reuse consent; `${slug}.wao.co.il` only for preview.
- M5: owner voice notes as an input option.
- M6: walkthrough video recorded from the real flow (pipeline + narration), placed on /site-bot after Noa + Eitan.

### Re-plan after M0 (2026-11-07, Adam; source `docs/research/site-bot/paid-journey-m0-report.md`, commit `aaf7a80`)
M0 finding: the pipeline runs pay → research → operator → generate → review → deploy (reverse of the approved
flow), the generator fails its own copy validator 4/4, and the existing-domain path does not exist. M1–M4 are new
orchestration, not re-enabling. New order (critical path = a site that generates at all):
- **M0.5 plumbing (S/M):** prod guard on `/site-bot/pay/*` (B16) + guard test; `res.ok` checks (B9, B10);
  `WAO_CLIENTS_DIR` (B13); test data out of tracked dirs (B14); research fixture/cache mode (B5); generate logs
  its real error (B4 part); stale-Qwen-env note (B17).
- **M2a generation engine (M/L):** copy limits in the prompt + bounded repair pass (B4); research → `copy_ready`
  → `compilePageBrief` orchestration (B3). Acceptance: fixture business generates a valid site record ≥ 9/10 runs.
- **M1** pre-fill + ≤ 3 questions + buy CTA on the result (B11, B15, F1–F4; truth-gap fields asked up front).
  **DONE 2026-11-09** (flag-gated): Places Details pre-fill on the audit's confirmed placeId (no reviews/rating —
  Places ToS; reviews come from owner GBP in M4), confirm card + 3 questions (priorityServices / travelBoundary / usp),
  owner-named cities → `servedAreaNames` → areaServed only (no extra city pages; Yonatan), slug from domain/Latin name.
  Carried to M2b: visible service-areas list on the base page, editable slug + one-tap area confirm on the preview.
- **M2b** preview before pay on noindex staging host (B2, B12, F6); customer-scoped session replaces the admin gate (B1).
- **M3** ₪199/mo on the existing subscriptions engine + cancel + status page + login (B6, F5, F7, F12).
- **M4** GBP add-manager with real verification + UI (B8, F11); existing-domain path: domain capture, DNS/MX read
  and preserve, 301 map, custom-domain bind (B7, F10).
- **M5, M6** unchanged. Copy items F8, F10, F11 → waocopy → Noa, landing with M2b / M4.

## Verifier
Roni walks the flow at runtime as the persona (desktop + mobile, RTL), confirms the mock charge, cancel and
status page work, that no real GBP/DNS/publish call fires in test, that the audit-only guard still holds for
routes not yet re-enabled, and that `git diff data/clients/` is empty.
