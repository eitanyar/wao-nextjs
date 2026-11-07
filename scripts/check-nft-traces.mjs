#!/usr/bin/env node
// Build-output guard: fail when any route's file trace (`*.nft.json`) drags project-root
// junk into the standalone bundle, or is implausibly large.
//
//   node scripts/check-nft-traces.mjs <distDir> [--max-files 3000]
//
// Why: a `path.resolve(base, `${id}.json`)` expression makes nft glob every *.json under
// cwd (an unknown later path.resolve argument may be absolute, so nft re-roots the glob).
// That traced 108k files per route locally (other .next-* build dirs) and OOM-killed the
// production build on the server. See src/lib/nftSafePaths.test.mjs for the source rule.
import fs from 'node:fs';
import path from 'node:path';

// Exact runtime-read files that legitimately live in a forbidden top-level dir.
const ALLOWED_FILES = new Set(['docs/copy/astra-authority-first-homepage-copy.json']);
const FORBIDDEN_TOP = [/^\.next/, /^releases$/, /^scratch$/, /^data$/, /^docs$/, /^handoff$/, /^artifacts$/, /^qa-screenshots/];

export function checkNftTraces(distDir, { projectRoot = process.cwd(), maxFiles = 3000 } = {}) {
  const root = path.resolve(projectRoot);
  const dist = path.resolve(root, distDir);
  const distTop = path.relative(root, dist).split(path.sep)[0];
  const serverDir = path.join(dist, 'server');
  if (!fs.existsSync(serverDir)) throw new Error(`no server output under ${dist}`);
  const problems = [];
  const counts = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.nft.json')) {
        const files = JSON.parse(fs.readFileSync(full, 'utf8')).files ?? [];
        const route = path.relative(dist, full);
        counts.push([route, files.length]);
        if (files.length > maxFiles) problems.push(`${route}: ${files.length} traced files (max ${maxFiles})`);
        const bad = new Map();
        for (const file of files) {
          const rel = path.relative(root, path.resolve(path.dirname(full), file));
          const top = rel.split(path.sep)[0];
          if (top === distTop || rel.startsWith('..') || ALLOWED_FILES.has(rel.split(path.sep).join('/'))) continue; // the active build output / outside root (node_modules hoisting)
          if (FORBIDDEN_TOP.some(rule => rule.test(top))) bad.set(top, (bad.get(top) ?? 0) + 1);
        }
        for (const [top, n] of bad) problems.push(`${route}: traces ${n} file(s) under ${top}/`);
      }
    }
  };
  walk(serverDir);
  counts.sort((a, b) => b[1] - a[1]);
  return { problems, counts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const distDir = process.argv[2];
  const maxIndex = process.argv.indexOf('--max-files');
  const maxFiles = maxIndex > 0 ? Number(process.argv[maxIndex + 1]) : 3000;
  if (!distDir) { console.error('usage: check-nft-traces.mjs <distDir> [--max-files N]'); process.exit(2); }
  const { problems, counts } = checkNftTraces(distDir, { maxFiles });
  console.log(`routes: ${counts.length}; largest: ${counts.slice(0, 5).map(([r, n]) => `${r}=${n}`).join(', ')}`);
  if (problems.length) {
    console.error(`NFT TRACE CHECK FAILED (${problems.length}):\n${problems.slice(0, 40).join('\n')}`);
    process.exit(1);
  }
  console.log('NFT TRACE CHECK OK');
}
