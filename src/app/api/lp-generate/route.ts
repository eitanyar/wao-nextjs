import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import { callGeminiJSON } from '@/lib/ai/gemini-fast';
import { callQwenJSON } from '@/lib/ai/qwen-fast';
import { AdsLandingCopyGateError, generateAdsLandingCopy } from '@/lib/lp/adsLandingCopy';

// Sell mission 2026-11-12: the copy step (system prompts, Qwen with Gemini fallback, the truth gates) lives in
// lib/lp/adsLandingCopy.ts, so it is testable and the eval script runs the same code.

function slugify(name: string, phone?: string): string {
  // Try Latin-only slug first (valid Cloudflare Pages project name)
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');
  if (latin.length >= 3) return latin;
  // Hebrew/non-Latin name — use timestamp + last-4 of phone for uniqueness
  const suffix = (phone || '').replace(/\D/g, '').slice(-4) || Date.now().toString(36).slice(-4);
  return `wao-client-${suffix}`;
}

function generateFallbackCopy(collectedData: CollectedData): LPCopy {
  const name = collectedData.businessName || collectedData.businessNiche || 'העסק שלנו';
  const location = collectedData.targetLocation || 'האזור שלך';
  const usp = collectedData.usp || 'שירות מקצועי ואיכותי';
  const hasPhone = collectedData.contactMethod?.includes('טלפון') || collectedData.contactMethod?.includes('להתקשר');
  const hasWhatsapp = collectedData.contactMethod?.includes('וואטסאפ');
  const hasForm = collectedData.contactMethod?.includes('טופס');
  const contactLabel = hasPhone ? 'התקשר עכשיו' : hasWhatsapp ? 'שלח וואטסאפ' : hasForm ? 'השאר פרטים' : 'התקשר עכשיו';

  return {
    heroHeadline: collectedData.idealClientFear
      ? `${collectedData.idealClientFear.slice(0, 45)}? יש לנו פתרון`
      : `${name} — ${location}`,
    heroSubheadline: usp.slice(0, 90),
    heroCta: contactLabel,
    trustBarItems: [
      collectedData.yearsInField ? `${collectedData.yearsInField} ניסיון` : 'ניסיון מוכח',
      collectedData.starRating ? `${collectedData.starRating}★ בגוגל` : 'לקוחות מרוצים',
      collectedData.license ? 'מורשה ומוסמך' : 'שירות מקצועי',
      collectedData.guarantee ? 'אחריות מלאה' : 'תמיד זמינים',
    ],
    aboutBlurb: `${name} מציעים שירות מקצועי ב${location}. ${usp}`,
    servicesHeadline: 'השירותים שלנו',
    serviceItems: (collectedData.secondaryServices || collectedData.businessNiche || 'שירות').split(/[,،\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6),
    faqHeadline: 'שאלות נפוצות',
    faqItems: [{ q: 'איך יוצרים קשר?', a: `ניתן להתקשר ל-${collectedData.phone || 'המספר שלנו'} או לשלוח וואטסאפ.` }],
    guaranteeBlock: collectedData.guarantee || `${name} מחויבים לשביעות רצון מלאה של כל לקוח.`,
    reviewFeatured: collectedData.reviewQuote || 'שירות מצוין ומקצועי, ממליץ בחום.',
    reviewContext: collectedData.starRating ? `${collectedData.starRating} כוכבים בגוגל` : '',
    responseTimeBadge: collectedData.responseTime || 'זמינים 24/7',
    scarcityLine: null,
    formHeadline: 'השאר פרטים ונחזור אליך בהקדם',
    stickyBarLine: 'זמינים עכשיו לשירותך',
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const collectedData: CollectedData = body.collectedData;

    if (!collectedData?.businessNiche) {
      return NextResponse.json({ error: 'collectedData.businessNiche is required' }, { status: 400 });
    }

    const rawSlug = body.slug || collectedData.preferredSlug;
    const slug = rawSlug
      ? rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || slugify(collectedData.businessName || collectedData.businessNiche || 'my-business', collectedData.phone)
      : slugify(collectedData.businessName || collectedData.businessNiche || 'my-business', collectedData.phone);
    let copy: LPCopy;

    const qwenConfigured = Boolean(process.env.QWEN_API_KEY && process.env.QWEN_BASE_URL);
    if (qwenConfigured || process.env.GEMINI_API_KEY) {
      // Tamar + Noa on Qwen (Eitan: Qwen's Sabra tone), Gemini per call as the fallback. HIGH thinking on Gemini: this is
      // final, unattended-quality landing-page copy (not a live chat turn) — see [[feedback_thinking_budget_matches_workload]].
      try {
        const result = await generateAdsLandingCopy(collectedData, {
          ...(qwenConfigured ? { callQwen: (system: string, user: string) => callQwenJSON(system, user, { thinkingBudget: 1500 }) } : {}),
          ...(process.env.GEMINI_API_KEY ? { callGemini: (system: string, user: string) => callGeminiJSON(system, user, { thinkingLevel: 'HIGH' }) } : {}),
          onEvent: event => console.warn('LP copy step:', JSON.stringify(event)),
        });
        copy = result.copy;
      } catch (e) {
        // A false claim never ships: the truth gates failed after one repair on a field that cannot be dropped.
        if (e instanceof AdsLandingCopyGateError) {
          return NextResponse.json({ error: 'copy_gate_failed', hits: e.hits.map(hit => `${hit.field}:${hit.rule}`) }, { status: 422 });
        }
        throw e;
      }
    } else {
      // Simulation fallback — no LLM cost
      copy = generateFallbackCopy(collectedData);
    }

    // Persist to filesystem
    const lpsDir = path.join(process.cwd(), 'data', 'lps');
    fs.mkdirSync(lpsDir, { recursive: true });
    const record = { slug, collectedData, copy, createdAt: new Date().toISOString() };
    fs.writeFileSync(path.join(lpsDir, `${slug}.json`), JSON.stringify(record, null, 2));

    return NextResponse.json({ success: true, url: `/lp/${slug}`, slug });
  } catch (error: any) {
    console.error('LP generation error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
