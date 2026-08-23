/**
 * Near-duplicate content detector for the core-30 generator (VISION.md Gate 1,
 * seo-strategist sign-off 2026-08-21).
 *
 * Google's June 2026 spam update targets templated doorway pages. WAO's core-30
 * generator produces ~30 pages per client (one per service x city combination)
 * that must each read as genuinely distinct, not near-copies with the city name
 * swapped. This module is the automated detector for that gate — it does NOT
 * generate or fix content, only flags suspiciously similar pairs for a human or
 * verifier to review.
 *
 * Pure function, no I/O, no network, no LLM call — deterministic character-trigram
 * Jaccard similarity only. Types are defined locally here so this module has zero
 * coupling to whatever shape coreThirtyCopy.ts's in-flight work lands on. A later,
 * separate task can add a thin adapter if the shapes need reconciling.
 */

export interface DuplicateCheckPage {
  id: string; // any stable identifier, e.g. "svc0-city2"
  narrative: string;
  faqItems: { q: string; a: string }[];
  metaDescription: string;
}

export type SimilarityField = 'narrative' | 'faq' | 'metaDescription';

export interface SimilarityFinding {
  aId: string;
  bId: string;
  field: SimilarityField;
  score: number; // 0..1, higher = more similar
}

/**
 * Lowercases, strips all punctuation (keeps Hebrew letters, Latin letters, digits,
 * whitespace), collapses whitespace runs to a single space, and trims.
 *
 * Punctuation is anything that is not a Unicode letter, digit, or whitespace —
 * this covers Latin and Hebrew alike without special-casing either script.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Builds the set of all overlapping 3-character substrings (sliding window,
 * step 1) of a normalized string.
 */
function trigramSet(normalized: string): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + 3 <= normalized.length; i++) {
    grams.add(normalized.slice(i, i + 3));
  }
  return grams;
}

/**
 * Character-trigram Jaccard similarity between two raw strings. Normalizes both
 * inputs, then computes |A ∩ B| / |A ∪ B| over their trigram sets.
 *
 * If either string normalizes to fewer than 3 characters, returns 0 — trigrams
 * aren't comparable at that length, and this avoids divide-by-zero / degenerate
 * matches on near-empty strings.
 */
export function trigramJaccardSimilarity(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA.length < 3 || normB.length < 3) return 0;

  const setA = trigramSet(normA);
  const setB = trigramSet(normB);

  let intersection = 0;
  for (const gram of setA) {
    if (setB.has(gram)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

function faqText(page: DuplicateCheckPage): string {
  return page.faqItems.map((f) => f.q + ' ' + f.a).join(' ');
}

/**
 * Compares every unique pair of pages (i < j) across narrative, faq, and
 * metaDescription fields using character-trigram Jaccard similarity. Any field
 * comparison scoring >= threshold is returned as a SimilarityFinding.
 *
 * Pure, deterministic, O(n^2) pairwise — fine at core-30 scale (~30 pages per
 * client, <=435 pairs x 3 fields = ~1300 comparisons); no indexing/LSH needed.
 */
export function checkNearDuplicates(
  pages: DuplicateCheckPage[],
  opts?: { threshold?: number }
): SimilarityFinding[] {
  const threshold = opts?.threshold ?? 0.6;
  const findings: SimilarityFinding[] = [];

  for (let i = 0; i < pages.length; i++) {
    for (let j = i + 1; j < pages.length; j++) {
      const a = pages[i];
      const b = pages[j];

      const narrativeScore = trigramJaccardSimilarity(a.narrative, b.narrative);
      if (narrativeScore >= threshold) {
        findings.push({ aId: a.id, bId: b.id, field: 'narrative', score: narrativeScore });
      }

      const faqScore = trigramJaccardSimilarity(faqText(a), faqText(b));
      if (faqScore >= threshold) {
        findings.push({ aId: a.id, bId: b.id, field: 'faq', score: faqScore });
      }

      const metaScore = trigramJaccardSimilarity(a.metaDescription, b.metaDescription);
      if (metaScore >= threshold) {
        findings.push({ aId: a.id, bId: b.id, field: 'metaDescription', score: metaScore });
      }
    }
  }

  findings.sort((x, y) => y.score - x.score);
  return findings;
}
