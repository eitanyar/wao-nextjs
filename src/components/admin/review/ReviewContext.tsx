import { renderMixed } from '@/lib/bidi';

interface Props {
  clientName: string;
  stageGateLabel: string;
  weeksClean: number;
  targetWeeks: number;
}

/**
 * Condensed trust-clock line shown above the card — orientation only, no reset trace, no
 * paused-weeks line (those live in the full TrustClockLine on the client dashboard).
 * Per docs/specs/adam-recommendation-audit-visual-design.md §1.1.
 */
export default function ReviewContext({ clientName, stageGateLabel, weeksClean, targetWeeks }: Props) {
  return (
    <p className="mb-4 text-sm text-[var(--muted)]">
      {renderMixed(clientName)} — {stageGateLabel}: {weeksClean} מתוך {targetWeeks} שבועות תקינים ברצף
    </p>
  );
}
