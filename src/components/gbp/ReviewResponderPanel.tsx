'use client';

import { useState } from 'react';
import type { ReviewResponderQueueItem } from '@/lib/gbp/reviewResponderStore';
import SendButton from '@/components/geo/SendButton';

interface Props {
  item: ReviewResponderQueueItem;
}

export default function ReviewResponderPanel({ item }: Props) {
  const [text, setText] = useState(item.draftReply);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ success: true; editDistance: number } | { success: false; error: string } | null>(null);

  const posted = item.status === 'posted' || (result && result.success);

  async function submit() {
    setPending(true);
    setResult(null);
    try {
      const res = await fetch('/api/gbp/review-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: item.clientId, reviewId: item.reviewId, finalText: text }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult({ success: true, editDistance: data.editDistance });
      } else {
        setResult({ success: false, error: data.error || `HTTP ${res.status}` });
      }
    } catch (err) {
      setResult({ success: false, error: err instanceof Error ? err.message : String(err) });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-sm font-medium">
            {'★'.repeat(item.starRating)}{'☆'.repeat(5 - item.starRating)} — {item.reviewerName}
          </div>
          <p className="text-sm text-[var(--muted)] mt-1">{item.reviewComment}</p>
        </div>
        {posted && (
          <span className="text-xs font-medium rounded px-2 py-1 bg-[var(--muted)] text-[var(--bg)]">
            פורסם
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs text-[var(--muted)] mb-1">
          טיוטת תגובה (אפשר לערוך לפני פרסום)
        </label>
        <textarea
          dir="rtl"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!posted}
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] p-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={pending || !!posted}
            className="rounded-lg px-4 py-2 text-sm font-medium bg-[var(--fg)] text-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            אשר ופרסם תגובה בגוגל
          </button>
          {item.ownerNotifyWaLink && (
            <SendButton waLink={item.ownerNotifyWaLink} label="שלח לבעל העסק לאישור" />
          )}
        </div>

        {result && (
          <p className={`text-xs ${result.success ? 'text-green-600' : 'text-red-600'}`}>
            {result.success ? `Posted — editDistance: ${result.editDistance}` : result.error}
          </p>
        )}
      </div>
    </div>
  );
}
