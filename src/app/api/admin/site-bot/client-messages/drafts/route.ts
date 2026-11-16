// Staff AI draft replies for Site-Bot client messages (src/lib/site-bot/supportDraft.ts). Admin-only.
// GET: the drafts for the queue's messages. POST { id, action: 'generate' | 'save' | 'approve', text? }: (re)generate,
// save a staff edit, or approve the final text. Nothing here ever sends an email: approval only records the text staff
// will send. Logs carry ids and codes only, never message or draft content.
import { boundedJsonObject, requireAdmin, sameOrigin } from '@/lib/site-bot/adminRequestGuards';
import { clientMessagesEnabled, getClientMessage, listClientMessages } from '@/lib/site-bot/clientMessages';
import { UUID } from '@/lib/site-bot/helpRequest';
import {
  approveSupportDraft,
  DRAFT_MAX_CHARS,
  generateSupportDraft,
  listSupportDrafts,
  saveSupportDraftEdit,
  type SupportDraftRow,
} from '@/lib/site-bot/supportDraft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = DRAFT_MAX_CHARS * 4 + 1024;
const ACTIONS = new Set(['generate', 'save', 'approve']);
const ALLOWED_KEYS = new Set(['id', 'action', 'text']);

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function project(row: SupportDraftRow) {
  return {
    messageId: row.message_id,
    status: row.status,
    draft: row.draft,
    escalate: row.escalate === 1,
    escalateReason: row.escalate_reason,
    provider: row.provider,
    errorCode: row.error_code,
    generatedAt: row.generated_at,
    editedAt: row.edited_at,
    approvedAt: row.approved_at,
  };
}

export async function GET(): Promise<Response> {
  try {
    if (!await requireAdmin()) return reply({ ok: false, error: 'unauthorized' }, 401);
    if (!clientMessagesEnabled(process.env)) return reply({ ok: false, error: 'disabled' }, 503);
    const ids = listClientMessages({ limit: 500 }).filter((row) => row.kind === 'client_message').map((row) => row.id);
    return reply({ ok: true, drafts: listSupportDrafts(ids).map(project) }, 200);
  } catch {
    return reply({ ok: false, error: 'unavailable' }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!await requireAdmin()) return reply({ ok: false, error: 'unauthorized' }, 401);
    if (!sameOrigin(request)) return reply({ ok: false, error: 'forbidden' }, 403);
    if (!clientMessagesEnabled(process.env)) return reply({ ok: false, error: 'disabled' }, 503);
    let body: Record<string, unknown>;
    try { body = await boundedJsonObject(request, MAX_BODY_BYTES); } catch { return reply({ ok: false, error: 'invalid_input' }, 400); }
    if (Object.keys(body).some((key) => !ALLOWED_KEYS.has(key)) || typeof body.id !== 'string' || !UUID.test(body.id) ||
      typeof body.action !== 'string' || !ACTIONS.has(body.action)) {
      return reply({ ok: false, error: 'invalid_input' }, 400);
    }
    const message = getClientMessage(body.id);
    if (!message || message.kind !== 'client_message') return reply({ ok: false, error: 'not_found' }, 404);
    const now = new Date();
    if (body.action === 'generate') {
      const row = await generateSupportDraft(message, { now });
      return row ? reply({ ok: true, draft: project(row) }, 200) : reply({ ok: false, error: 'not_found' }, 404);
    }
    const result = body.action === 'save' ? saveSupportDraftEdit(message.id, body.text, now) : approveSupportDraft(message.id, body.text, now);
    if (typeof result === 'string') {
      const status = result === 'not_found' ? 404 : result === 'already_approved' ? 409 : 400;
      return reply({ ok: false, error: result }, status);
    }
    return reply({ ok: true, draft: project(result) }, 200);
  } catch {
    console.error('[admin site-bot drafts] unavailable');
    return reply({ ok: false, error: 'unavailable' }, 503);
  }
}
