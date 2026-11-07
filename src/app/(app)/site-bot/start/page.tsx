import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import StartPaidFlow from './StartPaidFlow';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2 M0 dress rehearsal: the intake chat (./StartPaidFlow) renders
// ONLY when SITE_BOT_PAID_FLOW=1 on a non-production server. With the flag unset
// (prod default) this page 404s exactly as the audit-only release does, and
// next.config.ts still 307s /site-bot/start -> /site-bot before it is reached.
export default function SiteBotStartPage() {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    return <StartPaidFlow />;
  }
  notFound();
}
