import { createHash } from 'node:crypto';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { CopyFeedbackReference } from '@/components/admin/astra-copy-review/CopyFeedbackReference';
import { ADMIN_COOKIE_NAME, verifyAdminToken } from '@/lib/admin-auth';
import { loadAstraCopyReview } from '@/lib/astra-copy-review';

export const metadata: Metadata = {
  title: 'Astra copy review | WAO',
  robots: { index: false, follow: false, nocache: true },
};
export const dynamic = 'force-dynamic';

export default async function AstraCopyReviewPage() {
  const jar = await cookies();
  if (!await verifyAdminToken(jar.get(ADMIN_COOKIE_NAME)?.value ?? '')) {
    redirect('/admin/login?next=%2Fadmin%2Fastra-copy-review');
  }

  const { artifact, leaves, sha256, path } = await loadAstraCopyReview();
  const sections = artifact !== null && typeof artifact === 'object' && !Array.isArray(artifact)
    ? Object.keys(artifact)
    : [''];

  return (
    <main dir="rtl" lang="he" className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <header className="mb-10 rounded-2xl border border-amber-400/50 bg-amber-400/10 p-5 sm:p-8">
        <p className="text-sm font-bold text-amber-300">DRAFT — REVIEW ONLY</p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Astra copy review</h1>
        <p className="mt-3 font-bold">NOT APPROVED FOR PUBLICATION</p>
        <p className="mt-1">Material Hebrew QA still required</p>
        <dl className="mt-5 space-y-2 text-xs sm:text-sm">
          <div><dt className="font-semibold">Artifact path</dt><dd dir="ltr" className="break-all text-left">{path}</dd></div>
          <div><dt className="font-semibold">SHA-256</dt><dd dir="ltr" className="break-all text-left">{sha256}</dd></div>
        </dl>
      </header>
      {sections.map(section => {
        const prefix = `/${section.replace(/~/g, '~0').replace(/\//g, '~1')}`;
        const sectionLeaves = section === '' ? leaves : leaves.filter(leaf => leaf.pointer.startsWith(`${prefix}/`) || leaf.pointer === prefix);
        return (
          <section key={section} className="mb-10 min-w-0" aria-label={section || 'Root'}>
            <h2 dir="ltr" className="mb-4 border-b border-white/20 pb-2 text-left text-xl font-bold break-all">{section || 'Root'}</h2>
            <div className="space-y-3">
              {sectionLeaves.map(({ pointer, value }) => (
                <article key={pointer} id={`leaf-${createHash('sha256').update(pointer).digest('hex')}`} className="min-w-0 rounded-xl border border-white/15 bg-white/5 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <code dir="ltr" className="min-w-0 break-all text-left text-xs text-amber-200">{pointer}</code>
                    <CopyFeedbackReference pointer={pointer} />
                  </div>
                  <div className="mt-3 whitespace-pre-wrap break-words text-base leading-8 [overflow-wrap:anywhere]">{value === null ? 'null' : String(value)}</div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </main>
  );
}
