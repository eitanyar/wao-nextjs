import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCoreThirtyNodes } from '../dist/lib/lp/coreThirty.js';
import { runSiteResearch } from '../dist/lib/site-bot/research/runResearch.js';
import { buildInternalLinkGraph, buildPageOpportunityPortfolio } from '../dist/lib/site-bot/research/pagePortfolio.js';

const FIXTURE_IDS = new Set(['field', 'fixed', 'hybrid']);
const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/lib/site-bot/research/fixtures');
const FIXED_TIME = '2026-09-02T12:00:00.000Z';

function fixtureIdFromArguments(argv) {
  if (argv.length === 0) return null;
  if (argv.length === 2 && argv[0] === '--fixture' && FIXTURE_IDS.has(argv[1])) return argv[1];
  throw new Error('Only --fixture field, fixed, or hybrid is accepted.');
}

function readFixtures(argv) {
  const fixtureId = fixtureIdFromArguments(argv);
  const ids = fixtureId ? [fixtureId] : [...FIXTURE_IDS];
  return ids.map(id => JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${id}.json`), 'utf8')));
}

function providers() {
  return {
    dataForSeo: {
      async expand(seeds) {
        return { keywords: [...new Set([...seeds, 'fixture expansion'])], taskIds: ['fixture-seed'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'seed', taskIds: ['fixture-seed'], estimatedCostUsd: 0.01 }] } };
      },
      async metrics(keywords) {
        return { metrics: keywords.map(keyword => ({ keyword, searchVolume: 10, trend: [], zeroVolumeUncertain: false })), taskIds: ['fixture-metrics'], usage: { calls: 1, estimatedCostUsd: 0.02, entries: [{ operation: 'metrics', taskIds: ['fixture-metrics'], estimatedCostUsd: 0.02 }] } };
      },
      async intent(keywords) {
        return { intents: keywords.map(keyword => ({ keyword, intent: 'commercial' })), taskIds: ['fixture-intent'], usage: { calls: 1, estimatedCostUsd: 0.01, entries: [{ operation: 'intent', taskIds: ['fixture-intent'], estimatedCostUsd: 0.01 }] } };
      },
      async serps(keywords) {
        return { evidence: keywords.map(query => ({ query, taskId: 'fixture-serp', localPack: [], organic: [{ rank: 1, url: 'https://fixture.test', classification: 'local_business' }], exclusions: [] })), taskIds: ['fixture-serp'], usage: { calls: 1, estimatedCostUsd: 0.03, entries: [{ operation: 'serp', taskIds: ['fixture-serp'], estimatedCostUsd: 0.03 }] } };
      },
    },
    neuron: {
      async create(service) {
        return { id: `fixture-${service.serviceKeyword.replace(/\s+/g, '-')}`, status: 'ready', serviceKeyword: service.serviceKeyword, intentCluster: service.intentCluster, metrics: {}, titleTerms: [], metaTerms: [], h1Terms: [], h2Terms: [], bodyTerms: [], entities: [], suggestedQuestions: ['fixture question'], paaQuestions: [], contentQuestions: [], competitors: [] };
      },
      async get(queryId, service) {
        return { id: queryId, status: 'ready', serviceKeyword: service.serviceKeyword, intentCluster: service.intentCluster, metrics: {}, titleTerms: [], metaTerms: [], h1Terms: [], h2Terms: [], bodyTerms: [], entities: [], suggestedQuestions: ['fixture question'], paaQuestions: [], contentQuestions: [], competitors: [] };
      },
    },
  };
}

async function compareFixture(fixture) {
  const temporaryStore = fs.mkdtempSync(path.join(os.tmpdir(), 'site-bot-cohort-'));
  try {
    const owner = { sourceId: `fixture-${fixture.id}`, capturedAt: FIXED_TIME };
    const truthServiceModel = fixture.serviceModel === 'location' ? 'fixed' : fixture.serviceModel === 'mixed' ? 'hybrid' : fixture.serviceModel;
    const serviceability = truthServiceModel === 'fixed'
      ? { base: { value: 'fixture-base', owner }, customerTravel: { value: true, owner } }
      : truthServiceModel === 'field'
        ? { base: { value: 'fixture-base', owner }, travelBoundary: { value: 'fixture-boundary', owner }, servedAreas: [{ value: 'fixture-area', owner }] }
        : { base: { value: 'fixture-base', owner }, travelBoundary: { value: 'fixture-boundary', owner }, servedAreas: [{ value: 'fixture-area', owner }], customerTravel: { value: true, owner } };
    const research = await runSiteResearch(`cohort-${fixture.id}`, {
      businessTruth: {
        businessName: fixture.research.businessName,
        serviceModel: truthServiceModel,
        confirmedServices: fixture.research.confirmedServices.map(value => ({ value, owner })),
        moneyPriorities: fixture.research.moneyPriorities.map(value => ({ value, owner })),
        ...serviceability,
      },
      seeds: fixture.research.confirmedServices,
    }, { providers: providers(), baseDir: temporaryStore, now: () => new Date(FIXED_TIME) });
    const legacy = buildCoreThirtyNodes({ ...fixture.legacy, serviceModel: fixture.serviceModel });
    const portfolio = buildPageOpportunityPortfolio({ serviceModel: fixture.serviceModel, candidates: fixture.candidates, maxIndexedPages: fixture.maxIndexedPages });
    const links = buildInternalLinkGraph(portfolio);
    const costs = research.dossier.providerUsage.reduce((sum, item) => sum + (item.estimatedCostUsd ?? 0), 0);
    return {
      id: fixture.id,
      legacyCount: legacy.length,
      selected: portfolio.indexed.map(page => page.id),
      backlog: portfolio.backlog.map(page => page.id),
      rejected: portfolio.rejected.map(page => `${page.id}: ${page.rejectionReasons.join('; ')}`),
      held: portfolio.held.map(page => `${page.id}: ${page.rejectionReasons.join('; ')}`),
      clusters: research.dossier.keywordEvidence.map(item => item.keyword),
      provenance: research.dossier.providerUsage.map(item => `${item.provider}/${item.operation}/${item.providerRecordId}`),
      gates: portfolio.gates.map(gate => `${gate.id}: ${gate.reason}`),
      linkReachable: links.orphans.length === 0,
      calls: research.dossier.providerUsage.length,
      costUsd: costs.toFixed(2),
      faqDecision: 'not generated by architecture comparison',
      readiness: research.dossier.status,
    };
  } finally {
    fs.rmSync(temporaryStore, { recursive: true, force: true });
  }
}

function report(results) {
  const sections = ['# Research-first architecture cohort validation', '', 'All providers are mocked. Fixture input is ASCII-only. No production data directories are read or written.'];
  for (const result of results) {
    sections.push('', `## ${result.id}`, `- legacy count: ${result.legacyCount}`, `- selected: ${result.selected.join(', ')}`, `- backlog: ${result.backlog.join(', ') || 'none'}`, `- rejected: ${result.rejected.join(' | ') || 'none'}`, `- held: ${result.held.join(' | ') || 'none'}`, `- clusters: ${result.clusters.join(', ')}`, `- provenance: ${result.provenance.join(', ')}`, `- gates: ${result.gates.join(' | ') || 'none'}`, `- link reachability: ${result.linkReachable ? 'pass' : 'fail'}`, `- calls/cost: ${result.calls}/$${result.costUsd}`, `- FAQ decision: ${result.faqDecision}`, `- readiness: ${result.readiness}`);
  }
  return `${sections.join('\n')}\n`;
}

const results = [];
for (const fixture of readFixtures(process.argv.slice(2))) results.push(await compareFixture(fixture));
process.stdout.write(report(results));
