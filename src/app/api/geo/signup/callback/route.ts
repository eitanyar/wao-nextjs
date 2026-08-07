import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { getPaymentProvider } from '@/lib/payments/get-provider';
import { getInvoiceProvider } from '@/lib/payments/get-invoice-provider';
import { writeClientRecord, clientRecordExists, type GeoClientRecord } from '@/lib/geo/client';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';

const GEO_PRICE = 199;

interface PendingRecord {
  clientId: string;
  pin: string;
  input: {
    businessName: string;
    siteUrl: string;
    email: string;
    businessNiche: string;
    topService?: string;
    targetLocation?: string;
    usp?: string;
    approvalContact: string;
    approvalWhatsapp: string;
    tone?: string;
  };
  createdAt: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const sessionId: string = body.sessionId;
    if (!sessionId) return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });

    const pendingPath = path.join(process.cwd(), 'data', 'geo-signups-pending', `${sessionId}.json`);
    let pending: PendingRecord;
    try {
      pending = JSON.parse(fs.readFileSync(pendingPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: 'Signup session not found or already used' }, { status: 404 });
    }

    if (clientRecordExists(pending.clientId)) {
      // Replayed callback against an already-provisioned client — don't re-charge.
      return NextResponse.json({ error: 'This signup was already completed.' }, { status: 409 });
    }

    const provider = getPaymentProvider();

    const verify = await provider.verifyTokenizationCallback({ sessionId });
    if (!verify.valid || !verify.token) {
      return NextResponse.json({ error: 'אימות התשלום נכשל' }, { status: 402 });
    }

    const charge = await provider.chargeToken({
      token: verify.token,
      amount: GEO_PRICE,
      description: 'WAO GEO Bot — מנוי חודשי',
      idempotencyKey: sessionId,
    });
    if (!charge.success) {
      return NextResponse.json(
        { error: charge.errorMessage || 'החיוב נכשל', retryable: charge.isRetryable },
        { status: 402 }
      );
    }

    const record: GeoClientRecord = {
      clientId: pending.clientId,
      siteUrl: pending.input.siteUrl,
      cmsType: 'unknown',
      businessNiche: pending.input.businessNiche,
      topService: pending.input.topService || pending.input.businessNiche,
      targetLocation: pending.input.targetLocation || 'unknown — to be assessed',
      usp: pending.input.usp || '',
      clientQuestions: '',
      exclusions: '',
      approvalContact: pending.input.approvalContact,
      approvalWhatsapp: pending.input.approvalWhatsapp,
      tone: pending.input.tone || 'unknown — to be assessed',
      pin: pending.pin,
      entitlements: ['geo'],
      wpConnected: false,
      platform: null,
      gscConnected: false,
    };
    writeClientRecord(record);

    // Invoice issuance must never block or fail the already-succeeded charge
    // (same invariant as site-bot's checkout callback / invoicing.ts).
    try {
      const invoiceProvider = getInvoiceProvider();
      await invoiceProvider.createInvoice({
        customerName: pending.input.businessName,
        customerEmail: pending.input.email,
        amount: GEO_PRICE,
        description: 'WAO GEO Bot — מנוי חודשי',
        externalId: charge.providerTransactionId || sessionId,
      });
    } catch (err) {
      console.error(`[geo signup callback] Failed to issue invoice for session=${sessionId}:`, err);
    }

    // Auto-login the client into the same portal /client/login uses (pin-based,
    // wao-client cookie) so they land straight in the GSC-connect step without
    // re-entering the PIN they were just handed.
    const token = await createSessionToken(pending.clientId);
    const jar = await cookies();
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });

    fs.rmSync(pendingPath, { force: true });

    return NextResponse.json({ success: true, clientId: pending.clientId, pin: pending.pin });
  } catch (error: any) {
    console.error('GEO Bot signup callback error:', error);
    return NextResponse.json({ error: error.message || 'Signup failed' }, { status: 500 });
  }
}
