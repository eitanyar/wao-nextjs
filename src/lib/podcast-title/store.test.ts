import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getEpisodeAnalysisPath, getPodcastProfilePath, listEpisodeAnalyses, listPodcastProfiles, readEpisodeAnalysis, readPodcastProfile, writeEpisodeAnalysisAtomic, writePodcastProfileAtomic } from './store';
import type { PodcastProfile, StoredEpisodeAnalysis } from './types';
import { validatePodcastProfile } from './validation';

const profile: PodcastProfile = { id: 'podcast-1', name: 'Test Podcast', audience: 'Test audience', titleMinLength: 20, titleMaxLength: 100, descriptionMinLength: 80, descriptionMaxLength: 1000, seedKeywords: ['topic one'] };
function record(): StoredEpisodeAnalysis { return { schemaVersion: 1, profileId: profile.id, episodeId: 'episode-1', input: { episodeId: 'episode-1', transcript: 'x'.repeat(500) }, transcriptDigest: crypto.createHash('sha256').update('x'.repeat(500)).digest('hex'), theme: { format: 'educational', theme: 'Topic', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'Learn', listenerPromise: 'Understand', seeds: ['topic one', 'topic two'], confidence: 90 }, result: { decision: 'HUMAN_REVIEW', reason: 'Test review.', theme: { format: 'educational', theme: 'Topic', supportingTopics: [], examples: [], excludedTopics: [], listenerIntent: 'Learn', listenerPromise: 'Understand', seeds: ['topic one', 'topic two'], confidence: 90 }, keywordEvidence: [], titles: [], description: '', currentTitleScore: 0, recommendedTitleScore: 0, fallbackUsed: false, llmCallsUsed: 1 }, providerUsage: [], createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }; }

test('podcast store atomically round trips records inside an injected root', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-store-test-'));
  try {
    assert.equal(await writePodcastProfileAtomic(profile, root), true);
    assert.equal(await writeEpisodeAnalysisAtomic(record(), root), true);
    assert.equal(getPodcastProfilePath(profile.id, root), path.join(root, 'podcasts', profile.id, 'profile.json'));
    assert.equal(getEpisodeAnalysisPath(profile.id, 'episode-1', root), path.join(root, 'podcasts', profile.id, 'episodes', 'episode-1.json'));
    assert.deepEqual(await readPodcastProfile(profile.id, root), profile);
    assert.deepEqual(await readEpisodeAnalysis(profile.id, 'episode-1', root), record());
    assert.deepEqual(await listPodcastProfiles(root), [profile.id]);
    assert.deepEqual(await listEpisodeAnalyses(profile.id, root), ['episode-1']);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('podcast store rejects traversal path segments', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-store-test-'));
  try {
    assert.equal(getPodcastProfilePath('../escape', root), null);
    assert.equal(getEpisodeAnalysisPath(profile.id, '../escape', root), null);
    assert.equal(await writePodcastProfileAtomic({ ...profile, id: '../escape' }, root), false);
    assert.equal(await writeEpisodeAnalysisAtomic({ ...record(), episodeId: '../escape' }, root), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('podcast store upgrades exact legacy profiles and rejects invalid writes', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'podcast-store-test-'));
  try {
    const legacy = { ...profile, titleMinLength: 10, descriptionMinLength: 20, adminOnly: 'preserved' };
    const file = getPodcastProfilePath(profile.id, root);
    if (!file) throw new Error('expected profile path');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(legacy), 'utf8');
    const migrated = await readPodcastProfile(profile.id, root);
    assert.notEqual(migrated, null);
    assert.equal(validatePodcastProfile(migrated), true);
    assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { ...legacy, titleMinLength: 20, descriptionMinLength: 80 });
    const invalidPath = getPodcastProfilePath('invalid-1', root);
    assert.equal(await writePodcastProfileAtomic({ ...profile, id: 'invalid-1', titleMinLength: 10 }, root), false);
    assert.equal(invalidPath === null ? false : fs.existsSync(invalidPath), false);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
