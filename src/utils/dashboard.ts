import type { Collaborator } from '../types/collaborator';

export interface GrowthPoint {
  label: string;
  value: number;
}

// Xây chuỗi số lượng cộng tác viên cộng dồn theo từng ngày, lấp đầy các ngày
// không có hồ sơ mới để trục thời gian liền mạch.
export function buildGrowthSeries(items: Collaborator[]): GrowthPoint[] {
  const dates = items
    .map((c) => new Date(c.createdAt))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length === 0) return [];

  const toKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const r = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };

  const dayCounts = new Map<string, number>();
  dates.forEach((date) => {
    const key = toKey(date);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  });

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const start = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate());

  const series: GrowthPoint[] = [];
  let cumulative = 0;
  const current = new Date(start);

  while (current <= end) {
    const key = toKey(current);
    cumulative += dayCounts.get(key) ?? 0;
    
    // Định dạng label: DD/MM (ví dụ: 05/08)
    const label = `${String(current.getDate()).padStart(2, '0')}/${String(current.getMonth() + 1).padStart(2, '0')}`;
    series.push({ label, value: cumulative });
    
    current.setDate(current.getDate() + 1);
  }

  return series;
}
