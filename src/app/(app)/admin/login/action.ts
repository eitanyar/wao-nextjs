'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminToken, verifyAdminCredentials, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function masterAdminLoginAction(formData: FormData) {
  const username = (formData.get('username') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const next     = (formData.get('next')     as string | null) || '/admin/clients';

  const valid = await verifyAdminCredentials(username, password);

  if (!valid) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const token = await createAdminToken();
  const jar   = await cookies();
  jar.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   30 * 24 * 60 * 60,
    path:     '/',
  });

  redirect(next);
}
