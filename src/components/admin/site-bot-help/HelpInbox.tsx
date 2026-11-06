'use client';
import { useEffect, useRef } from 'react';
import { createInbox, createSameOriginTransport, renderInbox } from './inbox.mjs';

export function HelpInbox() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const actions = { setStatus: (requestId: string, status: 'handling' | 'done') => inbox.setStatus(requestId, status) };
    const inbox = createInbox({ transport: createSameOriginTransport(), render: state => renderInbox(node, state, actions) });
    void inbox.load();
    return () => { inbox.dispose(); node.replaceChildren(); };
  }, []);
  return <div ref={root} dir="ltr" />;
}
