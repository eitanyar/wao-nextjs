import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount = 1500, businessName = 'WAO Google Ads Campaign Setup', slug = 'campaign' } = body;

    const terminalNumber = process.env.YAAD_TERMINAL_NUMBER;
    const isLive = Boolean(terminalNumber && terminalNumber !== '1234567890' && process.env.YAAD_LIVE_MODE === 'true');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const successUrl = `${baseUrl}/api/checkout/callback?status=success&slug=${encodeURIComponent(slug)}`;
    const errorUrl = `${baseUrl}/api/checkout/callback?status=error&slug=${encodeURIComponent(slug)}`;

    if (isLive) {
      const yaadApiUrl = 'https://yaadpay.yaad.co.il/p/';
      
      const payload = new URLSearchParams({
        action: 'APIsign',
        Masof: terminalNumber || '',
        Amount: String(amount),
        Info: businessName,
        MoreData: JSON.stringify({ slug }),
        UTF8: 'True',
        UTF8out: 'True',
        Page: '1',
        SendEmail: 'True',
        Sign: 'True',
        UTF8_SuccessURL: successUrl,
        UTF8_ErrorURL: errorUrl,
      });

      const response = await fetch(yaadApiUrl, {
        method: 'POST',
        body: payload,
      });

      const text = await response.text();
      if (text.includes('http://') || text.includes('https://')) {
        return NextResponse.json({ success: true, redirectUrl: text.trim() });
      } else {
        const hostedUrl = `https://yaadpay.yaad.co.il/p/?action=pay&Masof=${terminalNumber}&Amount=${amount}&Info=${encodeURIComponent(businessName)}&SuccessURL=${encodeURIComponent(successUrl)}&ErrorURL=${encodeURIComponent(errorUrl)}`;
        return NextResponse.json({ success: true, redirectUrl: hostedUrl });
      }
    } else {
      const sandboxRedirectUrl = `/checkout/yaad-sandbox?amount=${amount}&masof=${terminalNumber || '1234567890'}&info=${encodeURIComponent(businessName)}&slug=${encodeURIComponent(slug)}`;
      return NextResponse.json({ 
        success: true, 
        redirectUrl: sandboxRedirectUrl,
        mode: 'sandbox'
      });
    }
  } catch (error: any) {
    console.error('Error creating payment session:', error);
    return NextResponse.json({ success: false, error: 'Failed to create payment session' }, { status: 500 });
  }
}
