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
    const filePath = path.join(process.cwd(), 'data', 'lps', `${slug}.json`);
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
    robots: { index: false, follow: false },  // LP pages are private by default
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
  const heroImageUrl = assets.heroImages[0].url;

  return (
    <LandingPage
      theme={theme}
      assets={assets}
      copy={copy}
      data={collectedData}
      heroImageUrl={heroImageUrl}
    />
  );
}
