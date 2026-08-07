import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getPaymentProvider } from '@/lib/payments/get-provider';
import { clientRecordExists } from '@/lib/geo/client';

/**
 * Self-serve GEO Bot signup — step 1 of 2 (mirrors Site Bot's
 * checkout/init + checkout/callback split, see that route's doc comment).
 * GEO Bot is sold as a direct ₪199/month subscription, not a one-time
 * charge (VISION.md line 35) — this route runs the mock provider's
 * `createTokenizationSession` the same way Site Bot's one-time checkout
 * does; there's no separate free trial period to model here (the first
 * charge IS the ₪199 first month).
 *
 * The real recurring-subscription engine (`src/lib/payments/subscriptions.ts`,
 * SQLite-backed, cron-charged monthly) already exists and is provider-
 * agnostic — but its `returnUrl` is hardcoded to the generic
 * `/api/subscriptions/callback`, which has no hook for creating GEO's
 * file-based `data/clients/{clientId}/client.json` record. Rather than
 * couple that shared engine to GEO Bot specifically, this route stays
 * self-contained like Site Bot's, and stores its own pending-session file.
 * Wiring GEO Bot onto the shared monthly-recharge cron is a natural
 * follow-up once a second product needs the same pattern.
 */
const GEO_PRICE = 199;

interface GeoSignupInput {
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
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      // Hebrew business names are common — fall back to a generic prefix
      // rather than emit an empty/garbage slug from stripped non-Latin chars.
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'geo-client'
  );
}

function uniqueClientId(base: string): string {
  let candidate = base;
  let suffix = 1;
  while (clientRecordExists(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<GeoSignupInput>;
    const required: (keyof GeoSignupInput)[] = [
      'businessName',
      'siteUrl',
      'email',
      'businessNiche',
      'approvalContact',
      'approvalWhatsapp',
    ];
    const missing = required.filter((k) => !body[k] || !String(body[k]).trim());
    if (missing.length) {
      return NextResponse.json({ error: `Missing required field(s): ${missing.join(', ')}` }, { status: 400 });
    }

    const clientId = uniqueClientId(slugify(body.businessName!));
    const sessionId = crypto.randomUUID();
    const pin = String(Math.floor(1000 + Math.random() * 9000));

    const pendingDir = path.join(process.cwd(), 'data', 'geo-signups-pending');
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir, `${sessionId}.json`),
      JSON.stringify({ clientId, pin, input: body, createdAt: new Date().toISOString() }, null, 2)
    );

    const origin = new URL(req.url).origin;
    const provider = getPaymentProvider();
    await provider.createTokenizationSession({
      customerId: sessionId,
      returnUrl: `${origin}/geo/signup/pay/${sessionId}`,
      initialAmount: GEO_PRICE,
      description: 'WAO GEO Bot — מנוי חודשי',
    });

    return NextResponse.json({ sessionId, clientId, amount: GEO_PRICE });
  } catch (error: any) {
    console.error('GEO Bot signup init error:', error);
    return NextResponse.json({ error: error.message || 'Signup init failed' }, { status: 500 });
  }
}
