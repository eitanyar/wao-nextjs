import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { getDb, type SubscriptionRow } from "@/lib/payments/db";
import { ADS_BOT_PLAN, formatShekels, planChargeAmount } from "@/lib/payments/plans";
import { planPaidThrough } from "@/lib/payments/subscriptions";
import { adsBotClientForSubscription } from "@/lib/google-ads/billing/adsBotBilling";
import { adsBotCheckoutEnabled } from "@/lib/google-ads/billing/adsBotCheckoutFlag";
import { recordManualChargeAction, sendPayLinkAction } from "./action";

// Staff-only Ads Bot billing (mission item 3). English for now (staff-facing; Hebrew labels can come from waocopy later).
export const metadata = { robots: { index: false }, title: "Ads Bot billing | WAO" };

const ERRORS: Record<string, string> = {
  invalid_client: "Invalid client id.",
  invalid_email: "Invalid email.",
  invalid_date: "Invalid charge date (YYYY-MM-DD, not in the future).",
  invalid_amount: "Invalid amount.",
  invalid_reference: "Takbull reference is required (max 100 characters).",
  duplicate_reference: "This Takbull reference is already recorded.",
  readiness_write_failed: "Charge recorded, but the readiness record could not be updated. Set feePaid on /admin/live-readiness.",
  checkout_disabled: "ADS_BOT_CHECKOUT_ENABLED is off: pay links are disabled.",
  pay_link_invalid: "Could not build the pay link (check client id, email, and ADS_BOT_PAY_LINK_SECRET).",
};

const input = { width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "inherit" } as const;

export default async function AdsBotBillingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const jar = await cookies();
  if (!(await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? ""))) redirect("/admin/login?next=%2Fadmin%2Fads-bot-billing");
  const params = await searchParams;
  const rows = getDb().prepare(`SELECT * FROM subscriptions WHERE plan = ? ORDER BY created_at DESC LIMIT 200`).all(ADS_BOT_PLAN.id) as SubscriptionRow[];
  const checkoutOn = adsBotCheckoutEnabled();

  return (
    <main dir="ltr" style={{ maxWidth: 920, margin: "40px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: 24 }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 800 }}>Ads Bot billing</h1>
      <p style={{ opacity: 0.7, fontSize: "0.85rem" }}>
        Plan: {formatShekels(ADS_BOT_PLAN.netAmount)} + VAT = {formatShekels(planChargeAmount(ADS_BOT_PLAN))} / month. Checkout flag (ADS_BOT_CHECKOUT_ENABLED): {checkoutOn ? "ON" : "OFF"}.
      </p>
      {params.error && <p style={{ color: "#f87171" }}>{ERRORS[params.error] ?? "Error."}</p>}
      {params.recorded && <p style={{ color: "#4ade80" }}>Charge recorded on subscription {params.recorded}. Readiness feePaid set.</p>}
      {params.amountWarning && <p style={{ color: "#fbbf24" }}>Warning: the amount differs from the plan total {formatShekels(planChargeAmount(ADS_BOT_PLAN))}.</p>}
      {params.sent && <p style={{ color: "#4ade80" }}>Pay link sent.</p>}

      <section>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Record a charge taken in Takbull (pilot)</h2>
        <form action={recordManualChargeAction} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
          <label>Client id<input name="clientId" required style={input} /></label>
          <label>Owner email<input name="email" type="email" required style={input} /></label>
          <label>Charge date (YYYY-MM-DD)<input name="chargeDate" required placeholder="2026-11-29" style={input} /></label>
          <label>Amount charged, VAT incl. (ILS)<input name="amount" required defaultValue={String(planChargeAmount(ADS_BOT_PLAN))} style={input} /></label>
          <label style={{ gridColumn: "1 / -1" }}>Takbull reference (transaction / document no.)<input name="takbullReference" required style={input} /></label>
          <button type="submit" style={{ gridColumn: "1 / -1", padding: "8px 12px", fontWeight: 700 }}>Record charge</button>
        </form>
      </section>

      <section>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Send the pay link (after approval)</h2>
        <form action={sendPayLinkAction} style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <label>Client id<input name="clientId" required style={input} /></label>
          <label>Owner email<input name="email" type="email" required style={input} /></label>
          <label>First name<input name="firstName" required style={input} /></label>
          <button type="submit" disabled={!checkoutOn} style={{ gridColumn: "1 / -1", padding: "8px 12px", fontWeight: 700 }}>
            {checkoutOn ? "Send pay link" : "Send pay link (disabled: checkout flag off)"}
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Ads Bot subscriptions</h2>
        <table style={{ width: "100%", fontSize: "0.85rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Client</th><th>Customer</th><th>Status</th><th>Provider</th><th>Anchor</th><th>Periods</th><th>Paid through</th><th>Cancel effective</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <td>{adsBotClientForSubscription(row.id) ?? "-"}</td>
                <td>{row.user_id}</td>
                <td>{row.status}{row.cancel_at_period_end === 1 ? " (cancel scheduled)" : ""}</td>
                <td>{row.provider}</td>
                <td>{row.billing_anchor_at?.slice(0, 10) ?? "-"}</td>
                <td>{row.periods_paid ?? 0}</td>
                <td>{planPaidThrough(row)?.slice(0, 10) ?? "-"}</td>
                <td>{row.cancel_effective_at?.slice(0, 10) ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
