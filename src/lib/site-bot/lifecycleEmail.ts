/**
 * Renders the Site-Bot lifecycle emails (review kit, cancel confirmation, offline soon) from approved copy templates.
 * Text part: the filled templates, blocks separated by a blank line. HTML part: RTL, each block split into paragraphs on
 * blank lines and `<br>` on single newlines; every interpolated value is HTML-escaped and bidi-isolated (`<bdi>`), URLs
 * and dates LTR, link variables rendered as anchors. Zero Hebrew in this module.
 */
import { escapeHtml } from './clientMessageEmail';

export interface EmailBlock {
  template: string;
  /** Rendered as a quoted block (the ready message the owner forwards). */
  quote?: boolean;
}

const PLACEHOLDER = /\{([A-Za-z0-9_]+)\}/g;
const RTL = 'dir="rtl" style="direction:rtl;text-align:right"';

/** Replaces {name} placeholders; throws on a placeholder with no value so a template never ships half-filled. */
export function fillCopy(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    if (!Object.hasOwn(values, name)) throw new Error(`fillCopy: missing value for {${name}}`);
    return values[name];
  });
}

function htmlValue(name: string, value: string, linkKeys: ReadonlySet<string>, ltrKeys: ReadonlySet<string>): string {
  const escaped = escapeHtml(value);
  if (linkKeys.has(name)) return `<bdi dir="ltr" style="unicode-bidi:isolate"><a href="${escaped}">${escaped}</a></bdi>`;
  if (ltrKeys.has(name)) return `<bdi dir="ltr" style="unicode-bidi:isolate">${escaped}</bdi>`;
  return `<bdi style="unicode-bidi:isolate">${escaped}</bdi>`;
}

function fillHtml(template: string, values: Readonly<Record<string, string>>, linkKeys: ReadonlySet<string>, ltrKeys: ReadonlySet<string>): string {
  fillCopy(template, values); // same missing-value check as the text part
  return template
    .split(/(\{[A-Za-z0-9_]+\})/)
    .map((part) => {
      const name = /^\{([A-Za-z0-9_]+)\}$/.exec(part)?.[1];
      return name ? htmlValue(name, values[name], linkKeys, ltrKeys) : escapeHtml(part).replace(/\n/g, '<br>');
    })
    .join('');
}

export function renderLifecycleEmail(
  blocks: readonly EmailBlock[],
  values: Readonly<Record<string, string>>,
  options: { linkKeys?: readonly string[]; ltrKeys?: readonly string[] } = {}
): { text: string; html: string } {
  const linkKeys = new Set(options.linkKeys ?? []);
  const ltrKeys = new Set(options.ltrKeys ?? []);
  const text = blocks.map((block) => fillCopy(block.template, values)).join('\n\n');
  const body = blocks
    .map((block) => {
      const paragraphs = block.template
        .split(/\n{2,}/)
        .filter((p) => p.trim() !== '')
        .map((p) => `<p ${RTL}>${fillHtml(p, values, linkKeys, ltrKeys)}</p>`)
        .join('');
      return block.quote
        ? `<blockquote ${RTL.replace('style="', 'style="border-inline-start:3px solid #ccc;margin:0;padding-inline-start:12px;')}>${paragraphs}</blockquote>`
        : paragraphs;
    })
    .join('');
  return { text, html: `<div lang="he" ${RTL}>${body}</div>` };
}
