import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  robots: { index: false },
};

// Paid-journey v2 M0.5 (B16): the mock checkout page under /site-bot/pay renders
// ONLY when SITE_BOT_PAID_FLOW=1 on a non-production server. next.config.ts 307s
// /site-bot/pay/:path* -> /site-bot first; this layout is the second lock, so the
// pre-filled mock card form 404s even if that redirect is ever bypassed.
export default function SiteBotPayLayout({ children }: { children: ReactNode }) {
  if (process.env.SITE_BOT_PAID_FLOW === '1' && process.env.NODE_ENV !== 'production') {
    return children;
  }
  notFound();
}
