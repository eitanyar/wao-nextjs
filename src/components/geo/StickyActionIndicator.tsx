'use client';

import { useEffect, useState } from 'react';
import { renderMixed } from '@/lib/bidi';

interface Props {
  title:   string;
  current: number;
  total:   number;
  done:    boolean;
}

/**
 * Compact sticky bar for /geo/action/[actionId] — keeps "what step am I on"
 * and "what do I need to do" visible on mobile while scrolling through the
 * instructions, without the client having to scroll back up to StatusBar or
 * down to MarkDoneBar/AutoPathPanel to re-orient. Jumps to #action-cta
 * (the real CTA — MarkDoneBar's confirm button or the auto-publish note)
 * rather than duplicating its state/logic.
 *
 * Appears once the page's own header (StatusBar + ActionHeader) has scrolled
 * out of view, so it doesn't double up at the top of the page.
 */
export default function StickyActionIndicator({ title, current, total, done }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 180);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function jumpToCta() {
    document.getElementById('action-cta')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return (
    <div
      className="md:hidden"
      style={{
        position: 'fixed',
        top: 0,
        insetInline: 0,
        zIndex: 180,
        background: 'var(--bg)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        transform: visible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.25s ease',
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          {total > 0 && (
            <div className="text-[0.7rem] font-medium text-[var(--muted)]">
              פעולה {current} מתוך {total}
            </div>
          )}
          <div className="truncate text-sm font-semibold text-[var(--text)]">{renderMixed(title)}</div>
        </div>
        <button
          onClick={jumpToCta}
          className="shrink-0 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--bg)]"
        >
          {done ? '✓ הושלם' : 'לפעולה ↓'}
        </button>
      </div>
    </div>
  );
}
