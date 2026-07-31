/** Minimal SVG line chart — the empowered-vs-limiting ratio over weeks (vision §6). */
export default function RatioChart({ points }: { points: { date: string; ratio: number }[] }) {
  if (points.length < 2) {
    return <p className="text-sm text-[var(--muted)]">היחס יופיע כאן אחרי כמה שיחות.</p>;
  }

  const width = 320;
  const height = 100;
  const padding = 8;
  const xs = points.map((_, i) => padding + (i / (points.length - 1)) * (width - padding * 2));
  const ys = points.map((p) => height - padding - p.ratio * (height - padding * 2));
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" preserveAspectRatio="none">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="currentColor" strokeOpacity={0.15} />
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} />
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={2.5} fill="var(--accent)" />
      ))}
    </svg>
  );
}
