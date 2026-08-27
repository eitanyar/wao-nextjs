import { ACQUISITION_COPY } from './acquisitionCopy';
import type { AuditResult } from '../gbp/auditScore';

export interface ShareData {
  auditId: string;
  businessName?: string;
  shareText?: string;
  baseUrl?: string;
}

export interface OutboundHookResult {
  hookToken: string;
  hookText: string;
  followupText: string;
  fullMessage: string;
  fullFollowupMessage: string;
  failingDimension: 'categories' | 'hours' | 'photos' | null;
}

export function buildAuditDeepLink(auditId: string, baseUrl?: string): string {
  const base = baseUrl ? baseUrl.replace(/\/$/, '') : 'https://wao.co.il';
  return `${base}/site-bot/audit?auditId=${encodeURIComponent(auditId)}`;
}

export function formatWhatsAppShareMessage(params: {
  mode: 'peer' | 'marketer';
  auditId: string;
  baseUrl?: string;
}): string {
  const baseText =
    params.mode === 'marketer'
      ? ACQUISITION_COPY.WA_SHARE_MARKETER_TEXT
      : ACQUISITION_COPY.WA_SHARE_PEER_TEXT;
  const deepLink = buildAuditDeepLink(params.auditId, params.baseUrl);
  return `${baseText}\n${deepLink}`.trim();
}

export function buildWhatsAppShareUrl(params: {
  auditId: string;
  shareText?: string;
  mode?: 'peer' | 'marketer';
  baseUrl?: string;
}): string {
  let fullText: string;
  if (params.shareText) {
    const deepLink = buildAuditDeepLink(params.auditId, params.baseUrl);
    fullText = `${params.shareText}\n${deepLink}`.trim();
  } else {
    fullText = formatWhatsAppShareMessage({
      mode: params.mode || 'peer',
      auditId: params.auditId,
      baseUrl: params.baseUrl,
    });
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`;
}

export function formatCommunityPost(params: {
  auditId: string;
  baseUrl?: string;
}): {
  headline: string;
  body: string;
  deepLink: string;
  fullPost: string;
} {
  const headline = ACQUISITION_COPY.COMMUNITY_POST_HEADLINE || '';
  const body = ACQUISITION_COPY.COMMUNITY_POST_BODY || '';
  const deepLink = buildAuditDeepLink(params.auditId, params.baseUrl);
  const fullPost = `${headline}\n\n${body}\n\n${deepLink}`.trim();
  return { headline, body, deepLink, fullPost };
}

export function getOutboundHookForAudit(params: {
  auditResult?: { dimensions?: Array<{ key: string; status: string }> } | null;
  auditId?: string;
  baseUrl?: string;
}): OutboundHookResult {
  const dims = params.auditResult?.dimensions || [];
  const hasFail = (key: string) => dims.some((d) => d.key === key && d.status === 'fail');

  let hookToken = 'OUTBOUND_HOOK_GENERAL';
  let failingDimension: 'categories' | 'hours' | 'photos' | null = null;

  if (hasFail('categories')) {
    hookToken = 'OUTBOUND_HOOK_CATEGORIES';
    failingDimension = 'categories';
  } else if (hasFail('hours')) {
    hookToken = 'OUTBOUND_HOOK_HOURS';
    failingDimension = 'hours';
  } else if (hasFail('photos')) {
    hookToken = 'OUTBOUND_HOOK_PHOTOS';
    failingDimension = 'photos';
  }

  const hookText = ACQUISITION_COPY[hookToken] || ACQUISITION_COPY.OUTBOUND_HOOK_GENERAL || '';
  const followupText = ACQUISITION_COPY.OUTBOUND_FOLLOWUP || '';
  const deepLink = params.auditId ? buildAuditDeepLink(params.auditId, params.baseUrl) : '';

  const fullMessage = deepLink ? `${hookText}\n${deepLink}`.trim() : hookText.trim();
  const fullFollowupMessage = deepLink ? `${followupText}\n${deepLink}`.trim() : followupText.trim();

  return {
    hookToken,
    hookText,
    followupText,
    fullMessage,
    fullFollowupMessage,
    failingDimension,
  };
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
