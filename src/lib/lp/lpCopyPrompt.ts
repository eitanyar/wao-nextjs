// Tamar's LP copy prompt — MEDIUM effort, structured template.
// Input: CollectedData. Output: LPCopy JSON. No prose exploration allowed.

import type { CollectedData } from '@/lib/bot/prompts';

export interface LPCopyFAQItem {
  q: string;
  a: string;
}

export interface LPCopy {
  heroHeadline: string;          // Pain/fear hook. Max 68 chars. Active, not passive.
  heroSubheadline: string;       // Specific USP promise. Max 90 chars.
  heroCta: string;               // Primary button label. Max 15 chars.
  trustBarItems: string[];       // 3-4 items. Each max 20 chars. (e.g. "15 שנות ניסיון")
  aboutBlurb: string;            // 3-4 sentences, first-person. Arc: who+credential → approach → promise. Max 320 chars.
  servicesHeadline: string;      // Section headline. Max 35 chars.
  serviceItems: string[];        // 4-6 items. Each item: short label (max 25 chars).
  faqHeadline: string;           // Section headline. Max 30 chars.
  faqItems: LPCopyFAQItem[];    // 4-5 items. Real pre-call questions. a: max 120 chars.
  guaranteeBlock: string;        // 1-2 sentences. Max 100 chars total.
  reviewFeatured: string;        // EXACT text from reviewQuote field. No edits.
  reviewContext: string;         // e.g. "4.9 כוכבים | 64 ביקורות בגוגל"
  responseTimeBadge: string | null;  // e.g. "מגיע תוך 20 דקות" — null if not applicable
  scarcityLine: string | null;   // e.g. "נותרו 3 תאריכים פנויים" — null if not applicable
  formHeadline: string;          // Max 35 chars. Urgency-aware.
  stickyBarLine: string;         // Max 25 chars. Above sticky CTA buttons.
}

// Site Bot — extends LPCopy with the 3 extra pages a 5-page brochure site needs
// (about.html, services.html detail cards). Home page still uses the base LPCopy fields.
export interface SiteCopy extends LPCopy {
  aboutPageHeadline: string;      // H1 for /about.html. Max 50 chars.
  aboutPageBody: string;          // 3-4 sentences expanding aboutBlurb. Max 400 chars.
  serviceDetails: { name: string; description: string }[]; // 4-6 services with descriptions. Each description max 80 chars.
}

export function buildLpCopyPrompt(data: CollectedData): string {
  const contactLabel = data.contactMethod?.includes('וואטסאפ')
    ? 'שלח וואטסאפ'
    : data.contactMethod?.includes('טופס')
    ? 'השאר פרטים'
    : 'התקשר עכשיו';

  const ownerFirstName = (data.ownerName || data.businessName || '').split(/[\s,]/)[0];

  return `You are Tamar, WAO's Sabra conversion copywriter.
Write LP copy for a Hebrew RTL landing page. Output ONLY valid JSON. No prose, no explanation.

HARD RULES:
- Hebrew only. Singular male address (אתה/שלך). No translated-Hebrew calques.
- Never use: על מנת, כיצד, במידה ו, עם זאת, מהו, ניתן ל (prefer: אפשר).
- Tone: warm Sabra expert talking directly to a stressed client. Not salesy. Not corporate.
- reviewFeatured: copy EXACTLY from the Review Quote field — do not rephrase a single word.

ABOUT SECTION (aboutBlurb) — most important field:
- First-person voice. Open with: "שמי ${ownerFirstName}," or "אני ${ownerFirstName},"
- 3-4 sentences. Follow this arc:
  1. Who I am + primary credential (years of experience, license if provided)
  2. How I work — one specific trait that sets me apart (NOT generic "שירות מקצועי")
  3. What the client gets when they call — a concrete, personal promise
  4. A brief human touch or closing hook (optional but preferred)
- If a license number is provided, embed it naturally: "בעל רישיון מספר X"
- Max 320 chars. Zero generic filler phrases like "אנו מחויבים ללקוח" or "שירות מקצועי ואיכותי".

HERO:
- heroHeadline: open with the client's fear/problem, close with the relief. Max 68 chars.
- heroSubheadline: one specific, credible USP. Not a list — one sharp promise. Max 90 chars.

FAQ (faqItems):
- 4-5 items covering what clients actually ask before calling.
- Pick from: pricing transparency, response time, area coverage, warranty/guarantee,
  process after contact, certifications, evening/weekend availability, what's included.
- Answers: 1-2 full natural sentences. Specific, not vague. Max 120 chars each.

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
Primary CTA label: "${contactLabel}"

OUTPUT (JSON only, no markdown):
{
  "heroHeadline": "",
  "heroSubheadline": "",
  "heroCta": "${contactLabel}",
  "trustBarItems": ["", "", "", ""],
  "aboutBlurb": "",
  "servicesHeadline": "",
  "serviceItems": ["", "", "", ""],
  "faqHeadline": "",
  "faqItems": [{"q": "", "a": ""}, {"q": "", "a": ""}, {"q": "", "a": ""}, {"q": "", "a": ""}],
  "guaranteeBlock": "",
  "reviewFeatured": "${data.reviewQuote || ''}",
  "reviewContext": "${data.starRating ? `${data.starRating} כוכבים בגוגל` : ''}",
  "responseTimeBadge": ${data.responseTime ? `"${data.responseTime}"` : 'null'},
  "scarcityLine": null,
  "formHeadline": "",
  "stickyBarLine": ""
}`;
}

// Site Bot — same rules/hard-constraints as buildLpCopyPrompt, plus the 3 extra
// fields needed for standalone about.html / services.html pages.
export function buildSiteCopyPrompt(data: CollectedData): string {
  const basePrompt = buildLpCopyPrompt(data);

  const extraRules = `
ADDITIONAL SITE PAGES (about.html / services.html deep-dive content):
- aboutPageHeadline: H1 for a dedicated About page. Distinct wording from heroHeadline — do not repeat it. Max 50 chars.
- aboutPageBody: 3-4 sentences expanding aboutBlurb with more concrete detail (a specific example, a process step, or a credential not already used). Same first-person voice and hard rules as aboutBlurb. Max 400 chars.
- serviceDetails: 4-6 services. Each has a "name" (short label, aligned with serviceItems where possible) and a "description" (one sentence explaining what's included/what the client gets — specific, not generic). Each description max 80 chars.
`;

  const withRules = basePrompt.replace(
    'OUTPUT (JSON only, no markdown):',
    `${extraRules}\nOUTPUT (JSON only, no markdown):`
  );

  const withFields = withRules.replace(
    /"stickyBarLine": ""\n\}/,
    `"stickyBarLine": "",
  "aboutPageHeadline": "",
  "aboutPageBody": "",
  "serviceDetails": [{"name": "", "description": ""}, {"name": "", "description": ""}, {"name": "", "description": ""}, {"name": "", "description": ""}]
}`
  );

  return withFields;
}
