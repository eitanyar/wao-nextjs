# Mission: Ads Bot toward 100/100 Ad Strength

**Owner:** Adam (orchestration). **Origin:** Eitan, 2026-08-01, following the LP-pipeline fix
and Dror's asset-completeness audit (`docs/specs/ads-bot-asset-completeness.md`).

## Objective and success definition

Get every new Search campaign the Ads Bot creates as close to 100/100 Ad Strength as the
account's data genuinely supports — **and** treat this as a joint metric with trial completion
rate, not asset-completeness alone.

**Explicit instruction from Eitan, binding for this mission:** if reaching a higher completeness
score requires asking the client for more (e.g. a photo, a clarifying answer), **that is an
acceptable and even desired cost** — more input in service of a stronger campaign counts as
success. But if a new/changed question causes people to drop out of onboarding, **that is a
failure of execution, not a failure of the goal** — the fix is to revise the question's wording
so it "lands softly" (lower friction, clearer value-exchange), not to drop the question. Both
halves count toward success: asset completeness AND intake completion rate. Neither owns the
mission alone.

## Workstreams and owners

### 1. Tier 1 — no new intake, pure engineering (nextjs-engineer)
- Call assets from `CollectedData.phone`
- Callout assets from `guarantee`/`yearsInField`/`license`/`starRating`/`responseTime`/`pricingNotes`
  (new short-form copy prompt — route through Tamar → Noa)
- Structured snippets from `secondaryServices`

### 2. Sitelinks — architecture decision first (nextjs-engineer), then copy (Tamar → Noa)
Site Bot's LP is single-page; sitelinks need real in-page anchors (services/reviews/FAQ/contact)
before copy can be written against them.

### 3. Image assets — extend existing adaptive intake, do not add a new required step (Tamar → Noa → nextjs-engineer)
Per Dror's spec: extend T21 with an explicit van/storefront ask for `urgent`/`field` trade
verticals (currently not asked for at all), wire `trustAssetUrls`/`profilePhotoUrl` into the LP
hero (currently always falls to generic stock), add a crop step for the Ads API `ImageAsset`
upload (1:1 required, 1.91:1 optional-but-recommended from landscape sources only).

### 4. Friction/completion-rate safeguard (ux + mission-planner)
Every new or reworded intake question in this mission gets reviewed for drop-off risk **before**
ship, not after. Maya (ux) reviews the actual conversational placement/wording for friction;
Lior (mission-planner) defines how we'll actually know if it worked — instrumentation, not vibes.

### 5. WhatsApp message assets — map now, gate on GA (nextjs-engineer)

## Sequencing (dependencies)
1. Sitelink anchor architecture decision — blocks sitelink copy.
2. T21 photo-question rewording (Tamar draft → Noa gate → Maya friction review) — blocks nothing
   else, can run in parallel with engineering.
3. Tier 1 engineering (call/callout/structured-snippet) — no dependency, start immediately.
4. Image pipeline (LP hero wiring + crop step) — depends on #2's final wording only for the
   *ask*, not for wiring the fields that already exist.
5. Instrumentation (Lior) — needed before claiming success either way; can be scoped in parallel.

## What "done" looks like
- A real test campaign (sandbox) shows call + callout + structured-snippet assets attached, not
  just RSA headlines/descriptions.
- At least one real client photo flows through to both the LP hero and an Ads image asset in a
  test run, with stock as a confirmed non-blocking fallback.
- Every new/changed intake question has been through Tamar → Noa → Maya, not just engineering.
- A metric exists (even a manual log to start) for intake completion rate before vs. after each
  question change — not just "we shipped it."
- Roni verifies the above at runtime before this mission is marked closed.
