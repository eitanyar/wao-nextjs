import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { ADAM_SYSTEM_PROMPT, type CollectedData } from '../bot/prompts';
import {
  adImageSourceUrls,
  applyUpload,
  buildUploadTurnsPrompt,
  carryUploadFields,
  galleryImageAlt,
  galleryPhotoUrls,
  isIntakeUploadUrl,
  isSingleImageUpload,
  logoUpload,
  pickHeroImageUrl,
  resolveUploadStrings,
  UPLOAD_STRING_KEYS,
  uploadFeatures,
  uploadKindFor,
  workPhotos,
} from './intakeUploads';

// Test-only strings: one Hebrew letter (alef, by escape) so they pass the "has a Hebrew letter" guard. Not copy.
const A = '\u05D0';
const FILLED = resolveUploadStrings(Object.fromEntries(UPLOAD_STRING_KEYS.map(key => [key, `${A} ${key}`])));
const STOCK = 'https://images.unsplash.com/stock.jpg';
const u = (name: string) => `/uploads/s-1/${name}.jpg`;

test('strings: empty, Latin-only or bad-placeholder values are missing; features stay off', () => {
  const none = resolveUploadStrings({});
  for (const key of UPLOAD_STRING_KEYS) assert.equal(none[key], null);
  assert.deepEqual(uploadFeatures(none), { logoTurn: false, workPhotosTurn: false, gallery: false });

  const latin = resolveUploadStrings({ logoTurnAsk: 'Upload your logo', galleryHeading: '  ' });
  assert.equal(latin.logoTurnAsk, null);
  assert.equal(latin.galleryHeading, null);

  const placeholders = resolveUploadStrings({ galleryImageAlt: `${A} {businessName} {index}`, galleryHeading: `${A} {businessName}` });
  assert.equal(placeholders.galleryImageAlt, `${A} {businessName} {index}`);
  assert.equal(placeholders.galleryHeading, null, 'the heading allows no placeholder');
  assert.equal(resolveUploadStrings({ galleryImageAlt: `${A} {name}` }).galleryImageAlt, null);

  assert.deepEqual(uploadFeatures(FILLED), { logoTurn: true, workPhotosTurn: true, gallery: true });
  assert.deepEqual(uploadFeatures(resolveUploadStrings({ galleryHeading: `${A}` })), { logoTurn: false, workPhotosTurn: false, gallery: false });
});

test('the shipped strings file is all placeholders today (every new turn / section is off)', () => {
  assert.deepEqual(uploadFeatures(), { logoTurn: false, workPhotosTurn: false, gallery: false });
});

test('gallery alt fills {businessName} and {index}', () => {
  assert.equal(galleryImageAlt(`${A} {businessName} {index}`, 'Biz', 2), `${A} Biz 2`);
  assert.equal(galleryImageAlt(`${A} {businessName}`, '', 1), A);
});

test('upload kind = the turn it was uploaded in; logo > profile > work > trust', () => {
  assert.equal(uploadKindFor({}), 'trust');
  assert.equal(uploadKindFor({ awaitingWorkPhotos: true }), 'work');
  assert.equal(uploadKindFor({ awaitingProfilePhoto: true, awaitingWorkPhotos: true }), 'profile');
  assert.equal(uploadKindFor({ awaitingLogo: true, awaitingProfilePhoto: true }), 'logo');
  assert.equal(isSingleImageUpload('logo'), true);
  assert.equal(isSingleImageUpload('profile'), true);
  assert.equal(isSingleImageUpload('work'), false);
  assert.equal(isSingleImageUpload('trust'), false);
});

test('applyUpload: trust and profile keep the previous shape exactly; logo and work get their own fields', () => {
  const base: CollectedData = { businessName: 'B', trustAssetUrls: [u('a')] };
  assert.deepEqual(applyUpload(base, 'trust', [u('b'), u('c')]), { businessName: 'B', trustAssetUrls: [u('a'), u('b'), u('c')], hasTrustAssets: true });
  assert.deepEqual(applyUpload(base, 'profile', [u('p')]), { businessName: 'B', trustAssetUrls: [u('a')], profilePhotoUrl: u('p') });
  assert.deepEqual(applyUpload(base, 'logo', [u('l')]), { businessName: 'B', trustAssetUrls: [u('a')], logoUrl: u('l') });
  assert.deepEqual(applyUpload(base, 'work', [u('w1'), u('w2')]), {
    businessName: 'B', trustAssetUrls: [u('a'), u('w1'), u('w2')], workPhotoUrls: [u('w1'), u('w2')], hasTrustAssets: true,
  });
  assert.equal(applyUpload(base, 'logo', []), base);
});

test('hero: first work photo, else profile, else stock; never a T21 upload, never the logo', () => {
  assert.equal(pickHeroImageUrl({}, STOCK), STOCK);
  assert.equal(pickHeroImageUrl({ trustAssetUrls: [u('screenshot')] }, STOCK), STOCK, 'a T21 upload may be a screenshot');
  assert.equal(pickHeroImageUrl({ trustAssetUrls: [u('screenshot')], profilePhotoUrl: u('p') }, STOCK), u('p'));
  assert.equal(pickHeroImageUrl({ trustAssetUrls: [u('s'), u('w')], workPhotoUrls: [u('w')], profilePhotoUrl: u('p') }, STOCK), u('w'));
  assert.equal(pickHeroImageUrl({ logoUrl: u('l'), workPhotoUrls: [u('l')] }, STOCK), STOCK, 'the logo is never the hero');
  assert.equal(pickHeroImageUrl({ logoUrl: u('l'), profilePhotoUrl: u('l') }, STOCK), STOCK);
  assert.equal(pickHeroImageUrl({ workPhotoUrls: ['https://evil.test/x.jpg', '/uploads/../../etc/passwd.jpg'] }, STOCK), STOCK);
});

test('gallery: 3-6 work photos (deduped, no logo / profile), none below 3', () => {
  assert.deepEqual(galleryPhotoUrls({ workPhotoUrls: [u('1'), u('2')] }), []);
  assert.deepEqual(galleryPhotoUrls({ workPhotoUrls: [u('1'), u('2'), u('2'), u('3')] }), [u('1'), u('2'), u('3')]);
  assert.deepEqual(galleryPhotoUrls({ workPhotoUrls: [u('1'), u('2'), u('3'), u('l')], logoUrl: u('l') }), [u('1'), u('2'), u('3')]);
  assert.deepEqual(galleryPhotoUrls({ workPhotoUrls: ['1', '2', '3', '4', '5', '6', '7'].map(u) }), ['1', '2', '3', '4', '5', '6'].map(u));
  assert.deepEqual(galleryPhotoUrls({ trustAssetUrls: [u('1'), u('2'), u('3')] }), [], 'T21 uploads never reach the gallery');
  assert.deepEqual(workPhotos({ workPhotoUrls: [u('1'), u('p')], profilePhotoUrl: u('p') }), [u('1')]);
});

test('logo upload must be an intake upload URL', () => {
  assert.equal(logoUpload({ logoUrl: u('l') }), u('l'));
  assert.equal(logoUpload({ logoUrl: 'javascript:alert(1)' }), null);
  assert.equal(logoUpload({}), null);
  assert.equal(isIntakeUploadUrl('/uploads/s-1/a.webp'), true);
  assert.equal(isIntakeUploadUrl('/uploads/s-1/a.svg'), false);
  assert.equal(isIntakeUploadUrl('/uploads/s 1/a.jpg'), false);
});

test('Google ad images: never a trust upload (may be a screenshot); work photos first, then the profile photo, never the logo', () => {
  // T21 trust uploads alone (review / WhatsApp screenshots) never become ad images.
  assert.deepEqual(adImageSourceUrls({ trustAssetUrls: [u('1'), u('2'), u('3'), u('4'), u('5')] }), []);
  assert.deepEqual(adImageSourceUrls({ trustAssetUrls: [u('1'), u('2'), u('3'), u('4'), u('5')], profilePhotoUrl: u('p') }), [u('p')]);
  // A work photo is also mirrored into trustAssetUrls; it qualifies through workPhotoUrls, the screenshot next to it does not.
  assert.deepEqual(adImageSourceUrls({ trustAssetUrls: [u('s'), u('w')], workPhotoUrls: [u('w')], profilePhotoUrl: u('p') }), [u('w'), u('p')]);
  assert.deepEqual(adImageSourceUrls({ workPhotoUrls: [u('1'), u('2'), u('3'), u('4'), u('5')], profilePhotoUrl: u('p') }), [u('1'), u('2'), u('3'), u('4')]);
  const withLogo: CollectedData = { trustAssetUrls: [u('l'), u('1')], logoUrl: u('l'), profilePhotoUrl: u('l') };
  assert.deepEqual(adImageSourceUrls(withLogo), []);
  assert.deepEqual(adImageSourceUrls({ profilePhotoUrl: 'https://evil.example/x.jpg' }), [], 'only /api/upload URLs');
  assert.deepEqual(adImageSourceUrls({}), []);
});

test('create-campaign builds ad images only through adImageSourceUrls (no inline trust/screenshot fallback)', () => {
  const route = fs.readFileSync(path.join(process.cwd(), 'src/app/api/google-ads/create-campaign/route.ts'), 'utf8');
  assert.doesNotMatch(route, /trustAssetUrls/);
  assert.doesNotMatch(route, /screenshot/i);
  assert.match(route, /const sourceUrls = adImageSourceUrls\(collectedData, 4\);/);
});

test('carryUploadFields restores upload fields a live model dropped, and nothing else', () => {
  const before: CollectedData = { logoUrl: u('l'), workPhotoUrls: [u('w')], trustAssetUrls: [u('w')], hasTrustAssets: true, profilePhotoUrl: u('p'), usp: 'x' };
  assert.deepEqual(carryUploadFields(before, { businessName: 'b' }), {
    businessName: 'b', trustAssetUrls: [u('w')], hasTrustAssets: true, profilePhotoUrl: u('p'), logoUrl: u('l'), workPhotoUrls: [u('w')],
  });
  const after: CollectedData = { businessName: 'b', logoUrl: u('l2') };
  assert.equal(carryUploadFields({}, after), after, 'nothing to carry = same object');
  assert.equal(carryUploadFields(before, after)?.logoUrl, u('l2'), 'a value the model returned wins');
  assert.equal(carryUploadFields(before, undefined), undefined);
});

test('bot script: no strings = no new turns and the exact previous ADAM_SYSTEM_PROMPT', () => {
  assert.deepEqual(buildUploadTurnsPrompt(resolveUploadStrings({})), { workPhotosTurn: '', logoTurn: '', outputFields: '' });
  // sha256 of ADAM_SYSTEM_PROMPT with empty upload strings. Was a36706d7... before 2026-11-23; re-pinned when the
  // budget table became generated from src/lib/google-ads/cpc-cap.ts (that table + BUDGET LOGIC lines), and again
  // (de3be679... -> 5fa5a8fd...) when the injury row gained the lawyer-gated accident words, then (-> b9c7c588...) when
  // the lawyer row gained the plural 'lawyers' token (that row only).
  assert.equal(createHash('sha256').update(ADAM_SYSTEM_PROMPT).digest('hex'), 'b9c7c58819a9fb00548d28ad14f133efdce66d92c083d30634fe2d2834de789f');
});

test('bot script: with strings, the turns carry the ask verbatim and the awaiting flags', () => {
  const blocks = buildUploadTurnsPrompt(FILLED);
  assert.match(blocks.workPhotosTurn, /^\nT21w \[/);
  assert.ok(blocks.workPhotosTurn.includes(`"${A} workPhotosTurnAsk"`));
  assert.match(blocks.workPhotosTurn, /set awaitingWorkPhotos: true/);
  assert.match(blocks.workPhotosTurn, /do NOT use T21's \[field\/visual\] photo line/);
  assert.ok(blocks.workPhotosTurn.endsWith('\n'));
  assert.match(blocks.logoTurn, /^\nT21L \[/);
  assert.ok(blocks.logoTurn.includes(`"${A} logoTurnAsk"`));
  assert.match(blocks.logoTurn, /set awaitingLogo: true/);
  assert.equal(blocks.outputFields, ',\n  "awaitingWorkPhotos": true | false,\n  "awaitingLogo": true | false');
  const logoOnly = buildUploadTurnsPrompt(resolveUploadStrings({ logoTurnAsk: `${A}` }));
  assert.equal(logoOnly.workPhotosTurn, '');
  assert.equal(logoOnly.outputFields, ',\n  "awaitingLogo": true | false');
});

test('the prompt slots sit where the blocks expect them', () => {
  const t21c = ADAM_SYSTEM_PROMPT.indexOf('T21c [OPTIONAL');
  const t22 = ADAM_SYSTEM_PROMPT.indexOf('T22:');
  assert.ok(ADAM_SYSTEM_PROMPT.slice(0, t21c).endsWith('  → collect: hasTrustAssets\n\n'));
  assert.ok(ADAM_SYSTEM_PROMPT.slice(t21c, t22).endsWith('set awaitingProfilePhoto: false\n\n'));
});
