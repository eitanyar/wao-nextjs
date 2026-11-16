'use client';
import { useEffect, useRef } from 'react';
import { createClientInbox, createSameOriginTransport, renderClientInbox, type ClientMessagePatch, type DraftAction } from './clientMessages.mjs';

export function ClientMessagesInbox() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const actions = {
      update: (id: string, patch: ClientMessagePatch) => inbox.update(id, patch),
      draftAction: (id: string, action: DraftAction, text?: string) => inbox.draftAction(id, action, text),
    };
    const inbox = createClientInbox({ transport: createSameOriginTransport(), render: state => renderClientInbox(node, state, actions) });
    void inbox.load();
    return () => { inbox.dispose(); node.replaceChildren(); };
  }, []);
  return <div ref={root} dir="ltr" />;
}
