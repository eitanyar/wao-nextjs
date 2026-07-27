# WAO — Status Update for Hermes
*Last updated: 2026-07-26*

## Articulation & EQ Trainer — M1 CODE-COMPLETE (unverified, uncommitted) · M2 BRIEFED

**Spec:** `docs/specs/articulation-trainer.md` (v2, adaptive) — the earlier v1
`dojo-articulation-trainer.md` was superseded and deleted 26.7.

**M1 state (all untracked in the working tree — nothing committed):**
- Engine abstraction (`src/lib/trainer/engine.ts`) — **Gemini Live is the default**
  (`gemini-3.1-flash-live-preview`; bake-off resolved 26.7, Hebrew approved by ear);
  ElevenLabs Agents behind `TRAINER_ENGINE=elevenlabs` as fallback.
- Session room UI (`src/app/(app)/trainer/`), staff-gated via the same wao-admin cookie
  as `/admin/live-readiness`; routes `POST /api/trainer/session` (ephemeral-token mint,
  key never reaches client) + `POST /api/trainer/transcript` (push for Gemini, pull for
  ElevenLabs; appends to `data/trainer/sessions/YYYY-MM-DD.jsonl`).
- Hardcoded M1 persona: Danny, skeptical plumber (`src/lib/trainer/persona.ts`).
- Probe artifacts in `data/trainer/probe/` (wav) — bake-off evidence, do not commit.

**Roni runtime verification — DONE 26.7 (post-fix: PASS on all machine-testable items):**
- Unauth gate (page redirect, no persona leak), unauth API 401s, admin login,
  transcript write (JSONL line lands in `data/trainer/sessions/2026-07-26.jsonl` —
  QA artifact, gitignored), transcript validation (400 `missing-turns`), gitignore
  discipline (`data/trainer/sessions/` + `probe/` confirmed ignored), and secret
  hygiene (GEMINI_API_KEY absent from all responses): **PASS**.
- Session mint initially **FAILED** (502 — `ai.tokens.create` doesn't exist in
  `@google/genai`; correct property is `authTokens`, confirmed in the package's
  genai.d.ts). **Fixed 26.7** in `src/lib/trainer/gemini.ts` (one line) and
  re-verified at runtime: 200, engine gemini, `gemini-3.1-flash-live-preview`,
  ephemeral token `auth_tokens/…`, Danny persona, no key leak → **PASS**.
- **BLOCKED (human step):** the live microphone call itself — Eitan must run one real
  Hebrew voice session in the browser before M1 is declared fully done.

**Instructions for waoengineer (Hermes), in order:**
1. ~~Verify M1~~ — done (above). Remaining human step: Eitan runs one live mic session.
2. ~~Gitignore~~ — already in place and verified via `git check-ignore`.
3. **Commit M1** (trainer src incl. the `authTokens` fix + spec v2 + M2 brief +
   charter.json + this STATUS update).
4. **Execute M2** per `docs/specs/trainer-m2-coach-brief.md` — Coach generator,
   `POST /api/trainer/next`, generated personas replacing Danny, automated Noa QA gate.
   Note the decided deviation: Coach runs on the existing Gemini key (no
   `ANTHROPIC_API_KEY` exists), behind a swap-friendly `src/lib/trainer/llm.ts`.
5. `data/trainer/charter.json` is a DRAFT seeded by Lior — **Eitan (human) should review
   its goals/red-lines before the first generated session.**

**M3 BRIEFED — the missing analysis half.** `docs/specs/trainer-m3-judge-brief.md`.
Eitan ran a real Danny session 26.7 and hit the gap he flagged: **no Analyze button, no
dashboard, no history, no rank** — M1 saves a transcript then does nothing with it. M3
adds: objective metrics computed in code (`metrics.ts` — talk ratio, fillers, question
ratio; NOT LLM-counted), the Judge (`judge.ts` — LLM rubric scoring + Hebrew-quoted
evidence), skill-mastery EWMA profile + weakness memos, `POST /api/trainer/debrief`, and
the dashboard (skill radar + history + rank band + the Analyze button). **M3 is
independent of M2** — it scores whatever transcript exists; build order between them is
free. Same Gemini-key deviation, shared `src/lib/trainer/llm.ts`.
- **Golden test fixture committed:** `data/trainer/seed/2026-07-26-danny.json` — Eitan's
  real session transcript + Lior's manual `referenceDebrief` (the Judge should land near
  it: low emotion-labeling/listening, high closing). Add `!data/trainer/seed/` to the
  gitignore so this fixture stays tracked while sessions/profile/memos stay ignored.
- **Prompts authored by Lior — `src/lib/trainer/prompts.ts`.** `JUDGE_SYSTEM_PROMPT` +
  `DEFAULT_RUBRIC` + `buildJudgeUserPrompt()` (M3), `COACH_SYSTEM_PROMPT` + `QA_GATE_PROMPT`
  (M2). **waoengineer must import these, NOT write its own prompts** — same discipline as
  copy/title-formula ownership. Executor wires the `generateJson` calls around them.

---

## Priority 4 — Live Payment Confirmation Gap: COMMITTED (`0ca0bde`), PUSH UNCONFIRMED

**Spec:** `docs/specs/priority-4-live-payment-integration.md`

**What shipped this session:**
- `src/app/api/checkout/route.ts` — Yaad `APIsign` payload now requests `Sign: 'True'`.
- `src/lib/checkout/yaad-verify.js` (new) — `verifyYaadCallbackViaHyp()`. Confirmed live against
  Hyp's real developer docs (`developers.hyp.co.il`): verification is an API round-trip
  (`action=APISign&What=VERIFY`), not a locally-computed HMAC. Only a `CCode=0` response is
  accepted.
- `src/app/api/checkout/callback/route.ts` — removed the old opt-in `YAAD_VERIFY_SIGNATURE` gate.
  Verification is now unconditional whenever live mode is on; fails closed (→ `payment=error`) on
  missing `Sign`, bad VERIFY result, missing `YAAD_PASSP`, or any fetch error.
- `src/app/api/checkout/callback/route.test.mjs` — rewritten, mocks `fetch`, 10/10 passing.

**Verification (Roni, runtime — PASS on all checks):**
- Dev server healthy, sandbox `POST /api/checkout` and `GET /api/checkout/callback` both behave
  correctly and are unaffected by the live-path changes.
- Unit tests re-run independently: 10/10 pass.
- **Credential-leak check: clean.** `git grep` for the Yaad API key and terminal number across
  every tracked file returned zero matches — both live only in `.env.local`, confirmed gitignored
  (`git check-ignore -v .env.local` → matched).
- Scope check: only `src/app/api/checkout/route.ts` (modified), `src/app/api/checkout/callback/`
  (new), `src/lib/checkout/` (new) are part of this change.

**Still blocking full go-live (not a code defect — a missing credential):**
- `YAAD_PASSP` has not been sourced yet. It isn't visible in the Hyp merchant dashboard's
  Terminal Details panel; needs to come from Hyp support or the original onboarding packet.
- Until it's added to `.env.local` and `YAAD_LIVE_MODE=true` is set, the live verification branch
  stays dormant by design — sandbox checkout continues to work normally in the meantime, and no
  unpaid request can ever reach `payment=success` on the live path once it *is* enabled (fail-closed).

---

## Instructions for waoengineer (Hermes) — confirm push

**Already committed locally as `0ca0bde`.** Hermes reported this pushed, but
`git log origin/draft/marketing..HEAD` still showed it ahead of the remote as of 2026-07-24 — push
status needs a real confirmation, not just a report:

```
git log --oneline -1 0ca0bde  # sanity-check the commit still exists as expected
git push
git log origin/draft/marketing..HEAD --oneline   # should be EMPTY after a real push
```

If the second command prints nothing, the push succeeded. If it still lists `0ca0bde`, the push
did not actually happen — retry `git push` and report the real output (not just "done").

**After a confirmed push:** no further code action needed until `YAAD_PASSP` is sourced. That's a
manual credential-retrieval step (Hyp support / onboarding packet), not an engineering task.

---

## Priority 5 — Live-Readiness Consent-Capture UI: COMMITTED (`676b71f`), PUSH UNCONFIRMED

**Spec:** `docs/specs/priority-5-live-readiness-consent-ui.md`

**Status:** an uncommitted implementation already existed in the tree (staff-only admin screen to
toggle 6 per-client live-readiness attestation fields, replacing SSH + hand-edited JSON). Eitan-Dev
audited it line-by-line against every requirement in the spec — **zero code changes were needed**,
everything already checked out:

- **Staff auth, not client auth** (§1.1) — `page.tsx` and `action.ts` both verify independently via
  `ADMIN_COOKIE_NAME`/`verifyAdminToken`, never the client session gate.
- **Never touches live mode** (§1.2) — no import of any mutation/executor module; grepped clean.
  `GOOGLE_ADS_ENABLE_LIVE_MODE` is read-only for display, never written.
- **Consent requires evidence** (§1.3) — `liveConsentRecorded=true` with an empty note is rejected
  server-side before any write; enforced in `live-readiness-form.js`, not just client-side.
- **Input hardening** (§1.4) — `clientId` regex-validated, directory-existence confirmed before
  write, only the 6 known keys are ever written.
- Atomic writes (temp file + rename) to `live-readiness.json`; append-only audit trail to
  `live-readiness.audit.jsonl` with timestamp, field diffs, evidence note, `source: 'admin-ui'`.
- Out-of-scope items confirmed untouched: client-facing `GET` route, `assessLiveReadiness` logic
  itself, no new role system.

**Testing:** 19/19 unit tests pass (including dedicated coverage for the empty-evidence rejection
and the "never touches live-mode" constraint). `tsc --noEmit` clean. `next build --turbopack` clean
— route registers as `ƒ /admin/live-readiness`.

**Files:** `src/app/(app)/admin/live-readiness/page.tsx`, `action.ts`, `shared.ts`,
`live-readiness-form.js` (+ two test files).

**Runtime verification (Roni — PASS on all 5 spec §4 scenarios, plus 2 extra off-happy-path
probes):**
- No admin cookie → `307` to `/admin/login`, no client data leaked.
- Valid admin cookie → `200`, lists all 5 real clients from `data/clients/` (`aasada`, `ajudaica`,
  `google-ads-sandbox`, `merlo`, `retter`).
- Toggled `clientAccountOwned=true` on the sandbox client (`google-ads-sandbox`, chosen to avoid
  touching real client data) → persisted correctly to `live-readiness.json`, audit line appended.
- Empty-evidence `liveConsentRecorded=true` submission → rejected, file unchanged, no audit line.
  Non-empty submission → written, plus a correctly-formed audit line with the evidence text.
- **Critical negative check (§1.2): `GOOGLE_ADS_ENABLE_LIVE_MODE` in `.env.local` confirmed
  byte-identical before and after the entire test run** — grepped both times, absent both times.
  No mutation/executor import anywhere in the directory.
- Extra probes: path-traversal `clientId` rejected cleanly (no stray files/dirs created); a direct
  unauthenticated POST straight to the server action (bypassing the page) was still redirected to
  login and made no write — confirms the admin check runs inside the action itself, not just as a
  page-level gate a crafted request could route around.

**Heads-up:** Roni's test run created `data/clients/google-ads-sandbox/live-readiness.json` and
`live-readiness.audit.jsonl` on disk (untracked, not gitignored) as a byproduct of live-testing the
write path against a sandbox client. These are QA artifacts, not real client data — decide whether
to commit them (harmless, sandbox-only) or leave them untracked; not included in the `git add`
below either way.

**Language QA (Noa) — DONE.** Fixed two typography defects: ASCII straight quotes instead of
Hebrew gershayim (״) in the `missing-consent-evidence` error message (`page.tsx:81`) and in the
`liveConsentEvidence` textarea label (`page.tsx:187`, was an HTML-entity-encoded ASCII quote).
Everything else — grammar, agreement, terminology consistency against the six field keys in
`live-readiness.js`, em-dash spacing, no calque phrasing — was already clean. One judgment-call
flag for Tamar (not fixed, not an error): the `clientBillingAccepted` label is a bare noun phrase
while its five sibling labels are all verb-led clauses — cosmetic inconsistency, not blocking.

---

## Instructions for waoengineer (Hermes) — confirm push

**Already committed locally as `676b71f`.** Same push-confirmation gap as Priority 4 — verify with:

```
git log --oneline -1 676b71f  # sanity-check the commit still exists as expected
git push
git log origin/draft/marketing..HEAD --oneline   # should be EMPTY after a real push
```

If the second command prints nothing, both Priority 4 and Priority 5 pushed successfully. If
either commit still shows up, retry `git push` and report the literal command output.

**After a confirmed push:** ship-ready. No blockers remain for Priority 5.
