# Homepage Visual QA Verdict

## Overall verdict: BLOCKED

- URL: `http://100.102.160.114:3000/`
- Exact preflight time: `2026-09-12T11:51:26.978Z`
- Preflight result: HTTP 200; the WAO homepage rendered successfully.
- Observed browser viewport: 1280×633.
- Observed document size: 1280×6913.

## Desktop summary

BLOCKED. The required 1440×900 viewport could not be created in the available browser session. The session remained fixed at 1280×633 after a resize attempt, and the capture tool did not expose exact viewport emulation or a repository screenshot-save path. Producing or relabelling captures as 1440×900 would falsify the required evidence, so no desktop screenshots were created and no visual PASS/FAIL verdict was issued.

## Mobile summary

BLOCKED. The required 390×844 viewport could not be created in the available browser session. The capture tool did not expose mobile viewport emulation or a repository screenshot-save path. Producing or relabelling captures as 390×844 would falsify the required evidence, so no mobile screenshots were created and no visual PASS/FAIL verdict was issued.

## Screenshot coverage

No screenshot rows exist because zero compliant screenshots were captured.

| Screenshot filename | Scroll position | Named visible sections | Verdict | Concrete pixel-based observations |
|---|---:|---|---|---|
| — | — | — | BLOCKED | Exact 1440×900 and 390×844 viewport captures were not technically available. |

## Failures / blockers

1. Desktop capture blocker — before `desktop-screen-01.png`: requested viewport 1440×900; available viewport 1280×633. No compliant screenshot exists.
2. Mobile capture blocker — before `mobile-screen-01.png`: requested viewport 390×844; available viewport 1280×633. No compliant screenshot exists.
3. Artifact-save blocker — the browser visual capture returned an in-session image but no filesystem path that could be preserved under the allowlisted audit directory.
4. Repository-status blocker — this worker runtime exposes no terminal command tool, so the exact `git status --porcelain` output could not be obtained without inventing it.
