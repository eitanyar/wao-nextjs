// waocopy — Tamar's primary seat: drafts Hebrew copy on Qwen 3.8 Max via DashScope.
// Usage: node --env-file=.env.local scripts/waocopy.mjs <brief.md> [--out <file>] [--patches | --page] [--effort low|medium|high|default]
//   --page     full rewrite: JSON {angle,bigIdea,letter,heroes[3],fields,flags} (letter first, then cut into fields)
//   --patches  return JSON {"patches":[{"file","old","new","why"}]} for str.replace application

import fs from 'fs';
import path from 'path';

// Default: qwen4-max-preview (won Noa's blind test vs qwen3.8-max, 2026-11-12). It is a preview
// model, so if the API rejects it (renamed/withdrawn) the run falls back to FALLBACK_MODEL.
// WAOCOPY_MODEL overrides the default.
let MODEL = process.env.WAOCOPY_MODEL || 'qwen4-max-preview';
const FALLBACK_MODEL = 'qwen3.8-max';
// Non-streaming call: Qwen 3.8 Max reasons before answering, so multi-patch briefs can exceed 5 min.
const TIMEOUT_MS = Number(process.env.WAOCOPY_TIMEOUT_MS) || 900_000;
const CHARTER = path.resolve(import.meta.dirname, '../.claude/agents/copywriter.md');
// Eitan-approved style references; every .md here is appended to the system prompt.
const EXEMPLARS = path.resolve(import.meta.dirname, '../docs/copy/voice-exemplars');
// Writing upgrades: abstract rules Noa derived from recurring patterns, approved by Adam/Eitan.
const UPGRADES = path.resolve(import.meta.dirname, '../docs/copy/writing-upgrades.md');
const EFFORTS = ['low', 'medium', 'high', 'default'];

function parseArgs(argv) {
  const args = { brief: null, out: null, patches: false, page: false, effort: 'high' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--patches') args.patches = true;
    else if (a === '--page') args.page = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--effort') {
      args.effort = argv[++i];
      if (!EFFORTS.includes(args.effort)) throw new Error(`--effort must be one of ${EFFORTS.join(', ')}`);
    }
    else if (!args.brief) args.brief = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (!args.brief) throw new Error('Usage: waocopy.mjs <brief.md> [--out <file>] [--patches | --page]');
  if (args.patches && args.page) throw new Error('--patches and --page are exclusive');
  return args;
}

function loadCharter() {
  const raw = fs.readFileSync(CHARTER, 'utf8');
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^> \*\*Seat note:\*\*[\s\S]*?\n\n/m, '');
}

function systemPrompt(patches, page) {
  const preamble = [
    'You are running as waocopy: a text-only seat with no file or tool access.',
    'Everything you need is in the brief. Where the charter mentions tools, editing files,',
    'or handing off to other agents, deliver the text instead.',
    'Always address the reader in Hebrew singular masculine.',
    'Only in copy that will be voiced (narration, voice-over, bot speech): keep sentences to 12-15 words.',
    'Everywhere else, vary the rhythm on purpose: 2-4-word punches between longer lines; never a run of equal-length sentences.',
    'State your chosen angle in one English line first, then the deliverable.',
    'Priority: (1) the hard lines in the brief, (2) the selling rules, (3) the craft rules. When a craft rule would weaken the sale and no hard line is involved, the sale wins.',
    'Write in your own natural spoken Israeli Hebrew, the way a sharp Sabra talks to a tradesman. Never trade that voice for formal or translated phrasing to satisfy a rule.',
    'The brief is written in English as information only. Never carry its sentence shape, idiom or word order into Hebrew. Take the fact and say it the way he would.',
    'Lines in the brief that say what not to state or claim are omissions. Leave the subject out; never announce the limit in the copy.',
  ];
  if (patches) {
    preamble.push(
      'Reply with a JSON object only, no markdown, shaped exactly as:',
      '{"angle":"...","patches":[{"file":"<path>","old":"<exact existing text>","new":"<replacement>","why":"<one line, English>"}]}',
      'Each "old" must be copied byte-for-byte from the brief so it can be applied with str.replace.',
    );
  }
  if (page) {
    preamble.push(
      'This is a FULL REWRITE. First write the letter as one continuous spoken pitch to him: paragraphs only, with no headings, buttons, labels or lists, covering every section the brief lists, each paragraph ending on the thought that makes him read the next. Then cut fields out of it, keeping its strongest sentences word for word. A field never says less, or says it flatter, than its passage in the letter.',
      'Reply with a JSON object only, no markdown, shaped exactly as:',
      '{"angle":"<awareness stage, sophistication stage, enemy, proof used — English>","bigIdea":"<one English sentence>","letter":"<the full Hebrew sales letter>","heroes":[{"angle":"<English>","h1":"...","subhead":"...","badge":"...","cta":"...","ctaNote":"..."}],"fields":{"<field key from the brief>":"<Hebrew>"},"flags":["<English: a claim you wanted to make but the fact sheet had no fact or proof for>"]}',
      'heroes holds exactly three options that make different promises, not one promise reworded; each has its own badge and button note. fields.hero.* repeats the one you recommend; say which and why in angle.',
    );
  }
  return `${preamble.join('\n')}\n\n${loadCharter()}${loadUpgrades(page)}${loadExemplars()}`;
}

function loadUpgrades(pageMode = false) {
  if (!fs.existsSync(UPGRADES)) return '';
  // Only the bullet rules under "## Approved rules" are sent; the rest of the file is for humans.
  const raw = fs.readFileSync(UPGRADES, 'utf8');
  const m = raw.match(/^## Approved rules\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  // Bullets plus their ### group headings (selling rules first: order signals priority).
  const rules = (m ? m[1] : '').split('\n').filter((l) => /^\s*[-*] /.test(l) || /^### /.test(l)).join('\n').trim();
  const count = rules.split('\n').filter((l) => /^\s*[-*] /.test(l)).length;
  process.stderr.write(`waocopy: loaded ${count} writing-upgrade rules${/^### Selling rules/m.test(rules) ? ' (selling + craft groups)' : ' (no selling group)'}\n`);
  if (pageMode && !/^### Selling rules/m.test(rules)) throw new Error('--page mode needs the "### Selling rules" group under "## Approved rules" in writing-upgrades.md');
  if (!rules) return '';
  return `\n\n# Writing upgrades (approved standing rules — apply to every text)\n\n${rules}\n`;
}

function loadExemplars() {
  if (!fs.existsSync(EXEMPLARS)) return '';
  const files = fs.readdirSync(EXEMPLARS).filter((f) => f.endsWith('.md')).sort();
  if (!files.length) return '';
  const body = files.map((f) => fs.readFileSync(path.join(EXEMPLARS, f), 'utf8').trim()).join('\n\n---\n\n');
  return `\n\n# Voice exemplars (Eitan-approved — learn the moves, never copy lines verbatim)\n\nThese come from a free diagnostic tool's result screens. Learn the bluntness, the rhythm and the benefit-tied praise. Their moves of stating the tool's own limits and honest unknowns apply to diagnostic screens only, never to sales pages. Facts, durations and disclaimers in these examples belong to that tool. None transfers.\n\n${body}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // .env.local is the source of truth: Node's --env-file never overrides variables already in
  // the shell, and stale QWEN_* exports there once pointed waocopy at a dead key / wrong host.
  const envFile = path.resolve(import.meta.dirname, '../.env.local');
  const fileEnv = fs.existsSync(envFile) ? (await import('node:util')).parseEnv(fs.readFileSync(envFile, 'utf8')) : {};
  const QWEN_API_KEY = fileEnv.QWEN_API_KEY || process.env.QWEN_API_KEY;
  const QWEN_BASE_URL = fileEnv.QWEN_BASE_URL || process.env.QWEN_BASE_URL;
  if (!QWEN_API_KEY || !QWEN_BASE_URL) {
    throw new Error('QWEN_API_KEY and QWEN_BASE_URL must be set (run with --env-file=.env.local)');
  }

  const body = {
    model: MODEL,
    temperature: 0.7,
    messages: [
      { role: 'system', content: systemPrompt(args.patches, args.page) },
      { role: 'user', content: fs.readFileSync(args.brief, 'utf8') },
    ],
  };
  if (args.patches || args.page) body.response_format = { type: 'json_object' };
  // Batch copy work, flat-rate plan: think longer by default (measured 2026-11-07:
  // high ≈ 2-4x the reasoning tokens of default, ~1-2 min per brief).
  if (args.effort !== 'default') body.reasoning_effort = args.effort;
  // Stream: Node's fetch (undici) aborts after 300s without response headers, and a
  // non-streamed reply sends nothing until Qwen finishes reasoning.
  body.stream = true;
  body.stream_options = { include_usage: true };

  const started = Date.now();
  const post = () =>
    fetch(`${QWEN_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  let res = await post();
  if (!res.ok && [400, 403, 404].includes(res.status) && MODEL !== FALLBACK_MODEL) {
    const errText = await res.text().catch(() => '');
    if (/model/i.test(errText)) {
      console.error(`waocopy: ${MODEL} rejected (HTTP ${res.status}); falling back to ${FALLBACK_MODEL}`);
      MODEL = FALLBACK_MODEL;
      body.model = MODEL;
      res = await post();
    } else {
      throw new Error(`DashScope HTTP ${res.status}: ${errText.slice(0, 500)}`);
    }
  }
  let requestId = res.headers.get('x-request-id') || 'none';
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`DashScope HTTP ${res.status} (request_id ${requestId}): ${errText.slice(0, 500)}`);
  }

  const data = { usage: null };
  let text = '';
  let buf = '';
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      const evt = JSON.parse(payload);
      if (requestId === 'none' && (evt.request_id || evt.id)) requestId = evt.request_id || evt.id;
      if (evt.usage) data.usage = evt.usage;
      text += evt.choices?.[0]?.delta?.content ?? '';
    }
  }
  if (args.patches) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.patches)) throw new Error('Response JSON has no "patches" array');
  }
  if (args.page) {
    const parsed = JSON.parse(text);
    for (const k of ['bigIdea', 'letter', 'heroes', 'fields']) if (!(k in parsed)) throw new Error(`Response JSON has no "${k}"`);
  }

  if (args.out) fs.writeFileSync(args.out, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  else process.stdout.write(`${text}\n`);

  const u = data.usage ?? {};
  console.error(
    `waocopy: ${MODEL} effort=${args.effort} ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `in=${u.prompt_tokens ?? '?'} out=${u.completion_tokens ?? '?'} request_id=${requestId}` +
      (args.out ? ` -> ${args.out}` : ''),
  );
}

main().catch((err) => {
  console.error(`waocopy FAILED: ${err.message}`);
  process.exit(1);
});
