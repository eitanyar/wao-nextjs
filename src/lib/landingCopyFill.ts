/**
 * Fills the `{net}` price token in a generated landing-copy module (scripts/build-landing-copy.mjs) with the price
 * from src/lib/payments/plans.ts, so no page source types its price. HEBREW-SAFETY: zero Hebrew bytes.
 */

export const LANDING_NET_TOKEN = "{net}";

/** The generated copy shape with every string leaf widened to `string`. */
export type FilledLandingCopy<T> = T extends string
  ? string
  : { readonly [K in keyof T]: FilledLandingCopy<T[K]> };

export function fillLandingCopy<T>(source: T, netAmount: number): FilledLandingCopy<T> {
  if (!Number.isInteger(netAmount) || netAmount <= 0) throw new Error(`Bad net amount: ${netAmount}`);
  const net = String(netAmount);
  const walk = (value: unknown): unknown => {
    if (typeof value === "string") return value.split(LANDING_NET_TOKEN).join(net);
    if (Array.isArray(value)) return Object.freeze(value.map(walk));
    if (value && typeof value === "object") {
      return Object.freeze(Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)])));
    }
    throw new Error(`Unexpected copy value: ${String(value)}`);
  };
  return walk(source) as FilledLandingCopy<T>;
}
