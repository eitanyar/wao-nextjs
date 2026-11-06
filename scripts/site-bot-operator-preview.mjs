import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalPreviewRuntime } from './site-bot-local-preview.mjs';

const MAX_RECORD_BYTES = 2 * 1024 * 1024;
const MAX_HERO_BYTES = 5 * 1024 * 1024;

function usage() {
  throw new Error('Usage: node scripts/site-bot-operator-preview.mjs --record <path> --hero <path> --dossier <path> --sha256 <64 lowercase hex> [--port 1024-65535]');
}

function parseArgs(args) {
  const options = { recordPath: '', heroPath: '', dossierPath: '', sha256: '', port: 3198 };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (!['--record', '--hero', '--dossier', '--sha256', '--port'].includes(option) || seen.has(option) || index + 1 >= args.length) usage();
    seen.add(option);
    const value = args[++index];
    if (!value || value.startsWith('--')) usage();
    if (option === '--record') options.recordPath = resolve(value);
    else if (option === '--hero') options.heroPath = resolve(value);
    else if (option === '--dossier') options.dossierPath = resolve(value);
    else if (option === '--sha256') options.sha256 = value;
    else if (!/^\d+$/.test(value)) usage();
    else options.port = Number(value);
  }
  if (!options.recordPath || !options.heroPath || !options.dossierPath || !/^[0-9a-f]{64}$/.test(options.sha256) ||
    !Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) usage();
  return options;
}

async function readRegularFile(filePath, maximumBytes, label) {
  const absolutePath = resolve(filePath);
  let file;
  try {
    file = await open(absolutePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const details = await file.stat();
    if (!details.isFile()) throw new Error('Not regular');
    if (details.size > maximumBytes) throw new Error('Too large');
    const bytes = await file.readFile();
    if (bytes.length > maximumBytes) throw new Error('Too large');
    return bytes;
  } catch (error) {
    if (error instanceof Error && error.message === 'Too large') throw new Error(`${label} is too large.`);
    throw new Error(`${label} must be an existing non-symlink regular file.`);
  } finally {
    await file?.close();
  }
}

function imageMime(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  throw new Error('Hero must contain PNG, JPEG, or WebP image bytes.');
}

export async function loadOperatorPreviewInput({ recordPath, heroPath, dossierPath, sha256 } = {}) {
  if ([recordPath, heroPath, dossierPath].some(path => typeof path !== 'string' || !path) ||
    typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) {
    throw new Error('Explicit record, hero, dossier and lowercase SHA-256 are required.');
  }
  const dossierBytes = await readRegularFile(dossierPath, MAX_RECORD_BYTES, 'Dossier');
  let dossier;
  try {
    dossier = JSON.parse(dossierBytes.toString('utf8'));
  } catch {
    throw new Error('Dossier must contain valid JSON.');
  }
  const recordBytes = await readRegularFile(recordPath, MAX_RECORD_BYTES, 'Record');
  const { buildResearchedCopyReviewPacket } = await import('../dist/lib/site-bot/research/copyReviewPacket.js');
  try {
    if (buildResearchedCopyReviewPacket(recordBytes, dossier).sha256 !== sha256) {
      throw new Error('Digest mismatch.');
    }
  } catch {
    throw new Error('Record does not match the pending review dossier and SHA-256.');
  }
  let record;
  try {
    record = JSON.parse(recordBytes.toString('utf8'));
  } catch {
    throw new Error('Record must contain valid JSON.');
  }
  const heroBytes = await readRegularFile(heroPath, MAX_HERO_BYTES, 'Hero');
  const mime = imageMime(heroBytes);
  return { record, heroDataUrl: `data:${mime};base64,${heroBytes.toString('base64')}` };
}

export async function createOperatorPreviewRuntime({
  recordPath,
  heroPath,
  dossierPath,
  sha256,
  port = 3198,
  buildOnly = false,
  tempParent = tmpdir(),
  log = console.log,
} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Operator preview port is invalid.');
  const input = await loadOperatorPreviewInput({ recordPath, heroPath, dossierPath, sha256 });
  const { buildOperatorLocalPreview } = await import('../dist/lib/site-bot/localPreview.js');
  const bundle = buildOperatorLocalPreview(input);
  return createLocalPreviewRuntime({ bundle, port, buildOnly, tempParent, log });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runtime = await createOperatorPreviewRuntime(options);
  const close = async () => {
    await runtime.close();
    process.exit(0);
  };
  process.once('SIGINT', () => { void close(); });
  process.once('SIGTERM', () => { void close(); });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
