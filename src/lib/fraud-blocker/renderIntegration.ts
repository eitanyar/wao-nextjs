import { buildFraudBlockerTrackerHtml } from './tracker';

export interface FraudBlockerTrackerVerification {
  valid: boolean;
  scriptCount: number;
  fallbackCount: number;
}

export interface FraudBlockerPagesVerification {
  valid: boolean;
  invalidPaths: string[];
}

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}

export function injectFraudBlockerTracker(html: string, sid: string): string {
  const head = /<head(?:\s[^>]*)?>/i.exec(html);
  if (!head || head.index === undefined) throw new Error('Rendered HTML does not contain an opening head tag.');
  return `${html.slice(0, head.index + head[0].length)}${buildFraudBlockerTrackerHtml(sid)}${html.slice(head.index + head[0].length)}`;
}

export function verifyFraudBlockerTracker(html: string, sid: string): FraudBlockerTrackerVerification {
  const tracker = buildFraudBlockerTrackerHtml(sid);
  const script = tracker.match(/<script[^>]+><\/script>/)?.[0] ?? '';
  const fallback = tracker.match(/<noscript>.*<\/noscript>/)?.[0] ?? '';
  const scriptCount = countOccurrences(html, script);
  const fallbackCount = countOccurrences(html, fallback);
  return { valid: scriptCount === 1 && fallbackCount === 1, scriptCount, fallbackCount };
}

export function verifyFraudBlockerRenderedPages(pages: Record<string, string>, sid: string): FraudBlockerPagesVerification {
  const invalidPaths = Object.entries(pages)
    .filter(([filePath]) => filePath.endsWith('.html'))
    .flatMap(([filePath, html]) => verifyFraudBlockerTracker(html, sid).valid ? [] : [filePath]);
  return { valid: invalidPaths.length === 0, invalidPaths };
}
