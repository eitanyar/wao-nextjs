'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface CopyAnnounceContextValue {
  announce: (message: string) => void;
}

const CopyAnnounceContext = createContext<CopyAnnounceContextValue>({
  announce: () => {},
});

/** Client components call this to push a message into the single page-level aria-live region. */
export function useCopyAnnounce() {
  return useContext(CopyAnnounceContext).announce;
}

/**
 * Single page-level aria-live="polite" region for the whole /geo/action page.
 * Wraps server-rendered children (composition works fine — children arrive
 * already rendered from the server parent, this component just adds the
 * client-side context + live region around them).
 */
export default function CopyAnnouncer({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((msg: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Clear first so identical consecutive messages still re-fire the live region.
    setMessage('');
    requestAnimationFrame(() => setMessage(msg));
    timeoutRef.current = setTimeout(() => setMessage(''), 3000);
  }, []);

  return (
    <CopyAnnounceContext.Provider value={{ announce }}>
      {children}
      <div aria-live="polite" role="status" className="sr-only">
        {message}
      </div>
    </CopyAnnounceContext.Provider>
  );
}
