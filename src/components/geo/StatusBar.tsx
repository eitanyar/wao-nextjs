export type ActionPageStatus = 'pending' | 'done' | 'error' | 'pending-review';

interface Props {
  status:  ActionPageStatus;
  current: number;
  total:   number;
}

/**
 * Exported so other one-decision-per-page surfaces (e.g. RecommendationCard, per
 * docs/specs/adam-recommendation-audit-visual-design.md §2.2) can reuse the same pill
 * label/color without duplicating the map — "same component, same file, no new visual
 * language" per that spec.
 */
export const STATUS_CONFIG: Record<ActionPageStatus, { label: string; color: string }> = {
  pending:         { label: 'ממתין',        color: 'bg-yellow-500/15 text-yellow-400' },
  done:            { label: 'הושלם',        color: 'bg-[var(--accent)]/15 text-[var(--accent)]' },
  error:           { label: 'שגיאה',        color: 'bg-red-500/15 text-red-400' },
  'pending-review': { label: 'ממתין להחלטה', color: 'bg-yellow-500/15 text-yellow-400' },
};

/** Pill badge + progress bar. Fill anchors to inset-inline-start so it's correct in RTL. */
export default function StatusBar({ status, current, total }: Props) {
  const cfg = STATUS_CONFIG[status];
  const progress = total > 0 ? Math.round(((current - 1) / total) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className={`rounded-full px-3 py-1 font-medium ${cfg.color}`}>{cfg.label}</span>
        {total > 0 && (
          <span className="text-[var(--muted)]">
            פעולה {current} מתוך {total}
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]"
      >
        <div
          className="absolute top-0 bottom-0 h-full rounded-full bg-[var(--accent)] transition-all"
          style={{ insetInlineStart: 0, width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
