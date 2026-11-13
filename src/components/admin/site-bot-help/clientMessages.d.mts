export type ClientMessageStatus = 'received' | 'handling' | 'done';
export type ClientMessageCategory = 'change' | 'support' | 'billing' | 'cancel' | 'reviews' | 'other';
export type ClientMessageItem = {
  id: string; kind: 'client_message' | 'cancel_notice_due'; body: string; status: ClientMessageStatus; category: ClientMessageCategory | null; note: string;
  business: string | null; email: string | null; mobile: string | null; receivedAt: string; staffAlerted: boolean;
  meta: { effectiveAt: string | null; siteOfflineAt: string | null } | null;
};
export type ClientInboxState =
  | { status: 'loading' }
  | { status: 'error'; reason: 'unauthorized' | 'unavailable' | 'unknown'; notice?: string }
  | { status: 'empty' | 'records'; items: ClientMessageItem[]; skipped: number; openCount: number; overdueCount: number; notice?: string };
export type ClientMessagePatch = { status?: 'handling' | 'done' | 'received'; staffCategory?: ClientMessageCategory | null; staffNote?: string };
export type ClientInboxTransport = { list(): Promise<Response>; update(id: string, patch: ClientMessagePatch): Promise<Response> };
export const STATUSES: readonly ClientMessageStatus[];
export const CATEGORIES: readonly ClientMessageCategory[];
export function project(row: unknown): ClientMessageItem;
export function sortMessages(items: readonly ClientMessageItem[]): ClientMessageItem[];
export function olderThanOneBusinessDay(receivedAt: string, now?: number): boolean;
export function replyHref(item: Pick<ClientMessageItem, 'id' | 'email'>): string | null;
export function createSameOriginTransport(fetchFn?: typeof fetch): ClientInboxTransport;
export function createClientInbox(options: { transport: ClientInboxTransport; render: (state: ClientInboxState) => void; now?: () => number }): {
  load(): Promise<void>; update(id: string, patch: ClientMessagePatch): Promise<void>; dispose(): void;
};
export function renderClientInbox(root: HTMLElement, state: ClientInboxState, actions?: { update?(id: string, patch: ClientMessagePatch): void | Promise<void> }): void;
