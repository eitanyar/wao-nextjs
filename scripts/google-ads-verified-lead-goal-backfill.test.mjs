import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// ads-bot-phase2 spec §3 0a — the existing-account backfill. Dry run against a fixture only:
// temp clients/campaigns dirs, no credentials, no network, nothing under data/clients.

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, '..');
const script = path.join(here, 'google-ads-verified-lead-goal-backfill.mjs');
const fixture = path.join(here, 'fixtures', 'verified-lead-goal-backfill.state.json');

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'goal-backfill-'));
  const clients = path.join(root, 'clients');
  const campaigns = path.join(root, 'campaigns');
  fs.mkdirSync(path.join(clients, 'fixture-client'), { recursive: true });
  fs.mkdirSync(campaigns, { recursive: true });
  fs.writeFileSync(path.join(clients, 'fixture-client', 'google-ads.json'), JSON.stringify({
    clientId: 'fixture-client',
    campaigns: [{ slug: 'fixture-wao' }, { slug: 'fixture-founder' }, { slug: 'fixture-missing' }],
  }));
  fs.writeFileSync(path.join(campaigns, 'fixture-wao.json'), JSON.stringify({
    slug: 'fixture-wao', mode: 'test', customerId: '1725891566',
    verifiedLeadConversionResourceName: 'customers/1725891566/conversionActions/7705676785',
  }));
  fs.writeFileSync(path.join(campaigns, 'fixture-founder.json'), JSON.stringify({
    slug: 'fixture-founder', mode: 'live', customerId: '8344335641', verifiedLeadConversionResourceName: null,
  }));
  return { root, clients, campaigns };
}

function run(args, dirs) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: repo,
    encoding: 'utf8',
    env: { ...process.env, WAO_CLIENTS_DIR: dirs.clients, WAO_CAMPAIGNS_DIR: dirs.campaigns },
  });
}

function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true }).map(String).sort();
}

test('backfill dry run on a fixture: plans verified-lead-only goals, refuses the founder account, writes nothing', () => {
  const dirs = setup();
  const before = listFiles(dirs.root);
  const res = run(['--client', 'fixture-client', '--state-fixture', fixture], dirs);
  assert.equal(res.status, 0, res.stderr);
  const out = res.stdout;
  assert.match(out, /DRY RUN \(no change\)/);
  assert.match(out, /no Google calls/);
  // WAO account: 4 actions -> secondary, verified-lead stays primary; 4 customer goals and the
  // one non-verified campaign goal -> not biddable.
  assert.match(out, /plan: 4 action\(s\), 4 customer goal\(s\), 1 campaign goal\(s\)/);
  assert.doesNotMatch(out, /conversionActions\/7705676785 .*primary_for_goal/);
  assert.match(out, /conversionActions\/7705676776 \(category 13\) primary_for_goal true -> false/);
  assert.doesNotMatch(out, /QUALIFIED_LEAD~WEBSITE biddable/);
  // Founder-managed account: refused, nothing planned.
  assert.match(out, /customer 8344335641[\s\S]*REFUSED: campaign config has no verifiedLeadConversionResourceName/);
  assert.match(out, /fixture-missing: no campaign config, skipped/);
  assert.doesNotMatch(out, /applied|recorded lastGoalChangeAt|signalIntegritySince/);
  assert.deepEqual(listFiles(dirs.root), before, 'a dry run writes no file (no bidding-phase.json)');
});

test('backfill: --client is required; --state-fixture refuses --apply and --validate-only', () => {
  const dirs = setup();
  const noClient = run(['--state-fixture', fixture], dirs);
  assert.notEqual(noClient.status, 0);
  assert.match(noClient.stderr, /--client <id> is required/);
  for (const flag of ['--apply', '--validate-only']) {
    const res = run(['--client', 'fixture-client', '--state-fixture', fixture, flag], dirs);
    assert.notEqual(res.status, 0, flag);
    assert.match(res.stderr, /--state-fixture is dry-run only/);
  }
  const traversal = run(['--client', '../fixture-client', '--state-fixture', fixture], dirs);
  assert.notEqual(traversal.status, 0);
});

test('backfill script never defaults to apply and only mutates behind --apply (source guard)', () => {
  const source = fs.readFileSync(script, 'utf8');
  assert.match(source, /apply: false/);
  const applyIdx = source.indexOf('const applied = await applyVerifiedLeadOnlyGoals(customer, plan);');
  assert.ok(applyIdx > 0);
  assert.ok(source.lastIndexOf('if (!args.apply) continue;', applyIdx) > 0);
  assert.ok(source.lastIndexOf("if (mode === 'live' && !args.confirmLive)", applyIdx) > 0);
});
