import { useState } from 'react';
import type { ExpiringMovementItem } from '../../types/reconciliation';

interface ExpiringContractsBarChartProps {
  data: ExpiringMovementItem[];
  totalExpiring: number;
  selectedDays: number;
  onSelectDays: (days: number) => void;
  loading?: boolean;
}

const DAY_OPTIONS = [7, 15, 30, 60];

const WIDTH = 720;
const HEIGHT = 210;
const PAD_LEFT = 36;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 22;

function getYTicks(maxValue: number): number[] {
  if (maxValue <= 4) {
    return Array.from({ length: Math.max(2, maxValue + 1) }, (_, i) => i);
  }
  const intervals = 4;
  const ticks = new Set<number>([0]);
  for (let i = 1; i < intervals; i++) {
    ticks.add(Math.round((maxValue * i) / intervals));
  }
  ticks.add(maxValue);
  return Array.from(ticks).sort((a, b) => a - b);
}

export default function ExpiringContractsBarChart({
  data,
  totalExpiring,
  selectedDays,
  onSelectDays,
  loading = false,
}: ExpiringContractsBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const rawMax = Math.max(0, ...data.map((d) => d.count));
  // Keep min scale at least 4 so the chart has sensible vertical space even with low/zero counts
  const maxValue = Math.max(rawMax, 4);
  const yTicks = getYTicks(maxValue);

  const countBars = data.length || 1;
  const slotWidth = plotWidth / countBars;
  // Dynamic bar width: wider for fewer days, thinner for 60 days
  const barWidth = Math.max(4, Math.min(28, slotWidth * 0.65));

  const labelStep = Math.max(1, Math.ceil(countBars / 7));

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header with Title and Day Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              Hợp đồng đến hạn theo ngày
            </h3>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-accent border border-emerald-200">
              {totalExpiring} HĐ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu đồ movement số lượng hợp đồng hết hạn trong {selectedDays} ngày tới
          </p>
        </div>

        {/* Day selection tabs: 7, 15, 30, 60 */}
        <div className="inline-flex rounded-full bg-slate-100 p-0.5 text-xs font-medium border border-slate-200">
          {DAY_OPTIONS.map((days) => {
            const active = selectedDays === days;
            return (
              <button
                key={days}
                type="button"
                onClick={() => onSelectDays(days)}
                className={`rounded-full px-3 py-1 font-mono transition-all duration-150 cursor-pointer ${
                  active
                    ? 'bg-accent text-white shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {days} ngày
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-4 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        )}

        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-44 sm:h-48 w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00754A" />
              <stop offset="100%" stopColor="#006241" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#cba258" />
              <stop offset="100%" stopColor="#b38738" />
            </linearGradient>
          </defs>

          {/* Y-axis Grid Lines & Tick Labels */}
          {yTicks.map((v) => {
            const y = HEIGHT - PAD_BOTTOM - (v / maxValue) * plotHeight;
            return (
              <g key={v}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={WIDTH - PAD_RIGHT}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                  strokeDasharray={v === 0 ? undefined : '3 3'}
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="font-mono text-[10px] font-medium fill-slate-400 select-none"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Baseline (0) */}
          <line
            x1={PAD_LEFT}
            y1={HEIGHT - PAD_BOTTOM}
            x2={WIDTH - PAD_RIGHT}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="#cbd5e1"
            strokeWidth="1.25"
          />

          {/* Bars */}
          {data.map((item, i) => {
            const cx = PAD_LEFT + i * slotWidth + slotWidth / 2;
            const x = cx - barWidth / 2;
            const hasValue = item.count > 0;
            const isHovered = hoveredIndex === i;

            // Height of the bar
            const h = hasValue
              ? Math.max(4, (item.count / maxValue) * plotHeight)
              : 2; // small indicator for 0
            const y = HEIGHT - PAD_BOTTOM - h;

            return (
              <g key={item.date}>
                {/* Background slot on hover */}
                {isHovered && (
                  <rect
                    x={cx - slotWidth / 2}
                    y={PAD_TOP}
                    width={slotWidth}
                    height={plotHeight}
                    fill="#00754a"
                    fillOpacity="0.05"
                    className="pointer-events-none"
                  />
                )}

                {/* The Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  rx={Math.min(3, barWidth / 2)}
                  ry={Math.min(3, barWidth / 2)}
                  fill={
                    isHovered
                      ? 'url(#barGradientHover)'
                      : hasValue
                        ? 'url(#barGradientActive)'
                        : '#e2e8f0'
                  }
                  className="transition-colors duration-150"
                />

                {/* Number badge on top of bar if count > 0 */}
                {hasValue && (
                  <text
                    x={cx}
                    y={Math.max(PAD_TOP + 10, y - 4)}
                    textAnchor="middle"
                    className="font-mono text-[9px] font-bold fill-slate-700 select-none"
                  >
                    {item.count}
                  </text>
                )}

                {/* Transparent hit area for hover */}
                <rect
                  x={cx - slotWidth / 2}
                  y={PAD_TOP}
                  width={slotWidth}
                  height={plotHeight + PAD_BOTTOM}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* X-axis Date Labels */}
        <div className="relative mt-2 h-5 w-full text-[10px] text-slate-400 select-none">
          {data.map((item, i) => {
            const shouldShowLabel =
              i % labelStep === 0 || i === data.length - 1;
            if (!shouldShowLabel) return null;

            const cx = PAD_LEFT + i * slotWidth + slotWidth / 2;
            const pct = (cx / WIDTH) * 100;

            return (
              <span
                key={item.date}
                className="absolute -translate-x-1/2 whitespace-nowrap font-mono"
                style={{ left: `${pct}%` }}
              >
                {item.label}
              </span>
            );
          })}
        </div>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            className="absolute z-20 pointer-events-none rounded-lg bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-sm transition-all duration-75 whitespace-nowrap border border-slate-700"
            style={{
              left: `${
                ((PAD_LEFT +
                  hoveredIndex * slotWidth +
                  slotWidth / 2) /
                  WIDTH) *
                100
              }%`,
              top: '20px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] text-slate-400 font-medium">
              Ngày {data[hoveredIndex].date.split('-').reverse().join('/')} ({data[hoveredIndex].label})
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-semibold text-emerald-400 font-mono">
              <span className="text-sm">{data[hoveredIndex].count}</span>
              <span className="text-xs text-slate-200 font-sans font-normal">
                hợp đồng đến hạn
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Note if 0 contracts */}
      {totalExpiring === 0 && !loading && (
        <div className="mt-8 mb-2 text-center text-xs text-slate-400 italic">
          Hiện chưa có hợp đồng nào đến hạn trong {selectedDays} ngày tới.
        </div>
      )}
    </div>
  );
}
