'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAdminToken, verifyAdminCredentials, ADMIN_COOKIE_NAME } from '@/lib/admin-auth';

function safeNext(value: FormDataEntryValue | null): string {
  const fallback = '/admin/clients';
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x1f\x7f]/.test(value)) return fallback;

  // Check the path independently of query/fragment data, including nested encodings.
  let path = value.split(/[?#]/, 1)[0];
  try {
    for (let depth = 0; depth < 8; depth++) {
      if (/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(path)) return fallback;
      // The original path must be well-formed. Later passes may contain a
      // literal percent produced by %25; preserve it while inspecting escapes.
      const inspectable = depth === 0 ? path : path.replace(/%(?![0-9a-f]{2})/gi, '%25');
      const decoded = decodeURIComponent(inspectable);
      if (decoded === path) {
        const parsed = new URL(value, 'https://internal.invalid');
        return parsed.origin === 'https://internal.invalid' && !parsed.pathname.startsWith('//') ? value : fallback;
      }
      path = decoded;
    }
  } catch {
    return fallback;
  }
  return fallback;
}

export async function masterAdminLoginAction(formData: FormData) {
  const username = (formData.get('username') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const next     = safeNext(formData.get('next'));

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
