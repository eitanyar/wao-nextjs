/**
 * WAO GEO — WhatsApp message generator
 * Produces wa.me deep links with pre-filled Hebrew approval messages.
 * Works with any WhatsApp account — no Business API required.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.wao.co.il';

export interface WaMessageOptions {
  contactName:   string;
  contactPhone:  string;   // international format without +: 972501234567
  actionId:      string;
  query:         string;
  rankingUrl:    string;
  actionType:    string;
  priority:      'HIGH' | 'MEDIUM' | 'LOW';
  impressions:   number;
  batchIndex?:   number;
  batchTotal?:   number;
}

const PRIORITY_LABEL: Record<string, string> = {
  HIGH:   'גבוהה 🔴',
  MEDIUM: 'בינונית 🟡',
  LOW:    'נמוכה 🟢',
};

const ACTION_TYPE_LABEL: Record<string, string> = {
  faq_block:      'בלוק שאלות ותשובות',
  definition_box: 'תיבת הגדרה',
  table:          'טבלת השוואה',
};

export function buildApprovalMessage(opts: WaMessageOptions): string {
  const {
    contactName, actionId, query, rankingUrl,
    actionType, priority, impressions, batchIndex, batchTotal,
  } = opts;

  const actionUrl   = `${SITE_URL}/geo/action/${actionId}`;
  const pageSlug    = decodeURIComponent(rankingUrl.replace(/https?:\/\/[^/]+/, '') || '/');
  const batchLine   = batchIndex && batchTotal
    ? `פעולה ${batchIndex} מתוך ${batchTotal}`
    : 'פעולה חדשה';
  const priorityHe  = PRIORITY_LABEL[priority]  ?? priority;
  const actionLabel = ACTION_TYPE_LABEL[actionType] ?? actionType;

  return [
    `שלום ${contactName} 👋`,
    ``,
    `יש לנו ${batchLine} מוכנה לאישור שלך:`,
    ``,
    `📌 *${query}*`,
    `סוג: ${actionLabel}`,
    `עמוד: ${pageSlug}`,
    `עדיפות: ${priorityHe}`,
    `חשיפות בחודש: ${impressions.toLocaleString('he-IL')}`,
    ``,
    `👉 לצפייה ולאישור:`,
    actionUrl,
    ``,
    `לחצי ✅ לאישור, ✏️ לבקשת שינוי, או ⏭️ לדילוג.`,
  ].join('\n');
}

export function buildWaLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildApprovalLink(opts: WaMessageOptions): string {
  const message = buildApprovalMessage(opts);
  return buildWaLink(opts.contactPhone, message);
}
