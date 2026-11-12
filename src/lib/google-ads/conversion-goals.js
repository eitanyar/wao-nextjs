/**
 * Verified-lead-only bidding goal (ads-bot-phase2 spec §3 "Bidding-goal decision" and 0a / F3).
 *
 * Smart Bidding must optimise to the owner-verified lead only. The other four WAO conversion
 * actions (form, phone click, WhatsApp click, closed deal) stay recorded but secondary:
 *   - conversion_action.primary_for_goal: true only on the QUALIFIED_LEAD (verified-lead)
 *     action, false on the rest (it defaults to true when omitted, which made every action
 *     primary);
 *   - customer_conversion_goal / campaign_conversion_goal: biddable only for the verified-lead
 *     category~origin (QUALIFIED_LEAD~WEBSITE), not for the others.
 *
 * Pure planning functions (no network) plus one GAQL reader and one applier that take an
 * injected `customer` (google-ads-api Customer). Plain `.js` so the backfill script
 * (`scripts/google-ads-verified-lead-goal-backfill.mjs`) and the route can share it.
 */

/** google-ads-api enum values (ConversionActionCategory / ConversionOrigin), pinned v24. */
export const CATEGORY = Object.freeze({
  PHONE_CALL_LEAD: 11,
  SUBMIT_LEAD_FORM: 13,
  CONTACT: 18,
  QUALIFIED_LEAD: 22,
  CONVERTED_LEAD: 23,
});
export const ORIGIN_WEBSITE = 2;
const STATUS_ENABLED = 2;

/** The only conversion category Smart Bidding may optimise to. */
export const BIDDING_CATEGORY = CATEGORY.QUALIFIED_LEAD;

/** The categories WAO creates on every new account (`create-campaign/route.ts`, step 2). */
export const WAO_ACTION_CATEGORIES = Object.freeze([
  CATEGORY.SUBMIT_LEAD_FORM,
  CATEGORY.PHONE_CALL_LEAD,
  CATEGORY.CONTACT,
  CATEGORY.QUALIFIED_LEAD,
  CATEGORY.CONVERTED_LEAD,
]);

const CATEGORY_BY_NAME = Object.freeze({
  PHONE_CALL_LEAD: 11,
  SUBMIT_LEAD_FORM: 13,
  CONTACT: 18,
  QUALIFIED_LEAD: 22,
  CONVERTED_LEAD: 23,
});

/**
 * Normalises a category from GAQL (number) or REST/enum-name (string).
 * @param {number | string | null | undefined} value
 * @returns {number | null}
 */
export function normalizeCategory(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) return Number(value);
    return CATEGORY_BY_NAME[/** @type {keyof typeof CATEGORY_BY_NAME} */ (value)] ?? null;
  }
  return null;
}

/**
 * `primary_for_goal` for a conversion action created by WAO, by category.
 * @param {number | string} category
 */
export function isPrimaryConversionCategory(category) {
  return normalizeCategory(category) === BIDDING_CATEGORY;
}

/**
 * Plans goal updates so only the verified-lead category~origin is biddable. Works for both
 * `customer_conversion_goal` and `campaign_conversion_goal` rows. Rows already in the desired
 * state produce no operation.
 *
 * @param {Array<{ resource_name?: string | null, category?: number | string | null, origin?: number | string | null, biddable?: boolean | null }>} rows
 * @returns {Array<{ resource_name: string, biddable: boolean, from: boolean, category: number | null, origin: number | string | null }>}
 */
export function planGoalBiddabilityUpdates(rows) {
  const ops = [];
  for (const row of rows || []) {
    if (!row?.resource_name) continue;
    const category = normalizeCategory(row.category ?? null);
    const desired = category === BIDDING_CATEGORY;
    const current = row.biddable === true;
    if (current !== desired) ops.push({ resource_name: row.resource_name, biddable: desired, from: current, category, origin: row.origin ?? null });
  }
  return ops;
}

/**
 * Plans `primary_for_goal` updates for an existing account's conversion actions: the configured
 * verified-lead action becomes primary, every other ENABLED action becomes secondary.
 *
 * @param {Array<{ resource_name?: string | null, name?: string | null, category?: number | string | null, status?: number | string | null, primary_for_goal?: boolean | null }>} actions
 * @param {string} verifiedLeadResourceName
 * @returns {Array<{ resource_name: string, primary_for_goal: boolean, from: boolean, category: number | null }>}
 */
export function planConversionActionPrimaryUpdates(actions, verifiedLeadResourceName) {
  const ops = [];
  for (const action of actions || []) {
    if (!action?.resource_name) continue;
    const enabled = action.status === STATUS_ENABLED || action.status === 'ENABLED';
    if (!enabled) continue;
    const desired = action.resource_name === verifiedLeadResourceName;
    const current = action.primary_for_goal !== false;
    if (current !== desired) ops.push({ resource_name: action.resource_name, primary_for_goal: desired, from: current, category: normalizeCategory(action.category ?? null) });
  }
  return ops;
}

/**
 * Refuses accounts this goal model must not touch: no configured verified-lead action, the
 * configured action missing / not QUALIFIED_LEAD, or any ENABLED action outside the WAO set
 * (a founder-managed account like Retter or AAAsada would have its own bidding goals switched
 * off). Returns a list of reasons; empty means safe.
 *
 * @param {Array<{ resource_name?: string | null, category?: number | string | null, status?: number | string | null, type?: number | string | null }>} actions
 * @param {string | null | undefined} verifiedLeadResourceName
 * @returns {string[]}
 */
export function goalBackfillRefusals(actions, verifiedLeadResourceName) {
  const reasons = [];
  if (!verifiedLeadResourceName) {
    reasons.push('campaign config has no verifiedLeadConversionResourceName (not a WAO-created account)');
    return reasons;
  }
  const verified = (actions || []).find((a) => a?.resource_name === verifiedLeadResourceName);
  if (!verified) reasons.push(`verified-lead action ${verifiedLeadResourceName} not found in the account`);
  else if (normalizeCategory(verified.category ?? null) !== BIDDING_CATEGORY) reasons.push(`verified-lead action ${verifiedLeadResourceName} is not QUALIFIED_LEAD`);
  const foreign = (actions || []).filter((a) => {
    const enabled = a?.status === STATUS_ENABLED || a?.status === 'ENABLED';
    const category = normalizeCategory(a?.category ?? null);
    return enabled && (category === null || !WAO_ACTION_CATEGORIES.includes(category));
  });
  if (foreign.length) reasons.push(`${foreign.length} enabled conversion action(s) outside the WAO set: ${foreign.map((a) => a.resource_name).join(', ')}`);
  return reasons;
}

/**
 * Reads the current goal state of one customer (GAQL SELECTs only).
 *
 * @param {{ query: (gaql: string) => Promise<any[]> }} customer
 * @param {{ campaignResourceName?: string }} [options]
 */
export async function readConversionGoalState(customer, options = {}) {
  const actionRows = await customer.query(`
    SELECT conversion_action.resource_name, conversion_action.name, conversion_action.category,
      conversion_action.origin, conversion_action.status, conversion_action.type,
      conversion_action.primary_for_goal
    FROM conversion_action`);
  const customerGoalRows = await customer.query(`
    SELECT customer_conversion_goal.resource_name, customer_conversion_goal.category,
      customer_conversion_goal.origin, customer_conversion_goal.biddable
    FROM customer_conversion_goal`);
  const campaignFilter = options.campaignResourceName && /^customers\/\d+\/campaigns\/\d+$/.test(options.campaignResourceName)
    ? `WHERE campaign_conversion_goal.campaign = '${options.campaignResourceName}'`
    : '';
  const campaignGoalRows = await customer.query(`
    SELECT campaign_conversion_goal.resource_name, campaign_conversion_goal.campaign,
      campaign_conversion_goal.category, campaign_conversion_goal.origin, campaign_conversion_goal.biddable
    FROM campaign_conversion_goal ${campaignFilter}`);
  return {
    actions: actionRows.map((r) => r.conversion_action).filter(Boolean),
    customerGoals: customerGoalRows.map((r) => r.customer_conversion_goal).filter(Boolean),
    campaignGoals: campaignGoalRows.map((r) => r.campaign_conversion_goal).filter(Boolean),
  };
}

/**
 * Plans every update for one customer from its read state.
 * @param {Awaited<ReturnType<typeof readConversionGoalState>>} state
 * @param {string | null} verifiedLeadResourceName pass null to skip action-level updates
 */
export function planVerifiedLeadOnlyGoals(state, verifiedLeadResourceName) {
  return {
    actions: verifiedLeadResourceName ? planConversionActionPrimaryUpdates(state.actions, verifiedLeadResourceName) : [],
    customerGoals: planGoalBiddabilityUpdates(state.customerGoals),
    campaignGoals: planGoalBiddabilityUpdates(state.campaignGoals),
  };
}

/**
 * Applies a plan. `validateOnly` asks Google to validate without changing anything.
 *
 * @param {any} customer google-ads-api Customer
 * @param {ReturnType<typeof planVerifiedLeadOnlyGoals>} plan
 * @param {{ validateOnly?: boolean }} [options]
 */
export async function applyVerifiedLeadOnlyGoals(customer, plan, options = {}) {
  const opts = options.validateOnly ? { validate_only: true } : undefined;
  const applied = { actions: 0, customerGoals: 0, campaignGoals: 0 };
  if (plan.actions.length) {
    await customer.conversionActions.update(plan.actions.map((op) => ({ resource_name: op.resource_name, primary_for_goal: op.primary_for_goal })), opts);
    applied.actions = plan.actions.length;
  }
  if (plan.customerGoals.length) {
    await customer.customerConversionGoals.update(plan.customerGoals.map((op) => ({ resource_name: op.resource_name, biddable: op.biddable })), opts);
    applied.customerGoals = plan.customerGoals.length;
  }
  if (plan.campaignGoals.length) {
    await customer.campaignConversionGoals.update(plan.campaignGoals.map((op) => ({ resource_name: op.resource_name, biddable: op.biddable })), opts);
    applied.campaignGoals = plan.campaignGoals.length;
  }
  return applied;
}
