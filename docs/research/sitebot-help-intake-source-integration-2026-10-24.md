# Site-Bot help intake: application source registration, 2026-10-24

Task: t_0286d55a. Authority: immutable Contract v3
handoff/pending/2026-10-24_001_waoengineer_register-durable-help-intake.md,
SHA256 30d126bc47b27480552b806e3c27b88d88b5d8a5fb8468c573f2a76a95fe9fb9.

Scope is local source registration only. Engineer local source-registration
checks below passed; independent verification remains pending. This is not runtime integration acceptance,
a usable MVP, activation, or release acceptance. customer_journey_acceptance=false;
release_health=false. Independent source-registration verification is a separate
gate owned by root strategist t_0277704a after engineer local acceptance.

## Exact accepted source mapping

Durable recovery t_b126e870 attachments 18-20, from
/home/eitanya/.hermes/kanban/boards/autonomous-hybrid-demand/attachments/t_b126e870/:

- helpRequest.ts -> src/lib/site-bot/helpRequest.ts
  SHA256 f33a9390ceacc5f42637518731cfd923231e53aaa73cdcd7b9afba9a3aded481
- helpRequestStore.ts -> src/lib/site-bot/helpRequestStore.ts
  SHA256 1d68f1ec7a1490c5e5ece7cd671c4d190c9d9add1153596cea7308fda6b698a0
- route.ts -> src/app/api/site-bot/help-request/route.ts
  SHA256 dd81ab415f3821e829ad59f862b10a7a407989bd6d2c00bbac279ae7821d719a

All three app modules retain the accepted bytes, including historical candidate
comments. No implementation rebuild or behavior refactor. Original attachment16
help-request.test.mjs (SHA256
97442ba41ac0b4aa93a2be6869d0fb063c30006d1b0e111938e9e688912eb96d)
is ported to src/app/api/site-bot/help-request/route.test.mjs. Original README and
TAP remain immutable historical artifacts, not current integration evidence.

## Test port and semantic compatibility

Actual app paths resolve relative to import.meta.url, independent of cwd. The
original behavioral matrix and strict noEmit/noUnused semantic check are retained.
An additional noEmit program uses the actual application auditStore.ts and
payments/rate-limit.ts source declarations, with normal TypeScript resolution,
no virtual replacements and no module evaluation. It verifies imported symbols
originate in those real source files. Synthetic runtime execution still uses exact
import allowlists, frozen synthetic environments and failing unexpected imports,
network and logging. Real audit-reader/rate-limiter code is never evaluated.

The route uses readAuditRecord(id, undefined, new Date(), false), suppressing the
adapter's default expired-record deletion. The actual audit adapter returns
Promise<AuditRecord | null>; its existing IO-error-to-null behavior can yield404.
checkRateLimit takes a key and {maxRequests, windowMs}, returning allowed,
remaining and retryAfterMs. Existing limiter is per-process/fixed-window, not a
shared hard security boundary. Neither dependency is changed.

The test accepts only explicit absolute existing non-symlink TMPDIR roots matching
/home/eitanya/.hermes/profiles/<profile>/cache/scratch; no cwd or system-temp
fallback. It allocates a unique 0700 child there, records directory identity, and
teardown deletes only that owned child after path/dev/inode validation. Synthetic
records, fault injection, links and compiler in-memory work stay isolated there.
Only TMPDIR is read from the test runner environment; no app env files or secrets.

package.json scripts.test appends exactly once:
` && node --test src/app/api/site-bot/help-request/route.test.mjs`
Every earlier command and field must remain byte-identical. Baseline package
SHA256 1227ccef7236cc84864dd9f1eab429cb4a1b055d0505dfc9367814ef6b389e31.
The offline discovery assertion names the exact new suite. Baseline-versus-final
diff is completion evidence, not a stale copy of the canonical command in source.
The focused suite requires explicit profile-private TMPDIR even from repo cwd;
no default TMPDIR or complete canonical runner execution is claimed.

## Disabled-by-default truth and receipt meaning

No flag, environment file, real storage directory or deployment setting is changed.
The accepted POST gate checks SITE_BOT_HELP_INTAKE_ENABLED exactly 'true', then
requires SITE_BOT_HELP_REQUEST_DIR to be an existing private absolute directory
owned by the OS user with no symlink ancestors. Without both gates it returns503
before reading the body, audit or initializing storage. Disabled remains the
normal live state; existing live settings are not inspected or attested here.

Success means durably recorded only: {ok:true,requestId,status:'received'}.
It does not mean operator read, mail delivery, assignment, human acknowledgement,
response, follow-up promise or service-level commitment. No public read/list API,
SMTP fallback or provider/Ads action is added. Selected-business binding, exact
consent, normalized idempotency/conflict, private responses and durability behavior
are preserved from the accepted backend, not new production observations.

## Named offline checks

Serial ladder executed in this engineer run (self-verification, not independent QA):

1. /usr/bin/node --check src/app/api/site-bot/help-request/route.test.mjs
2. From own profile cache/scratch cwd, with explicit
   TMPDIR=/home/eitanya/.hermes/profiles/waoengineer/cache/scratch:
   /usr/bin/node --test /home/eitanya/wao/src/app/api/site-bot/help-request/route.test.mjs
3. Same focused command/TMPDIR from /home/eitanya/wao cwd.
4. Scoped ESLint on the three new modules and route.test.mjs.
5. git diff --check; unstaged/staged data/clients name-only diff checks;
   accepted source/protected dependency hashes; baseline package diff.

Observed final results: syntax exit0; focused scratch-cwd exit0 with31 tests,
31 pass,0 fail,0 skipped,0 cancelled; focused repository-cwd exit0 with the same
counts. Both strict noEmit/unused and actual-interface semantic tests pass in
each context. Scoped ESLint exits0 without diagnostics. The first lint run found
Next.js's forbidden `module` local-variable name in the preserved test; only that
test identifier was renamed `storeModule`, without changing any assertion.
Production modules remain byte-identical to all three accepted pins above.

git diff --check exits0; both protected data/clients name-only diffs are empty.
auditStore.ts remains SHA256
e39562dbf02f1a9f1b85d280756193e1502bfdbea6c495df5a7f4b32747c959e;
payments/rate-limit.ts remains SHA256
83b4d85012bb263c4ed20489ddff18d66671e990a1675ef2a197243a12c46bd9.
The saved baseline package matches its pin and cmp against the pre-edit package
exited0. Baseline-versus-final package diff contains only the exact append above;
final package SHA256
a878f090477f4b6afe1e7cf8a97bac76897dd7904f922316d3fa67c05f74b2db.
Accepted attachment hashes and immutable contract pin remain unchanged.

Evidence is saved under the executing profile's cache/scratch/t_0286d55a-evidence
and attached to task completion: final TAP for both cwd contexts, syntax/lint and
scope logs, baseline package, exact package-registration diff, test-port diff,
final hashes, changed paths and the application files. A diff against preserved
attachment16 shows the complete behavioral assertions unchanged except the
test-only local identifier; other differences are path/scratch handling,
semantic integration, discovery and source-document inventory.

source_registration_acceptance=PASS (engineer local only);
focused_acceptance=source-registration-only. No customer or release acceptance.

## Remaining gates and explicit non-claims

Full canonical npm run test and npm run build: NOT RUN under this bounded contract.
Integrated-build/security holds are preserved, not waived. No .next/dist outputs,
app/server/browser run, HTTP serving, screenshots or UI/RTL acceptance. Synthetic
Request/Response checks exercise actual route source, not an app server.

Still required: independent source-registration review; canonical test/build and
safe integrated runtime; truthful audit claims and retained selected placeId in
UI; consented durable-help caller wiring; authenticated private operator/readback
workflow; retention/deletion/orphan recovery and access/security review; actual
target Linux/procfs filesystem, hardlinks, fsync and durability verification;
trusted-proxy/IP and multi-process rate-limit review; applicable Hebrew/founder,
SEO and visual/RTL gates; controlled consented real-use smoke and product acceptance.
No separate-process crash/power-loss proof is provided by same-process store tests.
Activation, customer/provider/mail/Ads access, publication and deployment require
separate exact authority. No install, commit, push or deploy is performed here.
