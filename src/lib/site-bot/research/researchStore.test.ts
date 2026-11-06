import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getResearchPath,
  readResearchDossier,
  writeResearchDossierAtomic,
} from './researchStore';
import {
  transitionResearchStatus,
  type SiteResearchDossier,
} from './types';

const researchId = 'research-2026-09-02';

function makeDossier(): SiteResearchDossier {
  return {
    researchId,
    status: 'researching',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
    businessTruth: {
      businessName: 'Test Business',
      assertions: [],
      status: 'unknown',
    },
    evidence: [
      {
        id: 'evidence-1',
        sourceKind: 'website',
        sourceUrl: 'https://example.test/about',
        retrievedAt: '2026-09-02T10:00:00.000Z',
        confidence: 0.9,
        assertionStatus: 'verified',
        claim: 'Test claim',
      },
    ],
    evidenceEdges: [],
    keywordEvidence: [],
    serpObservations: [],
    pageOpportunities: [],
    internalLinkEdges: [],
    providerUsage: [],
    humanGates: [],
  };
}

test('writeResearchDossierAtomic round trips a dossier in the supplied temporary directory', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));

  try {
    const dossier = makeDossier();
    assert.equal(await writeResearchDossierAtomic(researchId, dossier, tmpDir), true);

    const storedPath = getResearchPath(researchId, tmpDir);
    assert.ok(storedPath);
    assert.equal(storedPath, path.join(tmpDir, researchId, 'dossier.json'));
    assert.deepEqual(await readResearchDossier(researchId, tmpDir), dossier);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('writeResearchDossierAtomic rejects a dossier with external evidence missing provenance', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));

  try {
    const dossier = makeDossier() as unknown as Record<string, unknown>;
    const evidence = dossier.evidence as Array<Record<string, unknown>>;
    delete evidence[0].sourceUrl;

    assert.equal(
      await writeResearchDossierAtomic(researchId, dossier as unknown as SiteResearchDossier, tmpDir),
      false
    );
    assert.equal(await readResearchDossier(researchId, tmpDir), null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('research store rejects traversal identifiers', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));

  try {
    const dossier = makeDossier();
    assert.equal(getResearchPath('../escape', tmpDir), null);
    assert.equal(await writeResearchDossierAtomic('../escape', dossier, tmpDir), false);
    assert.equal(await readResearchDossier('../escape', tmpDir), null);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('bounded dossier read uses one no-follow descriptor, handles short reads, and closes it', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const dossier = makeDossier();
  assert.equal(await writeResearchDossierAtomic(researchId, dossier, tmpDir), true);
  const open = fs.openSync;
  const read = fs.readSync;
  const close = fs.closeSync;
  let descriptor = -1;
  let closed = 0;
  t.mock.method(fs, 'openSync', (file: string, flags: number) => {
    assert.equal(file, getResearchPath(researchId, tmpDir));
    assert.equal(flags, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    descriptor = open(file, flags);
    return descriptor;
  });
  t.mock.method(fs, 'readSync', (fd: number, buffer: Buffer, offset: number, length: number, position: number | null) => {
    assert.equal(fd, descriptor);
    assert.equal(position, null);
    return read(fd, buffer, offset, Math.min(length, 37), position);
  });
  t.mock.method(fs, 'closeSync', (fd: number) => { assert.equal(fd, descriptor); closed++; close(fd); });
  t.mock.method(fs, 'readFileSync', () => { throw new Error('unbounded read'); });
  assert.deepEqual(await readResearchDossier(researchId, tmpDir, { bounded: true }), dossier);
  assert.equal(closed, 1);
  assert.notEqual(descriptor, -1);
});

test('bounded dossier rejects nonregular and oversized metadata before reading and closes the descriptor', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.equal(await writeResearchDossierAtomic(researchId, makeDossier(), tmpDir), true);
  const fstat = fs.fstatSync;
  const close = fs.closeSync;
  let size = 16 * 1024 * 1024 + 1;
  let regular = true;
  let closed = 0;
  let contentReads = 0;
  t.mock.method(fs, 'fstatSync', (fd: number) => ({ ...fstat(fd), size, isFile: () => regular }));
  t.mock.method(fs, 'readSync', () => { contentReads++; throw new Error('content read after rejected metadata'); });
  t.mock.method(fs, 'readFileSync', () => { contentReads++; throw new Error('unbounded read'); });
  t.mock.method(fs, 'closeSync', (fd: number) => { closed++; close(fd); });
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  size = 0;
  regular = false;
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  assert.equal(closed, 2);
  assert.equal(contentReads, 0);
});

test('post-stat dossier growth reads no more than the detection byte and closes', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.equal(await writeResearchDossierAtomic(researchId, makeDossier(), tmpDir), true);
  const fstat = fs.fstatSync;
  const close = fs.closeSync;
  let total = 0;
  let requested = 0;
  let lastLength = 0;
  let closed = 0;
  t.mock.method(fs, 'fstatSync', (fd: number) => ({ ...fstat(fd), size: 0, isFile: () => true }));
  t.mock.method(fs, 'readSync', (_fd: number, buffer: Buffer, offset: number, length: number, position: number | null) => {
    assert.equal(position, null);
    assert.ok(length > 0 && length <= 64 * 1024);
    total += length;
    requested += length;
    lastLength = length;
    assert.ok(total <= 16 * 1024 * 1024 + 1);
    buffer.fill(0x41, offset, offset + length);
    return length;
  });
  t.mock.method(fs, 'closeSync', (fd: number) => { closed++; close(fd); });
  t.mock.method(fs, 'readFileSync', () => { throw new Error('unbounded read'); });
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  assert.equal(requested, 16 * 1024 * 1024 + 1);
  assert.equal(lastLength, 1);
  assert.equal(closed, 1);
});

test('bounded dossier rejects invalid UTF-8, malformed JSON, symlinks and missing files; default remains unbounded', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  const file = getResearchPath(researchId, tmpDir);
  assert.ok(file);
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from([0xff]));
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  fs.writeFileSync(file, 'not json');
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
  fs.writeFileSync(file, JSON.stringify(makeDossier()));
  assert.deepEqual(await readResearchDossier(researchId, tmpDir), makeDossier());
  fs.rmSync(file);
  fs.symlinkSync(path.join(tmpDir, 'target.json'), file);
  assert.equal(await readResearchDossier(researchId, tmpDir, { bounded: true }), null);
});

test('default dossier reader retains legacy unbounded file reads', async t => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'research-store-test-'));
  t.after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));
  assert.equal(await writeResearchDossierAtomic(researchId, makeDossier(), tmpDir), true);
  const readFile = fs.readFileSync;
  let calls = 0;
  t.mock.method(fs, 'readFileSync', (file: string, encoding: 'utf8') => {
    calls++;
    assert.equal(file, getResearchPath(researchId, tmpDir));
    assert.equal(encoding, 'utf8');
    return readFile(file, encoding);
  });
  t.mock.method(fs, 'openSync', () => { throw new Error('bounded descriptor unexpectedly opened'); });
  assert.deepEqual(await readResearchDossier(researchId, tmpDir), makeDossier());
  assert.equal(calls, 1);
});

test('transitionResearchStatus allows only defined lifecycle transitions', () => {
  assert.equal(transitionResearchStatus('pending', 'researching'), 'researching');
  assert.equal(transitionResearchStatus('researching', 'architecture_ready'), 'architecture_ready');
  assert.throws(() => transitionResearchStatus('pending', 'deploy_ready'));
  assert.throws(() => transitionResearchStatus('deploy_ready', 'researching'));
});
