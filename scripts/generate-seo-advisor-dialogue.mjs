import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const draft = fs.readFileSync(path.join(root, 'docs/copy/seo-advisor-public-dialogue-2026-10-02.md'), 'utf8');
const headers = [
  ['s1_open_beat_a', /^\*\*Beat A \(opening\):\*\*$/],
  ['s1_open_beat_b', /^\*\*Beat B \(/],
  ['s1_open_beat_c', /^\*\*Beat C \(/],
  ['s1_hesitation', /^\*\*If he hesitates/],
  ['s2_consent', /^### S2 /],
  ['s2_waiting', /^\*\*Approval received/],
  ['s3a_main', /^\*\*S3a /],
  ['s3b_authority_gap', /^\*\*S3b /],
  ['s3c_baseline', /^\*\*S3c /],
  ['s3_close_freshness', /^\*\*S3-close /],
  ['anti_guarantee', /^\*\*Anti-guarantee line/],
  ['s4a_insufficient', /^\*\*S4a /],
  ['s4b_unavailable', /^\*\*S4b /],
  ['s4c_stale', /^\*\*S4c /],
  ['s4d_unsupported_market', /^\*\*S4d /],
  ['s4e_invalid_domain', /^\*\*S4e /],
  ['s5a_warm_close', /^\*\*S5a /],
  ['s5b_soft_exit', /^\*\*S5b /],
  ['s5c_no_contact', /^\*\*S5c /],
];
const beats = Object.fromEntries(headers.map(([id]) => [id, []]));
const alternatives = {};
let active = null;
for (const line of draft.split(/\r?\n/u)) {
  const header = headers.find(([, pattern]) => pattern.test(line));
  if (header) { active = header[0]; continue; }
  // Section headings close the current beat; descriptive prose does not.
  if (/^(?:### |## |---$)/u.test(line)) active = null;
  if (!active) continue;
  const bullet = /^- (?:\*\*(.*?)\*\* )?\u05f4(.*)\u05f4$/u.exec(line);
  if (!bullet) continue;
  const [, qualifier, spoken] = bullet;
  if (!spoken || !draft.includes(spoken)) throw new Error(`Invalid spoken string in ${active}`);
  if (qualifier) {
    const range = qualifier.includes('11\u201320') ? '11-20' : qualifier.includes('4\u201310') ? '4-10' : null;
    if (active !== 's3a_main' || !range || range in alternatives) throw new Error('Unexpected position alternative');
    alternatives[range] = beats[active].length;
  }
  beats[active].push(spoken);
}
if (Object.values(beats).some(lines => lines.length === 0) ||
  Object.keys(alternatives).sort().join(',') !== '11-20,4-10' ||
  alternatives['11-20'] === alternatives['4-10']) throw new Error('Incomplete dialogue draft');
const output = path.join(root, 'fixtures/seo-advisor-public/dialogue.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify({ beats, positionAlternatives: alternatives }, null, 2)}\n`);
