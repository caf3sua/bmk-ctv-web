import { useState } from 'react';
import type { MonthlyPaymentAmountStat } from '../../types/expense';

export interface PaymentMonthlyAmountLineChartProps {
  data: MonthlyPaymentAmountStat[];
  totalPaidAmount: number;
  totalTaxableAmount?: number;
  totalTaxAmount?: number;
  loading?: boolean;
  timeRange?: '12m' | 'all';
  onTimeRangeChange?: (range: '12m' | 'all') => void;
}

export type SeriesKey = 'taxable' | 'net' | 'tax';

const WIDTH = 900;
const HEIGHT = 280;
const PAD_LEFT = 60;
const PAD_RIGHT = 65; // Accommodate right Y-axis for PIT
const PAD_TOP = 25;
const PAD_BOTTOM = 46;
const INNER_PAD = 20;

function formatShortVND(num: number): string {
  if (num === 0) return '0 ₫';
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    const str = val >= 10 ? val.toFixed(1) : val.toFixed(2);
    const clean = str.replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
    return `${clean} tỷ`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    const str = val >= 10 ? val.toFixed(1) : val.toFixed(2);
    const clean = str.replace(/\.00$/, '').replace(/(\.[0-9])0$/, '$1');
    return `${clean} tr`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)} k`;
  }
  return `${num} ₫`;
}

function formatFullVND(num: number): string {
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

// Dynamic range scaling for primary amounts (Taxable & Net Income)
function getDynamicAmountRange(values: number[]): {
  minVal: number;
  maxVal: number;
  ticks: number[];
} {
  const valid = values.filter((v) => v > 0);
  if (valid.length === 0) {
    return {
      minVal: 0,
      maxVal: 1_000_000_000,
      ticks: [0, 250_000_000, 500_000_000, 750_000_000, 1_000_000_000],
    };
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const delta = max - min;

  if (delta === 0) {
    const pad = Math.max(100_000_000, min * 0.15);
    const b = Math.max(0, min - pad);
    const t = max + pad;
    return { minVal: b, maxVal: t, ticks: [b, min, t] };
  }

  // 10% breathing room above and below to give the curves rich amplitude without touching borders
  const padding = Math.max(50_000_000, delta * 0.1);
  const rawBottom = Math.max(0, min - padding);
  const rawTop = max + padding;
  const range = rawTop - rawBottom;

  // Aim for 4 to 5 intervals
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

// Fallback Zero-based nice ticks
function getZeroAmountRange(maxValue: number, intervals = 4): {
  minVal: number;
  maxVal: number;
  ticks: number[];
} {
  if (maxValue <= 0) {
    return {
      minVal: 0,
      maxVal: 1_000_000_000,
      ticks: [0, 250_000_000, 500_000_000, 750_000_000, 1_000_000_000],
    };
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

export default function PaymentMonthlyAmountLineChart({
  data,
  totalPaidAmount,
  totalTaxableAmount,
  totalTaxAmount,
  loading = false,
  timeRange,
  onTimeRangeChange,
}: PaymentMonthlyAmountLineChartProps) {
  const [internalTimeRange, setInternalTimeRange] = useState<'12m' | 'all'>('12m');
  const currentTimeRange = timeRange !== undefined ? timeRange : internalTimeRange;

  const handleTimeRangeChange = (newRange: '12m' | 'all') => {
    setInternalTimeRange(newRange);
    onTimeRangeChange?.(newRange);
  };

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDualAxis, setIsDualAxis] = useState<boolean>(true);
  // Default to dynamic scale to highlight monthly differences on Income & Net pay (no average line)
  const [isDynamicScale, setIsDynamicScale] = useState<boolean>(true);
  const [visibleSeries, setVisibleSeries] = useState<Record<SeriesKey, boolean>>({
    taxable: true,
    net: true,
    tax: true,
  });

  const toggleSeries = (key: SeriesKey) => {
    setVisibleSeries((prev) => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      if (activeCount === 1 && prev[key]) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  // Slice data based on selected time range (default 12 months)
  const displayData = currentTimeRange === '12m' && data.length > 12 ? data.slice(-12) : data;

  // Recalculate totals for badge indicators when in 12m mode
  const displayedPaid =
    currentTimeRange === '12m' && data.length > 12
      ? displayData.reduce((sum, d) => sum + (d.totalNetIncome || 0), 0)
      : totalPaidAmount;
  const displayedTaxable =
    currentTimeRange === '12m' && data.length > 12
      ? displayData.reduce((sum, d) => sum + (d.totalTaxableIncome || 0), 0)
      : (totalTaxableAmount ?? 0);
  const displayedTax =
    currentTimeRange === '12m' && data.length > 12
      ? displayData.reduce((sum, d) => sum + (d.totalPersonalIncomeTax || 0), 0)
      : (totalTaxAmount ?? 0);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Primary Y-Axis (Left): Taxable & Net income (Dynamic scale or Zero-baseline)
  const primaryValues: number[] = [];
  displayData.forEach((d) => {
    if (visibleSeries.taxable && d.totalTaxableIncome) primaryValues.push(d.totalTaxableIncome);
    if (visibleSeries.net && d.totalNetIncome) primaryValues.push(d.totalNetIncome);
    if (!isDualAxis && visibleSeries.tax && d.totalPersonalIncomeTax) {
      primaryValues.push(d.totalPersonalIncomeTax);
    }
  });
  const rawPrimaryMax = Math.max(0, ...primaryValues);

  // Use dynamic range when isDynamicScale is true
  const {
    minVal: leftMin,
    maxVal: leftMax,
    ticks: leftYTicks,
  } = isDynamicScale
    ? getDynamicAmountRange(primaryValues)
    : getZeroAmountRange(rawPrimaryMax, 4);

  // Secondary Y-Axis (Right): Max of PIT (Tax) - stays 0-based for clear relative taxation ratio
  const taxValues = displayData.map((d) => d.totalPersonalIncomeTax || 0);
  const rawTaxMax = Math.max(0, ...taxValues);
  const rightYTicks = getZeroAmountRange(rawTaxMax, 4).ticks;
  const rightMax = isDualAxis ? (rightYTicks[rightYTicks.length - 1] || 1_000_000) : leftMax;

  const count = displayData.length;
  const usableWidth = count > 1 ? plotWidth - 2 * INNER_PAD : 0;

  const getPrimaryY = (val: number) => {
    const range = leftMax - leftMin;
    if (range <= 0) return HEIGHT - PAD_BOTTOM;
    const clamped = Math.max(leftMin, Math.min(leftMax, val));
    return PAD_TOP + plotHeight - ((clamped - leftMin) / range) * plotHeight;
  };

  const getTaxY = (val: number) => {
    if (rightMax <= 0) return HEIGHT - PAD_BOTTOM;
    const clamped = Math.max(0, Math.min(rightMax, val));
    return PAD_TOP + plotHeight - (clamped / rightMax) * plotHeight;
  };

  // Build points for each series
  const points = displayData.map((item, i) => {
    const x =
      count > 1
        ? PAD_LEFT + INNER_PAD + (i / (count - 1)) * usableWidth
        : PAD_LEFT + plotWidth / 2;

    return {
      x,
      yTaxable: getPrimaryY(item.totalTaxableIncome || 0),
      yNet: getPrimaryY(item.totalNetIncome || 0),
      yTax: isDualAxis ? getTaxY(item.totalPersonalIncomeTax || 0) : getPrimaryY(item.totalPersonalIncomeTax || 0),
      item,
    };
  });

  const ptsTaxable = points.map((p) => ({ x: p.x, y: p.yTaxable }));
  const ptsNet = points.map((p) => ({ x: p.x, y: p.yNet }));
  const ptsTax = points.map((p) => ({ x: p.x, y: p.yTax }));

  const pathTaxable = getSmoothBezierPath(ptsTaxable);
  const pathNet = getSmoothBezierPath(ptsNet);
  const pathTax = getSmoothBezierPath(ptsTax);

  // Soft area fill path for blue curve
  const areaTaxable =
    ptsTaxable.length > 1
      ? `${pathTaxable} L ${ptsTaxable[ptsTaxable.length - 1].x} ${HEIGHT - PAD_BOTTOM} L ${ptsTaxable[0].x} ${HEIGHT - PAD_BOTTOM} Z`
      : '';

  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              Số tiền BMK thanh toán theo tháng
            </h3>
            <span
              className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-700 border border-emerald-200"
              title={`Tổng thực lĩnh chi trả (${currentTimeRange === '12m' ? '12 tháng gần nhất' : 'Toàn bộ các tháng'})`}
            >
              TL: {formatFullVND(displayedPaid)}
            </span>
            {displayedTaxable > 0 && (
              <span
                className="rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700 border border-blue-200"
                title={`Tổng thu nhập chịu thuế (${currentTimeRange === '12m' ? '12 tháng gần nhất' : 'Toàn bộ các tháng'})`}
              >
                TN: {formatShortVND(displayedTaxable)}
              </span>
            )}
            {displayedTax > 0 && (
              <span
                className="rounded-full bg-rose-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-rose-700 border border-rose-200"
                title={`Tổng thuế TNCN đã khấu trừ (${currentTimeRange === '12m' ? '12 tháng gần nhất' : 'Toàn bộ các tháng'})`}
              >
                Thuế: {formatShortVND(displayedTax)}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu đồ đường tổng hợp thu nhập, thực lĩnh và thuế TNCN theo từng kỳ ({currentTimeRange === '12m' ? '12 tháng gần nhất' : `toàn bộ ${data.length} tháng`})
          </p>
        </div>

        {/* Controls: Time Range, Dynamic Scale & Dual Axis Toggles */}
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

          {/* Dynamic Scale Toggle for Income/Net */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setIsDynamicScale(true)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                isDynamicScale
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tự động tối ưu trục Y bên trái (Thu nhập & Thực lĩnh) theo biên độ thực tế để làm nổi bật sự chênh lệch giữa các tháng"
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
              title="Trục Y bên trái bắt đầu từ mốc 0 ₫"
            >
              Gốc 0
            </button>
          </div>

          {/* Dual Axis Toggle */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setIsDualAxis(true)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                isDualAxis
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Trục kép: Tách thang đo riêng cho Thuế TNCN (trục phải) giúp các đường lượn sóng rõ nét"
            >
              Trục kép
            </button>
            <button
              type="button"
              onClick={() => setIsDualAxis(false)}
              className={`rounded-lg px-2.5 py-1 transition-all cursor-pointer ${
                !isDualAxis
                  ? 'bg-white text-slate-800 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Trục đơn: Dùng chung 1 thang đo tuyệt đối từ 0 cho cả 3 đường"
            >
              Trục đơn
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas & Tooltip Container */}
      <div className="relative mt-4 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Đang tải biểu đồ...
            </div>
          </div>
        )}

        {data.length === 0 && !loading ? (
          <div className="flex h-56 items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu thanh toán chi phí BMK
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
                  <linearGradient id="taxableAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines & Left Y-axis labels (Thu nhập & Thực lĩnh) */}
                {leftYTicks.map((tickVal) => {
                  const y = getPrimaryY(tickVal);
                  return (
                    <g key={`y-left-${tickVal}`}>
                      <line
                        x1={PAD_LEFT}
                        y1={y}
                        x2={WIDTH - PAD_RIGHT}
                        y2={y}
                        stroke="#f1f5f9"
                        strokeWidth={1}
                        strokeDasharray={tickVal === leftMin ? undefined : '3 3'}
                      />
                      <text
                        x={PAD_LEFT - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        fontSize={10}
                        fill="#64748b"
                        className="font-mono font-medium"
                      >
                        {formatShortVND(tickVal)}
                      </text>
                    </g>
                  );
                })}

                {/* Right Y-axis labels for Tax when Dual Axis is active */}
                {isDualAxis &&
                  rightYTicks.map((tickVal) => {
                    const y = getTaxY(tickVal);
                    return (
                      <g key={`y-right-${tickVal}`}>
                        <text
                          x={WIDTH - PAD_RIGHT + 8}
                          y={y + 3.5}
                          textAnchor="start"
                          fontSize={9.5}
                          fill="#ef4444"
                          className="font-mono font-medium"
                        >
                          {formatShortVND(tickVal)}
                        </text>
                      </g>
                    );
                  })}

                {/* Left axis indicator label */}
                <text
                  x={PAD_LEFT}
                  y={PAD_TOP - 10}
                  fontSize={9.5}
                  fill="#2563eb"
                  fontWeight="600"
                  textAnchor="start"
                >
                  Thu nhập & Thực lĩnh (VNĐ) {isDynamicScale ? `(${formatShortVND(leftMin)} - ${formatShortVND(leftMax)})` : ''}
                </text>

                {/* Right axis indicator label */}
                {isDualAxis && (
                  <text
                    x={WIDTH - PAD_RIGHT}
                    y={PAD_TOP - 10}
                    fontSize={9.5}
                    fill="#ef4444"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    Thuế TNCN (Trục phải)
                  </text>
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

                {/* Soft area glow for Tổng thu nhập */}
                {visibleSeries.taxable && areaTaxable && (
                  <path d={areaTaxable} fill="url(#taxableAreaGrad)" />
                )}

                {/* Smooth Bezier Lines */}
                {/* 1. Tổng thu nhập (Blue) */}
                {visibleSeries.taxable && pathTaxable && (
                  <path
                    d={pathTaxable}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 2. Thực lĩnh (Green) */}
                {visibleSeries.net && pathNet && (
                  <path
                    d={pathNet}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* 3. Thuế TNCN (Red) */}
                {visibleSeries.tax && pathTax && (
                  <path
                    d={pathTax}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Point markers for each series */}
                {/* Blue points */}
                {visibleSeries.taxable &&
                  ptsTaxable.map((p, idx) => (
                    <circle
                      key={`pt-taxable-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.5}
                      fill="#2563eb"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ))}

                {/* Green points */}
                {visibleSeries.net &&
                  ptsNet.map((p, idx) => (
                    <circle
                      key={`pt-net-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.5}
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ))}

                {/* Red points */}
                {visibleSeries.tax &&
                  ptsTax.map((p, idx) => (
                    <circle
                      key={`pt-tax-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.5}
                      fill="#ef4444"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ))}

                {/* Hover highlighted active dots */}
                {activePoint && (
                  <>
                    {visibleSeries.taxable && (
                      <>
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yTaxable}
                          r={7}
                          fill="#2563eb"
                          fillOpacity={0.25}
                        />
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yTaxable}
                          r={4.5}
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </>
                    )}
                    {visibleSeries.net && (
                      <>
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yNet}
                          r={7}
                          fill="#10b981"
                          fillOpacity={0.25}
                        />
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yNet}
                          r={4.5}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </>
                    )}
                    {visibleSeries.tax && (
                      <>
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yTax}
                          r={7}
                          fill="#ef4444"
                          fillOpacity={0.25}
                        />
                        <circle
                          cx={activePoint.x}
                          cy={activePoint.yTax}
                          r={4.5}
                          fill="#ef4444"
                          stroke="#ffffff"
                          strokeWidth={2}
                        />
                      </>
                    )}
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

              {/* Floating Tooltip Card matching reference image */}
              {activePoint && (
                <div
                  className="absolute z-30 pointer-events-none rounded-xl bg-white/98 px-3.5 py-3 shadow-xl border border-slate-200/80 backdrop-blur-md min-w-[220px] transition-all duration-75 text-xs select-none"
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
                    {visibleSeries.taxable && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-600 shrink-0" />
                          <span>Tổng thu nhập</span>
                        </div>
                        <span className="font-mono font-bold text-blue-600">
                          {formatFullVND(activePoint.item.totalTaxableIncome)}
                        </span>
                      </div>
                    )}
                    {visibleSeries.net && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 shrink-0" />
                          <span>Thực lĩnh</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-600">
                          {formatFullVND(activePoint.item.totalNetIncome)}
                        </span>
                      </div>
                    )}
                    {visibleSeries.tax && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                          <span>Thuế TNCN</span>
                        </div>
                        <span className="font-mono font-bold text-rose-500">
                          {formatFullVND(activePoint.item.totalPersonalIncomeTax)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Legend & What it shows Section matching reference image */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col items-center gap-2">
        <h4 className="text-xs font-semibold text-slate-700">
          Biểu đồ biến động chi phí thanh toán theo tháng
        </h4>

        {/* Legend buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => toggleSeries('taxable')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              visibleSeries.taxable
                ? 'bg-blue-50 text-blue-800 font-semibold shadow-2xs'
                : 'text-slate-400 hover:text-slate-600 line-through'
            }`}
            title="Nhấn để ẩn/hiện Tổng thu nhập"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full transition-transform ${
                visibleSeries.taxable ? 'bg-blue-600 scale-110' : 'bg-slate-300'
              }`}
            />
            <span>Tổng thu nhập</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('net')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              visibleSeries.net
                ? 'bg-emerald-50 text-emerald-800 font-semibold shadow-2xs'
                : 'text-slate-400 hover:text-slate-600 line-through'
            }`}
            title="Nhấn để ẩn/hiện Thực lĩnh"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full transition-transform ${
                visibleSeries.net ? 'bg-emerald-600 scale-110' : 'bg-slate-300'
              }`}
            />
            <span>Thực lĩnh</span>
          </button>

          <button
            type="button"
            onClick={() => toggleSeries('tax')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
              visibleSeries.tax
                ? 'bg-rose-50 text-rose-800 font-semibold shadow-2xs'
                : 'text-slate-400 hover:text-slate-600 line-through'
            }`}
            title="Nhấn để ẩn/hiện Thuế TNCN"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full transition-transform ${
                visibleSeries.tax ? 'bg-rose-500 scale-110' : 'bg-slate-300'
              }`}
            />
            <span>Thuế TNCN</span>
          </button>
        </div>

        {/* What it shows note matching reference image */}
        <div className="w-full text-left mt-1 pt-2 border-t border-slate-100/80">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
            WHAT IT SHOWS
          </span>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Đường cong thể hiện biến động tổng thu nhập, thực lĩnh và thuế TNCN qua các kỳ thanh toán.{' '}
            {isDynamicScale
              ? `Trục Y bên trái (Thu nhập & Thực lĩnh) được tối ưu tự động (${formatShortVND(leftMin)} – ${formatShortVND(leftMax)}) giúp làm nổi bật độ dốc và biên độ biến động giữa các tháng.`
              : 'Trục Y bên trái đang hiển thị thang đo từ gốc 0.'}
          </p>
        </div>
      </div>
    </div>
  );
}
