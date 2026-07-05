'use client';

import CopyButton from './CopyButton';

interface Props {
  json:      string;
  platform?: string | null;
}

/** Step 3 — JSON-LD schema, collapsed by default (expanded for Next.js clients who read code). */
export default function CodeBlock({ json, platform }: Props) {
  const defaultOpen = platform === 'nextjs';

  return (
    <li className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <details open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center justify-between border-b border-[var(--border)] px-4 py-3 select-none">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--bg)]">
              ③
            </span>
            <span className="text-sm font-medium">
              קוד <bdi dir="ltr">Schema</bdi> (לצוות הטכני)
            </span>
          </div>
          <span className="text-xs text-[var(--muted)]">הצג קוד מפתח</span>
        </summary>
        <div className="p-4">
          <div dir="ltr" lang="en" className="relative overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg)]">
            <div dir="rtl" className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <bdi dir="ltr" className="text-xs text-[var(--muted)]">JSON-LD</bdi>
              <CopyButton payload={json} label="העתק" ariaLabel="העתקת קוד ה-JSON-LD ללוח" />
            </div>
            <pre
              className="overflow-x-auto p-4 text-xs leading-relaxed font-mono text-[var(--text)]"
              tabIndex={0}
              role="region"
              aria-label="קוד JSON-LD"
            >
              <code>{json}</code>
            </pre>
          </div>
        </div>
      </details>
    </li>
  );
}
