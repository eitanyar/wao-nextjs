import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const apiDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(apiDir, '..', '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const cloudflareDeploy = read('src/app/api/cloudflare-pages/deploy/route.ts');
const siteBotDeploy = read('src/app/api/site-bot/deploy/route.ts');


function assertAuthorizationBeforeBodyAndSideEffects(source, routeName) {
  const authorizationIndex = source.indexOf(routeName === 'site-bot/deploy'
    ? "return privateJson({ error: 'unauthorized' }, 401)"
    : "return NextResponse.json({ error: 'unauthorized' }, { status: 401 })");
  const bodyIndex = source.indexOf('await req.json()');
  const slugValidationIndex = source.indexOf('isSafeDeploymentSlug(slug)');
  assert.ok(authorizationIndex >= 0, `${routeName} has an explicit unauthenticated response`);
  assert.ok(bodyIndex >= 0 && authorizationIndex < bodyIndex, `${routeName} authorizes before parsing the request body`);
  assert.ok(slugValidationIndex > bodyIndex, `${routeName} validates the parsed slug`);

  for (const sideEffect of ['path.join(process.cwd()', 'readFileSync(', 'provisionFraudBlockerDomain(', 'mkdtempSync(', 'execFileSync(', 'await fetch(']) {
    const sideEffectIndex = source.indexOf(sideEffect, slugValidationIndex);
    assert.ok(sideEffectIndex < 0 || slugValidationIndex < sideEffectIndex, `${routeName} validates the slug before ${sideEffect}`);
  }
}

test('deployment routes authorize and validate before side effects', () => {
  assertAuthorizationBeforeBodyAndSideEffects(cloudflareDeploy, 'cloudflare-pages/deploy');
  assertAuthorizationBeforeBodyAndSideEffects(siteBotDeploy, 'site-bot/deploy');
  assert.match(cloudflareDeploy, /campaign\?\.clientId !== sessionClientId/);
  assert.match(cloudflareDeploy, /campaign\.customerId !== googleAdsCustomerId/);
  assert.ok(cloudflareDeploy.indexOf('loadCampaignConfigBySlug(slug)') < cloudflareDeploy.indexOf("path.join(process.cwd(), 'data', 'lps'"), 'LP client ownership is checked before LP filesystem access');
  assert.match(siteBotDeploy, /const adminAuthorized = await verifyAdminToken\(authCookies\.get\(ADMIN_COOKIE_NAME\)\?\.value \?\? ''\);/);
  assert.doesNotMatch(siteBotDeploy, /WAO_DEPLOY_SECRET|verifyInternalDeployBearer|headers\.get\('authorization'\)/i, 'Site Bot deployment has no deploy-secret or bearer bypass');
  assert.doesNotMatch(cloudflareDeploy, /WAO_DEPLOY_SECRET|verifyInternalDeployBearer|headers\.get\('authorization'\)/i, 'LP deployment has no deploy-secret or bearer bypass');
});

test('deployment routes use safe temporary directories and argument-vector Wrangler calls', () => {
  for (const [routeName, source, temporaryPrefix] of [
    ['cloudflare-pages/deploy', cloudflareDeploy, 'wao-lp-'],
    ['site-bot/deploy', siteBotDeploy, 'wao-site-'],
  ]) {
    assert.match(source, new RegExp(`mkdtempSync\\(path\\.join\\(tmpdir\\(\\), '${temporaryPrefix}'\\)\\)`), `${routeName} uses a unique temporary directory`);
    assert.doesNotMatch(source, /execSync\s*\(/, `${routeName} does not invoke a shell`);
    assert.match(source, /execFileSync\('\.\/node_modules\/\.bin\/wrangler', \['pages', 'project', 'create', slug/, `${routeName} passes the project name as argv`);
    assert.match(source, /execFileSync\('\.\/node_modules\/\.bin\/wrangler', \['pages', 'deploy', tmpDir, '--project-name', slug/, `${routeName} passes deploy values as argv`);
    assert.match(source, /finally\s*\{\s*rmSync\(tmpDir, \{ recursive: true, force: true \}\);\s*\}/, `${routeName} cleans up the temporary directory`);
  }
});

test('Site Bot deployment stops when Fraud Blocker provision or tracker persistence fails', () => {
  assert.match(siteBotDeploy, /catch \(error\) \{\s*writeFraudBlockerState\([\s\S]*?\);\s*return privateJson\(\{ error: 'fraud_blocker_provisioning_required' \}, 424\);\s*\}/);
  assert.match(siteBotDeploy, /writeFraudBlockerState\(fraudBlockerFailureState\([\s\S]*?Tracker verification failed[\s\S]*?\)\);\s*return privateJson\(\{ error: 'fraud_blocker_tracker_verification_failed' \}, 424\);/);
});

function disabledGeoModule(relativePath, nodeEnv, allowedImport) {
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`unexpected ${name}`); };
  const exports = {};
  const source = read(relativePath);
  const code = ts.transpileModule(source, {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: name => name === allowedImport.name ? allowedImport.value : deny(`import: ${name}`),
    process: new Proxy({ env: { NODE_ENV: nodeEnv } }, { get: (_, name) => deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    WebSocket: function () { deny('WebSocket'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest'); },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    Date: class { constructor() { deny('clock'); } static now() { deny('clock'); } },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
    setImmediate: () => deny('setImmediate'),
    queueMicrotask: () => deny('queueMicrotask'),
  }, { filename: relativePath });
  const trapped = fixture => new Proxy(fixture, {
    get: (_, name) => deny(`request.${String(name)}`),
    ownKeys: () => deny('request keys'),
    getOwnPropertyDescriptor: () => deny('request descriptor'),
  });
  return { exports, unexpected, trapped };
}

test('GEO upgrade init and callback actual POSTs fail closed in all environments without effects', async () => {
  const routes = [
    'src/app/api/geo/upgrade/init/route.ts',
    'src/app/api/geo/upgrade/callback/route.ts',
  ];
  for (const nodeEnv of ['development', 'test', 'production']) {
    for (const route of routes) {
      const harness = disabledGeoModule(route, nodeEnv, {
        name: 'next/server', value: { NextResponse: { json: (body, options) => Response.json(body, options) } },
      });
      assert.deepEqual(Object.keys(harness.exports), ['POST']);
      for (const request of [
        undefined,
        null,
        harness.trapped({ json: async () => ({ sessionId: 'synthetic-session' }) }),
        harness.trapped({ json: async () => JSON.parse('{'), url: 'not a URL' }),
        harness.trapped({ headers: { authorization: 'Bearer synthetic' },
          cookies: { session: 'synthetic' }, env: { ENABLE_CHECKOUT: 'true' } }),
        harness.trapped({ get json() { throw new Error('request getter'); },
          get then() { throw new Error('request thenable getter'); } }),
      ]) {
        const response = await harness.exports.POST(request);
        assert.ok(response instanceof Response, route);
        assert.equal(response.status, 503, route);
        assert.deepEqual(await response.json(), { error: 'checkout_unavailable' }, route);
        assert.equal(response.headers.get('cache-control'), 'private, no-store', route);
        assert.deepEqual(harness.unexpected, [], route);
      }
    }
  }
});

test('GEO upgrade mock pay page actual default export throws 404 before props or effects', () => {
  const page = 'src/app/(product)/geo/upgrade/pay/[sessionId]/page.tsx';
  for (const nodeEnv of ['development', 'test', 'production']) {
    const harness = disabledGeoModule(page, nodeEnv, {
      name: 'next/navigation', value: { notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); } },
    });
    assert.deepEqual(Object.keys(harness.exports).sort(), ['default', 'metadata']);
    assert.equal(harness.exports.metadata.robots.index, false);
    assert.throws(() => harness.exports.default(harness.trapped({
      params: { sessionId: 'synthetic-session' },
      get then() { throw new Error('props thenable getter'); },
    })), /NEXT_HTTP_ERROR_FALLBACK;404/);
    assert.deepEqual(harness.unexpected, []);
  }
});

test('GEO cold signup init and callback actual POSTs fail closed in all environments without effects', async () => {
  const routes = [
    'src/app/api/geo/signup/init/route.ts',
    'src/app/api/geo/signup/callback/route.ts',
  ];
  for (const nodeEnv of ['development', 'test', 'production']) {
    for (const route of routes) {
      const harness = disabledGeoModule(route, nodeEnv, {
        name: 'next/server', value: { NextResponse: { json: (body, options) => Response.json(body, options) } },
      });
      assert.deepEqual(Object.keys(harness.exports), ['POST']);
      for (const request of [
        undefined,
        null,
        harness.trapped({ json: async () => ({ sessionId: 'synthetic-session' }) }),
        harness.trapped({ json: async () => JSON.parse('{'), url: 'not a URL' }),
        harness.trapped({ headers: { authorization: 'Bearer synthetic' },
          cookies: { session: 'synthetic' }, env: { ENABLE_CHECKOUT: 'true' } }),
        harness.trapped({ get json() { throw new Error('request getter'); },
          get then() { throw new Error('request thenable getter'); } }),
      ]) {
        const response = await harness.exports.POST(request);
        assert.ok(response instanceof Response, route);
        assert.equal(response.status, 503, route);
        assert.deepEqual(await response.json(), { error: 'checkout_unavailable' }, route);
        assert.equal(response.headers.get('cache-control'), 'private, no-store', route);
        assert.deepEqual(harness.unexpected, [], route);
      }
    }
  }
});

test('GEO cold signup mock pay page actual default export throws 404 before props or effects', () => {
  const page = 'src/app/(product)/geo/signup/pay/[sessionId]/page.tsx';
  for (const nodeEnv of ['development', 'test', 'production']) {
    const harness = disabledGeoModule(page, nodeEnv, {
      name: 'next/navigation', value: { notFound: () => { throw new Error('NEXT_HTTP_ERROR_FALLBACK;404'); } },
    });
    assert.deepEqual(Object.keys(harness.exports).sort(), ['default', 'metadata']);
    assert.equal(harness.exports.metadata.robots.index, false);
    assert.throws(() => harness.exports.default(harness.trapped({
      params: { sessionId: 'synthetic-session' },
      get then() { throw new Error('props thenable getter'); },
    })), /NEXT_HTTP_ERROR_FALLBACK;404/);
    assert.deepEqual(harness.unexpected, []);
  }
});

const syntheticRecipient = 'notify@invalid.example';
const syntheticLead = {
  name: 'Synthetic Name', phone: '000-0000', privacyAccepted: true,
  email: 'lead@invalid.example', service: 'seo', message: 'Synthetic message',
  source: 'contact-page', ref: 'synthetic-ref', utm_source: 'test-source',
  utm_medium: 'test-medium', utm_campaign: 'test-campaign',
};
const syntheticMailEnv = {
  SMTP_HOST: 'smtp.invalid.example', SMTP_USER: 'sender@invalid.example',
  SMTP_PASS: 'synthetic-not-a-secret', LEAD_NOTIFY_EMAIL: syntheticRecipient,
};

function syntheticLeadModule(env = syntheticMailEnv, sendMail = async () => ({ accepted: [syntheticRecipient], rejected: [] })) {
  const unexpected = [];
  const sends = [];
  const relativePath = 'src/app/api/lead/route.ts';
  const code = ts.transpileModule(read(relativePath), {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const deny = name => { unexpected.push(name); throw new Error(`forbidden: ${name}`); };
  const exports = {};
  const NextResponse = class extends Response {
    static json(body, options) { return Response.json(body, options); }
  };
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'next/server') return { NextResponse };
      if (name === 'nodemailer') return { createTransport: options => {
        assert.equal(options.host, env.SMTP_HOST);
        assert.equal(options.auth.user, env.SMTP_USER);
        assert.equal(options.auth.pass, env.SMTP_PASS);
        return { sendMail: mail => { sends.push(mail); return sendMail(mail); } };
      } };
      return deny(`import: ${name}`);
    },
    process: new Proxy({ env: new Proxy(env, {
      get: (target, name) => {
        if (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PORT', 'SMTP_SECURE', 'LEAD_NOTIFY_EMAIL'].includes(name)) return target[name];
        return deny(`ambient env: ${String(name)}`);
      },
    }) }, { get: (target, name) => name === 'env' ? target.env : deny(`process.${String(name)}`) }),
    fetch: () => deny('fetch'),
    WebSocket: function () { deny('WebSocket'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest'); },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: relativePath });
  const request = body => ({
    headers: { get: name => name === 'origin' ? 'https://wao.co.il' : null },
    json: async () => body,
  });
  return { exports, unexpected, sends, request };
}

async function assertLeadReply(harness, body, status, expected = { ok: false }) {
  const response = await harness.exports.POST(harness.request(body));
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), expected);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://wao.co.il');
  assert.deepEqual(harness.unexpected, []);
}

test('shared lead actual POST rejects missing configuration and malformed recipient without sends', async () => {
  for (const key of Object.keys(syntheticMailEnv)) {
    const harness = syntheticLeadModule({ ...syntheticMailEnv, [key]: undefined });
    await assertLeadReply(harness, syntheticLead, 503);
    assert.equal(harness.sends.length, 0, key);
  }
  for (const recipient of ['bad', 'one@invalid.example,two@invalid.example', 'bad\n@invalid.example']) {
    const harness = syntheticLeadModule({ ...syntheticMailEnv, LEAD_NOTIFY_EMAIL: recipient });
    await assertLeadReply(harness, syntheticLead, 503);
    assert.equal(harness.sends.length, 0);
  }
});

test('shared lead actual POST rejects consent, blank fields, and oversized or invalid fields before mail', async () => {
  const inputs = [
    { ...syntheticLead, privacyAccepted: undefined },
    { ...syntheticLead, privacyAccepted: false },
    { ...syntheticLead, privacyAccepted: 'true' },
    { ...syntheticLead, name: '  ' },
    { ...syntheticLead, phone: '', email: '' },
    { ...syntheticLead, phone: undefined, email: undefined },
    { ...syntheticLead, phone: '  ', email: 'bad' },
    { ...syntheticLead, phone: undefined, email: 'bad@invalid' },
    { ...syntheticLead, phone: undefined, email: 'bad\n@invalid.example' },
    { ...syntheticLead, phone: undefined, email: ['lead@invalid.example'] },
    { ...syntheticLead, name: 'x'.repeat(121) },
    { ...syntheticLead, phone: 'x'.repeat(41) },
    { ...syntheticLead, email: 'x'.repeat(255) },
    { ...syntheticLead, service: 'x'.repeat(61) },
    { ...syntheticLead, message: 'x'.repeat(4001) },
    { ...syntheticLead, source: 'x'.repeat(121) },
    { ...syntheticLead, ref: 'x'.repeat(201) },
    { ...syntheticLead, utm_source: 'x'.repeat(201) },
    { ...syntheticLead, utm_medium: 'x'.repeat(201) },
    { ...syntheticLead, utm_campaign: 'x'.repeat(201) },
    { ...syntheticLead, name: 'bad\r\nheader' },
    { ...syntheticLead, message: { toString: () => { throw new Error('PII marker'); } } },
    null,
  ];
  const harness = syntheticLeadModule();
  for (const input of inputs) await assertLeadReply(harness, input, 400);
  assert.equal(harness.sends.length, 0);
});

test('shared lead actual POST succeeds only after configured recipient transport acknowledgement', async () => {
  let acknowledge;
  const harness = syntheticLeadModule(syntheticMailEnv, () => new Promise(resolve => { acknowledge = resolve; }));
  const pending = harness.exports.POST(harness.request(syntheticLead));
  let settled = false;
  pending.then(() => { settled = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(harness.sends.length, 1);
  assert.equal(settled, false, 'POST waits for transport acknowledgement');
  assert.equal(harness.sends[0].to, syntheticRecipient);
  assert.match(harness.sends[0].text, /utm_source=test-source/);
  assert.match(harness.sends[0].text, /synthetic-ref/);
  acknowledge({ accepted: [syntheticRecipient], rejected: [] });
  const response = await pending;
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.deepEqual(harness.unexpected, []);
});

test('shared lead actual POST fails closed for wrong, empty, rejected, or throwing mail transport', async () => {
  const outcomes = [
    { accepted: [], rejected: [] },
    { accepted: ['other@invalid.example'], rejected: [] },
    { accepted: [syntheticRecipient], rejected: [syntheticRecipient] },
    { accepted: null },
  ];
  for (const outcome of outcomes) {
    const harness = syntheticLeadModule(syntheticMailEnv, async () => outcome);
    await assertLeadReply(harness, syntheticLead, 503);
    assert.equal(harness.sends.length, 1);
  }
  const harness = syntheticLeadModule(syntheticMailEnv, async () => { throw new Error('PII marker: synthetic transport fault'); });
  await assertLeadReply(harness, syntheticLead, 503);
  assert.equal(harness.sends.length, 1);
});

test('shared lead actual POST accepts checked-consent phone or valid email-only after transport', async () => {
  for (const contact of [
    { phone: '000-0000', email: undefined },
    { phone: undefined, email: 'lead@invalid.example' },
    { phone: '  ', email: 'lead@invalid.example' },
  ]) {
    let acknowledge;
    const harness = syntheticLeadModule(syntheticMailEnv, () => new Promise(resolve => { acknowledge = resolve; }));
    const pending = harness.exports.POST(harness.request({ ...syntheticLead, ...contact }));
    let settled = false;
    pending.then(() => { settled = true; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(harness.sends.length, 1);
    assert.equal(settled, false);
    assert.equal(harness.sends[0].to, syntheticRecipient);
    assert.match(harness.sends[0].text, /synthetic-ref/);
    acknowledge({ accepted: [syntheticRecipient], rejected: [] });
    assert.equal((await pending).status, 200);
    assert.deepEqual(harness.unexpected, []);
  }
});

test('shared lead form transmits checked consent without losing attribution or non-2xx error UI', () => {
  const source = read('src/components/ContactForm.tsx');
  assert.match(source, /if \(!form\.name\.trim\(\) \|\| !form\.phone\.trim\(\) \|\| !privacyAccepted\) return;/);
  assert.match(source, /body: JSON\.stringify\(\{\s*\.\.\.form,\s*privacyAccepted: true,\s*source,\s*ref: tracking\.ref/);
  for (const field of ['utm_source', 'utm_medium', 'utm_campaign']) assert.match(source, new RegExp(`${field}: tracking\\.${field}`));
  assert.match(source, /setStatus\(accepted \? "success" : "error"\)/);
  assert.match(source, /disabled=\{status === "loading" \|\| !form\.name\.trim\(\) \|\| !form\.phone\.trim\(\) \|\| !privacyAccepted\}/);
});

function syntheticContactForm(reply) {
  const relativePath = 'src/components/ContactForm.tsx';
  const code = ts.transpileModule(read(relativePath), {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`forbidden: ${name}`); };
  const states = [];
  let cursor = 0;
  const events = [];
  const posts = [];
  const privacyComponent = function PrivacyConsent() {};
  const element = (type, props) => ({ type, props });
  const exports = {};
  const tracking = { ref: 'synthetic-ref', utm_source: 'synthetic-source',
    utm_medium: 'synthetic-medium', utm_campaign: 'synthetic-campaign' };
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'react') return { useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      } };
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === './PrivacyConsent') return { __esModule: true, default: privacyComponent };
      if (name === '@/lib/useLeadTracking') return { useLeadTracking: () => tracking };
      return deny(`import: ${name}`);
    },
    fetch: (url, options) => {
      assert.equal(url, '/api/lead');
      assert.equal(options.method, 'POST');
      posts.push(JSON.parse(options.body));
      return reply();
    },
    window: { dataLayer: events },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    WebSocket: function () { deny('WebSocket'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest'); },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: relativePath });
  const render = () => { cursor = 0; return exports.default({ source: 'synthetic-contact' }); };
  const find = (tree, predicate) => {
    if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean);
    if (!tree || typeof tree !== 'object') return undefined;
    if (predicate(tree)) return tree;
    return find(tree.props?.children, predicate);
  };
  return { render, find, privacyComponent, states, events, posts, unexpected };
}

test('contact form actual submit requires parsed 2xx lead acknowledgement for conversion', async () => {
  const replies = [
    { label: 'acknowledged', status: 200, body: '{"ok":true}', success: true },
    { label: 'created acknowledgement', status: 201, body: '{"ok":true}', success: true },
    { label: 'negative', status: 200, body: '{"ok":false}' },
    { label: 'missing ok', status: 200, body: '{}' },
    { label: 'string ok', status: 200, body: '{"ok":"true"}' },
    { label: 'null body', status: 200, body: 'null' },
    { label: 'array body', status: 200, body: '[{"ok":true}]' },
    { label: 'malformed', status: 200, body: '{"ok":' },
    { label: 'empty 200', status: 200, body: '' },
    { label: 'empty 204', status: 204, body: null },
    { label: 'non-2xx even with ok', status: 503, body: '{"ok":true}' },
    { label: 'rejected fetch', reject: true },
  ];
  for (const fixture of replies) {
    const harness = syntheticContactForm(() => fixture.reject
      ? Promise.reject(new Error('synthetic transport fault'))
      : Promise.resolve(new Response(fixture.body, { status: fixture.status })));
    let tree = harness.render();
    harness.find(tree, node => node.props?.id === 'cf-name').props.onChange({ target: { value: 'Synthetic Name' } });
    harness.find(tree, node => node.props?.id === 'cf-phone').props.onChange({ target: { value: '000-0000' } });
    harness.find(tree, node => node.type === harness.privacyComponent).props.onChange(true);
    tree = harness.render();
    assert.equal(harness.find(tree, node => node.type === 'button').props.disabled, false, fixture.label);
    let prevented = false;
    const submit = tree.props.onSubmit({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true, fixture.label);
    assert.equal(harness.find(harness.render(), node => node.type === 'button').props.disabled, true, fixture.label);
    await submit;
    tree = harness.render();
    assert.equal(tree.type === 'form', !fixture.success, fixture.label);
    assert.equal(harness.states[2], fixture.success ? 'success' : 'error', fixture.label);
    assert.equal(harness.events.length, fixture.success ? 1 : 0, fixture.label);
    if (fixture.success) assert.deepEqual({ ...harness.events[0] }, {
      event: 'lead_submit', source: 'synthetic-contact', ref: 'synthetic-ref',
    }, fixture.label);
    assert.equal(harness.posts.length, 1, fixture.label);
    assert.deepEqual({ ...harness.posts[0] }, {
      name: 'Synthetic Name', phone: '000-0000', email: '', service: '', message: '',
      privacyAccepted: true, source: 'synthetic-contact', ref: 'synthetic-ref',
      utm_source: 'synthetic-source', utm_medium: 'synthetic-medium',
      utm_campaign: 'synthetic-campaign',
    }, fixture.label);
    assert.deepEqual(harness.unexpected, [], fixture.label);
  }
});

function syntheticLightForm(reply) {
  const relativePath = 'src/components/LeadFormLight.tsx';
  const code = ts.transpileModule(read(relativePath), {
    fileName: relativePath,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const unexpected = [];
  const deny = name => { unexpected.push(name); throw new Error(`forbidden: ${name}`); };
  const states = [];
  let cursor = 0;
  const events = [];
  const posts = [];
  const privacyComponent = function PrivacyConsent() {};
  const element = (type, props) => ({ type, props });
  const exports = {};
  const tracking = { ref: 'synthetic-ref', utm_source: 'synthetic-source',
    utm_medium: 'synthetic-medium', utm_campaign: 'synthetic-campaign' };
  vm.runInNewContext(code, {
    exports,
    require: name => {
      if (name === 'react') return { useState: initial => {
        const index = cursor++;
        if (!(index in states)) states[index] = initial;
        return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
      } };
      if (name === 'react/jsx-runtime') return { jsx: element, jsxs: element };
      if (name === './PrivacyConsent') return { __esModule: true, default: privacyComponent };
      if (name === './PhoneReveal') return { __esModule: true, default: function PhoneReveal() {} };
      if (name === '@/lib/useLeadTracking') return { useLeadTracking: () => tracking };
      return deny(`import: ${name}`);
    },
    fetch: (url, options) => {
      assert.equal(url, '/api/lead');
      assert.equal(options.method, 'POST');
      assert.equal(options.headers['Content-Type'], 'application/json');
      const body = JSON.parse(options.body);
      posts.push(body);
      return reply(body);
    },
    window: { dataLayer: events },
    console: new Proxy({}, { get: (_, name) => deny(`console.${String(name)}`) }),
    WebSocket: function () { deny('WebSocket'); },
    XMLHttpRequest: function () { deny('XMLHttpRequest'); },
    setTimeout: () => deny('setTimeout'),
    setInterval: () => deny('setInterval'),
  }, { filename: relativePath });
  const render = () => { cursor = 0; return exports.default({ source: 'synthetic-light' }); };
  const find = (tree, predicate) => {
    if (Array.isArray(tree)) return tree.map(child => find(child, predicate)).find(Boolean);
    if (!tree || typeof tree !== 'object') return undefined;
    if (predicate(tree)) return tree;
    return find(tree.props?.children, predicate);
  };
  return { render, find, privacyComponent, states, events, posts, unexpected };
}

test('light form actual submit reaches POST for phone and email only after acknowledged transport', async () => {
  for (const contact of ['000-0000', 'lead@invalid.example']) {
    let acknowledge;
    const route = syntheticLeadModule(syntheticMailEnv, () => new Promise(resolve => { acknowledge = resolve; }));
    const harness = syntheticLightForm(body => route.exports.POST(route.request(body)));
    let tree = harness.render();
    harness.find(tree, node => node.props?.id === 'lfl-name').props.onChange({ target: { value: 'Synthetic Name' } });
    harness.find(tree, node => node.props?.id === 'lfl-contact').props.onChange({ target: { value: contact } });
    harness.find(tree, node => node.props?.id === 'lfl-qualified').props.onChange({ target: { checked: true } });
    harness.find(tree, node => node.type === harness.privacyComponent).props.onChange(true);
    tree = harness.render();
    assert.equal(harness.find(tree, node => node.type === 'button').props.disabled, false);
    let prevented = false;
    const pending = tree.props.onSubmit({ preventDefault: () => { prevented = true; } });
    assert.equal(prevented, true);
    assert.equal(harness.find(harness.render(), node => node.type === 'button').props.disabled, true);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(route.sends.length, 1);
    assert.equal(harness.events.length, 0);
    assert.equal(harness.states[3], 'loading');
    acknowledge({ accepted: [syntheticRecipient], rejected: [] });
    await pending;
    assert.equal(harness.states[3], 'success');
    assert.equal(harness.render().type === 'form', false);
    assert.deepEqual(harness.events.map(event => ({ ...event })), [
      { event: 'lead_submit', source: 'synthetic-light', ref: 'synthetic-ref' },
    ]);
    assert.equal(harness.posts.length, 1);
    assert.deepEqual({ ...harness.posts[0], message: undefined }, {
      name: 'Synthetic Name',
      ...(contact.includes('@') ? { email: contact } : { phone: contact }),
      privacyAccepted: true, message: undefined, source: 'synthetic-light', ref: 'synthetic-ref',
      utm_source: 'synthetic-source', utm_medium: 'synthetic-medium',
      utm_campaign: 'synthetic-campaign',
    });
    assert.ok(harness.posts[0].message.includes('Google Search Console'));
    assert.deepEqual(route.unexpected, []);
    assert.deepEqual(harness.unexpected, []);
  }
});

test('light form guards blank contact and unchecked consent without fetch or conversion', async () => {
  for (const contact of ['', '000-0000', 'lead@invalid.example']) {
    const harness = syntheticLightForm(() => { throw new Error('unexpected fetch'); });
    let tree = harness.render();
    harness.find(tree, node => node.props?.id === 'lfl-name').props.onChange({ target: { value: 'Synthetic Name' } });
    harness.find(tree, node => node.props?.id === 'lfl-contact').props.onChange({ target: { value: contact } });
    tree = harness.render();
    assert.equal(harness.find(tree, node => node.type === 'button').props.disabled, true);
    await tree.props.onSubmit({ preventDefault() {} });
    assert.deepEqual(harness.posts, []);
    assert.deepEqual(harness.events, []);
    assert.equal(harness.states[3], 'idle');
    assert.deepEqual(harness.unexpected, []);
  }
});

test('light form actual submit requires parsed 2xx acknowledgement for both modes', async () => {
  const replies = [
    { label: 'acknowledged 200', status: 200, body: '{"ok":true}', success: true },
    { label: 'acknowledged 201', status: 201, body: '{"ok":true}', success: true },
    { label: 'negative', status: 200, body: '{"ok":false}' },
    { label: 'missing ok', status: 200, body: '{}' },
    { label: 'string ok', status: 200, body: '{"ok":"true"}' },
    { label: 'null body', status: 200, body: 'null' },
    { label: 'array body', status: 200, body: '[{"ok":true}]' },
    { label: 'malformed', status: 200, body: '{"ok":' },
    { label: 'empty 200', status: 200, body: '' },
    { label: 'empty 204', status: 204, body: null },
    { label: 'non-2xx with ok', status: 503, body: '{"ok":true}' },
    { label: 'rejected fetch', reject: true },
  ];
  for (const contact of ['000-0000', 'lead@invalid.example']) {
    for (const fixture of replies) {
      const harness = syntheticLightForm(() => fixture.reject
        ? Promise.reject(new Error('synthetic fault'))
        : Promise.resolve(new Response(fixture.body, { status: fixture.status })));
      let tree = harness.render();
      harness.find(tree, node => node.props?.id === 'lfl-name').props.onChange({ target: { value: 'Synthetic Name' } });
      harness.find(tree, node => node.props?.id === 'lfl-contact').props.onChange({ target: { value: contact } });
      harness.find(tree, node => node.type === harness.privacyComponent).props.onChange(true);
      tree = harness.render();
      await tree.props.onSubmit({ preventDefault() {} });
      assert.equal(harness.states[3], fixture.success ? 'success' : 'error', fixture.label);
      assert.equal(harness.render().type === 'form', !fixture.success, fixture.label);
      assert.equal(harness.events.length, fixture.success ? 1 : 0, fixture.label);
      if (fixture.success) assert.deepEqual({ ...harness.events[0] }, {
        event: 'lead_submit', source: 'synthetic-light', ref: 'synthetic-ref',
      }, fixture.label);
      assert.equal(harness.posts.length, 1, fixture.label);
      assert.deepEqual(harness.unexpected, [], fixture.label);
    }
  }
});
