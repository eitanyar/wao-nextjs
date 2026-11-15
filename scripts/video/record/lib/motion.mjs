// Pure frame maths for the screen recorder. Every motion is computed per frame,
// so a recording is the same every run (no wall-clock scrolling or typing).
// Limits come from the storyboard's motion rules (docs/missions/video-intro-site-bot-2026-11-12.md).

export const FPS = 30;
export const MAX_SCROLL_PX_PER_S = 600; // CSS px per second, peak
/**
 * Eitan, 2026-11-14: the one exception to the scroll limit. The demo site's review cards are readable, so the
 * full-site shot passes them with a quick thumb flick (a real phone fling peaks at several thousand px/s). Only
 * the reviews pass uses it; the per-clip exposure check (MAX_REVIEWS_ON_SCREEN_S) is what is enforced.
 */
export const FLICK_MAX_PX_PER_S = 5000;
export const MAX_TYPE_CHARS_PER_S = 10; // about 2x a real thumb; the storyboard forbids more
export const RING_MS = 300;
export const RING_PX = 48;

export const VIEWPORTS = {
  mobile: { width: 390, height: 844, dpr: 3, isMobile: true, aspects: ["9x16", "1x1"] },
  desktop: { width: 1280, height: 720, dpr: 1.5, isMobile: false, aspects: ["16x9"] },
  // Dash's in-cab screen (story area below the face strip, 604x946 canvas px), at the screen's aspect so there
  // is no letterbox and no crop. 680 CSS px wide: the leads table needs about 640 to keep all six columns on one
  // line once a lead is marked real (its deal cell grows a button); at 402 it wraps names and phones and clips the
  // deal column. Opt-in: never part of a default run.
  dash: { width: 680, height: 1066, dpr: 2, isMobile: true, aspects: ["dash-screen"], optIn: true },
};

/** Output pixel size of a viewport set. Both sides must be even for H.264. */
export function frameSize({ width, height, dpr }) {
  const w = Math.round(width * dpr);
  const h = Math.round(height * dpr);
  if (w % 2 || h % 2) throw new Error(`frame ${w}x${h} is not even`);
  return { width: w, height: h };
}

export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

export const holdFrames = (seconds, fps = FPS) => Math.max(1, Math.round(seconds * fps));

/**
 * Scroll positions, one per frame, from `from` to `to` with ease-in-out.
 * The ease peaks at twice its average speed, so the length is chosen to keep the
 * peak at or under maxSpeed. Ends exactly on `to`.
 */
export function scrollFrames(from, to, { fps = FPS, maxSpeed = MAX_SCROLL_PX_PER_S, minSeconds = 0.5 } = {}) {
  const distance = Math.abs(to - from);
  if (distance < 1) return [];
  const n = Math.max(2, Math.ceil(Math.max(minSeconds, (2 * distance) / maxSpeed) * fps));
  return Array.from({ length: n }, (_, i) => Math.round(from + (to - from) * easeInOut((i + 1) / n)));
}

export function peakScrollSpeed(positions, from, fps = FPS) {
  let prev = from;
  let peak = 0;
  for (const p of positions) {
    peak = Math.max(peak, Math.abs(p - prev) * fps);
    prev = p;
  }
  return peak;
}

/**
 * How many characters are on screen at each frame while typing `text`.
 * Counts user-perceived characters, so a Hebrew letter with marks is never split.
 */
export function typeFrames(text, { fps = FPS, charsPerSecond = 8 } = {}) {
  if (charsPerSecond > MAX_TYPE_CHARS_PER_S) throw new Error(`typing ${charsPerSecond}/s is over the ${MAX_TYPE_CHARS_PER_S}/s limit`);
  const chars = graphemes(text);
  const n = Math.max(1, Math.ceil((chars.length / charsPerSecond) * fps));
  return Array.from({ length: n }, (_, i) => Math.min(chars.length, Math.ceil(((i + 1) / n) * chars.length)));
}

export function graphemes(text) {
  return [...new Intl.Segmenter("he", { granularity: "grapheme" }).segment(text)].map((s) => s.segment);
}

/** Tap ring: expands from 40% to 100% of its size and fades out over RING_MS. */
export function ringFrames({ fps = FPS, ms = RING_MS } = {}) {
  const n = Math.max(2, Math.round((ms / 1000) * fps));
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return { scale: Math.round((0.4 + 0.6 * t) * 1000) / 1000, opacity: Math.round((1 - t) * 1000) / 1000 };
  });
}
