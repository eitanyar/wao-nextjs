import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import { buildLpCopyPrompt } from '@/lib/lp/lpCopyPrompt';
import { TAMAR_SYSTEM_PROMPT } from '@/lib/bot/prompts';

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

Return: corrected JSON object only. No prose.`;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^֐-׿a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
    .replace(/-$/, '');
}

async function callAzure(systemPrompt: string, userMessage: string, model = 'haiku'): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!apiKey || !endpoint) throw new Error('Azure OpenAI not configured');

  // Use mini for Tamar (medium effort), Haiku-equivalent for Noa
  const deployment = model === 'haiku'
    ? (process.env.AZURE_OPENAI_DEPLOYMENT_FAST || 'gpt-4o-mini')
    : (process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'o4-mini');

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: model === 'haiku' ? 0.1 : 0.5,
    }),
  });
  const data = await res.json();
  return data.choices[0].message.content;
}

function generateFallbackCopy(collectedData: CollectedData): LPCopy {
  const name = collectedData.businessName || collectedData.businessNiche || 'העסק שלנו';
  const location = collectedData.targetLocation || 'האזור שלך';
  const usp = collectedData.usp || 'שירות מקצועי ואיכותי';
  const contactLabel = collectedData.contactMethod?.includes('וואטסאפ') ? 'שלח וואטסאפ' : 'התקשר עכשיו';

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
    responseTimeBadge: collectedData.responseTime || null,
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

    const slug = body.slug || slugify(collectedData.businessName || collectedData.businessNiche || 'my-business');
    let copy: LPCopy;

    const apiKey = process.env.AZURE_OPENAI_KEY;

    if (apiKey) {
      // Tamar — MEDIUM effort (standard deployment)
      const tamarPrompt = buildLpCopyPrompt(collectedData);
      const tamarRaw = await callAzure(TAMAR_SYSTEM_PROMPT, tamarPrompt, 'standard');
      const tamarCopy = JSON.parse(tamarRaw) as LPCopy;

      // Noa — LOW effort (fast/cheap deployment)
      const noaRaw = await callAzure(NOA_LP_QA_PROMPT, JSON.stringify(tamarCopy), 'haiku');
      copy = JSON.parse(noaRaw) as LPCopy;
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
