import { notFound } from "next/navigation";
import { connection } from "next/server";
import AdsBotPayClient from "@/components/google-ads/AdsBotPayClient";
import { adsBotCheckoutEnabled } from "@/lib/google-ads/billing/adsBotCheckoutFlag";
import { verifyPayLinkToken } from "@/lib/google-ads/billing/adsBotPayLink";

export const metadata = { robots: { index: false, follow: false } };

// Ads Bot pay page (mission item 3): reached only from the signed pay link in the post-approval email.
// ADS_BOT_CHECKOUT_ENABLED off (the default) = 404, exactly as before this page existed.
export default async function AdsBotPayPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  await connection();
  if (!adsBotCheckoutEnabled()) notFound();
  const { t } = await searchParams;
  const valid = verifyPayLinkToken(t) !== null;
  return <AdsBotPayClient token={valid ? String(t) : null} />;
}
