/**
 * Staff gate for the trainer area — reuses the SAME wao-admin cookie/token
 * as the live-readiness admin UI (src/app/(app)/admin/live-readiness). No
 * new auth mechanism per spec; this is a thin, route-handler-friendly wrapper
 * around the shared verifyAdminToken check.
 */
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

export async function isStaff(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value ?? '';
  return verifyAdminToken(token);
}
