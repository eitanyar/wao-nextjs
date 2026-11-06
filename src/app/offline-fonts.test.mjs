import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
test('self-hosted font declarations reference nine present WOFF2 assets', () => {
  const css = fs.readFileSync(path.join(root, 'src/app/offline-fonts.css'), 'utf8');
  const urls = new Set([...css.matchAll(/url\("(\/offline-fonts\/[^"/]+\.woff2)"\)/g)].map(match => match[1]));
  assert.equal(urls.size, 9);
  for (const url of urls) {
    const file = path.join(root, 'public', url);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'wOF2');
  }
  assert.match(css, /unicode-range:/);
  assert.match(css, /font-rubik/);
  assert.match(css, /font-assistant/);
});

test('every root layout preloads the four primary font subsets', () => {
  for (const group of ['(app)', '(product)', '(standalone)']) {
    const source = fs.readFileSync(path.join(root, 'src/app', group, 'layout.tsx'), 'utf8');
    assert.equal([...source.matchAll(/preload\("\/offline-fonts\/[^"/]+\.woff2"/g)].length, 4, group);
  }
});
