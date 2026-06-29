// Tamar's LP copy prompt — MEDIUM effort, structured template.
// Input: CollectedData. Output: LPCopy JSON. No prose exploration allowed.

import type { CollectedData } from '@/lib/bot/prompts';

export interface LPCopyFAQItem {
  q: string;
  a: string;
}

export interface LPCopy {
  heroHeadline: string;          // Pain/fear hook. Max 55 chars. Active, not passive.
  heroSubheadline: string;       // USP + guarantee promise. Max 90 chars.
  heroCta: string;               // Primary button label. Max 15 chars.
  trustBarItems: string[];       // 3-4 items. Each max 20 chars. (e.g. "15 שנות ניסיון")
  aboutBlurb: string;            // 2 sentences max. ownerName + yearsInField + personality.
  servicesHeadline: string;      // Section headline. Max 35 chars.
  serviceItems: string[];        // 4-6 items. Each item: short label (max 25 chars).
  faqHeadline: string;           // Section headline. Max 30 chars.
  faqItems: LPCopyFAQItem[];    // 2-3 items. a: max 60 chars.
  guaranteeBlock: string;        // 1-2 sentences. Max 80 chars total.
  reviewFeatured: string;        // EXACT text from reviewQuote field. No edits.
  reviewContext: string;         // e.g. "4.9 כוכבים | 64 ביקורות בגוגל"
  responseTimeBadge: string | null;  // e.g. "מגיע תוך 20 דקות" — null if not applicable
  scarcityLine: string | null;   // e.g. "נותרו 3 תאריכים פנויים" — null if not applicable
  formHeadline: string;          // Max 35 chars. Urgency-aware.
  stickyBarLine: string;         // Max 25 chars. Above sticky CTA buttons.
}

export function buildLpCopyPrompt(data: CollectedData): string {
  const contactLabel = data.contactMethod?.includes('וואטסאפ')
    ? 'שלח וואטסאפ'
    : data.contactMethod?.includes('טופס')
    ? 'השאר פרטים'
    : 'התקשר עכשיו';

  return `You are Tamar, WAO's Sabra conversion copywriter.
Write LP copy for a Hebrew RTL landing page. Output ONLY valid JSON matching the LPCopy interface. No prose, no explanation.

HARD RULES:
- Hebrew only. Singular male address (אתה). No translated-Hebrew calques.
- heroHeadline: start with the fear/pain, end with the promise. MAX 55 chars.
- reviewFeatured: copy EXACTLY from the Review Quote field below — do not rephrase.
- All lengths are HARD maximums. Exceeding them breaks the layout.
- Tone: warm Sabra expert. Not salesy. Not formal.

BUSINESS DATA:
Niche: ${data.businessNiche || ''}
Business Name: ${data.businessName || ''}
Owner Name: ${data.ownerName || ''}
Location: ${data.targetLocation || ''}
Service Model: ${data.serviceModel || ''}
Ideal Client Fear: ${data.idealClientFear || ''}
USP: ${data.usp || ''}
Years in Field: ${data.yearsInField || ''}
Guarantee: ${data.guarantee || ''}
License: ${data.license || 'לא'}
Secondary Services: ${data.secondaryServices || ''}
FAQ Questions: ${data.faqQuestions || ''}
Urgency Level: ${data.urgencyLevel || ''}
Response Time: ${data.responseTime || ''}
Revenue Model: ${data.revenueModel || ''}
Pricing Notes: ${data.pricingNotes || ''}
Exclusions: ${data.exclusions || ''}
Review Quote: ${data.reviewQuote || ''}
Star Rating: ${data.starRating || ''}
Capacity Unit: ${data.capacityUnit || ''}
Contact Method: ${data.contactMethod || ''}
Primary CTA label to use: "${contactLabel}"

OUTPUT SCHEMA (JSON, no markdown):
{
  "heroHeadline": "",
  "heroSubheadline": "",
  "heroCta": "${contactLabel}",
  "trustBarItems": ["", "", "", ""],
  "aboutBlurb": "",
  "servicesHeadline": "",
  "serviceItems": ["", "", "", ""],
  "faqHeadline": "",
  "faqItems": [{"q": "", "a": ""}],
  "guaranteeBlock": "",
  "reviewFeatured": "${data.reviewQuote || ''}",
  "reviewContext": "${data.starRating ? `${data.starRating} כוכבים בגוגל` : ''}",
  "responseTimeBadge": ${data.responseTime ? `"${data.responseTime}"` : 'null'},
  "scarcityLine": null,
  "formHeadline": "",
  "stickyBarLine": ""
}`;
}
