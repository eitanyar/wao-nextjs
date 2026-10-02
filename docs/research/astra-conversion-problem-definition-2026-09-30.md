# Astra Homepage — Product/Conversion Problem Definition & Smallest-Fix Spec (2026-09-30)

Task: t_477587c1 (waostrategy). Owner pause honored: no waocopy dispatch until this document existed.
Method: Observed = verified in this run (repo files, live preview DOM, board outcomes); Board = worker self-report.

## 1. The exact product/conversion problem (not cosmetic)

The live local preview (http://100.102.160.114:3000/, tailnet-only, no PIN) renders the Astra homepage from TWO copy files:
- src/content/astra-authority-first-homepage-copy.json (activated v1, QA-passed t_58f90585, SHA b3eb36c7…) drives hero lead/CTA, video, paths, founder, partner, final CTA (src/components/home/AstraHome.tsx:65-188).
- src/content/astra-homepage-copy.json (OLD pre-Astra file) still drives: header nav (Header.tsx:24-27), hero eyebrow/H1 (AstraHome.tsx:60-63), AND three retired sections rendered at AstraHome.tsx:124-166: low_price, lead_handling, ai_search.

Conversion defects (Observed in served HTML + copy dumps):
D1 COST/UPSELL FRAMING: lead_handling sells add-ons on the homepage ("יש לנו הרחבה מתאימה", "בתשלום נפרד", "״מה עובד״ מתחילה מ-₪160 לחודש", "שום הרחבה לא כלולה אוטומטית") and low_price explains cost structure + a defensive disclaimer ("זה לא מנהל שיווק אישי צמוד"). Main effect = emphasizing extra costs, not buyer benefit. Owner: remove.
D2 PRODUCT-TRUTH RISK: lead_handling implies call-level attribution is an extra you must buy; truth (VISION.md §DNI gate + §Phase 3.5; src/lib/crm/intelligence.ts:22-29; src/app/api/leads/route.ts:197,233): form/WhatsApp/click leads carry gclid/wbraid/gbraid + UTM/referrer/attribution and orderId/revenue/closedAt — implemented; mobile click-to-call tracked free; desktop voice calls measurable only via opt-in DNI add-on (never mention on homepage).
D3 REDUNDANT COPY: "בדיוק" x3 (hero/body, paths/google_ads/demo_status, final_cta/body); demo message echoed 3x (hero/body, demo_status, final_cta/body); video_proof/context_line re-introduces the testimonial immediately after its heading ("רוצה לשמוע לקוחות? סרטון ההמלצות… נמצא כאן").
D4 NAVIGATION: header primary nav = 3 in-page anchors (/#proof, /#paths, /#people) — an internal section-nav substitute; site-wide pages live only in the footer. Owner requires normal site-wide navigation.
D5 IMAGE RELEVANCE: only two images render (founder portrait = genuine proof; Partner badge = factual proof). No boilerplate image exists in the Astra sections; the "boilerplate image" risk is retired with D1 sections (none of them carried images) — CONFIRMED no removal needed beyond D1 sections.
Non-problems (do NOT touch): hero eyebrow/H1 (approved SEO anchors), routes/CTAs, video embed (youtube-nocookie, no autoplay), partner block, founder block, RTL arrows + launcher (fixed t_df680b95, live-verified), claim boundaries.

## 2. Evidence
- Served HTML via tailnet URL: retired sections present; nav anchors present (href dump: '/#proof','/#paths','/#people').
- Copy dumps: docs copy v1 fields (this run, dump_copy.py); old-file sections (dump_old_copy.py).
- Product truth: VISION.md:412-428 (DNI gate/pricing), VISION.md:434-436 (Phase 3.5 CRM fields), src/lib/crm/intelligence.ts:22-29, src/app/api/leads/route.ts:197,233.
- QA: t_58f90585 PASS-with-minor-notes (repetition noted as non-material then; owner now rules it material).
- Visual: t_5b9522d9 FAIL items fixed in t_df680b95 (arrows matrix(-1,0,0,1,0,0); launcher left:16; 0 text overlaps at 1440/390/320).

## 3. Decision
The v1 activated copy is GOOD and owner-reviewed in preview; the problems are (a) three retired old-file sections still rendered, (b) anchor-only header nav, (c) five surgical copy-field defects. Therefore: NO full rewrite (that is what timed out twice — oversize brief). Smallest fix = surgical field edits + markup/nav surgery.

## 4. Smallest bounded fix (four cards, one writer at a time)
C1 waocopy (narrow, ~5 fields): from activated v1 bytes, write docs/copy/astra-authority-first-homepage-copy.qwen38-v3-2026-09-30.json changing ONLY: hero/body (drop one "בדיוק", tighten to <=2 sentences), paths/google_ads/demo_status (delete the demo echo; keep "פרסום חי יוצא לדרך רק כשתחליט." + add ONE attribution line: every form/click lead is linked to the ad that brought it), video_proof/context_line = "", final_cta/body (drop "בדיוק" echo, one sentence). ALL other fields byte-identical. No nav block in this file (nav handled in C3).
C2 waohebrewqa: materiality review of the C1 diff only (fields listed), standard checks.
C3 waoengineer: (i) byte-copy C1 output over src/content/astra-authority-first-homepage-copy.json (backup first); (ii) AstraHome.tsx: delete low_price/lead_handling/ai_search render blocks (lines ~124-166) keeping finalCopy sections; keep old-file import ONLY for hero.eyebrow/h1_line1/h1_line2; (iii) scripted JSON patch of src/content/astra-homepage-copy.json navigation.links to [{"label":"פרסום בגוגל","href":"/google-ads"},{"label":"אתר ונוכחות מקומית","href":"/site-bot"},{"label":"מי אנחנו","href":"/about"}] (bytes from card text, python json patch, verify only that key changed); (iv) contract-test pin update (finalSourcePath/finalHash + absence assertions for removed sections); (v) focused+canonical tests+build+preview smoke.
C4 waouxtester: the owner-mandated FIRST comprehensive review (6 checks: conversion clarity, global navigation, redundant copy, factual product claims, image relevance, RTL/layout) at 1440x1000 + 390x844 (+320x700 layout). Material fail blocks release.

## 5. Protected surfaces (must not change)
SEO title/H1/eyebrow; exact_destinations + all href/embed_src/badge_src; claim_boundaries/section_roles/no_repeat_rule; video embed + no-autoplay; partner + founder blocks; routes /google-ads/onboarding, /site-bot/start, /google-ads, /site-bot, /contact#contact-form; no PIN/preview gate; no .env edits; no push/deploy.sh/production; Hebrew authored only by waocopy (engineer = byte copies + scripted nav patch).

## 6. Acceptance criteria (objective)
JSON parses; diff v1→v3 touches ONLY the four named fields; "בדיוק" occurrences <=1; video context_line empty; zero strings matching DNI/₪160/בתשלום נפרד/לא כלולה in served HTML; header nav hrefs = /google-ads,/site-bot,/about; retired section headings absent from served HTML; contract test 12/12; npm run test pass; npm run build pass; preview 200 with v3 hero; C4 six-check PASS.

## 7. Dependencies / order
C1 → C2 → C3 → C4 (single writer per stage). Superseded frozen cards: t_80e0f636 (blocked, no output), t_b67269cd, t_63f502d6, t_83e145df, t_bf5aa4f2, t_2d809536, t_7d65b2b3, t_4bf507aa, t_a54f157d (replaced by C4 card).

## 8. Target specialists
C1 waocopy (qwen3.8-max/alibaba pinned); C2 waohebrewqa; C3 waoengineer; C4 waouxtester.

## 9. Owner-only open decisions (unchanged)
(1) .env.local QWEN_API_KEY invalid on both endpoints (401) — Eitan supplies Token-Plan-valid app key or approves simulation fallback; (2) production release = Eitan's manual deploy.
