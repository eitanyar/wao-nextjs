import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SeoAdvisorWorkspace } from '@/components/admin/SeoAdvisorWorkspace';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { ADVISOR_MARKETS } from '@/lib/seo-advisor-panel';

export const metadata: Metadata = { title: 'SEO Advisor | WAO', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function SeoAdvisorPage() {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) {
    redirect('/admin/login?next=%2Fadmin%2Fseo-advisor');
  }
  return <SeoAdvisorWorkspace markets={ADVISOR_MARKETS} />;
}
