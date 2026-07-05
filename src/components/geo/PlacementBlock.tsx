import { renderMixed } from '@/lib/bidi';

interface Props {
  instruction: string;
  url:         string;
}

/** Step 2 — exact placement instruction + the target URL, isolated LTR. */
export default function PlacementBlock({ instruction, url }: Props) {
  return (
    <li className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--bg)]">
          ②
        </span>
        <span className="text-sm font-medium">איפה בדיוק להוסיף</span>
      </div>
      <p className="mb-2 text-sm text-[var(--text)]">{renderMixed(instruction)}</p>
      <p className="text-xs text-[var(--muted)]">
        עמוד: <bdi dir="ltr" className="font-mono">{url}</bdi>
      </p>
    </li>
  );
}
