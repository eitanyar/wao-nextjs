// Dana's design token system — 8 vertical themes for LP generation
// Each theme is a complete visual identity. Eitan-Dev reads these; never hardcodes colors.

export type VerticalKey =
  | 'emergency-trades'
  | 'skilled-trades'
  | 'medical-aesthetics'
  | 'legal-financial'
  | 'events-creative'
  | 'fitness-wellness'
  | 'beauty-grooming'
  | 'remote-professional';

export interface VerticalTheme {
  key: VerticalKey;
  label: string;               // Human-readable for admin
  // Color tokens
  primary: string;             // Brand/nav background
  accent: string;              // CTA buttons, highlights
  accentAlt: string;           // Secondary CTAs, hover states
  bg: string;                  // Page background
  surface: string;             // Card/section backgrounds
  surfaceAlt: string;          // Alternate section bg (zebrastripe)
  textPrimary: string;         // Body text
  textMuted: string;           // Subtext, labels
  border: string;              // Card borders
  // Gradient recipes (CSS strings)
  heroGradient: string;        // Hero section bg gradient (overlaid on image)
  ctaGradient: string;         // CTA button gradient
  trustBadgeBg: string;        // Trust badge background
  // Typography
  fontHeading: string;         // CSS font-family for H1/H2
  fontBody: string;            // CSS font-family for body
  headingWeight: number;       // H1 font-weight
  // Shape & radius
  radiusSm: string;            // Button, input
  radiusMd: string;            // Card
  radiusLg: string;            // Hero section, large containers
  // Personality tokens
  badgeShape: 'shield' | 'circle' | 'certificate' | 'ribbon' | 'star';
  ctaStyle: 'urgent-bold' | 'premium-refined' | 'warm-approachable' | 'clinical-clear';
  heroTextAlign: 'center' | 'right';  // RTL: 'right' = natural start
  trustSignalStyle: 'badge-row' | 'icon-list' | 'stat-block' | 'credential-card';
}

export const VERTICAL_THEMES: Record<VerticalKey, VerticalTheme> = {

  'emergency-trades': {
    key: 'emergency-trades',
    label: 'שירותי חירום ואינסטלציה',
    // Navy + Electric Orange — urgency + reliability
    primary: '#1B3A5C',
    accent: '#FF6B35',
    accentAlt: '#FFB347',
    bg: '#F0F4F8',
    surface: '#FFFFFF',
    surfaceAlt: '#EBF0F6',
    textPrimary: '#0D1B2A',
    textMuted: '#4A6580',
    border: '#D1DCE8',
    heroGradient: 'linear-gradient(to bottom, rgba(27,58,92,0.82) 0%, rgba(13,27,42,0.72) 100%)',
    ctaGradient: 'linear-gradient(135deg, #C43C08 0%, #A82E00 100%)',
    trustBadgeBg: 'rgba(27,58,92,0.08)',
    fontHeading: '"Secular One", "Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 900,
    radiusSm: '6px',
    radiusMd: '10px',
    radiusLg: '0px',      // Emergency = sharp, no-nonsense
    badgeShape: 'shield',
    ctaStyle: 'urgent-bold',
    heroTextAlign: 'center',
    trustSignalStyle: 'badge-row',
  },

  'skilled-trades': {
    key: 'skilled-trades',
    label: 'בעלי מקצוע ושיפוצים',
    // Deep Forest Green + Warm Earth — craftsmanship, before/after
    primary: '#2D5016',
    accent: '#D4842A',
    accentAlt: '#E8B86D',
    bg: '#F5F1EB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE8DC',
    textPrimary: '#1A2410',
    textMuted: '#5A6B48',
    border: '#D4C9B4',
    heroGradient: 'linear-gradient(to bottom, rgba(45,80,22,0.80) 0%, rgba(20,40,10,0.70) 100%)',
    ctaGradient: 'linear-gradient(135deg, #D4842A 0%, #E8B040 100%)',
    trustBadgeBg: 'rgba(45,80,22,0.07)',
    fontHeading: '"Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 800,
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '4px',
    badgeShape: 'shield',
    ctaStyle: 'warm-approachable',
    heroTextAlign: 'right',
    trustSignalStyle: 'icon-list',
  },

  'medical-aesthetics': {
    key: 'medical-aesthetics',
    label: 'רפואה ואסתטיקה',
    // White + Teal — clinical trust, cleanliness
    primary: '#0D6B7A',
    accent: '#3ABFBF',
    accentAlt: '#7BDDDD',
    bg: '#F8FDFD',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF9F9',
    textPrimary: '#0A2E33',
    textMuted: '#4A8A92',
    border: '#C4E8E8',
    heroGradient: 'linear-gradient(to bottom, rgba(13,107,122,0.75) 0%, rgba(5,55,65,0.80) 100%)',
    ctaGradient: 'linear-gradient(135deg, #0D6B7A 0%, #1A9AAC 100%)',
    trustBadgeBg: 'rgba(58,191,191,0.10)',
    fontHeading: '"Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 700,
    radiusSm: '20px',     // Soft, pill-shaped — clinical but gentle
    radiusMd: '16px',
    radiusLg: '12px',
    badgeShape: 'certificate',
    ctaStyle: 'clinical-clear',
    heroTextAlign: 'center',
    trustSignalStyle: 'credential-card',
  },

  'legal-financial': {
    key: 'legal-financial',
    label: 'משפט וכספים',
    // Near-Black + Antique Gold — authority, gravitas
    primary: '#1A1A2E',
    accent: '#C9A84C',
    accentAlt: '#E8CC80',
    bg: '#F5F3EE',
    surface: '#FFFFFF',
    surfaceAlt: '#EDE9E0',
    textPrimary: '#0D0D1A',
    textMuted: '#6B6555',
    border: '#D8D0BC',
    heroGradient: 'linear-gradient(to bottom, rgba(26,26,46,0.88) 0%, rgba(10,10,20,0.82) 100%)',
    ctaGradient: 'linear-gradient(135deg, #7A5E10 0%, #5C4400 100%)',
    trustBadgeBg: 'rgba(201,168,76,0.10)',
    fontHeading: '"Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 700,
    radiusSm: '4px',      // Conservative, formal — minimal rounding
    radiusMd: '6px',
    radiusLg: '2px',
    badgeShape: 'certificate',
    ctaStyle: 'premium-refined',
    heroTextAlign: 'right',
    trustSignalStyle: 'credential-card',
  },

  'events-creative': {
    key: 'events-creative',
    label: 'אירועים ויצירה',
    // Near-Black + Rose Gold — premium, celebration
    primary: '#0A0A0A',
    accent: '#C9A07A',          // Rose Gold
    accentAlt: '#E8C4A0',
    bg: '#FAF7F4',
    surface: '#FFFFFF',
    surfaceAlt: '#F0EBE4',
    textPrimary: '#0A0A0A',
    textMuted: '#7A6A5A',
    border: '#DDD0C0',
    heroGradient: 'linear-gradient(to bottom, rgba(10,10,10,0.65) 0%, rgba(10,10,10,0.80) 100%)',
    ctaGradient: 'linear-gradient(135deg, #8B5E2A 0%, #6B3F10 100%)',
    trustBadgeBg: 'rgba(201,160,122,0.10)',
    fontHeading: '"Secular One", "Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 800,
    radiusSm: '4px',
    radiusMd: '8px',
    radiusLg: '0px',      // Dramatic, clean edges for portfolio feel
    badgeShape: 'ribbon',
    ctaStyle: 'premium-refined',
    heroTextAlign: 'center',
    trustSignalStyle: 'stat-block',
  },

  'fitness-wellness': {
    key: 'fitness-wellness',
    label: 'כושר ובריאות',
    // Deep Forest + Vibrant Green — energy, transformation
    primary: '#0D3B2E',
    accent: '#2ECC71',
    accentAlt: '#58D68D',
    bg: '#F2FFF6',
    surface: '#FFFFFF',
    surfaceAlt: '#E8FBF0',
    textPrimary: '#0A1F18',
    textMuted: '#3A7A5A',
    border: '#B8E8CC',
    heroGradient: 'linear-gradient(to bottom, rgba(13,59,46,0.80) 0%, rgba(5,25,18,0.85) 100%)',
    ctaGradient: 'linear-gradient(135deg, #1A7040 0%, #0F5028 100%)',
    trustBadgeBg: 'rgba(46,204,113,0.10)',
    fontHeading: '"Secular One", "Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 900,
    radiusSm: '8px',
    radiusMd: '12px',
    radiusLg: '16px',
    badgeShape: 'circle',
    ctaStyle: 'urgent-bold',
    heroTextAlign: 'center',
    trustSignalStyle: 'stat-block',
  },

  'beauty-grooming': {
    key: 'beauty-grooming',
    label: 'יופי וטיפוח',
    // Warm Near-Black + Dusty Rose — lifestyle, premium
    primary: '#1A0A14',
    accent: '#C4748A',
    accentAlt: '#E8A8B8',
    bg: '#FDF6F8',
    surface: '#FFFFFF',
    surfaceAlt: '#F8EEF2',
    textPrimary: '#1A0A14',
    textMuted: '#8A6272',
    border: '#E8D0D8',
    heroGradient: 'linear-gradient(to bottom, rgba(26,10,20,0.70) 0%, rgba(26,10,20,0.80) 100%)',
    ctaGradient: 'linear-gradient(135deg, #8B3050 0%, #6B1A35 100%)',
    trustBadgeBg: 'rgba(196,116,138,0.10)',
    fontHeading: '"Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 700,
    radiusSm: '20px',     // Soft, feminine pill shapes
    radiusMd: '16px',
    radiusLg: '12px',
    badgeShape: 'star',
    ctaStyle: 'warm-approachable',
    heroTextAlign: 'center',
    trustSignalStyle: 'badge-row',
  },

  'remote-professional': {
    key: 'remote-professional',
    label: 'יועצים ומקצועות חופשיים',
    // Warm Sage + Cream — calm, expertise, personal
    primary: '#1E3A4A',
    accent: '#7B9E87',
    accentAlt: '#A8C4B0',
    bg: '#F6F9F7',
    surface: '#FFFFFF',
    surfaceAlt: '#EDF2EF',
    textPrimary: '#0D1E28',
    textMuted: '#5A7A66',
    border: '#C4D8CC',
    heroGradient: 'linear-gradient(to bottom, rgba(30,58,74,0.78) 0%, rgba(13,30,40,0.85) 100%)',
    ctaGradient: 'linear-gradient(135deg, #1E3A4A 0%, #2D5566 100%)',
    trustBadgeBg: 'rgba(123,158,135,0.10)',
    fontHeading: '"Assistant", sans-serif',
    fontBody: '"Assistant", sans-serif',
    headingWeight: 700,
    radiusSm: '10px',
    radiusMd: '14px',
    radiusLg: '8px',
    badgeShape: 'certificate',
    ctaStyle: 'warm-approachable',
    heroTextAlign: 'right',
    trustSignalStyle: 'credential-card',
  },
};
