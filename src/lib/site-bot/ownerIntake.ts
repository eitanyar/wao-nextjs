/**
 * Site Bot launch step 1 (execution order row 4, readiness capability 10): the owner's own contact and the domain
 * question of the /site-bot/start intake.
 *
 * - Owner contact = the owner's own mobile (E.164) and email. Receipts, the cancel link, review drafts and the monthly
 *   report go here. It is kept apart from the public business phone (`phone` / `whatsappNumber`) and the public
 *   `email` that the generated legal pages print: an owner's private address must never reach a public page.
 * - Domain choice = has_domain (ownerDomain = the registrable domain, canonical host www.{ownerDomain} once attached
 *   and live, docs/missions/site-bot-shared-worker-hosting-2026-11-12.md), no_domain ({slug}.wao.co.il), or not_sure
 *   (staff follow up). Nothing here talks to Cloudflare; the hosting step reads these fields.
 *
 * Pure and browser-safe (the WHATWG URL parser does the IDN -> punycode step in both the browser and Node).
 * HEBREW-SAFETY: this module contains ZERO Hebrew bytes.
 */

/** Bidi controls, isolates, zero-width characters and BOM: pasted text from an RTL field often carries them. */
const INVISIBLES = /[​-‏‪-‮⁦-⁩﻿]/g;

function clean(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(INVISIBLES, '').trim() : '';
}

// ---------------------------------------------------------------------------------------------------------------
// Mobile

/**
 * An Israeli mobile number in any common typing -> E.164 (`+9725XXXXXXXX`), else null.
 * Accepts 05X-XXX-XXXX, 05XXXXXXXX, +972 5X..., +972 (0)5X..., 00972..., 972..., with spaces, dashes, dots or brackets.
 * Mobile = national number 5 + 8 digits (the 05X ranges). Landlines (02/03/04/08/09) and 07X VoIP are rejected:
 * receipts and the cancel link may go by SMS, so the number must be a mobile.
 */
export function normalizeIsraeliMobile(raw: unknown): string | null {
  const text = clean(raw);
  if (!text) return null;
  if (/[^\d\s+().\-‐-―]/.test(text)) return null;
  let digits = text.replace(/[\s().\-‐-―]/g, '');
  if (digits.indexOf('+') > 0 || (digits.match(/\+/g) ?? []).length > 1) return null;
  if (digits.startsWith('+972')) digits = digits.slice(4);
  else if (digits.startsWith('00972')) digits = digits.slice(5);
  else if (digits.startsWith('+')) return null;
  else if (digits.startsWith('972') && digits.length >= 12) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return /^5\d{8}$/.test(digits) ? `+972${digits}` : null;
}

/** The listing phone when it is a mobile: then the contact step pre-fills it for the owner to confirm or edit. */
export function mobilePrefillFromListing(listingPhone: unknown): string {
  return normalizeIsraeliMobile(listingPhone) ? clean(listingPhone) : '';
}

// ---------------------------------------------------------------------------------------------------------------
// Hostnames (shared by email and domain)

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/** Unicode or ASCII host -> lowercase punycode ASCII, or null when the URL parser rejects it. */
function toAsciiHost(host: string): string | null {
  if (!host || /[\s/\\?#@:%]/.test(host)) return null;
  try {
    const ascii = new URL(`http://${host}`).hostname;
    return ascii || null;
  } catch {
    return null;
  }
}

/** Every label is LDH, 1-63 chars, no edge hyphen; "ab--" is reserved except punycode "xn--"; TLD alphabetic or xn--. */
function hostLabelsValid(host: string): boolean {
  if (host.length > 253) return false;
  const labels = host.split('.');
  if (labels.length < 2) return false;
  for (const label of labels) {
    if (!LABEL.test(label)) return false;
    if (label.slice(2, 4) === '--' && !label.startsWith('xn--')) return false;
  }
  return TLD.test(labels[labels.length - 1]);
}

// ---------------------------------------------------------------------------------------------------------------
// Email

const EMAIL_LOCAL = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;

/**
 * A sane email -> `local@domain` with the domain lowercased and in punycode, else null.
 * Sane = one @, a dot-atom local part of at most 64 chars, a valid multi-label domain, 254 chars in total.
 * The local part keeps its case (it is technically case-sensitive). A leading "mailto:" is dropped.
 */
export function normalizeOwnerEmail(raw: unknown): string | null {
  const text = clean(raw).replace(/^mailto:/i, '');
  if (!text || /\s/.test(text)) return null;
  const at = text.lastIndexOf('@');
  if (at <= 0 || text.indexOf('@') !== at) return null;
  const local = text.slice(0, at);
  if (local.length > 64 || !EMAIL_LOCAL.test(local)) return null;
  const domain = toAsciiHost(text.slice(at + 1).replace(/\.$/, '').toLowerCase());
  if (!domain || !hostLabelsValid(domain)) return null;
  const email = `${local}@${domain}`;
  return email.length <= 254 ? email : null;
}

// ---------------------------------------------------------------------------------------------------------------
// Domain

/**
 * Public suffixes with more than one label that an Israeli small business is likely to own under. The repo has no
 * public-suffix-list package, so this is a reasoned, tested subset: every Israeli second-level zone, plus the common
 * foreign ones. Any other TLD is treated as single-label (example.com, example.co, example.il). A name under a suffix
 * missing here is read as a subdomain and rejected with reason 'subdomain', which fails safe (staff use "not sure").
 * If own-domain volume grows, replace this with the `tldts` package (full PSL).
 */
export const MULTI_LABEL_SUFFIXES: ReadonlySet<string> = new Set([
  // Israel (ISOC-IL second-level zones)
  'co.il', 'org.il', 'net.il', 'ac.il', 'gov.il', 'muni.il', 'idf.il', 'k12.il',
  // Common foreign
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk',
  'com.au', 'net.au', 'org.au',
  'co.nz', 'net.nz', 'org.nz',
  'co.za', 'co.jp', 'co.in', 'co.kr',
  'com.br', 'com.tr', 'com.cy', 'com.mx', 'com.ar', 'com.ua', 'com.cn',
]);

/** WAO's own zone: an owner domain can never be it or under it (that is the no_domain path). */
const RESERVED_DOMAINS: ReadonlySet<string> = new Set(['wao.co.il']);

export type OwnerDomainRejection = 'empty' | 'invalid' | 'subdomain' | 'reserved';
export type OwnerDomainResult = { ok: true; domain: string } | { ok: false; reason: OwnerDomainRejection };

/**
 * What the owner typed -> the registrable domain, lowercase punycode, no scheme / path / port / www.
 * "https://WWW.Example.co.il/about?x=1" -> "example.co.il"; a Unicode (IDN) label -> its "xn--" punycode form.
 * Rejects: empty, garbage, IPs, a bare suffix ("co.il"), an email, a subdomain ("shop.example.co.il",
 * "mybiz.wixsite.com"), and WAO's own zone.
 */
export function normalizeOwnerDomain(raw: unknown): OwnerDomainResult {
  let text = clean(raw).toLowerCase();
  if (!text) return { ok: false, reason: 'empty' };
  text = text.replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/^\/\//, '');
  text = text.split(/[/?#]/)[0];
  if (text.includes('@')) return { ok: false, reason: 'invalid' };
  text = text.replace(/:\d{1,5}$/, '').replace(/\.+$/, '');
  const ascii = toAsciiHost(text);
  if (!ascii) return { ok: false, reason: 'invalid' };
  const host = ascii.replace(/^www\./, '');
  if (!hostLabelsValid(host)) return { ok: false, reason: 'invalid' };
  const labels = host.split('.');
  const lastTwo = labels.slice(-2).join('.');
  const suffixLabels = labels.length >= 2 && MULTI_LABEL_SUFFIXES.has(lastTwo) ? 2 : 1;
  if (labels.length <= suffixLabels) return { ok: false, reason: 'invalid' };
  const registrable = labels.slice(-(suffixLabels + 1)).join('.');
  if (RESERVED_DOMAINS.has(registrable)) return { ok: false, reason: 'reserved' };
  if (labels.length > suffixLabels + 1) return { ok: false, reason: 'subdomain' };
  return { ok: true, domain: registrable };
}

// ---------------------------------------------------------------------------------------------------------------
// The intake record

export type DomainChoice = 'has_domain' | 'no_domain' | 'not_sure';
export const DOMAIN_CHOICES: readonly DomainChoice[] = ['has_domain', 'no_domain', 'not_sure'];

/** The owner's private contact, never rendered on the public site. Both normalised (E.164 / punycode domain). */
export interface OwnerContact {
  mobile: string;
  email: string;
}

/** What the contact and domain steps hand to the intake record (collectedData). */
export interface OwnerIntakeFields {
  ownerContact?: OwnerContact;
  domainChoice?: DomainChoice;
  /** Only with domainChoice 'has_domain': the registrable domain. The canonical host is www.{ownerDomain}. */
  ownerDomain?: string;
}

/** The raw step answers as the form holds them. */
export interface OwnerIntakeAnswers {
  mobile?: string;
  email?: string;
  domainChoice?: DomainChoice;
  domain?: string;
}

/**
 * Raw answers -> the record fields, every value re-normalised. An invalid mobile or email drops ownerContact (the form
 * blocks that case; this is the safety net); has_domain with an invalid domain drops ownerDomain and records not_sure,
 * so staff follow up instead of the hosting step attaching a wrong name.
 */
export function ownerIntakeFields(answers: OwnerIntakeAnswers | undefined): OwnerIntakeFields {
  if (!answers) return {};
  const out: OwnerIntakeFields = {};
  const mobile = normalizeIsraeliMobile(answers.mobile);
  const email = normalizeOwnerEmail(answers.email);
  if (mobile && email) out.ownerContact = { mobile, email };
  const choice = answers.domainChoice;
  if (choice === 'has_domain') {
    const domain = normalizeOwnerDomain(answers.domain);
    if (domain.ok) {
      out.domainChoice = 'has_domain';
      out.ownerDomain = domain.domain;
    } else {
      out.domainChoice = 'not_sure';
    }
  } else if (choice === 'no_domain' || choice === 'not_sure') {
    out.domainChoice = choice;
  }
  return out;
}

/**
 * Server-side: the submitted record with the owner fields re-validated (never trusted from the client). Invalid values
 * are dropped, never repaired into something the owner did not type.
 */
export function withValidatedOwnerIntake<T extends OwnerIntakeFields>(data: T): T {
  const rest: T = { ...data };
  delete rest.ownerContact;
  delete rest.domainChoice;
  delete rest.ownerDomain;
  const contact = data.ownerContact;
  const fields = ownerIntakeFields({
    mobile: typeof contact?.mobile === 'string' ? contact.mobile : undefined,
    email: typeof contact?.email === 'string' ? contact.email : undefined,
    domainChoice: DOMAIN_CHOICES.includes(data.domainChoice as DomainChoice) ? data.domainChoice : undefined,
    domain: data.ownerDomain,
  });
  return { ...rest, ...fields };
}

/**
 * The host the hosting step (row 8) plans for: www.{ownerDomain} for an owner domain, {slug}.wao.co.il without one,
 * null while it is not sure (staff follow up) or the slug is unknown. The planned host is not the live canonical: an
 * owner domain becomes canonical only once attached and live.
 */
export function plannedSiteHost(fields: OwnerIntakeFields, slug: string | undefined): string | null {
  if (fields.domainChoice === 'has_domain' && fields.ownerDomain) return `www.${fields.ownerDomain}`;
  if (fields.domainChoice === 'no_domain' && slug) return `${slug}.wao.co.il`;
  return null;
}
