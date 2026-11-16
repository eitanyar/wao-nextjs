/**
 * Site-Bot review-request kit (launch-readiness capability 6).
 *
 * The owner gets a ready message for his customers with his Google "write a review" link: on the account page (a card
 * with copy and WhatsApp-share buttons) and once by email when his site goes live. WAO never messages the end customer:
 * the WhatsApp link has no recipient, the owner picks the contact.
 *
 * Go-live hook: the deploy route (src/app/api/site-bot/deploy/route.ts) calls onSiteBotSiteLive after a successful
 * publish. It links the deploy to the subscription through the research id (= checkout session id), records the site
 * as live with its Place ID, and sends the kit email once. The daily lifecycle cron (sweepReviewKits) retries any live
 * site whose kit was not sent yet (copy still pending at go-live, Resend down), so approving the copy later still
 * delivers it once. No usable Place ID: no card, no email, one staff alert, never a broken link.
 *
 * Zero Hebrew in this module (copy lives in reviewKitCopy.ts). Never logs message content.
 */
import { SITE_BOT_PLAN } from '../payments/plans';
import { getDb, type SubscriptionRow } from '../payments/db';
import { placeReviewUrl } from '../gbp/reviewLink';
import { resolveClientIdentity } from './clientMessages';
import { defaultMailTransport, israelTime, staffAlertAddress, supportFromAddress, type MailTransport } from './clientMessageEmail';
import { fillCopy, renderLifecycleEmail } from './lifecycleEmail';
import {
  REVIEW_CARD_COPY_KEYS,
  REVIEW_EMAIL_COPY_KEYS,
  reviewKitCopyReady,
  SITE_BOT_REVIEW_KIT_COPY,
  SITE_BOT_REVIEW_KIT_COPY_PENDING,
} from './reviewKitCopy';
import {
  claimNotice,
  completeNotice,
  findSubscriptionIdBySession,
  getSiteBotSite,
  listSiteBotSites,
  noticeSent,
  recordSiteLive,
  releaseNotice,
  type SiteBotSiteRow,
} from './siteLifecycleStore';

const HEBREW_LETTER = '\u05d0-\u05ea';
const MAQAF = '\u05be';
const PREFIX_BEFORE_NAME = new RegExp(`([${HEBREW_LETTER}])\\{businessName\\}`, 'g');

/**
 * Hebrew prefix + Latin/digit name rule: when {businessName} directly follows a Hebrew prefix letter and the name starts
 * with a Latin letter or a digit, a maqaf (U+05BE) goes between them. Hebrew names attach directly, unchanged.
 */
export function withPrefixMaqaf(template: string, businessName: string): string {
  if (!/^[A-Za-z0-9]/.test(businessName.trim())) return template;
  return template.replace(PREFIX_BEFORE_NAME, (_, letter: string) => `${letter}${MAQAF}{businessName}`);
}

/** The ready customer message, with the business name and review link filled in. */
export function fillReviewMessage(template: string, businessName: string, reviewLink: string): string {
  const name = businessName.trim();
  return fillCopy(withPrefixMaqaf(template, name), { businessName: name, reviewLink });
}

/** WhatsApp share link with no recipient: WhatsApp asks the owner which contact to send it to. */
export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** An active (not cancelling) Site-Bot subscription. */
export function reviewKitEligible(subscription: Pick<SubscriptionRow, 'plan' | 'status' | 'cancel_at_period_end'>): boolean {
  return subscription.plan === SITE_BOT_PLAN.id && subscription.status === 'active' && subscription.cancel_at_period_end !== 1;
}

function businessNameFor(subscriptionId: string, site: SiteBotSiteRow | null): string | null {
  const fromSite = site?.business_name?.trim();
  if (fromSite) return fromSite;
  return resolveClientIdentity(subscriptionId).businessName;
}

export interface ReviewCardView {
  heading: string;
  intro: string;
  message: string;
  reviewLink: string;
  whatsappUrl: string;
  copyButton: string;
  copiedToast: string;
  whatsappButton: string;
  senderNote: string;
}

/**
 * The account-page card, or null when it must stay hidden: not an active Site-Bot subscription, site not live, no
 * usable Place ID, no business name, or the copy still pending.
 */
export function reviewCardFor(
  subscription: Pick<SubscriptionRow, 'id' | 'plan' | 'status' | 'cancel_at_period_end'>,
  options: { copy?: Readonly<Record<string, string>>; pending?: boolean } = {}
): ReviewCardView | null {
  const copy = options.copy ?? SITE_BOT_REVIEW_KIT_COPY;
  const pending = options.pending ?? SITE_BOT_REVIEW_KIT_COPY_PENDING;
  if (!reviewKitCopyReady(REVIEW_CARD_COPY_KEYS, copy, pending)) return null;
  if (!reviewKitEligible(subscription)) return null;
  const site = getSiteBotSite(subscription.id);
  if (!site) return null;
  const reviewLink = placeReviewUrl(site.place_id);
  if (!reviewLink) return null;
  const businessName = businessNameFor(subscription.id, site);
  if (!businessName) return null;
  const message = fillReviewMessage(copy.reviewMessage, businessName, reviewLink);
  return {
    heading: copy.reviewCardHeading,
    intro: copy.reviewCardIntro,
    message,
    reviewLink,
    whatsappUrl: buildWhatsAppShareUrl(message),
    copyButton: copy.copyButton,
    copiedToast: copy.copiedToast,
    whatsappButton: copy.whatsappButton,
    senderNote: copy.reviewSenderNote,
  };
}

function getSubscription(subscriptionId: string): SubscriptionRow | null {
  return (getDb().prepare(`SELECT * FROM subscriptions WHERE id = ?`).get(subscriptionId) as SubscriptionRow | undefined) ?? null;
}

export type ReviewKitOutcome =
  | 'sent'
  | 'stubbed'
  | 'already_sent'
  | 'copy_pending'
  | 'not_eligible'
  | 'not_live'
  | 'no_place_id'
  | 'no_business_name'
  | 'no_email'
  | 'failed';

/** One English staff alert per subscription: the site is live but has no usable Place ID, so no kit went out. */
export async function sendNoPlaceIdAlert(subscriptionId: string, now: Date, transport: MailTransport = defaultMailTransport): Promise<boolean> {
  if (!claimNotice(subscriptionId, 'review_kit_no_place_alert', now)) return false;
  try {
    const site = getSiteBotSite(subscriptionId);
    const lines = [
      'A Site Bot site is live but has no usable Google Place ID, so the review-request kit is hidden and was not emailed.',
      '',
      `Business: ${businessNameFor(subscriptionId, site) ?? '-'}`,
      `Site: ${site?.site_url ?? '-'}`,
      `Live since: ${israelTime(site?.live_at)} (Israel time)`,
      `Subscription: ${subscriptionId}`,
      '',
      "To do: match the business's Google profile (place_id on the site record), redeploy. The kit goes out on the next deploy or the next daily lifecycle run.",
    ];
    const outcome = await transport({
      to: staffAlertAddress(),
      from: supportFromAddress(),
      subject: `Site Bot review kit blocked — no Place ID — ${businessNameFor(subscriptionId, site) ?? subscriptionId.slice(0, 8)}`,
      text: lines.join('\n'),
      tag: 'review_kit_no_place',
      refIds: [subscriptionId],
    });
    completeNotice(subscriptionId, 'review_kit_no_place_alert', outcome, now);
    return outcome === 'sent';
  } catch {
    releaseNotice(subscriptionId, 'review_kit_no_place_alert');
    console.error(`[site-bot review-kit] no-place alert failed subscription=${subscriptionId}`);
    return false;
  }
}

/**
 * The one-time go-live email to the owner: his review link and the ready message. Idempotent through
 * site_bot_notices ('review_kit_email'). A missing Place ID raises the staff alert instead.
 */
export async function sendReviewKitEmail(
  subscriptionId: string,
  now: Date,
  transport: MailTransport = defaultMailTransport,
  options: { copy?: Readonly<Record<string, string>>; pending?: boolean } = {}
): Promise<ReviewKitOutcome> {
  if (noticeSent(subscriptionId, 'review_kit_email')) return 'already_sent';
  const copy = options.copy ?? SITE_BOT_REVIEW_KIT_COPY;
  const pending = options.pending ?? SITE_BOT_REVIEW_KIT_COPY_PENDING;
  const subscription = getSubscription(subscriptionId);
  if (!subscription || !reviewKitEligible(subscription)) return 'not_eligible';
  const site = getSiteBotSite(subscriptionId);
  if (!site) return 'not_live';
  const reviewLink = placeReviewUrl(site.place_id);
  if (!reviewLink) {
    await sendNoPlaceIdAlert(subscriptionId, now, transport);
    return 'no_place_id';
  }
  if (!reviewKitCopyReady(REVIEW_EMAIL_COPY_KEYS, copy, pending)) return 'copy_pending';
  const businessName = businessNameFor(subscriptionId, site);
  if (!businessName) return 'no_business_name';
  const to = resolveClientIdentity(subscriptionId).contactEmail;
  if (!to) return 'no_email';
  if (!claimNotice(subscriptionId, 'review_kit_email', now)) return 'already_sent';
  try {
    const values = { businessName, reviewLink };
    const { text, html } = renderLifecycleEmail(
      [
        { template: withPrefixMaqaf(copy.reviewEmailIntro, businessName) },
        { template: copy.reviewEmailMessageLabel },
        { template: withPrefixMaqaf(copy.reviewMessage, businessName), quote: true },
        { template: withPrefixMaqaf(copy.reviewEmailOutro, businessName) },
      ],
      values,
      { linkKeys: ['reviewLink'] }
    );
    const from = supportFromAddress();
    const outcome = await transport({
      to,
      from,
      replyTo: from,
      subject: fillCopy(withPrefixMaqaf(copy.reviewEmailSubject, businessName), values),
      text,
      html,
      tag: 'review_kit',
      refIds: [subscriptionId],
    });
    completeNotice(subscriptionId, 'review_kit_email', outcome, now);
    return outcome;
  } catch {
    releaseNotice(subscriptionId, 'review_kit_email');
    console.error(`[site-bot review-kit] email failed subscription=${subscriptionId}`);
    return 'failed';
  }
}

export interface SiteLiveInput {
  /** The site record's researchId: the Site-Bot checkout session id. */
  researchId: string | null | undefined;
  slug: string;
  siteUrl: string;
  placeId: unknown;
  placeIdNeedsRematch?: boolean;
  ownDomain: boolean;
  businessName: string | null | undefined;
  simulation?: boolean;
}

/**
 * Deploy-route hook. Never throws: a failure here must never fail a deploy that already published. Returns what
 * happened, for the deploy log line (ids and codes only).
 */
export async function onSiteBotSiteLive(
  input: SiteLiveInput,
  now: Date = new Date(),
  transport: MailTransport = defaultMailTransport,
  options: { copy?: Readonly<Record<string, string>>; pending?: boolean } = {}
): Promise<ReviewKitOutcome | 'no_subscription' | 'skipped'> {
  try {
    if (input.simulation || typeof input.researchId !== 'string' || !input.researchId.trim()) return 'skipped';
    const subscriptionId = findSubscriptionIdBySession(input.researchId);
    if (!subscriptionId) return 'no_subscription';
    const placeId = !input.placeIdNeedsRematch && placeReviewUrl(input.placeId) ? (input.placeId as string) : null;
    recordSiteLive({
      subscriptionId,
      slug: input.slug,
      siteUrl: input.siteUrl,
      placeId,
      ownDomain: input.ownDomain,
      businessName: typeof input.businessName === 'string' && input.businessName.trim() ? input.businessName.trim().slice(0, 200) : null,
      now,
    });
    return await sendReviewKitEmail(subscriptionId, now, transport, options);
  } catch {
    console.error(`[site-bot review-kit] go-live hook failed slug=${input.slug}`);
    return 'failed';
  }
}

/** Daily retry: every live site whose kit email was not sent yet gets one more attempt. */
export async function sweepReviewKits(
  now: Date,
  transport: MailTransport = defaultMailTransport,
  options: { copy?: Readonly<Record<string, string>>; pending?: boolean } = {}
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const site of listSiteBotSites()) {
    if (noticeSent(site.subscription_id, 'review_kit_email')) continue;
    const outcome = await sendReviewKitEmail(site.subscription_id, now, transport, options);
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  return counts;
}
