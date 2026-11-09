import test from 'node:test';
import assert from 'node:assert/strict';
import { VERTICAL_THEMES, type VerticalTheme } from './verticalThemes';

// M2b.1b (Dana): WCAG 2.x contrast for the text tokens. Every theme also feeds the non-research LPs.

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`not a #RRGGBB colour: ${hex}`);
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The #RRGGBB stops of a CSS gradient string. */
export function gradientStops(gradient: string): string[] {
  return gradient.match(/#[0-9a-f]{6}\b/gi) ?? [];
}

export function themeContrastPairs(theme: VerticalTheme): Array<{ pair: string; ratio: number }> {
  const stops = gradientStops(theme.ctaGradient);
  return [
    ...stops.map((stop, i) => ({ pair: `ctaText on ctaGradient[${i}] ${stop}`, ratio: contrastRatio(theme.ctaText, stop) })),
    ...(['surface', 'surfaceAlt', 'bg'] as const).flatMap(bg => [
      { pair: `accentText on ${bg}`, ratio: contrastRatio(theme.accentText, theme[bg]) },
      { pair: `textMuted on ${bg}`, ratio: contrastRatio(theme.textMuted, theme[bg]) },
    ]),
  ];
}

test('contrast helper matches known WCAG values', () => {
  assert.equal(contrastRatio('#000000', '#FFFFFF').toFixed(1), '21.0');
  assert.equal(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
  assert.deepEqual(gradientStops('linear-gradient(135deg, #C43C08 0%, #A82E00 100%)'), ['#C43C08', '#A82E00']);
});

test('M2b.1b: every theme meets 4.5:1 for ctaText on each ctaGradient stop, accentText and textMuted on surface/surfaceAlt/bg', () => {
  for (const theme of Object.values(VERTICAL_THEMES)) {
    assert.equal(gradientStops(theme.ctaGradient).length, 2, `${theme.key}: gradient stops parse`);
    for (const { pair, ratio } of themeContrastPairs(theme)) assert.ok(ratio >= 4.5, `${theme.key}: ${pair} = ${ratio.toFixed(2)}`);
  }
});

/** An `rgba(255,255,255,a)` tint composited over an opaque #RRGGBB base (the trust-bar chip background). */
export function blendWhiteTint(alpha: number, base: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(base.trim());
  if (!m) throw new Error(`not a #RRGGBB colour: ${base}`);
  return `#${[0, 2, 4].map(i => Math.round(255 * alpha + parseInt(m[1].slice(i, i + 2), 16) * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
}

/** Trust-bar chip tint alpha — keep in sync with trustBarSection (renderSitePages.ts), renderStaticHtml.ts and LandingPage.tsx. */
export const TRUST_CHIP_TINT_ALPHA = 0.12;

test('M2b.1c: accentFillText on a solid accent fill meets 4.5:1 in all 8 themes', () => {
  const themes = Object.values(VERTICAL_THEMES);
  assert.equal(themes.length, 8);
  for (const theme of themes) {
    const ratio = contrastRatio(theme.accentFillText, theme.accent);
    assert.ok(ratio >= 4.5, `${theme.key}: accentFillText ${theme.accentFillText} on accent ${theme.accent} = ${ratio.toFixed(2)}`);
  }
});

test('M2b.1c: white trust-bar chip text on the blended chip background (12% white over primary) meets 4.5:1 in all 8 themes', () => {
  assert.equal(blendWhiteTint(0.5, '#000000'), '#808080');
  for (const theme of Object.values(VERTICAL_THEMES)) {
    const chipBg = blendWhiteTint(TRUST_CHIP_TINT_ALPHA, theme.primary);
    const ratio = contrastRatio('#FFFFFF', chipBg);
    assert.ok(ratio >= 4.5, `${theme.key}: #FFFFFF on chip ${chipBg} = ${ratio.toFixed(2)}`);
  }
});
