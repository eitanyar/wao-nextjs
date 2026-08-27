import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import { SCORECARD_COPY } from '@/lib/site-bot/scorecardCopy';
import { readLog } from '@/lib/site-bot/fixLog';
import { readAuditRecord, UUID_REGEX } from '@/lib/site-bot/auditStore';
import type { FixItem } from '@/lib/gbp/fixPlan';

export const metadata: Metadata = {
  robots: { index: false },
};

const TYPE_TITLES: Record<string, string> = {
  write_location: SCORECARD_COPY.FIX_TYPE_LOCATION,
  write_categories: SCORECARD_COPY.FIX_TYPE_CATEGORIES,
};

interface FixPlanData {
  auditId: string;
  generatedAt: string;
  items: FixItem[];
}

export default async function SiteBotFixPage({
  params,
  searchParams,
}: {
  params: Promise<{ auditId: string }>;
  searchParams?: Promise<{ connected?: string; error?: string }>;
}) {
  const { auditId: rawId } = await params;
  const queryParams = searchParams ? await searchParams : undefined;
  const auditId = decodeURIComponent(rawId);

  if (!auditId || !UUID_REGEX.test(auditId)) {
    notFound();
  }

  const planFile = path.join(process.cwd(), 'data', 'audits', auditId, 'fix-plan.json');
  if (!fs.existsSync(planFile)) {
    notFound();
  }

  let planData: FixPlanData;
  try {
    const raw = fs.readFileSync(planFile, 'utf8');
    planData = JSON.parse(raw) as FixPlanData;
  } catch {
    notFound();
  }

  const auditData = await readAuditRecord(auditId);
  const isConnected = Boolean(auditData && typeof auditData.gbpLocationId === 'string' && auditData.gbpLocationId);

  const items: FixItem[] = Array.isArray(planData?.items) ? planData.items : [];
  const writeItems = items.filter((item) => item.type.startsWith('write_'));
  const manualItems = items.filter((item) => item.type === 'manual_owner_action');

  const logEntries = readLog(auditId);
  const approvedItemIds = new Set(
    logEntries
      .filter(
        (e) =>
          e.verificationNote === 'approved_pending_connection' ||
          (e as unknown as { status?: string }).status === 'approved_pending_connection'
      )
      .map((e) => e.actionId || (e as unknown as { itemId?: string }).itemId)
  );

  const readyItemIds = new Set(
    logEntries
      .filter(
        (e) =>
          e.verificationNote === 'gbp_connected' ||
          (e as unknown as { status?: string }).status === 'ready_to_execute'
      )
      .map((e) => e.actionId || (e as unknown as { itemId?: string }).itemId)
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 pt-8 pb-32" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-[var(--foreground)]">{SCORECARD_COPY.PAGE_TITLE}</h1>
        <p className="text-sm text-[var(--muted)]">{SCORECARD_COPY.FIX_PAGE_SUBTITLE}</p>
      </div>

      {/* OAuth Connection & Execution Banner */}
      {approvedItemIds.size > 0 && !isConnected && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-950 dark:text-blue-200">
                {SCORECARD_COPY.CTA_TRIAL}
              </p>
            </div>
            <a
              href={`/api/site-bot/gbp/oauth/start?auditId=${auditId}`}
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 whitespace-nowrap"
            >
              Connect Google Account
            </a>
          </div>
        </div>
      )}

      {isConnected && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                {SCORECARD_COPY.STATUS_PASS}
              </span>
              <span className="text-xs font-mono text-[var(--muted)]">
                {typeof auditData?.gbpLocationId === 'string' ? auditData.gbpLocationId : 'GBP Connected'}
              </span>
            </div>
            {(readyItemIds.size > 0 || approvedItemIds.size > 0) && (
              <form action="/api/site-bot/fix-execute" method="POST">
                <input type="hidden" name="auditId" value={auditId} />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                >
                  Execute Fixes
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {queryParams?.error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {SCORECARD_COPY.FORM_ERROR_GENERIC}
        </div>
      )}

      <div className="space-y-4 mb-8">
        {writeItems.map((item) => {
          const isApproved = approvedItemIds.has(item.id) || readyItemIds.has(item.id);
          const title = TYPE_TITLES[item.type] ?? item.type;

          return (
            <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">{title}</h2>
                <span className="text-xs font-mono text-[var(--muted)]">{item.id}</span>
              </div>
              {item.reason && <p className="text-sm text-[var(--muted)] mb-3">{item.reason}</p>}
              <div className="mb-4">
                <code className="block rounded bg-neutral-100 dark:bg-neutral-800 p-2 text-xs font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                  {item.payloadHint}
                </code>
              </div>
              {isApproved ? (
                <div className="rounded border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                  {SCORECARD_COPY.FIX_APPROVED_NOTE}
                </div>
              ) : (
                <form action="/api/site-bot/fix-approve" method="POST">
                  <input type="hidden" name="auditId" value={auditId} />
                  <input type="hidden" name="itemId" value={item.id} />
                  <button
                    type="submit"
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200"
                  >
                    {SCORECARD_COPY.FIX_APPROVE_BUTTON}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      {manualItems.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-[var(--foreground)]">
            {SCORECARD_COPY.FIX_MANUAL_HEADER}
          </h2>
          <div className="space-y-4">
            {manualItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-[var(--foreground)]">{item.dimension}</span>
                  <span className="text-xs font-mono text-[var(--muted)]">{item.id}</span>
                </div>
                {item.reason && <p className="text-sm text-[var(--muted)] mb-2">{item.reason}</p>}
                <code className="block rounded bg-neutral-100 dark:bg-neutral-800 p-2 text-xs font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                  {item.payloadHint}
                </code>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
