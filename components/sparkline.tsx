// Tiny dependency-free SVG area sparkline (no chart library). Scales a numeric
// series to the box; renders a soft accent area + line. Server-renderable.
export function Sparkline({
  data,
  width = 240,
  height = 56,
  className = "",
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) {
    return <div className={`text-xs text-ink-faint ${className}`}>Not enough data yet.</div>;
  }
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pad = 3;
  const innerH = height - pad * 2;
  const step = width / (data.length - 1);

  const pts = data.map((v, i) => {
    const x = i * step;
    const y = pad + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });

  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className={className}>
      <path d={area} fill="var(--accent-soft)" />
      <path d={line} fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {pts.length > 0 && (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="var(--accent-primary)" />
      )}
    </svg>
  );
}
