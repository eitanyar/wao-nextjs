#!/usr/bin/env node
// Site Bot visual pack, staff CLI (docs/specs/site-bot-visual-upgrades-fable52-2026-11-16.md sections 1, 2, 4).
// HEBREW-SAFETY: this file contains ZERO Hebrew bytes. All text comes from the site record and the production modules.
//
//   node scripts/site-bot-look.mjs --slug <slug> --by <staff name> [steps...]
//
// Steps run in this order, each optional:
//   --add-photo <file>          (repeatable) copy an owner-supplied photo into data/site-proof/{slug}/photos/
//   --add-logo <file>           copy an owner-supplied logo file into data/site-proof/{slug}/logo/
//   --score                     score every photo (sharp, deterministic) and print the ranked hero candidates
//   --previews [dir]            write the eligible logo variants (+ the owner file) as HTML + PNG headers to a scratch dir
//   --approve-hero <photo>      build the AVIF/WebP widths of a passing photo into img/ and record the approval
//   --approve-logo <variant|file>   lockup | icon | monogram | name | file  (generated variants must be eligible)
//   --mark-id <id>              an approved mark (e.g. plumber-3) instead of the site's deterministic pick, for --previews
//                               and --approve-logo icon (approving icon always stores the mark it showed)
//   --revoke-hero / --revoke-logo
//   --descriptor <on|off|auto>  staff display override of the header's trade descriptor line (auto = the rule)
//   --lead-words <n|auto>       staff display override: how many leading words are the bold lead (lockup); header only
//                               (both stored as logoDisplay in look.json, never in the business name; run before --previews)
//   --site-record <file>        read the business name / niche from this record instead of data/sites/{slug}.json
//
// Writes only under data/site-proof/{slug}/ (WAO_SITE_PROOF_DIR) and the preview dir. Reads data/sites/{slug}.json
// (WAO_SITES_DIR) read-only. Never touches data/clients/. The next deploy of the site picks the approvals up.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createTsRequire } from './lib/ts-require.mjs';

const tsRequire = createTsRequire();
const store = tsRequire('src/lib/site-bot/siteLookStore.ts');
const images = tsRequire('src/lib/site-bot/siteLookImages.ts');
const logos = tsRequire('src/lib/lp/siteLogo.ts');
const marks = tsRequire('src/lib/lp/logoMarks.ts');
const design = tsRequire('src/lib/lp/siteDesign.ts');
const { siteFontFiles } = tsRequire('src/lib/lp/siteFonts.ts');
const { detectVertical } = tsRequire('src/lib/lp/verticalDetect.ts');
const { VERTICAL_THEMES } = tsRequire('src/lib/lp/verticalThemes.ts');
const { dataRoot } = tsRequire('src/lib/dataRoots.ts');
const { researchedBrandCity } = tsRequire('src/lib/lp/researchedSite.ts');

const { values } = parseArgs({
  options: {
    slug: { type: 'string' }, by: { type: 'string' },
    'add-photo': { type: 'string', multiple: true }, 'add-logo': { type: 'string' },
    score: { type: 'boolean' }, previews: { type: 'string' }, 'previews-default': { type: 'boolean' },
    'approve-hero': { type: 'string' }, 'approve-logo': { type: 'string' }, 'mark-id': { type: 'string' },
    'revoke-hero': { type: 'boolean' }, 'revoke-logo': { type: 'boolean' },
    descriptor: { type: 'string' }, 'lead-words': { type: 'string' },
    'site-record': { type: 'string' }, help: { type: 'boolean' },
  },
});

function fail(message) {
  console.error(`site-bot-look: ${message}`);
  process.exit(1);
}

if (values.help || !values.slug) {
  console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n').filter(line => line.startsWith('//')).slice(0, 24).join('\n'));
  process.exit(values.help ? 0 : 1);
}
const slug = values.slug;
if (!store.isSafeLookSlug(slug)) fail('invalid slug');
const writes = Boolean(values['add-photo']?.length || values['add-logo'] || values['approve-hero'] || values['approve-logo'] || values['revoke-hero'] || values['revoke-logo'] || values.score
  || values.descriptor !== undefined || values['lead-words'] !== undefined);
const by = (values.by ?? '').trim();
if (writes && !by) fail('--by <staff name> is required for any step that records something');

const now = () => new Date().toISOString();
const dir = store.siteProofDir(slug);
const record = store.readLookRecord(slug) ?? store.emptyLookRecord(slug);
const log = (action, detail) => record.history.push({ at: now(), by, action, ...(detail ? { detail } : {}) });

// ── Site record (read-only): name, niche, service keys, theme ────────────────
function siteRecord() {
  const file = values['site-record'] ? path.resolve(values['site-record']) : path.join(dataRoot('sites').dir, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}
const site = siteRecord();
const data = site?.collectedData ?? {};
const businessName = String(data.businessName || data.businessNiche || '');
const serviceKeys = (site?.researchedPages ?? []).filter(page => page.classification !== 'homepage').map(page => page.opportunityId);
const siteTheme = VERTICAL_THEMES[detectVertical(data.businessNiche || '')];
// The descriptor city: the homepage LocalBusiness schema's areaServed[0], the renderer's own helper (one source).
const homePage = (site?.researchedPages ?? []).find(page => page.classification === 'homepage');
const brandCity = researchedBrandCity(homePage ?? {}, data);
const logoContext = { businessNiche: data.businessNiche, primaryService: data.primaryService, targetLocation: data.targetLocation, ownerName: data.ownerName, serviceKeys,
  siteId: slug, city: brandCity, colors: { primary: siteTheme.primary, accent: siteTheme.accent, surface: siteTheme.surface, muted: siteTheme.textMuted } };

// ── Display overrides (header only; the business name is never changed) ─────
if (values.descriptor !== undefined || values['lead-words'] !== undefined) {
  const next = { ...(record.logoDisplay ?? {}) };
  delete next.by; delete next.at;
  if (values.descriptor !== undefined) {
    if (!['on', 'off', 'auto'].includes(values.descriptor)) fail('--descriptor must be on, off or auto');
    if (values.descriptor === 'auto') delete next.descriptor; else next.descriptor = values.descriptor === 'on';
  }
  if (values['lead-words'] !== undefined) {
    const raw = values['lead-words'];
    if (raw === 'auto') delete next.leadWords;
    else {
      const count = logos.logoText(businessName).split(' ').filter(Boolean).length;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 1 || n >= count) fail(`--lead-words must be auto or 1..${Math.max(1, count - 1)} for this name (${count} words)`);
      next.leadWords = n;
    }
  }
  const clean = logos.cleanDisplayOverrides(next);
  if (clean) record.logoDisplay = { ...clean, by, at: now() }; else delete record.logoDisplay;
  log('logo-display', clean ? JSON.stringify(clean) : 'auto');
  console.log(`Logo display overrides: ${clean ? JSON.stringify(clean) : 'none (automatic)'}`);
}
const display = logos.cleanDisplayOverrides(record.logoDisplay);
if (display) logoContext.display = display;

// ── Ingest ───────────────────────────────────────────────────────────────────
const EXT = /\.(jpe?g|png|webp|avif|heic|heif|tiff?|svg|gif)$/i;
function ingest(file, kind) {
  const source = path.resolve(file);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) fail(`no such file: ${file}`);
  const ext = (EXT.exec(source)?.[1] ?? '').toLowerCase();
  if (!ext) fail(`unsupported file type: ${file}`);
  if (kind === 'photos' && ext === 'svg') fail('an SVG is not a photo');
  const bytes = fs.readFileSync(source);
  const hash = images.sha256(bytes);
  const relative = `${kind}/${hash.slice(0, 12)}.${ext}`;
  const list = kind === 'photos' ? record.photos : record.logoFiles;
  if (list.some(entry => entry.sha256 === hash)) { console.log(`already added: ${relative}`); return; }
  fs.mkdirSync(path.join(dir, kind), { recursive: true });
  fs.writeFileSync(path.join(dir, relative), bytes);
  list.push({ file: relative, sha256: hash, originalName: path.basename(source), addedAt: now(), addedBy: by });
  log(kind === 'photos' ? 'add-photo' : 'add-logo', relative);
  console.log(`added ${relative}  (${path.basename(source)})`);
}
for (const file of values['add-photo'] ?? []) ingest(file, 'photos');
if (values['add-logo']) ingest(values['add-logo'], 'logo');

// ── Score ────────────────────────────────────────────────────────────────────
async function scoreAll() {
  const rows = [];
  for (const entry of record.photos) {
    let score;
    try {
      score = await images.scoreHeroPhoto(fs.readFileSync(path.join(dir, entry.file)));
    } catch (error) {
      score = { pass: false, reasons: [`unreadable: ${error.message}`], rank: 0 };
    }
    entry.score = score;
    rows.push({ entry, score });
  }
  return images.rankHeroScores(rows);
}
if (values.score || values['approve-hero']) {
  const ranked = await scoreAll();
  if (values.score) log('score', `${ranked.length} photos`);
  console.log('\nHero candidates (best first):');
  if (!ranked.length) console.log('  (no photos)');
  for (const [index, { entry, score }] of ranked.entries()) {
    const metrics = score.width ? `${score.width}x${score.height} sharp ${score.sharpness} textzone ${score.textZoneDetail} contrast ${score.contrast}:1` : '';
    console.log(`  ${index + 1}. ${score.pass ? 'PASS' : 'FAIL'}  ${entry.file}  (${entry.originalName})  ${metrics}${score.pass ? `  rank ${score.rank}` : `  ${score.reasons.join(', ')}`}`);
  }
  if (ranked.length && !ranked.some(row => row.score.pass)) console.log('  No photo passes: the site keeps its solid hero.');
}

// ── Logo previews ────────────────────────────────────────────────────────────
async function previews(outDir) {
  if (!businessName.trim()) fail('no business name in the site record (use --site-record)');
  const theme = siteTheme;
  const markId = values['mark-id'];
  const pick = logos.pickLogo(businessName, { ...logoContext, ...(markId ? { markId } : {}) });
  fs.mkdirSync(path.join(outDir, 'assets', 'fonts'), { recursive: true });
  for (const [file, bytes] of Object.entries(siteFontFiles())) fs.writeFileSync(path.join(outDir, file), bytes);
  const nav = { label: 'nav', links: [{ href: '#', text: '1', home: true }, { href: '#', text: '2' }, { href: '#', text: '3' }] };
  const page = (brand, label) => `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${label}</title><style>*{box-sizing:border-box;margin:0;padding:0}${design.siteCss(theme)}${brand ? brand.css : ''}</style></head><body>${design.SITE_ICON_SPRITE}
${design.siteHeader({ businessName, phone: data.phone || '050-0000000', phoneHref: '#', nav, homeHref: '/', ...(brand ? { brandHtml: brand.html } : {}) })}
<section class="hero on-dark"><div class="hero-grid"><div class="hero-text"><p class="sub">${label}</p></div></div></section></body></html>`;
  const variants = [['today', undefined]];
  for (const variant of pick?.options ?? []) variants.push([variant, logos.generatedLogo(variant, businessName, logoContext, markId ? { markId } : {})]);
  const logoFile = record.logoFiles[record.logoFiles.length - 1];
  if (logoFile) {
    const built = await images.buildOwnerLogo(fs.readFileSync(path.join(dir, logoFile.file)));
    fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
    fs.writeFileSync(path.join(outDir, built.src), built.files[built.src]);
    fs.writeFileSync(path.join(outDir, 'logo-file.png'), built.png);
    variants.push(['file', logos.fileLogo(`/${built.src}`, built.width, built.height, businessName, logoContext)]);
  }
  const written = [];
  for (const [name, brand] of variants) {
    const file = path.join(outDir, `logo-${name}.html`);
    fs.writeFileSync(file, page(brand, name).replace(/url\(\/assets\//g, 'url(assets/').replace(/href="\/img\//g, 'href="img/'));
    written.push([name, file]);
  }
  let puppeteer = null;
  try { puppeteer = (await import('puppeteer')).default; } catch { /* PNG previews need the puppeteer devDependency */ }
  if (puppeteer) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
    try {
      for (const [name, file] of written) {
        for (const width of [360, 1440]) {
          const tab = await browser.newPage();
          await tab.setViewport({ width, height: 200 });
          await tab.goto(`file://${file}`, { waitUntil: 'load' });
          await tab.evaluate(() => document.fonts.ready);
          await tab.screenshot({ path: path.join(outDir, `logo-${name}-${width}.png`), clip: { x: 0, y: 0, width, height: 120 } });
          await tab.close();
        }
      }
    } finally {
      await browser.close();
    }
  }
  console.log(`\nLogo previews in ${outDir}${puppeteer ? ' (HTML + PNG at 360 / 1440)' : ' (HTML only: puppeteer missing)'}:`);
  if (pick) {
    console.log(`  lead "${pick.lead}" is ${pick.leadClass.toUpperCase()}; default ${pick.defaultVariant}; eligible: ${pick.options.join(', ')}${pick.markId ? `; mark ${pick.markId} (trade ${pick.trade ?? 'none: stored mark'})` : pick.icon ? `; no trade mark, sprite icon ${pick.icon} (${pick.vertical})` : '; no confident trade: no icon'}`);
    if (pick.markId) {
      const inks = marks.markColors(logoContext.colors);
      for (const [role, ink] of Object.entries(inks)) console.log(`  mark ${role}: ${ink.from} -> ${ink.color} (${ink.method}, ${ink.contrast}:1 on ${logoContext.colors.surface})`);
      if (pick.trade) console.log(`  other approved ${pick.trade} marks (--mark-id): ${marks.APPROVED_MARK_IDS[pick.trade].join(', ')}`);
    }
    console.log(`  descriptor: ${pick.descriptor ? `"${pick.descriptor.label}"${pick.descriptor.city ? ` + city "${pick.descriptor.city}"` : ' (no city part)'}` : 'none'}${display ? `  (overrides ${JSON.stringify(display)})` : ''}`);
    console.log(`  name flags (staff review): ${pick.flags.length ? pick.flags.join(', ') : 'none'}`);
    if (logos.GENERIC_LEADS_COPY_PENDING) console.log('  note: the generic-lead word list is pending copy (not applied yet)');
  } else {
    console.log('  the name is empty: no generated logo');
  }
  for (const [name, file] of written) console.log(`  ${name.padEnd(9)} ${file}`);
}
if (values.previews !== undefined || values['previews-default']) {
  await previews(path.resolve(values.previews || path.join(os.tmpdir(), 'site-bot-look', slug)));
}

// ── Approvals ────────────────────────────────────────────────────────────────
function findPhoto(ref) {
  const found = record.photos.filter(entry => entry.file === ref || entry.originalName === ref || entry.sha256.startsWith(ref) || path.basename(entry.file) === ref);
  if (found.length !== 1) fail(`--approve-hero: ${found.length ? 'ambiguous' : 'unknown'} photo "${ref}" (use the photos/... name from --score)`);
  return found[0];
}

if (values['approve-hero']) {
  const entry = findPhoto(values['approve-hero']);
  if (!entry.score?.pass) fail(`--approve-hero: ${entry.file} does not pass the scorer (${(entry.score?.reasons ?? []).join(', ')})`);
  const built = await images.buildHeroVariants(fs.readFileSync(path.join(dir, entry.file)));
  fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
  for (const [file, bytes] of Object.entries(built.files)) fs.writeFileSync(path.join(dir, file), bytes);
  record.hero = { approved: true, source: entry.file, sourceSha256: entry.sha256, approval: { by, at: now() }, score: entry.score,
    images: built.images.map(({ avifQuality, webpQuality, ...image }) => ({ ...image, avifQuality, webpQuality })) };
  log('approve-hero', entry.file);
  console.log(`\nHero approved: ${entry.file}`);
  for (const image of built.images) console.log(`  ${image.width}x${image.height}  avif ${image.avifBytes} B (q${image.avifQuality})  webp ${image.webpBytes} B (q${image.webpQuality})`);
}
if (values['revoke-hero']) {
  if (record.hero) record.hero.approved = false;
  log('revoke-hero');
  console.log('Hero approval revoked (the site returns to the solid hero on its next deploy).');
}

if (values['approve-logo']) {
  const choice = values['approve-logo'];
  if (choice === 'file') {
    const logoFile = record.logoFiles[record.logoFiles.length - 1];
    if (!logoFile) fail('--approve-logo file: add the owner logo first (--add-logo)');
    const built = await images.buildOwnerLogo(fs.readFileSync(path.join(dir, logoFile.file)));
    fs.mkdirSync(path.join(dir, 'img'), { recursive: true });
    fs.writeFileSync(path.join(dir, built.src), built.files[built.src]);
    record.logo = { approved: true, kind: 'file', source: logoFile.file, sourceSha256: logoFile.sha256, src: built.src, width: built.width, height: built.height, bytes: built.bytes, sha256: built.sha256, approval: { by, at: now() } };
    log('approve-logo', `file ${logoFile.file}`);
    console.log(`\nLogo approved: owner file ${logoFile.file} -> ${built.src} (${built.width}x${built.height} display, ${built.bytes} B)`);
  } else {
    if (!logos.GENERATED_LOGO_VARIANTS.includes(choice)) fail(`--approve-logo: unknown variant "${choice}"`);
    const requested = values['mark-id'];
    if (requested && (choice !== 'icon' || !marks.approvedMarkId(requested))) fail('--mark-id needs --approve-logo icon and an approved mark id (e.g. plumber-3; see --previews)');
    const pick = logos.pickLogo(businessName, { ...logoContext, ...(requested ? { markId: marks.approvedMarkId(requested) } : {}) });
    if (!pick || !pick.options.includes(choice)) fail(`--approve-logo: "${choice}" is not eligible for this name (eligible: ${pick ? pick.options.join(', ') : 'none'})`);
    // The icon variant stores the mark it showed (the explicit --mark-id, else the deterministic pick), so the approved
    // logo never changes under a later re-pick.
    const markId = choice === 'icon' ? pick.markId : null;
    record.logo = { approved: true, kind: 'generated', variant: choice, ...(choice === 'icon' && pick.icon ? { icon: pick.icon } : {}), ...(markId ? { markId } : {}), approval: { by, at: now() } };
    log('approve-logo', markId ? `${choice} ${markId}` : choice);
    console.log(`\nLogo approved: generated ${choice}${choice === 'icon' ? (markId ? ` (mark ${markId})` : ` (sprite icon ${pick.icon})`) : ''}`);
  }
}
if (values['revoke-logo']) {
  if (record.logo) record.logo.approved = false;
  log('revoke-logo');
  console.log("Logo approval revoked (the header returns to today's text name on the next deploy).");
}

if (writes) {
  store.writeLookRecord(record);
  console.log(`\nRecorded in ${path.join(dir, 'look.json')}`);
}
