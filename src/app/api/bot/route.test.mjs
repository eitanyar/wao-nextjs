import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const requireModule = createRequire(import.meta.url);

const baseDir = path.dirname(fileURLToPath(import.meta.url));
const routePath = path.join(baseDir, 'route.ts');
const routeCode = fs.readFileSync(routePath, 'utf8');
const promptPath = path.resolve(baseDir, '../../../lib/bot/prompts.ts');
const promptCode = fs.readFileSync(promptPath, 'utf8');

async function loadHandleSimulation() {
  const start = routeCode.indexOf('function handleSimulation(');
  const end = routeCode.indexOf('function generateMockCampaign', start);
  assert.notEqual(start, -1, 'handleSimulation function not found');
  assert.notEqual(end, -1, 'generateMockCampaign boundary not found');

  const typescript = await import('typescript');
  const source = `
    const TURN_QUESTIONS = new Proxy({}, { get: (_, key) => \`question-\${key}\` });
    const NextResponse = { json: (payload) => payload };
    const generateFallbackStrategyAndCopy = () => ({ copy: { marker: 'generated-copy' } });
    ${routeCode.slice(start, end)}
    module.exports = { handleSimulation };
  `;
  const compiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.CommonJS,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  new Function('module', 'exports', compiled)(loadedModule, loadedModule.exports);
  return loadedModule.exports.handleSimulation;
}

test('simulation executes the turn 8 to 9 to 10 progression exactly once', async () => {
  const handleSimulation = await loadHandleSimulation();
  const turn8 = handleSimulation('distinctive value', 'DIAGNOSING', {
    turnIndex: 8,
    businessNiche: 'service',
    specificCities: 'city',
  });

  assert.equal(turn8.currentState, 'DIAGNOSING');
  assert.equal(turn8.collectedData.turnIndex, 9);
  assert.equal(turn8.collectedData.usp, 'distinctive value');
  assert.deepEqual(turn8.copy, { marker: 'generated-copy' });
  assert.equal(turn8.response, 'question-9');

  const turn9 = handleSimulation('12 years with warranty', 'DIAGNOSING', turn8.collectedData);
  assert.equal(turn9.collectedData.turnIndex, 10);
  assert.equal(turn9.collectedData.usp, 'distinctive value');
  assert.equal(turn9.collectedData.yearsInField, '12 years with warranty');
  assert.equal(turn9.collectedData.guarantee, '12 years with warranty');
  assert.equal(turn9.response, 'question-10');
});

test('live prompt keeps turn 8 and turn 9 collection parity', () => {
  const turn8 = promptCode.indexOf('T8:');
  const turn9 = promptCode.indexOf('T9:', turn8);
  const turn10 = promptCode.indexOf('T10:', turn9);
  assert.ok(turn8 >= 0 && turn8 < turn9 && turn9 < turn10, 'T8, T9, and T10 must remain ordered');
  assert.match(promptCode.slice(turn8, turn9), /collect:\s*usp/);
  assert.match(promptCode.slice(turn9, turn10), /collect:\s*yearsInField,\s*guarantee/);
});

// ── Regression test for the ownerName (T2b) turn-index drift bug ───────────
// Root cause: prompts.ts (the live/Gemini path) has always asked a T2b
// "ownerName" question right after T2 (businessName), but the offline
// handleSimulation() switch never had a matching case — so any answer meant
// for T2b landed in the T3 (secondaryServices) slot, and every following
// answer cascaded one slot off for the rest of the session. This corrupted
// real intake data (see data/lps/wao-client-1.json, wao-client-8vxf.json).

test('TURN_QUESTIONS has an ownerName question at index 2, matching prompts.ts T2b', () => {
  const match = routeCode.match(/const TURN_QUESTIONS: Record<number, string> = \{([\s\S]*?)\n\};/);
  assert.ok(match, 'TURN_QUESTIONS table not found');
  const body = match[1];
  const entry2 = body.match(/\n\s*2:\s*"([^"]*)"/);
  assert.ok(entry2, 'TURN_QUESTIONS[2] entry not found');
  const promptT2b = promptCode.match(/T2b:\s*"([^"]*)"/);
  assert.ok(promptT2b, 'T2b prompt question not found');
  assert.equal(entry2[1], promptT2b[1], 'TURN_QUESTIONS[2] must match the T2b ownerName question');
});

test('handleSimulation switch has a distinct case for each turn 0-24 with no duplicates', () => {
  const caseNumbers = [...routeCode.matchAll(/^\s*case (\d+):/gm)].map(m => parseInt(m[1], 10));
  const seen = new Set();
  const duplicates = [];
  for (const n of caseNumbers) {
    if (seen.has(n)) duplicates.push(n);
    seen.add(n);
  }
  assert.deepEqual(duplicates, [], `Duplicate case labels indicate a re-introduced turn-index drift: ${duplicates}`);
  // Every turn from 0 to 24 (T1 through T25, the phone/whatsapp turn) must
  // have a corresponding case — a gap here is exactly the class of bug that
  // corrupted wao-client-1.json / wao-client-8vxf.json.
  for (let i = 0; i <= 24; i++) {
    assert.ok(seen.has(i), `Missing switch case for turn ${i} — this creates a slot-shift for every later answer`);
  }
});

test('case 2 stores the answer into data.ownerName (not secondaryServices)', () => {
  const case2 = routeCode.match(/case 2:\s*\n([\s\S]*?)\n\s*case 3:/);
  assert.ok(case2, 'case 2 block not found');
  assert.match(case2[1], /data\.ownerName\s*=\s*text/);
  assert.doesNotMatch(case2[1], /data\.secondaryServices/);
});

test('case 3 stores the answer into data.secondaryServices (shifted correctly after ownerName insertion)', () => {
  const case3 = routeCode.match(/case 3:\s*\n([\s\S]*?)\n\s*case 4:/);
  assert.ok(case3, 'case 3 block not found');
  assert.match(case3[1], /data\.secondaryServices\s*=\s*text/);
});

test('the inferred-service-model jump lands on turnIndex 5 (T5 cities/address), not 4', () => {
  const case3 = routeCode.match(/case 3:\s*\n([\s\S]*?)\n\s*case 4:/);
  assert.ok(case3, 'case 3 block not found');
  const inferredBranch = case3[1].match(/if \(inferredServiceModel\) \{([\s\S]*?)\n\s*\} else \{/);
  assert.ok(inferredBranch, 'inferred service model branch not found');
  assert.match(inferredBranch[1], /data\.turnIndex = 5;/);
  assert.doesNotMatch(inferredBranch[1], /data\.turnIndex = 4;/);
});

test('phone/whatsapp turn (case 24) is guarded by isPlausiblePhoneAnswer before being stored', () => {
  const case24 = routeCode.match(/case 24: \{([\s\S]*?)\n\s*\/\/ All done/);
  assert.ok(case24, 'case 24 block not found');
  assert.match(case24[1], /isPlausiblePhoneAnswer\(text\)/);
});

// ── Unit test the phone-plausibility guard logic directly (TS-stripped) ────
function loadIsPlausiblePhoneAnswer() {
  const match = routeCode.match(
    /function isPlausiblePhoneAnswer\(text: string\): boolean \{([\s\S]*?)\n\}/
  );
  assert.ok(match, 'isPlausiblePhoneAnswer function not found in route.ts');
  const body = match[1];
  return new Function('text', body);
}

test('isPlausiblePhoneAnswer rejects upload-status strings and other non-phone free text', () => {
  const isPlausiblePhoneAnswer = loadIsPlausiblePhoneAnswer();
  assert.equal(isPlausiblePhoneAnswer('העלאתי 1 תמונות'), false);
  assert.equal(isPlausiblePhoneAnswer('כן, יש לי תמונה טובה שלי בגינה, מעלה.'), false);
  assert.equal(isPlausiblePhoneAnswer('אין לי רישיון מיוחד'), false);
});

test('isPlausiblePhoneAnswer accepts real Israeli phone numbers', () => {
  const isPlausiblePhoneAnswer = loadIsPlausiblePhoneAnswer();
  assert.equal(isPlausiblePhoneAnswer('052-9876543'), true);
  assert.equal(isPlausiblePhoneAnswer('0501234567'), true);
  assert.equal(isPlausiblePhoneAnswer('050-1234567 וגם וואטסאפ זהה'), false); // too much surrounding prose
  assert.equal(isPlausiblePhoneAnswer('050 123 4567'), true);
});

// ── Regression test for the second corruption source: upload-acknowledgment
// messages consuming a turn ────────────────────────────────────────────────
// src/app/(app)/google-ads/onboarding/page.tsx's handleUpload() posts a
// synthetic "העלאתי N תמונות" / "העלאתי תמונת פרופיל" message to /api/bot
// after every file upload. Before this guard, handleSimulation's switch(turn)
// stored that literal string into whatever field the current turnIndex
// pointed at (reproduced live: capacityUnit -> "העלאתי 2 תמונות"), matching
// the corruption found in data/lps/wao-client-1.json.

test('DIAGNOSING state short-circuits on an upload-acknowledgment message before the turn switch', () => {
  const diagnosingBlock = routeCode.match(
    /if \(currentState === "DIAGNOSING"\) \{([\s\S]*?)\/\/ ── Store this turn's answer/
  );
  assert.ok(diagnosingBlock, 'DIAGNOSING branch not found');
  assert.match(
    diagnosingBlock[1],
    /העלאתי \(\\d\+ תמונות\|תמונת פרופיל\)/,
    'upload-acknowledgment guard regex not found before the turn-consuming switch'
  );
  assert.match(diagnosingBlock[1], /return NextResponse\.json/, 'guard must return early, not fall through to the switch');
});

// Execute the actual POST handler with isolated module dependencies and no network or disk writes.
function loadPost(environment, qwenCalls, geminiCalls) {
  const ts = requireModule('typescript');
  const compiled = ts.transpileModule(routeCode, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const fakeRequire = name => {
    if (name === 'next/server') return { NextResponse: { json: (data, opts) => Response.json(data, opts) } };
    if (name === '@/lib/bot/prompts') return { ADAM_SYSTEM_PROMPT: 'adam', DROR_SYSTEM_PROMPT: 'dror', TAMAR_SYSTEM_PROMPT: 'tamar', T21_PHOTO_ASK_VERSION: 'test' };
    if (name === '@/lib/ads/keywordPlanner') return { getEstimatedCPC: async () => null };
    if (name === '@/lib/google-ads/onboarding-response') return { resolveBoundedOnboardingResponse: async ({ live, timeoutMs }) => {
      assert.equal(timeoutMs, 12000);
      return live();
    } };
    if (name === '@/lib/ai/qwen-fast') return { callQwenChatJSON: async (...args) => {
      qwenCalls.push(args); return JSON.stringify({ response: 'qwen', currentState: 'DIAGNOSING', collectedData: {} });
    } };
    if (name === 'fs/promises') return { mkdir: async () => {}, appendFile: async () => {} };
    if (name === 'path') return path;
    throw new Error(`Unexpected import: ${name}`);
  };
  const fetch = async url => {
    geminiCalls.push(url);
    return Response.json({ candidates: [{ content: { parts: [{ text: '{"response":"gemini","currentState":"DIAGNOSING","collectedData":{}}' }] } }] });
  };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'console', 'Response', 'AbortSignal', compiled)(
    fakeRequire, module, module.exports, { env: environment, cwd: () => baseDir }, fetch, { log() {}, warn() {}, error() {} }, Response, AbortSignal);
  return module.exports.POST;
}

async function invokePost(post) {
  const request = new Request('https://example.test/api/bot', { method: 'POST', body: JSON.stringify({
    messages: [{ role: 'user', content: 'business' }, { role: 'assistant', content: 'question' }, { role: 'user', content: 'answer' }],
    currentState: 'DIAGNOSING', collectedData: {},
  }) });
  const response = await post(request);
  assert.equal(response.status, 200);
  return response.json();
}

test('Qwen wins over Gemini and receives multi-turn OpenAI roles without Gemini network calls', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ QWEN_API_KEY: 'mock', QWEN_BASE_URL: 'https://example.test', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'qwen'); assert.equal(payload.isSimulation, false);
  assert.equal(qwen.length, 1); assert.equal(gemini.length, 0);
  assert.equal(qwen[0][2].timeoutMs, 12000);
  assert.deepEqual(qwen[0][1].map(m => m.role), ['user', 'assistant', 'user']);
});

test('Gemini remains secondary when Qwen configuration is incomplete', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ QWEN_API_KEY: 'mock', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'gemini'); assert.equal(payload.isSimulation, false);
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 1);
  assert.match(gemini[0], /^https:\/\/generativelanguage\.googleapis\.com\//);
});

test('without configured provider POST returns simulation without network calls', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({}, qwen, gemini));
  assert.equal(payload.isSimulation, true);
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 0);
});
