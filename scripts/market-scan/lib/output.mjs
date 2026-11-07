// Deterministic writers: same rows -> same bytes. No timestamps, no run-time counters.
import fs from 'node:fs';
import path from 'node:path';

function csvCell(v) {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? String(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows, columns) {
  return `${[columns.join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))].join('\n')}\n`;
}

export function toMarkdown(rows, columns, title) {
  const esc = v => (v === null || v === undefined ? '' : String(v).replace(/\|/g, '\\|'));
  return [`## ${title}`, '', `| ${columns.join(' | ')} |`, `|${columns.map(() => '---').join('|')}|`, ...rows.map(r => `| ${columns.map(c => esc(r[c])).join(' | ')} |`), ''].join('\n');
}

export function writeTable(dir, name, rows, columns, title, mdLimit = rows.length) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.csv`), toCsv(rows, columns));
  fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(rows.map(r => Object.fromEntries(columns.map(c => [c, r[c] ?? null]))), null, 1)}\n`);
  fs.writeFileSync(path.join(dir, `${name}.md`), toMarkdown(rows.slice(0, mdLimit), columns, title));
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 1)}\n`);
}
