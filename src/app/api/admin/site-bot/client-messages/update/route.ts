// Staff update for one Site-Bot client message: status, category and/or internal note. Admin + same-origin JSON only.
import { boundedJsonObject, requireAdmin, sameOrigin } from '@/lib/site-bot/adminRequestGuards';
import { ClientMessageError, clientMessagesEnabled, updateClientMessage } from '@/lib/site-bot/clientMessages';
import { UUID } from '@/lib/site-bot/helpRequest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 4096;
const ALLOWED_KEYS = new Set(['id', 'status', 'staffCategory', 'staffNote']);

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!await requireAdmin()) return reply({ ok: false, error: 'unauthorized' }, 401);
    if (!sameOrigin(request)) return reply({ ok: false, error: 'forbidden' }, 403);
    if (!clientMessagesEnabled(process.env)) return reply({ ok: false, error: 'disabled' }, 503);
    let body: Record<string, unknown>;
    try { body = await boundedJsonObject(request, MAX_BODY_BYTES); } catch { return reply({ ok: false, error: 'invalid_input' }, 400); }
    const keys = Object.keys(body);
    if (keys.some((key) => !ALLOWED_KEYS.has(key)) || keys.length < 2 || typeof body.id !== 'string' || !UUID.test(body.id)) {
      return reply({ ok: false, error: 'invalid_input' }, 400);
    }
    let saved;
    try {
      saved = updateClientMessage(body.id, { status: body.status, staffCategory: body.staffCategory, staffNote: body.staffNote }, new Date());
    } catch (error) {
      if (error instanceof ClientMessageError) return reply({ ok: false, error: 'invalid_input' }, 400);
      throw error;
    }
    if (!saved) return reply({ ok: false, error: 'not_found' }, 404);
    return reply({ ok: true, id: saved.id, status: saved.status, staffCategory: saved.staff_category, staffNote: saved.staff_note, updatedAt: saved.updated_at }, 200);
  } catch {
    return reply({ ok: false, error: 'unavailable' }, 503);
  }
}
