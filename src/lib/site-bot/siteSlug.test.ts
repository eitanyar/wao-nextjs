import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePreferredSlug, deriveSiteSlug, fallbackSlug, isSafeSiteSlug, slugFromName, slugFromWebsite } from './siteSlug';
import { isSafeDeploymentSlug } from '../deployment/deploy-access';

const hebrewName = String.fromCharCode(0x05D0, 0x05D1, 0x05D2, 0x20, 0x05D3, 0x05D4);

describe('siteSlug: slugFromWebsite', () => {
  it('uses the brand label of the business domain', () => {
    assert.equal(slugFromWebsite('https://www.cohen-plumbing.co.il/about'), 'cohen-plumbing');
    assert.equal(slugFromWebsite('http://CohenPlumbing.com'), 'cohenplumbing');
    assert.equal(slugFromWebsite('https://shop.cohen.org.il'), 'cohen');
    assert.equal(slugFromWebsite('https://levi-electric.net/'), 'levi-electric');
  });
  it('ignores shared platforms, IDNs, IPs, short labels and junk', () => {
    for (const uri of ['https://www.facebook.com/cohen', 'https://cohen.wixsite.com/site', 'https://cohen.business.site', 'https://linktr.ee/cohen',
      'https://xn--4dbrk0ce.co.il', 'http://192.168.1.1', 'https://ab.co.il', 'not a url', '', undefined, 'https://sub.wao.co.il']) {
      assert.equal(slugFromWebsite(uri), null, String(uri));
    }
  });
});

describe('siteSlug: slugFromName / fallback', () => {
  it('Latin names slugify as before, Hebrew-only names do not', () => {
    assert.equal(slugFromName('Cohen Plumbing & Sons'), 'cohen-plumbing-sons');
    assert.equal(slugFromName(hebrewName), null);
    assert.equal(slugFromName(`${hebrewName} AB`), null);
  });
  it('keeps the pre-M1 fallback', () => {
    assert.equal(fallbackSlug('050-123-4567'), 'wao-client-4567');
    assert.equal(fallbackSlug(undefined, () => 1_700_000_000_000), `wao-client-${(1_700_000_000_000).toString(36).slice(-4)}`);
  });
});

describe('siteSlug: derive', () => {
  it('order: preferredSlug > website > Latin name > phone fallback', () => {
    const base = { businessName: 'Cohen Plumbing', phone: '050-123-4567', websiteUri: 'https://levi.co.il' };
    assert.equal(deriveSiteSlug({ ...base, preferredSlug: 'my-choice' }), 'my-choice');
    assert.equal(deriveSiteSlug(base), 'levi');
    assert.equal(deriveSiteSlug({ ...base, websiteUri: undefined }), 'cohen-plumbing');
    assert.equal(deriveSiteSlug({ ...base, websiteUri: undefined, businessName: hebrewName }), 'wao-client-4567');
  });
  it('the intake derivation is deterministic and always deploy-safe', () => {
    const inputs = [
      { websiteUri: 'https://www.cohen-plumbing.co.il', businessName: hebrewName, phone: '03-555-0100' },
      { businessName: 'Synthetic Business', phone: '03-555-0100' },
      { businessName: hebrewName, phone: '03-555-0100' },
    ];
    for (const input of inputs) {
      const slug = derivePreferredSlug(input);
      assert.equal(slug, derivePreferredSlug(input));
      assert.ok(isSafeSiteSlug(slug) && isSafeDeploymentSlug(slug), String(slug));
    }
    assert.equal(derivePreferredSlug({ businessName: hebrewName }), undefined);
  });
});
