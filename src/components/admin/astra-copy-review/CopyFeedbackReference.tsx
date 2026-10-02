'use client';

import { useState } from 'react';

export function CopyFeedbackReference({ pointer }: { pointer: string }) {
  const [status, setStatus] = useState('Copy reference');

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(`JSON Pointer: ${pointer}\nComment or replacement suggestion:\n\n`);
      setStatus('Copied reference');
    } catch {
      setStatus('Clipboard unavailable');
    }
  }

  return <button type="button" onClick={copyReference} className="shrink-0 rounded-lg border border-white/30 px-3 py-2 text-xs font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{status}</button>;
}
