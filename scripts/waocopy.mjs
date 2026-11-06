// waocopy — Tamar's primary seat: drafts Hebrew copy on Qwen 3.8 Max via DashScope.
// Usage: node --env-file=.env.local scripts/waocopy.mjs <brief.md> [--out <file>] [--patches]
//   --patches  return JSON {"patches":[{"file","old","new","why"}]} for str.replace application

import fs from 'fs';
import path from 'path';

const MODEL = 'qwen3.8-max';
const TIMEOUT_MS = 300_000;
const CHARTER = path.resolve(import.meta.dirname, '../.claude/agents/copywriter.md');

function parseArgs(argv) {
  const args = { brief: null, out: null, patches: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--patches') args.patches = true;
    else if (a === '--out') args.out = argv[++i];
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
    'Keep sentences to 12-15 words in anything that may be read aloud.',
    'State your chosen angle in one English line first, then the deliverable.',
  ];
  if (patches) {
    preamble.push(
      'Reply with a JSON object only, no markdown, shaped exactly as:',
      '{"angle":"...","patches":[{"file":"<path>","old":"<exact existing text>","new":"<replacement>","why":"<one line, English>"}]}',
      'Each "old" must be copied byte-for-byte from the brief so it can be applied with str.replace.',
    );
  }
  return `${preamble.join('\n')}\n\n${loadCharter()}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { QWEN_API_KEY, QWEN_BASE_URL } = process.env;
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

  const started = Date.now();
  const res = await fetch(`${QWEN_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${QWEN_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  const requestId = res.headers.get('x-request-id') || data.request_id || data.id || 'none';
  if (!res.ok) {
    throw new Error(`DashScope HTTP ${res.status} (request_id ${requestId}): ${JSON.stringify(data).slice(0, 500)}`);
  }

  const text = data.choices?.[0]?.message?.content ?? '';
  if (args.patches) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.patches)) throw new Error('Response JSON has no "patches" array');
  }

  if (args.out) fs.writeFileSync(args.out, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  else process.stdout.write(`${text}\n`);

  const u = data.usage ?? {};
  console.error(
    `waocopy: ${MODEL} ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `in=${u.prompt_tokens ?? '?'} out=${u.completion_tokens ?? '?'} request_id=${requestId}` +
      (args.out ? ` -> ${args.out}` : ''),
  );
}

main().catch((err) => {
  console.error(`waocopy FAILED: ${err.message}`);
  process.exit(1);
});
