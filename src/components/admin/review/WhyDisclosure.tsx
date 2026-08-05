'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { renderMixed } from '@/lib/bidi';

export interface InquiryTurn {
  question: string;
  answer: string;
  askedAt: string;
}

interface Props {
  taskId: string;
  initialInquiries: InquiryTurn[];
}

/**
 * The "Why?" disclosure — structurally separate from the decision row, per
 * docs/specs/adam-recommendation-audit-interaction-model.md §2.1 and
 * docs/specs/adam-recommendation-audit-visual-design.md §3. This component never touches
 * task status or the approval log; it only talks to /api/google-ads/operator-task/inquiry,
 * a different log stream entirely.
 */
export default function WhyDisclosure({ taskId, initialInquiries }: Props) {
  const [open, setOpen] = useState(false);
  const [inquiries, setInquiries] = useState<InquiryTurn[]>(initialInquiries);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  function toggle() {
    setOpen((current) => {
      const next = !current;
      if (!next) {
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
      return next;
    });
  }

  async function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/google-ads/operator-task/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'השאלה לא נשלחה');
      setInquiries((current) => [...current, data.inquiry]);
      setQuestion('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'השאלה לא נשלחה');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls="why-thread"
        onClick={toggle}
        className="flex items-center gap-1 text-sm text-[var(--muted)] underline underline-offset-2 hover:text-[var(--text)]"
      >
        <span aria-hidden>{open ? '▾' : '▸'}</span>
        {' '}למה?
        {inquiries.length > 0 && <span className="text-xs">({inquiries.length})</span>}
      </button>

      {/* Approve/Reject in DecisionRow stay visible and enabled the whole time this is open. */}
      {open && (
        <div
          id="why-thread"
          role="region"
          aria-label="שרשור שאלות"
          className="mt-2 max-h-80 overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--elevated)] p-4"
        >
          {inquiries.length === 0 && (
            <p className="text-xs text-[var(--muted)]">אין עדיין שאלות. אפשר לשאול לפני שמחליטים.</p>
          )}

          <ul className="space-y-3">
            {inquiries.map((entry, i) => (
              <li key={`${entry.askedAt}-${i}`}>
                <p className="text-sm text-[var(--text)]">{renderMixed(entry.question)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Adam ענה: {renderMixed(entry.answer)}</p>
              </li>
            ))}
          </ul>

          <form onSubmit={submitQuestion} className="mt-3 flex flex-col gap-2">
            <label htmlFor={`why-question-${taskId}`} className="sr-only">
              שאלה
            </label>
            <textarea
              id={`why-question-${taskId}`}
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="למה זה מוצע?"
              rows={2}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={busy || !question.trim()}
                aria-disabled={busy || !question.trim()}
                className="min-h-[44px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                {busy ? 'שולח…' : 'שלח שאלה'}
              </button>
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
