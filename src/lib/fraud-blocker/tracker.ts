const SID_PATTERN = /^[A-Za-z0-9._~-]+$/;

export function buildFraudBlockerTrackerHtml(sid: string): string {
  if (!SID_PATTERN.test(sid)) throw new Error('Invalid Fraud Blocker SID');
  const scriptUrl = `https://monitor.fraudblocker.com/fbt.js?sid=${sid}`;
  const fallbackUrl = `https://monitor.fraudblocker.com/fbt.gif?sid=${sid}`;
  return `<script async src="${scriptUrl}"></script><noscript><img src="${fallbackUrl}" alt="" /></noscript>`;
}
