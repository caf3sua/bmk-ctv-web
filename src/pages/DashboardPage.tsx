import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import DonutChart from '../components/charts/DonutChart';
import GrowthChart from '../components/charts/GrowthChart';
import ActivityResultBadge from '../components/ActivityResultBadge';
import { listCollaborators } from '../services/api/collaborators';
import { listActivityLogs } from '../services/api/activityLogs';
import type { Collaborator } from '../types/collaborator';
import type { ActivityLog } from '../types/activityLog';
import { getMissingItems, isChecklistComplete } from '../utils/checklist';
import { buildGrowthSeries } from '../utils/dashboard';
import { formatRelativeTime } from '../utils/date';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const RECENT_ACTIVITY_LIMIT = 5;

export default function DashboardPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listCollaborators(), listActivityLogs()])
      .then(([collaboratorsResult, activityLogsResult]) => {
        setCollaborators(collaboratorsResult);
        setActivityLogs(activityLogsResult);
      })
      .finally(() => setLoading(false));
  }, []);

  const total = collaborators.length;
  const complete = collaborators.filter((c) => isChecklistComplete(c.checklist)).length;
  const incomplete = total - complete;
  const newLast30Days = collaborators.filter((c) => {
    const created = new Date(c.createdAt).getTime();
    return !Number.isNaN(created) && Date.now() - created <= THIRTY_DAYS_MS;
  }).length;

  const missingByItem = new Map<string, number>();
  collaborators.forEach((c) => {
    getMissingItems(c.checklist).forEach((item) => {
      missingByItem.set(item.label, (missingByItem.get(item.label) ?? 0) + 1);
    });
  });
  const sortedMissing = [...missingByItem.entries()].sort((a, b) => b[1] - a[1]);
  const maxMissing = Math.max(...sortedMissing.map(([, count]) => count), 1);

  const growthSeries = useMemo(() => buildGrowthSeries(collaborators), [collaborators]);
  const recentActivity = activityLogs.slice(0, RECENT_ACTIVITY_LIMIT);

  const stats = [
    { label: 'Tổng số cộng tác viên', value: total, accent: 'text-slate-900' },
    { label: 'Hồ sơ đã nộp đủ', value: complete, accent: 'text-accent' },
    { label: 'Hồ sơ còn thiếu', value: incomplete, accent: 'text-warning' },
    { label: 'Mới trong 30 ngày qua', value: newLast30Days, accent: 'text-primary' },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Tổng quan tình trạng hồ sơ cộng tác viên</p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Đang tải dữ liệu...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={`mt-2 font-mono text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm lg:col-span-2">
              <h2 className="text-lg font-semibold text-slate-900">Tăng trưởng cộng tác viên</h2>
              <p className="mt-1 text-xs text-slate-500">Tổng số hồ sơ cộng dồn theo tháng</p>
              <div className="mt-4">
                <GrowthChart data={growthSeries} />
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Tỉ lệ hồ sơ đầy đủ</h2>
              <div className="mt-4">
                <DonutChart
                  centerValue={`${total > 0 ? Math.round((complete / total) * 100) : 0}%`}
                  centerLabel="đầy đủ"
                  segments={[
                    { label: 'Đã nộp đủ', value: complete, color: 'var(--color-accent)' },
                    { label: 'Còn thiếu', value: incomplete, color: 'var(--color-warning)' },
                  ]}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Mục hồ sơ còn thiếu nhiều nhất</h2>
              {sortedMissing.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Tất cả hồ sơ đã đầy đủ.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {sortedMissing.map(([label, count]) => (
                    <li key={label}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-mono font-semibold text-warning">{count}</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-page">
                        <div
                          className="h-full rounded-full bg-warning"
                          style={{ width: `${(count / maxMissing) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Hoạt động gần đây</h2>
              {recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Chưa có hoạt động nào.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recentActivity.map((log) => (
                    <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-slate-800">{log.message}</p>
                        <div className="mt-1">
                          <ActivityResultBadge result={log.result} />
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-400">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Truy cập nhanh</h2>
              <div className="mt-4 flex flex-col gap-2">
                <Link
                  to="/collaborators"
                  className="rounded-lg border border-border-subtle px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Xem danh sách hồ sơ cộng tác viên
                </Link>
                <Link
                  to="/collaborators/new"
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
                >
                  + Thêm cộng tác viên mới
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
