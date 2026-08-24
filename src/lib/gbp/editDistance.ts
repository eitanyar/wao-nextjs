/**
 * Classic Levenshtein edit distance — O(len a × len b) DP, no deps.
 * Instrumentation for the Reputation Loop's riskiest assumption ("measure edit-distance on
 * the first 20 real replies", PURPLE_COW_OFFER_STRATEGY.md Top 3 §3). Iterates by code point
 * (`Array.from(str)`), not `str.length` indexing, so it's correct on Hebrew/multibyte text.
 */

export function levenshtein(a: string, b: string): number {
  const ca = Array.from(a);
  const cb = Array.from(b);
  const m = ca.length;
  const n = cb.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = ca[i - 1] === cb[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
