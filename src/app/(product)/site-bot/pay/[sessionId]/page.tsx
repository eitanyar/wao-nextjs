import { connection } from "next/server";
import SiteBotPayClient from "@/components/site-bot/SiteBotPayClient";
import { cardFieldDefaults } from "@/lib/site-bot/checkout/mockCard";

// Server part of the Site-Bot pay page: reads the runtime env (connection() opts into request-time rendering) to decide
// the card-field defaults. The mock test card is pre-filled only on a dev server with the mock provider.
export default async function SiteBotPayPage() {
  await connection();
  return <SiteBotPayClient cardDefaults={cardFieldDefaults(process.env)} />;
}
