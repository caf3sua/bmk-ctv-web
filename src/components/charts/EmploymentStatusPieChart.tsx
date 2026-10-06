interface EmploymentStatusPieChartProps {
  activeCount: number;
  resignedCount: number;
  loading?: boolean;
}

const RADIUS = 56;
const STROKE_WIDTH = 20;
const SIZE = (RADIUS + STROKE_WIDTH / 2) * 2;
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function EmploymentStatusPieChart({
  activeCount,
  resignedCount,
  loading = false,
}: EmploymentStatusPieChartProps) {
  const total = activeCount + resignedCount;

  const activeFraction = total > 0 ? activeCount / total : 0;
  const resignedFraction = total > 0 ? resignedCount / total : 0;

  const activeDash = activeFraction * CIRCUMFERENCE;
  const resignedDash = resignedFraction * CIRCUMFERENCE;

  const activePct = total > 0 ? Math.round(activeFraction * 100) : 0;
  const resignedPct = total > 0 ? Math.round(resignedFraction * 100) : 0;

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="border-b border-border-subtle/60 pb-3">
        <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
          Tình trạng CTV
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Tỷ lệ CTV còn hiệu lực vs đã nghỉ việc
        </p>
      </div>

      {/* Donut Graphic */}
      <div className="relative my-auto flex flex-col items-center justify-center py-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            className="-rotate-90 overflow-visible"
          >
            {/* Background circle */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={STROKE_WIDTH}
            />

            {/* Còn hiệu lực arc (Emerald) */}
            {activeCount > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#00754A"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${activeDash} ${CIRCUMFERENCE - activeDash}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}

            {/* Nghỉ việc arc (Slate/Rose) */}
            {resignedCount > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#94a3b8"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${resignedDash} ${CIRCUMFERENCE - resignedDash}`}
                strokeDashoffset={-activeDash}
                className="transition-all duration-500"
              />
            )}
          </svg>

          {/* Center Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="font-mono text-xl font-bold text-slate-800">
              {total.toLocaleString()}
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Tổng CTV
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <ul className="space-y-2 text-xs border-t border-border-subtle/60 pt-3">
        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#00754A]" />
            <span className="font-medium">Còn hiệu lực</span>
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {activeCount.toLocaleString()}{' '}
            <span className="text-slate-400 font-normal">({activePct}%)</span>
          </span>
        </li>

        <li className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#94a3b8]" />
            <span className="font-medium">Nghỉ việc</span>
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {resignedCount.toLocaleString()}{' '}
            <span className="text-slate-400 font-normal">({resignedPct}%)</span>
          </span>
        </li>
      </ul>
    </div>
  );
}
