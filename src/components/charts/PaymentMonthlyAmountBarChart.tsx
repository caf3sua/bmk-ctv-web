import { useState } from 'react';
import type { MonthlyPaymentAmountStat } from '../../types/expense';

interface PaymentMonthlyAmountBarChartProps {
  data: MonthlyPaymentAmountStat[];
  totalPaidAmount: number;
  loading?: boolean;
}

const WIDTH = 680;
const HEIGHT = 220;
const PAD_LEFT = 60;
const PAD_RIGHT = 20;
const PAD_TOP = 25;
const PAD_BOTTOM = 30;

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

function getYTicks(maxValue: number): number[] {
  if (maxValue <= 0) return [0, 1000000];
  const intervals = 4;
  const step = Math.ceil(maxValue / intervals);
  const ticks = [0];
  for (let i = 1; i <= intervals; i++) {
    ticks.push(step * i);
  }
  return ticks;
}

export default function PaymentMonthlyAmountBarChart({
  data,
  totalPaidAmount,
  loading = false,
}: PaymentMonthlyAmountBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const rawMax = Math.max(0, ...data.map((d) => d.totalNetIncome));
  const yTicks = getYTicks(rawMax);
  const maxValue = yTicks[yTicks.length - 1] || 1000000;

  const countBars = data.length || 1;
  const slotWidth = plotWidth / countBars;
  const barWidth = Math.max(12, Math.min(36, slotWidth * 0.6));

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/60 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-800 text-sm sm:text-base">
              Số tiền BMK thanh toán theo tháng
            </h3>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-blue-700 border border-blue-200">
              {formatFullVND(totalPaidAmount)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Biểu đồ tổng giá trị thực lĩnh chi trả cộng tác viên theo từng kỳ
          </p>
        </div>
      </div>

      {/* Chart Canvas */}
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
          <div className="flex h-44 items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu thanh toán chi phí BMK
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              className="w-full h-auto min-w-[500px]"
              style={{ maxHeight: 220 }}
            >
              <defs>
                <linearGradient id="paymentBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="paymentBarGradHover" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>

              {/* Y Grid lines and labels */}
              {yTicks.map((tickVal) => {
                const y = PAD_TOP + plotHeight - (tickVal / maxValue) * plotHeight;
                return (
                  <g key={`y-${tickVal}`}>
                    <line
                      x1={PAD_LEFT}
                      y1={y}
                      x2={WIDTH - PAD_RIGHT}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                    />
                    <text
                      x={PAD_LEFT - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize={10}
                      fill="#94a3b8"
                      className="font-mono"
                    >
                      {formatShortVND(tickVal)}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {data.map((item, idx) => {
                const xSlotCenter = PAD_LEFT + idx * slotWidth + slotWidth / 2;
                const barHeight = maxValue > 0 ? (item.totalNetIncome / maxValue) * plotHeight : 0;
                const y = PAD_TOP + plotHeight - barHeight;
                const isHovered = hoveredIndex === idx;

                return (
                  <g
                    key={`bar-${item.period}`}
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    className="cursor-pointer transition-all duration-150"
                  >
                    {/* Hover highlight column */}
                    {isHovered && (
                      <rect
                        x={PAD_LEFT + idx * slotWidth + 2}
                        y={PAD_TOP}
                        width={slotWidth - 4}
                        height={plotHeight}
                        fill="#eff6ff"
                        rx={4}
                      />
                    )}

                    {/* Value label on top of bar */}
                    {item.totalNetIncome > 0 && (
                      <text
                        x={xSlotCenter}
                        y={y - 5}
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={isHovered ? 700 : 600}
                        fill={isHovered ? '#1e3a8a' : '#475569'}
                        className="font-mono"
                      >
                        {formatShortVND(item.totalNetIncome)}
                      </text>
                    )}

                    {/* Bar rectangle */}
                    <rect
                      x={xSlotCenter - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, 2)}
                      rx={4}
                      fill={isHovered ? 'url(#paymentBarGradHover)' : 'url(#paymentBarGrad)'}
                    />

                    {/* X Axis Label */}
                    <text
                      x={xSlotCenter}
                      y={HEIGHT - PAD_BOTTOM + 16}
                      textAnchor="middle"
                      fontSize={10}
                      fontWeight={isHovered ? 600 : 500}
                      fill={isHovered ? '#0f172a' : '#64748b'}
                      className="font-mono"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>

      {/* Tooltip detail bar at bottom if hovered */}
      <div className="mt-2 min-h-[22px] flex items-center justify-between px-2 text-xs text-slate-500">
        {hoveredIndex !== null && data[hoveredIndex] ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-slate-700">
              Kỳ {data[hoveredIndex].label}:
            </span>
            <span className="text-slate-600">
              Thực lĩnh:{' '}
              <strong className="font-mono text-blue-700 font-bold">
                {formatFullVND(data[hoveredIndex].totalNetIncome)}
              </strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Thuế TNCN:{' '}
              <strong className="font-mono text-rose-600">
                {formatFullVND(data[hoveredIndex].totalPersonalIncomeTax)}
              </strong>
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            * Rê chuột vào cột biểu đồ để xem chi tiết tiền thực lĩnh và thuế TNCN
          </span>
        )}
      </div>
    </div>
  );
}
