interface EmploymentStatusPieChartProps {
  activeCount: number;
  resignedCount: number;
  activeWithExpiry?: number;
  activeWithoutExpiry?: number;
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
  activeWithExpiry = 0,
  activeWithoutExpiry = 0,
  loading = false,
}: EmploymentStatusPieChartProps) {
  const total = activeCount + resignedCount;

  const withExpiry = activeWithExpiry;
  const withoutExpiry = activeWithoutExpiry;

  const activeFraction = total > 0 ? activeCount / total : 0;
  const resignedFraction = total > 0 ? resignedCount / total : 0;

  const withExpiryFraction = total > 0 ? withExpiry / total : 0;
  const withoutExpiryFraction = total > 0 ? withoutExpiry / total : 0;

  const withExpiryDash = withExpiryFraction * CIRCUMFERENCE;
  const withoutExpiryDash = withoutExpiryFraction * CIRCUMFERENCE;
  const resignedDash = resignedFraction * CIRCUMFERENCE;
  const activeDash = activeFraction * CIRCUMFERENCE;

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
      <div className="relative my-auto flex flex-col items-center justify-center py-3">
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

            {/* Còn hiệu lực: Có ngày đáo hạn arc (Emerald) */}
            {withExpiry > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#00754A"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${withExpiryDash} ${CIRCUMFERENCE - withExpiryDash}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            )}

            {/* Còn hiệu lực: Thiếu ngày đáo hạn arc (Amber) */}
            {withoutExpiry > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#f59e0b"
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${withoutExpiryDash} ${CIRCUMFERENCE - withoutExpiryDash}`}
                strokeDashoffset={-withExpiryDash}
                className="transition-all duration-500"
              />
            )}

            {/* Nghỉ việc arc (Slate) */}
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

      {/* Legend & Breakdown */}
      <div className="border-t border-border-subtle/60 pt-3 space-y-2 text-xs">
        {/* Còn hiệu lực Group */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-slate-800">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#00754A]" />
              <span className="font-semibold">Còn hiệu lực</span>
            </span>
            <span className="font-mono font-semibold text-slate-800">
              {activeCount.toLocaleString()}{' '}
              <span className="text-slate-400 font-normal">({activePct}%)</span>
            </span>
          </div>

          {/* 2 thông tin con liên quan đến Còn hiệu lực */}
          <div className="mt-1.5 ml-4 rounded-lg bg-slate-50 border border-slate-100 p-2 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span>Có ngày đáo hạn:</span>
              </span>
              <span className="font-mono font-semibold text-emerald-700">
                {withExpiry.toLocaleString()}{' '}
                {activeCount > 0 && (
                  <span className="text-slate-400 font-normal">
                    ({Math.round((withExpiry / activeCount) * 100)}%)
                  </span>
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Thiếu ngày đáo hạn:</span>
              </span>
              <span className="font-mono font-semibold text-amber-600">
                {withoutExpiry.toLocaleString()}{' '}
                {activeCount > 0 && (
                  <span className="text-slate-400 font-normal">
                    ({Math.round((withoutExpiry / activeCount) * 100)}%)
                  </span>
                )}
              </span>
            </div>

            {/* Thanh tiến trình mini hiển thị tỷ lệ */}
            {activeCount > 0 && (
              <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden flex mt-1">
                <div
                  className="bg-emerald-600 h-full transition-all duration-500"
                  style={{ width: `${(withExpiry / activeCount) * 100}%` }}
                  title={`Có ngày đáo hạn: ${withExpiry.toLocaleString()}`}
                />
                <div
                  className="bg-amber-400 h-full transition-all duration-500"
                  style={{ width: `${(withoutExpiry / activeCount) * 100}%` }}
                  title={`Thiếu ngày đáo hạn: ${withoutExpiry.toLocaleString()}`}
                />
              </div>
            )}
          </div>
        </div>

        {/* Nghỉ việc Group */}
        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-dashed border-slate-200">
          <span className="flex items-center gap-2 text-slate-700">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#94a3b8]" />
            <span className="font-semibold">Nghỉ việc</span>
          </span>
          <span className="font-mono font-semibold text-slate-800">
            {resignedCount.toLocaleString()}{' '}
            <span className="text-slate-400 font-normal">({resignedPct}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
