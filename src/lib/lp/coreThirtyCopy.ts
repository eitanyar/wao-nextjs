// Tamar's Core-30 per-node page copy prompt (VISION.md locked strategy,
// 2026-08-21) — the layer directly above coreThirty.ts's node list.
//
// This builds Hebrew copy for ONE (service x city) node at a time. No HTML
// rendering, no route wiring — those are separate, later layers.
//
// Why this exists (Gate 1, binding — Yonatan, seo-strategist, 2026-08-21):
// Google's June 2026 spam update targets templated city/service doorway
// pages — exactly what naive {service}x{city} string substitution produces.
// Every prompt built here therefore demands genuine per-page narrative
// grounded in the owner's real onboarding facts, a distinct FAQ per page
// (not a shared block), differentiated meta-description logic, and an
// honest physical/service-area framing per node (the locationType
// conditional below) — never an implied storefront in a city with no fixed
// base.
//
// Convention (mirrors lpCopyPrompt.ts): all instructions to the model are
// English prose. Hebrew only enters as injected runtime field values from
// CollectedData / CoreThirtyNode (data.usp, node.city, etc.) — never as
// Hebrew text authored in this file.

import type { CollectedData } from '../bot/prompts';
import type { CoreThirtyNode } from './coreThirty';
import { callQwenJSON } from '../ai/qwen-fast';

export interface CoreThirtyPageCopy {
  pageHeadline: string; // H1. Max 60 chars. Names service + city, not generic.
  narrative: string; // 3-5 sentences, grounded in real onboarding facts. Max 500 chars.
  faqItems: { q: string; a: string }[]; // 3-4 items, genuinely distinct per (service, city) — not the site-wide FAQ repeated.
  metaDescription: string; // 150-160 chars, differentiated per page (must reference both service and city).
  localRelevanceNote: string; // 1 sentence: the honest locationType-appropriate framing, surfaced on-page near the CTA.
  formHeadline: string; // Max 35 chars. Urgency-aware framing near the CTA — same intent as SiteCopy.formHeadline.
  ctaLabel: string; // Max 15 chars. The button label — same intent as SiteCopy.heroCta.
}

// Section 3 — the locationType honesty conditional. This is a strategist
// decision (VISION.md Gate 1), not the coder's judgment call: implemented
// exactly as specified, one branch per coreThirty.ts's LocationType.
function buildLocationTypeInstructions(node: CoreThirtyNode, data: CollectedData): string {
  switch (node.locationType) {
    case 'service-area':
      return `
LOCATION-TYPE HONESTY — service-area (field/van trade, e.g. plumber/electrician class):
This business has NO physical office, storefront, or fixed location in "${node.city}" — it is a
field-service trade that travels to the client. You MUST NEVER claim, state, or imply a physical
presence, branch, office, or storefront in "${node.city}". Do not write anything equivalent to
"our branch/office/location in ${node.city}" or invite the reader to "visit us in ${node.city}" —
there is nothing to visit there. The only honest and correct framing is that the business TRAVELS
TO / SERVES "${node.city}" as part of its coverage area. If Response Time is set in BUSINESS DATA
below, use it as the concrete local-relevance fact for this specific city (the real number, not a
vague "fast service" claim). If no response time is set, use a genuine service-radius or coverage
fact instead — never invent a number that was not provided.
localRelevanceNote for this node must read, in spirit, like an honest "we also come out to
${node.city}" statement anchored by that one concrete response-time or coverage fact — it must
NEVER read like a storefront-implying phrase (no "branch", "office", or "location" language tied
to ${node.city}).`;
    case 'fixed-location':
      return `
LOCATION-TYPE HONESTY — fixed-location (storefront/studio, e.g. tutoring/salon class):
This business has exactly ONE real physical location.${
        data.streetAddress
          ? ` The Street Address field below ("${data.streetAddress}") is that one real address —
treat it as the only place this business physically exists.`
          : ` No Street Address is on file — treat the physical location as real but unconfirmed in
its exact address; do not invent a street address that was not provided.`
      }
This page's city, "${node.city}", is the page's SEO anchor, not necessarily the real location's
city. Unless BUSINESS DATA below makes clear that "${node.city}" IS the real location's own city,
you MUST NOT claim a second physical presence, branch, or storefront in "${node.city}" — that
would be a fabricated second location. The honest and correct framing for a page whose city is not
the real location's city: clients FROM "${node.city}" travel TO the one real location — e.g. an
honest "clients from ${node.city} come to us" framing, or a travel-distance/invite framing. NEVER
imply a local storefront exists in "${node.city}" itself.
localRelevanceNote for this node must reflect this honest invite-them-to-the-real-location framing
— never a fabricated local presence in "${node.city}".`;
    case 'hybrid':
      return `
LOCATION-TYPE HONESTY — hybrid (fixed base + on-location work, e.g. photographer class):
This business offers BOTH a fixed base (a studio/location where clients can come) AND on-location
work that travels to serve "${node.city}". You MUST explicitly present BOTH options on this page
wherever relevant — studio sessions at the fixed base, AND on-location sessions serving
"${node.city}" — never collapse the page down to only one of the two options. Do not silently drop
the studio option just because the page anchors on "${node.city}", and do not silently drop the
on-location option either; a reader from "${node.city}" needs to understand they can choose
either path.
localRelevanceNote for this node must name BOTH the studio option and the on-location option
serving "${node.city}" — not just one of them.`;
  }
}

/**
 * Builds Tamar's Hebrew-copy generation prompt for ONE core-30 node.
 * Pure function — no I/O, no LLM call. Mirrors buildLpCopyPrompt's rigor
 * (anti-generic mandate, verbatim-facts mechanism, banned-phrase discipline)
 * but scoped to a single (service x city) page instead of a whole site, plus
 * the locationType honesty conditional this product's Gate 1 requires.
 */
export function buildCoreThirtyTamarPrompt(node: CoreThirtyNode, data: CollectedData): string {
  const ownerFirstName = (data.ownerName || data.businessName || '').split(/[\s,]/)[0];

  return `You are Tamar, WAO's Sabra conversion copywriter.
Write ONE local-SEO landing page's copy in Hebrew RTL for a single (service x city) node of a
local-business "core-30" page set. Output ONLY valid JSON. No prose, no explanation.

PAGE ANCHOR (this page's SEO frame — every field below must be built around this exact pair):
Service for this page: "${node.service}"
City for this page: "${node.city}"

HARD RULES:
- Hebrew only. Singular male address (the reader is addressed as "you", masculine singular — never
  plural, never feminine). No translated-Hebrew calques (avoid stiff formal connector words a
  native speaker would not use in speech — e.g. the equivalents of "in order to", "how", "in the
  event that", "however", "what is", "one can" — prefer plain direct spoken phrasing instead).
- pageHeadline and metaDescription MUST each contain the literal service term ("${node.service}")
  and the literal city term ("${node.city}") verbatim or in a natural Hebrew grammatical inflection
  of them — this is a strict local-SEO relevance requirement, not a style preference.
- faqItems and metaDescription must be UNIQUE to this exact (service, city) pair — never content
  that could be pasted onto a different city page in this same node set with zero changes.

ANTI-GENERIC MANDATE (Eitan's hard mandate — this is exactly the failure mode Google's spam
filters target — VISION.md Gate 1, seo-strategist sign-off, binding):
A page that reads like a template with the service and city names swapped in is a doorway page,
not a real page — it will be penalized, not ranked. This page must feel like it was written by
someone who actually knows this specific owner's business, framed for this specific city.

THE CORE MECHANISM — use the owner's real words and real numbers, not safe paraphrases:
- BUSINESS DATA below contains the owner's own concrete details from onboarding: real numbers,
  named services, his actual guarantee, his years in the field, his real review, his real response
  time. USE THEM VERBATIM or near-verbatim in the narrative and FAQ. Do not launder them into safe
  generalities.
- A concrete number or named fact ALWAYS outranks a vague adjective. A real years-in-field number
  beats "a lot of experience". A real guarantee length beats "quality work". A real response-time
  figure beats "fast service" or "always available".
- The service ("${node.service}") and city ("${node.city}") are the FRAME the page is built
  around — they are NOT the content itself. The actual content is the concrete owner facts below.
  A sentence whose entire substance is "we provide [service] in [city]" with no other information
  is explicitly FORBIDDEN — every sentence must carry a real fact from BUSINESS DATA.

DIFFERENTIATION MANDATE (this is what makes this page genuinely different from every other node
in this business's core-30 set, not just a find-and-replace of service/city names):
- Do not reuse the same sentence structure, the same opening line, or the same FAQ questions you
  would produce for a different city or a different service for this same business — pick which
  concrete facts to foreground based on what is actually most relevant to THIS service/city
  combination (e.g. if a response-time fact is set, it matters more for an urgent field-service
  page than for a by-appointment studio page).
- faqItems must be genuinely distinct per page: do not just restate the site-wide FAQ Questions
  field as-is — select, phrase, and (where the locationType instructions below require it) frame
  the questions specifically for a reader in "${node.city}" considering "${node.service}".

FALLBACK when a concrete detail is missing:
- Missing/weak USP → build differentiation from the hardest concrete fact available (years,
  guarantee, license, response time). Never fill the gap with an unsupported "professional and
  reliable" style claim.
- Missing/weak review → do not fabricate or pad a testimonial anywhere on this page.
- If BUSINESS DATA genuinely has no concrete detail to support a field, stay specific with what
  IS available rather than inflating with generic corporate filler.

BANNED PATTERNS (Hebrew corporate/translated boilerplate — avoid these CONCEPTS and any close
Hebrew phrasing of them; every one is generic enough that a competitor could paste it unchanged):
unsupported claims of "professional and reliable service" with no backing fact; "we are committed
to excellence"; "the customer is at the center" / "our service starts with you"; "service without
compromise"; "personal attention to every client" stated bare with no concrete mechanism behind
it; "our professional team" with no named person or number; "years of experience" left as a vague
phrase instead of the real number; "a wide range of services" instead of naming them; "unmatched
reliability and professionalism"; "the perfect solution for you"; "full customer satisfaction";
"maximum availability" instead of the real response time; "fair/attractive prices" instead of the
real pricing logic; "welcome to our business"; "we pride ourselves on offering"; "innovation and
excellence". If you catch yourself about to write the Hebrew equivalent of any of these, stop and
replace it with a concrete fact from BUSINESS DATA instead.

${buildLocationTypeInstructions(node, data)}

FIELDS:
- pageHeadline: H1. Names "${node.service}" and "${node.city}" (verbatim or natural inflection),
  not a generic phrase. Max 60 chars.
- narrative: 3-5 sentences. This is the page's main body — grounded in the real onboarding facts
  from BUSINESS DATA below (USP, years, guarantee, review, exclusions, etc.), framed around
  "${node.service}" in "${node.city}" per the locationType honesty rules above. Max 500 chars.
- faqItems: 3-4 items. Real pre-call questions a reader in "${node.city}" considering
  "${node.service}" would actually ask — pull from FAQ Questions below where relevant, adapted and
  made specific to this page, plus locationType-appropriate questions (e.g. area coverage /
  response time for service-area, or travel/location questions for fixed-location or hybrid).
  Each answer: 1-2 full natural sentences, specific, max 120 chars.
- metaDescription: 150-160 chars. Must reference both "${node.service}" and "${node.city}"
  explicitly, and must be textually different from what you would write for any other city or
  service in this business's set — pull in one concrete differentiating fact if space allows.
- localRelevanceNote: exactly 1 sentence, following the locationType-specific framing instructed
  above. This is surfaced on-page near the CTA, not hidden — it is the page's honesty anchor.
- formHeadline: the lead-form section's headline, surfaced right above the CTA button. Urgency-aware
  framing tied to "${node.service}" in "${node.city}". Max 35 chars.
- ctaLabel: the CTA button label itself (e.g. an equivalent of "Send details now" in Hebrew). Max 15
  chars.

BUSINESS DATA:
Niche: ${data.businessNiche || ''}
Business Name: ${data.businessName || ''}
Owner Name: ${data.ownerName || ''}
Owner First Name: ${ownerFirstName}
Service Model: ${data.serviceModel || ''}
Target Location (general): ${data.targetLocation || ''}
Street Address (fixed-location only): ${data.streetAddress || ''}
Ideal Client Fear: ${data.idealClientFear || ''}
USP: ${data.usp || ''}
Years in Field: ${data.yearsInField || ''}
Guarantee: ${data.guarantee || ''}
License: ${data.license || ''}
Secondary Services: ${data.secondaryServices || ''}
FAQ Questions: ${data.faqQuestions || ''}
Urgency Level: ${data.urgencyLevel || ''}
Response Time: ${data.responseTime || ''}
Business Hours: ${data.businessHours || ''}
Revenue Model: ${data.revenueModel || ''}
Avg Job Value: ${data.avgJobValue ?? ''}
Pricing Notes: ${data.pricingNotes || ''}
Exclusions: ${data.exclusions || ''}
Review Quote: ${data.reviewQuote || ''}
Star Rating: ${data.starRating || ''}

OUTPUT (JSON only, no markdown):
{
  "pageHeadline": "",
  "narrative": "",
  "faqItems": [{"q": "", "a": ""}, {"q": "", "a": ""}, {"q": "", "a": ""}],
  "metaDescription": "",
  "localRelevanceNote": "",
  "formHeadline": "",
  "ctaLabel": ""
}`;
}

/**
 * Noa's QA pass for core-30 page copy. Mirrors NOA_SITE_QA_PROMPT in
 * generate/route.ts in spirit (same checklist substance), scoped to the
 * CoreThirtyPageCopy JSON shape instead of SiteCopy. No arguments needed —
 * the checklist is fixed.
 */
export function buildCoreThirtyNoaPrompt(): string {
  return `You are Noa, Hebrew language QA editor.
Apply ONLY these corrections to the core-30 page copy JSON you receive. Return corrected JSON only.

Checklist (fix silently — no explanations):
1. Double spaces -> single space
2. Straight quotes (") -> Hebrew gershayim when opening/closing a quote
3. Straight apostrophe (') -> Hebrew geresh in Hebrew words
4. Em-dash without spaces or with double spaces -> em-dash with single space each side
5. Plural or feminine address -> singular male address throughout (applies to every Hebrew string
   field in this JSON, including "ctaLabel" and "formHeadline")
6. Translated-Hebrew calques (stiff formal connector words, or overly digital-sounding directives)
   -> natural spoken Hebrew
7. "pageHeadline" and "formHeadline" must each end in a noun or active verb -- remove a trailing
   ellipsis if present
8. "localRelevanceNote" must remain a single honest sentence -- do not let it drift into a
   storefront-implying claim; if it already avoids that, leave its substance untouched

Rules 2 and 3 apply ONLY inside Hebrew text content (JSON string values). Never alter the JSON
structural characters themselves -- every property name and every string value must remain
wrapped in exactly one pair of standard ASCII double quotes ("). The result must be syntactically
valid JSON, parseable by JSON.parse.

Return: corrected JSON object only. No prose.`;
}

// Same system-prompt convention as generate/route.ts's SITE_COPY_SYSTEM_PROMPT:
// buildCoreThirtyTamarPrompt() is already a complete, self-contained instruction
// set (persona, hard rules, output schema) — this system message only needs to
// tell the model to follow the user message verbatim.
const CORE_THIRTY_COPY_SYSTEM_PROMPT =
  'You are a Hebrew copywriter executing the exact instructions and JSON schema given in the user message. Return only the JSON object described there — no prose, no markdown fences.';

/**
 * Generates the final QA'd Hebrew copy for one core-30 node — Tamar (write)
 * then Noa (QA), same two-pass pattern as generate/route.ts's POST handler.
 *
 * Unlike SiteCopy's route, there is no deterministic Hebrew fallback template
 * at this layer (this file must never author Hebrew literals) — if Tamar's
 * retry also fails to parse, the error propagates to the caller rather than
 * fabricating Hebrew content here.
 */
export async function generateCoreThirtyPageCopy(
  node: CoreThirtyNode,
  data: CollectedData
): Promise<CoreThirtyPageCopy> {
  const tamarPrompt = buildCoreThirtyTamarPrompt(node, data);

  let tamarCopy: CoreThirtyPageCopy;
  try {
    const tamarRaw = await callQwenJSON(CORE_THIRTY_COPY_SYSTEM_PROMPT, tamarPrompt, {
      thinkingBudget: 1500,
    });
    tamarCopy = JSON.parse(tamarRaw) as CoreThirtyPageCopy;
  } catch (e: any) {
    console.warn(`Core-30 Tamar pass failed to parse for node ${node.id}, retrying once:`, e.message);
    // No Hebrew fallback template exists at this layer (see doc comment above)
    // — if this retry also fails, it throws and the caller must handle it.
    const tamarRetryRaw = await callQwenJSON(CORE_THIRTY_COPY_SYSTEM_PROMPT, tamarPrompt, {
      thinkingBudget: 1500,
    });
    tamarCopy = JSON.parse(tamarRetryRaw) as CoreThirtyPageCopy;
  }

  // Noa — QA pass. If it comes back malformed, fall back to Tamar's copy
  // rather than failing the whole generation over a polish step.
  try {
    const noaRaw = await callQwenJSON(buildCoreThirtyNoaPrompt(), JSON.stringify(tamarCopy), {
      think: false,
    });
    return JSON.parse(noaRaw) as CoreThirtyPageCopy;
  } catch (e: any) {
    console.warn(`Core-30 Noa QA pass failed for node ${node.id}, using unreviewed Tamar copy:`, e.message);
    return tamarCopy;
  }
}
