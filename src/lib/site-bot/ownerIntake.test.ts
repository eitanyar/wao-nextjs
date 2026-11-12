import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  DOMAIN_CHOICES,
  MULTI_LABEL_SUFFIXES,
  mobilePrefillFromListing,
  normalizeIsraeliMobile,
  normalizeOwnerDomain,
  normalizeOwnerEmail,
  ownerIntakeFields,
  plannedSiteHost,
  withValidatedOwnerIntake,
} from './ownerIntake';
import { buildIntakeCollectedData, intakeFromSeed } from './startIntake';
import { seedFromPrefillSnapshot } from './seedPrefill';
import { buildFixtureSnapshot } from './placePrefill';
import { INTAKE_OWNER_COPY, INTAKE_OWNER_COPY_PENDING } from './intakeOwnerCopy';
import { HE_TODO_PREFIX } from '../lp/researchedSiteLabels';

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
// Built from code points so this file stays free of Hebrew bytes: "dugma" in Hebrew letters (an IDN label).
const HEBREW_LABEL = String.fromCharCode(0x05d3, 0x05d5, 0x05d2, 0x05de, 0x05d4);

describe('ownerIntake: Israeli mobile -> E.164', () => {
  it('accepts every common typing of a 05X number', () => {
    for (const raw of [
      '054-555-0123', '0545550123', '054 555 0123', '054.555.0123', '(054) 555-0123',
      '+972545550123', '+972 54-555-0123', '+972-(0)54-555-0123', '+9720545550123',
      '00972545550123', '972545550123', '  0545550123  ',
      `‎054-555-0123‏`, `⁦054-555-0123⁩`, '054–555–0123',
    ]) {
      assert.equal(normalizeIsraeliMobile(raw), '+972545550123', raw);
    }
    assert.equal(normalizeIsraeliMobile('050-000-0000'), '+972500000000');
    assert.equal(normalizeIsraeliMobile('058 123 4567'), '+972581234567');
  });

  it('rejects landlines, VoIP, foreign numbers, wrong lengths and garbage', () => {
    for (const raw of [
      '', '   ', undefined, null, 545550123, '03-555-0123', '02-5550123', '077-555-0123', '072-2222222',
      '054-555-012', '054-555-01234', '+1 415 555 0123', '+44 7700 900123', '+970599123456x',
      'abc', '054-555-0123 ext 2', '05a-555-0123', '+972+545550123', '54+5550123', '1-800-555-0123',
    ]) {
      assert.equal(normalizeIsraeliMobile(raw), null, String(raw));
    }
  });

  it('pre-fills from the listing phone only when it is a mobile, keeping what the owner sees', () => {
    assert.equal(mobilePrefillFromListing('054-555-0123'), '054-555-0123');
    assert.equal(mobilePrefillFromListing(' +972 54 555 0123 '), '+972 54 555 0123');
    assert.equal(mobilePrefillFromListing('03-555-0123'), '');
    assert.equal(mobilePrefillFromListing(''), '');
    assert.equal(mobilePrefillFromListing(undefined), '');
  });
});

describe('ownerIntake: email', () => {
  it('accepts sane addresses, lowercases and punycodes the domain, keeps the local part', () => {
    assert.equal(normalizeOwnerEmail('owner@example.co.il'), 'owner@example.co.il');
    assert.equal(normalizeOwnerEmail('  Owner.Name+site@Example.CO.IL  '), 'Owner.Name+site@example.co.il');
    assert.equal(normalizeOwnerEmail('mailto:a@b.io'), 'a@b.io');
    assert.equal(normalizeOwnerEmail(`‏owner@example.com‎`), 'owner@example.com');
    assert.equal(normalizeOwnerEmail(`me@${HEBREW_LABEL}.co.il`), `me@${new URL(`http://${HEBREW_LABEL}.co.il`).hostname}`);
    assert.match(normalizeOwnerEmail(`me@${HEBREW_LABEL}.co.il`) ?? '', /^me@xn--[a-z0-9-]+\.co\.il$/);
  });

  it('rejects garbage', () => {
    for (const raw of [
      '', undefined, 'owner', 'owner@', '@example.com', 'owner@example', 'owner@@example.com', 'a@b@c.com',
      'owner example@x.com', 'owner@exa mple.com', '.owner@example.com', 'owner.@example.com', 'ow..ner@example.com',
      'owner@-example.com', 'owner@example-.com', 'owner@example.c', 'owner@example.123', 'owner@1.2.3.4',
      'owner@exa_mple.com', `${'a'.repeat(65)}@example.com`, `a@${'b'.repeat(250)}.com`, '"quoted"@example.com',
    ]) {
      assert.equal(normalizeOwnerEmail(raw), null, String(raw));
    }
  });
});

describe('ownerIntake: domain', () => {
  const ok = (raw: string, domain: string) => assert.deepEqual(normalizeOwnerDomain(raw), { ok: true, domain }, raw);
  const no = (raw: unknown, reason: string) => assert.deepEqual(normalizeOwnerDomain(raw), { ok: false, reason }, String(raw));

  it('.co.il and other Israeli second-level zones', () => {
    ok('example.co.il', 'example.co.il');
    ok('my-biz.org.il', 'my-biz.org.il');
    ok('example.net.il', 'example.net.il');
    ok('example.il', 'example.il');
    no('co.il', 'invalid');
    no('www.co.il', 'invalid');
  });

  it('strips scheme, path, query, fragment, port, trailing dot and www; lowercases', () => {
    ok('https://www.example.co.il', 'example.co.il');
    ok('http://example.co.il/', 'example.co.il');
    ok('HTTPS://WWW.EXAMPLE.CO.IL/About?x=1#top', 'example.co.il');
    ok('www.Example.com', 'example.com');
    ok('example.com:8080/path', 'example.com');
    ok('//example.com', 'example.com');
    ok('example.co.il.', 'example.co.il');
    ok('  Example.CO.IL  ', 'example.co.il');
    ok(`‏example.co.il‎`, 'example.co.il');
  });

  it('multi-part foreign suffixes and plain TLDs', () => {
    ok('example.co.uk', 'example.co.uk');
    ok('www.example.com.au', 'example.com.au');
    ok('example.io', 'example.io');
    ok('example.co', 'example.co');
    ok('example.business', 'example.business');
    for (const suffix of MULTI_LABEL_SUFFIXES) assert.equal(normalizeOwnerDomain(suffix).ok, false, suffix);
  });

  it('IDN to punycode', () => {
    const result = normalizeOwnerDomain(`https://www.${HEBREW_LABEL}.co.il/`);
    assert.equal(result.ok, true);
    if (result.ok) assert.match(result.domain, /^xn--[a-z0-9-]+\.co\.il$/);
    if (result.ok) ok(result.domain, result.domain);
    ok('münchen.de', 'xn--mnchen-3ya.de');
  });

  it('subdomains are rejected, not cut down to a domain the owner may not own', () => {
    no('shop.example.co.il', 'subdomain');
    no('https://blog.example.com/x', 'subdomain');
    no('mybiz.wixsite.com', 'subdomain');
    no('www.shop.example.com', 'subdomain');
  });

  it("WAO's own zone is reserved", () => {
    no('wao.co.il', 'reserved');
    no('https://www.wao.co.il', 'reserved');
    no('plumber.wao.co.il', 'reserved');
  });

  it('garbage', () => {
    no('', 'empty');
    no('   ', 'empty');
    no(undefined, 'empty');
    no(42, 'empty');
    for (const raw of [
      'example', 'localhost', 'http://', 'https:///path', 'exa mple.co.il', 'example..co.il', '-example.co.il',
      'example-.co.il', 'exa_mple.co.il', 'owner@example.co.il', '1.2.3.4', 'http://[::1]/', 'example.c',
      'example.123', `${'a'.repeat(64)}.com`, 'ab--cd.com', 'example.co.il%2F', 'not a domain at all', '?', '...',
    ]) no(raw, 'invalid');
  });
});

describe('ownerIntake: the intake record', () => {
  const fullSeed = () => seedFromPrefillSnapshot(buildFixtureSnapshot({ placeId: 'fixture-place-1', displayName: 'Synthetic Business', formattedAddress: '1 Synthetic St' }));
  const questions = { priorityServices: 'leak repair', travelBoundary: 'up to 30 km', usp: 'arrives in 60 minutes' };

  it('owner contact and domain land on collectedData apart from the public phone and email', () => {
    const { card, evidence } = intakeFromSeed(fullSeed());
    const data = buildIntakeCollectedData(card, evidence, {
      ...questions,
      owner: { mobile: '054-555-0123', email: ' Owner@Example.CO.IL ', domainChoice: 'has_domain', domain: 'https://www.Example.co.il/' },
    });
    assert.deepEqual(data.ownerContact, { mobile: '+972545550123', email: 'Owner@example.co.il' });
    assert.equal(data.domainChoice, 'has_domain');
    assert.equal(data.ownerDomain, 'example.co.il');
    // The public business phone stays the listing phone; the owner email never becomes the public email.
    assert.equal(data.phone, '03-555-0123');
    assert.equal(data.whatsappNumber, '03-555-0123');
    assert.equal('email' in data, false);
    assert.equal(plannedSiteHost(data, data.preferredSlug), 'www.example.co.il');
  });

  it('no domain -> {slug}.wao.co.il; not sure -> no planned host (staff follow up)', () => {
    const { card } = intakeFromSeed(fullSeed());
    const none = buildIntakeCollectedData(card, {}, { ...questions, owner: { mobile: '0545550123', email: 'a@b.io', domainChoice: 'no_domain', domain: 'ignored.com' } });
    assert.equal(none.domainChoice, 'no_domain');
    assert.equal('ownerDomain' in none, false);
    assert.equal(plannedSiteHost(none, none.preferredSlug), 'fixture-plumbing.wao.co.il');
    const unsure = buildIntakeCollectedData(card, {}, { ...questions, owner: { mobile: '0545550123', email: 'a@b.io', domainChoice: 'not_sure' } });
    assert.equal(unsure.domainChoice, 'not_sure');
    assert.equal(plannedSiteHost(unsure, unsure.preferredSlug), null);
    assert.equal(plannedSiteHost({ domainChoice: 'no_domain' }, undefined), null);
  });

  it('exact field set: nothing added when the steps were not answered; invalid values are dropped, never repaired', () => {
    const { card } = intakeFromSeed(fullSeed());
    const bare = buildIntakeCollectedData(card, {}, questions);
    for (const key of ['ownerContact', 'domainChoice', 'ownerDomain']) assert.equal(key in bare, false, key);
    assert.deepEqual(ownerIntakeFields(undefined), {});
    assert.deepEqual(ownerIntakeFields({ mobile: '03-555-0123', email: 'a@b.io' }), {});
    assert.deepEqual(ownerIntakeFields({ mobile: '0545550123', email: 'nope' }), {});
    // "Yes" with a bad domain becomes not_sure, so the hosting step never attaches a wrong name.
    assert.deepEqual(ownerIntakeFields({ domainChoice: 'has_domain', domain: 'shop.example.co.il' }), { domainChoice: 'not_sure' });
    assert.deepEqual(ownerIntakeFields({ domainChoice: 'bogus' as never }), {});
    assert.deepEqual(Object.keys(ownerIntakeFields({ mobile: '0545550123', email: 'a@b.io', domainChoice: 'has_domain', domain: 'x.co.il' })).sort(), ['domainChoice', 'ownerContact', 'ownerDomain']);
    assert.deepEqual(DOMAIN_CHOICES, ['has_domain', 'no_domain', 'not_sure']);
  });

  it('server re-validation keeps valid fields, drops forged ones, leaves the rest of the record untouched', () => {
    const valid = withValidatedOwnerIntake({ businessNiche: 'Plumber', phone: '03-555-0123', ownerContact: { mobile: '+972545550123', email: 'a@b.io' }, domainChoice: 'has_domain' as const, ownerDomain: 'example.co.il' });
    assert.deepEqual(valid, { businessNiche: 'Plumber', phone: '03-555-0123', ownerContact: { mobile: '+972545550123', email: 'a@b.io' }, domainChoice: 'has_domain', ownerDomain: 'example.co.il' });
    const forged = withValidatedOwnerIntake({ businessNiche: 'Plumber', ownerContact: { mobile: '1', email: 'x' }, domainChoice: 'evil' as never, ownerDomain: 'wao.co.il' });
    assert.deepEqual(forged, { businessNiche: 'Plumber' });
    const strayDomain = withValidatedOwnerIntake({ businessNiche: 'Plumber', domainChoice: 'no_domain' as const, ownerDomain: 'example.co.il' });
    assert.deepEqual(strayDomain, { businessNiche: 'Plumber', domainChoice: 'no_domain' });
    const notObject = withValidatedOwnerIntake({ businessNiche: 'Plumber', ownerContact: 'x' as never });
    assert.deepEqual(notObject, { businessNiche: 'Plumber' });
  });
});

describe('ownerIntake: pending copy never reaches production', () => {
  const values = Object.values(INTAKE_OWNER_COPY) as string[];

  it('the pending flag matches the values', () => {
    assert.equal(INTAKE_OWNER_COPY_PENDING, values.some(value => value.includes(HE_TODO_PREFIX)));
    for (const [key, value] of Object.entries(INTAKE_OWNER_COPY)) {
      assert.ok(value.trim(), `${key} is empty`);
      if (value.includes(HE_TODO_PREFIX)) assert.ok(value.startsWith(`${HE_TODO_PREFIX}${key}__ `), `${key}: placeholder must be __HE_TODO_${key}__ <gloss>`);
    }
  });

  // The copy flag going false does NOT un-gate /site-bot/start: opening it to production is a separate launch decision
  // (Adam / Eitan). This assertion is unconditional until that decision lands, and is changed together with the gate.
  it('the start page stays off production regardless of the copy flag (page gate and next.config 307 both in place)', () => {
    const page = read('src/app/(app)/site-bot/start/page.tsx');
    assert.match(page, /if \(process\.env\.SITE_BOT_PAID_FLOW === '1' && process\.env\.NODE_ENV !== 'production'\) \{\s*return <StartPaidFlow \/>;\s*\}\s*notFound\(\);/);
    const config = read('next.config.ts');
    assert.match(config, /process\.env\.SITE_BOT_PAID_FLOW === "1" && process\.env\.NODE_ENV !== "production"\s*\? \[\]\s*: \[\s*\{ source: "\/site-bot\/start", destination: "\/site-bot", permanent: false \}/);
  });

  it('only the start-page intake imports the owner copy, so a placeholder cannot surface on another page', () => {
    const importers: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
        const rel = path.join(dir, entry.name);
        if (entry.isDirectory()) { walk(rel); continue; }
        if (!/\.(ts|tsx|mjs|js)$/.test(entry.name) || /\.test\./.test(entry.name)) continue;
        if (/intakeOwnerCopy/.test(read(rel))) importers.push(rel);
      }
    };
    walk('src');
    assert.deepEqual(importers.sort(), ['src/app/(app)/site-bot/start/StartPaidFlow.tsx']);
  });
});
