import { useState } from 'react';
import type { MonthlyCollaboratorCountStat } from '../../types/expense';

export interface CollaboratorMonthlyCountLineChartProps {
  data: MonthlyCollaboratorCountStat[];
  totalCollaborators: number;
  loading?: boolean;
  timeRange?: '12m' | 'all';
  onTimeRangeChange?: (range: '12m' | 'all') => void;
}

const WIDTH = 900;
const HEIGHT = 280;
const PAD_LEFT = 55;
const PAD_RIGHT = 30;
const PAD_TOP = 28;
const PAD_BOTTOM = 46;
const INNER_PAD = 20;

// Dynamic range scaling to highlight monthly differences
function getDynamicCountRange(data: { count: number }[]): {
  minVal: number;
  maxVal: number;
  ticks: number[];
} {
  if (data.length === 0) {
    return { minVal: 0, maxVal: 10, ticks: [0, 2, 4, 6, 8, 10] };
  }

  const counts = data.map((d) => d.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const delta = max - min;

  if (delta === 0) {
    const pad = Math.max(20, Math.round(min * 0.15));
    const b = Math.max(0, min - pad);
    const t = max + pad;
    return { minVal: b, maxVal: t, ticks: [b, min, t] };
  }

  // 12% breathing room above and below to give the curve maximum dynamic amplitude
  const padding = Math.max(10, delta * 0.12);
  const rawBottom = Math.max(0, min - padding);
  const rawTop = max + padding;
  const range = rawTop - rawBottom;

  const rawStep = range / 5;
  const power = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, power);
  const frac = rawStep / magnitude;

  let step: number;
  if (frac <= 1.2) step = 1.0 * magnitude;
  else if (frac <= 2.2) step = 2.0 * magnitude;
  else if (frac <= 3.2) step = 2.5 * magnitude;
  else if (frac <= 6.5) step = 5.0 * magnitude;
  else step = 10.0 * magnitude;

  // Round minVal down to multiple of step
  let minVal = Math.floor(rawBottom / step) * step;
  // Round maxVal up to multiple of step
  let maxVal = Math.ceil(rawTop / step) * step;

  // Ensure at least 4 intervals
  while ((maxVal - minVal) / step < 4) {
    if (minVal >= step) {
      minVal -= step;
    } else {
      maxVal += step;
    }
  }

  const ticks: number[] = [];
  for (let t = minVal; t <= maxVal + step * 0.001; t += step) {
    ticks.push(t);
  }

  return { minVal, maxVal, ticks };
}

// Fallback Zero-based ticks
function getZeroCountRange(maxValue: number, intervals = 4): {
  minVal: number;
  maxVal: number;
  ticks: number[];
} {
  if (maxValue <= 5) {
    const ticks = Array.from({ length: Math.max(2, maxValue + 1) }, (_, i) => i);
    return { minVal: 0, maxVal: ticks[ticks.length - 1], ticks };
  }
  const rawStep = maxValue / intervals;
  const power = Math.floor(Math.log10(rawStep));
  const magnitude = Math.pow(10, power);
  const frac = rawStep / magnitude;

  let niceStep: number;
  if (frac <= 1.0) niceStep = 1.0 * magnitude;
  else if (frac <= 1.25) niceStep = 1.25 * magnitude;
  else if (frac <= 1.5) niceStep = 1.5 * magnitude;
  else if (frac <= 2.0) niceStep = 2.0 * magnitude;
  else if (frac <= 2.5) niceStep = 2.5 * magnitude;
  else if (frac <= 5.0) niceStep = 5.0 * magnitude;
  else niceStep = 10.0 * magnitude;

  const ticks = [0];
  let current = 0;
  while (current < maxValue || ticks.length <= intervals) {
    current += niceStep;
    ticks.push(current);
  }
  return { minVal: 0, maxVal: ticks[ticks.length - 1], ticks };
}

// Smooth Catmull-Rom cubic Bezier path
function getSmoothBezierPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    let cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    let cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;

    const minY = PAD_TOP - 8;
    const maxY = HEIGHT - PAD_BOTTOM + 2;
    cp1y = Math.max(minY, Math.min(maxY, cp1y));
    cp2y = Math.max(minY, Math.min(maxY, cp2y));

    path += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return path;
}

export default function CollaboratorMonthlyCountLineChart({
  data,
  totalCollaborators,
  loading = false,
  timeRange,
  onTimeRangeChange,
}: CollaboratorMonthlyCountLineChartProps) {
  const [internalTimeRange, setInternalTimeRange] = useState<'12m' | 'all'>('12m');
  const currentTimeRange = timeRange !== undefined ? timeRange : internalTimeRange;

  const handleTimeRangeChange = (newRange: '12m' | 'all') => {
    setInternalTimeRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // Default to dynamic scaling to clearly highlight monthly fluctuations as requested
  const [isDynamicScale, setIsDynamicScale] = useState<boolean>(true);

  // Slice data based on selected time range (default 12 months)
  const displayData = currentTimeRange === '12m' && data.length > 12 ? data.slice(-12) : data;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const rawMax = Math.max(0, ...displayData.map((d) => d.count));
  const rawMin = displayData.length > 0 ? Math.min(...displayData.map((d) => d.count)) : 0;

  // Use dynamic range if active, else zero-baseline
  const { minVal, maxVal, ticks: yTicks } = isDynamicScale
    ? getDynamicCountRange(displayData)
    : getZeroCountRange(rawMax, 4);

  const count = displayData.length;
  const usableWidth = count > 1 ? plotWidth - 2 * INNER_PAD : 0;

  const getY = (val: number) => {
    const range = maxVal - minVal;
    if (range <= 0) return HEIGHT - PAD_BOTTOM;
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return PAD_TOP + plotHeight - ((clamped - minVal) / range) * plotHeight;
  };

  const points = displayData.map((item, i) => {
    const x =
      count > 1
        ? PAD_LEFT + INNER_PAD + (i / (count - 1)) * usableWidth
        : PAD_LEFT + plotWidth / 2;

    return {
      x,
      y: getY(item.count),
      item,
    };
  });

  const ptsLine = points.map((p) => ({ x: p.x, y: p.y }));
  const pathLine = getSmoothBezierPath(ptsLine);

  // Area under curve down to baseline
  const pathArea =
    ptsLine.length > 1
      ? `${pathLine} L ${ptsLine[ptsLine.length - 1].x} ${HEIGHT - PAD_BOTTOM} L ${ptsLine[0].x} ${HEIGHT - PAD_BOTTOM} Z`
      : '';

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  // Key metrics
  const avgCount = count > 0 ? Math.round(displayData.reduce((sum, d) => sum + d.count, 0) / count) : 0;
  const maxItem = displayData.find((d) => d.count === rawMax);
  const minItem = displayData.find((d) => d.count === rawMin);

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              Số CTV được thanh toán theo tháng
            </h3>
            <span
              className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200"
              title="Tổng cộng tác viên nhận tiền"
            >
              {totalCollaborators.toLocaleString('vi-VN')} CTV
            </span>
            {avgCount > 0 && (
              <span
                className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-medium text-slate-600 border border-slate-200"
                title={`Số CTV bình quân mỗi kỳ (${currentTimeRange === '12m' ? '12 tháng gần nhất' : 'Toàn bộ các tháng'})`}
              >
                TB: {avgCount.toLocaleString('vi-VN')} CTV
              </span>
            )}
            {rawMax > 0 && rawMin > 0 && (
              <span
                className="rounded-full bg-slate-50 px-2 py-0.5 font-mono text-[11px] text-slate-600 border border-slate-200"
                title={`Biên độ biến động: Thấp nhất ${rawMin} (${minItem?.label}) - Cao nhất ${rawMax} (${maxItem?.label})`}
              >
                Min {rawMin} — Max {rawMax}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu đồ đường thể hiện biến động số lượng cộng tác viên nhận thanh toán qua từng kỳ ({currentTimeRange === '12m' ? '12 tháng gần nhất' : `toàn bộ ${data.length} tháng`})
          </p>
        </div>

        {/* Controls: Time Range & Dynamic Scale Toggles */}
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          {/* Time Range Toggle: 12 tháng gần nhất (default) vs Toàn bộ */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => handleTimeRangeChange('12m')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                currentTimeRange === '12m'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Dữ liệu 12 tháng gần nhất (mặc định)"
            >
              <span className="hidden sm:inline">12 tháng gần nhất</span>
              <span className="sm:hidden">12 tháng</span>
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange('all')}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                currentTimeRange === 'all'
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title={`Dữ liệu toàn bộ các tháng (${data.length} tháng)`}
            >
              <span className="hidden sm:inline">Toàn bộ các tháng</span>
              <span className="sm:hidden">Toàn bộ</span>
            </button>
          </div>

          {/* View Mode Toggle: Dynamic Scale vs Zero-baseline */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setIsDynamicScale(true)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                isDynamicScale
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tối ưu thang đo trục Y theo biên độ dữ liệu để làm nổi bật độ dốc và sự chênh lệch giữa các tháng"
            >
              Nổi bật biến động
            </button>
            <button
              type="button"
              onClick={() => setIsDynamicScale(false)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                !isDynamicScale
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Thang đo trục Y bắt đầu từ mốc 0"
            >
              Gốc 0
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas & Tooltip Container */}
      <div className="relative mt-4 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
              Đang tải biểu đồ...
            </div>
          </div>
        )}

        {data.length === 0 && !loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu thanh toán chi phí CTV
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <div className="relative min-w-[640px]">
              <svg
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                className="w-full h-auto overflow-visible select-none"
                style={{ maxHeight: 280 }}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <defs>
                  <linearGradient id="collabAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Y-axis labels */}
                {yTicks.map((tickVal) => {
                  const y = getY(tickVal);
                  return (
                    <g key={`y-${tickVal}`}>
                      <line
                        x1={PAD_LEFT}
                        y1={y}
                        x2={WIDTH - PAD_RIGHT}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth={1}
                        strokeDasharray={tickVal === minVal ? undefined : '3 3'}
                      />
                      <text
                        x={PAD_LEFT - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize={10}
                        fill="#64748b"
                        className="font-mono font-medium"
                      >
                        {tickVal.toLocaleString('vi-VN')}
                      </text>
                    </g>
                  );
                })}

                {/* Left axis indicator label */}
                <text
                  x={PAD_LEFT}
                  y={PAD_TOP - 12}
                  fontSize={9.5}
                  fill="#059669"
                  fontWeight="600"
                  textAnchor="start"
                >
                  Số lượng CTV {isDynamicScale ? `(${minVal.toLocaleString('vi-VN')} - ${maxVal.toLocaleString('vi-VN')})` : ''}
                </text>

                {/* Average Reference Line */}
                {avgCount > 0 && isDynamicScale && (
                  <g className="select-none">
                    <line
                      x1={PAD_LEFT}
                      y1={getY(avgCount)}
                      x2={WIDTH - PAD_RIGHT}
                      y2={getY(avgCount)}
                      stroke="#0284c7"
                      strokeWidth={1.2}
                      strokeDasharray="4 4"
                      strokeOpacity={0.65}
                    />
                    <rect
                      x={WIDTH - PAD_RIGHT - 110}
                      y={getY(avgCount) - 9}
                      width={110}
                      height={16}
                      rx={3}
                      fill="#f0f9ff"
                      stroke="#bae6fd"
                      strokeWidth={0.8}
                    />
                    <text
                      x={WIDTH - PAD_RIGHT - 55}
                      y={getY(avgCount) + 2.5}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#0369a1"
                      fontWeight="600"
                      className="font-mono"
                    >
                      TB: {avgCount.toLocaleString('vi-VN')} CTV
                    </text>
                  </g>
                )}

                {/* Vertical hairline guideline on hover */}
                {activePoint && (
                  <line
                    x1={activePoint.x}
                    y1={PAD_TOP}
                    x2={activePoint.x}
                    y2={HEIGHT - PAD_BOTTOM}
                    stroke="#94a3b8"
                    strokeWidth={1.5}
                  />
                )}

                {/* Area glow */}
                {pathArea && <path d={pathArea} fill="url(#collabAreaGrad)" />}

                {/* Smooth Bezier Line */}
                {pathLine && (
                  <path
                    d={pathLine}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Point markers */}
                {points.map((p, idx) => (
                  <circle
                    key={`pt-${p.item.period || idx}`}
                    cx={p.x}
                    cy={p.y}
                    r={3.8}
                    fill="#059669"
                    stroke="#ffffff"
                    strokeWidth={1.8}
                  />
                ))}

                {/* Value label on top of point - follows the dynamic wave */}
                {count <= 24 &&
                  points.map((p, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isMax = p.item.count === rawMax;
                    const isMin = p.item.count === rawMin;

                    if (isMax) {
                      return (
                        <g key={`val-${p.item.period || idx}`} className="select-none">
                          <rect
                            x={p.x - 25}
                            y={p.y - 23}
                            width={50}
                            height={15}
                            rx={4}
                            fill="#1d4ed8"
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                          <text
                            x={p.x}
                            y={p.y - 12.5}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={700}
                            fill="#ffffff"
                            className="font-mono"
                          >
                            ▲ {p.item.count}
                          </text>
                        </g>
                      );
                    }

                    if (isMin) {
                      return (
                        <g key={`val-${p.item.period || idx}`} className="select-none">
                          <rect
                            x={p.x - 23}
                            y={p.y + 7}
                            width={46}
                            height={15}
                            rx={4}
                            fill="#b45309"
                            stroke="#ffffff"
                            strokeWidth={1}
                          />
                          <text
                            x={p.x}
                            y={p.y + 17.5}
                            textAnchor="middle"
                            fontSize={9}
                            fontWeight={700}
                            fill="#ffffff"
                            className="font-mono"
                          >
                            ▼ {p.item.count}
                          </text>
                        </g>
                      );
                    }

                    return (
                      <text
                        key={`val-${p.item.period || idx}`}
                        x={p.x}
                        y={p.y - 8}
                        textAnchor="middle"
                        fontSize={isHovered ? 10 : 9}
                        fontWeight={isHovered ? 700 : 500}
                        fill={isHovered ? '#047857' : '#475569'}
                        className="font-mono select-none"
                      >
                        {p.item.count}
                      </text>
                    );
                  })}

                {/* Hover active dot with prominent halo */}
                {activePoint && (
                  <>
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r={7.5}
                      fill="#059669"
                      fillOpacity={0.25}
                    />
                    <circle
                      cx={activePoint.x}
                      cy={activePoint.y}
                      r={4.8}
                      fill="#059669"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  </>
                )}

                {/* X-axis tick labels */}
                {points.map((p, idx) => {
                  const isHovered = hoveredIndex === idx;
                  const isRotated = count > 8;
                  const shortLabel =
                    count > 10 && p.item.label.length === 7 && p.item.label.includes('/')
                      ? `${p.item.label.slice(0, 3)}${p.item.label.slice(5)}`
                      : p.item.label;

                  return (
                    <text
                      key={`x-label-${p.item.period || idx}`}
                      x={p.x}
                      y={HEIGHT - PAD_BOTTOM + (isRotated ? 12 : 16)}
                      textAnchor={isRotated ? 'end' : 'middle'}
                      fontSize={isRotated ? 9 : 10}
                      fontWeight={isHovered ? 700 : 500}
                      fill={isHovered ? '#0f172a' : '#64748b'}
                      transform={
                        isRotated
                          ? `rotate(-35, ${p.x}, ${HEIGHT - PAD_BOTTOM + 12})`
                          : undefined
                      }
                      className="font-mono select-none"
                    >
                      {shortLabel}
                    </text>
                  );
                })}

                {/* Transparent hover interceptors */}
                {points.map((p, idx) => {
                  const step = count > 1 ? usableWidth / (count - 1) : plotWidth;
                  const rectLeft = idx === 0 ? PAD_LEFT : p.x - step / 2;
                  const rectRight = idx === count - 1 ? WIDTH - PAD_RIGHT : p.x + step / 2;
                  const rectW = Math.max(1, rectRight - rectLeft);

                  return (
                    <rect
                      key={`hover-col-${p.item.period || idx}`}
                      x={rectLeft}
                      y={PAD_TOP}
                      width={rectW}
                      height={plotHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(idx)}
                    />
                  );
                })}
              </svg>

              {/* Floating Tooltip Card */}
              {activePoint && (
                <div
                  className="absolute z-30 pointer-events-none rounded-xl bg-white/98 px-3.5 py-3 shadow-xl border border-slate-200/80 backdrop-blur-md min-w-[210px] transition-all duration-75 text-xs select-none"
                  style={{
                    left: `${(activePoint.x / WIDTH) * 100}%`,
                    top: '12%',
                    transform:
                      activePoint.x > WIDTH * 0.6
                        ? 'translate(calc(-100% - 16px), 0)'
                        : 'translate(16px, 0)',
                  }}
                >
                  <div className="font-semibold text-slate-800 text-xs pb-1.5 mb-2 border-b border-slate-100 flex items-center justify-between">
                    <span>{activePoint.item.label}</span>
                    <span className="text-[10px] font-normal text-slate-400 font-mono">
                      Kỳ {activePoint.item.period}
                    </span>
                  </div>
                  <div className="space-y-1.5 font-medium">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                        <span>Cộng tác viên:</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {activePoint.item.count.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    {/* Compare to previous period if available */}
                    {hoveredIndex !== null && hoveredIndex > 0 && displayData[hoveredIndex - 1] && (
                      <div className="text-[11px] pt-1.5 border-t border-slate-100 flex items-center justify-between text-slate-500">
                        <span>So với kỳ trước:</span>
                        {(() => {
                          const prev = displayData[hoveredIndex - 1].count;
                          const diff = activePoint.item.count - prev;
                          const pct = prev > 0 ? ((diff / prev) * 100).toFixed(1) : 0;
                          if (diff > 0) {
                            return (
                              <span className="font-mono font-bold text-emerald-600">
                                +{diff.toLocaleString('vi-VN')} (+{pct}%)
                              </span>
                            );
                          }
                          if (diff < 0) {
                            return (
                              <span className="font-mono font-bold text-rose-500">
                                {diff.toLocaleString('vi-VN')} ({pct}%)
                              </span>
                            );
                          }
                          return <span className="font-mono text-slate-400">Không đổi</span>;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend & What it shows Section */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
        <h4 className="text-xs font-semibold text-slate-700">
          Biểu đồ biến động số lượng cộng tác viên nhận thanh toán
        </h4>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-semibold shadow-2xs border border-emerald-200/50">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span>Số lượng CTV được chi trả</span>
          </div>

          {avgCount > 0 && isDynamicScale && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-medium border border-sky-200/60 shadow-2xs">
              <span className="w-3 border-t-2 border-dashed border-sky-600 inline-block" />
              <span>Đường trung bình ({avgCount.toLocaleString('vi-VN')} CTV)</span>
            </div>
          )}

          {rawMax > 0 && maxItem && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-semibold border border-blue-200/60">
              <span>▲ Đỉnh: {rawMax.toLocaleString('vi-VN')} ({maxItem.label})</span>
            </div>
          )}

          {rawMin > 0 && minItem && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200/60">
              <span>▼ Đáy: {rawMin.toLocaleString('vi-VN')} ({minItem.label})</span>
            </div>
          )}
        </div>

        {/* What it shows note */}
        <div className="w-full text-left mt-1 pt-2 border-t border-slate-100/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            WHAT IT SHOWS
          </span>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Đường cong thể hiện biến động số lượng cộng tác viên nhận chi trả qua từng kỳ. Thang đo trục Y được tối ưu tự động ({minVal.toLocaleString('vi-VN')} – {maxVal.toLocaleString('vi-VN')}) làm nổi bật độ dốc và biên độ biến động giữa các tháng, thay vì xuất phát từ 0 khiến đường biểu diễn bị phẳng.
          </p>
        </div>
      </div>
    </div>
  );
}
