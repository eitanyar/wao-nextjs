import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount = 9.9, businessName = "WAO Google Ads Campaign Setup" } = body;

    // Ya'ad Sarig credentials (sandbox defaults)
    const masof = process.env.YAAD_TERMINAL_NUMBER || "1234567890";

    // In a live environment, we would fetch the payment page URL from Ya'ad API:
    // const yaadUrl = `https://yaadpay.yaad.co.il/p/?action=APIsign&Masof=${masof}&Amount=${amount}&Info=${encodeURIComponent(businessName)}&UTF8=True&UTF8out=True`;
    
    // For Sandbox/Simulation: We redirect them to our local mock Ya'ad payment page.
    // This allows the checkout flow to feel complete and redirect back to onboarding.
    const sandboxRedirectUrl = `/checkout/yaad-sandbox?amount=${amount}&masof=${masof}&info=${encodeURIComponent(businessName)}`;

    return NextResponse.json({ 
      success: true, 
      redirectUrl: sandboxRedirectUrl
    });
  } catch (error: any) {
    console.error("Error creating payment session:", error);
    return NextResponse.json({ success: false, error: "Failed to create payment session" }, { status: 500 });
  }
}
