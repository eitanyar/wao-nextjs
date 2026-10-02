import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

function usage() {
  throw new Error('Usage: node scripts/site-bot-local-preview.mjs --fixture synthetic [--build-only] [--port 1024-65535]');
}

function parseArgs(args) {
  const options = { fixture: '', buildOnly: false, port: 3198 };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (seen.has(arg)) usage();
    seen.add(arg);
    if (arg === '--fixture' && args[index + 1]) options.fixture = args[++index];
    else if (arg === '--build-only') options.buildOnly = true;
    else if (arg === '--port' && args[index + 1]) options.port = Number(args[++index]);
    else usage();
  }
  if (options.fixture !== 'synthetic' || !Number.isInteger(options.port) || options.port < 1024 || options.port > 65535) usage();
  return options;
}

function contentType(path) {
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function createLocalPreviewRuntime({
  bundle,
  port = 3198,
  buildOnly = false,
  tempParent = tmpdir(),
  log = console.log,
} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Local preview port is invalid.');
  const { assertLocalPreviewBundleSafe } = await import('../dist/lib/site-bot/localPreview.js');
  assertLocalPreviewBundleSafe(bundle);
  const previewDir = await mkdtemp(join(tempParent, 'wao-sitebot-preview-'));
  let server;
  let listening = false;
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    if (listening) await new Promise((resolveClose, rejectClose) => server.close(error => error ? rejectClose(error) : resolveClose()));
    await rm(previewDir, { recursive: true, force: true });
  };
  try {
    for (const [relativePath, content] of Object.entries(bundle.files)) {
      const destination = resolve(previewDir, relativePath);
      if (!destination.startsWith(`${previewDir}${sep}`)) throw new Error('Preview output path is unsafe.');
      await mkdir(resolve(destination, '..'), { recursive: true });
      await writeFile(destination, content, 'utf8');
    }
    log(`PREVIEW_DIR=${previewDir}`);
    if (buildOnly) return { previewDir, url: null, bundle, close };
    server = createServer(async (request, response) => {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if (pathname === '/favicon.ico') {
        response.writeHead(204, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!relativePath || relativePath.includes('..') || !(relativePath in bundle.files)) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, { 'Content-Type': contentType(relativePath), 'Cache-Control': 'no-store' });
      response.end(bundle.files[relativePath]);
    });
    await new Promise((resolveListen, rejectListen) => server.once('error', rejectListen).listen(port, '127.0.0.1', resolveListen));
    listening = true;
    const url = `http://127.0.0.1:${port}/`;
    log(`PREVIEW_URL=${url}`);
    return { previewDir, url, bundle, close };
  } catch (error) {
    await close();
    throw error;
  }
}

export async function createSyntheticPreviewRuntime({
  previewInput,
  port = 3198,
  buildOnly = false,
  tempParent = tmpdir(),
  log = console.log,
} = {}) {
  if (!previewInput || previewInput.synthetic !== true || previewInput.heroAssetPath !== 'fixtures/site-bot/local-preview-hero.svg') throw new Error('Synthetic fixture is invalid.');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Synthetic preview port is invalid.');
  const heroPath = join(root, previewInput.heroAssetPath);
  const heroAsset = { sourcePath: previewInput.heroAssetPath, contents: await readFile(heroPath, 'utf8') };
  const { VERTICAL_THEMES } = await import('../dist/lib/lp/verticalThemes.js');
  const { VERTICAL_ASSETS } = await import('../dist/lib/lp/verticalAssets.js');
  const { assertLocalPreviewBundleSafe, buildSyntheticLocalPreview } = await import('../dist/lib/site-bot/localPreview.js');
  const theme = VERTICAL_THEMES[previewInput.themeKey];
  const assets = VERTICAL_ASSETS[previewInput.themeKey];
  if (!theme || !assets) throw new Error('Synthetic fixture theme is invalid.');
  const input = { ...previewInput };
  delete input.themeKey;
  delete input.heroAssetPath;
  delete input.showHeroAsset;
  const bundle = buildSyntheticLocalPreview({ ...input, theme, assets, heroAsset });
  if (previewInput.showHeroAsset === true) {
    bundle.files['index.html'] = bundle.files['index.html'].replace(
      '<main>',
      '<main><figure style="margin:0;background:#fff;text-align:center;"><img data-local-preview-hero="true" src="/assets/hero.svg" alt="" aria-hidden="true" style="display:block;width:100%;height:auto;max-height:360px;object-fit:cover;" /></figure>',
    );
    assertLocalPreviewBundleSafe(bundle);
  }
  return createLocalPreviewRuntime({ bundle, port, buildOnly, tempParent, log });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const fixturePath = join(root, 'fixtures/site-bot/local-preview.json');
  const previewInput = JSON.parse(await readFile(fixturePath, 'utf8'));
  const runtime = await createSyntheticPreviewRuntime({ previewInput, port: options.port, buildOnly: options.buildOnly });
  if (options.buildOnly) return;
  process.once('SIGINT', () => { void close().then(() => process.exit(0)); });
  process.once('SIGTERM', () => { void close().then(() => process.exit(0)); });
  async function close() {
    await runtime.close();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
