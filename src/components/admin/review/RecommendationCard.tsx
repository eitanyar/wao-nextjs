'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { renderMixed } from '@/lib/bidi';
import { STATUS_CONFIG } from '@/components/geo/StatusBar';
import QueueDepthNote from './QueueDepthNote';
import WhyDisclosure, { type InquiryTurn } from './WhyDisclosure';
import DecisionRow, { type DecisionResult } from './DecisionRow';

const RISK_LABEL: Record<'low' | 'medium' | 'high', string> = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
};

export interface ReviewTask {
  taskId: string;
  title: string;
  whyNeeded: string;
  recommendedAction: string;
  risk: 'low' | 'medium' | 'high';
}

interface Props {
  task: ReviewTask;
  queueDepth: number;
  initialInquiries: InquiryTurn[];
}

/**
 * The one-card review surface (docs/specs/adam-recommendation-audit-visual-design.md §2).
 * Structural zones, top to bottom: status pill + queue-depth note (inert) → title/risk →
 * evidence (whyNeeded + Why? disclosure) → divider → decision row (Approve / Reject).
 */
export default function RecommendationCard({ task, queueDepth, initialInquiries }: Props) {
  const router = useRouter();
  const [resolved, setResolved] = useState<DecisionResult | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [task.taskId]);

  const pill = STATUS_CONFIG['pending-review'];

  if (resolved) {
    return (
      <div
        role="status"
        tabIndex={-1}
        className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center outline-none"
      >
        <p className="mb-1 font-semibold text-[var(--text)]">
          {resolved.status === 'rejected' ? 'הדחייה נקלטה.' : 'ההחלטה נקלטה.'}
        </p>
        {resolved.message && <p className="mb-4 text-sm text-[var(--muted)]">{resolved.message}</p>}
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-lg bg-[var(--accent)] px-5 py-2 text-sm font-medium text-[var(--bg)] hover:opacity-90"
        >
          המשך לכרטיס הבא
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-medium ${pill.color}`}>{pill.label}</span>
        <QueueDepthNote count={queueDepth} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 ref={headingRef} tabIndex={-1} className="text-xl font-bold outline-none">
          {renderMixed(task.recommendedAction)}
        </h1>
        <span className="rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--muted)]">
          סיכון: {RISK_LABEL[task.risk]}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-[var(--text)]">{renderMixed(task.whyNeeded)}</p>

      <WhyDisclosure taskId={task.taskId} initialInquiries={initialInquiries} />

      <p className="mt-4 rounded-lg bg-[var(--bg)] p-3 text-xs leading-relaxed text-[var(--muted)]">
        באישור: השינוי יבוצע מיד בחשבון Google Ads החי שלך — זו לא סימולציה.
        {task.risk === 'low' && ' אם לא תגיב תוך 72 שעות, ההמלצה הזו תאושר ותבוצע אוטומטית.'}
      </p>

      <DecisionRow taskId={task.taskId} onResolved={setResolved} />
    </div>
  );
}
