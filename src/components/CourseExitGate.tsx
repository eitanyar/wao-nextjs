'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CourseExitGate() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hasBeenShown = sessionStorage.getItem('wao_course_gate_shown');
    if (hasBeenShown) return;

    const pageLoadTime = Date.now();
    const MIN_TIME_MS = 15_000;

    const isMobile =
      typeof navigator !== 'undefined' &&
      (/Mobi|Android/i.test(navigator.userAgent) || window.innerWidth < 768);

    const open = () => {
      sessionStorage.setItem('wao_course_gate_shown', 'true');
      setIsOpen(true);
      document.body.style.overflow = 'hidden';
    };

    const close = () => {
      setIsOpen(false);
      document.body.style.overflow = '';
    };

    if (!isMobile) {
      const handleMouseLeave = (e: MouseEvent) => {
        if (e.relatedTarget && (e.relatedTarget as HTMLElement).tagName === 'IFRAME') return;
        if (e.clientY > 0) return;
        if (Date.now() - pageLoadTime < MIN_TIME_MS) return;
        open();
      };
      document.addEventListener('mouseleave', handleMouseLeave);
      return () => document.removeEventListener('mouseleave', handleMouseLeave);
    } else {
      const t = setTimeout(() => {
        const depth = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
        if (depth >= 0.3) open();
      }, 60_000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); document.body.style.overflow = ''; }
    };
    document.addEventListener('keydown', handleKey);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const close = () => { setIsOpen(false); document.body.style.overflow = ''; };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-gate-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
      }}
    >
      <div
        ref={modalRef}
        dir="rtl"
        tabIndex={-1}
        style={{
          position: 'relative', width: '100%', maxWidth: '480px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '36px 32px',
          boxShadow: 'var(--shadow-card)', outline: 'none',
        }}
      >
        {/* Glow */}
        <div style={{ position: 'absolute', top: 0, right: '25%', width: '300px', height: '300px', background: 'rgba(74,227,181,0.06)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

        <button
          onClick={close}
          aria-label="סגור"
          style={{
            position: 'absolute', top: '14px', left: '14px',
            width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem',
          }}
        >
          ✕
        </button>

        <div style={{ marginBottom: '8px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>
          רגע לפני שיוצאים
        </div>
        <h2 id="course-gate-title" style={{ fontFamily: 'var(--font-rubik), sans-serif', fontWeight: 800, fontSize: '1.4rem', lineHeight: 1.2, marginBottom: '10px', color: 'var(--text)' }}>
          רגע — הקורס הזה מתאים לך עכשיו?
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.95rem', marginBottom: '28px', lineHeight: 1.6 }}>
          שאלה אחת, ואתה יודע מאיפה נכון להתחיל.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={close}
            style={{
              padding: '14px 20px', borderRadius: 'var(--radius-md)', textAlign: 'right',
              background: 'rgba(74,227,181,0.08)', border: '1px solid var(--accent-border)',
              color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              fontFamily: 'var(--font-body), sans-serif',
            }}
          >
            ✅ כן, כבר רץ אצלי קמפיין
          </button>
          <button
            onClick={() => { close(); router.push('/google-ads/onboarding'); }}
            style={{
              padding: '14px 20px', borderRadius: 'var(--radius-md)', textAlign: 'right',
              background: 'linear-gradient(135deg, rgba(74,227,181,0.15), rgba(0,195,255,0.15))',
              border: '1px solid var(--border)',
              color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              fontFamily: 'var(--font-body), sans-serif',
            }}
          >
            🚀 עדיין לא — בוא נקים קמפיין
          </button>
        </div>
      </div>
    </div>
  );
}
