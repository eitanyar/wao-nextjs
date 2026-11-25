/**
 * Site Bot step 2c: the preview iframe's sandbox attribute, shared by the start page and the server tests. Empty = every
 * sandbox restriction on (no scripts, no same-origin, no forms, no popups, no top navigation); see previewFrame.ts for why
 * no token is needed. Browser-safe. HEBREW-SAFETY: ZERO Hebrew bytes.
 */
export const PREVIEW_IFRAME_SANDBOX = '';
