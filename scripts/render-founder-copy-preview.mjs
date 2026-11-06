import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUTPUT_ROOT = '/home/eitanya/.local/share/wao/founder-copy-review';
export const DRAFTS = Object.freeze([
  { file: 'docs/copy/site-bot-offer-truth-2026-10-05.md', sha256: 'e8ffe348659ff53fd495c20703f9777afd656cccecc10c2951387e95fdd6df0f', title: 'Site-Bot offer', route: '/site-bot', rows: 27 },
  { file: 'docs/copy/site-bot-contact-bridge-2026-10-06.md', sha256: 'c4772ed012c0d4d588ef2138dda0bf98d3287b26a30911d8c6730caab685843a', title: 'Contact + form success', route: '/contact', rows: 27 },
  { file: 'docs/copy/quick-contact-truth-draft-2026-10-06.md', sha256: 'a5460e03fc0b401af6a05e0a8937d968bd9445d22a2dd84e1b1ca3c431a3eef2', title: 'Quick contact + light-form success', route: '/contact/quick', rows: 8 },
]);
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export function escapeHtml(text) {
  return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

// Pipes inside code spans (including bare OG-title pipes) are payload, not columns.
function tableCells(line) {
  if (!line.startsWith('|') || !line.endsWith('|')) throw new Error('Malformed table boundary');
  const cells = [];
  let value = '', inCode = false;
  for (let i = 1; i < line.length - 1; i++) {
    const char = line[i];
    if (char === '\\' && line[i + 1] === '|') { value += '\\|'; i++; continue; }
    if (char === '`') inCode = !inCode;
    if (char === '|' && !inCode) { cells.push(value.trim()); value = ''; }
    else value += char;
  }
  if (inCode) throw new Error('Unclosed code span');
  cells.push(value.trim());
  return cells;
}

export function extractDraftRows(markdown) {
  const rows = [], seen = new Set();
  let replacementTable = false, section = 'Replacements';
  for (const [index, line] of markdown.split(/\r?\n/).entries()) {
    if (line.startsWith('#')) { replacementTable = false; section = line.replace(/^#+\s*/, '').split(/[^\x20-\x7e]/)[0].trim(); }
    if (!line.startsWith('|')) continue;
    const cells = tableCells(line);
    if (cells[0] === 'Key') {
      if (cells.length !== 4 || cells[1] !== 'Source' || !cells[3].startsWith('Replacement')) throw new Error('Unexpected replacement header');
      replacementTable = true;
      continue;
    }
    if (!replacementTable) continue;
    if (cells.length !== 4) throw new Error(`Malformed replacement table at line ${index + 1}`);
    if (cells.every(cell => /^-+$/.test(cell))) continue;
    const keyMatch = cells[0].match(/^`([A-Za-z][A-Za-z0-9.]*)`(?:\s+\*\*SEO-GATED\*\*|\s+\(OPTIONAL, not rendered\))?$/);
    if (!keyMatch) {
      if (cells[0] !== '\u2014') throw new Error(`Ambiguous key at line ${index + 1}`);
      continue;
    }
    const key = keyMatch[1];
    if (seen.has(key)) throw new Error(`Duplicate key ${key}`);
    seen.add(key);
    if (!/^(?:page|ContactForm|LeadFormLight)\.tsx:\d+(?:-\d+)?$/.test(cells[1])) throw new Error(`Invalid source ${key}`);
    // Structural notes can repeat a replacement fragment: never render those repeats.
    const replacement = cells[3].split(/\.? Structural note:/)[0];
    const spans = [...replacement.matchAll(/`([^`]+)`/g)].map(match => match[1]);
    let texts = spans.filter(text => /[\u0590-\u05ff]/.test(text));
    const optional = cells[0].includes('OPTIONAL');
    if (optional) texts = spans;
    if (!texts.length || (key === 'contact.hero.h1' ? texts.length !== 3 : texts.length !== 1)) throw new Error(`Missing or ambiguous replacement ${key}`);
    texts = texts.map(text => text.replace(/\\\|/g, '|'));
    if (texts.some(text => /[\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/.test(text))) throw new Error(`Unsafe control content ${key}`);
    rows.push({ key, source: cells[1], line: index + 1, section, texts, optional,
      seoGated: cells[0].includes('SEO-GATED') || (key.startsWith('siteBot.metadata.')) || key === 'siteBot.hero.h1',
      supplemental: key === 'contactForm.button.submit' || key === 'contactForm.micro.footer' });
  }
  if (!rows.length) throw new Error('No replacement rows');
  return rows;
}

export function loadDrafts(repoRoot = REPO_ROOT) {
  return DRAFTS.map(draft => {
    const bytes = fs.readFileSync(path.join(repoRoot, draft.file));
    const actual = sha256(bytes);
    if (actual !== draft.sha256) throw new Error(`Draft drift: ${draft.file}; actual SHA-256 ${actual}`);
    const rows = extractDraftRows(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (rows.length !== draft.rows) throw new Error(`Row coverage mismatch: ${draft.file}`);
    return { ...draft, rows };
  });
}

export function renderFounderCopyPreview(drafts) {
  const e = escapeHtml;
  const sections = drafts.map((draft, index) => `<section id="draft-${index}"><h2>${e(draft.title)}</h2><p class="label"><bdi dir="ltr">${e(draft.route)}</bdi> &middot; ${draft.rows.length} replacement rows</p><p class="label">Draft: <bdi dir="ltr">${e(draft.file)}</bdi><br>SHA-256: <bdi dir="ltr">${e(draft.sha256)}</bdi></p>${draft.rows.map(row => `<article data-key="${e(row.key)}"><h3><bdi dir="ltr">${e(row.key)}</bdi></h3><p class="label">${e(row.section)}<br>Source: <bdi dir="ltr">${e(row.source)}</bdi> &middot; Draft line ${row.line}</p>${row.seoGated ? '<p class="flag">SEO-GATED &mdash; separate signoff required</p>' : ''}${row.optional ? '<p class="flag">OPTIONAL &mdash; English tags, not rendered on the source page</p>' : ''}${row.supplemental ? '<p class="flag">SUPPLEMENTAL &mdash; strategist scope acceptance required</p>' : ''}${row.texts.map((text, node) => `${row.texts.length > 1 ? `<p class="label">Text node ${node + 1}</p>` : ''}<p class="copy" dir="${row.optional ? 'ltr' : 'rtl'}" lang="${row.optional ? 'en' : 'he'}">${e(text)}</p>`).join('')}</article>`).join('')}</section>`).join('');
  return `<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>WAO founder copy review &mdash; DRAFT</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f5f8;color:#18212f;font-family:Arial,sans-serif;line-height:1.6}main{max-width:900px;margin:auto;padding:24px 16px}header,article{background:white;border:1px solid #d4dce6;border-radius:12px;padding:20px;margin:16px 0}h1{font-size:1.65rem}h2{margin-top:40px;font-size:1.4rem}h3{font-size:1rem;margin:0}h1,h2,h3,p,bdi,a{overflow-wrap:anywhere}bdi{unicode-bidi:isolate}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#114ca0}article{min-width:0}.label{font-size:.85rem;color:#4c5869}.copy{font-size:1.2rem;line-height:1.9;max-width:65ch;white-space:pre-wrap;margin:14px 0 0 auto}.flag{font-size:.85rem;background:#fff2c7;color:#654900;padding:6px 10px;border-radius:6px}.notice{font-weight:bold;color:#8a3100}@media(max-width:400px){main{padding:12px}header,article{padding:14px}.copy{font-size:1.12rem}}
</style></head><body><main><header><h1>Founder copy review</h1><p class="notice">DRAFT &mdash; NOT APPLIED. No release or approval is recorded here.</p><p>This is an inert, passwordless Tailnet review surface, separate from the application. Visiting this page is not authorization. No form, approval endpoint, tracking, or external resources are included.</p><p>To approve or request corrections, reply in this chat with the exact three SHA-256 hashes below and your decision. Founder voice, SEO signoff, source application, and release gates remain open.</p><nav>${drafts.map((draft, index) => `<a href="#draft-${index}">${e(draft.title)}</a>`).join('')}</nav></header>${sections}<footer><p>DRAFT &mdash; NOT APPLIED. Approval is chat-only and hash-bound; no production copy has changed.</p></footer></main></body></html>\n`;
}

export function publishPreview({ repoRoot = REPO_ROOT, outputRoot = OUTPUT_ROOT } = {}) {
  const drafts = loadDrafts(repoRoot); // Complete validation before touching the served version.
  const html = renderFounderCopyPreview(drafts);
  if (fs.existsSync(outputRoot)) {
    if (!fs.lstatSync(outputRoot).isDirectory() || fs.lstatSync(outputRoot).isSymbolicLink()) throw new Error('Unsafe output directory');
    if (fs.readdirSync(outputRoot).some(file => file !== 'index.html')) throw new Error('Output directory contains unrelated files');
    const index = path.join(outputRoot, 'index.html');
    if (fs.readdirSync(outputRoot).includes('index.html') && (!fs.lstatSync(index).isFile() || fs.lstatSync(index).isSymbolicLink())) throw new Error('Unsafe output file');
  }
  fs.mkdirSync(outputRoot, { recursive: true, mode: 0o700 });
  const temporary = path.join(path.dirname(outputRoot), `.founder-copy-review-${process.pid}.html`);
  fs.writeFileSync(temporary, html, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  try { fs.renameSync(temporary, path.join(outputRoot, 'index.html')); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
  return { output: path.join(outputRoot, 'index.html'), htmlSha256: sha256(html), rows: drafts.map(draft => ({ file: draft.file, sha256: draft.sha256, count: draft.rows.length })) };
}

export function createPreviewServer({ outputRoot = OUTPUT_ROOT, expectedHtml = renderFounderCopyPreview(loadDrafts()) } = {}) {
  const index = path.join(outputRoot, 'index.html');
  if (!fs.lstatSync(outputRoot).isDirectory() || fs.lstatSync(outputRoot).isSymbolicLink()
    || !fs.lstatSync(index).isFile() || fs.lstatSync(index).isSymbolicLink()
    || fs.readdirSync(outputRoot).some(file => file !== 'index.html')) throw new Error('Unsafe serving directory');
  const html = fs.readFileSync(index);
  if (!html.equals(Buffer.from(expectedHtml, 'utf8'))) throw new Error('Preview drift: regenerate before serving');
  // Serve a validated, immutable snapshot; never resolve a request to a filesystem path.
  return createServer({ requestTimeout: 10000, headersTimeout: 10000 }, (request, response) => {
    response.setHeader('Content-Type', 'text/html; charset=UTF-8');
    response.setHeader('Cache-Control', 'private,no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'");
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    if (request.url !== '/') { response.writeHead(404); response.end(); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD'); response.writeHead(405); response.end(); return;
    }
    response.setHeader('Content-Length', html.length);
    response.writeHead(200);
    response.end(request.method === 'HEAD' ? undefined : html);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length === 3 && process.argv[2] === '--serve') {
    const server = createPreviewServer();
    server.listen(8765, '127.0.0.1', () => console.log('Read-only founder preview listening on 127.0.0.1:8765'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  } else {
    if (process.argv.length !== 2) throw new Error('Only --serve is accepted');
    console.log(JSON.stringify(publishPreview(), null, 2));
  }
}
