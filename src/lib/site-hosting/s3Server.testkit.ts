/**
 * Minimal S3-compatible HTTP server for tests and the local hosting e2e (scripts/site-hosting/local-e2e.mjs).
 * Verifies every request's SigV4 signature and payload hash, then maps PUT/GET/HEAD/DELETE/ListObjectsV2 onto
 * a pluggable backend (in-memory by default; the e2e plugs in Miniflare's R2 binding).
 * Test-only: never imported by the app. HEBREW-SAFETY: ZERO Hebrew bytes.
 */

import { createHash } from 'node:crypto';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import { sha256Hex, signV4, type SigV4Credentials } from './sigv4';

export interface S3Backend {
  put(key: string, body: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<{ body: Buffer; etag: string; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** All keys under prefix, sorted. */
  list(prefix: string): Promise<string[]>;
}

export function memoryBackend(): S3Backend & { objects: Map<string, { body: Buffer; etag: string; contentType: string }> } {
  const objects = new Map<string, { body: Buffer; etag: string; contentType: string }>();
  return {
    objects,
    async put(key, body, contentType) {
      const etag = `"${createHash('md5').update(body).digest('hex')}"`;
      objects.set(key, { body, etag, contentType });
      return etag;
    },
    async get(key) { return objects.get(key) ?? null; },
    async delete(key) { objects.delete(key); },
    async list(prefix) { return [...objects.keys()].filter(key => key.startsWith(prefix)).sort(); },
  };
}

export interface S3ServerOptions {
  bucket: string;
  credentials: SigV4Credentials;
  backend?: S3Backend;
  region?: string;
  /** Called for every request after auth; return a status to inject a failure. */
  inject?: (method: string, key: string) => number | undefined;
}

export interface RunningS3Server {
  endpoint: string;
  server: Server;
  backend: S3Backend;
  requests: Array<{ method: string; key: string; query: string }>;
  authFailures: number;
  close(): Promise<void>;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function startS3Server(options: S3ServerOptions): Promise<RunningS3Server> {
  const backend = options.backend ?? memoryBackend();
  const region = options.region ?? 'auto';
  const state = { requests: [] as RunningS3Server['requests'], authFailures: 0 };

  const server = createServer(async (req, res) => {
    try {
      const body = await readBody(req);
      const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
      const auth = String(req.headers.authorization ?? '');
      const match = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([a-z0-9;-]+), Signature=([0-9a-f]{64})$/.exec(auth);
      const payloadHash = String(req.headers['x-amz-content-sha256'] ?? '');
      let ok = Boolean(match) && match![1] === options.credentials.accessKeyId && match![3] === region && payloadHash === sha256Hex(body);
      if (ok) {
        const signedNames = match![4].split(';');
        const headers: Record<string, string> = {};
        for (const name of signedNames) {
          if (name === 'host' || name === 'x-amz-date' || name === 'x-amz-content-sha256') continue;
          headers[name] = String(req.headers[name] ?? '');
        }
        const expected = signV4({
          method: req.method ?? 'GET', url: `http://${req.headers.host}${req.url}`, headers, payloadHash,
          credentials: options.credentials, region, amzDate: String(req.headers['x-amz-date'] ?? ''),
        });
        ok = expected.signature === match![5] && expected.headers.authorization.includes(`SignedHeaders=${match![4]},`);
      }
      if (!ok) {
        state.authFailures++;
        res.writeHead(403, { 'content-type': 'application/xml' }).end('<Error><Code>SignatureDoesNotMatch</Code></Error>');
        return;
      }

      const parts = url.pathname.split('/');
      if (parts[1] !== options.bucket) {
        res.writeHead(404).end('<Error><Code>NoSuchBucket</Code></Error>');
        return;
      }
      const key = parts.slice(2).map(decodeURIComponent).join('/');
      state.requests.push({ method: req.method ?? 'GET', key, query: url.search });
      const injected = options.inject?.(req.method ?? 'GET', key);
      if (injected) {
        res.writeHead(injected).end(`<Error><Code>Injected${injected}</Code></Error>`);
        return;
      }

      if (!key && req.method === 'GET' && url.searchParams.get('list-type') === '2') {
        const prefix = url.searchParams.get('prefix') ?? '';
        const delimiter = url.searchParams.get('delimiter') ?? '';
        const maxKeys = Number(url.searchParams.get('max-keys') ?? '1000');
        const start = Number(url.searchParams.get('continuation-token') ?? '0');
        const all = await backend.list(prefix);
        const keys: string[] = [];
        const prefixes = new Set<string>();
        for (const k of all) {
          const rest = k.slice(prefix.length);
          const cut = delimiter ? rest.indexOf(delimiter) : -1;
          if (cut >= 0) prefixes.add(prefix + rest.slice(0, cut + delimiter.length));
          else keys.push(k);
        }
        const page = keys.slice(start, start + maxKeys);
        const truncated = start + maxKeys < keys.length;
        const xml = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${options.bucket}</Name>` +
          `<Prefix>${xmlEscape(prefix)}</Prefix><KeyCount>${page.length}</KeyCount><IsTruncated>${truncated}</IsTruncated>` +
          (truncated ? `<NextContinuationToken>${start + maxKeys}</NextContinuationToken>` : '') +
          page.map(k => `<Contents><Key>${xmlEscape(k)}</Key></Contents>`).join('') +
          (start === 0 ? [...prefixes].map(p => `<CommonPrefixes><Prefix>${xmlEscape(p)}</Prefix></CommonPrefixes>`).join('') : '') +
          '</ListBucketResult>';
        res.writeHead(200, { 'content-type': 'application/xml' }).end(xml);
        return;
      }
      if (!key) {
        res.writeHead(400).end('<Error><Code>InvalidRequest</Code></Error>');
        return;
      }
      if (req.method === 'PUT') {
        const etag = await backend.put(key, body, String(req.headers['content-type'] ?? 'application/octet-stream'));
        res.writeHead(200, { etag }).end();
        return;
      }
      if (req.method === 'GET' || req.method === 'HEAD') {
        const object = await backend.get(key);
        if (!object) {
          res.writeHead(404, { 'content-type': 'application/xml' }).end(req.method === 'HEAD' ? undefined : '<Error><Code>NoSuchKey</Code></Error>');
          return;
        }
        res.writeHead(200, { etag: object.etag, 'content-type': object.contentType, 'content-length': String(object.body.length) });
        res.end(req.method === 'HEAD' ? undefined : object.body);
        return;
      }
      if (req.method === 'DELETE') {
        await backend.delete(key);
        res.writeHead(204).end();
        return;
      }
      res.writeHead(405).end();
    } catch (error) {
      res.writeHead(500).end(`<Error><Code>InternalError</Code><Message>${xmlEscape(String(error))}</Message></Error>`);
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  return {
    endpoint: `http://127.0.0.1:${port}`,
    server,
    backend,
    get requests() { return state.requests; },
    get authFailures() { return state.authFailures; },
    close: () => new Promise<void>(resolve => server.close(() => resolve())),
  };
}
