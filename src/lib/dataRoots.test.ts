import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { clientsDir, dataRoot, siteResearchDir, sitesDir } from './dataRoots';

const KEYS = ['WAO_CLIENTS_DIR', 'WAO_SITES_DIR', 'WAO_SITE_RESEARCH_DIR'] as const;

function withEnv(env: Partial<Record<(typeof KEYS)[number], string>>, fn: () => void): void {
  const saved = KEYS.map(key => [key, process.env[key]] as const);
  try {
    for (const key of KEYS) delete process.env[key];
    Object.assign(process.env, env);
    fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test('defaults resolve to the identical historical cwd/data/<name> paths', () => {
  withEnv({}, () => {
    assert.equal(clientsDir(), path.join(process.cwd(), 'data', 'clients'));
    assert.equal(sitesDir(), path.join(process.cwd(), 'data', 'sites'));
    // researchStore historically used path.resolve(cwd, 'data/site-research').
    assert.equal(siteResearchDir(), path.resolve(process.cwd(), path.join('data', 'site-research')));
    for (const kind of ['clients', 'sites', 'siteResearch'] as const) {
      const root = dataRoot(kind);
      assert.equal(root.overridden, false);
      assert.equal(root.walkBase, process.cwd());
    }
  });
});

test('blank or whitespace-only overrides keep the default', () => {
  withEnv({ WAO_CLIENTS_DIR: '', WAO_SITES_DIR: '   ', WAO_SITE_RESEARCH_DIR: '\t' }, () => {
    assert.equal(clientsDir(), path.join(process.cwd(), 'data', 'clients'));
    assert.equal(sitesDir(), path.join(process.cwd(), 'data', 'sites'));
    assert.equal(siteResearchDir(), path.join(process.cwd(), 'data', 'site-research'));
  });
});

test('each override moves only its own root and anchors symlink walks at the override', () => {
  withEnv({ WAO_CLIENTS_DIR: '/tmp/wao-rehearsal/clients' }, () => {
    assert.deepEqual(dataRoot('clients'), { dir: '/tmp/wao-rehearsal/clients', walkBase: '/tmp/wao-rehearsal/clients', overridden: true });
    assert.equal(sitesDir(), path.join(process.cwd(), 'data', 'sites'));
    assert.equal(siteResearchDir(), path.join(process.cwd(), 'data', 'site-research'));
  });
  withEnv({ WAO_SITES_DIR: 'scratch/sites', WAO_SITE_RESEARCH_DIR: ' /tmp/wao-rehearsal/research ' }, () => {
    assert.equal(sitesDir(), path.resolve('scratch/sites'));
    assert.equal(siteResearchDir(), '/tmp/wao-rehearsal/research');
    assert.equal(clientsDir(), path.join(process.cwd(), 'data', 'clients'));
  });
});

test('research store resolves dossier paths under its override', async () => {
  const { getResearchPath } = await import('./site-bot/research/researchStore');
  withEnv({}, () => {
    assert.equal(getResearchPath('r-1'), path.join(process.cwd(), 'data', 'site-research', 'r-1', 'dossier.json'));
  });
  withEnv({ WAO_SITE_RESEARCH_DIR: '/tmp/wao-rehearsal/research' }, () => {
    assert.equal(getResearchPath('r-1'), '/tmp/wao-rehearsal/research/r-1/dossier.json');
    assert.equal(getResearchPath('../escape'), null);
  });
});
