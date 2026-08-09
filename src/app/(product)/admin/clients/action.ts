'use server';

import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';

const CLIENTS_DIR = path.join(process.cwd(), 'data', 'clients');

/**
 * Admin-gated "log in as this client" action. SECURITY CRITICAL:
 * verifies the caller holds a valid wao-admin session BEFORE ever
 * issuing a wao-client session token for the selected client — this
 * is the only thing standing between this route and an open backdoor
 * that hands out client sessions to anyone.
 */
export async function loginAsClientAction(formData: FormData) {
  const jar = await cookies();

  const adminToken = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  const isAdmin = await verifyAdminToken(adminToken);
  if (!isAdmin) {
    redirect('/admin/login?error=1&next=/admin/clients');
  }

  const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
  const clientFile = path.join(CLIENTS_DIR, clientId, 'client.json');

  if (!clientId || !fs.existsSync(clientFile)) {
    redirect('/admin/clients?error=unknown-client');
  }

  const token = await createSessionToken(clientId);
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60,
    path:     '/',
  });

  redirect('/client/dashboard');
}
