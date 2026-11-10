'use client';

import { useEffect, useRef, useState } from 'react';

type JsonLeaf = string | number | boolean | null;
type CopyLeaf = { path: string; value: JsonLeaf | '[empty array]' | '[empty object]'; empty?: boolean };
type Page = { opportunityId: string; classification: string; targetPath: string; copy: Record<string, unknown> };
type Review = { sha256: string; reviewStatus: 'pending_human_review'; deployable: false; pages: Array<{ page: Page; leaves: CopyLeaf[] }> };

const ENDPOINT = '/api/site-bot/research/copy-review';
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const SLUG = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){1,38}[a-z0-9]$/;
const DIGEST = /^[0-9a-f]{64}$/;
const PATH = /^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/;
const RESERVED = new Set(['api', 'assets', 'static', 'index', 'privacy', 'accessibility', 'contact', 'sitemap']);
const CLASSES = new Set(['homepage', 'service_hub', 'money_service', 'qualified_service_area',
  'trust', 'process', 'pricing', 'proof', 'supporting']);
const REQUIRED_COPY = ['heroHeadline', 'heroSubheadline', 'heroCta', 'aboutBlurb', 'servicesHeadline',
  'faqHeadline', 'formHeadline', 'stickyBarLine', 'aboutPageHeadline', 'aboutPageBody'];

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function safePath(value: unknown): value is string {
  return typeof value === 'string' && (value === '/' || (PATH.test(value) && !value.includes('..') &&
    value.slice(1).split('/').every(segment => !RESERVED.has(segment.toLowerCase()))));
}
function identity(value: unknown): value is Page {
  return object(value) && typeof value.opportunityId === 'string' && OPAQUE_ID.test(value.opportunityId) &&
    typeof value.classification === 'string' && CLASSES.has(value.classification) && safePath(value.targetPath) &&
    (value.classification === 'homepage' ? value.targetPath === '/' : value.targetPath !== '/');
}
/** M2b.1d: the about pair a page type does not render is not generated (empty) off the homepage / services hub. */
const ABOUT_PAIR = ['aboutPageHeadline', 'aboutPageBody'];
function completeCopy(copy: Record<string, unknown>, classification: string): boolean {
  // Copy v2 slice 2: the strings a research site never renders may be empty on every page type.
  const mayBeEmpty = [...(classification === 'homepage' || classification === 'service_hub' ? [] : ABOUT_PAIR), 'aboutBlurb', 'faqHeadline', 'stickyBarLine'];
  // M2a.2: guaranteeBlock is null when the owner has no guarantee; when set it must be non-empty.
  return REQUIRED_COPY.every(key => typeof copy[key] === 'string' && ((copy[key] as string).trim().length > 0 || (mayBeEmpty.includes(key) && copy[key] === ''))) &&
    (copy.guaranteeBlock === null || (typeof copy.guaranteeBlock === 'string' && copy.guaranteeBlock.trim().length > 0)) &&
    Array.isArray(copy.trustBarItems) && copy.trustBarItems.every(item => typeof item === 'string') &&
    Array.isArray(copy.serviceItems) && copy.serviceItems.every(item => typeof item === 'string') &&
    Array.isArray(copy.faqItems) && copy.faqItems.every(item => object(item) && typeof item.q === 'string' && typeof item.a === 'string') &&
    Array.isArray(copy.serviceDetails) && copy.serviceDetails.every(item => object(item) && typeof item.name === 'string' && typeof item.description === 'string');
}
function leaves(value: unknown, path: string, depth = 0): CopyLeaf[] {
  if (depth > 64) throw new Error('Invalid copy');
  if (value === null || typeof value === 'string' || typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))) return [{ path, value }];
  if (Array.isArray(value)) {
    if (value.length === 0) return [{ path, value: '[empty array]', empty: true }];
    return value.flatMap((entry, index) => {
      if (!Object.hasOwn(value, index)) throw new Error('Invalid copy');
      return leaves(entry, `${path}/${index}`, depth + 1);
    });
  }
  if (object(value)) {
    const keys = Object.keys(value);
    if (keys.length === 0) return [{ path, value: '[empty object]', empty: true }];
    return keys.flatMap(key => leaves(value[key], `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1')}`, depth + 1));
  }
  throw new Error('Invalid copy');
}
function reviewPayload(value: unknown, researchId: string, slug: string): Review {
  if (!object(value) || value.reviewStatus !== 'pending_human_review' || value.deployable !== false ||
    !object(value.packet) || !Array.isArray(value.pages)) throw new Error('Invalid review');
  const packet = value.packet;
  if (typeof packet.sha256 !== 'string' || !DIGEST.test(packet.sha256) ||
    packet.researchId !== researchId || packet.slug !== slug ||
    typeof packet.approvedPageId !== 'string' || !OPAQUE_ID.test(packet.approvedPageId) ||
    typeof packet.pageCount !== 'number' || !Number.isSafeInteger(packet.pageCount) || packet.pageCount < 1 ||
    !Array.isArray(packet.pages) || packet.pages.length !== packet.pageCount || value.pages.length !== packet.pageCount) {
    throw new Error('Invalid review');
  }
  const ids = new Set<string>();
  const paths = new Set<string>();
  let homeCount = 0;
  const expectedPages = packet.pages;
  const pages = value.pages.map((page: unknown, index: number) => {
    const expected = expectedPages[index];
    if (!identity(page) || !identity(expected) || !object(page.copy) || !completeCopy(page.copy, page.classification) ||
      page.opportunityId !== expected.opportunityId || page.classification !== expected.classification ||
      page.targetPath !== expected.targetPath || ids.has(page.opportunityId) || paths.has(page.targetPath)) {
      throw new Error('Invalid review');
    }
    ids.add(page.opportunityId);
    paths.add(page.targetPath);
    if (page.classification === 'homepage') homeCount++;
    return { page: { opportunityId: page.opportunityId, classification: page.classification,
      targetPath: page.targetPath, copy: page.copy }, leaves: leaves(page.copy, '/copy') };
  });
  if (homeCount !== 1 || !ids.has(packet.approvedPageId) ||
    pages.find(({ page }) => page.opportunityId === packet.approvedPageId)?.page.classification !== 'homepage') {
    throw new Error('Invalid review');
  }
  return { sha256: packet.sha256, reviewStatus: value.reviewStatus, deployable: false, pages };
}

export function CopyReviewViewer() {
  const [researchId, setResearchId] = useState('');
  const [slug, setSlug] = useState('');
  const [review, setReview] = useState<Review | null>(null);
  const [status, setStatus] = useState('Enter both identifiers, then load the pending review.');
  const [loading, setLoading] = useState(false);
  const request = useRef<{ controller: AbortController; serial: number } | null>(null);
  const serial = useRef(0);

  useEffect(() => () => { serial.current++; request.current?.controller.abort(); }, []);
  function clear() {
    serial.current++;
    request.current?.controller.abort();
    request.current = null;
    setLoading(false);
    setReview(null);
    setStatus('Selection changed. Load the review again.');
  }
  async function load() {
    if (loading) return;
    clear();
    if (!OPAQUE_ID.test(researchId) || !SLUG.test(slug)) {
      setStatus('Invalid selection.');
      return;
    }
    const controller = new AbortController();
    const current = ++serial.current;
    request.current = { controller, serial: current };
    setLoading(true);
    setStatus('Loading review...');
    try {
      const query = new URLSearchParams({ researchId, slug });
      const response = await fetch(`${ENDPOINT}?${query}`, {
        method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new Error('Review unavailable');
      const result = reviewPayload(await response.json(), researchId, slug);
      if (serial.current !== current) return;
      setReview(result);
      setStatus('Pending copy loaded for inspection.');
    } catch {
      if (serial.current !== current) return;
      setReview(null);
      setStatus('Review unavailable. Check the selection or your access and try again.');
    } finally {
      if (serial.current === current) {
        request.current = null;
        setLoading(false);
      }
    }
  }

  return (
    <div className="min-w-0 space-y-6" dir="ltr" lang="en">
      <header className="min-w-0 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-4 sm:p-6">
        <h1 className="text-2xl font-bold">Site-Bot copy review</h1>
        <p className="mt-2 font-semibold">Draft only. Hebrew QA and human approval remain pending. Not deployable.</p>
      </header>
      <section aria-label="Review selection" className="min-w-0 rounded-xl border border-white/20 p-4 sm:p-6">
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="min-w-0 text-sm font-semibold">Research ID
            <input autoComplete="off" spellCheck={false} value={researchId} onChange={event => { clear(); setResearchId(event.target.value); }}
              className="mt-1 block w-full min-w-0 rounded border border-white/40 bg-transparent p-2 text-base" />
          </label>
          <label className="min-w-0 text-sm font-semibold">Site slug
            <input autoComplete="off" spellCheck={false} value={slug} onChange={event => { clear(); setSlug(event.target.value); }}
              className="mt-1 block w-full min-w-0 rounded border border-white/40 bg-transparent p-2 text-base" />
          </label>
        </div>
        <button type="button" disabled={loading} onClick={load} className="mt-4 rounded border border-white/40 px-4 py-2 disabled:opacity-50">Load pending review</button>
        <p role="status" aria-live="polite" className="mt-3 text-sm">{status}</p>
      </section>
      {review && <section aria-label="Pending copy" className="min-w-0 space-y-6">
        <dl className="min-w-0 rounded-xl border border-white/20 p-4 text-sm">
          <div><dt>SHA-256</dt><dd dir="ltr" className="break-all [overflow-wrap:anywhere]">{review.sha256}</dd></div>
          <div><dt>Review status</dt><dd>{review.reviewStatus}</dd></div>
          <div><dt>Deployable</dt><dd>{String(review.deployable)}</dd></div>
          <div><dt>Page count</dt><dd>{review.pages.length}</dd></div>
        </dl>
        {review.pages.map(({ page, leaves: fields }, index) => (
          <section key={page.opportunityId} aria-label={`Page ${index + 1}`} className="min-w-0 rounded-xl border border-white/20 p-4 sm:p-6">
            <h2 className="text-xl font-bold">Page {index + 1}</h2>
            <dl className="min-w-0 text-sm">
              <div><dt>Opportunity ID</dt><dd dir="ltr" className="break-all [overflow-wrap:anywhere]">{page.opportunityId}</dd></div>
              <div><dt>Classification</dt><dd dir="ltr" className="break-all [overflow-wrap:anywhere]">{page.classification}</dd></div>
              <div><dt>Target path</dt><dd dir="ltr" className="break-all [overflow-wrap:anywhere]">{page.targetPath}</dd></div>
            </dl>
            <div className="mt-5 min-w-0 space-y-3">
              {fields.map(field => <article key={field.path} className="min-w-0 rounded-lg border border-white/15 p-3">
                <code dir="ltr" className="block min-w-0 break-all text-left text-xs [overflow-wrap:anywhere]">{field.path}</code>
                <div dir="rtl" lang="he" className="mt-2 min-w-0 whitespace-pre-wrap break-words text-base leading-8 [overflow-wrap:anywhere]">
                  {field.empty ? <em dir="ltr">{field.value}</em> : field.value === null ? 'null' : String(field.value)}
                </div>
              </article>)}
            </div>
          </section>
        ))}
      </section>}
    </div>
  );
}
