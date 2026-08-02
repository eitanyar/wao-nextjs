import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import LandingPage from '@/components/lp/LandingPage';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import type { CollectedData } from '@/lib/bot/prompts';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import type { Metadata } from 'next';

interface LPRecord {
  collectedData: CollectedData;
  copy: LPCopy;
  createdAt: string;
  slug: string;
}

function loadLP(slug: string): LPRecord | null {
  try {
    const decoded = decodeURIComponent(slug);
    const filePath = path.join(process.cwd(), 'data', 'lps', `${decoded}.json`);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as LPRecord;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const record = loadLP(slug);
  if (!record) return { title: 'דף נחיתה | WAO' };
  const { collectedData: d } = record;
  const name = d.businessName || d.businessNiche || '';
  const location = d.targetLocation || '';
  return {
    title: `${name}${location ? ` — ${location}` : ''} | WAO`,
    description: record.copy.heroSubheadline,
    robots: { index: false, follow: false },
  };
}

export default async function LPPage({ params }: Props) {
  const { slug } = await params;
  const record = loadLP(slug);
  if (!record) notFound();

  const { collectedData, copy } = record;
  const verticalKey = detectVertical(collectedData.businessNiche || '');
  const theme = VERTICAL_THEMES[verticalKey];
  const assets = VERTICAL_ASSETS[verticalKey];
  // Prefer the client's own photo (trust asset first — usually the strongest
  // "real local provider" shot per Dror's audit — then profile photo) over
  // generic vertical stock. Stock stays as the non-blocking fallback so the
  // LP never stalls on a missing upload.
  const heroImageUrl = collectedData.trustAssetUrls?.[0] || collectedData.profilePhotoUrl || assets.heroImages[0].url;

  // Pass only the fields LandingPage actually renders — it's a client
  // component, so the full CollectedData record (capacityUnit, avgJobValue,
  // closeRate, pricingNotes, exclusions, etc.) must never be handed to it;
  // see docs/missions/lp-site-bot-qa-fixes-2026-07.md (BUG 4).
  const publicData = {
    phone: collectedData.phone,
    whatsappNumber: collectedData.whatsappNumber,
    businessName: collectedData.businessName,
    businessNiche: collectedData.businessNiche,
    ownerName: collectedData.ownerName,
  };

  return (
    <LandingPage
      theme={theme}
      assets={assets}
      copy={copy}
      data={publicData}
      heroImageUrl={heroImageUrl}
      slug={slug}
    />
  );
}
