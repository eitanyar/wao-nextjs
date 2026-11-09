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
