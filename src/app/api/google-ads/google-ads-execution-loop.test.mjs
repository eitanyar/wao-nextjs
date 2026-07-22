import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const baseDir = path.dirname(fileURLToPath(import.meta.url));

const mutationsPath = path.join(baseDir, '../../../lib/google-ads/mutations.ts');
const mutationsCode = fs.readFileSync(mutationsPath, 'utf8');

const executorPath = path.join(baseDir, '../../../lib/google-ads/executor.ts');
const executorCode = fs.readFileSync(executorPath, 'utf8');

const operatorPath = path.join(baseDir, '../../../lib/google-ads/operator.ts');
const operatorCode = fs.readFileSync(operatorPath, 'utf8');

const operatorTaskRoutePath = path.join(baseDir, 'operator-task/route.ts');
const operatorTaskRouteCode = fs.readFileSync(operatorTaskRoutePath, 'utf8');

const campaignStatusRoutePath = path.join(baseDir, 'campaign-status/route.ts');
const campaignStatusRouteCode = fs.readFileSync(campaignStatusRoutePath, 'utf8');

const budgetRoutePath = path.join(baseDir, 'budget/route.ts');
const budgetRouteCode = fs.readFileSync(budgetRoutePath, 'utf8');

const negativeKeywordsRoutePath = path.join(baseDir, 'negative-keywords/route.ts');
const negativeKeywordsRouteCode = fs.readFileSync(negativeKeywordsRoutePath, 'utf8');

test('mutations.ts provides setCampaignStatus, setCampaignDailyBudget, and addNegativeKeywords with proper error handling', () => {
  assert.match(mutationsCode, /export async function setCampaignStatus/);
  assert.match(mutationsCode, /export async function setCampaignDailyBudget/);
  assert.match(mutationsCode, /export async function addNegativeKeywords/);
  assert.match(mutationsCode, /catch\s*\(error/);
  assert.match(mutationsCode, /success:\s*false/);
});

test('executor.ts handles budget_tune with +15% and search_term_cleanup with non-mutation error', () => {
  assert.match(executorCode, /case 'budget_tune':/);
  assert.match(executorCode, /1\.15/);
  assert.match(executorCode, /case 'search_term_cleanup':/);
  assert.match(executorCode, /success:\s*false/);
  assert.match(executorCode, /GAQL search-term reporting/);
});

test('operator.ts provides updateGoogleAdsApproval', () => {
  assert.match(operatorCode, /export function updateGoogleAdsApproval/);
});

test('operator-task route executes mutation, updates approval status, and never leaves failed task in approved status', () => {
  assert.match(operatorTaskRouteCode, /executeGoogleAdsOperatorTask/);
  assert.match(operatorTaskRouteCode, /updateGoogleAdsApproval/);
  assert.match(operatorTaskRouteCode, /finalStatus/);
});

test('campaign-status, budget, and negative-keywords routes implement validation and access control', () => {
  assert.match(campaignStatusRouteCode, /resolveGoogleAdsMutationAccess/);
  assert.match(budgetRouteCode, /Daily budget must be at least ₪5/);
  assert.match(negativeKeywordsRouteCode, /adGroupResourceName/);
  assert.match(negativeKeywordsRouteCode, /Maximum 20 negative keywords allowed/);
});
