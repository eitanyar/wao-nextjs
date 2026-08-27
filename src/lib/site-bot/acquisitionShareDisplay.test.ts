import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHARE_DISPLAY_COPY,
  getFailingDimensionLabel,
} from './acquisitionShareDisplay';

describe('acquisitionShareDisplay', () => {
  it('SHARE_DISPLAY_COPY contains all required keys with non-empty string values', () => {
    const requiredKeys = [
      'SECTION_TITLE',
      'SECTION_SUBTITLE',
      'TAB_WHATSAPP',
      'TAB_COMMUNITY',
      'TAB_OUTBOUND',
      'MODE_PEER_LABEL',
      'MODE_MARKETER_LABEL',
      'BTN_WHATSAPP_DIRECT',
      'BTN_COPY_MESSAGE',
      'BTN_COPY_POST',
      'BTN_COPY_HOOK',
      'BTN_COPY_FOLLOWUP',
      'BTN_COPY_LINK',
      'LABEL_COPIED',
      'LABEL_OUTBOUND_DETECTED',
      'LABEL_OUTBOUND_CATEGORIES',
      'LABEL_OUTBOUND_HOURS',
      'LABEL_OUTBOUND_PHOTOS',
      'LABEL_OUTBOUND_GENERAL',
      'LABEL_HOOK_STEP_1',
      'LABEL_HOOK_STEP_2',
      'PREVIEW_TITLE',
    ] as const;

    for (const key of requiredKeys) {
      assert.ok(typeof SHARE_DISPLAY_COPY[key] === 'string' && SHARE_DISPLAY_COPY[key].length > 0, `Missing or empty key: ${key}`);
    }
  });

  it('getFailingDimensionLabel returns correct label constants for each dimension', () => {
    assert.equal(
      getFailingDimensionLabel('categories'),
      SHARE_DISPLAY_COPY.LABEL_OUTBOUND_CATEGORIES
    );
    assert.equal(
      getFailingDimensionLabel('hours'),
      SHARE_DISPLAY_COPY.LABEL_OUTBOUND_HOURS
    );
    assert.equal(
      getFailingDimensionLabel('photos'),
      SHARE_DISPLAY_COPY.LABEL_OUTBOUND_PHOTOS
    );
    assert.equal(
      getFailingDimensionLabel(null),
      SHARE_DISPLAY_COPY.LABEL_OUTBOUND_GENERAL
    );
  });
});
