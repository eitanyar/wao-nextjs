# Email-Recovery Simplification Decision

Date: 2026-09-17
Decision: Abandon the current self-service email-recovery candidate. Do not spend another implementation or verification run on handoffs `2026-09-17_004` or `2026-09-17_005`, and do not treat their failed acceptance as a release candidate.

## Why

The candidate is no longer a small backoffice function. It adds recovery-email enrollment and verification, a public request/completion flow, provider delivery, rate limits, challenge persistence, audit behavior, feature flags, and production UI/runtime gates. Runs `776` and `778` independently passed the focused source-boundary checks but then failed inside disposable whole-application acceptance machinery: first on omitted taxonomy/font dependencies, then on an unrelated trainer test and additional omitted application data modules. Those failures do not prove the candidate is defective; they prove this acceptance path is disproportionate to the owner’s requested outcome.

A conventional backoffice recovery path already exists in committed source and is unchanged by the email candidate:

- `src/app/(product)/admin/clients/page.tsx:54` exposes the authenticated admin PIN-reset form.
- `src/app/(product)/admin/clients/action.ts:72-84` requires admin authentication, rate-limits attempts, validates matching PINs, calls `resetClientPin(..., { mustChangePin: true })`, writes an `admin-reset` audit event, and reports success/failure.
- `src/lib/client-auth-store.ts:189-200` replaces the PIN hash and increments `sessionVersion`, revoking prior sessions.
- `src/lib/client-auth-store.test.ts:26-36` covers old-PIN rejection, new-PIN acceptance, version increment, and forced PIN change.

## Supported Recovery Outcome

When a client cannot access the portal, WAO verifies the person through its normal support process. An authenticated WAO operator then opens `/admin/clients`, assigns a temporary PIN, and communicates it through the verified support channel. Existing sessions are revoked and the client must choose a new PIN after login.

This is the supported recovery model for now. It needs no recovery-email enrollment, no public recovery endpoints, no transactional-email provider, no recovery code, and no special isolated build harness.

## Scope Consequences

- Do not merge, deploy, or continue acceptance of the current email-recovery candidate.
- Do not dispatch another corrective verifier for runs `776` or `778`.
- Preserve the committed admin reset path as the sole supported recovery mechanism.
- Do not blanket-revert the dirty shared worktree: email-candidate edits overlap other current changes and require deliberate source-control reconciliation by the repository owner.
- Reconsider self-service recovery only as a new product decision with a demonstrated support-volume need and an ordinary repository acceptance path.

No Contract v3 implementation handoff is created because this decision recommends abandonment, not implementation.
