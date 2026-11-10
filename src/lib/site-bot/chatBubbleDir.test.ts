// Adam (2026-11-10, f): chat bubble direction. HEBREW-SAFETY: ZERO Hebrew bytes; Hebrew letters are escapes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { chatBubbleDir } from './chatBubbleDir';

const HE = 'אבג';

test('chat bubbles: English / number answers -> dir auto; any Hebrew letter -> rtl (no Hebrew-bubble regression)', () => {
  for (const text of ['20 km', 'Plumber', '20', '050-0000000', 'https://example.com']) assert.equal(chatBubbleDir(text), 'auto', text);
  for (const text of [HE, `${HE} 20 km`, `GBP ${HE}`, `20 ${HE}`]) assert.equal(chatBubbleDir(text), 'rtl', text);
});
