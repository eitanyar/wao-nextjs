import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGoogleWriteReviewUrl,
  buildReviewForwardTemplate,
  buildCustomerReviewWaLink,
  type ReviewFlywheelForwardTemplateOptions,
} from './reviewFlywheelCopy';

/**
 * Hebrew-safety: no Hebrew bytes are authored in this test file. Expected
 * Hebrew fragments are expressed as \uXXXX escapes of the exact code points
 * already present in reviewFlywheelCopy.ts:
 *   HAYY         = "hayy" (greeting, line opener)
 *   THANK_PREFIX = the "I was happy to help you today" thank-you prefix
 *   KAN          = "here" (business-name introducer)
 */
const HAYY = '\u05D4\u05D9\u05D9';
const THANK_PREFIX = '\u05E9\u05DE\u05D7\u05EA\u05D9 \u05DC\u05E2\u05D6\u05D5\u05E8 \u05DC\u05DA \u05D4\u05D9\u05D5\u05DD';
const KAN = '\u05DB\u05D0\u05DF';

describe('buildGoogleWriteReviewUrl', () => {
  it('builds the canonical Google Write Review URL from a Place ID', () => {
    const url = buildGoogleWriteReviewUrl('ChIJN1t_tDeuEmsRUsoyG83frY4');
    assert.equal(url, 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  });

  it('URI-encodes Place IDs containing reserved characters', () => {
    const url = buildGoogleWriteReviewUrl('ChIJ space&test');
    assert.equal(url, `https://search.google.com/local/writereview?placeid=${encodeURIComponent('ChIJ space&test')}`);
  });

  it('trims surrounding whitespace before resolving', () => {
    const url = buildGoogleWriteReviewUrl('  ChIJN1t_tDeuEmsRUsoyG83frY4  ');
    assert.equal(url, 'https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  });

  it('passes https:// shortlinks through unchanged', () => {
    const link = 'https://g.page/r/CXyz123/review';
    assert.equal(buildGoogleWriteReviewUrl(link), link);
  });

  it('passes http:// links through unchanged', () => {
    const link = 'http://example.com/write-a-review';
    assert.equal(buildGoogleWriteReviewUrl(link), link);
  });

  it('passes bare g.page/ shortlinks through unchanged', () => {
    const link = 'g.page/r/CXyz123/review';
    assert.equal(buildGoogleWriteReviewUrl(link), link);
  });
});

describe('buildReviewForwardTemplate', () => {
  const base: ReviewFlywheelForwardTemplateOptions = {
    customerName: 'Danny',
    businessName: 'Mozes Locks',
    reviewLink: 'https://g.page/r/CXyz123/review',
  };

  it('exposes only customer, business, and review-link options', () => {
    const publicOptionShape: Record<keyof ReviewFlywheelForwardTemplateOptions, true> = {
      customerName: true,
      businessName: true,
      reviewLink: true,
    };
    assert.deepEqual(Object.keys(publicOptionShape).sort(), ['businessName', 'customerName', 'reviewLink']);
  });

  it('does not render legacy content steering fields', () => {
    const staleOptions = ({ ...base, service: 'SafeServicePhrase', city: 'CityPhrase' }) as unknown as ReviewFlywheelForwardTemplateOptions;
    const out = buildReviewForwardTemplate(staleOptions);
    assert.ok(!out.includes('SafeServicePhrase'));
    assert.ok(!out.includes('CityPhrase'));
  });

  it('uses the generic thank-you line', () => {
    const out = buildReviewForwardTemplate(base);
    const baseLine = `${THANK_PREFIX}, ${KAN} ${base.businessName}.`;
    assert.ok(out.includes(baseLine), `expected base thank-you line, got: ${out}`);
    assert.ok(out.startsWith(`${HAYY} ${base.customerName},`));
    assert.ok(out.includes(base.reviewLink));
  });



});

describe('buildCustomerReviewWaLink', () => {
  const opts: ReviewFlywheelForwardTemplateOptions = {
    customerName: 'Danny',
    businessName: 'Mozes Locks',
    reviewLink: 'https://g.page/r/CXyz123/review',
  };

  it('formats an Israeli local-format phone into a valid wa.me link', () => {
    const link = buildCustomerReviewWaLink('050-123-4567', opts);
    assert.ok(link.startsWith('https://wa.me/972501234567?text='), `unexpected link: ${link}`);
  });

  it('strips non-digits and the leading trunk zero', () => {
    const link = buildCustomerReviewWaLink('(050) 123-4567', opts);
    assert.ok(link.startsWith('https://wa.me/972501234567?text='), `unexpected link: ${link}`);
  });

  it('prefills the exact forward template as URI-encoded text', () => {
    const link = buildCustomerReviewWaLink('0501234567', opts);
    const expectedMessage = buildReviewForwardTemplate(opts);
    const expectedLink = `https://wa.me/972501234567?text=${encodeURIComponent(expectedMessage)}`;
    assert.equal(link, expectedLink);

    const encodedText = link.split('?text=')[1];
    assert.equal(decodeURIComponent(encodedText), expectedMessage);
    assert.ok(decodeURIComponent(encodedText).includes(opts.reviewLink));
  });

  it('uses the generic template', () => {
    const plainOpts: ReviewFlywheelForwardTemplateOptions = {
      customerName: 'Danny',
      businessName: 'Mozes Locks',
      reviewLink: 'https://g.page/r/CXyz123/review',
    };
    const link = buildCustomerReviewWaLink('0501234567', plainOpts);
    assert.equal(decodeURIComponent(link.split('?text=')[1]), buildReviewForwardTemplate(plainOpts));
  });
});
