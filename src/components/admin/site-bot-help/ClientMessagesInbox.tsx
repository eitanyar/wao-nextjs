'use client';
import { useEffect, useRef } from 'react';
import { createClientInbox, createSameOriginTransport, renderClientInbox, type ClientMessagePatch } from './clientMessages.mjs';

export function ClientMessagesInbox() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const actions = { update: (id: string, patch: ClientMessagePatch) => inbox.update(id, patch) };
    const inbox = createClientInbox({ transport: createSameOriginTransport(), render: state => renderClientInbox(node, state, actions) });
    void inbox.load();
    return () => { inbox.dispose(); node.replaceChildren(); };
  }, []);
  return <div ref={root} dir="ltr" />;
}
