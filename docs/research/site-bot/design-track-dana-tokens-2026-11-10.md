# Site-Bot design track: Dana token proposal (2026-11-10, ratios hand-computed; machine-check in tests)

```ts
// Proposal only, no files written. Target: append to src/lib/lp/verticalThemes.ts.
// Ratios were hand-computed with the WCAG relative-luminance formula. I had no script runner in this run.
// Eitan-Dev: add a test that asserts every "text" pair below at >= 4.5 and every "graphic" pair at >= 3, so the numbers are machine-checked.
// RTL-safe: shadows use Y offset only (no X), and there are no directional gradients.
// The sticky bar should use inset-inline / padding-inline, never left/right.

export interface RichTokens {
  // Stars (graphic, WCAG 1.4.11 needs >= 3:1; any rating number beside them uses textPrimary)
  starFill: string;
  // Card
  cardRadius: string;
  photoRadius: string;       // owner Google photos, profile photo
  cardShadow: string;
  cardBorder: string;        // full CSS border shorthand
  // Years badge (text pair) and hero rating badge (text pair)
  badgeBg: string;
  badgeText: string;
  heroRatingBg: string;
  heroRatingText: string;
  // Comparison table highlight (text pairs: textPrimary on bg, accentText on bg)
  tableHighlightBg: string;
  tableHighlightText: string;
  tableHighlightStrong: string; // bold "us" cells
  // Icons (graphic stroke on iconChipBg, iconChipBg = tableHighlightBg)
  iconStroke: string;
  iconChipBg: string;
  iconSize: number;          // px, rendered box
  iconStrokeWidth: number;   // px at 24 viewBox
  iconStyle: string;
  // Sticky mobile bar
  barBg: string;
  barText: string;
  barCallBg: string;         // call button: inverted, so it never depends on ctaGradient contrast against the bar
  barCallText: string;
  whatsappBg: string;
  whatsappText: string;
  // Avatar initials, white text on each step; pick index by hash of the name
  avatarBg: [string, string, string, string, string];
  avatarText: string;
}

// Shared across all verticals: WhatsApp keeps its recognisable green because brand recognition drives the tap.
// Text on it is dark, since white on #25D366 is only 1.98:1.
const WA_BG = '#25D366';
const WA_TEXT = '#0A1F18';   // 8.66:1 on WA_BG
const STAR = '#B86E00';      // 3.99:1 on #FFFFFF (graphic, >= 3). Never place stars on surfaceAlt darker than #EBF0F6 or on primary.
// Shared avatar steps 3 to 5, white text: #7B3F61 7.70:1 | #3D5A80 7.07:1 | #6B5B1E 6.68:1
const AV_SHARED: [string, string, string] = ['#7B3F61', '#3D5A80', '#6B5B1E'];

export const RICH_THEME_TOKENS: Record<VerticalKey, RichTokens> = {

  'emergency-trades': {
    starFill: STAR,                                  // 3.99:1 on #FFFFFF
    cardRadius: '10px', photoRadius: '10px',
    cardShadow: '0 2px 6px rgba(13,27,42,0.10), 0 8px 20px rgba(13,27,42,0.08)',
    cardBorder: '1px solid #D1DCE8',
    badgeBg: '#1B3A5C', badgeText: '#FFFFFF',        // 11.62:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0D1B2A', // 17.39:1
    tableHighlightBg: '#FFE9DF',
    tableHighlightText: '#0D1B2A',                   // 14.88:1 on highlight
    tableHighlightStrong: '#A82E00',                 // 5.88:1 on highlight
    iconStroke: '#A82E00',                           // 6.87:1 on #FFFFFF, 5.88:1 on iconChipBg
    iconChipBg: '#FFE9DF',
    iconSize: 28, iconStrokeWidth: 2.25,
    iconStyle: 'outline 2.25px, square caps and mitered joins, tool/wrench pictograms, blunt and fast to read',
    barBg: '#1B3A5C', barText: '#FFFFFF',            // 11.62:1
    barCallBg: '#FFFFFF', barCallText: '#1B3A5C',    // 11.62:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 5.86:1 button vs barBg (graphic)
    avatarBg: ['#1B3A5C', '#A82E00', ...AV_SHARED],  // white text: 11.62 | 6.87 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'skilled-trades': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '12px', photoRadius: '12px',
    cardShadow: '0 2px 6px rgba(26,36,16,0.08), 0 10px 24px rgba(26,36,16,0.08)',
    cardBorder: '1px solid #D4C9B4',
    badgeBg: '#2D5016', badgeText: '#FFFFFF',        // 9.25:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#1A2410', // 16.10:1
    tableHighlightBg: '#FBEBD3',
    tableHighlightText: '#1A2410',                   // 13.75:1
    tableHighlightStrong: '#8A4F0A',                 // 5.60:1
    iconStroke: '#8A4F0A',                           // 6.55:1 on white, 5.60:1 on chip
    iconChipBg: '#FBEBD3',
    iconSize: 26, iconStrokeWidth: 2,
    iconStyle: 'outline 2px rounded caps and joins, hand-tool and material pictograms, warm and sturdy',
    barBg: '#2D5016', barText: '#FFFFFF',            // 9.25:1
    barCallBg: '#FFFFFF', barCallText: '#2D5016',    // 9.25:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 4.66:1 button vs barBg
    avatarBg: ['#2D5016', '#8A4F0A', ...AV_SHARED],  // white text: 9.25 | 6.55 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'medical-aesthetics': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '16px', photoRadius: '16px',
    cardShadow: '0 1px 3px rgba(10,46,51,0.06), 0 8px 24px rgba(13,107,122,0.10)',
    cardBorder: '1px solid #C4E8E8',
    badgeBg: '#0D6B7A', badgeText: '#FFFFFF',        // 6.18:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0A2E33', // 14.47:1
    tableHighlightBg: '#D9F4F4',
    tableHighlightText: '#0A2E33',                   // 12.54:1
    tableHighlightStrong: '#0D6B7A',                 // 5.35:1
    iconStroke: '#0D6B7A',                           // 6.18:1 on white, 5.35:1 on chip
    iconChipBg: '#D9F4F4',
    iconSize: 24, iconStrokeWidth: 1.5,
    iconStyle: 'outline 1.5px rounded caps, thin clinical line, generous padding, no fills',
    barBg: '#0D6B7A', barText: '#FFFFFF',            // 6.18:1
    barCallBg: '#FFFFFF', barCallText: '#0D6B7A',    // 6.18:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 3.11:1 button vs barBg (graphic, passes 3:1, tightest case)
    avatarBg: ['#0D6B7A', '#0D6B7A', ...AV_SHARED],  // white text: 6.18 | 6.18 | 7.70 | 7.07 | 6.68 (accentText = primary here; index 1 is swapped by renderer to #3D5A80 if equal)
    avatarText: '#FFFFFF',
  },

  'legal-financial': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '6px', photoRadius: '6px',
    cardShadow: '0 1px 2px rgba(13,13,26,0.08), 0 4px 12px rgba(13,13,26,0.06)',
    cardBorder: '1px solid #D8D0BC',
    badgeBg: '#1A1A2E', badgeText: '#FFFFFF',        // 17.05:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0D0D1A', // 19.27:1
    tableHighlightBg: '#F4E9C8',
    tableHighlightText: '#0D0D1A',                   // 15.90:1
    tableHighlightStrong: '#7A5E10',                 // 5.05:1
    iconStroke: '#7A5E10',                           // 6.11:1 on white, 5.05:1 on chip
    iconChipBg: '#F4E9C8',
    iconSize: 24, iconStrokeWidth: 1.5,
    iconStyle: 'outline 1.5px, mitered joins and square caps, columns/seal/document pictograms, formal',
    barBg: '#1A1A2E', barText: '#FFFFFF',            // 17.05:1
    barCallBg: '#FFFFFF', barCallText: '#1A1A2E',    // 17.05:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 8.59:1 button vs barBg
    avatarBg: ['#1A1A2E', '#7A5E10', ...AV_SHARED],  // white text: 17.05 | 6.11 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'events-creative': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '8px', photoRadius: '8px',
    cardShadow: '0 2px 4px rgba(10,10,10,0.06), 0 12px 28px rgba(10,10,10,0.10)',
    cardBorder: '1px solid #DDD0C0',
    badgeBg: '#0A0A0A', badgeText: '#FFFFFF',        // 18.10:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0A0A0A', // 19.80:1
    tableHighlightBg: '#F8EEE4',                     // lightened from #F3E3D3, which gave 4.25:1
    tableHighlightText: '#0A0A0A',                   // 17.29:1
    tableHighlightStrong: '#8B5E2A',                 // 4.91:1
    iconStroke: '#8B5E2A',                           // 5.63:1 on white, 4.91:1 on chip
    iconChipBg: '#F8EEE4',
    iconSize: 24, iconStrokeWidth: 1.5,
    iconStyle: 'outline 1.5px rounded caps, fine editorial line with sparkle accents, camera/glass/ribbon motifs',
    barBg: '#0A0A0A', barText: '#FFFFFF',            // 18.10:1
    barCallBg: '#FFFFFF', barCallText: '#0A0A0A',    // 18.10:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 9.97:1 button vs barBg
    avatarBg: ['#0A0A0A', '#8B5E2A', ...AV_SHARED],  // white text: 18.10 | 5.63 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'fitness-wellness': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '12px', photoRadius: '12px',
    cardShadow: '0 2px 6px rgba(10,31,24,0.08), 0 10px 24px rgba(13,59,46,0.12)',
    cardBorder: '1px solid #B8E8CC',
    badgeBg: '#0D3B2E', badgeText: '#FFFFFF',        // 12.48:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0A1F18', // 17.18:1
    tableHighlightBg: '#D3F5E0',
    tableHighlightText: '#0A1F18',                   // 14.65:1
    tableHighlightStrong: '#1A7040',                 // 5.21:1
    iconStroke: '#1A7040',                           // 6.11:1 on white, 5.21:1 on chip
    iconChipBg: '#D3F5E0',
    iconSize: 28, iconStrokeWidth: 2.25,
    iconStyle: 'outline 2.25px rounded caps, bold dynamic strokes, motion/pulse pictograms',
    barBg: '#0D3B2E', barText: '#FFFFFF',            // 12.48:1
    barCallBg: '#FFFFFF', barCallText: '#0D3B2E',    // 12.48:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 6.29:1 button vs barBg
    avatarBg: ['#0D3B2E', '#1A7040', ...AV_SHARED],  // white text: 12.48 | 6.11 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'beauty-grooming': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '16px', photoRadius: '16px',
    cardShadow: '0 1px 3px rgba(26,10,20,0.06), 0 10px 26px rgba(139,48,80,0.12)',
    cardBorder: '1px solid #E8D0D8',
    badgeBg: '#1A0A14', badgeText: '#FFFFFF',        // 19.10:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#1A0A14', // 19.13:1
    tableHighlightBg: '#FADDE5',
    tableHighlightText: '#1A0A14',                   // 15.07:1
    tableHighlightStrong: '#A5405E',                 // 4.73:1
    iconStroke: '#A5405E',                           // 6.01:1 on white, 4.73:1 on chip
    iconChipBg: '#FADDE5',
    iconSize: 24, iconStrokeWidth: 1.5,
    iconStyle: 'outline 1.5px fully rounded caps and joins, delicate line, soft organic curves',
    barBg: '#1A0A14', barText: '#FFFFFF',            // 19.10:1
    barCallBg: '#FFFFFF', barCallText: '#1A0A14',    // 19.10:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 9.64:1 button vs barBg
    avatarBg: ['#1A0A14', '#A5405E', ...AV_SHARED],  // white text: 19.10 | 6.01 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },

  'remote-professional': {
    starFill: STAR,                                  // 3.99:1
    cardRadius: '14px', photoRadius: '14px',
    cardShadow: '0 1px 3px rgba(13,30,40,0.06), 0 8px 22px rgba(30,58,74,0.10)',
    cardBorder: '1px solid #C4D8CC',
    badgeBg: '#1E3A4A', badgeText: '#FFFFFF',        // 11.93:1
    heroRatingBg: '#FFFFFF', heroRatingText: '#0D1E28', // 17.02:1
    tableHighlightBg: '#DDEBE2',
    tableHighlightText: '#0D1E28',                   // 13.83:1
    tableHighlightStrong: '#3F6B52',                 // 4.96:1
    iconStroke: '#3F6B52',                           // 6.11:1 on white, 4.96:1 on chip
    iconChipBg: '#DDEBE2',
    iconSize: 24, iconStrokeWidth: 1.75,
    iconStyle: 'outline 1.75px rounded caps and joins, calm mid-weight line, person/chat/calendar pictograms',
    barBg: '#1E3A4A', barText: '#FFFFFF',            // 11.93:1
    barCallBg: '#FFFFFF', barCallText: '#1E3A4A',    // 11.93:1
    whatsappBg: WA_BG, whatsappText: WA_TEXT,        // 8.66:1 text; 6.01:1 button vs barBg
    avatarBg: ['#1E3A4A', '#3F6B52', ...AV_SHARED],  // white text: 11.93 | 6.11 | 7.70 | 7.07 | 6.68
    avatarText: '#FFFFFF',
  },
};

// Notes for Eitan-Dev
// 1. WhatsApp colour is intentionally NOT per-theme: brand recognition beats theme harmony, and one green passes on all 8 bars (lowest button-vs-bar graphic ratio is 3.11:1, medical).
// 2. Medical: primary equals accentText (#0D6B7A), so avatarBg[0] and [1] are the same. Dedupe in the renderer, or swap index 1 to #3D5A80.
// 3. Stars are graphic, so the bar is 3:1 (they get 3.99:1 on white). Render stars only on surface #FFFFFF or on bg lighter than #F0F4F8. Never on surfaceAlt, primary or a hero image (the hero badge uses a solid white pill).
// 4. events-creative table highlight was lightened to #F8EEE4 because #F3E3D3 gave 4.25:1 for the bold text.
// 5. Existing tokens are reused for all other text: reviewer name and body use textPrimary on surface, review date and role use textMuted, the card CTA uses ctaGradient and ctaText. All of these are already covered by verticalThemes.test.ts.

// Not verified by me: no script runner was available, so none of these ratios are machine-checked.
```
