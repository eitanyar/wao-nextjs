import { DEFAULT_RUBRIC } from '@/lib/trainer/prompts';

interface Props {
  mastery: Record<string, number>;
  size?: number;
}

const RINGS = [0.25, 0.5, 0.75, 1];

function point(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.sin(angle), cy - r * Math.cos(angle)];
}

/**
 * Static SVG spider chart over the 8 rubric skills — server-rendered, no client JS.
 * A radar reads shape well but not precise magnitude, so the exact numbers are
 * always shown too: as direct labels on the chart and in the list below it
 * (also serves as the accessible/table-view fallback for screen readers).
 */
export default function SkillRadar({ mastery, size = 280 }: Props) {
  const skills = DEFAULT_RUBRIC;
  const n = skills.length;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 44; // leave room for labels
  const angleStep = (2 * Math.PI) / n;

  const values = skills.map((s) => Math.round(Math.max(0, Math.min(100, mastery[s.skill] ?? 0))));

  const dataPoints = skills.map((s, i) => point(cx, cy, maxR * (values[i] / 100), i * angleStep));
  const dataPath = `M${dataPoints.map(([x, y]) => `${x},${y}`).join('L')}Z`;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="auto"
      style={{ maxWidth: size }}
      role="img"
      aria-label={`מפת מיומנויות: ${skills.map((s) => `${s.labelHe} ${Math.round(mastery[s.skill] ?? 0)} מתוך 100`).join(', ')}`}
    >
      {RINGS.map((r) => {
        const ring = skills.map((_, i) => point(cx, cy, maxR * r, i * angleStep));
        return (
          <polygon
            key={r}
            points={ring.map(([x, y]) => `${x},${y}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        );
      })}

      {skills.map((_, i) => {
        const [x, y] = point(cx, cy, maxR, i * angleStep);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity={0.12} />;
      })}

      <path d={dataPath} fill="var(--accent, #6ee7b7)" fillOpacity={0.25} stroke="var(--accent, #6ee7b7)" strokeWidth={2} />

      {skills.map((s, i) => {
        const [lx, ly] = point(cx, cy, maxR + 26, i * angleStep);
        const anchor = Math.abs(lx - cx) < 4 ? 'middle' : lx > cx ? 'start' : 'end';
        return (
          <text
            key={s.skill}
            x={lx}
            y={ly}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={11}
            fill="currentColor"
            opacity={0.85}
          >
            {s.labelHe} ({values[i]})
          </text>
        );
      })}
    </svg>
  );
}

/** Accessible table-view fallback for the radar — same data, exact numbers. */
export function SkillRadarTable({ mastery }: { mastery: Record<string, number> }) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">מיומנויות ורמת שליטה מתוך 100</caption>
      <tbody>
        {DEFAULT_RUBRIC.map((s) => (
          <tr key={s.skill} className="border-b border-white/5 last:border-0">
            <th scope="row" className="py-1.5 text-start font-normal text-[var(--muted)]">
              {s.labelHe}
            </th>
            <td className="py-1.5 text-end tabular-nums">
              {Math.round(Math.max(0, Math.min(100, mastery[s.skill] ?? 0)))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
