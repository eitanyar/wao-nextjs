import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { renderStaticHtml } from '@/lib/lp/renderStaticHtml';
import { buildPrivacyHtml, buildAccessibilityHtml, isAccessibilityExempt } from '@/lib/lp/legalPages';
import { detectVertical } from '@/lib/lp/verticalDetect';
import { VERTICAL_THEMES } from '@/lib/lp/verticalThemes';
import { VERTICAL_ASSETS } from '@/lib/lp/verticalAssets';
import type { CollectedData } from '@/lib/bot/prompts';
import type { LPCopy } from '@/lib/lp/lpCopyPrompt';
import { createFraudBlockerClient } from '@/lib/fraud-blocker/client';
import { fraudBlockerFailureState, provisionFraudBlockerDomain, recordFraudBlockerTrackerInstallation } from '@/lib/fraud-blocker/deployment';
import { readFraudBlockerState, writeFraudBlockerState } from '@/lib/fraud-blocker/store';

interface DeployRequest {
  slug: string;
  googleAdsCustomerId?: string;
  gtagSnippet?: string;
  formConversionLabel?: string;
  phoneConversionLabel?: string;
  whatsappConversionLabel?: string;
}

interface LPRecord {
  collectedData: CollectedData;
  copy: LPCopy;
  slug: string;
}

const CF_BASE = 'https://api.cloudflare.com/client/v4';

function cfHeaders() {
  return {
    'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function cfPost(path: string, body: unknown) {
  const res = await fetch(`${CF_BASE}${path}`, {
    method: 'POST',
    headers: cfHeaders(),
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, data: await res.json() };
}

export async function POST(req: Request) {
  try {
    const body: DeployRequest = await req.json();
    const { slug, googleAdsCustomerId, gtagSnippet, formConversionLabel, phoneConversionLabel, whatsappConversionLabel } = body;

    if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 });

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!;

    // ── Step 1: Load LP data from filesystem ─────────────────────────────────
    const lpPath = path.join(process.cwd(), 'data', 'lps', `${slug}.json`);
    let record: LPRecord;
    try {
      record = JSON.parse(readFileSync(lpPath, 'utf-8'));
    } catch {
      return NextResponse.json({ error: `LP data not found for slug: ${slug}` }, { status: 404 });
    }

    const { collectedData, copy } = record;
    const verticalKey = detectVertical(collectedData.businessNiche || '');
    const theme = VERTICAL_THEMES[verticalKey];
    const assets = VERTICAL_ASSETS[verticalKey];
    // Prefer the client's own photo over generic vertical stock — see the
    // identical fix in app/(standalone)/lp/[slug]/page.tsx (internal preview).
    // Stock stays the non-blocking fallback when no upload exists.
    const heroImageUrl = collectedData.trustAssetUrls?.[0] || collectedData.profilePhotoUrl || assets.heroImages[0].url;
    const fraudDomain = `${slug}.wao.co.il`;
    let fraudBlockerSid: string | undefined;
    if (googleAdsCustomerId) {
      try {
        fraudBlockerSid = await provisionFraudBlockerDomain({ clientId: slug, domain: fraudDomain, client: createFraudBlockerClient() });
      } catch (error) {
        writeFraudBlockerState(fraudBlockerFailureState(slug, fraudDomain, error));
        return NextResponse.json({ error: 'fraud_blocker_provisioning_required' }, { status: 424 });
      }
    }

    // ── Step 2: Render static HTML ────────────────────────────────────────────
    const htmlContent = renderStaticHtml({
      theme,
      assets,
      copy,
      data: collectedData,
      heroImageUrl,
      slug,
      googleAdsCustomerId,
      gtagSnippet,
      formConversionLabel,
      phoneConversionLabel,
      whatsappConversionLabel,
      fraudBlockerSid,
    });

    // ── Step 3: Ensure CF Pages project exists, then deploy ──────────────────
    const tmpDir = path.join(tmpdir(), `wao-lp-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(path.join(tmpDir, 'index.html'), htmlContent, 'utf-8');

    // Legal disclosure pages — same requirement as Site Bot's 5-page output.
    // Privacy has no exemption; accessibility is gated on vatStatus.
    const legalOpts = { theme, data: collectedData, canonicalUrl: '', homeHref: '/', fraudBlockerSid };
    const legalPages: Record<string, string> = {
      'privacy.html': buildPrivacyHtml({ ...legalOpts, canonicalUrl: `https://${slug}.wao.co.il/privacy.html` }),
    };
    writeFileSync(path.join(tmpDir, 'privacy.html'), legalPages['privacy.html'], 'utf-8');
    if (!isAccessibilityExempt(collectedData.vatStatus)) {
      legalPages['accessibility.html'] = buildAccessibilityHtml({ ...legalOpts, canonicalUrl: `https://${slug}.wao.co.il/accessibility.html` });
      writeFileSync(path.join(tmpDir, 'accessibility.html'), legalPages['accessibility.html'], 'utf-8');
    }
    if (fraudBlockerSid && !recordFraudBlockerTrackerInstallation({
      state: readFraudBlockerState(slug) ?? fraudBlockerFailureState(slug, fraudDomain, new Error('Fraud Blocker state was not persisted.')),
      pages: { 'index.html': htmlContent, ...legalPages },
    })) {
      rmSync(tmpDir, { recursive: true, force: true });
      return NextResponse.json({ error: 'fraud_blocker_tracker_verification_failed' }, { status: 424 });
    }

    const env = {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN!,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    };

    // Create project first (idempotent — errors on duplicate are ignored)
    try {
      execSync(
        `./node_modules/.bin/wrangler pages project create "${slug}" --production-branch main`,
        { env, stdio: 'pipe', timeout: 30_000 }
      );
    } catch {
      // project already exists — fine
    }

    try {
      execSync(
        `./node_modules/.bin/wrangler pages deploy "${tmpDir}" --project-name "${slug}" --branch main --commit-dirty=true`,
        { env, stdio: 'pipe', timeout: 60_000 }
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    // ── Step 5: Add custom domain + DNS record ────────────────────────────────
    const subdomain = `${slug}.wao.co.il`;
    const zoneId = process.env.CLOUDFLARE_ZONE_ID!;

    // Register domain on the Pages project
    const domainRes = await cfPost(
      `/accounts/${accountId}/pages/projects/${slug}/domains`,
      { name: subdomain }
    );
    if (!domainRes.ok) {
      console.warn('Custom domain registration (non-fatal):', domainRes.data);
    }

    // Create DNS CNAME record in the wao.co.il zone
    const dnsRes = await fetch(`${CF_BASE}/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: cfHeaders(),
      body: JSON.stringify({
        type: 'CNAME',
        name: slug,
        content: `${slug}.pages.dev`,
        proxied: true,
        ttl: 1,
      }),
    });
    const dnsData = await dnsRes.json();
    if (!dnsRes.ok && !dnsData?.errors?.some((e: any) => e.code === 81053)) {
      // 81053 = record already exists — safe to ignore
      console.warn('DNS record creation (non-fatal):', dnsData);
    }

    const url = `https://${subdomain}`;
    return NextResponse.json({ success: true, url, projectName: slug });

  } catch (error: any) {
    console.error('Cloudflare Pages deploy error:', error);
    return NextResponse.json(
      { error: error.message || 'Deploy failed' },
      { status: 500 }
    );
  }
}
