// Niv's asset manifest — curated per vertical.
// Hero images: Unsplash URLs (free commercial use).
// RTL-safety: all images have open left/center composition for Hebrew text overlay.
// Icons: Heroicons outline set (already installed or inline SVG strings).

import type { VerticalKey } from './verticalThemes';

export interface VerticalAssets {
  key: VerticalKey;
  // Hero: 3 options so the LP can rotate or A/B test. Use [0] as default.
  heroImages: Array<{
    url: string;              // Unsplash image URL (w=1400&q=80)
    alt: string;              // Hebrew alt text
    credit: string;           // Unsplash photographer name (legal attribution)
  }>;
  // Unsplash search query — for runtime dynamic fetching if needed
  unsplashQuery: string;
  // SVG icon names (Heroicons) for trust bar and service bullets
  trustIcons: {
    years: string;            // icon name
    rating: string;
    license: string;
    responseTime: string;
    guarantee: string;
  };
  // Badge accent: emoji or unicode symbol used in trust badges
  badgeEmoji: string;
}

export const VERTICAL_ASSETS: Record<VerticalKey, VerticalAssets> = {

  'emergency-trades': {
    key: 'emergency-trades',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1400&q=80', alt: 'אינסטלטור מקצועי עובד', credit: 'Sigmund' },
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80', alt: 'חשמלאי עובד על לוח חשמל', credit: 'Randal Honold' },
      { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80', alt: 'כלי עבודה מקצועיים', credit: 'Theme Photos' },
    ],
    unsplashQuery: 'plumber electrician tradesman professional tools',
    trustIcons: { years: 'clock', rating: 'star', license: 'badge-check', responseTime: 'bolt', guarantee: 'shield-check' },
    badgeEmoji: '🛡️',
  },

  'skilled-trades': {
    key: 'skilled-trades',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80', alt: 'בעל מקצוע עובד בגינה', credit: 'Theme Photos' },
      { url: 'https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=1400&q=80', alt: 'גנן מקצועי', credit: 'Dan Gold' },
      { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1400&q=80', alt: 'עבודת שיפוץ מקצועית', credit: 'Randal Honold' },
    ],
    unsplashQuery: 'craftsman renovation gardening skilled worker outdoor',
    trustIcons: { years: 'calendar', rating: 'star', license: 'badge-check', responseTime: 'map-pin', guarantee: 'shield-check' },
    badgeEmoji: '✅',
  },

  'medical-aesthetics': {
    key: 'medical-aesthetics',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1400&q=80', alt: 'מרפאה מקצועית ונקייה', credit: 'National Cancer Institute' },
      { url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=1400&q=80', alt: 'טיפול פנים מקצועי', credit: 'Nsey Benajah' },
      { url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=1400&q=80', alt: 'רופאה מחייכת', credit: 'Online Marketing' },
    ],
    unsplashQuery: 'medical clinic aesthetics skincare professional clean',
    trustIcons: { years: 'academic-cap', rating: 'star', license: 'identification', responseTime: 'calendar-days', guarantee: 'check-circle' },
    badgeEmoji: '⭐',
  },

  'legal-financial': {
    key: 'legal-financial',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=1400&q=80', alt: 'משרד עורכי דין מקצועי', credit: 'Scott Graham' },
      { url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1400&q=80', alt: 'ספרי משפט ומסמכים', credit: 'Giammarco Boscaro' },
      { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1400&q=80', alt: 'איש עסקים מקצועי', credit: 'Tyler Franta' },
    ],
    unsplashQuery: 'lawyer accountant office professional desk documents',
    trustIcons: { years: 'briefcase', rating: 'star', license: 'scale', responseTime: 'phone', guarantee: 'lock-closed' },
    badgeEmoji: '⚖️',
  },

  'events-creative': {
    key: 'events-creative',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1400&q=80', alt: 'צילום חתונה מקצועי', credit: 'Photos by Lanty' },
      { url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80', alt: 'אירוע גדול', credit: 'Pablo Heimplatz' },
      { url: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=1400&q=80', alt: 'מסיבה ואירוע', credit: 'Nainoa Shizuru' },
    ],
    unsplashQuery: 'wedding event photographer celebration elegant',
    trustIcons: { years: 'camera', rating: 'star', license: 'badge-check', responseTime: 'map-pin', guarantee: 'heart' },
    badgeEmoji: '📸',
  },

  'fitness-wellness': {
    key: 'fitness-wellness',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=80', alt: 'אימון כושר מקצועי', credit: 'Jonathan Borba' },
      { url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80', alt: 'חדר כושר מקצועי', credit: 'Sven Mieke' },
      { url: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1400&q=80', alt: 'מאמן אישי', credit: 'Geert Pieters' },
    ],
    unsplashQuery: 'personal trainer fitness gym workout healthy lifestyle',
    trustIcons: { years: 'fire', rating: 'star', license: 'badge-check', responseTime: 'clock', guarantee: 'arrow-trending-up' },
    badgeEmoji: '💪',
  },

  'beauty-grooming': {
    key: 'beauty-grooming',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1400&q=80', alt: 'ספרייה מקצועית', credit: 'Adam Winger' },
      { url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1400&q=80', alt: 'טיפול שיער מקצועי', credit: 'Adam Winger' },
      { url: 'https://images.unsplash.com/photo-1487412947147-5cebf100d293?w=1400&q=80', alt: 'מניקור ציפורניים', credit: 'Element5 Digital' },
    ],
    unsplashQuery: 'hair salon beauty nail nail art grooming professional',
    trustIcons: { years: 'scissors', rating: 'star', license: 'badge-check', responseTime: 'calendar', guarantee: 'sparkles' },
    badgeEmoji: '✨',
  },

  'remote-professional': {
    key: 'remote-professional',
    heroImages: [
      { url: 'https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=1400&q=80', alt: 'ייעוץ מקצועי אישי', credit: 'LinkedIn Sales Solutions' },
      { url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1400&q=80', alt: 'שיחת זום מקצועית', credit: 'Chris Montgomery' },
      { url: 'https://images.unsplash.com/photo-1494790108755-2616b612b913?w=1400&q=80', alt: 'מורה ויועץ', credit: 'Christina' },
    ],
    unsplashQuery: 'professional consultant therapist coach mentor office',
    trustIcons: { years: 'academic-cap', rating: 'star', license: 'identification', responseTime: 'video-camera', guarantee: 'chat-bubble-left-right' },
    badgeEmoji: '🎓',
  },
};
