import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { CollectedData } from '@/lib/bot/prompts';
import type { SiteCopy } from '@/lib/lp/lpCopyPrompt';
import { buildSiteCopyPrompt } from '@/lib/lp/lpCopyPrompt';
import { callQwenJSON } from '@/lib/ai/qwen-fast';
import { buildCoreThirtyNodes } from '@/lib/lp/coreThirty';
import type { CoreThirtyPageCopy } from '@/lib/lp/coreThirtyCopy';
import { generateCoreThirtyPageCopy } from '@/lib/lp/coreThirtyCopy';

// Small local async pool — mirrors scripts/geo-generate-content.mjs's
// runWithConcurrency helper. Keeps concurrent Qwen calls bounded instead of
// firing all ~30 core-30 node generations in parallel.
async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;

  async function runNext(): Promise<void> {
    if (i >= tasks.length) return;
    const idx = i++;
    results[idx] = await tasks[idx]();
    await runNext();
  }

  await Promise.all(Array.from({ length: limit }, runNext));
  return results;
}

// buildSiteCopyPrompt() is already a complete, self-contained instruction set
// (persona, hard rules, and the exact output schema) — unlike the Ads Bot's
// TAMAR_SYSTEM_PROMPT (which targets a totally different RSA headline/description
// schema and must NOT be reused here, see prompts.ts). This system instruction
// only needs to tell Gemini to follow the user message's instructions verbatim.
const SITE_COPY_SYSTEM_PROMPT = 'You are a Hebrew copywriter executing the exact instructions and JSON schema given in the user message. Return only the JSON object described there — no prose, no markdown fences.';

// Noa's QA prompt — LOW effort, Haiku, checklist only.
// Same checklist as lp-generate's NOA_LP_QA_PROMPT — kept in sync manually since
// this route generates the 3 extra Site Bot fields Noa must also QA.
const NOA_SITE_QA_PROMPT = `You are Noa, Hebrew language QA editor.
Apply ONLY these corrections to the site copy JSON you receive. Return corrected JSON only.

Checklist (fix silently — no explanations):
1. Double spaces → single space
2. Straight quotes (") → Hebrew gershayim (״) when opening/closing a quote
3. Straight apostrophe (') → Hebrew geresh (׳) in Hebrew words
4. Em-dash without spaces or with double spaces → em-dash with single space each side ( — )
5. Plural male address → singular male (replace "אתם" with "אתה", "תוכלו" with "תוכל", etc.)
6. Translated-Hebrew calques like "עשה לייק", "לחץ כאן" (too digital) → natural Hebrew
7. "heroHeadline" and "aboutPageHeadline" must end in a noun or active verb — remove trailing "..." if present

Rules 2 and 3 apply ONLY inside Hebrew text content (JSON string values). Never
alter the JSON structural characters themselves — every property name and every
string value must remain wrapped in exactly one pair of standard ASCII double
quotes ("). The result must be syntactically valid JSON, parseable by JSON.parse.

Return: corrected JSON object only. No prose.`;

function slugify(name: string, phone?: string): string {
  const latin = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40)
    .replace(/^-|-$/g, '');
  if (latin.length >= 3) return latin;
  const suffix = (phone || '').replace(/\D/g, '').slice(-4) || Date.now().toString(36).slice(-4);
  return `wao-client-${suffix}`;
}

function generateFallbackCopy(collectedData: CollectedData): SiteCopy {
  const name = collectedData.businessName || collectedData.businessNiche || 'העסק שלנו';
  const location = collectedData.targetLocation || 'האזור שלך';
  const usp = collectedData.usp || 'שירות מקצועי ואיכותי';
  const hasPhone = collectedData.contactMethod?.includes('טלפון') || collectedData.contactMethod?.includes('להתקשר');
  const hasWhatsapp = collectedData.contactMethod?.includes('וואטסאפ');
  const hasForm = collectedData.contactMethod?.includes('טופס');
  const contactLabel = hasPhone ? 'התקשר עכשיו' : hasWhatsapp ? 'שלח וואטסאפ' : hasForm ? 'השאר פרטים' : 'התקשר עכשיו';
  const serviceNames = (collectedData.secondaryServices || collectedData.businessNiche || 'שירות')
    .split(/[,،\n]/).map(s => s.trim()).filter(Boolean).slice(0, 6);

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
    serviceItems: serviceNames,
    faqHeadline: 'שאלות נפוצות',
    faqItems: [{ q: 'איך יוצרים קשר?', a: `ניתן להתקשר ל-${collectedData.phone || 'המספר שלנו'} או לשלוח וואטסאפ.` }],
    guaranteeBlock: collectedData.guarantee || `${name} מחויבים לשביעות רצון מלאה של כל לקוח.`,
    reviewFeatured: collectedData.reviewQuote || 'שירות מצוין ומקצועי, ממליץ בחום.',
    reviewContext: collectedData.starRating ? `${collectedData.starRating} כוכבים בגוגל` : '',
    responseTimeBadge: collectedData.responseTime || 'זמינים 24/7',
    scarcityLine: null,
    formHeadline: 'השאר פרטים ונחזור אליך בהקדם',
    stickyBarLine: 'זמינים עכשיו לשירותך',
    aboutPageHeadline: `קצת עלינו — ${name}`,
    aboutPageBody: `${name} פועלים ב${location} ומציעים ${usp}. ${collectedData.yearsInField ? `עם ${collectedData.yearsInField} ניסיון בתחום, ` : ''}אנחנו כאן כדי לתת לך שירות אמין וזמין.`,
    serviceDetails: serviceNames.length > 0
      ? serviceNames.map(n => ({ name: n, description: 'שירות מקצועי ואמין, מותאם לצרכים שלך.' }))
      : [{ name: collectedData.businessNiche || 'שירות', description: 'שירות מקצועי ואמין, מותאם לצרכים שלך.' }],
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

    let copy: SiteCopy;

    if (process.env.GEMINI_API_KEY) {
      // Tamar — write the site copy. LLM JSON output occasionally comes back
      // malformed (truncated array, stray token) — retry once before falling
      // back to the deterministic template, same tolerance the Noa pass below
      // already has, rather than failing the whole request over one bad parse.
      const tamarPrompt = buildSiteCopyPrompt(collectedData);
      let tamarCopy: SiteCopy;
      try {
        const tamarRaw = await callQwenJSON(SITE_COPY_SYSTEM_PROMPT, tamarPrompt, { thinkingBudget: 1500 });
        tamarCopy = JSON.parse(tamarRaw) as SiteCopy;
      } catch (e: any) {
        console.warn('Site Bot Tamar pass failed to parse, retrying once:', e.message);
        try {
          const tamarRetryRaw = await callQwenJSON(SITE_COPY_SYSTEM_PROMPT, tamarPrompt, { thinkingBudget: 1500 });
          tamarCopy = JSON.parse(tamarRetryRaw) as SiteCopy;
        } catch (e2: any) {
          console.warn('Site Bot Tamar retry also failed, using fallback template:', e2.message);
          tamarCopy = generateFallbackCopy(collectedData);
        }
      }

      // Noa — QA pass on Tamar's copy. If it comes back malformed (rare —
      // the quote-style checklist can occasionally trip over JSON's own
      // structural quotes), fall back to Tamar's copy rather than failing
      // the whole generation over a polish step.
      try {
        const noaRaw = await callQwenJSON(NOA_SITE_QA_PROMPT, JSON.stringify(tamarCopy), { think: false });
        copy = JSON.parse(noaRaw) as SiteCopy;
      } catch (e: any) {
        console.warn('Site Bot Noa QA pass failed, using unreviewed Tamar copy:', e.message);
        copy = tamarCopy;
      }
    } else {
      // Simulation fallback — no LLM cost
      copy = generateFallbackCopy(collectedData);
    }

    // Core-30 (service x city) supplementary local-SEO pages — pure node list
    // is always safe to compute (fail-closed to [] internally). LLM copy
    // generation only runs under the same live-LLM gate the site-wide copy
    // above uses; in simulation/offline mode this layer has no deterministic
    // Hebrew fallback template (coreThirtyCopy.ts's own doc comment), so it
    // must never be attempted without a real API key.
    const coreThirtyNodes = buildCoreThirtyNodes(collectedData);
    const coreThirtyCopies: Record<string, CoreThirtyPageCopy> = {};

    if (process.env.GEMINI_API_KEY && coreThirtyNodes.length > 0) {
      const tasks = coreThirtyNodes.map((node) => async () => {
        try {
          const nodeCopy = await generateCoreThirtyPageCopy(node, collectedData);
          coreThirtyCopies[node.id] = nodeCopy;
        } catch (e: any) {
          console.warn(`Core-30 generation failed for node ${node.id}, omitting from this site:`, e.message);
        }
      });
      // Bounded concurrency — same limit=2 pattern as geo-generate-content.mjs's
      // Qwen calls; never fire all ~30 node generations in parallel.
      await runWithConcurrency(tasks, 2);
    }

    // Record the vatStatus collection timestamp — auditable basis for the
    // accessibility-page exemption decision. Missing/unclear vatStatus is
    // left undefined here, which renderSitePages treats as non-exempt.
    const stampedData: CollectedData = collectedData.vatStatus
      ? { ...collectedData, vatStatusCollectedAt: collectedData.vatStatusCollectedAt || new Date().toISOString() }
      : collectedData;

    // Persist to filesystem
    const sitesDir = path.join(process.cwd(), 'data', 'sites');
    fs.mkdirSync(sitesDir, { recursive: true });
    const record = {
      slug,
      collectedData: stampedData,
      copy,
      createdAt: new Date().toISOString(),
      coreThirtyNodes,
      coreThirtyCopies,
    };
    fs.writeFileSync(path.join(sitesDir, `${slug}.json`), JSON.stringify(record, null, 2));

    return NextResponse.json({ success: true, slug });
  } catch (error: any) {
    console.error('Site Bot generation error:', error);
    return NextResponse.json({ error: error.message || 'Generation failed' }, { status: 500 });
  }
}
