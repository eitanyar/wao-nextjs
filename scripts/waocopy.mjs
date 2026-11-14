// waocopy — Tamar's primary seat: drafts Hebrew copy. Default writer: Claude Opus 5.5 via the local
// Claude Code CLI (headless, no tools). Qwen4 Max Preview via DashScope with --writer qwen.
// Usage: node --env-file=.env.local scripts/waocopy.mjs <brief.md> [--out <file>] [--patches | --page]
//          [--effort low|medium|high|default] [--writer opus|qwen]
//   --writer   opus (default; WAOCOPY_WRITER overrides the default) or qwen. If the Opus call fails,
//              the run falls back to qwen automatically. Both writers get the same system prompt.
//   --effort   qwen: reasoning_effort; opus: claude CLI --effort ("default" passes nothing)
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
const WRITERS = ['opus', 'qwen'];
const OPUS_MODEL = process.env.WAOCOPY_OPUS_MODEL || 'claude-opus-5-5';
// WAOCOPY_CLAUDE_BIN overrides the CLI path (also used to simulate an Opus failure in tests).
const CLAUDE_BIN = process.env.WAOCOPY_CLAUDE_BIN || 'claude';

function parseArgs(argv) {
  const args = { brief: null, out: null, patches: false, page: false, effort: 'high', writer: process.env.WAOCOPY_WRITER || 'opus' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--patches') args.patches = true;
    else if (a === '--page') args.page = true;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--effort') {
      args.effort = argv[++i];
      if (!EFFORTS.includes(args.effort)) throw new Error(`--effort must be one of ${EFFORTS.join(', ')}`);
    }
    else if (a === '--writer') args.writer = argv[++i];
    else if (!args.brief) args.brief = a;
    else throw new Error(`Unexpected argument: ${a}`);
  }
  if (!WRITERS.includes(args.writer)) throw new Error(`--writer / WAOCOPY_WRITER must be one of ${WRITERS.join(', ')}`);
  if (!args.brief) throw new Error('Usage: waocopy.mjs <brief.md> [--out <file>] [--patches | --page] [--writer opus|qwen]');
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

async function runQwen(args, system, brief) {
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
      { role: 'system', content: system },
      { role: 'user', content: brief },
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
  const u = data.usage ?? {};
  return { text, model: MODEL, stats: `in=${u.prompt_tokens ?? '?'} out=${u.completion_tokens ?? '?'} request_id=${requestId}` };
}

const str = { type: 'string' };
const PATCHES_SCHEMA = {
  type: 'object',
  required: ['angle', 'patches'],
  properties: {
    angle: str,
    patches: {
      type: 'array',
      items: { type: 'object', required: ['file', 'old', 'new', 'why'], properties: { file: str, old: str, new: str, why: str } },
    },
  },
};
const PAGE_SCHEMA = {
  type: 'object',
  required: ['angle', 'bigIdea', 'letter', 'heroes', 'fields', 'flags'],
  properties: {
    angle: str,
    bigIdea: str,
    letter: str,
    heroes: {
      type: 'array',
      items: { type: 'object', properties: { angle: str, h1: str, subhead: str, badge: str, cta: str, ctaNote: str } },
    },
    fields: { type: 'object', additionalProperties: str },
    flags: { type: 'array', items: str },
  },
};

// Opus 5.5 through the local Claude Code CLI (subscription auth; no Anthropic API key needed).
// Headless, all tools off, no MCP, no session saved; runs from the OS temp dir so no project
// CLAUDE.md is picked up. The system prompt goes via a temp file, the brief via stdin.
async function runOpus(args, system, brief) {
  const { spawn } = await import('node:child_process');
  const os = await import('node:os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'waocopy-'));
  const promptFile = path.join(tmpDir, 'system-prompt.md');
  fs.writeFileSync(promptFile, system, 'utf8');
  const cliArgs = [
    '-p', '--model', OPUS_MODEL, '--output-format', 'json',
    '--tools', '', '--strict-mcp-config', '--no-session-persistence',
    '--system-prompt-file', promptFile,
  ];
  if (args.effort !== 'default') cliArgs.push('--effort', args.effort);
  // Like Qwen's response_format json_object, but typed: a bare {"type":"object"} schema lets the CLI
  // stringify nested arrays (seen 2026-11-14: "patches" came back as a JSON string).
  if (args.patches || args.page) cliArgs.push('--json-schema', JSON.stringify(args.patches ? PATCHES_SCHEMA : PAGE_SCHEMA));
  try {
    const { code, stdout, stderr } = await new Promise((resolve, reject) => {
      const child = spawn(CLAUDE_BIN, cliArgs, { cwd: tmpDir, stdio: ['pipe', 'pipe', 'pipe'] });
      const out = [];
      const err = [];
      const timer = setTimeout(() => child.kill('SIGTERM'), TIMEOUT_MS);
      child.stdout.on('data', (c) => out.push(c));
      child.stderr.on('data', (c) => err.push(c));
      child.on('error', (e) => { clearTimeout(timer); reject(new Error(`cannot run ${CLAUDE_BIN}: ${e.message}`)); });
      child.on('close', (c, sig) => {
        clearTimeout(timer);
        resolve({ code: sig ? `signal ${sig}` : c, stdout: Buffer.concat(out).toString('utf8'), stderr: Buffer.concat(err).toString('utf8') });
      });
      child.stdin.on('error', () => {});
      child.stdin.end(brief, 'utf8');
    });
    let env;
    try {
      env = JSON.parse(stdout);
    } catch {
      throw new Error(`claude CLI exit ${code}, non-JSON output: ${(stderr || stdout).slice(0, 500)}`);
    }
    if (process.env.WAOCOPY_DEBUG_ENVELOPE) fs.writeFileSync(process.env.WAOCOPY_DEBUG_ENVELOPE, stdout, 'utf8');
    if (code !== 0 || env.is_error || env.subtype !== 'success' || typeof env.result !== 'string') {
      throw new Error(`claude CLI exit ${code} (${env.subtype ?? 'no subtype'}): ${String(env.result ?? stderr).slice(0, 500)}`);
    }
    const models = Object.keys(env.modelUsage ?? {});
    const mu = env.modelUsage?.[models[0]] ?? {};
    let text = env.result;
    if ((args.patches || args.page) && env.structured_output && typeof env.structured_output === 'object') {
      try { JSON.parse(text); } catch { text = JSON.stringify(env.structured_output); }
    }
    // The CLI has no JSON response mode: if the reply's only fenced block wraps JSON and ends the
    // reply, drop the two fence lines (any angle line before it stays) so it parses from the first "{".
    const lines = text.trimEnd().split('\n');
    const fences = lines.flatMap((l, i) => (/^```(?:json)?\s*$/.test(l) ? [i] : []));
    if (fences.length === 2 && fences[1] === lines.length - 1 && /^\s*[{[]/.test(lines[fences[0] + 1] ?? '')) {
      text = lines.filter((_, i) => !fences.includes(i)).join('\n');
    }
    return {
      text,
      model: models.join('+') || OPUS_MODEL,
      stats: `in=${(mu.inputTokens ?? 0) + (mu.cacheReadInputTokens ?? 0) + (mu.cacheCreationInputTokens ?? 0) || '?'} out=${mu.outputTokens ?? '?'} session_id=${env.session_id ?? 'none'}`,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const system = systemPrompt(args.patches, args.page);
  const brief = fs.readFileSync(args.brief, 'utf8');

  const started = Date.now();
  let r;
  if (args.writer === 'opus') {
    try {
      r = await runOpus(args, system, brief);
    } catch (err) {
      console.error(`waocopy: Opus writer failed (${err.message}); falling back to qwen (${MODEL})`);
      r = await runQwen(args, system, brief);
    }
  } else {
    r = await runQwen(args, system, brief);
  }
  const { text } = r;

  if (args.patches) {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.patches)) throw new Error('Response JSON has no "patches" array');
  }
  if (args.page) {
    const parsed = JSON.parse(text);
    for (const k of ['bigIdea', 'letter', 'heroes', 'fields']) if (!(k in parsed)) throw new Error(`Response JSON has no "${k}"`);
  }

  // Plain mode has no JSON enforcement on either writer: warn (non-fatal) if a JSON brief got broken JSON.
  if (!args.patches && !args.page && /\bJSON\b/.test(brief) && text.includes('{')) {
    try { JSON.parse(text.slice(text.indexOf('{'))); } catch (e) {
      console.error(`waocopy: WARNING output does not parse as JSON from the first "{" (${e.message}); re-run or fix by hand`);
    }
  }

  if (args.out) fs.writeFileSync(args.out, text.endsWith('\n') ? text : `${text}\n`, 'utf8');
  else process.stdout.write(`${text}\n`);

  console.error(
    `waocopy: ${r.model} effort=${args.effort} ${((Date.now() - started) / 1000).toFixed(1)}s ${r.stats}` +
      (args.out ? ` -> ${args.out}` : ''),
  );
}

main().catch((err) => {
  console.error(`waocopy FAILED: ${err.message}`);
  process.exit(1);
});
