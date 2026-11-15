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
import { callSiteCopyJSON } from '../ai/workloadJson';
import { CORE_THIRTY_VOICE_EXAMPLE_JSON } from './coreThirtyVoiceExample.generated';

/** Hard cap on metaDescription (Fable 5.2 D3b): stated in both prompts and enforced in code after parsing. */
export const META_DESCRIPTION_MAX_CHARS = 155;

/**
 * Fable 5.2 D3b rules shared by the write (Tamar) and QA (Noa) prompts. English only and abstract — no Hebrew
 * example lines (rule examples leak into output); the only Hebrew is the generated voice example below.
 */
export const D3B_FACT_RULES: readonly string[] = [
  '- NO INVENTED OFFER (binding): never name equipment, a tool, a vehicle, a service, a method or a guarantee/warranty that BUSINESS DATA does not state. If BUSINESS DATA does not name it, it does not exist for this page.',
  '- NO GEOGRAPHY BEYOND THE INPUT (binding): the only places you may name are the page city and places written in BUSINESS DATA. Never name a neighbourhood, district, street, landmark, region or nearby city that BUSINESS DATA does not list, and never describe how places relate to each other (which borders which, which belongs to which).',
];

export const D3B_TYPOGRAPHY_RULE =
  '- DASHES (binding): use only the em-dash (\u2014), with exactly one space on each side. Never an en-dash (\u2013) anywhere; a number range uses a plain hyphen.';

export const D3B_CTA_RULE =
  '- CTA MATCHES THE REAL ACTION (binding): the page\'s only action is a lead form (name + phone). ctaLabel is that form\'s submit button, and after submitting, the business calls the reader back. ctaLabel must say the reader sends his details / asks for a call back; formHeadline must lead into filling the form. Never wording that promises an immediate call, a live conversation, a chat or WhatsApp, or "talk to me now" — the button does not do that.';

export const D3B_REGISTER_RULE =
  '- NO BROCHURE REGISTER (binding): write the way the owner talks to one customer on the phone, not a pamphlet or an ad. No slogan lines, no stacked adjectives, no "solutions" vocabulary, no rhetorical marketing questions. Never end the narrative or an answer on a generic closing (the equivalents of "don\'t hesitate to contact us", "we are here for you", "contact us today", "we will be happy to help"); end on a concrete fact or the reader\'s situation.';

/** D3b gate round 1 (Noa, 2026-11-15) rules g-k, shared by the write and QA prompts. English, abstract. */
export const D3C_RULES: readonly string[] = [
  '- NO INVENTED CUSTOMERS OR SETTINGS (binding): never name a customer type or setting (home, apartment, business, office, building, commercial, residential, and the like) unless BUSINESS DATA names it. Say what he fixes, not for whom or where, when the data does not say.',
  '- NO SPEED LANGUAGE WITHOUT A RESPONSE TIME (binding): when Response Time in BUSINESS DATA is empty, write no speed or waiting-time language at all, even without a number (the equivalents of "fast", "quick", "right away", "without delays", "no waiting", "on the spot", "immediately"). When it is set, state only that response time, in the owner\'s terms.',
  '- ONE VOICE PER PAGE (binding): pick one grammatical person for the business and keep it in every field. Never mix "we" and "I" on a page. Every FAQ answer matches the person the question addresses.',
  '- NO INTERNAL LABELS (binding): never output an internal field name, field value or system label as copy (for example the Service Model value rendered as "field service", or a label such as "service area" / "core page"). formHeadline and ctaLabel are each an imperative or a question addressed to the reader, never a verbal-noun (action-noun) label.',
  '- SEARCH TERMS ONCE IN THE BODY (binding): each service name from BUSINESS DATA (the page service and every Secondary Service) appears verbatim at most once in the body copy, that is every field except pageHeadline and metaDescription. Everywhere else refer to the work the way the owner would say it on the phone. Never paste the service list as a sentence, and never list the services in more than one field.',
  '- NO STIFF FILLERS (binding): never use the formal preposition that means "for" / "on behalf of" as a calque of English "for"; never the bureaucratic "gives a response/answer to" phrasing for handling something; never an adverbial "in a proper / orderly / thorough manner" construction; never an impersonal "the work is carried out / focuses on" construction (say who does what, as "I"). Open the narrative with the customer\'s problem, never with a verbless fragment that lists services. Every verb must fit its object (a fault is located, a repair is done; never "locate a repair").',
  '- PHRASE ECONOMY (binding): the same arrival phrase (how or where he comes to the reader) may appear in at most two fields of the page; say it once well instead of in every field. Prefer a plain verb over a word that reads two ways when written without vowel points.',
];

/** Rule i, resolved per business: a field business is one owner, who speaks as "I". */
export function voiceRuleFor(data: CollectedData): string {
  return !data.serviceModel || data.serviceModel === 'field'
    ? '- VOICE FOR THIS BUSINESS (binding): this is a one-owner field business. The owner speaks in the first person singular ("I") in every field; never "we", "us", "our" or a plural verb for the business. FAQ answers to a question addressed in the plural still answer as "I".'
    : '- VOICE FOR THIS BUSINESS (binding): keep the single grammatical person you choose for the business in every field; never mix "we" and "I".';
}

export interface CoreThirtyPageCopy {
  pageHeadline: string; // H1. Max 60 chars. Must contain node.service and node.city exactly (pageHeadlineAnchorProblems).
  narrative: string; // 3-5 sentences, grounded in real onboarding facts. Max 500 chars.
  faqItems: { q: string; a: string }[]; // 3-4 items, genuinely distinct per (service, city) — not the site-wide FAQ repeated.
  metaDescription: string; // <= 155 chars (META_DESCRIPTION_MAX_CHARS, enforced by finalizeCoreThirtyCopy), differentiated per page (must reference both service and city).
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
- H1 ANCHOR (binding, checked by the system): pageHeadline MUST contain the exact service term
  "${node.service}" and the exact city term "${node.city}", each character for character as written
  here (a Hebrew prefix letter attached in front is fine; never change, shorten, swap or inflect the
  term itself). A pageHeadline missing either term is rejected and rewritten. pageHeadline is a headline
  for a reader, never a label or a category name.
- metaDescription MUST contain the literal service term ("${node.service}") and the literal city term
  ("${node.city}") verbatim or in a natural Hebrew grammatical inflection of them — a strict local-SEO
  relevance requirement, not a style preference.
- The "at most once" search-term rule below covers the body only; it never applies to pageHeadline or
  metaDescription, which always carry the anchor terms.
- faqItems and metaDescription must be UNIQUE to this exact (service, city) pair — never content
  that could be pasted onto a different city page in this same node set with zero changes.
${D3B_FACT_RULES.join('\n')}
${D3B_TYPOGRAPHY_RULE}
${D3B_CTA_RULE}
${D3B_REGISTER_RULE}
${D3C_RULES.join('\n')}
${voiceRuleFor(data)}
- metaDescription is at most ${META_DESCRIPTION_MAX_CHARS} characters, counted with spaces (hard cap — the system cuts
  anything longer at a word boundary, so a longer one loses its ending).

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
- pageHeadline: H1. Contains "${node.service}" and "${node.city}" exactly (see H1 ANCHOR),
  not a generic phrase. Max 60 chars.
- narrative: 3-5 sentences. This is the page's main body — grounded in the real onboarding facts
  from BUSINESS DATA below (USP, years, guarantee, review, exclusions, etc.), framed around
  "${node.service}" in "${node.city}" per the locationType honesty rules above. Max 500 chars.
- faqItems: 3-4 items. Real pre-call questions a reader in "${node.city}" considering
  "${node.service}" would actually ask — pull from FAQ Questions below where relevant, adapted and
  made specific to this page, plus locationType-appropriate questions (e.g. area coverage /
  response time for service-area, or travel/location questions for fixed-location or hybrid).
  Each answer: 1-2 full natural sentences, specific, max 120 chars.
- metaDescription: 130-${META_DESCRIPTION_MAX_CHARS} chars, never more than ${META_DESCRIPTION_MAX_CHARS}. Must reference both "${node.service}" and "${node.city}"
  explicitly, and must be textually different from what you would write for any other city or
  service in this business's set — pull in one concrete differentiating fact if space allows.
- localRelevanceNote: exactly 1 sentence, following the locationType-specific framing instructed
  above. This is surfaced on-page near the CTA, not hidden — it is the page's honesty anchor.
- formHeadline: the lead-form section's headline, surfaced right above the CTA button. Urgency-aware
  framing tied to "${node.service}" in "${node.city}". Max 35 chars.
- ctaLabel: the CTA button label itself (e.g. an equivalent of "Send details now" in Hebrew). Max 15
  chars. It is the lead form's submit button (see CTA MATCHES THE REAL ACTION).

VOICE EXAMPLE (register and rhythm ONLY): the JSON below is a page written for a DIFFERENT business, trade
and city. Match its plain spoken register, its concrete problem-first opening and its short sentences. Never
copy any of its facts, services, equipment, places, numbers or phrases — every fact on your page comes from
BUSINESS DATA only, and the geography rule above applies to it too. The example speaks as "we"; your page
follows VOICE FOR THIS BUSINESS above, not the example's grammatical person.
${CORE_THIRTY_VOICE_EXAMPLE_JSON}

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
export function buildCoreThirtyNoaPrompt(node?: CoreThirtyNode, data?: CollectedData): string {
  const source = node && data ? `

SOURCE FACTS (the only facts and places this page may use — check rules 9-10 and 15-16 against them):
Page service: ${node.service}
Page city: ${node.city}
Service Model: ${data.serviceModel || ''}
Target Location (general): ${data.targetLocation || ''}
Specific Cities: ${data.specificCities || ''}
Street Address: ${data.streetAddress || ''}
USP: ${data.usp || ''}
Guarantee: ${data.guarantee || ''}
License: ${data.license || ''}
Secondary Services: ${data.secondaryServices || ''}
Response Time: ${data.responseTime || ''}
Pricing Notes: ${data.pricingNotes || ''}
Exclusions: ${data.exclusions || ''}
FAQ Questions: ${data.faqQuestions || ''}` : '';
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
   ellipsis if present. "pageHeadline" is the page's SEO anchor: never remove, shorten, swap or inflect
   the page service or the page city in it (both in SOURCE FACTS), and never apply rule 20 to it
8. "localRelevanceNote" must remain a single honest sentence -- do not let it drift into a
   storefront-implying claim; if it already avoids that, leave its substance untouched
9. Equipment, tools, vehicles, services, methods or guarantees not stated in SOURCE FACTS -> delete that
   clause (or the sentence, if nothing true is left); never replace it with a new claim
10. A neighbourhood, district, street, landmark, region or city not in SOURCE FACTS (other than the page
   city), or any claim about how places relate to each other -> delete it; never add a place
11. Every en-dash (\u2013) -> em-dash (\u2014) with one space each side; a number range -> plain hyphen
12. "metaDescription" longer than ${META_DESCRIPTION_MAX_CHARS} characters -> shorten it by cutting a whole idea, never
   mid-word, keeping the service and the city in it
13. "ctaLabel" or "formHeadline" promising an immediate call, a live conversation, a chat or WhatsApp ->
   rephrase as sending details / asking for a call back (the button submits a lead form)
14. Brochure or ad register, slogan lines, or a generic closing line (contact us / we're here for you
   / don't hesitate) -> remove the closing line or rewrite the sentence as plain spoken fact
15. A customer type or setting (home, apartment, business, office, building, commercial, residential)
   not named in SOURCE FACTS -> delete it
16. Speed or waiting-time language (fast, quick, right away, without delays, no waiting, immediately)
   while Response Time in SOURCE FACTS is empty -> delete it
17. Mixed "we" and "I" on the page -> one voice throughout; when Service Model is "field" or empty
   (a one-owner business) that voice is first person singular "I"; FAQ answers match the question
18. An internal field name, field value or system label as copy (e.g. the Service Model value as
   "field service") -> delete it; "formHeadline" or "ctaLabel" written as a verbal-noun label ->
   rewrite it as an imperative or a question to the reader
19. The same arrival phrase in more than two fields -> keep it in at most two; a word that reads two
   ways without vowel points -> a plain verb
20. A service name (page service or a Secondary Service in SOURCE FACTS) repeated verbatim more than once
   across the body (every field except "pageHeadline" and "metaDescription"), or the service list pasted
   as a sentence in more than one field -> keep one verbatim mention, rephrase the rest the way the owner
   would say it
21. Stiff fillers -> plain spoken Hebrew: the formal preposition meaning "for" used as an English calque;
   "gives a response/answer to" phrasing; "in a proper / orderly / thorough manner" adverbials; an
   impersonal "the work is carried out / focuses on"; a narrative that opens with a verbless list of
   services (open with the customer's problem instead); a verb that does not fit its object

Rules 2 and 3 apply ONLY inside Hebrew text content (JSON string values). Never alter the JSON
structural characters themselves -- every property name and every string value must remain
wrapped in exactly one pair of standard ASCII double quotes ("). The result must be syntactically
valid JSON, parseable by JSON.parse.

Return: corrected JSON object only. No prose.${source}`;
}

/** Any en-dash -> single-spaced em-dash (a digit range -> hyphen); em-dash spacing normalised to one space each side. */
export function normalizeDashes(value: string): string {
  return value
    .replace(/(\d)\s*\u2013\s*(?=\d)/g, '$1-')
    .replace(/[ \t\u00A0]*[\u2013\u2014][ \t\u00A0]*/g, ' \u2014 ')
    .replace(/^ \u2014 /, '\u2014 ')
    .replace(/ \u2014 $/, ' \u2014');
}

/**
 * Cuts text to at most `max` characters at the last word boundary, never mid-word; trailing separators left
 * by the cut (comma, colon, dash, pipe) are dropped. Text already within the cap is returned unchanged.
 */
export function capAtWordBoundary(value: string, max: number = META_DESCRIPTION_MAX_CHARS): string {
  const text = value.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max + 1);
  const at = cut.lastIndexOf(' ');
  const head = at > 0 ? cut.slice(0, at) : '';
  return head.replace(/[\s,;:|\u2014\u2013-]+$/u, '');
}

/** Code-side D3b enforcement after parsing: dashes in every string, the metaDescription cap. */
export function finalizeCoreThirtyCopy(copy: CoreThirtyPageCopy): CoreThirtyPageCopy {
  const fix = (v: unknown) => (typeof v === 'string' ? normalizeDashes(v) : v);
  return {
    ...copy,
    pageHeadline: fix(copy.pageHeadline) as string,
    narrative: fix(copy.narrative) as string,
    faqItems: Array.isArray(copy.faqItems) ? copy.faqItems.map(f => ({ ...f, q: fix(f?.q) as string, a: fix(f?.a) as string })) : copy.faqItems,
    metaDescription: typeof copy.metaDescription === 'string' ? capAtWordBoundary(normalizeDashes(copy.metaDescription)) : copy.metaDescription,
    localRelevanceNote: fix(copy.localRelevanceNote) as string,
    formHeadline: fix(copy.formHeadline) as string,
    ctaLabel: fix(copy.ctaLabel) as string,
  };
}

// Same system-prompt convention as generate/route.ts's SITE_COPY_SYSTEM_PROMPT:
// buildCoreThirtyTamarPrompt() is already a complete, self-contained instruction
// set (persona, hard rules, output schema) — this system message only needs to
// tell the model to follow the user message verbatim.
const CORE_THIRTY_COPY_SYSTEM_PROMPT =
  'You are a Hebrew copywriter executing the exact instructions and JSON schema given in the user message. Return only the JSON object described there — no prose, no markdown fences.';

/** H1 anchor check: the node's service and city terms, each verbatim, must be substrings of pageHeadline. */
export function pageHeadlineAnchorProblems(copy: Pick<CoreThirtyPageCopy, 'pageHeadline'> | null | undefined, node: Pick<CoreThirtyNode, 'service' | 'city'>): string[] {
  const headline = typeof copy?.pageHeadline === 'string' ? copy.pageHeadline : '';
  const problems: string[] = [];
  if (!headline.includes(node.service)) problems.push('service');
  if (!headline.includes(node.city)) problems.push('city');
  return problems;
}

export type SiteCopyJsonCall = (system: string, prompt: string, options: Parameters<typeof callSiteCopyJSON>[2]) => Promise<string>;

/**
 * Generates the final QA'd Hebrew copy for one core-30 node — Tamar (write)
 * then Noa (QA), same two-pass pattern as generate/route.ts's POST handler.
 *
 * The write pass gets two attempts; an attempt counts only when it parses AND its pageHeadline carries the node's
 * service and city verbatim (pageHeadlineAnchorProblems). After two failed attempts this throws — there is no
 * deterministic Hebrew fallback at this layer (this file must never author Hebrew literals). If Noa's QA pass drops an
 * anchor term from pageHeadline, the validated write-pass headline is kept.
 */
export async function generateCoreThirtyPageCopy(
  node: CoreThirtyNode,
  data: CollectedData,
  // Default routes through the site_copy provider switch (llmProvider.parity.test.mjs checks this call site).
  call: SiteCopyJsonCall = (system, prompt, options) => callSiteCopyJSON(system, prompt, options)
): Promise<CoreThirtyPageCopy> {
  const tamarPrompt = buildCoreThirtyTamarPrompt(node, data);

  let tamarCopy: CoreThirtyPageCopy | null = null;
  let lastProblem = '';
  for (let attempt = 1; attempt <= 2 && !tamarCopy; attempt++) {
    try {
      const parsed = JSON.parse(await call(CORE_THIRTY_COPY_SYSTEM_PROMPT, tamarPrompt, { thinkingBudget: 1500 })) as CoreThirtyPageCopy;
      const missing = pageHeadlineAnchorProblems(parsed, node);
      if (missing.length === 0) tamarCopy = parsed;
      else lastProblem = `pageHeadline is missing the node ${missing.join(' and ')} term`;
    } catch (e: unknown) {
      lastProblem = `write pass did not return valid JSON (${e instanceof Error ? e.message : String(e)})`;
    }
    if (!tamarCopy) console.warn(`Core-30 Tamar pass attempt ${attempt} rejected for node ${node.id}: ${lastProblem}`);
  }
  if (!tamarCopy) {
    throw new Error(`Core-30 copy for node ${node.id} failed after 2 write attempts: ${lastProblem}`);
  }

  // Noa — QA pass. If it comes back malformed, fall back to Tamar's copy
  // rather than failing the whole generation over a polish step.
  try {
    const noaRaw = await call(buildCoreThirtyNoaPrompt(node, data), JSON.stringify(tamarCopy), {
      think: false,
    });
    const reviewed = finalizeCoreThirtyCopy(JSON.parse(noaRaw) as CoreThirtyPageCopy);
    if (pageHeadlineAnchorProblems(reviewed, node).length > 0) {
      console.warn(`Core-30 Noa QA pass dropped an H1 anchor term for node ${node.id}; keeping the write-pass headline`);
      return { ...reviewed, pageHeadline: finalizeCoreThirtyCopy(tamarCopy).pageHeadline };
    }
    return reviewed;
  } catch (e: unknown) {
    console.warn(`Core-30 Noa QA pass failed for node ${node.id}, using unreviewed Tamar copy:`, e instanceof Error ? e.message : String(e));
    return finalizeCoreThirtyCopy(tamarCopy);
  }
}
