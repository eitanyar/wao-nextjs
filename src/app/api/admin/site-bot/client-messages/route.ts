// Staff queue read for Site-Bot client messages. Admin-only. Returns every column except triage_json.
import { requireAdmin } from '@/lib/site-bot/adminRequestGuards';
import { clientMessagesEnabled, listClientMessages, type ClientMessageRow } from '@/lib/site-bot/clientMessages';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function reply(body: object, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });
}

function projectForStaff(row: ClientMessageRow): Omit<ClientMessageRow, 'triage_json'> {
  const { triage_json: _omitted, ...rest } = row;
  void _omitted;
  return rest;
}

export async function GET(): Promise<Response> {
  try {
    if (!await requireAdmin()) return reply({ ok: false, error: 'unauthorized' }, 401);
    if (!clientMessagesEnabled(process.env)) return reply({ ok: false, error: 'disabled' }, 503);
    return reply({ ok: true, messages: listClientMessages({ limit: 500 }).map(projectForStaff) }, 200);
  } catch {
    return reply({ ok: false, error: 'unavailable' }, 503);
  }
}
