export type ClientMessageStatus = 'received' | 'handling' | 'done';
export type ClientMessageCategory = 'change' | 'support' | 'billing' | 'cancel' | 'reviews' | 'other';
export type ClientMessageItem = {
  id: string; kind: 'client_message' | 'cancel_notice_due'; body: string; status: ClientMessageStatus; category: ClientMessageCategory | null; note: string;
  business: string | null; email: string | null; mobile: string | null; receivedAt: string; staffAlerted: boolean;
  meta: { effectiveAt: string | null; siteOfflineAt: string | null } | null;
  draft?: ClientMessageDraft | null;
};
export type ClientMessageDraft = {
  messageId: string; status: 'ready' | 'approved' | 'error'; draft: string; escalate: boolean; escalateReason: string | null;
  provider: string | null; errorCode: string | null; approvedAt: string | null;
};
export type DraftAction = 'generate' | 'save' | 'approve';
export type ClientInboxState =
  | { status: 'loading' }
  | { status: 'error'; reason: 'unauthorized' | 'unavailable' | 'unknown'; notice?: string }
  | { status: 'empty' | 'records'; items: ClientMessageItem[]; skipped: number; openCount: number; overdueCount: number; notice?: string };
export type ClientMessagePatch = { status?: 'handling' | 'done' | 'received'; staffCategory?: ClientMessageCategory | null; staffNote?: string };
export type ClientInboxTransport = {
  list(): Promise<Response>; update(id: string, patch: ClientMessagePatch): Promise<Response>;
  drafts?(): Promise<Response>; draftAction?(id: string, action: DraftAction, text?: string): Promise<Response>;
};
export const STATUSES: readonly ClientMessageStatus[];
export const CATEGORIES: readonly ClientMessageCategory[];
export function project(row: unknown): ClientMessageItem;
export function projectDraft(row: unknown): ClientMessageDraft;
export function sortMessages(items: readonly ClientMessageItem[]): ClientMessageItem[];
export function olderThanOneBusinessDay(receivedAt: string, now?: number): boolean;
export function replyHref(item: Pick<ClientMessageItem, 'id' | 'email'>): string | null;
export function createSameOriginTransport(fetchFn?: typeof fetch): ClientInboxTransport;
export function createClientInbox(options: { transport: ClientInboxTransport; render: (state: ClientInboxState) => void; now?: () => number }): {
  load(): Promise<void>; update(id: string, patch: ClientMessagePatch): Promise<void>;
  draftAction(id: string, action: DraftAction, text?: string): Promise<void>; dispose(): void;
};
export function renderClientInbox(root: HTMLElement, state: ClientInboxState, actions?: {
  update?(id: string, patch: ClientMessagePatch): void | Promise<void>;
  draftAction?(id: string, action: DraftAction, text?: string): void | Promise<void>;
}): void;
