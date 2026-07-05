import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { renderSitePages } from '@/lib/lp/renderSitePages';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import type { CollectedData } from '@/lib/bot/prompts';
import type { SiteCopy } from '@/lib/lp/lpCopyPrompt';

interface EditRequest {
  slug: string;
  instruction: string;
}

interface SiteRecord {
  slug: string;
  collectedData: CollectedData;
  copy: SiteCopy;
  createdAt: string;
}

const SITE_EDIT_PARSER_PROMPT = `You are a site-edit parser. Given a SiteCopy JSON and an edit instruction in Hebrew or English, return ONLY a JSON object: { "fieldPath": "copy.heroHeadline", "newValue": "..." }. Use dot notation for fieldPath. For array edits, return the full new array value. Never return prose.`;

async function callAzureFast(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = process.env.AZURE_OPENAI_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!apiKey || !endpoint) throw new Error('Azure OpenAI not configured');

  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_FAST || 'gpt-4o-mini';
  const url = `${endpoint}/chat/completions?api-version=2024-05-01-preview`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
    body: JSON.stringify({
      model: deployment,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 1500,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Azure OpenAI (${deployment}): ${data.error.message ?? data.error.code ?? JSON.stringify(data.error)}`);
  return data.choices[0].message.content;
}

// Simple dot-notation setter — e.g. "copy.heroHeadline" or "heroHeadline" both
// resolve against the `copy` object (the LLM sometimes includes/omits the
// leading "copy." segment since the prompt shows it in the example).
function applyFieldPath(copy: SiteCopy, fieldPath: string, newValue: unknown): string {
  const segments = fieldPath.replace(/^copy\./, '').split('.').filter(Boolean);
  if (segments.length === 0) throw new Error(`Invalid fieldPath: ${fieldPath}`);

  let target: any = copy;
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i];
    if (target[key] === undefined || target[key] === null) target[key] = {};
    target = target[key];
  }
  target[segments[segments.length - 1]] = newValue;
  return segments.join('.');
}

export async function POST(req: Request) {
  try {
    const body: EditRequest = await req.json();
    const { slug, instruction } = body;

    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });
    if (!instruction) return NextResponse.json({ error: 'instruction is required' }, { status: 400 });

    // ── Step 1: Load site data ────────────────────────────────────────────
    const sitePath = path.join(process.cwd(), 'data', 'sites', `${slug}.json`);
    let record: SiteRecord;
    try {
      record = JSON.parse(readFileSync(sitePath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: `Site data not found for slug: ${slug}` }, { status: 404 });
    }

    // ── Step 2: Parse the edit instruction via Azure (fast/haiku) ───────────
    const userMessage = `Current copy: ${JSON.stringify(record.copy)}\n\nEdit instruction: ${instruction}`;
    let fieldPath: string;
    let newValue: unknown;

    const apiKey = process.env.AZURE_OPENAI_KEY;
    if (apiKey) {
      const raw = await callAzureFast(SITE_EDIT_PARSER_PROMPT, userMessage);
      const parsed = JSON.parse(raw) as { fieldPath: string; newValue: unknown };
      fieldPath = parsed.fieldPath;
      newValue = parsed.newValue;
    } else {
      return NextResponse.json({ error: 'Azure OpenAI not configured — edit requires the LLM parser' }, { status: 500 });
    }

    if (!fieldPath) {
      return NextResponse.json({ error: 'Parser returned no fieldPath' }, { status: 500 });
    }

    // ── Step 3: Apply the update ─────────────────────────────────────────────
    const updatedField = applyFieldPath(record.copy, fieldPath, newValue);

    // ── Step 4: Save updated record ──────────────────────────────────────────
    writeFileSync(sitePath, JSON.stringify(record, null, 2));

    // ── Step 5: Re-render the 5 pages ────────────────────────────────────────
    const { collectedData, copy } = record;
    const verticalKey = detectVertical(collectedData.businessNiche || '');
    const theme = VERTICAL_THEMES[verticalKey];
    const assets = VERTICAL_ASSETS[verticalKey];
    const heroImageUrl = assets.heroImages[0].url;
    const siteUrl = `https://${slug}.wao.co.il`;

    const pages = renderSitePages({
      theme,
      assets,
      copy,
      data: collectedData,
      heroImageUrl,
      slug,
      siteUrl,
    });

    // ── Step 6: Re-deploy via wrangler (same as deploy route) ────────────────
    const tmpDir = path.join(tmpdir(), `wao-site-edit-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    for (const [filename, content] of Object.entries(pages)) {
      writeFileSync(path.join(tmpDir, filename), content, 'utf-8');
    }

    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN!,
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID!,
    };

    try {
      execSync(
        `./node_modules/.bin/wrangler pages deploy "${tmpDir}" --project-name "${slug}" --branch main --commit-dirty=true`,
        { env, stdio: 'pipe', timeout: 60_000 }
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true, url: siteUrl, updatedField });

  } catch (error: any) {
    console.error('Site Bot edit error:', error);
    return NextResponse.json(
      { error: error.message || 'Edit failed' },
      { status: 500 }
    );
  }
}
