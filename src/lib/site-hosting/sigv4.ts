/**
 * AWS Signature Version 4 for the S3 API (R2 speaks it with region `auto`).
 * Reference: https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html
 * Verified against the AWS documentation's S3 examples in sigv4.test.ts.
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

import { createHash, createHmac } from 'node:crypto';

export const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

export interface SigV4Credentials {
  accessKeyId: string;
  secretAccessKey: string;
}

export interface SigV4Input {
  method: string;
  url: string;
  /** Headers to sign (any case). `host`, `x-amz-date` and `x-amz-content-sha256` are added. */
  headers?: Record<string, string>;
  /** Hex SHA-256 of the body, or `UNSIGNED-PAYLOAD`. Defaults to the empty-body hash. */
  payloadHash?: string;
  credentials: SigV4Credentials;
  region: string;
  service?: string;
  /** `YYYYMMDDTHHMMSSZ`. Defaults to now. */
  amzDate?: string;
}

export interface SigV4Result {
  headers: Record<string, string>;
  canonicalRequest: string;
  stringToSign: string;
  signature: string;
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

/** RFC 3986 encoding as S3 expects (encodeURIComponent leaves !'()* alone). */
export function uriEncode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, ch => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Path-style key encoding: each segment encoded, `/` kept. */
export function encodeKeyPath(key: string): string {
  return key.split('/').map(uriEncode).join('/');
}

export function amzDateOf(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function signingKey(secretAccessKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

function canonicalQuery(url: URL): string {
  // URLSearchParams decodes; re-encode with RFC 3986 rules and sort by key, then value.
  const pairs: Array<[string, string]> = [];
  for (const [key, value] of url.searchParams) pairs.push([uriEncode(key), uriEncode(value)]);
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/** The request path exactly as it will be sent (already encoded by the caller). */
function canonicalUri(url: URL): string {
  return url.pathname || '/';
}

export function signV4(input: SigV4Input): SigV4Result {
  const url = new URL(input.url);
  const service = input.service ?? 's3';
  const amzDate = input.amzDate ?? amzDateOf(new Date());
  if (!/^\d{8}T\d{6}Z$/.test(amzDate)) throw new Error('invalid amzDate');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = input.payloadHash ?? EMPTY_SHA256;

  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(input.headers ?? {})) headers[name.toLowerCase()] = String(value);
  headers.host = url.host;
  headers['x-amz-date'] = amzDate;
  headers['x-amz-content-sha256'] = payloadHash;

  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map(name => `${name}:${headers[name].trim().replace(/\s+/g, ' ')}\n`).join('');
  const signedHeaders = names.join(';');
  const canonicalRequest = [
    input.method.toUpperCase(),
    canonicalUri(url),
    canonicalQuery(url),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = createHmac('sha256', signingKey(input.credentials.secretAccessKey, dateStamp, input.region, service))
    .update(stringToSign, 'utf8').digest('hex');

  const out: Record<string, string> = { ...headers };
  out.authorization = `AWS4-HMAC-SHA256 Credential=${input.credentials.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { headers: out, canonicalRequest, stringToSign, signature };
}
