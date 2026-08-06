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
import { isChecklistComplete } from '../utils/checklist';
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

  let cccdExcelCount = 0;
  let cccdScanCount = 0;
  let hddvExcelCount = 0;
  let hddvScanCount = 0;
  let cktExcelCount = 0;
  let cktScanCount = 0;
  let bbtlExcelCount = 0;
  let bbtlScanCount = 0;

  collaborators.forEach((c) => {
    const checklist = c.checklist || {};
    const cccd = checklist.cccd || {};
    const ckt = checklist.ckt || {};
    const hddv = checklist.hddv || {};
    const bbtl = checklist.bbtl || {};

    if (cccd.checked) cccdExcelCount++;
    if (cccd.file) cccdScanCount++;

    if (ckt.checked) cktExcelCount++;
    if (ckt.file) cktScanCount++;

    if ((hddv.contract_date || []).some((period) => Boolean(period.startDate))) hddvExcelCount++;
    if ((hddv.files || []).length > 0) hddvScanCount++;

    if (bbtl.date) bbtlExcelCount++;
    if (bbtl.file) bbtlScanCount++;
  });

  const docTypesData = [
    {
      key: 'cccd',
      label: 'Căn cước công dân',
      excelCount: cccdExcelCount,
      scanCount: cccdScanCount,
    },
    {
      key: 'hddv',
      label: 'Hợp đồng dịch vụ',
      excelCount: hddvExcelCount,
      scanCount: hddvScanCount,
    },
    {
      key: 'ckt',
      label: 'Cam kết thuế',
      excelCount: cktExcelCount,
      scanCount: cktScanCount,
    },
    {
      key: 'bbtl',
      label: 'Biên bản thanh lý',
      excelCount: bbtlExcelCount,
      scanCount: bbtlScanCount,
    },
  ];

  const totalExcel = cccdExcelCount + hddvExcelCount + cktExcelCount + bbtlExcelCount;
  const totalScan = cccdScanCount + hddvScanCount + cktScanCount + bbtlScanCount;

  const growthSeries = useMemo(() => buildGrowthSeries(collaborators), [collaborators]);
  const recentActivity = activityLogs.slice(0, RECENT_ACTIVITY_LIMIT);

  const stats = [
    {
      label: 'Tổng số cộng tác viên',
      value: total,
      accent: 'text-[#0b3a70]',
      bgClass: 'bg-gradient-to-b from-[#0b3a70]/5 to-white',
      borderClass: 'border-t-4 border-t-[#0b3a70]',
    },
    {
      label: 'Hồ sơ đã nộp đủ',
      value: complete,
      accent: 'text-emerald-600',
      bgClass: 'bg-gradient-to-b from-emerald-50/40 to-white',
      borderClass: 'border-t-4 border-t-emerald-500',
    },
    {
      label: 'Hồ sơ còn thiếu',
      value: incomplete,
      accent: 'text-rose-600',
      bgClass: 'bg-gradient-to-b from-rose-50/50 to-white',
      borderClass: 'border-t-4 border-t-rose-500',
    },
    {
      label: 'Mới trong 30 ngày qua',
      value: newLast30Days,
      accent: 'text-amber-600',
      bgClass: 'bg-gradient-to-b from-amber-50/40 to-white',
      borderClass: 'border-t-4 border-t-amber-500',
    },
  ];

  return (
    <Layout>
      <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Tổng quan tình trạng hồ sơ cộng tác viên</p>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500 font-medium">Đang tải dữ liệu...</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`rounded-2xl border border-border-subtle/60 p-5 shadow-card ${stat.bgClass} ${stat.borderClass}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{stat.label}</p>
                <p className={`mt-2 font-mono text-3xl font-bold ${stat.accent}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Tăng trưởng cộng tác viên</h2>
              <p className="mt-1 text-xs text-slate-500">Tổng số hồ sơ cộng dồn theo ngày</p>
              <div className="mt-4">
                <GrowthChart data={growthSeries} />
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight flex justify-between items-baseline gap-2 flex-wrap">
                <span>Hồ sơ</span>
                <span className="text-xs font-normal flex items-center gap-4">
                  <span style={{ color: '#e11d48' }}>Excel {totalExcel}</span>
                  <span style={{ color: '#059669' }}>Scan {totalScan}</span>
                  <span style={{ color: '#60758bfa' }}>Hồ sơ {total}</span>
                </span>
              </h2>
              <div className="mt-4 space-y-4">
                {docTypesData.map((item) => {
                  const excelPct = total > 0 ? (item.excelCount / total) * 100 : 0;
                  const scanPct = total > 0 ? (item.scanCount / total) * 100 : 0;
                  const diff = item.excelCount - item.scanCount;
                  const diffText = diff > 0 ? `+${diff}` : `${diff}`;
                  const colorDev = diff === 0 ? '#059669' : '#e11d48';
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="text-sm font-semibold tracking-tight flex items-baseline justify-between gap-2 flex-wrap">
                        <span style={{ color: '#16324aab' }}>{item.label}</span>
                        <span className="text-xs font-semibold" style={{ color: colorDev }}>
                          Lệch {diffText}
                        </span>
                      </div>
                      
                      {/* Excel Bar */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="w-16 font-semibold" style={{ color: '#e11d48' }}>Excel</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-slate-400 rounded-full transition-all duration-500"
                            style={{ width: `${excelPct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-mono font-semibold" style={{ color: '#e11d48' }}>
                          {item.excelCount} ({Math.round(excelPct)}%)
                        </span>
                      </div>

                      {/* Scan Bar */}
                      <div className="flex items-center gap-3 text-xs">
                        <span className="w-16 font-semibold" style={{ color: '#059669' }}>File</span>
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${scanPct}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-mono font-semibold" style={{ color: '#059669' }}>
                          {item.scanCount} ({Math.round(scanPct)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Tỉ lệ hồ sơ đầy đủ</h2>
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

            <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Hoạt động gần đây</h2>
              {recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 font-medium">Chưa có hoạt động nào.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {recentActivity.map((log) => (
                    <li key={log.id} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-slate-800 font-medium">{log.message}</p>
                        <div className="mt-1">
                          <ActivityResultBadge result={log.result} />
                        </div>
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-400 font-mono">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Truy cập nhanh</h2>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/collaborators"
                  className="btn-secondary w-full"
                >
                  Xem danh sách hồ sơ CTV
                </Link>
                <Link
                  to="/collaborators/new"
                  className="btn-primary w-full"
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
