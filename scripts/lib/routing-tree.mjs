/**
 * Buyer-routing decision tree — Readiness Gate §2.5.
 *
 * A translation of VISION.md's already-decided buyer-routing rules into a
 * checkable function, not a new strategic decision. See
 * docs/specs/readiness-gate.md §2.5.1 for why two page-count thresholds
 * exist and must never be collapsed into one constant.
 */

/**
 * Content-ready-SMB, scored fresh (rule 5): >=30 pages routes direct to
 * GEO Bot at first contact. VISION.md line 44: "30+ pages give the pipeline
 * real leverage." A DIFFERENT population/moment than GEO_UPSELL_UNLOCK_MIN_PAGES
 * below — do not unify them.
 */
export const GEO_DIRECT_ROUTE_MIN_PAGES = 30;

/**
 * Micro-SMB, already a Site Bot client, later re-scored for upsell (rule 3):
 * GEO Bot unlocks as the next ladder rung once their own site reaches >=15
 * pages. VISION.md line 43: "GEO Bot once >=15 pages exist." A DIFFERENT
 * population/moment than GEO_DIRECT_ROUTE_MIN_PAGES above — do not unify them.
 */
export const GEO_UPSELL_UNLOCK_MIN_PAGES = 15;

/** @typedef {'site-bot' | 'geo-bot'} PrimaryBotRoute */

/**
 * @param {{
 *   siteCrawl: { siteFound: boolean, pageCount: number|null },
 *   vertical: { archetype: 'micro-smb' | 'content-ready-smb' | 'unclassified' },
 * }} input
 * @returns {{
 *   primaryBotRoute: PrimaryBotRoute,
 *   secondaryUpsell?: 'gmb-bot',
 *   nearGeoThreshold?: boolean,
 *   thinContentWarning?: boolean,
 *   flagForHumanReview?: boolean,
 *   gscDataStatus: 'unknown-pre-onboarding',
 *   ruleFired: string,
 * }}
 */
export function routeDecision({ siteCrawl, vertical }) {
  const { siteFound, pageCount } = siteCrawl;
  const { archetype } = vertical;

  // Rule 1 — no site found: Site Bot's whole premise is starting from zero.
  if (!siteFound) {
    return {
      primaryBotRoute: 'site-bot',
      gscDataStatus: 'unknown-pre-onboarding',
      ruleFired: 'rule-1-no-site',
    };
  }

  // Archetype-first for content-ready-SMB (rules 4/5), evaluated BEFORE the
  // page-count-only rule 2 below — per §2.5's own worked example (rule 4's
  // "e.g. a new clinic with a thin site" explicitly covers the <15 range
  // too, not just 15-29) and per the spec's test #8 (pageCount:12,
  // content-ready-SMB -> rule 4, not rule 2). Rule 2's "pageCount < 15 ->
  // site-bot" is the archetype-agnostic/micro-SMB default, not a rule that
  // overrides VISION's archetype-first content-ready-SMB routing.
  if (archetype === 'content-ready-smb') {
    // Rule 5 — pageCount >= 30, content-ready-SMB: direct-to-GEO, no warnings.
    if (pageCount !== null && pageCount >= GEO_DIRECT_ROUTE_MIN_PAGES) {
      return {
        primaryBotRoute: 'geo-bot',
        gscDataStatus: 'unknown-pre-onboarding',
        ruleFired: 'rule-5-geo-direct',
      };
    }
    // Rule 4 — pageCount < 30, content-ready-SMB (e.g. a new clinic with a
    // thin site): GEO Bot still, per VISION's archetype-first rule, flagged.
    return {
      primaryBotRoute: 'geo-bot',
      thinContentWarning: true,
      gscDataStatus: 'unknown-pre-onboarding',
      ruleFired: 'rule-4-thin-content-ready-smb',
    };
  }

  if (archetype === 'micro-smb') {
    // Rule 6 — pageCount >= 30, micro-SMB: VISION never named this edge
    // case. Do not force a rule that doesn't exist — defer to human review
    // rather than guess. Safe default: site-bot (matches their archetype).
    if (pageCount !== null && pageCount >= GEO_DIRECT_ROUTE_MIN_PAGES) {
      return {
        primaryBotRoute: 'site-bot',
        flagForHumanReview: true,
        gscDataStatus: 'unknown-pre-onboarding',
        ruleFired: 'rule-6-micro-smb-unusually-content-heavy-defer-to-human',
      };
    }
    // Rule 3 — 15 <= pageCount < 30, micro-SMB: Site Bot still, GMB Bot
    // upsell, nearGeoThreshold flagged (the 15-page unlock is for an
    // EXISTING Site Bot client's later GEO attach — a genuinely different
    // number from rule 5's 30-page bar, per §2.5.1).
    if (pageCount !== null && pageCount >= GEO_UPSELL_UNLOCK_MIN_PAGES) {
      return {
        primaryBotRoute: 'site-bot',
        secondaryUpsell: 'gmb-bot',
        nearGeoThreshold: true,
        gscDataStatus: 'unknown-pre-onboarding',
        ruleFired: 'rule-3-micro-smb-near-geo-threshold',
      };
    }
  }

  // Rule 2 — site exists, pageCount < 15 (micro-SMB or unclassified): Site
  // Bot, no upsell flag yet. Rationale string must cite VISION.md's
  // explicit rule verbatim in the internal (non-client-facing) trace:
  // "GEO Bot is NOT the month-3 attach for 5-page Site Bot buyers — a
  // 5-page site has no surface for GEO Bot to work on."
  if (archetype !== 'unclassified') {
    return {
      primaryBotRoute: 'site-bot',
      gscDataStatus: 'unknown-pre-onboarding',
      ruleFired: 'rule-2-thin-site',
    };
  }

  // Unclassified archetype (never named by VISION) — same defer-don't-guess
  // posture as rule 6, since no archetype-specific rule above matched.
  return {
    primaryBotRoute: 'site-bot',
    flagForHumanReview: true,
    gscDataStatus: 'unknown-pre-onboarding',
    ruleFired: 'rule-unclassified-defer-to-human',
  };
}
