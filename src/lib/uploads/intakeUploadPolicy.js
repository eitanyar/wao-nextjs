/**
 * Safety rules for POST /api/upload (Ads Bot onboarding intake photos).
 *
 * The route is called by the public onboarding page (src/app/(app)/google-ads/onboarding/page.tsx)
 * with NO client session or admin cookie: a visitor uploads photos before any account exists.
 * Authentication is therefore NOT enforced here (decision pending with Adam); this module only
 * makes the write safe:
 *  - sessionId must match the exact shape the onboarding page generates (`s-<13-digit ms>-<base36>`),
 *    and the resolved directory must stay inside public/uploads;
 *  - per-file type allowlist checked against the file's magic bytes, not only the claimed type;
 *  - per-file, per-request and file-count caps.
 *
 * Plain JS so it is unit-testable with `node --test`.
 */
import path from 'path';

/** Exactly what onboarding/page.tsx generates: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`. */
export const UPLOAD_SESSION_ID_PATTERN = /^s-\d{13}-[a-z0-9]{1,16}$/;

export const MAX_UPLOAD_FILES = 6;
export const MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024; // 10 MB per file (unchanged)
/** Whole multipart body: all files at the cap plus 1 MB of form overhead. */
export const MAX_UPLOAD_REQUEST_BYTES = MAX_UPLOAD_FILES * MAX_UPLOAD_FILE_BYTES + 1024 * 1024;

/** Allowed MIME types and the file extension each one is stored under. */
export const UPLOAD_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** @param {unknown} value */
export function isValidUploadSessionId(value) {
  return typeof value === 'string' && UPLOAD_SESSION_ID_PATTERN.test(value);
}

/**
 * The upload directory for `sessionId`, or null when the id is invalid or the resolved path
 * would leave `<cwd>/public/uploads`.
 *
 * @param {string} cwd
 * @param {unknown} sessionId
 * @returns {string | null}
 */
export function resolveUploadDir(cwd, sessionId) {
  if (!isValidUploadSessionId(sessionId)) return null;
  // path.join only: a two-argument resolve with a dynamic part makes the build trace the whole project
  // (src/lib/nftSafePaths.test.mjs). The id pattern already excludes '.', '/' and '\\'.
  const root = path.join(path.resolve(cwd), 'public', 'uploads');
  const dir = path.join(root, /** @type {string} */ (sessionId));
  if (path.dirname(dir) !== root || !dir.startsWith(root + path.sep)) return null;
  return dir;
}

/**
 * The real image type from the first bytes, or null.
 *
 * @param {Uint8Array} bytes
 * @returns {keyof typeof UPLOAD_TYPES | null}
 */
export function sniffImageType(bytes) {
  if (!bytes || bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
    && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return 'image/png';
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  return null;
}

/**
 * Whether a file may be stored: allowed claimed type, within the size cap, and its bytes really
 * are that type. Returns the stored extension, or null to skip the file.
 *
 * @param {{ type: string, size: number }} file
 * @param {Uint8Array} bytes
 * @returns {string | null}
 */
export function acceptedUploadExtension(file, bytes) {
  if (!file || !Object.prototype.hasOwnProperty.call(UPLOAD_TYPES, file.type)) return null;
  if (!(file.size > 0) || file.size > MAX_UPLOAD_FILE_BYTES) return null;
  if (sniffImageType(bytes) !== file.type) return null;
  return UPLOAD_TYPES[/** @type {keyof typeof UPLOAD_TYPES} */ (file.type)];
}
