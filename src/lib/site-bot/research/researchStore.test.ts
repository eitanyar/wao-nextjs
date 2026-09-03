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

test('transitionResearchStatus allows only defined lifecycle transitions', () => {
  assert.equal(transitionResearchStatus('pending', 'researching'), 'researching');
  assert.equal(transitionResearchStatus('researching', 'architecture_ready'), 'architecture_ready');
  assert.throws(() => transitionResearchStatus('pending', 'deploy_ready'));
  assert.throws(() => transitionResearchStatus('deploy_ready', 'researching'));
});
