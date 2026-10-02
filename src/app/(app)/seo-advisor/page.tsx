import type { Metadata } from 'next';
import Link from 'next/link';
import { PAGE_COPY } from '@/lib/seo-advisor-page-copy';
import AdvisorChat from './advisor-chat';

const CANONICAL = 'https://www.wao.co.il/seo-advisor';

export const metadata: Metadata = {
  title: PAGE_COPY['metadata.title'],
  description: PAGE_COPY['metadata.description'],
  alternates: { canonical: CANONICAL },
  robots: { index: true, follow: true },
  openGraph: {
    title: PAGE_COPY['metadata.title'],
    description: PAGE_COPY['metadata.description'],
    url: CANONICAL,
    type: 'website',
  },
};

export default function SeoAdvisorPage() {
  return (
    <section className="wao-section" style={{ paddingTop: 'clamp(110px,14vw,160px)' }}>
      <div className="wao-container" style={{ maxWidth: '860px' }}>
        <h1 style={{ fontFamily: 'var(--font-rubik), sans-serif', fontWeight: 900,
          fontSize: 'clamp(1.7rem,4vw,2.8rem)', lineHeight: 1.2, marginBottom: '20px' }}>
          {PAGE_COPY['page.h1']}
        </h1>
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body), sans-serif',
          fontSize: 'clamp(1rem,2vw,1.2rem)', lineHeight: 1.8, marginBottom: '32px' }}>
          {PAGE_COPY['page.subheadline']}
        </p>
        <AdvisorChat />
        <p style={{ color: 'var(--muted)', fontFamily: 'var(--font-body), sans-serif',
          fontSize: '0.9rem', lineHeight: 1.8, marginTop: '32px' }}>
          {PAGE_COPY['legal.disclaimer']}
        </p>
        <div style={{ marginTop: '32px', marginBottom: '32px' }}>
          <Link href="/consulting" className="btn-primary w-full sm:w-auto justify-center">
            {PAGE_COPY['cta.consultLink']}
          </Link>
          <p style={{ color: 'var(--muted)', marginTop: '12px', fontSize: '0.9rem' }}>
            {PAGE_COPY['cta.consultNote']}
          </p>
        </div>
      </div>
    </section>
  );
}
