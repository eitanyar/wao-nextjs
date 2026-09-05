import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve(process.cwd(), 'src/lib/podcast-title/analyzeEpisode.ts');

test('podcast runtime uses Gemini and contains no Qwen transport', () => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  assert.match(source, /callGeminiJSON/);
  assert.match(source, /gemini-3\.8-flash/);
  assert.match(source, /PODCAST_THEME_RESPONSE_JSON_SCHEMA/);
  assert.match(source, /PODCAST_WRITER_RANKING_RESPONSE_JSON_SCHEMA/);
  assert.match(source, /PODCAST_WRITER_DRAFT_RESPONSE_JSON_SCHEMA/);
  assert.match(source, /WRITER_RANKING_SYSTEM_PROMPT/);
  assert.match(source, /WRITER_DRAFT_SYSTEM_PROMPT/);
  assert.match(fs.readFileSync(path.resolve(process.cwd(), 'src/lib/ai/gemini-fast.ts'), 'utf8'), /responseJsonSchema/);
  for (const token of ['qwen-fast', 'callQwenJSON', 'qwen3.8-max', 'PODCAST_QWEN', 'QWEN_API_KEY', 'QWEN_BASE_URL']) {
    assert.equal(source.includes(token), false, `unexpected provider token: ${token}`);
  }
});
