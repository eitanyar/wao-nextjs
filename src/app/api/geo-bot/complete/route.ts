import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { GeoCollectedData } from '@/lib/geo/prompts';
import { writeGeoLead, mapCollectedToClientDraft } from '@/lib/geo/leads';
import { sendGeoLeadNotificationEmail } from '@/lib/mail';
import { buildWaLink } from '@/lib/geo/whatsapp';

const GREETING = 'היי, כאן WAO — קיבלנו את הפרטים שהשארת. בוא נתחיל.';

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'geo-client'
  );
}

interface CompleteInput {
  collectedData: GeoCollectedData;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<CompleteInput>;
    const collectedData = body.collectedData;

    if (!collectedData?.businessNiche || typeof collectedData.businessNiche !== 'string' || !collectedData.businessNiche.trim()) {
      return NextResponse.json({ error: 'businessNiche required' }, { status: 400 });
    }

    const leadId = `${slugify(collectedData.businessNiche)}-${crypto.randomUUID().slice(0, 8)}`;
    const draft = mapCollectedToClientDraft(collectedData, leadId);

    const lead = {
      leadId,
      createdAt: new Date().toISOString(),
      raw: collectedData,
      clientRecordDraft: draft,
    };

    writeGeoLead(lead);

    let clientWaLink: string | undefined;
    if (collectedData.approvalWhatsapp) {
      clientWaLink = buildWaLink(collectedData.approvalWhatsapp, GREETING);
    }

    try {
      await sendGeoLeadNotificationEmail({
        businessName: collectedData.businessNiche || '',
        businessNiche: collectedData.businessNiche || '',
        topService: collectedData.topService,
        targetLocation: collectedData.targetLocation,
        siteUrl: collectedData.siteUrl,
        hasSearchConsole: collectedData.hasSearchConsole,
        contentOwner: collectedData.contentOwner as 'owner' | 'team' | 'agency' | 'nobody' | undefined,
        geoSophistication: collectedData.geoSophistication as 0 | 1 | 2 | 3 | undefined,
        recommendedTier: collectedData.recommendedTier,
        approvalContact: collectedData.approvalContact,
        clientWaLink,
      });
    } catch (emailError) {
      console.error('[geo-bot/complete] Email notification failed (non-fatal):', emailError);
    }

    return NextResponse.json({ ok: true, leadId });
  } catch (error: unknown) {
    console.error('[geo-bot/complete]', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
