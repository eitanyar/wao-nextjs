/**
 * Test-only side-effect module: import it FIRST in a test file whose code under test writes per-client files through
 * dataRoots.clientsDir() (some modules read it once at load time). It points WAO_CLIENTS_DIR at a fresh scratch dir for
 * that test process, so no test writes under data/clients/ (live production data). Every client's client.json is copied
 * in (the source is only read), so tests that read a client record keep working; the scratch dir is removed on exit.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const SCRATCH_CLIENTS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'wao-test-clients-'));

const source = path.join(process.cwd(), 'data', 'clients');
for (const entry of fs.existsSync(source) ? fs.readdirSync(source, { withFileTypes: true }) : []) {
  const record = path.join(source, entry.name, 'client.json');
  if (!entry.isDirectory() || !fs.existsSync(record)) continue;
  fs.mkdirSync(path.join(SCRATCH_CLIENTS_DIR, entry.name), { recursive: true });
  fs.copyFileSync(record, path.join(SCRATCH_CLIENTS_DIR, entry.name, 'client.json'));
}
process.env.WAO_CLIENTS_DIR = SCRATCH_CLIENTS_DIR;
process.on('exit', () => fs.rmSync(SCRATCH_CLIENTS_DIR, { recursive: true, force: true }));
