import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import { buildLpCopyPrompt } from '@/lib/lp/lpCopyPrompt';
import { callGeminiJSON } from '@/lib/ai/gemini-fast';

// buildLpCopyPrompt() is a complete, self-contained instruction set — unlike
// the Ads Bot's TAMAR_SYSTEM_PROMPT (RSA headline/description schema), which
// must NOT be reused here. See the identical fix in site-bot/generate/route.ts.
const LP_COPY_SYSTEM_PROMPT = 'You are a Hebrew copywriter executing the exact instructions and JSON schema given in the user message. Return only the JSON object described there — no prose, no markdown fences.';

// Noa's QA prompt — LOW effort, Haiku, checklist only
const NOA_LP_QA_PROMPT = `You are Noa, Hebrew language QA editor.
Apply ONLY these corrections to the LP copy JSON you receive. Return corrected JSON only.

Checklist (fix silently — no explanations):
1. Double spaces → single space
2. Straight quotes (") → Hebrew gershayim (״) when opening/closing a quote
3. Straight apostrophe (') → Hebrew geresh (׳) in Hebrew words
4. Em-dash without spaces or with double spaces → em-dash with single space each side ( — )
5. Plural male address → singular male (replace "אתם" with "אתה", "תוכלו" with "תוכל", etc.)
6. Translated-Hebrew calques like "עשה לייק", "לחץ כאן" (too digital) → natural Hebrew
7. "heroHeadline" must end in a noun or active verb — remove trailing "..." if present
8. Enforce these max character lengths (Hebrew chars count 1 each). Any field over its
   limit must be shortened to fit — cut filler words and redundant phrasing, never the
   concrete detail/number/name that makes the line specific instead of generic:
   - heroHeadline: max 68 chars
   - heroSubheadline: max 90 chars
   - heroCta: max 15 chars
   - trustBarItems: each array item max 20 chars
   - aboutBlurb: max 320 chars
   - servicesHeadline: max 35 chars
   - serviceItems: each array item max 25 chars
   - faqHeadline: max 30 chars
   - faqItems[].a: max 120 chars each (per FAQ answer)
   - guaranteeBlock: max 100 chars total
   - formHeadline: max 35 chars
   - stickyBarLine: max 25 chars

Rules 2 and 3 apply ONLY inside Hebrew text content (JSON string values). Never
alter the JSON structural characters themselves — every property name and every
string value must remain wrapped in exactly one pair of standard ASCII double
quotes ("). The result must be syntactically valid JSON, parseable by JSON.parse.

Return: corrected JSON object only. No prose.`;

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

    if (process.env.GEMINI_API_KEY) {
      // Tamar — write the LP copy. HIGH thinking: this is final, unattended-quality
      // landing-page copy (not a live chat turn) — see [[feedback_thinking_budget_matches_workload]].
      const tamarPrompt = buildLpCopyPrompt(collectedData);
      const tamarRaw = await callGeminiJSON(LP_COPY_SYSTEM_PROMPT, tamarPrompt, { thinkingLevel: 'HIGH' });
      const tamarCopy = JSON.parse(tamarRaw) as LPCopy;

      // Noa — QA pass. Fail-soft: fall back to Tamar's copy rather than
      // failing the whole generation over a polish step (see identical
      // fix in site-bot/generate/route.ts for why this is fail-soft).
      try {
        const noaRaw = await callGeminiJSON(NOA_LP_QA_PROMPT, JSON.stringify(tamarCopy), { thinkingLevel: 'HIGH' });
        copy = JSON.parse(noaRaw) as LPCopy;
      } catch (e: any) {
        console.warn('LP Noa QA pass failed, using unreviewed Tamar copy:', e.message);
        copy = tamarCopy;
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
