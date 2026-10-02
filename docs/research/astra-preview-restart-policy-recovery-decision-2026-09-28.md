# Astra preview restart-policy recovery decision — 2026-09-28

## Decision

No compliant automated recovery path currently exists, so no fresh execution handoff is authorized or created.

The one-shot authorization in `handoff/pending/2026-09-28_003_waoengineer_complete-astra-copy-review.md` was consumed by the first invocation of `systemctl --user restart wao-qa-4017.service`, even though Hermes refused the command before systemd executed it. Retrying that command, substituting another lifecycle command, changing the approval policy, or dispatching a new worker to repeat the same authorization would contradict the contract and bypass the headless safety gate.

## Formal board record

- Engineer task `t_ff98f259`, run 949: formally `blocked`.
- Worker-reported local evidence: focused tests 3/3, scoped ESLint, canonical tests, build, manifest mapping, and `git diff --check` passed. These checks were not independently rerun in this decision task.
- Worker-reported lifecycle evidence: the restart invocation was rejected before execution; authenticated and desktop/mobile runtime acceptance were not attempted.
- The blocked engineer task must remain blocked and must not be retried, promoted, unblocked, or treated as completed.

## Independently observed evidence

- Unit: `wao-qa-4017.service`, active/running.
- Fragment: `/home/eitanya/.config/systemd/user/wao-qa-4017.service`.
- Main PID: `1746`; process: `next-server (v16.2.6)`; working directory: `/home/eitanya/wao`.
- ExecStart remains `/usr/bin/node /home/eitanya/wao/node_modules/next/dist/bin/next start /home/eitanya/wao --hostname 100.102.160.114 --port 4017`.
- Listener remains `100.102.160.114:4017`.
- Browser observation: `http://100.102.160.114:4017/admin/login` renders; `http://100.102.160.114:4017/admin/astra-copy-review` still renders the stale 404 page and exposes no review copy.
- The current build manifest maps `/(product)/admin/astra-copy-review/page` to `/admin/astra-copy-review`.
- The implementation remains authentication-gated in source through `verifyAdminToken`, redirects unauthenticated requests to `/admin/login?next=%2Fadmin%2Fastra-copy-review`, and sets no-index/no-follow/no-cache metadata. Post-restart authentication behavior has not been runtime-verified.

## Integrity evidence

- `src/lib/astra-copy-review.ts`: `5137881973b042679c3d5c686e34adaf503d4fd3144684d4b81afd8d4fb82109`
- `src/lib/astra-copy-review.test.ts`: `3389df579c6b1102fd39859704e2085af90c1ef3adac4443b09257ace80320a5`
- `src/app/(product)/admin/astra-copy-review/page.tsx`: `c68574ab988aeb49e6bbcb29963436675749558d4feafbf7cb26deff0bd24df7`
- `src/components/admin/astra-copy-review/CopyFeedbackReference.tsx`: `d54be0c48b25a902a3bbf06d827b5ec6db4e7dd9cfdab1db90e8de173440376e`
- Approved copy artifact: `6b3634797da4ebd532244c0c7b26de9698570799286e3215cc859875124da81f`
- Original handoff: `7fd6354f317872c228aba6e1ba8a10b2e4c4fb0bb186cc36b2a994eb59289240`
- Corrective handoff: `de0164c07360d21d95bce51703db5d234e0eebf45783b2d741d5ca16d52ef44e`
- Completion handoff: `3b55c958366df9f7b7a1ed7c915662a317d1e69362b5fc741c143a0de9ea6b11`
- `src/proxy.ts`: `a799c1ceda6457fe0492b4ca4fe897bff8a105be58b5369bf7541c022744481b`
- Current `package.json`: `4c7be816c8a60fe37e065e1ee4eb61129ce0a38e988eb8b98010f227a9b2f9e9`; index blob remains `2e7e603e534f9e5922ff567111976d1616df76c5`.
- Current `tsconfig.test.json`: `90dea17bd932048b35a9894eb7073a2d9645380d0abec40a824b31a10c1081c0`; index blob remains `c87bf416e20de6975a7830825f0d0ccb7e9cd075`.

## Required owner action

The prior restart authorization is no longer reusable. To recover the preview, Eitan must make a fresh, explicit one-shot authorization and use an interactive owner-operated terminal path capable of approving and executing exactly:

    systemctl --user restart wao-qa-4017.service

Before executing it, Eitan should reconfirm the unit name, fragment, working directory, ExecStart, active/running state, PID 1746, and listener above. No stop/start pair, alternative process launch, approval-policy bypass, service edit, cache deletion, or second restart is covered.

After that owner-operated restart, report the new PID and outcome. A later read-only acceptance task may then verify the same unit identity, private authentication boundary, two authenticated navigations, and desktop/mobile rendering at exactly `http://100.102.160.114:4017/admin/astra-copy-review`. Until then, release health remains blocked.

## Content-direction correction

This recovery preserves the approved copy artifact byte-for-byte. In the next copy or engineering contract where visible homepage wording is in scope, remove visible privacy-policy, data-handling, consent-explanation, and defensive privacy-boundary copy from all unique homepage sections. The existing cookie banner remains the only allowed privacy notice in homepage UI. This direction does not weaken backend safeguards, legal policy pages, non-visible metadata, or authentication/privacy controls on the private review route.
