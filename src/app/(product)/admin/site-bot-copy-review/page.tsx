import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CopyReviewViewer } from '@/components/admin/site-bot-copy-review/CopyReviewViewer';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';

export const metadata: Metadata = {
  title: 'Site-Bot copy review | WAO',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

export default async function SiteBotCopyReviewPage() {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) {
    redirect('/admin/login?next=%2Fadmin%2Fsite-bot-copy-review');
  }

  return (
    <main className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-8">
      <CopyReviewViewer />
    </main>
  );
}
