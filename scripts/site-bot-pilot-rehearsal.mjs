import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createNotebookServer,
  loadApprovedCopy,
  readDraft,
  validateDraftPayload,
  writeDraft,
} from './site-bot-pilot-intake.mjs';
import { createSyntheticPreviewRuntime } from './site-bot-local-preview.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DEFAULT_FIXTURE_PATH = join(ROOT, 'fixtures/site-bot/pilot-rehearsal.json');
const SECTION_IDS = ['businessFacts', 'mediaRights', 'leadRecipient', 'privacyRetention', 'seoDomain', 'ownershipLane'];
const ROOT_KEYS = ['schemaVersion', 'synthetic', 'scenarioId', 'intakeDraft', 'previewInput', 'stopGate'];
const PREVIEW_KEYS = ['synthetic', 'slug', 'canonicalOrigin', 'themeKey', 'heroAssetPath', 'showHeroAsset', 'collectedData', 'pages', 'graphEdges'];
const COLLECTED_DATA_KEYS = ['businessName', 'businessNiche', 'primaryService', 'vatStatus'];
const PAGE_KEYS = ['opportunityId', 'classification', 'targetPath', 'copy'];
const COPY_KEYS = [
  'heroHeadline',
  'heroSubheadline',
  'heroCta',
  'trustBarItems',
  'aboutBlurb',
  'servicesHeadline',
  'serviceItems',
  'faqHeadline',
  'faqItems',
  'guaranteeBlock',
  'reviewFeatured',
  'reviewContext',
  'responseTimeBadge',
  'scarcityLine',
  'formHeadline',
  'stickyBarLine',
  'aboutPageHeadline',
  'aboutPageBody',
  'serviceDetails',
];
const STOP_GATE = 'REHEARSAL COMPLETE - NOT REAL-WORLD APPROVAL - ALL EXTERNAL AND PUBLICATION GATES REMAIN CLOSED';

function fail(message = 'Pilot rehearsal fixture is invalid.') {
  throw new Error(message);
}

function exactKeys(value, keys) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && JSON.stringify(Object.keys(value)) === JSON.stringify(keys);
}

function isAsciiText(value) {
  return typeof value === 'string' && value.length > 0 && /^[\x20-\x7e]+$/.test(value);
}

function assertCopy(copy) {
  if (!exactKeys(copy, COPY_KEYS)) fail();
  const scalarKeys = COPY_KEYS.filter(key => !['trustBarItems', 'serviceItems', 'faqItems', 'serviceDetails', 'reviewFeatured', 'reviewContext', 'responseTimeBadge', 'scarcityLine'].includes(key));
  if (!scalarKeys.every(key => isAsciiText(copy[key]))) fail();
  if (!Array.isArray(copy.trustBarItems) || !copy.trustBarItems.every(isAsciiText)) fail();
  if (!Array.isArray(copy.serviceItems) || !copy.serviceItems.every(isAsciiText)) fail();
  if (!Array.isArray(copy.faqItems) || copy.faqItems.length !== 0) fail();
  if (!Array.isArray(copy.serviceDetails) || copy.serviceDetails.length !== 1 || !exactKeys(copy.serviceDetails[0], ['name', 'description']) || !Object.values(copy.serviceDetails[0]).every(isAsciiText)) fail();
  for (const key of ['reviewFeatured', 'reviewContext', 'responseTimeBadge', 'scarcityLine']) if (copy[key] !== null) fail();
}

function assertFixture(fixture) {
  if (!exactKeys(fixture, ROOT_KEYS) || fixture.schemaVersion !== 1 || fixture.synthetic !== true) fail();
  if (!/^fictional-[a-z0-9-]+-v1$/.test(fixture.scenarioId) || fixture.stopGate !== STOP_GATE) fail();
  if (!exactKeys(fixture.intakeDraft, ['sections', 'finalApproval']) || !exactKeys(fixture.intakeDraft.sections, SECTION_IDS)) fail();
  for (const id of SECTION_IDS) {
    const section = fixture.intakeDraft.sections[id];
    if (!exactKeys(section, ['answer', 'approved']) || !isAsciiText(section.answer) || section.approved !== false) fail();
  }
  const finalApproval = fixture.intakeDraft.finalApproval;
  if (!exactKeys(finalApproval, ['approved', 'note']) || finalApproval.approved !== false || !isAsciiText(finalApproval.note)) fail();
  if (!/synthetic/i.test(fixture.intakeDraft.sections.ownershipLane.answer) || !/local-only/i.test(fixture.intakeDraft.sections.ownershipLane.answer) || !/not real-world approval/i.test(finalApproval.note)) fail();

  const preview = fixture.previewInput;
  if (!exactKeys(preview, PREVIEW_KEYS) || preview.synthetic !== true || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(preview.slug)) fail();
  let origin;
  try {
    origin = new URL(preview.canonicalOrigin);
  } catch {
    fail();
  }
  if (origin.protocol !== 'https:' || origin.hostname !== 'fictional-rooftop-workshop.invalid' || origin.pathname !== '/' || origin.search || origin.hash) fail();
  if (preview.themeKey !== 'emergency-trades' || preview.heroAssetPath !== 'fixtures/site-bot/local-preview-hero.svg' || preview.showHeroAsset !== true) fail();
  if (!exactKeys(preview.collectedData, COLLECTED_DATA_KEYS) || !Object.values(preview.collectedData).every(isAsciiText)) fail();
  if (preview.collectedData.businessName !== 'Fictional Rooftop Workshop' || !preview.collectedData.businessNiche.includes('synthetic')) fail();
  if (!fixture.intakeDraft.sections.businessFacts.answer.includes(preview.collectedData.businessName)) fail();
  if (!Array.isArray(preview.pages) || preview.pages.length !== 3 || !Array.isArray(preview.graphEdges) || preview.graphEdges.length !== 2) fail();
  for (const page of preview.pages) {
    if (!exactKeys(page, PAGE_KEYS) || !isAsciiText(page.opportunityId) || !isAsciiText(page.classification) || !isAsciiText(page.targetPath)) fail();
    assertCopy(page.copy);
  }
  for (const edge of preview.graphEdges) if (!exactKeys(edge, ['fromId', 'toId']) || !isAsciiText(edge.fromId) || !isAsciiText(edge.toId)) fail();
  const serialized = JSON.stringify(fixture);
  if (/[\u0080-\uffff]/.test(serialized) || /(?:mailto:|tel:|wa\.me|\bhttps?:\/\/(?!fictional-rooftop-workshop\.invalid))/i.test(serialized) || /@/.test(serialized)) fail();
}

export async function loadPilotRehearsalFixture(fixturePath = DEFAULT_FIXTURE_PATH) {
  let bytes;
  let fixture;
  try {
    bytes = await readFile(fixturePath);
    if ([...bytes].some(byte => byte > 0x7f)) fail();
    fixture = JSON.parse(bytes.toString('utf8'));
  } catch (error) {
    if (error instanceof Error && /invalid/i.test(error.message)) throw error;
    fail();
  }
  assertFixture(fixture);
  return fixture;
}

function parseArgs(args) {
  const options = { intakePort: 3197, previewPort: 3198 };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!['--intake-port', '--preview-port'].includes(option) || seen.has(option) || index + 1 >= args.length) fail('Invalid arguments.');
    seen.add(option);
    const value = args[++index];
    if (!/^\d+$/.test(value)) fail('Invalid arguments.');
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) fail('Invalid arguments.');
    if (option === '--intake-port') options.intakePort = port;
    else options.previewPort = port;
  }
  if (options.intakePort === options.previewPort) fail('Invalid arguments.');
  return options;
}

function listen(server, port) {
  return new Promise((resolveListen, rejectListen) => {
    const onError = error => rejectListen(error);
    server.once('error', onError);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', onError);
      resolveListen();
    });
  });
}

function closeServer(server) {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolveClose, rejectClose) => server.close(error => error ? rejectClose(error) : resolveClose()));
}

export async function createPilotRehearsal({
  fixturePath = DEFAULT_FIXTURE_PATH,
  intakePort = 3197,
  previewPort = 3198,
  tempParent = tmpdir(),
  pollIntervalMs = 25,
  log = console.log,
} = {}) {
  if (!Number.isInteger(intakePort) || intakePort < 1024 || intakePort > 65535 || !Number.isInteger(previewPort) || previewPort < 1024 || previewPort > 65535 || intakePort === previewPort) fail('Invalid rehearsal ports.');
  if (!Number.isInteger(pollIntervalMs) || pollIntervalMs < 1) fail('Invalid rehearsal polling interval.');
  const fixture = await loadPilotRehearsalFixture(fixturePath);
  const copy = await loadApprovedCopy();
  const storageRoot = await mkdtemp(join(tempParent, 'wao-sitebot-rehearsal-'));
  let notebook;
  let notebookListening = false;
  let previewRuntime = null;
  let pollTimer = null;
  let activePoll = null;
  let monitorError = null;
  let closed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    if (pollTimer) clearTimeout(pollTimer);
    await activePoll?.catch(() => {});
    await previewRuntime?.close();
    if (notebookListening) await closeServer(notebook.server);
    await rm(storageRoot, { recursive: true, force: true });
  };

  try {
    const seeded = validateDraftPayload(fixture.intakeDraft, copy, null);
    await writeDraft(storageRoot, seeded);
    notebook = await createNotebookServer({ copy, storageRoot });
    await listen(notebook.server, intakePort);
    notebookListening = true;
    const notebookUrl = `http://127.0.0.1:${intakePort}/?token=${notebook.token}`;
    log(`NOTEBOOK_URL=${notebookUrl}`);

    const monitor = async () => {
      if (closed || previewRuntime || monitorError) return;
      try {
        const draft = await readDraft(storageRoot);
        const approved = SECTION_IDS.every(id => draft?.sections[id].approved === true) && draft?.finalApproval.approved === true;
        if (approved) {
          const runtime = await createSyntheticPreviewRuntime({ previewInput: fixture.previewInput, port: previewPort, tempParent, log });
          if (closed) await runtime.close();
          else {
            previewRuntime = runtime;
            log(fixture.stopGate);
          }
          return;
        }
      } catch (error) {
        monitorError = error;
        return;
      }
      if (!closed) pollTimer = setTimeout(() => { activePoll = monitor(); }, pollIntervalMs);
    };
    activePoll = monitor();

    return {
      notebookUrl,
      storageRoot,
      get previewUrl() { return previewRuntime?.url ?? null; },
      get previewDir() { return previewRuntime?.previewDir ?? null; },
      async waitForPreview({ timeoutMs = 5000 } = {}) {
        const started = Date.now();
        while (!previewRuntime) {
          if (monitorError) throw monitorError;
          if (closed) throw new Error('Pilot rehearsal is closed.');
          if (Date.now() - started >= timeoutMs) throw new Error('Pilot rehearsal preview timed out.');
          await new Promise(resolveWait => setTimeout(resolveWait, Math.min(pollIntervalMs, 25)));
        }
        return previewRuntime;
      },
      close,
    };
  } catch (error) {
    await close();
    throw error;
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const rehearsal = await createPilotRehearsal(options);
  const close = async () => {
    await rehearsal.close();
    process.exit(0);
  };
  process.once('SIGINT', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Pilot rehearsal startup failed.');
    process.exitCode = 1;
  });
}
