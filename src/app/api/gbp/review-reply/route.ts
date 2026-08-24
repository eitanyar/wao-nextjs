import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "@/lib/admin-auth";
import { loadClient } from "@/lib/shared/clients";
import {
  getReviewResponderQueue,
  updateReviewResponderQueueItem,
} from "@/lib/gbp/reviewResponderStore";
import { hasGbpCredentials, isGbpLive, getAccessToken, replyToReview } from "@/lib/gbp/client";
import { levenshtein } from "@/lib/gbp/editDistance";

/**
 * Admin-only approve/post route for the bad-review responder queue (Reputation Loop
 * back-half, stage 3 of 4). Auth mirrors `isAdminAuthorized()` in
 * src/app/api/leads/route.ts byte-for-byte. `replyToReview` is a real irreversible
 * public write — the 503 credential guard runs BEFORE any token fetch or network call.
 */
async function isAdminAuthorized(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value ?? "";
  return verifyAdminToken(token);
}

function ledgerPath(clientId: string): string {
  return path.join(process.cwd(), "data", "clients", clientId, "review-responder-log.jsonl");
}

function appendLedgerLine(clientId: string, entry: Record<string, unknown>): void {
  const fp = ledgerPath(clientId);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.appendFileSync(fp, JSON.stringify(entry) + "\n", "utf8");
}

export async function POST(req: Request) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const clientId = body?.clientId;
  const reviewId = body?.reviewId;
  const finalText = body?.finalText;

  if (!clientId || !reviewId || !finalText) {
    return NextResponse.json({ success: false, error: "Missing required field" }, { status: 400 });
  }

  const queue = getReviewResponderQueue(clientId);
  const item = queue.find((i) => i.reviewId === reviewId);
  if (!item) {
    return NextResponse.json({ success: false, error: "Queue item not found" }, { status: 404 });
  }
  if (item.status === "posted") {
    return NextResponse.json({ success: false, error: "Already posted" }, { status: 409 });
  }

  const client = loadClient(clientId);
  if (!hasGbpCredentials() || !client?.gbpAccountId || !client?.gbpLocationId) {
    return NextResponse.json({ success: false, error: "GBP not configured" }, { status: 503 });
  }
  if (!isGbpLive()) {
    return NextResponse.json(
      { success: false, error: "GBP integration not enabled (set GBP_INTEGRATION_ENABLED=true once API access is approved)" },
      { status: 503 }
    );
  }

  const token = await getAccessToken();
  const res = await replyToReview(token, client.gbpAccountId, client.gbpLocationId, reviewId, finalText);
  if (!res.ok) {
    return NextResponse.json(
      { success: false, error: `${res.status} ${await res.text()}` },
      { status: 502 }
    );
  }

  const editDistance = levenshtein(item.draftReply, finalText);
  const postedAt = new Date().toISOString();

  appendLedgerLine(clientId, {
    reviewId,
    clientId,
    draftLength: Array.from(item.draftReply).length,
    finalLength: Array.from(finalText).length,
    editDistance,
    postedAt,
  });

  updateReviewResponderQueueItem(clientId, reviewId, { status: "posted", postedAt });

  return NextResponse.json({ success: true, editDistance });
}
