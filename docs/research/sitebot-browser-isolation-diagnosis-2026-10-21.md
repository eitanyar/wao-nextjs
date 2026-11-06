# Site-Bot synthetic browser safety diagnosis — October 21, 2026

Canonical mission: t_7047a71b. Existing independent assessment: t_d194dfcb.
Verdict: BLOCKED on browser transport capability, not a Site-Bot product FAIL.
Customer-journey acceptance: NOT TESTED. release_health=false.

## Current authority and scope

Consumed the latest controller census and priority comments on the canonical mission. Site-Bot MVP precedes Google Ads new-account months 1–2 readiness. Do not resume GEO, legacy copy/build/preview work, or the synthetic assessment unchanged. The existing independent assessment remains the only canonical functional-QA card; no replacement was created.

Read current governance, immutable Contract 2026-10-21_004, the independent worker report, current audit UI and ContactForm source, and package.json. Source inspection is not runtime acceptance. No application source, historical handoff, profile configuration, approval policy, service, build, account or deployment was changed.

## Independently exercised browser evidence

Used the dedicated browser session sitebot-isolation-discovery. Browser reported Chrome/145.0.7632.6, protocol 1.3. Created a new disposable browser context and an about:blank target explicitly inside it. Target.getTargetInfo independently confirmed context identity; unlike the earlier worker attempt, the context was actually used.

On that target enabled Network, disabled cache, bypassed service workers, enabled Fetch request-stage interception for all URLs, and configured Network.setBlockedURLs for ws://* and wss://*. Also configured Target.setAutoAttach with waitForDebuggerOnStart. Auto-attach configuration alone is not proof of coverage for all child targets.

HTTP negative control:

- Issued a synthetic POST only to http://synthetic.invalid/probe from the blank document.
- Observed Fetch.requestPaused with method POST before continuing any request.
- Explicitly failed that paused request with Fetch.failRequest(errorReason=BlockedByClient).
- Observed Network.loadingFailed with net::ERR_BLOCKED_BY_CLIENT.Inspector and blockedReason=inspector.
- The JavaScript rejection flag alone would have been insufficient; the paused request and inspector failure provide the narrower HTTP interception evidence.

WebSocket negative control:

- Issued a synthetic WebSocket only to ws://synthetic.invalid/socket.
- Observed Network.webSocketCreated, then Network.webSocketFrameError with net::ERR_NAME_NOT_RESOLVED, followed by closure.
- This is DNS failure, NOT an inspector/policy block. Thus ws/wss URL-block configuration did not establish the required WebSocket isolation on this browser.
- A second narrow probe configured Network.emulateNetworkConditionsByRule with ws/wss patterns and connectionType=none. Configuration returned rule IDs, but the synthetic socket again failed with net::ERR_NAME_NOT_RESOLVED. That setting also did NOT prove a fail-closed socket boundary. Do not infer that connectionType=none disables network access.

No application URL was navigated and no audit, lead, mail, provider, account or customer-data operation was attempted. The reserved synthetic.invalid probes did reach DNS resolution for WebSocket attempts; this is NOT a zero-network-traffic claim. No actual endpoint or secret was used. No whole-browser ambient-traffic exclusion is claimed.

## Capability discovery and cleanup

Python Playwright was not installed in this browser execution environment according to importlib.util.find_spec. Browser.getBrowserCommandLine returned RuntimeError; no debug endpoint was discovered and no alternate path was attempted after that failure. Repository package.json declares Puppeteer, not Playwright; the bounded node_modules filename search found Next experimental Playwright entrypoints only, not evidence of an available Playwright runner. No package was installed and no browser/configuration change was made.

Closed the exact owned probe target and disposed its context. Readback of Target.getTargets confirmed both probe target and context absent. Existing browser surfaces were not navigated or closed.

## Decision and next action

The independent worker's earlier uncertainty is now narrowed by actual execution: HTTP request-stage interception works on the tested target, while the attempted socket controls do not establish the required isolation. Context-wide child-target coverage remains unproved. Do not requeue t_d194dfcb with the same prerequisite or treat this as an application defect. No application repair is justified by this evidence.

Recommended controller-owned next step: supply one supported clean browser-context capability covering HTTP requests, WebSockets, service workers and new pages/workers, then authorize a bounded preflight and continuation on the SAME t_d194dfcb. A context-wide browser-automation interface is a candidate approach, not evidence that it is presently installed, accessible or sufficient without negative-control execution. Specific Playwright API names mentioned in initial board comments are provisional, not verified documentation evidence in this run. If providing a capability requires an installation/tooling-scope change, record that separate bounded authority before execution; do not turn this into an unrestricted install, a custom application harness, or another product rewrite. Routine tooling selection belongs to the team, not an owner product-choice approval.

Documentation access on October 21, 2026:

- Official Hermes documentation index was retrieved successfully through curl and identifies its Browser and Browser CDP Supervisor documentation pages. Loaded the hermes-agent skill before discovery.
- web_extract failed because its backend was search-only. A subsequent combined documentation-download command was denied before execution by the security scan over the .dev documentation domain. It was not retried through another interface. Browser/Playwright documentation pages were NOT successfully consulted in this run; no claim of their contents or supported API sufficiency follows.
- No configuration/backend changes were made. Technical findings above rely on actual browser responses, not inaccessible documentation or guessed APIs.

All original no-provider/no-mail/no-storage/no-build/no-production boundaries remain. Existing assessment runtime budget is not silently reset. No independent product PASS, founder approval, live lookup, human receipt or release approval follows from this diagnosis.
