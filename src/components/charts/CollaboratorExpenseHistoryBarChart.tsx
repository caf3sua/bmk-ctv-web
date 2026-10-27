import { useState } from 'react';
import type { CollaboratorMonthlyExpenseStat } from '../../types/expense';

interface CollaboratorExpenseHistoryBarChartProps {
  data: CollaboratorMonthlyExpenseStat[];
  loading?: boolean;
}

const WIDTH = 720;
const HEIGHT = 230;
const PAD_LEFT = 65;
const PAD_RIGHT = 15;
const PAD_TOP = 25;
const PAD_BOTTOM = 32;

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
  if (maxValue <= 0) return [0, 5_000_000];
  const intervals = 4;
  const step = Math.ceil(maxValue / intervals);
  const ticks = [0];
  for (let i = 1; i <= intervals; i++) {
    ticks.push(step * i);
  }
  return ticks;
}

export default function CollaboratorExpenseHistoryBarChart({
  data,
  loading = false,
}: CollaboratorExpenseHistoryBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  // Max value based on the total stacked height (taxableIncome or net + tax)
  const maxValues = data.map((d) =>
    Math.max(d.taxableIncome, (d.netIncome || 0) + (d.personalIncomeTax || 0))
  );
  const rawMax = Math.max(0, ...maxValues);
  const yTicks = getYTicks(rawMax);
  const maxValue = yTicks[yTicks.length - 1] || 5_000_000;

  const countSlots = data.length || 12;
  const slotWidth = plotWidth / countSlots;
  const barWidth = Math.max(16, Math.min(26, slotWidth * 0.52));

  // Check if all data is zero
  const hasData = rawMax > 0;

  // Hovered item details
  const activeItem = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null;

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
      {/* Chart Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold text-slate-800">
            Biến động chi phí 12 tháng gần nhất
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Biểu đồ cột thể hiện Thực nhận và Thuế TNCN (chiều cao cột tương ứng Tổng thu nhập)
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-blue-600" />
            <span className="text-slate-700 font-semibold text-[11px]">Thực nhận</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-xs bg-rose-500" />
            <span className="text-slate-700 font-semibold text-[11px]">Thuế TNCN</span>
          </div>
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 text-slate-400 text-[11px]">
            <span>(Tổng cột = Tổng TN)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative mt-2 flex-1 min-h-[220px]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/75 backdrop-blur-xs">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              Đang tải biểu đồ...
            </div>
          </div>
        )}

        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto min-w-[560px]"
            style={{ maxHeight: 230 }}
          >
            {/* Grid definitions & Gradients */}
            <defs>
              <linearGradient id="collabNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="collabNetGradHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>

              <linearGradient id="collabTaxGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" />
                <stop offset="100%" stopColor="#fb7185" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="collabTaxGradHover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" />
                <stop offset="100%" stopColor="#f43f5e" />
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

            {/* Empty state message inside SVG if no data */}
            {!hasData && !loading && (
              <text
                x={WIDTH / 2}
                y={PAD_TOP + plotHeight / 2}
                textAnchor="middle"
                fontSize={12}
                fill="#94a3b8"
                className="font-sans"
              >
                Không có dữ liệu chi phí trong 12 tháng gần nhất
              </text>
            )}

            {/* Bars: 1 bar per month with 2 stacked parts (Thực nhận at bottom, Thuế TNCN on top) */}
            {data.map((item, idx) => {
              const slotLeft = PAD_LEFT + idx * slotWidth;
              const barLeft = slotLeft + (slotWidth - barWidth) / 2;

              const netHeight = maxValue > 0 ? (item.netIncome / maxValue) * plotHeight : 0;
              const taxHeight = maxValue > 0 ? (item.personalIncomeTax / maxValue) * plotHeight : 0;
              const totalBarHeight = netHeight + taxHeight;
              const yTotal = PAD_TOP + plotHeight - totalBarHeight;

              const isHovered = hoveredIndex === idx;

              return (
                <g
                  key={`month-slot-${item.period}`}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="cursor-pointer"
                >
                  <defs>
                    <clipPath id={`clip-bar-${idx}`}>
                      <rect
                        x={barLeft}
                        y={yTotal}
                        width={barWidth}
                        height={totalBarHeight}
                        rx={3}
                      />
                    </clipPath>
                  </defs>

                  {/* Slot hover column highlight */}
                  {isHovered && (
                    <rect
                      x={slotLeft + 2}
                      y={PAD_TOP - 6}
                      width={slotWidth - 4}
                      height={plotHeight + 10}
                      fill="#f1f5f9"
                      opacity={0.65}
                      rx={6}
                    />
                  )}

                  {/* 1 Bar Chart with 2 stacked parts */}
                  {totalBarHeight > 0 && (
                    <g clipPath={`url(#clip-bar-${idx})`}>
                      {/* Phần 1: Thực nhận (ở dưới) */}
                      <rect
                        x={barLeft}
                        y={PAD_TOP + plotHeight - netHeight}
                        width={barWidth}
                        height={Math.max(1, netHeight)}
                        fill={isHovered ? 'url(#collabNetGradHover)' : 'url(#collabNetGrad)'}
                        className="transition-all duration-150"
                      />

                      {/* Phần 2: Thuế TNCN (ở trên) */}
                      {taxHeight > 0 && (
                        <rect
                          x={barLeft}
                          y={yTotal}
                          width={barWidth}
                          height={taxHeight}
                          fill={isHovered ? 'url(#collabTaxGradHover)' : 'url(#collabTaxGrad)'}
                          className="transition-all duration-150"
                        />
                      )}
                    </g>
                  )}

                  {/* Top value badge when hovered */}
                  {isHovered && totalBarHeight > 0 && (
                    <text
                      x={barLeft + barWidth / 2}
                      y={Math.max(PAD_TOP + 10, yTotal - 5)}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="bold"
                      fill="#1e293b"
                      className="font-mono"
                    >
                      {formatShortVND(item.taxableIncome || item.netIncome + item.personalIncomeTax)}
                    </text>
                  )}

                  {/* X Axis label (e.g. 11/25) */}
                  <text
                    x={slotLeft + slotWidth / 2}
                    y={PAD_TOP + plotHeight + 18}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight={isHovered ? 'bold' : 'normal'}
                    fill={isHovered ? '#1e293b' : '#64748b'}
                    className="font-mono"
                  >
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Tooltip when hovered */}
        {activeItem && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Tháng {activeItem.label}:</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {activeItem.count} đợt chi trả
              </span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-blue-600" />
                <span className="text-slate-500">Thực nhận:</span>
                <span className="font-bold text-blue-700">
                  {formatFullVND(activeItem.netIncome)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-xs bg-rose-500" />
                <span className="text-slate-500">Thuế TNCN:</span>
                <span className="font-semibold text-rose-600">
                  {formatFullVND(activeItem.personalIncomeTax)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <span className="h-2 w-2 rounded-xs bg-indigo-500" />
                <span className="text-slate-500">Tổng TN (cột):</span>
                <span className="font-semibold text-slate-800">
                  {formatFullVND(activeItem.taxableIncome || activeItem.netIncome + activeItem.personalIncomeTax)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
