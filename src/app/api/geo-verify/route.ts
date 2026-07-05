/**
 * GEO Verification Worker
 *
 * Called after a client approves an action and content is published.
 * Crawls the target URL, checks content + JSON-LD schema, writes result
 * to the immutable approval log, and returns pass/fail with evidence.
 *
 * POST /api/geo-verify
 * Body: { clientId, entryId } — verify a specific pending entry
 *       { clientId }          — verify ALL pending entries for this client
 */

import { NextResponse }    from 'next/server';
import {
  readLog,
  updateVerification,
  ApprovalEntry,
  VerificationResult,
} from '@/lib/geo/approvalLog';

interface VerifyRequest {
  clientId: string;
  entryId?: string;
}

interface VerifyOutcome {
  entryId:   string;
  targetUrl: string;
  result:    VerificationResult;
  note:      string;
}

export async function POST(req: Request) {
  try {
    const body: VerifyRequest = await req.json();
    const { clientId, entryId } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId required' }, { status: 400 });
    }

    const log = readLog(clientId);
    const targets = entryId
      ? log.filter(e => e.entryId === entryId)
      : log.filter(e => e.verificationResult === 'pending' && e.publishedAt);

    if (targets.length === 0) {
      return NextResponse.json({ message: 'No pending verifications found', outcomes: [] });
    }

    const outcomes: VerifyOutcome[] = await Promise.all(
      targets.map(entry => verifyEntry(entry))
    );

    // Persist results
    const now = new Date().toISOString();
    for (const outcome of outcomes) {
      updateVerification(clientId, outcome.entryId, {
        verifiedAt:         now,
        verificationResult: outcome.result,
        verificationNote:   outcome.note,
      });
    }

    return NextResponse.json({ outcomes });

  } catch (err: unknown) {
    console.error('[geo-verify] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function verifyEntry(entry: ApprovalEntry): Promise<VerifyOutcome> {
  const { entryId, targetUrl, contentSnippet, schemaType, fixAttempts } = entry;

  try {
    const res = await fetch(targetUrl, {
      headers: { 'User-Agent': 'WAO-GEO-Verifier/1.0' },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return outcome(entryId, targetUrl, 'fail', `HTTP ${res.status}`);
    }

    const html = await res.text();

    // 1. Content fingerprint check — look for the first ~80 chars of expected text
    const fingerprint = contentSnippet.slice(0, 80).trim();
    const contentFound = html.includes(fingerprint);

    if (!contentFound) {
      const note = `Content not found (looked for: "${fingerprint.slice(0, 40)}…"), fix attempts: ${fixAttempts}`;
      return outcome(entryId, targetUrl, 'fail', note);
    }

    // 2. JSON-LD schema check (optional — only if schemaType specified)
    if (schemaType) {
      const schemaFound = checkJsonLd(html, schemaType);
      if (!schemaFound) {
        return outcome(entryId, targetUrl, 'fail',
          `Content found but JSON-LD schema @type="${schemaType}" missing`);
      }
    }

    const charPos = html.indexOf(fingerprint);
    return outcome(entryId, targetUrl, 'pass',
      `HTTP 200 ✓ · Content found at char ${charPos}${schemaType ? ` · JSON-LD ${schemaType} ✓` : ''}`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return outcome(entryId, targetUrl, 'fail', `Fetch error: ${msg}`);
  }
}

function checkJsonLd(html: string, expectedType: string): boolean {
  const scriptPattern = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = scriptPattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const schemas = Array.isArray(data) ? data : [data];
      if (schemas.some(s => s['@type'] === expectedType)) return true;
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return false;
}

function outcome(
  entryId: string,
  targetUrl: string,
  result: VerificationResult,
  note: string
): VerifyOutcome {
  return { entryId, targetUrl, result, note };
}
