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
  // Starts at the shared simulation helpers (upload guard, T5 wording, T1 storage) that sit right above it.
  const start = routeCode.indexOf('const UPLOAD_ACK_PATTERN');
  const end = routeCode.indexOf('function generateMockCampaign', start);
  assert.notEqual(start, -1, 'simulation helpers not found');
  assert.ok(routeCode.indexOf('function handleSimulation(') > start, 'handleSimulation must follow its helpers');
  assert.notEqual(end, -1, 'generateMockCampaign boundary not found');

  const typescript = await import('typescript');
  const source = `
    const TURN_QUESTIONS = new Proxy({}, { get: (_, key) => \`question-\${key}\` });
    const NextResponse = { json: (payload) => payload };
    const generateFallbackStrategyAndCopy = () => ({ copy: { marker: 'generated-copy' } });
    const guardAdCopy = (copy) => copy;
    const adTemplate = () => undefined;
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
  assert.match(diagnosingBlock[1], /UPLOAD_ACK_PATTERN\.test\(text\.trim\(\)\)/, 'guard must run before the turn-consuming switch');
  const uploadPattern = routeCode.match(/const UPLOAD_ACK_PATTERN = ([^\n]+);/);
  assert.ok(uploadPattern, 'UPLOAD_ACK_PATTERN definition not found');
  assert.match(
    uploadPattern[1],
    /העלאתי \(\\d\+ תמונות\|תמונת פרופיל\)/,
    'upload-acknowledgment guard regex not found before the turn-consuming switch'
  );
  assert.match(diagnosingBlock[1], /return NextResponse\.json/, 'guard must return early, not fall through to the switch');
});

// Execute the actual POST handler with isolated module dependencies and no network or disk writes.
function loadLlmProvider(fakeProcess) {
  const ts = requireModule('typescript');
  const source = fs.readFileSync(path.resolve(baseDir, '../../../lib/ai/llmProvider.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'console', compiled)(() => ({}), mod, mod.exports, fakeProcess, { error() {} });
  return mod.exports;
}

function transpileLocal(relPath, imports = {}) {
  const ts = requireModule('typescript');
  const code = ts.transpileModule(fs.readFileSync(path.resolve(baseDir, relPath), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)((name) => {
    if (Object.hasOwn(imports, name)) return imports[name];
    throw new Error(`Unexpected import: ${name}`);
  }, mod, mod.exports);
  return mod.exports;
}

const claimsGuard = transpileLocal('../../../lib/google-ads/ad-claims-guard.ts');
const T = claimsGuard.CLAIM_TOKENS;
const assertNoUnbackedClaims = (copy, data) => {
  for (const line of [...copy.headlines, ...copy.descriptions]) assert.deepEqual(claimsGuard.unbackedClaims(line, data), [], `unbacked claim shown: ${line}`);
};

function loadPost(environment, qwenCalls, geminiCalls, geminiReply = '{"response":"gemini","currentState":"DIAGNOSING","collectedData":{}}') {
  const ts = requireModule('typescript');
  const compiled = ts.transpileModule(routeCode, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const fakeProcess = { env: environment, cwd: () => baseDir };
  const llmProvider = loadLlmProvider(fakeProcess);
  // Fresh rate-limit state per loaded route (one module instance, like one server process).
  const firstAdPreview = transpileLocal('../../../lib/google-ads/first-ad-preview.ts', { '../payments/rate-limit': transpileLocal('../../../lib/payments/rate-limit.ts') });
  const fakeRequire = name => {
    if (name === 'next/server') return { NextResponse: { json: (data, opts) => Response.json(data, opts) } };
    if (name === '@/lib/bot/prompts') return { ADAM_SYSTEM_PROMPT: 'adam', DROR_SYSTEM_PROMPT: 'dror', TAMAR_SYSTEM_PROMPT: 'tamar', T21_PHOTO_ASK_VERSION: 'test' };
    if (name === '@/lib/ads/keywordPlanner') return { getEstimatedCPC: async () => null };
    if (name === '@/lib/google-ads/default-negatives') return { DEFAULT_GENERIC_NEGATIVES: [] };
    if (name === '@/lib/google-ads/keyword-normalize') return { normalizeNegativeKeywords: (list) => list };
    if (name === '@/lib/google-ads/onboarding-response') return { resolveBoundedOnboardingResponse: async ({ live, timeoutMs }) => {
      assert.equal(timeoutMs, 12000);
      return live();
    } };
    if (name === '@/lib/ai/qwen-fast') return { callQwenChatJSON: async (...args) => {
      qwenCalls.push(args); return JSON.stringify({ response: 'qwen', currentState: 'DIAGNOSING', collectedData: {} });
    } };
    if (name === '@/lib/ai/llmProvider') return llmProvider;
    if (name === '@/lib/google-ads/first-ad-preview') return firstAdPreview;
    if (name === '@/lib/google-ads/ad-claims-guard') return claimsGuard;
    if (name === '@/lib/admin-auth') return { ADMIN_COOKIE_NAME: 'wao-admin', verifyAdminToken: async (token) => token === 'staff-ok' };
    if (name === '@/lib/bot/delivery-model') return transpileLocal('../../../lib/bot/delivery-model.ts');
    if (name === '@/lib/ai/llmUsage') return { recordGeminiUsage: (_data, model, tag) => { geminiCalls.usage = [...(geminiCalls.usage ?? []), [model, tag]]; return true; } };
    if (name === 'fs/promises') return { mkdir: async () => {}, appendFile: async () => {} };
    if (name === 'path') return path;
    throw new Error(`Unexpected import: ${name}`);
  };
  const fetch = async url => {
    geminiCalls.push(url);
    return Response.json({ candidates: [{ content: { parts: [{ text: geminiReply }] } }] });
  };
  new Function('require', 'module', 'exports', 'process', 'fetch', 'console', 'Response', 'AbortSignal', compiled)(
    fakeRequire, module, module.exports, fakeProcess, fetch, { log() {}, warn() {}, error() {} }, Response, AbortSignal);
  return module.exports.POST;
}

// Default: a session already past the three-question gate, so the provider routing below is exercised.
const PAST_GATE = { serviceModel: 'field', businessNiche: 'service', targetLocation: 'area', firstAdPreviewShown: true, turnIndex: 1 };

async function invokePost(post, { collectedData = PAST_GATE, currentState = 'DIAGNOSING', answer = 'answer', headers = {} } = {}) {
  const request = new Request('https://example.test/api/bot', { method: 'POST', headers, body: JSON.stringify({
    messages: [{ role: 'user', content: 'business' }, { role: 'assistant', content: 'question' }, { role: 'user', content: answer }],
    currentState, collectedData,
  }) });
  const response = await post(request);
  assert.equal(response.status, 200);
  return response.json();
}

test('chat defaults to Gemini even when token-plan Qwen credentials are present (D3)', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ QWEN_API_KEY: 'mock', QWEN_BASE_URL: 'https://example.test', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'gemini'); assert.equal(payload.isSimulation, false);
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 1);
});

test('production refuses an implicit token-plan chat endpoint and falls back to Gemini', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ NODE_ENV: 'production', LLM_PROVIDER_CHAT: 'qwen-metered', QWEN_METERED_API_KEY: 'mock',
    QWEN_METERED_BASE_URL: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'gemini');
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 1);
});

test('LLM_PROVIDER_CHAT=qwen-metered uses Qwen with the chat workload', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ LLM_PROVIDER_CHAT: 'qwen-metered', QWEN_METERED_API_KEY: 'mock', QWEN_METERED_BASE_URL: 'https://metered.example.test', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'qwen');
  assert.equal(qwen.length, 1); assert.equal(gemini.length, 0);
  assert.equal(qwen[0][2].workload, 'chat');
});

test('Qwen wins over Gemini when LLM_PROVIDER_CHAT selects it and receives multi-turn OpenAI roles without Gemini network calls', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ LLM_PROVIDER_CHAT: 'qwen-token-plan', QWEN_API_KEY: 'mock', QWEN_BASE_URL: 'https://example.test', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'qwen'); assert.equal(payload.isSimulation, false);
  assert.equal(qwen.length, 1); assert.equal(gemini.length, 0);
  assert.equal(qwen[0][2].timeoutMs, 12000);
  assert.deepEqual(qwen[0][1].map(m => m.role), ['user', 'assistant', 'user']);
});

test('Gemini remains secondary when Qwen configuration is incomplete', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({ LLM_PROVIDER_CHAT: 'qwen-token-plan', QWEN_API_KEY: 'mock', GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(payload.response, 'gemini'); assert.equal(payload.isSimulation, false);
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 1);
  assert.match(gemini[0], /^https:\/\/generativelanguage\.googleapis\.com\//);
});

test('a Gemini chat reply records one usage-ledger line tagged with the chat workload', async () => {
  const qwen = []; const gemini = [];
  await invokePost(loadPost({ GEMINI_API_KEY: 'mock' }, qwen, gemini));
  assert.equal(gemini.length, 1);
  assert.equal(gemini.usage?.length, 1);
  assert.deepEqual(gemini.usage[0][1], { workload: 'chat' });
});

test('without configured provider POST returns simulation without network calls', async () => {
  const qwen = []; const gemini = [];
  const payload = await invokePost(loadPost({}, qwen, gemini));
  assert.equal(payload.isSimulation, true);
  assert.equal(qwen.length, 0); assert.equal(gemini.length, 0);
});

// ── Three-question gate: the first ad after exactly three answers (2026-11-20) ──
// Q1 = the delivery-model button (client-side: collectedData { serviceModel, turnIndex: 0 }).
const FIRST_AD_READY = JSON.parse(routeCode.match(/const FIRST_AD_READY = ("[^\n]*");/)[1]);

async function runGate(post, headers = {}) {
  const afterQ1 = { serviceModel: 'field', turnIndex: 0 };
  const q2 = await invokePost(post, { collectedData: afterQ1, answer: 'leak repair', headers });
  const q3 = await invokePost(post, { collectedData: q2.collectedData, answer: 'north district', headers });
  return { q2, q3 };
}

test('simulation: answer 2 asks the area, answer 3 returns the first ad and stays in DIAGNOSING', async () => {
  const post = loadPost({}, [], []);
  const { q2, q3 } = await runGate(post);
  assert.equal(q2.currentState, 'DIAGNOSING');
  assert.equal(q2.collectedData.businessNiche, 'leak repair');
  assert.equal(q2.collectedData.primaryService, 'leak repair');
  assert.ok(Array.isArray(q2.collectedData.extractedKeywords));
  assert.equal(q2.copy, undefined, 'no ad before answer 3');
  assert.equal(q2.firstAdPreview, undefined);

  assert.equal(q3.firstAdPreview, true);
  assert.equal(q3.response, FIRST_AD_READY);
  assert.equal(q3.currentState, 'DIAGNOSING', 'the preview is not REVIEWING: no approval or payment step opens');
  assert.equal(q3.callSpecialists, undefined);
  assert.ok(q3.copy.headlines.length > 0 && q3.copy.descriptions.length > 0);
  assert.ok(Array.isArray(q3.strategy.keywords) && Array.isArray(q3.strategy.negativeKeywords));
  assert.equal(q3.collectedData.targetLocation, 'north district');
  assert.equal(q3.collectedData.firstAdPreviewShown, true);
  assert.equal(q3.collectedData.turnIndex, 1, 'sharpening resumes at the business-name question');
});

test('sharpening is optional and ordinary: an approval word after the preview is just the next answer', async () => {
  const post = loadPost({}, [], []);
  const { q3 } = await runGate(post);
  const next = await invokePost(post, { collectedData: q3.collectedData, answer: 'yes' });
  assert.equal(next.currentState, 'DIAGNOSING', 'nothing is approved from the first preview');
  assert.equal(next.collectedData.businessName, 'yes');
  assert.equal(next.collectedData.firstAdPreviewShown, true);
  assert.equal(next.firstAdPreview, undefined, 'the gate does not run twice');
});

test('approval still lives only in REVIEWING, reached after the full intake', async () => {
  const post = loadPost({}, [], []);
  const reviewing = await invokePost(post, { currentState: 'REVIEWING', collectedData: { ...PAST_GATE, phone: '050-1234567' }, answer: 'yes' });
  assert.equal(reviewing.currentState, 'REVIEWING', 'approval waits for the payment callback, unchanged');
  assert.match(routeCode, /currentState: "REVIEWING",\n\s*collectedData: data,\n\s*strategy,\n\s*copy,/, 'REVIEWING is still entered only from the phone turn');
});

test('simulation sharpening skips the area question already answered in the gate', async () => {
  const post = loadPost({}, [], []);
  const res = await invokePost(post, { collectedData: { ...PAST_GATE, turnIndex: 3 }, answer: 'more services' });
  assert.equal(res.collectedData.secondaryServices, 'more services');
  assert.equal(res.collectedData.turnIndex, 6);
});

test('live: answer 3 asks Dror + Tamar once each and falls back to the deterministic ad when their JSON is unusable', async () => {
  const gemini = [];
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], gemini);
  const { q2, q3 } = await runGate(post);
  assert.equal(q2.response.length > 0, true);
  assert.equal(gemini.length, 2, 'answer 2 is deterministic; answer 3 makes the two specialist calls only');
  assert.equal(q3.isSimulation, false);
  assert.equal(q3.currentState, 'DIAGNOSING');
  assert.ok(q3.copy.headlines.length > 0);
});

test('live: specialist output is used for the first ad when it has the panel fields', async () => {
  const gemini = [];
  const reply = JSON.stringify({ targetLocation: 'north', suggestedDailyBudget: 40, keywords: ['k1'], negativeKeywords: ['n1'], headlines: ['h1'], descriptions: ['d1'] });
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], gemini, reply);
  const { q3 } = await runGate(post);
  assert.equal(q3.copy.headlines[0], 'h1', 'specialist line first; template tops up to the RSA minimum of 3');
  assert.equal(q3.copy.headlines.length, 3);
  assert.deepEqual(q3.strategy.keywords, ['k1']);
});

test('live: the preview flag survives a model reply that drops it', async () => {
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], []);
  const res = await invokePost(post);
  assert.equal(res.response, 'gemini');
  assert.equal(res.collectedData.firstAdPreviewShown, true);
});

// ── No invented claims (standing rule) + first-ad cost guard ──

const CLAIMY_REPLY = JSON.stringify({
  response: 'adam', targetLocation: 'north', suggestedDailyBudget: 40, keywords: ['k1'], negativeKeywords: ['n1'],
  headlines: ['h-safe-1', `arrive in 30 ${T.minutes}`, 'h-safe-2', 'open 24/7', `20 ${T.yearsOf} x`],
  descriptions: ['d-safe-1', '100% happy', `call ${T.free}`, `plumber ${T.licensed}`],
});

test('first ad: specialist lines with unbacked claims are dropped and the set is topped up from the template', async () => {
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], [], CLAIMY_REPLY);
  const { q3 } = await runGate(post);
  assert.deepEqual(q3.copy.headlines.slice(0, 2), ['h-safe-1', 'h-safe-2']);
  assert.ok(q3.copy.headlines.length >= 3, 'topped up to the RSA minimum');
  assert.ok(q3.copy.descriptions.includes('d-safe-1') && q3.copy.descriptions.length >= 2);
  assertNoUnbackedClaims(q3.copy, q3.collectedData);
});

test('first ad: the template fallback is guarded too (simulation)', async () => {
  const { q3 } = await runGate(loadPost({}, [], []));
  assertNoUnbackedClaims(q3.copy, q3.collectedData);
});

test('REVIEWING path (live STRATEGIZING) drops unbacked claims as well', async () => {
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], [], CLAIMY_REPLY);
  const res = await invokePost(post, { currentState: 'STRATEGIZING' });
  assert.equal(res.currentState, 'REVIEWING');
  assert.ok(res.copy.headlines.includes('h-safe-1'));
  assertNoUnbackedClaims(res.copy, PAST_GATE);
});

test('REVIEWING path (simulation phone turn) shows no unbacked claims', async () => {
  const data = { ...PAST_GATE, primaryService: undefined, businessNiche: 'plumber', turnIndex: 24 };
  const res = await invokePost(loadPost({}, [], []), { collectedData: data, answer: '050-1234567' });
  assert.equal(res.currentState, 'REVIEWING');
  assertNoUnbackedClaims(res.copy, res.collectedData);
});

test('cost guard: the 6th first ad from one IP in an hour makes no model calls and builds no page', async () => {
  const gemini = [];
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], gemini, CLAIMY_REPLY);
  const ip = { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' };
  for (let i = 0; i < 5; i++) {
    const { q3 } = await runGate(post, ip);
    assert.equal(q3.landingPreview, true);
  }
  assert.equal(gemini.length, 10, 'two specialist calls per allowed first ad');
  const { q3 } = await runGate(post, ip);
  assert.equal(gemini.length, 10, 'no specialist calls once limited');
  assert.equal(q3.firstAdPreview, true, 'the owner still gets an ad');
  assert.equal(q3.landingPreview, false, 'no landing-page build once limited');
  assert.ok(q3.copy.headlines.length >= 3);
  assertNoUnbackedClaims(q3.copy, q3.collectedData);
  const other = await runGate(post, { 'x-forwarded-for': '198.51.100.2' });
  assert.equal(other.q3.landingPreview, true, 'other IPs are not affected');
});

test('cost guard: wao-admin staff are exempt', async () => {
  const gemini = [];
  const post = loadPost({ GEMINI_API_KEY: 'mock' }, [], gemini, CLAIMY_REPLY);
  const headers = { 'x-forwarded-for': '203.0.113.9', cookie: 'a=b; wao-admin=staff-ok' };
  for (let i = 0; i < 7; i++) await runGate(post, headers);
  assert.equal(gemini.length, 14);
  const forged = await runGate(post, { 'x-forwarded-for': '203.0.113.9', cookie: 'wao-admin=forged' });
  assert.equal(forged.q3.landingPreview, true, 'a forged cookie is a normal visitor; staff runs never consumed this IP quota');
});
