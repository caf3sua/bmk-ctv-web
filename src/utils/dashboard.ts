import type { Collaborator } from '../types/collaborator';

export interface GrowthPoint {
  label: string;
  value: number;
}

// Xây chuỗi số lượng cộng tác viên cộng dồn theo từng tháng, lấp đầy các tháng
// không có hồ sơ mới để trục thời gian liền mạch.
export function buildGrowthSeries(items: Collaborator[]): GrowthPoint[] {
  const dates = items
    .map((c) => new Date(c.createdAt))
    .filter((d) => !Number.isNaN(d.getTime()));
  if (dates.length === 0) return [];

  const toKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

  const monthCounts = new Map<string, number>();
  dates.forEach((date) => {
    const key = toKey(date.getFullYear(), date.getMonth() + 1);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  });

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const endKey = toKey(maxDate.getFullYear(), maxDate.getMonth() + 1);

  const series: GrowthPoint[] = [];
  let cumulative = 0;
  let year = minDate.getFullYear();
  let month = minDate.getMonth() + 1;

  while (true) {
    const key = toKey(year, month);
    cumulative += monthCounts.get(key) ?? 0;
    series.push({ label: `T${month}/${String(year).slice(2)}`, value: cumulative });
    if (key === endKey) break;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return series;
}

export function getRecentActivity(items: Collaborator[], limit = 5): Collaborator[] {
  return [...items]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}
