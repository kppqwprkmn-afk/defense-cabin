export function ScoreRing({
  value,
  size = 132,
  stroke = 7,
  label = '综合得分',
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  const color = value >= 82 ? '#8FD694' : value >= 70 ? '#E8B45A' : '#E06C5E';
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="score-ring-inner">
        <strong style={{ color }}>{value || '—'}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
