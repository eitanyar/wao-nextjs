import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { HelpInbox } from '@/components/admin/site-bot-help/HelpInbox';
import { ClientMessagesInbox } from '@/components/admin/site-bot-help/ClientMessagesInbox';

export const metadata: Metadata = { title: 'Site-Bot help requests | WAO', robots: { index: false, follow: false, nocache: true } };
export const dynamic = 'force-dynamic';
export default async function SiteBotHelpPage() {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) redirect('/admin/login?next=%2Fadmin%2Fsite-bot-help');
  return <main dir="ltr" lang="en" className="mx-auto w-full max-w-5xl min-w-0 px-4 py-8 sm:px-8"><h1>Site-Bot help requests</h1>
    <section aria-labelledby="client-messages-h"><h2 id="client-messages-h">Client messages</h2><ClientMessagesInbox /></section>
    <section aria-labelledby="presale-help-h"><h2 id="presale-help-h">Pre-sale help requests</h2><HelpInbox /></section></main>;
}
