import { renderMixed } from '@/lib/bidi';

interface Props {
  clientName: string;
  stageGateLabel: string;
  weeksClean: number;
  targetWeeks: number;
  pausedWeeks: number;
  lastReset: { taskId: string; at: string } | null;
  /** Set when this stage-gate is a completed/archived one, not the active clock. */
  archived?: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL');
}

/**
 * Full trust-clock display, per docs/specs/adam-recommendation-audit-interaction-model.md
 * §3.3 and docs/specs/adam-recommendation-audit-visual-design.md §5. Deliberately
 * non-gamified: no progress bar fill, no color-coded "on track" language, no badges — the
 * only glance-aid is the plain 8-tick row, which is aria-hidden because the sentence above
 * it already states the count in words.
 */
export default function TrustClockLine({
  clientName,
  stageGateLabel,
  weeksClean,
  targetWeeks,
  pausedWeeks,
  lastReset,
  archived,
}: Props) {
  if (archived) {
    return (
      <p className="text-xs text-[var(--muted)]">
        שלב {stageGateLabel}: {weeksClean} מתוך {targetWeeks}, הושלם
        {lastReset ? ` (עודכן לאחרונה ${formatDate(lastReset.at)})` : ''}
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm text-[var(--text)]">
        {renderMixed(clientName)} — {stageGateLabel}:{' '}
        <span className="font-semibold">
          {weeksClean} מתוך {targetWeeks}
        </span>{' '}
        שבועות תקינים מאז התיקון האחרון
      </p>

      {pausedWeeks > 0 && (
        <p className="text-xs text-[var(--muted)]">({pausedWeeks} שבועות בהשהיה — לא עברו סף המלצה)</p>
      )}

      {lastReset && weeksClean === 0 && (
        <p className="text-xs text-[var(--muted)]">
          האיפוס נובע מהחלטה ב־{formatDate(lastReset.at)} —{' '}
          <a
            href={`/admin/review/audit/${encodeURIComponent(lastReset.taskId)}`}
            className="text-[var(--accent)] underline underline-offset-2"
          >
            צפה בכרטיס
          </a>
        </p>
      )}

      <div className="mt-1 flex gap-1" aria-hidden="true">
        {Array.from({ length: targetWeeks }).map((_, i) => (
          <span
            key={i}
            className={`h-1 w-4 rounded-full ${i < weeksClean ? 'bg-[var(--text)]' : 'bg-[var(--border)]'}`}
          />
        ))}
      </div>
    </div>
  );
}
