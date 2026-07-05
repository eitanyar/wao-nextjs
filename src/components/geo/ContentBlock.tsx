'use client';

import CopyButton from './CopyButton';

interface Props {
  html:     string;
  platform?: string | null;
}

const PLATFORM_NOTE: Record<string, string> = {
  wordpress: 'הדבק כבלוק "HTML מותאם אישית" בעורך של וורדפרס.',
  elementor: 'הדבק בתוך ווידג\'ט HTML של Elementor.',
  wix:       'הדבק בתוך רכיב HTML מותאם אישית ב-Wix (נדרש חבילת Business).',
};

/** Step 1 — the ready content, with a copy button. copyPayload may be adapted per platform later. */
export default function ContentBlock({ html, platform }: Props) {
  const note = platform ? PLATFORM_NOTE[platform] : undefined;

  return (
    <li className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--bg)]">
            ①
          </span>
          <span className="text-sm font-medium">התוכן להוספה</span>
        </div>
        <CopyButton payload={html} label="העתק" ariaLabel="העתקת בלוק התוכן ללוח" />
      </div>
      <div
        className="prose prose-invert max-w-none p-4 text-sm leading-relaxed"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {note && <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">{note}</p>}
    </li>
  );
}
