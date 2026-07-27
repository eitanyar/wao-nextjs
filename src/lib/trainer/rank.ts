export interface RankBand {
  key: string;
  labelHe: string;
  min: number;
}

/** Thresholds are an engineering default — flagged for Lior/Tamar to tune once
 *  enough real sessions exist to see where the trainee actually clusters. */
export const RANK_BANDS: RankBand[] = [
  { key: 'rookie', labelHe: 'מתחיל', min: 0 },
  { key: 'developing', labelHe: 'מתפתח', min: 30 },
  { key: 'skilled', labelHe: 'מיומן', min: 55 },
  { key: 'pro', labelHe: 'מקצועי', min: 75 },
  { key: 'elite', labelHe: 'אלוף', min: 90 },
];

export function averageMastery(mastery: Record<string, number>): number {
  const values = Object.values(mastery);
  if (values.length === 0) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
}

export function rankBandFor(avg: number): RankBand {
  let band = RANK_BANDS[0];
  for (const b of RANK_BANDS) {
    if (avg >= b.min) band = b;
  }
  return band;
}
