import type { GrowthPoint } from '../../utils/dashboard';

const WIDTH = 600;
const HEIGHT = 200;
const PAD_X = 12;
const PAD_Y = 16;

export default function GrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Chưa có dữ liệu để hiển thị.</p>;
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? (WIDTH - PAD_X * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => ({
    x: PAD_X + i * stepX,
    y: HEIGHT - PAD_Y - (d.value / maxValue) * (HEIGHT - PAD_Y * 2),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(2)} ${HEIGHT - PAD_Y} L ${points[0].x.toFixed(2)} ${HEIGHT - PAD_Y} Z`;

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-48 w-full" preserveAspectRatio="none">
        <path d={areaPath} fill="var(--color-primary)" fillOpacity="0.08" />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill="var(--color-primary)" />
        ))}
      </svg>
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
    </div>
  );
}
