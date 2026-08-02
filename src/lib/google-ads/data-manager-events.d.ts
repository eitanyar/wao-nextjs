/**
 * Type declarations for `./data-manager-events.js` — kept as a plain `.js`
 * file (spec §5.1 helpers, deliberately extracted per
 * docs/specs/priority-4-data-manager-api-migration.md, see the file-level
 * comment in `conversion-upload.ts`) so it can carry real, mocked-`fetch`
 * unit coverage under plain `node --test` on a Node build with no
 * TypeScript type-stripping support. This `.d.ts` restores full type
 * safety for `conversion-upload.ts`'s consumption of it — no behavior,
 * purely types.
 */

export type ClickId = { gclid: string } | { wbraid: string } | { gbraid: string };

export function parseConversionActionId(resourceName: string | null | undefined): string | null;

export function resolveDataManagerRefreshToken(mode: 'test' | 'live'): string | undefined;

export type TokenExchangeSuccess = { accessToken: string };
export type TokenExchangeFailure = { error: string; status: number };

export function getDataManagerAccessToken(
  refreshToken: string,
  fetchImpl?: typeof fetch
): Promise<TokenExchangeSuccess | TokenExchangeFailure>;

export interface SendConversionEventParams {
  accessToken: string;
  mccId: string;
  customerId: string;
  productDestinationId: string;
  clickId: ClickId;
  transactionId: string;
  eventTimestamp: string;
  conversionValue: number;
  fetchImpl?: typeof fetch;
}

export type SendConversionEventResult =
  | { ok: true; requestId?: string }
  | { ok: false; fieldWarnings: true; body: unknown }
  | { ok: false; fieldWarnings: false; error: string; status: number };

export function sendConversionEvent(params: SendConversionEventParams): Promise<SendConversionEventResult>;

export function toEventTimestamp(isoOrDisplay: string): string;
