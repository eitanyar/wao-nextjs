'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminToken, verifyAdminSecret, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

export async function adminLoginAction(formData: FormData) {
  const secret = (formData.get('secret') as string | null)?.trim() ?? '';
  const next   = (formData.get('next')   as string | null) || '/geo/dashboard';

  const valid = await verifyAdminSecret(secret);

  if (!valid) {
    redirect(`/geo/login?error=1&next=${encodeURIComponent(next)}`);
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
