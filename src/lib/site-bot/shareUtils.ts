/**
 * Share utility for Site-Bot audit scorecard.
 * Handles building WhatsApp, Web Share, and clipboard deep link targets.
 * 
 * HEBREW-SAFETY: ZERO raw Hebrew strings authored in this module. All text is passed
 * via parameters or generated as standard URL structures.
 */

export interface ShareData {
  auditId: string;
  businessName?: string;
  shareText?: string;
  baseUrl?: string;
}

export function buildAuditDeepLink(auditId: string, baseUrl?: string): string {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : 'https://wao.co.il';
  return `${base}/site-bot/audit?auditId=${encodeURIComponent(auditId)}`;
}

export function buildWhatsAppShareUrl(params: {
  auditId: string;
  shareText: string;
  baseUrl?: string;
}): string {
  const deepLink = buildAuditDeepLink(params.auditId, params.baseUrl);
  const fullText = `${params.shareText}\n${deepLink}`.trim();
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
}

export function buildWebShareData(params: {
  auditId: string;
  title: string;
  shareText: string;
  baseUrl?: string;
}): { title: string; text: string; url: string } {
  const url = buildAuditDeepLink(params.auditId, params.baseUrl);
  return {
    title: params.title,
    text: params.shareText,
    url,
  };
}
