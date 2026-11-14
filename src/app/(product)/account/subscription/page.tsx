import { peekMagicLinkToken } from '@/lib/payments/magic-link';
import { cancelEffectiveAtIfCanceledNow, getSubscriptionById } from '@/lib/payments/subscriptions';
import CancelSubscriptionButton from './CancelSubscriptionButton';
import CardUpdateButton from './CardUpdateButton';
import RequestLinkForm from './RequestLinkForm';
import ClientMessageBox from './ClientMessageBox';
import { siteBotSupportBoxShown } from '@/lib/site-bot/supportBox';
import {
  ACCOUNT_PAGE_COPY as COPY,
  ACCOUNT_STATUS_LABEL,
  ACCOUNT_TITLE_SUFFIX,
  formatAccountDate,
  formatAccountPrice,
} from '@/lib/payments/accountCopy';

// The page is Hebrew RTL (the (product) layout sets <html lang="he" dir="rtl">). Legacy trial-engine strings stay
// English and carry their own lang="en" dir="ltr" so their punctuation does not flip.
export const metadata = { robots: { index: false }, title: COPY.metadataTitle + ACCOUNT_TITLE_SUFFIX };

// Legacy trial-engine statuses keep their English labels (out of the Hebrew pass, marked lang="en"); every other status
// is Hebrew.
const LEGACY_STATUS_LABEL: Record<string, string> = { trialing: 'Trial', expired: 'Expired' };
const STATUS_LABEL: Record<string, string> = { ...LEGACY_STATUS_LABEL, ...ACCOUNT_STATUS_LABEL };

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; signup?: string; cardUpdate?: string }>;
}) {
  const { token, signup, cardUpdate } = await searchParams;

  // Signup-flow redirect landing (from /api/subscriptions/callback) — no token involved.
  if (!token && signup) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          {signup === 'success' ? (
            <h1 className="mt-6 text-sm font-normal text-[var(--muted)]" lang="en" dir="ltr">
              Your trial has started. Check your email for a confirmation with a link to manage or cancel your
              subscription any time.
            </h1>
          ) : (
            <h1 className="mt-6 text-sm font-normal text-red-400" lang="en" dir="ltr">
              We couldn&apos;t complete your signup. No charge was made. Please try again.
            </h1>
          )}
        </div>
      </main>
    );
  }

  // Card-update-flow redirect landing when the callback itself failed before
  // it could mint a fresh token to bring the customer back to (see
  // `applyCardUpdateCallback` — a bad/forged callback never leaks its
  // specific reason, and never mutates state).
  if (!token && cardUpdate === 'error') {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <RequestLinkForm notice={{ text: COPY.cardUpdateCallbackError, tone: 'error' }} />
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <RequestLinkForm notice={{ text: COPY.noTokenIntro, tone: 'muted' }} />
        </div>
      </main>
    );
  }

  // Read-only peek — does not consume the token. See magic-link.ts doc comment.
  const peek = peekMagicLinkToken(token);

  if (!peek.valid) {
    const message =
      peek.reason === 'expired'
        ? COPY.linkExpired
        : peek.reason === 'already_consumed'
        ? COPY.linkUsed
        : COPY.linkInvalid;

    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <RequestLinkForm notice={{ text: message, tone: 'error' }} />
        </div>
      </main>
    );
  }

  const subscription = getSubscriptionById(peek.subscriptionId);

  if (!subscription) {
    return (
      <main className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <RequestLinkForm notice={{ text: COPY.subscriptionNotFound, tone: 'error' }} />
        </div>
      </main>
    );
  }

  const isCanceled = subscription.status === 'canceled';
  // Plan rows (Site-Bot): the customer cancelled; access continues until the end of the paid period, no further charge.
  const cancelScheduled = !isCanceled && subscription.cancel_at_period_end === 1 && !!subscription.cancel_effective_at;
  const isPastDue = subscription.status === 'past_due';
  // Site-Bot client message box: only for Site-Bot plan rows past checkout, with the feature flag on and the Hebrew
  // copy approved (siteBotSupportBoxShown). The buttons' generic error points at the box only when it is shown.
  const showMessageBox = siteBotSupportBoxShown(subscription, process.env);
  // The date the confirm question promises: the same rule the cancel applies (null = the cancel takes effect at once).
  const cancelEffectiveAt = cancelEffectiveAtIfCanceledNow(subscription);
  const confirmDate = cancelEffectiveAt ? formatAccountDate(cancelEffectiveAt) : null;

  return (
    <main className="min-h-dvh flex items-center justify-center px-4">
      <div className={showMessageBox ? 'w-full max-w-md' : 'w-full max-w-sm'}>
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <h1 className="text-[var(--muted)] mt-1 text-sm font-normal">{COPY.headerSubtitle}</h1>
        </div>

        {cardUpdate === 'success' && (
          <p className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center py-2 px-3">
            {COPY.noticeCardUpdated}
          </p>
        )}
        {cardUpdate === 'success-recharged' && (
          <p className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center py-2 px-3">
            {COPY.noticeCardUpdatedRecharged}
          </p>
        )}

        {isPastDue && (
          <p className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm text-center py-2 px-3">
            {COPY.noticePastDue}
          </p>
        )}

        {showMessageBox && (
          <div className="mb-6">
            <ClientMessageBox token={token} cancelAvailable={!isCanceled && !cancelScheduled} />
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">{COPY.rowStatus}</span>
            <span className="font-semibold" lang={Object.hasOwn(ACCOUNT_STATUS_LABEL, subscription.status) ? undefined : 'en'}>
              {STATUS_LABEL[subscription.status] ?? subscription.status}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">{COPY.rowRecurringAmount}</span>
            {/* VAT-inclusive recurring amount (owner decision 2026-11-14), he-IL currency format, LTR-isolated. */}
            <bdi dir="ltr" className="font-semibold">
              {subscription.recurring_amount != null ? formatAccountPrice(subscription.recurring_amount, subscription.currency) : ''}
            </bdi>
          </div>
          {subscription.card_last4 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{COPY.rowCard}</span>
              <bdi dir="ltr" className="font-semibold">•••• {subscription.card_last4}</bdi>
            </div>
          )}
          {cancelScheduled && (
            <div className="flex justify-between text-sm" data-cancel-at-period-end="true">
              <span className="text-[var(--muted)]">{COPY.rowAccessUntil}</span>
              <bdi dir="ltr" className="font-semibold">{formatAccountDate(subscription.cancel_effective_at as string)}</bdi>
            </div>
          )}
          {subscription.next_charge_at && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">{COPY.rowNextCharge}</span>
              <bdi dir="ltr" className="font-semibold">{formatAccountDate(subscription.next_charge_at)}</bdi>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {isCanceled ? (
              <p className="text-green-400 text-sm text-center">{COPY.stateAlreadyCanceled}</p>
            ) : cancelScheduled ? (
              <p className="text-green-400 text-sm text-center">{COPY.stateCancelScheduled}</p>
            ) : (
              <>
                <CardUpdateButton token={token} prominent={isPastDue} showMessageBox={showMessageBox} />
                <CancelSubscriptionButton token={token} showMessageBox={showMessageBox} confirmDate={confirmDate} />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
