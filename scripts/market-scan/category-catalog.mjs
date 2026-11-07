#!/usr/bin/env node
// Builds config/market-scanner/category-catalog.json from cached Maps / Local Finder items.
// Hebrew Maps responses carry no `category_ids`, only localized category text (found in the
// 2026-11-07 pilot), so spec 8's fallback applies: relevance by category text. The allowlist
// in run-config.json references the ASCII ids below; the text is copied from the responses.
// No network. No Hebrew literals in this file.
import fs from 'node:fs';
import path from 'node:path';
import { categoryId } from './lib/stage2.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const cacheDir = path.resolve(ROOT, process.argv.find(a => a.startsWith('--cache-dir='))?.split('=')[1] ?? 'data/market-scan/cache');
const out = path.join(ROOT, 'config/market-scanner/category-catalog.json');

const catalog = new Map();
for (const sub of ['serp_google_maps_live_advanced', 'serp_google_local_finder_live_advanced']) {
  const dir = path.join(cacheDir, sub);
  if (!fs.existsSync(dir)) continue;
  for (const file of fs.readdirSync(dir).sort()) {
    for (const item of JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')).data.items ?? []) {
      const texts = [[item.category, 'primary'], ...(item.additional_categories ?? []).map(t => [t, 'additional'])];
      for (const [text, role] of texts) {
        if (!text) continue;
        const id = categoryId(text);
        const entry = catalog.get(id) ?? { id, category: text, primary: 0, additional: 0 };
        if (entry.category !== text) throw new Error(`category id collision: ${id}`);
        entry[role] += 1;
        catalog.set(id, entry);
      }
    }
  }
}
const entries = [...catalog.values()].sort((a, b) => (b.primary + b.additional) - (a.primary + a.additional) || a.id.localeCompare(b.id, 'en'));
fs.writeFileSync(out, `${JSON.stringify({ generated_by: 'scripts/market-scan/category-catalog.mjs', note: 'counts are occurrences across cached Maps/Local Finder items (all ranks, all pilot queries)', categories: entries }, null, 1)}\n`);
console.log(JSON.stringify({ categories: entries.length }));
