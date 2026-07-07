import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { listCollaborators } from '../services/api/collaborators';
import type { Collaborator } from '../types/collaborator';
import { getMissingItems, isChecklistComplete } from '../utils/checklist';

export default function DashboardPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listCollaborators()
      .then(setCollaborators)
      .finally(() => setLoading(false));
  }, []);

  const total = collaborators.length;
  const complete = collaborators.filter((c) => isChecklistComplete(c.checklist)).length;
  const incomplete = total - complete;

  const missingByItem = new Map<string, number>();
  collaborators.forEach((c) => {
    getMissingItems(c.checklist).forEach((item) => {
      missingByItem.set(item.label, (missingByItem.get(item.label) ?? 0) + 1);
    });
  });

  const stats = [
    { label: 'Tổng số cộng tác viên', value: total, accent: 'text-slate-900' },
    { label: 'Hồ sơ đã nộp đủ', value: complete, accent: 'text-accent' },
    { label: 'Hồ sơ còn thiếu', value: incomplete, accent: 'text-warning' },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Tổng quan tình trạng hồ sơ cộng tác viên</p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Đang tải dữ liệu...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={`mt-2 font-mono text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Mục hồ sơ còn thiếu nhiều nhất</h2>
              {missingByItem.size === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Tất cả hồ sơ đã đầy đủ.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {[...missingByItem.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([label, count]) => (
                      <li key={label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{label}</span>
                        <span className="font-mono font-semibold text-warning">{count}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Truy cập nhanh</h2>
              <div className="mt-3 flex flex-col gap-2">
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
