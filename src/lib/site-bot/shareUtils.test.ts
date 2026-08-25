import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuditDeepLink,
  buildWhatsAppShareUrl,
  buildWebShareData,
} from './shareUtils';

describe('shareUtils', () => {
  const sampleAuditId = '11111111-2222-4333-8444-555555555555';

  it('buildAuditDeepLink defaults to https://wao.co.il and encodes auditId', () => {
    const link = buildAuditDeepLink(sampleAuditId);
    assert.equal(link, `https://wao.co.il/site-bot/audit?auditId=${sampleAuditId}`);

    const customLink = buildAuditDeepLink(sampleAuditId, 'http://localhost:3000/');
    assert.equal(customLink, `http://localhost:3000/site-bot/audit?auditId=${sampleAuditId}`);
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
