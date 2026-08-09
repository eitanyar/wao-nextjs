import { cookies }   from 'next/headers';
import { redirect }  from 'next/navigation';
import Link          from 'next/link';
import { verifySessionToken, COOKIE_NAME } from '@/lib/client-auth';
import { loadClientGoogleAdsIndex }        from '@/lib/crm/intelligence';
import { readLeads }                       from '@/lib/crm/leadsStore';
import { leadMatchesClientIndex }          from '@/lib/crm/ownership';
import LeadsTable                          from '@/components/crm/LeadsTable';

export const metadata = { robots: { index: false }, title: 'הלידים שלי | WAO' };

/**
 * Session-gated (identical pattern to `/client/dashboard`), peer route to
 * `/client/dashboard` rather than a dashboard sub-section — so the
 * `?highlight=` deep link from the "send to client" WhatsApp message has a
 * stable URL independent of whatever else is on the dashboard that week.
 * See docs/specs/priority-3-lead-capture-reliability-and-client-feedback.md §1.3/§2.5.
 */
export default async function ClientLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const jar      = await cookies();
  const token    = jar.get(COOKIE_NAME)?.value ?? '';
  const clientId = await verifySessionToken(token);
  if (!clientId) redirect('/client/login');

  const { highlight } = await searchParams;
  const highlightId = highlight ? Number(highlight) : undefined;

  const clientIndex = loadClientGoogleAdsIndex(clientId);
  const leads = await readLeads();
  const ownLeads = leads.filter((lead) => leadMatchesClientIndex(lead, clientIndex));

  return (
    <main dir="rtl" style={{ paddingTop: '120px', paddingBottom: '64px', padding: '120px 20px 64px', maxWidth: '1200px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 900, marginBottom: '8px', color: 'var(--text)' }}>
            הלידים שלי
          </h1>
          <p style={{ color: 'var(--muted)', maxWidth: '600px', lineHeight: 1.5 }}>
            כל הפניות שנכנסו מהקמפיין שלך — כולל לחיצות על טלפון ווואטסאפ. סמן ליד איכותי, ועדכן כשסגרת עסקה.
          </p>
        </div>
        <Link href="/client/dashboard" className="btn-secondary" style={{ padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
          חזרה לדאשבורד
        </Link>
      </div>

      <LeadsTable leads={ownLeads} apiBase="/api/client/leads" highlightId={highlightId} />
    </main>
  );
}
