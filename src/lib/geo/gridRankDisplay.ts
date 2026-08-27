export const GRID_COPY = {
  SECTION_TITLE: 'נראות מקומית במפה (Local 3-Pack)',
  SECTION_SUBTITLE: 'בדיקת דירוג ב-9 נקודות סביב העסק (רדיוס 5 ק״מ)',
  TOP3_VISIBILITY: 'נראות בטופ-3',
  AVG_RANK: 'דירוג ממוצע',
  MARKET_LEADER: 'מוביל מקומי',
  CENTER_NODE: 'מרכז העסק',
  SCAN_LOADING: 'בודק מיקומים במפה סביב העסק...',
  SCAN_ERROR: 'לא הצלחנו להשלים את סריקת המפה כרגע.',
  SCAN_UNAVAILABLE: 'לא נמצאו נתוני מיקום מדויקים לסריקת מפה.',
  UNRANKED: 'לא בטופ 20',
  RETRY_BUTTON: 'נסה שוב',
  CARDINAL_N: 'צפון',
  CARDINAL_NE: 'צפון-מזרח',
  CARDINAL_E: 'מזרח',
  CARDINAL_SE: 'דרום-מזרח',
  CARDINAL_S: 'דרום',
  CARDINAL_SW: 'דרום-מערב',
  CARDINAL_W: 'מערב',
  CARDINAL_NW: 'צפון-מערב',
  KM_UNIT: 'ק״מ',
} as const;

export interface RankBadgeStyle {
  color: string;
  bg: string;
  border: string;
  label: string;
  tier: 'top3' | 'mid' | 'low';
}

export function getRankBadgeStyle(rank: number | null): RankBadgeStyle {
  if (typeof rank === 'number' && rank >= 1 && rank <= 3) {
    return {
      color: '#22c55e',
      bg: 'rgba(34, 197, 94, 0.15)',
      border: '1px solid rgba(34, 197, 94, 0.35)',
      label: `#${rank}`,
      tier: 'top3',
    };
  }
  if (typeof rank === 'number' && rank >= 4 && rank <= 10) {
    return {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      border: '1px solid rgba(245, 158, 11, 0.35)',
      label: `#${rank}`,
      tier: 'mid',
    };
  }
  if (typeof rank === 'number' && rank > 10) {
    return {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.3)',
      label: `#${rank}`,
      tier: 'low',
    };
  }
  return {
    color: 'var(--muted, #94a3b8)',
    bg: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border, rgba(255, 255, 255, 0.1))',
    label: '20+',
    tier: 'low',
  };
}

export function getCardinalDirection(bearingDeg: number): string {
  const normalized = ((bearingDeg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return GRID_COPY.CARDINAL_N;
  if (normalized >= 22.5 && normalized < 67.5) return GRID_COPY.CARDINAL_NE;
  if (normalized >= 67.5 && normalized < 112.5) return GRID_COPY.CARDINAL_E;
  if (normalized >= 112.5 && normalized < 157.5) return GRID_COPY.CARDINAL_SE;
  if (normalized >= 157.5 && normalized < 202.5) return GRID_COPY.CARDINAL_S;
  if (normalized >= 202.5 && normalized < 247.5) return GRID_COPY.CARDINAL_SW;
  if (normalized >= 247.5 && normalized < 292.5) return GRID_COPY.CARDINAL_W;
  return GRID_COPY.CARDINAL_NW;
}
