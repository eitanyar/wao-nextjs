import { peekMagicLinkToken } from '@/lib/payments/magic-link';
import { getSubscriptionById } from '@/lib/payments/subscriptions';
import CancelSubscriptionButton from './CancelSubscriptionButton';
import CardUpdateButton from './CardUpdateButton';
import RequestLinkForm from './RequestLinkForm';
import ClientMessageBox from './ClientMessageBox';
import { SITE_BOT_PLAN } from '@/lib/payments/plans';
import { clientMessagesEnabled } from '@/lib/site-bot/clientMessages';
import { SITE_BOT_CLIENT_MESSAGE_COPY_PENDING } from '@/lib/site-bot/clientMessageCopy';

export const metadata = { robots: { index: false }, title: 'Manage subscription | WAO' };

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  trialing: 'Trial',
  active: 'Active',
  past_due: 'Past due',
  canceled: 'Canceled',
  expired: 'Expired',
  paused: 'Paused',
};

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; signup?: string; cardUpdate?: string }>;
}) {
  const { token, signup, cardUpdate } = await searchParams;

  // Signup-flow redirect landing (from /api/subscriptions/callback) — no token involved.
  if (!token && signup) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          {signup === 'success' ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
              Your trial has started. Check your email for a confirmation with a link to manage or cancel your
              subscription any time.
            </p>
          ) : (
            <p className="mt-6 text-sm text-red-400">
              We couldn&apos;t complete your signup. No charge was made. Please try again.
            </p>
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
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="mt-6 text-sm text-red-400">
            We couldn&apos;t update your card. Nothing was changed. Please request a new link and try again.
          </p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="mt-6 text-sm text-[var(--muted)]">
            This page needs a valid link from an email we sent you. Request a new one if you&apos;ve lost it.
          </p>
          <RequestLinkForm />
        </div>
      </main>
    );
  }

  // Read-only peek — does not consume the token. See magic-link.ts doc comment.
  const peek = peekMagicLinkToken(token);

  if (!peek.valid) {
    const message =
      peek.reason === 'expired'
        ? 'This link has expired. Please request a new one.'
        : peek.reason === 'already_consumed'
        ? 'This link has already been used.'
        : 'This link is invalid.';

    return (
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="mt-6 text-sm text-red-400">{message}</p>
          <RequestLinkForm />
        </div>
      </main>
    );
  }

  const subscription = getSubscriptionById(peek.subscriptionId);

  if (!subscription) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
        <div className="w-full max-w-sm text-center">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="mt-6 text-sm text-red-400">We couldn&apos;t find that subscription.</p>
        </div>
      </main>
    );
  }

  const isCanceled = subscription.status === 'canceled';
  // Plan rows (Site-Bot): the customer cancelled; access continues until the end of the paid period, no further charge.
  const cancelScheduled = !isCanceled && subscription.cancel_at_period_end === 1 && !!subscription.cancel_effective_at;
  const isPastDue = subscription.status === 'past_due';
  // Site-Bot client message box: only for Site-Bot plan rows past checkout, with the feature flag on and the Hebrew
  // copy approved. Otherwise the page is byte-for-byte what it was.
  const showMessageBox =
    subscription.plan === SITE_BOT_PLAN.id &&
    subscription.status !== 'pending' &&
    clientMessagesEnabled(process.env) &&
    !SITE_BOT_CLIENT_MESSAGE_COPY_PENDING;

  return (
    <main className="min-h-screen flex items-center justify-center px-4" dir="ltr">
      <div className={showMessageBox ? 'w-full max-w-md' : 'w-full max-w-sm'}>
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-tight">WAO</span>
          <p className="text-[var(--muted)] mt-1 text-sm">Manage your subscription</p>
        </div>

        {cardUpdate === 'success' && (
          <p className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center py-2 px-3">
            Your card was updated successfully.
          </p>
        )}
        {cardUpdate === 'success-recharged' && (
          <p className="mb-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center py-2 px-3">
            Your card was updated and your subscription is active again.
          </p>
        )}

        {isPastDue && (
          <p className="mb-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm text-center py-2 px-3">
            We couldn&apos;t charge your card. Please update your payment method to keep your subscription active.
          </p>
        )}

        {showMessageBox && (
          <div className="mb-6">
            <ClientMessageBox token={token} />
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Status</span>
            <span className="font-semibold">{STATUS_LABEL[subscription.status] ?? subscription.status}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--muted)]">Recurring amount</span>
            <span className="font-semibold">
              {subscription.recurring_amount} {subscription.currency}
            </span>
          </div>
          {subscription.card_last4 && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Card</span>
              <span className="font-semibold">•••• {subscription.card_last4}</span>
            </div>
          )}
          {cancelScheduled && (
            <div className="flex justify-between text-sm" data-cancel-at-period-end="true">
              <span className="text-[var(--muted)]">Access until</span>
              <span className="font-semibold">{new Date(subscription.cancel_effective_at as string).toLocaleDateString()}</span>
            </div>
          )}
          {subscription.next_charge_at && (
            <div className="flex justify-between text-sm">
              <span className="text-[var(--muted)]">Next charge</span>
              <span className="font-semibold">{new Date(subscription.next_charge_at).toLocaleDateString()}</span>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {isCanceled ? (
              <p className="text-green-400 text-sm text-center">This subscription is already canceled.</p>
            ) : cancelScheduled ? (
              <p className="text-green-400 text-sm text-center">Your subscription has been canceled. You will not be charged again.</p>
            ) : (
              <>
                <CardUpdateButton token={token} prominent={isPastDue} />
                <CancelSubscriptionButton token={token} />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
