// In-page signal between the account page's client components: the cancel button fires it after a successful cancel,
// so other parts of the already-rendered page (the message box's cancel pointer line) can drop what no longer applies.
// The page is not re-rendered after a cancel (the single-use token is consumed), so this is the only way they learn it.
export const SUBSCRIPTION_CANCELED_EVENT = 'wao:subscription-canceled';

export function announceSubscriptionCanceled(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SUBSCRIPTION_CANCELED_EVENT));
}
