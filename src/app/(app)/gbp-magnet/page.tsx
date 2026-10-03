import type { Metadata } from 'next';
import { PAGE_COPY } from '@/lib/gbp-magnet-page-copy';
import MagnetFlow from './magnet-flow';

const CANONICAL = 'https://www.wao.co.il/gbp-magnet';

export const metadata: Metadata = {
  title: PAGE_COPY['page.headline'],
  description: PAGE_COPY['page.formIntro'],
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: PAGE_COPY['page.headline'],
    description: PAGE_COPY['page.formIntro'],
    url: CANONICAL,
    type: 'website',
  },
};

export default function GbpMagnetPage() {
  return (
    <section data-gbp-magnet-page className="wao-section" style={{ paddingTop: 'clamp(110px,14vw,160px)' }}>
      <div className="wao-container" style={{ maxWidth: '860px' }}>
        <h1 style={{ fontFamily: 'var(--font-rubik), sans-serif', fontWeight: 900,
          fontSize: 'clamp(1.7rem,4vw,2.8rem)', lineHeight: 1.2, marginBottom: '20px' }}>
          {PAGE_COPY['page.headline']}
        </h1>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body), sans-serif',
          fontSize: 'clamp(1rem,2vw,1.2rem)', lineHeight: 1.8, marginBottom: '32px' }}>
          {PAGE_COPY['page.formIntro']}
        </p>
        <MagnetFlow />
      </div>
    </section>
  );
}
