import { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ActivityResultBadge from '../components/ActivityResultBadge';
import { listActivityLogs } from '../services/api/activityLogs';
import type { ActivityAction, ActivityLog, ActivityResult } from '../types/activityLog';
import { actionLabel, resultLabel } from '../utils/activityLog';
import { formatDateTime } from '../utils/date';

type ActionFilter = 'all' | ActivityAction;
type ResultFilter = 'all' | ActivityResult;

const ACTIONS: ActivityAction[] = [
  'login',
  'logout',
  'create_collaborator',
  'update_collaborator',
  'delete_collaborator',
  'import_collaborators',
  'export_collaborators',
];

const RESULTS: ActivityResult[] = ['success', 'fail', 'error'];

const PAGE_SIZE_OPTIONS = [20, 50, 100];

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    listActivityLogs()
      .then(setLogs)
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesKeyword =
        !term ||
        log.fullName.toLowerCase().includes(term) ||
        log.username.toLowerCase().includes(term) ||
        log.message.toLowerCase().includes(term);

      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      const matchesResult = resultFilter === 'all' || log.result === resultFilter;

      return matchesKeyword && matchesAction && matchesResult;
    });
  }, [logs, keyword, actionFilter, resultFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, actionFilter, resultFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Nhật ký hệ thống</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} / {logs.length} bản ghi hoạt động
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="btn-secondary px-4 py-2"
        >
          Làm mới
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 p-4 rounded-2xl border border-border-subtle/60 bg-white shadow-card">
        <div className="min-w-[220px] flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo họ tên, tên đăng nhập, nội dung..."
            className="input"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
          className="input w-auto"
        >
          <option value="all">Tất cả hành động</option>
          {ACTIONS.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
          className="input w-auto"
        >
          <option value="all">Tất cả kết quả</option>
          {RESULTS.map((result) => (
            <option key={result} value={result}>
              {resultLabel(result)}
            </option>
          ))}
        </select>
        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="input w-auto"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} dòng / trang
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle/60 bg-white shadow-card">
        <table className="min-w-full divide-y divide-border-subtle/60 text-sm">
          <thead className="bg-page">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Thời gian</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hành động</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Kết quả</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Họ tên</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên đăng nhập</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Nội dung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Không tìm thấy bản ghi nào.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((log) => (
                <tr key={log.id} className="hover:bg-ceramic/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-500 font-mono text-xs">{formatDateTime(log.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-850 font-semibold">{actionLabel(log.action)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ActivityResultBadge result={log.result} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800 font-medium">{log.fullName || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600 text-xs">{log.username || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-medium">{log.message}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} trên{' '}
            {filtered.length} bản ghi
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </Layout>
  );
}
