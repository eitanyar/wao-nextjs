# Astra Verification Mismatch Decision — 2026-09-22

## Decision

This is a verifier-contract defect, not a product defect.

Handoff 004 defines the product story as hero, proof, paths/pricing, low-price explanation, optional lead handling, AI-search support, people, FAQ, and final CTA. Current `AstraHome` implements those nine homepage sections as `hero`, `proof`, `paths`, `low_price`, `lead_handling`, `ai_search`, `people`, `faq`, and `final_cta`. The shared `Footer` renders outside `AstraHome`; neither handoff 004 nor 005 requires a homepage section with ID `site-footer`.

Handoff 011 incorrectly replaced that accepted contract with `pricing-context`, `extensions`, `ai-search`, `final-cta`, and `site-footer`. Card `t_e4ea2fd3` therefore stopped on an invented selector contract after independently proving system Chrome, exact 390×844, no horizontal overflow, one H1, and zero console/page errors.

## Can / Cannot

Can: preserve the independently observed mobile viewport, overflow, H1, and error results; reconcile selectors to `[hero, proof, paths, low_price, lead_handling, ai_search, people, faq, final_cta]`; treat the shared Footer as a layout element; and run only the still-missing menu, focus, reduced-motion, obstruction/clipping, and screenshot checks.

Cannot: classify the ID mismatch as a product failure, rename production IDs, add a synthetic `site-footer` section, repeat the already-passed tests/build/desktop checks, or claim visual-quality/release/deployment acceptance from this reconciliation alone.

## Evidence Boundary

`t_f76f2628` and `t_e4ea2fd3` remain immutable blocked evidence. The final child is read-only and may complete only the residual mobile interaction/accessibility checks.