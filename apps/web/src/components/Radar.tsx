import type { DimensionScore } from '@cabin/shared';

const ORDER = ['创新性', '可行性', '证据强度', '表达清晰度', '合规与复现'];

export function Radar({
  scores,
  size = 260,
  baseline = 72,
}: {
  scores: DimensionScore[];
  size?: number;
  baseline?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.31;
  const n = ORDER.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const point = (i: number, value: number) => {
    const r = (Math.max(0, Math.min(100, value)) / 100) * R;
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  };
  const byLabel = new Map(scores.map((s) => [s.label, s.score]));
  const values = ORDER.map((l) => byLabel.get(l) ?? 0);
  const poly = values.map((v, i) => point(i, v).join(',')).join(' ');
  const basePoly = ORDER.map((_, i) => point(i, baseline).join(',')).join(' ');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="radar">
      <defs>
        <radialGradient id="radar-fill" cx="50%" cy="50%" r="65%">
          <stop offset="0%" stopColor="#E8B45A" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#E8B45A" stopOpacity="0.06" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <polygon
          key={k}
          points={ORDER.map((_, i) => point(i, k * 100).join(',')).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,.075)"
          strokeWidth="1"
        />
      ))}
      {ORDER.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.06)" />;
      })}
      <polygon points={basePoly} fill="none" stroke="rgba(255,255,255,.18)" strokeDasharray="3 5" strokeWidth="1" />
      {values.some((v) => v > 0) && (
        <>
          <polygon points={poly} fill="url(#radar-fill)" stroke="#E8B45A" strokeWidth="1.8" />
          {values.map((v, i) => {
            const [x, y] = point(i, v);
            return <circle key={i} cx={x} cy={y} r="2.6" fill="#E8B45A" />;
          })}
        </>
      )}
      {ORDER.map((label, i) => {
        const [x, y] = point(i, 122);
        const cos = Math.cos(angle(i));
        const anchor = Math.abs(cos) < 0.25 ? 'middle' : cos > 0 ? 'start' : 'end';
        return (
          <g key={label}>
            <text x={x} y={y - 3} textAnchor={anchor} className="radar-label">
              {label}
            </text>
            <text x={x} y={y + 12} textAnchor={anchor} className="radar-value">
              {values[i] || '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
