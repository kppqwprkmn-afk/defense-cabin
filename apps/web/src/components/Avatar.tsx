import { PERSONAS, type PersonaId } from '@cabin/shared';

export function Avatar({
  id,
  size = 40,
  live = false,
}: {
  id: PersonaId;
  size?: number;
  live?: boolean;
}) {
  const p = PERSONAS[id];
  const style = {
    width: size,
    height: size,
    background: `radial-gradient(circle at 30% 25%, ${p.color}44, ${p.color}12 55%, #10141b 100%)`,
    borderColor: `${p.color}55`,
    color: p.color,
    fontSize: Math.max(13, size * 0.36),
  };
  return (
    <span className={`avatar avatar-${id}`} style={style} aria-label={p.name}>
      <span className="avatar-glyph">{p.short}</span>
      {live && <i className="avatar-live" style={{ background: p.color }} />}
    </span>
  );
}
