import { useState } from 'react';
import type { GrowthPoint } from '../../utils/dashboard';

const WIDTH = 600;
const HEIGHT = 200;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

// Generate nice integer ticks for the Y axis
function getYTicks(maxValue: number): number[] {
  if (maxValue <= 4) {
    return Array.from({ length: maxValue + 1 }, (_, i) => i);
  }
  const intervals = 4;
  const ticks = new Set<number>([0]);
  for (let i = 1; i < intervals; i++) {
    ticks.add(Math.round((maxValue * i) / intervals));
  }
  ticks.add(maxValue);
  return Array.from(ticks).sort((a, b) => a - b);
}

// Calculate control points for cubic Bezier curve interpolation
function getBezierPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  
  let path = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const curr = points[i];
    const next = points[i + 1];
    
    // Create control points with horizontal tangents for smooth transition
    const cpX1 = curr.x + (next.x - curr.x) * 0.3;
    const cpY1 = curr.y;
    const cpX2 = next.x - (next.x - curr.x) * 0.3;
    const cpY2 = next.y;
    
    path += ` C ${cpX1.toFixed(2)} ${cpY1.toFixed(2)}, ${cpX2.toFixed(2)} ${cpY2.toFixed(2)}, ${next.x.toFixed(2)} ${next.y.toFixed(2)}`;
  }
  
  return path;
}

export default function GrowthChart({ data }: { data: GrowthPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu để hiển thị.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const yTicks = getYTicks(maxValue);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const stepX = data.length > 1 ? plotWidth / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PAD_LEFT + i * stepX,
    y: HEIGHT - PAD_BOTTOM - (d.value / maxValue) * plotHeight,
  }));

  const linePath = getBezierPath(points);
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} L ${points[0].x.toFixed(2)} ${HEIGHT - PAD_BOTTOM} Z`;

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-48 w-full overflow-visible" preserveAspectRatio="none">
        {/* Y-axis Grid lines & labels */}
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
                className="text-[10px] fill-slate-400 font-mono font-medium select-none"
              >
                {v}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="var(--color-primary)" fillOpacity="0.08" />
        
        {/* Guide line on hover */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1={PAD_TOP}
            x2={points[hoveredIndex].x}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        )}

        {/* Smooth Bezier line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Target indicator on hover */}
        {hoveredIndex !== null && (
          <>
            <circle
              cx={points[hoveredIndex].x}
              cy={points[hoveredIndex].y}
              r="6.5"
              fill="var(--color-primary)"
              fillOpacity="0.3"
            />
            <circle
              cx={points[hoveredIndex].x}
              cy={points[hoveredIndex].y}
              r="4.5"
              fill="var(--color-primary)"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </>
        )}

        {/* Transparent hover interceptors */}
        {points.map((p, i) => {
          const w = stepX || plotWidth;
          const x = stepX ? p.x - w / 2 : PAD_LEFT;
          return (
            <rect
              key={i}
              x={x}
              y={0}
              width={w}
              height={HEIGHT}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          );
        })}
      </svg>
      
      {/* Time axis label */}
      <div className="relative mt-1 h-4 w-full text-[11px] text-slate-400">
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <span
              key={data[i].label + i}
              className="absolute -translate-x-1/2 whitespace-nowrap font-mono"
              style={{ left: `${(p.x / WIDTH) * 100}%` }}
            >
              {data[i].label}
            </span>
          ) : null,
        )}
      </div>

      {/* Premium Floating Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="absolute z-20 pointer-events-none rounded-lg bg-white/95 px-2.5 py-1.5 text-xs text-slate-800 shadow-xl transition-all duration-100 whitespace-nowrap border border-slate-200/80 backdrop-blur-sm"
          style={{
            left: `${(points[hoveredIndex].x / WIDTH) * 100}%`,
            top: `${(points[hoveredIndex].y / HEIGHT) * 100 - 10}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-[10px] text-slate-500 font-medium">Ngày {data[hoveredIndex].label}</div>
          <div className="font-semibold text-primary mt-0.5 font-mono">
            {data[hoveredIndex].value} <span className="text-[10px] text-slate-600 font-sans">cộng tác viên</span>
          </div>
        </div>
      )}
    </div>
  );

}
