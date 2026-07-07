export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 60;
const STROKE_WIDTH = 20;
const SIZE = (RADIUS + STROKE_WIDTH / 2) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function DonutChart({
  segments,
  centerValue,
  centerLabel,
}: {
  segments: DonutSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  let offset = 0;
  const arcs = segments.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const dash = fraction * CIRCUMFERENCE;
    const arc = { ...s, dash, offset };
    offset += dash;
    return arc;
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} className="-rotate-90">
          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-border-subtle)" strokeWidth={STROKE_WIDTH} />
          {total > 0 &&
            arcs.map((arc) => (
              <circle
                key={arc.label}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${arc.dash} ${CIRCUMFERENCE - arc.dash}`}
                strokeDashoffset={-arc.offset}
              />
            ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-xl font-bold text-slate-900">{centerValue}</span>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="whitespace-nowrap font-mono font-semibold text-slate-800">
              {s.value} ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
