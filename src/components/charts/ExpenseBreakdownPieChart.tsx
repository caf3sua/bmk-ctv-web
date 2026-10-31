import { useState } from 'react';

export interface ExpenseBreakdownPieChartProps {
  totalPaidAmount: number;
  totalTaxAmount: number;
  totalTaxableAmount?: number;
  loading?: boolean;
  timeRange?: '12m' | 'all';
}

const RADIUS = 64;
const STROKE_WIDTH = 22;
const SIZE = (RADIUS + STROKE_WIDTH / 2) * 2; // ~150
const CENTER = SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatShortVND(num: number): string {
  if (num === 0) return '0 ₫';
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    return `${val >= 10 ? val.toFixed(1) : val.toFixed(2)} tỷ`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${val >= 10 ? val.toFixed(1) : val.toFixed(2)} tr`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(0)} k`;
  }
  return `${num} ₫`;
}

function formatFullVND(num: number): string {
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

export default function ExpenseBreakdownPieChart({
  totalPaidAmount,
  totalTaxAmount,
  totalTaxableAmount,
  loading = false,
  timeRange = '12m',
}: ExpenseBreakdownPieChartProps) {
  const [hoveredSegment, setHoveredSegment] = useState<'net' | 'tax' | null>(null);

  const net = Math.max(0, totalPaidAmount || 0);
  const tax = Math.max(0, totalTaxAmount || 0);
  const total = totalTaxableAmount && totalTaxableAmount > 0 ? totalTaxableAmount : net + tax;

  const netFraction = total > 0 ? net / total : 0;
  const taxFraction = total > 0 ? tax / total : 0;

  const netPct = (netFraction * 100).toFixed(1);
  const taxPct = (taxFraction * 100).toFixed(1);

  const netDash = netFraction * CIRCUMFERENCE;
  const taxDash = taxFraction * CIRCUMFERENCE;

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              Cơ cấu Thực lĩnh & Thuế TNCN
            </h3>
            <span
              className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200"
              title={timeRange === 'all' ? 'Toàn bộ các tháng' : '12 tháng gần nhất'}
            >
              {timeRange === 'all' ? 'Toàn bộ' : '12 tháng'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thống kê phân bổ chi phí BMK chi trả tới CTV
          </p>
        </div>
      </div>

      {/* Main Content: Donut + Details */}
      <div className="relative my-auto flex flex-col items-center justify-center py-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-xs">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        )}

        {/* Donut Graphic */}
        <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width={SIZE}
            height={SIZE}
            className="-rotate-90 overflow-visible"
          >
            {/* Background base track */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={STROKE_WIDTH}
            />

            {/* Net Income Arc (Emerald) */}
            {net > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#10b981"
                strokeWidth={hoveredSegment === 'net' ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                strokeDasharray={`${netDash} ${CIRCUMFERENCE - netDash}`}
                strokeDashoffset={0}
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onMouseEnter={() => setHoveredSegment('net')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}

            {/* Tax Arc (Rose/Red) */}
            {tax > 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke="#ef4444"
                strokeWidth={hoveredSegment === 'tax' ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                strokeDasharray={`${taxDash} ${CIRCUMFERENCE - taxDash}`}
                strokeDashoffset={-netDash}
                className="cursor-pointer transition-all duration-200 hover:opacity-90"
                onMouseEnter={() => setHoveredSegment('tax')}
                onMouseLeave={() => setHoveredSegment(null)}
              />
            )}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="font-mono text-base sm:text-lg font-bold text-slate-900 leading-tight">
              {hoveredSegment === 'tax'
                ? `${taxPct}%`
                : hoveredSegment === 'net'
                ? `${netPct}%`
                : formatShortVND(total)}
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">
              {hoveredSegment === 'tax'
                ? 'Thuế TNCN'
                : hoveredSegment === 'net'
                ? 'Thực lĩnh'
                : 'Tổng chi phí'}
            </span>
          </div>
        </div>

        {/* Mini proportional bar */}
        <div className="w-full max-w-[280px] mt-4">
          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden flex">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${netPct}%` }}
              title={`Thực lĩnh: ${netPct}%`}
            />
            <div
              className="h-full bg-rose-500 transition-all duration-300"
              style={{ width: `${taxPct}%` }}
              title={`Thuế TNCN: ${taxPct}%`}
            />
          </div>
        </div>
      </div>

      {/* Breakdown Legend Cards */}
      <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
        {/* Row 1: Thực lĩnh */}
        <div
          onMouseEnter={() => setHoveredSegment('net')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
            hoveredSegment === 'net' ? 'bg-emerald-50/80 ring-1 ring-emerald-200' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-emerald-500 shrink-0" />
            <div>
              <span className="font-medium text-slate-800 block">Thực lĩnh chuyển CTV</span>
              <span className="text-[10px] text-slate-400">Số tiền thực nhận</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-mono font-bold text-emerald-700">
                {formatFullVND(net)}
              </span>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                {netPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Thuế TNCN */}
        <div
          onMouseEnter={() => setHoveredSegment('tax')}
          onMouseLeave={() => setHoveredSegment(null)}
          className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer ${
            hoveredSegment === 'tax' ? 'bg-rose-50/80 ring-1 ring-rose-200' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-rose-500 shrink-0" />
            <div>
              <span className="font-medium text-slate-800 block">Thuế TNCN khấu trừ</span>
              <span className="text-[10px] text-slate-400">Nộp ngân sách</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-mono font-bold text-rose-600">
                {formatFullVND(tax)}
              </span>
              <span className="rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800">
                {taxPct}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
