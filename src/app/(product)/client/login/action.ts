'use server';

import fs   from 'fs';
import path from 'path';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSessionToken, COOKIE_NAME } from '@/lib/client-auth';

const LOGS_DIR = path.join(process.cwd(), 'data', 'clients');

export async function loginAction(formData: FormData) {
  const clientId = (formData.get('clientId') as string | null)?.trim() ?? '';
  const pin      = (formData.get('pin')      as string | null)?.trim() ?? '';
  const next     = (formData.get('next')     as string | null) || '/client/dashboard';

  const clientFile = path.join(LOGS_DIR, clientId, 'client.json');
  let valid = false;

  if (clientId && pin && fs.existsSync(clientFile)) {
    const client = JSON.parse(fs.readFileSync(clientFile, 'utf8'));
    valid = client.pin === pin;
  }

  if (!valid) {
    redirect(`/client/login?error=1&next=${encodeURIComponent(next)}${clientId ? `&c=${clientId}` : ''}`);
  }

  const token = await createSessionToken(clientId);
  const jar   = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60,
    path:     '/',
  });

  redirect(next);
}
