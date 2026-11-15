import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createLeadsStore } from './leadsStore';
import { FORM_DEDUPE_WINDOW_MS, intakeSiteLead, originMatchesTenant, resolveLeadTenant, type LeadIntakeInput, type TenantLookup } from './siteLeadIntake';
import { readSiteRecord } from './siteLeadTenantLookup';
import { leadOwnedByClient } from './ownership';
import type { LeadRecord } from './intelligence';

// Temp dirs only: nothing here touches data/ or src/data/leads.json.
function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'wao-site-lead-'));
}

function tempStore() {
  const dir = tempDir();
  const filePath = path.join(dir, 'leads.json');
  return { store: createLeadsStore({ filePath }), filePath };
}

const SITES: Record<string, { slug: string; ownerDomain?: string; canonicalOrigin?: string }> = {
  'test-rehearsal-2511': { slug: 'test-rehearsal-2511' },
  'owner-site': { slug: 'owner-site', ownerDomain: 'owner-example.co.il', canonicalOrigin: 'https://www.owner-example.co.il' },
};
const CAMPAIGNS: Record<string, { slug: string; clientId?: string; customerId?: string }> = {
  'plumber-lp': { slug: 'plumber-lp', clientId: 'ads-client', customerId: '111-111-1111' },
  'orphan-lp': { slug: 'orphan-lp', customerId: '222-222-2222' },
};
const lookup: TenantLookup = {
  siteRecord: (slug) => SITES[slug] ?? null,
  campaign: (slug) => CAMPAIGNS[slug] ?? null,
  clientCustomerIds: () => [],
};

const NOW = new Date('2026-11-25T15:00:00.000Z');

function formInput(overrides: Partial<LeadIntakeInput> = {}): LeadIntakeInput {
  return {
    kind: 'form',
    form: { name: 'Test Person', phone: '050-1234567', source: 'site-test-rehearsal-2511' },
    slug: 'test-rehearsal-2511',
    customerId: '',
    orderId: 'mhx1abcde',
    origin: 'https://test-rehearsal-2511.wao.co.il',
    ...overrides,
  };
}

function quietDeps(store: ReturnType<typeof tempStore>['store'], logs: string[] = [], now = NOW) {
  return { store, lookup, now: () => now, log: (message: string) => { logs.push(message); } };
}

test('mapping: a Site Bot slug resolves to clientId = slug with subdomain + owner hosts; an LP slug to its campaign client', () => {
  const site = resolveLeadTenant('test-rehearsal-2511', lookup);
  assert.deepEqual(site && { kind: site.kind, clientId: site.clientId, hosts: site.hosts }, {
    kind: 'site', clientId: 'test-rehearsal-2511', hosts: ['test-rehearsal-2511.wao.co.il'],
  });
  const owner = resolveLeadTenant('owner-site', lookup)!;
  assert.deepEqual(owner.hosts.sort(), ['owner-example.co.il', 'owner-site.wao.co.il', 'www.owner-example.co.il']);
  const lp = resolveLeadTenant('plumber-lp', lookup)!;
  assert.equal(lp.kind, 'lp');
  assert.equal(lp.clientId, 'ads-client');
  assert.deepEqual(lp.hosts, ['plumber-lp.wao.co.il']);
  // Unknown slug, campaign without a client, and unsafe slugs never resolve.
  assert.equal(resolveLeadTenant('nobody', lookup), null);
  assert.equal(resolveLeadTenant('orphan-lp', lookup), null);
  assert.equal(resolveLeadTenant('../etc', lookup), null);
  assert.equal(resolveLeadTenant(42, lookup), null);
});

test('origin rule: exact https host of the tenant only', () => {
  const owner = resolveLeadTenant('owner-site', lookup)!;
  assert.equal(originMatchesTenant('https://www.owner-example.co.il', owner), true);
  assert.equal(originMatchesTenant('https://owner-site.wao.co.il', owner), true);
  for (const origin of ['http://owner-site.wao.co.il', 'https://other.wao.co.il', 'https://wao.co.il', 'https://www.owner-example.co.il.evil.com',
    'https://www.owner-example.co.il:8443', '', null]) {
    assert.equal(originMatchesTenant(origin, owner), false, String(origin));
  }
});

test('verified form lead is stored under the client and visible to that client only', async () => {
  const { store } = tempStore();
  const logs: string[] = [];
  const result = await intakeSiteLead(formInput(), quietDeps(store, logs));
  assert.equal(result.stored, true);
  assert.equal(result.created, true);
  assert.equal(result.clientId, 'test-rehearsal-2511');
  assert.deepEqual(logs, []);
  const [lead] = await store.readLeads();
  assert.equal(lead.clientId, 'test-rehearsal-2511');
  assert.equal(lead.slug, 'test-rehearsal-2511');
  assert.equal(lead.name, 'Test Person');
  assert.equal(lead.status, 'new');
  assert.equal(lead.type, 'form');
  assert.equal(lead.firstResponseStatus, 'not_eligible');
  assert.equal(lead.contactConsentAt, undefined);
  assert.equal(leadOwnedByClient(lead, 'test-rehearsal-2511', null), true);
  assert.equal(leadOwnedByClient(lead, 'another-client', null), false);
});

test('origin mismatch: kept for WAO only, never assigned, slug/customerId cleared, logged', async () => {
  const { store } = tempStore();
  const logs: string[] = [];
  const result = await intakeSiteLead(formInput({ origin: 'https://evil.example.com', customerId: '111-111-1111' }), quietDeps(store, logs));
  assert.equal(result.stored, true);
  assert.equal(result.clientId, undefined);
  assert.equal(result.tenantCheck, 'origin_mismatch');
  const [lead] = await store.readLeads();
  assert.equal(lead.clientId, undefined);
  assert.equal(lead.slug, '');
  assert.equal(lead.customerId, '');
  assert.equal(lead.claimedSlug, 'test-rehearsal-2511');
  assert.equal(lead.tenantCheck, 'origin_mismatch');
  assert.equal(leadOwnedByClient(lead, 'test-rehearsal-2511', null), false);
  // An Ads client bound to that slug must not see it either.
  assert.equal(leadOwnedByClient(lead, 'x', { campaigns: [{ slug: 'test-rehearsal-2511', customerId: '111-111-1111' }] }), false);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /origin_mismatch/);
  assert.doesNotMatch(logs[0], /050|Test Person/, 'log carries no personal data');

  // A body-supplied clientId is ignored entirely.
  const forged = await intakeSiteLead({ ...formInput({ orderId: 'forged-1', origin: null }), ...{ clientId: 'test-rehearsal-2511' } } as LeadIntakeInput, quietDeps(store));
  assert.equal(forged.clientId, undefined);
  assert.equal(forged.tenantCheck, 'origin_mismatch');
});

test('unknown tenant: stored for WAO with tenantCheck unknown_tenant; no slug => nothing stored', async () => {
  const { store } = tempStore();
  const unknown = await intakeSiteLead(formInput({ slug: 'nobody', origin: 'https://nobody.wao.co.il' }), quietDeps(store));
  assert.equal(unknown.tenantCheck, 'unknown_tenant');
  assert.equal(unknown.clientId, undefined);
  const none = await intakeSiteLead(formInput({ slug: undefined }), quietDeps(store));
  assert.deepEqual(none, { stored: false, created: false });
  assert.equal((await store.readLeads()).length, 1);
});

test('customerId is kept only when it belongs to the resolved tenant', async () => {
  const { store } = tempStore();
  const lpInput = formInput({ slug: 'plumber-lp', origin: 'https://plumber-lp.wao.co.il', orderId: 'lp-1', customerId: '111-111-1111' });
  assert.equal((await intakeSiteLead(lpInput, quietDeps(store))).lead!.customerId, '111-111-1111');
  const wrong = await intakeSiteLead({ ...lpInput, orderId: 'lp-2', customerId: '999-999-9999', form: { ...lpInput.form!, phone: '052-0000000' } }, quietDeps(store));
  assert.equal(wrong.lead!.customerId, '');
  assert.equal(wrong.lead!.clientId, 'ads-client');
  const site = await intakeSiteLead(formInput({ customerId: '111-111-1111' }), quietDeps(store));
  assert.equal(site.lead!.customerId, '', 'a Site Bot client with no bound Ads campaign carries no customerId');
});

test('dedupe: same orderId, and a repeat form for the same client + phone inside the window', async () => {
  const { store } = tempStore();
  const first = await intakeSiteLead(formInput(), quietDeps(store));
  const sameOrder = await intakeSiteLead(formInput(), quietDeps(store));
  assert.equal(sameOrder.created, false);
  assert.equal(sameOrder.lead!.id, first.lead!.id);

  const soon = new Date(NOW.getTime() + 30_000);
  const retry = await intakeSiteLead(formInput({ orderId: 'retry-2', form: { name: 'Test Person', phone: '0501234567', source: 's' } }), quietDeps(store, [], soon));
  assert.equal(retry.created, false, 'same phone digits, new orderId, 30 s later = duplicate');

  const otherPhone = await intakeSiteLead(formInput({ orderId: 'other-3', form: { name: 'B', phone: '052-7654321', source: 's' } }), quietDeps(store, [], soon));
  assert.equal(otherPhone.created, true);

  const later = new Date(NOW.getTime() + FORM_DEDUPE_WINDOW_MS + 1_000);
  const again = await intakeSiteLead(formInput({ orderId: 'later-4' }), quietDeps(store, [], later));
  assert.equal(again.created, true, 'outside the window it is a new lead');
  assert.equal((await store.readLeads()).length, 3);
});

test('click events: verified tap stored with no personal data; unverified tap not stored', async () => {
  const { store } = tempStore();
  const click: LeadIntakeInput = { kind: 'click', clickType: 'phone-click', source: 'site-test-rehearsal-2511',
    slug: 'test-rehearsal-2511', customerId: '', orderId: 'tap-1', gclid: 'gclid-x', origin: 'https://test-rehearsal-2511.wao.co.il' };
  const stored = await intakeSiteLead(click, quietDeps(store));
  assert.equal(stored.stored, true);
  const [lead] = await store.readLeads() as LeadRecord[];
  assert.equal(lead.type, 'phone-click');
  assert.equal(lead.status, 'click');
  assert.equal(lead.clientId, 'test-rehearsal-2511');
  assert.equal(lead.name, null);
  assert.equal(lead.phone, null);
  assert.equal(lead.email, null);
  assert.equal(lead.gclid, null);
  assert.equal(lead.contactConsentAt, undefined);

  const forged = await intakeSiteLead({ ...click, orderId: 'tap-2', origin: 'https://evil.example.com' }, quietDeps(store));
  assert.equal(forged.stored, false);
  assert.equal(forged.tenantCheck, 'origin_mismatch');
  assert.equal((await store.readLeads()).length, 1);
});

test('readSiteRecord reads <dir>/<slug>.json and rejects unsafe slugs', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'test-rehearsal-2511.json'), JSON.stringify({ slug: 'test-rehearsal-2511', ownerDomain: 'a-b.co.il' }));
  assert.equal(readSiteRecord('test-rehearsal-2511', dir)?.ownerDomain, 'a-b.co.il');
  assert.equal(readSiteRecord('missing', dir), null);
  assert.equal(readSiteRecord('../x', dir), null);
});
