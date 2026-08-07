/**
 * GMB Bot — WhatsApp deep-link generator for the weekly client digest / per-item approval.
 * Same wa.me pattern as src/lib/geo/whatsapp.ts (reused directly where the message shape is
 * identical — SendButton, contact fields); this file only differs in message copy, since GMB
 * items (review-reply / post drafts) need different context than GEO's on-site content actions.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wao.co.il';

export interface GmbWaMessageOptions {
  contactName:  string;
  contactPhone: string;   // international format without +: 972501234567
  itemId:       string;
  type:         'review_reply' | 'post';
  draftPreview: string;   // first ~100 chars of the draft, shown inline in the WA message
  reviewerName?: string;
  rating?:       number;
  batchIndex?:  number;
  batchTotal?:  number;
}

const TYPE_LABEL: Record<string, string> = {
  review_reply: 'תגובה לביקורת',
  post:         'פוסט לפרופיל',
};

export function buildGmbApprovalMessage(opts: GmbWaMessageOptions): string {
  const {
    contactName, itemId, type, draftPreview,
    reviewerName, rating, batchIndex, batchTotal,
  } = opts;

  const actionUrl = `${SITE_URL}/gmb/action/${itemId}`;
  const batchLine = batchIndex && batchTotal
    ? `פריט ${batchIndex} מתוך ${batchTotal}`
    : 'פריט חדש';
  const typeLabel = TYPE_LABEL[type] ?? type;
  const contextLine = type === 'review_reply' && reviewerName
    ? `ביקורת מ־${reviewerName}${rating ? ` (${rating}⭐)` : ''}`
    : null;

  return [
    `שלום ${contactName} 👋`,
    ``,
    `יש לנו ${batchLine} מוכן לאישור בפרופיל ה-Google Business שלך:`,
    ``,
    `📌 *${typeLabel}*`,
    ...(contextLine ? [contextLine] : []),
    `טיוטה: "${draftPreview}${draftPreview.length >= 100 ? '…' : ''}"`,
    ``,
    `👉 לצפייה, עריכה ואישור:`,
    actionUrl,
    ``,
    `לחצי ✅ לאישור, ✏️ לעריכה, או ❌ לדחייה.`,
  ].join('\n');
}

export function buildWaLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildGmbApprovalLink(opts: GmbWaMessageOptions): string {
  return buildWaLink(opts.contactPhone, buildGmbApprovalMessage(opts));
}
