import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuditDeepLink,
  buildWhatsAppShareUrl,
  formatWhatsAppShareMessage,
  formatCommunityPost,
  getOutboundHookForAudit,
  buildWebShareData,
} from './shareUtils';
import { ACQUISITION_COPY } from './acquisitionCopy';

describe('shareUtils', () => {
  const sampleAuditId = '11111111-2222-4333-8444-555555555555';

  it('buildAuditDeepLink defaults to https://wao.co.il and encodes auditId', () => {
    const link = buildAuditDeepLink(sampleAuditId);
    assert.equal(link, `https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`);

    const customLink = buildAuditDeepLink(sampleAuditId, 'http://localhost:3000/');
    assert.equal(customLink, `http://localhost:3000/site-bot/audit?auditId=${sampleAuditId}`);
  });

  it('formatWhatsAppShareMessage formats peer and marketer modes with deep link', () => {
    const peerMsg = formatWhatsAppShareMessage({
      mode: 'peer',
      auditId: sampleAuditId,
    });
    assert.ok(peerMsg.includes(ACQUISITION_COPY.WA_SHARE_PEER_TEXT));
    assert.ok(peerMsg.includes(`https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`));

    const marketerMsg = formatWhatsAppShareMessage({
      mode: 'marketer',
      auditId: sampleAuditId,
    });
    assert.ok(marketerMsg.includes(ACQUISITION_COPY.WA_SHARE_MARKETER_TEXT));
    assert.ok(marketerMsg.includes(`https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`));
  });

  it('buildWhatsAppShareUrl generates valid WhatsApp link with encoded text & URL', () => {
    const shareText = 'Check out this Google audit:';
    const waUrl = buildWhatsAppShareUrl({
      auditId: sampleAuditId,
      shareText,
    });

    assert.ok(waUrl.startsWith('https://api.whatsapp.com/send?text='));
    const decoded = decodeURIComponent(waUrl.replace('https://api.whatsapp.com/send?text=', ''));
    assert.ok(decoded.includes(shareText));
    assert.ok(decoded.includes(`https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`));

    const waModeUrl = buildWhatsAppShareUrl({
      auditId: sampleAuditId,
      mode: 'peer',
    });
    const decodedMode = decodeURIComponent(waModeUrl.replace('https://api.whatsapp.com/send?text=', ''));
    assert.ok(decodedMode.includes(ACQUISITION_COPY.WA_SHARE_PEER_TEXT));
  });

  it('formatCommunityPost returns structured post parts and fullPost with deep link', () => {
    const post = formatCommunityPost({ auditId: sampleAuditId });
    assert.equal(post.headline, ACQUISITION_COPY.COMMUNITY_POST_HEADLINE);
    assert.equal(post.body, ACQUISITION_COPY.COMMUNITY_POST_BODY);
    assert.equal(post.deepLink, `https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`);
    assert.ok(post.fullPost.includes(ACQUISITION_COPY.COMMUNITY_POST_HEADLINE));
    assert.ok(post.fullPost.includes(ACQUISITION_COPY.COMMUNITY_POST_BODY));
    assert.ok(post.fullPost.includes(post.deepLink));
  });

  it('getOutboundHookForAudit detects failing dimensions and formats hooks', () => {
    // Failing categories
    const catResult = getOutboundHookForAudit({
      auditResult: {
        dimensions: [
          { key: 'categories', status: 'fail' },
          { key: 'hours', status: 'pass' },
        ],
      },
      auditId: sampleAuditId,
    });
    assert.equal(catResult.hookToken, 'OUTBOUND_HOOK_CATEGORIES');
    assert.equal(catResult.failingDimension, 'categories');
    assert.equal(catResult.hookText, ACQUISITION_COPY.OUTBOUND_HOOK_CATEGORIES);
    assert.equal(catResult.followupText, ACQUISITION_COPY.OUTBOUND_FOLLOWUP);
    assert.ok(catResult.fullMessage.includes(ACQUISITION_COPY.OUTBOUND_HOOK_CATEGORIES));
    assert.ok(catResult.fullMessage.includes(`https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`));
    assert.ok(catResult.fullFollowupMessage.includes(ACQUISITION_COPY.OUTBOUND_FOLLOWUP));

    // Failing hours
    const hoursResult = getOutboundHookForAudit({
      auditResult: {
        dimensions: [
          { key: 'categories', status: 'pass' },
          { key: 'hours', status: 'fail' },
        ],
      },
      auditId: sampleAuditId,
    });
    assert.equal(hoursResult.hookToken, 'OUTBOUND_HOOK_HOURS');
    assert.equal(hoursResult.failingDimension, 'hours');
    assert.equal(hoursResult.hookText, ACQUISITION_COPY.OUTBOUND_HOOK_HOURS);

    // Failing photos
    const photosResult = getOutboundHookForAudit({
      auditResult: {
        dimensions: [
          { key: 'categories', status: 'pass' },
          { key: 'photos', status: 'fail' },
        ],
      },
      auditId: sampleAuditId,
    });
    assert.equal(photosResult.hookToken, 'OUTBOUND_HOOK_PHOTOS');
    assert.equal(photosResult.failingDimension, 'photos');
    assert.equal(photosResult.hookText, ACQUISITION_COPY.OUTBOUND_HOOK_PHOTOS);

    // All passing or empty
    const generalResult = getOutboundHookForAudit({
      auditResult: {
        dimensions: [
          { key: 'categories', status: 'pass' },
          { key: 'hours', status: 'pass' },
          { key: 'photos', status: 'pass' },
        ],
      },
      auditId: sampleAuditId,
    });
    assert.equal(generalResult.hookToken, 'OUTBOUND_HOOK_GENERAL');
    assert.equal(generalResult.failingDimension, null);
    assert.equal(generalResult.hookText, ACQUISITION_COPY.OUTBOUND_HOOK_GENERAL);
  });

  it('buildWebShareData returns title, text, and url', () => {
    const title = 'Audit Report';
    const shareText = 'Audit Scorecard';
    const shareData = buildWebShareData({
      auditId: sampleAuditId,
      title,
      shareText,
    });

    assert.equal(shareData.title, title);
    assert.equal(shareData.text, shareText);
    assert.equal(shareData.url, `https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`);
  });
});
