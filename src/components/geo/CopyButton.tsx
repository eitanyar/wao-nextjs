'use client';
import { useState } from 'react';
import { useCopyAnnounce } from './CopyAnnouncer';

interface Props {
  payload:   string;
  label:     string;
  ariaLabel: string;
}

export default function CopyButton({ payload, label, ariaLabel }: Props) {
  const [copied, setCopied] = useState(false);
  const announce = useCopyAnnounce();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(payload);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = payload;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    announce('הועתק ללוח');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] min-h-[44px] min-w-[44px]"
    >
      {copied ? (
        <><span>✓</span><span>הועתק</span></>
      ) : (
        <><span>📋</span><span>{label}</span></>
      )}
    </button>
  );
}
