const OPERATOR_ENTITLEMENT = "google-ads-operator";
const INTERNAL_SUFFIX = ":internal";

let cachedAllowlist: Set<string> | null = null;

function parseAllowlist(): Set<string> {
  if (cachedAllowlist) return cachedAllowlist;

  const raw = process.env.GOOGLE_ADS_OPERATOR_CLIENTS || process.env.GOOGLE_ADS_OPERATOR_ALLOWLIST || "";
  cachedAllowlist = new Set(
    raw
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  );
  return cachedAllowlist;
}

function normalizeEntitlements(entitlements?: string[] | null): string[] {
  return (entitlements || []).map((e) => e.trim()).filter(Boolean);
}

export function hasOperatorAccess(clientId: string, entitlements?: string[] | null): boolean {
  if (!clientId) return false;

  const normalized = normalizeEntitlements(entitlements);
  if (normalized.includes(OPERATOR_ENTITLEMENT) || normalized.includes(`${OPERATOR_ENTITLEMENT}${INTERNAL_SUFFIX}`)) {
    return true;
  }

  return parseAllowlist().has(clientId);
}

export function isOperatorEntitlement(entitlement: string): boolean {
  return entitlement === OPERATOR_ENTITLEMENT || entitlement === `${OPERATOR_ENTITLEMENT}${INTERNAL_SUFFIX}`;
}

export function operatorAccessSource(clientId: string, entitlements?: string[] | null): "entitlement" | "allowlist" | null {
  const normalized = normalizeEntitlements(entitlements);
  if (normalized.includes(OPERATOR_ENTITLEMENT) || normalized.includes(`${OPERATOR_ENTITLEMENT}${INTERNAL_SUFFIX}`)) {
    return "entitlement";
  }
  if (parseAllowlist().has(clientId)) {
    return "allowlist";
  }
  return null;
}
