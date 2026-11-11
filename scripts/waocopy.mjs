// waocopy — Tamar's primary seat: drafts Hebrew copy on Qwen 3.8 Max via DashScope.
// Usage: node --env-file=.env.local scripts/waocopy.mjs <brief.md> [--out <file>] [--patches] [--effort low|medium|high|default]
//   --patches  return JSON {"patches":[{"file","old","new","why"}]} for str.replace application

import fs from 'fs';
import path from 'path';

const MODEL = 'qwen3.8-max';
// Non-streaming call: Qwen 3.8 Max reasons before answering, so multi-patch briefs can exceed 5 min.
const TIMEOUT_MS = Number(process.env.WAOCOPY_TIMEOUT_MS) || 900_000;
const CHARTER = path.resolve(import.meta.dirname, '../.claude/agents/copywriter.md');
// Eitan-approved style references; every .md here is appended to the system prompt.
const EXEMPLARS = path.resolve(import.meta.dirname, '../docs/copy/voice-exemplars');
// Writing upgrades: abstract rules Noa derived from recurring patterns, approved by Adam/Eitan.
const UPGRADES = path.resolve(import.meta.dirname, '../docs/copy/writing-upgrades.md');
const EFFORTS = ['low', 'medium', 'high', 'default'];

function parseArgs(argv) {
  const args = { brief: null, out: null, patches: false, effort: 'high' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--patches') args.patches = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--effort') {
      args.effort = argv[++i];
      if (!EFFORTS.includes(args.effort)) throw new Error(`--effort must be one of ${EFFORTS.join(', ')}`);
    }
    else if (!args.brief) args.brief = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (!args.brief) throw new Error('Usage: waocopy.mjs <brief.md> [--out <file>] [--patches]');
  return args;
}

function loadCharter() {
  const raw = fs.readFileSync(CHARTER, 'utf8');
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '').replace(/^> \*\*Seat note:\*\*[\s\S]*?\n\n/m, '');
}

function systemPrompt(patches) {
  const preamble = [
    'You are running as waocopy: a text-only seat with no file or tool access.',
    'Everything you need is in the brief. Where the charter mentions tools, editing files,',
    'or handing off to other agents, deliver the text instead.',
    'Always address the reader in Hebrew singular masculine.',
    'Only in copy that will be voiced (narration, voice-over, bot speech): keep sentences to 12-15 words.',
    'Everywhere else, vary the rhythm on purpose: 2-4-word punches between longer lines; never a run of equal-length sentences.',
    'State your chosen angle in one English line first, then the deliverable.',
  ];
  if (patches) {
    preamble.push(
      'Reply with a JSON object only, no markdown, shaped exactly as:',
      '{"angle":"...","patches":[{"file":"<path>","old":"<exact existing text>","new":"<replacement>","why":"<one line, English>"}]}',
      'Each "old" must be copied byte-for-byte from the brief so it can be applied with str.replace.',
    );
  }
  return `${preamble.join('\n')}\n\n${loadCharter()}${loadUpgrades()}${loadExemplars()}`;
}

function loadUpgrades() {
  if (!fs.existsSync(UPGRADES)) return '';
  // Only the bullet rules under "## Approved rules" are sent; the rest of the file is for humans.
  const raw = fs.readFileSync(UPGRADES, 'utf8');
  const m = raw.match(/^## Approved rules\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  const rules = (m ? m[1] : '').split('\n').filter((l) => /^\s*[-*] /.test(l)).join('\n').trim();
  if (!rules) return '';
  return `\n\n# Writing upgrades (approved standing rules — apply to every text)\n\n${rules}\n`;
}

function loadExemplars() {
  if (!fs.existsSync(EXEMPLARS)) return '';
  const files = fs.readdirSync(EXEMPLARS).filter((f) => f.endsWith('.md')).sort();
  if (!files.length) return '';
  const body = files.map((f) => fs.readFileSync(path.join(EXEMPLARS, f), 'utf8').trim()).join('\n\n---\n\n');
  return `\n\n# Voice exemplars (Eitan-approved — learn the moves, never copy lines verbatim)\n\n${body}\n`;
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
      { role: 'system', content: systemPrompt(args.patches) },
      { role: 'user', content: fs.readFileSync(args.brief, 'utf8') },
    ],
  };
  if (args.patches) body.response_format = { type: 'json_object' };
  // Batch copy work, flat-rate plan: think longer by default (measured 2026-11-07:
  // high ≈ 2-4x the reasoning tokens of default, ~1-2 min per brief).
  if (args.effort !== 'default') body.reasoning_effort = args.effort;
  // Stream: Node's fetch (undici) aborts after 300s without response headers, and a
  // non-streamed reply sends nothing until Qwen finishes reasoning.
  body.stream = true;
  body.stream_options = { include_usage: true };

  const started = Date.now();
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
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
