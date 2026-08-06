import { useState } from 'react';
import type { GrowthPoint } from '../../utils/dashboard';

const WIDTH = 600;
const HEIGHT = 200;
const PAD_X = 12;
const PAD_Y = 16;

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
  const stepX = data.length > 1 ? (WIDTH - PAD_X * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: HEIGHT - PAD_Y - (d.value / maxValue) * (HEIGHT - PAD_Y * 2),
  }));

  const linePath = getBezierPath(points);
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${HEIGHT - PAD_Y} L ${points[0].x.toFixed(2)} ${HEIGHT - PAD_Y} Z`;

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-48 w-full overflow-visible" preserveAspectRatio="none">
        {/* Area fill */}
        <path d={areaPath} fill="var(--color-primary)" fillOpacity="0.08" />
        
        {/* Guide line on hover */}
        {hoveredIndex !== null && (
          <line
            x1={points[hoveredIndex].x}
            y1={PAD_Y}
            x2={points[hoveredIndex].x}
            y2={HEIGHT - PAD_Y}
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
          const w = stepX || WIDTH;
          const x = stepX ? p.x - w / 2 : 0;
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
