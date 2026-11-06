export type FollowUp = { status: 'received' } | { status: 'handling' | 'done'; updatedAt: string; updatedBy: 'admin' };
export type InboxRecord = { requestId: string; displayName: string; name: string; email?: string; phone?: string; receivedAt: string; followUp: FollowUp };
export type InboxState =
  | { status: 'loading' }
  | { status: 'error'; reason: 'unauthorized' | 'unavailable' | 'unknown' }
  | { status: 'empty' | 'records'; records: InboxRecord[]; skipped: number; notice?: string };
export type InboxTransport = { list(): Promise<Response>; setStatus(requestId: string, status: 'handling' | 'done'): Promise<Response> };
export const FOLLOW_UP_STATUSES: readonly ['handling', 'done'];
export function project(record: unknown): InboxRecord;
export function createSameOriginTransport(fetchFn?: typeof fetch): InboxTransport;
export function createInbox(options: { transport: InboxTransport; render: (state: InboxState) => void }): { load(): Promise<void>; setStatus(requestId: string, status: 'handling' | 'done'): Promise<void>; dispose(): void };
export function formatIsraelTime(value: string): string;
export function renderInbox(root: HTMLElement, state: InboxState, actions?: { setStatus?(requestId: string, status: 'handling' | 'done'): void | Promise<void> }): void;
