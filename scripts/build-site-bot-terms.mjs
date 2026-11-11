// Builds src/lib/legal/siteBotTerms.ts from the approved legal source docs/legal/site-bot-terms-of-use.md.
// HEBREW-SAFETY: this script is ASCII-only and never contains Hebrew. Every rendered string is sliced, byte-exact, out
// of the pinned source file; serializeTerms(parseTerms(source)) must reproduce the source exactly or the build fails.
// To change the terms: edit the md (Tamar -> Noa -> lawyer), update SOURCE_SHA256, run `node scripts/build-site-bot-terms.mjs`.
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const SOURCE_SHA256 = '44ec8fc84dfce9e42fd0244e96d3fc425a5f2cbe5f2b835dccd2eade438376e4';
export const SOURCE_URL = new URL('../docs/legal/site-bot-terms-of-use.md', import.meta.url);
export const OUTPUT_URL = new URL('../src/lib/legal/siteBotTerms.ts', import.meta.url);

/** "**a** b" -> [{ text: 'a', bold: true }, { text: ' b' }]. Fails closed on an unbalanced marker or other markup. */
export function parseInline(text) {
  const parts = text.split('**');
  if (parts.length % 2 === 0) throw new Error(`Unbalanced ** in: ${text}`);
  const out = [];
  parts.forEach((part, i) => {
    if (!part) return;
    if (/(\*|`|\]\(|__)/.test(part)) throw new Error(`Unsupported inline markup in: ${part}`);
    out.push(i % 2 === 1 ? { text: part, bold: true } : { text: part });
  });
  if (!out.length) throw new Error('Empty inline text');
  return out;
}

function parseRow(line) {
  if (!line.startsWith('| ') || !line.endsWith(' |')) throw new Error(`Bad table row: ${line}`);
  return line.slice(2, -2).split(' | ').map(cell => {
    if (!cell || cell.includes('|') || cell !== cell.trim()) throw new Error(`Bad table cell in: ${line}`);
    return parseInline(cell);
  });
}

function parseBlocks(lines) {
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === '') {
      blocks.push({ type: 'blank' });
      i++;
    } else if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(parseInline(lines[i++].slice(2)));
      blocks.push({ type: 'ul', items });
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      if (rows.length < 3) throw new Error('Table needs a header, a separator and a row');
      const header = parseRow(rows[0]);
      if (rows[1] !== '|' + header.map(() => '---').join('|') + '|') throw new Error(`Bad table separator: ${rows[1]}`);
      const body = rows.slice(2).map(parseRow);
      if (body.some(row => row.length !== header.length)) throw new Error('Table row width mismatch');
      blocks.push({ type: 'table', header, rows: body });
    } else if (/^#/.test(line) || /^\d+\. /.test(line) || line.startsWith('>') || line.startsWith('* ')) {
      throw new Error(`Unsupported block: ${line}`);
    } else {
      blocks.push({ type: 'p', inlines: parseInline(line) });
      i++;
    }
  }
  return blocks;
}

/** The md source -> { title, intro, sections: [{ id, heading, blocks }] }. Blank lines are kept for the round trip. */
export function parseTerms(source) {
  if (source.includes('\r')) throw new Error('CRLF in source');
  const lines = source.split('\n');
  if (!lines[0].startsWith('# ') || lines[0].length < 3) throw new Error('First line must be the "# " title');
  const title = lines[0].slice(2);
  const starts = [];
  lines.forEach((line, i) => { if (line.startsWith('### ')) starts.push(i); });
  if (!starts.length) throw new Error('No ### sections');
  const intro = parseBlocks(lines.slice(1, starts[0]));
  const sections = starts.map((start, n) => {
    const heading = lines[start].slice(4);
    const num = heading.match(/^(\d+)\. \S/);
    if (!num) throw new Error(`Section heading must start with "N. ": ${heading}`);
    return { id: `section-${num[1]}`, heading, blocks: parseBlocks(lines.slice(start + 1, starts[n + 1] ?? lines.length)) };
  });
  const ids = sections.map(s => s.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate section number');
  return { title, intro, sections };
}

const inlineMd = inlines => inlines.map(s => (s.bold ? `**${s.text}**` : s.text)).join('');
const rowMd = cells => '| ' + cells.map(inlineMd).join(' | ') + ' |';
function blocksMd(blocks) {
  return blocks.flatMap(b => {
    if (b.type === 'blank') return [''];
    if (b.type === 'p') return [inlineMd(b.inlines)];
    if (b.type === 'ul') return b.items.map(item => '- ' + inlineMd(item));
    return [rowMd(b.header), '|' + b.header.map(() => '---').join('|') + '|', ...b.rows.map(rowMd)];
  });
}

/** The inverse of parseTerms: must reproduce the source byte for byte. */
export function serializeTerms(doc) {
  return ['# ' + doc.title, ...blocksMd(doc.intro), ...doc.sections.flatMap(s => ['### ' + s.heading, ...blocksMd(s.blocks)])].join('\n');
}

const stripBlank = blocks => blocks.filter(b => b.type !== 'blank');

export function generateTerms(source) {
  if (createHash('sha256').update(source).digest('hex') !== SOURCE_SHA256) throw new Error('Terms source digest changed');
  const doc = parseTerms(source);
  if (serializeTerms(doc) !== source) throw new Error('Round trip does not reproduce the source');
  const emitted = { title: doc.title, intro: stripBlank(doc.intro), sections: doc.sections.map(s => ({ ...s, blocks: stripBlank(s.blocks) })) };
  return [
    '// AUTO-GENERATED from docs/legal/site-bot-terms-of-use.md (approved legal text). Do not edit by hand;',
    '// run `node scripts/build-site-bot-terms.mjs`. scripts/build-site-bot-terms.test.mjs checks it byte for byte.',
    `// Source SHA256: ${SOURCE_SHA256}`,
    "import type { LegalDoc } from './legalDoc';",
    '',
    `export const SITE_BOT_TERMS: LegalDoc = ${JSON.stringify(emitted, null, 2)};`,
    '',
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUTPUT_URL, generateTerms(fs.readFileSync(SOURCE_URL, 'utf8')), 'utf8');
  console.log('Generated src/lib/legal/siteBotTerms.ts');
}
