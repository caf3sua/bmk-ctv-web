import { useEffect, useMemo, useState } from 'react';
import ActivityResultBadge from './ActivityResultBadge';
import { listActivityLogs } from '../services/api/activityLogs';
import type { ActivityAction, ActivityLog, ActivityResult } from '../types/activityLog';
import { actionLabel } from '../utils/activityLog';
import { formatDateTime, formatRelativeTime } from '../utils/date';

interface Props {
  employeeCode: string;
}

type ActionFilter = 'all' | ActivityAction;
type ResultFilter = 'all' | ActivityResult;

const CTV_ACTIONS: ActivityAction[] = [
  'create_collaborator',
  'update_collaborator',
  'upload_collaborator_document',
  'delete_collaborator_document',
  'delete_collaborator',
  'import_collaborators',
];

export default function CollaboratorActivityTimeline({ employeeCode }: Props) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');

  useEffect(() => {
    loadLogs();
  }, [employeeCode]);

  async function loadLogs() {
    if (!employeeCode) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listActivityLogs({ employee_code: employeeCode });
      setLogs(data);
    } catch (err) {
      setError('Không thể tải lịch sử hoạt động của cộng tác viên này');
    } finally {
      setLoading(false);
    }
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

  function resetFilters() {
    setKeyword('');
    setActionFilter('all');
    setResultFilter('all');
  }

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Lịch sử hoạt động</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {logs.length > 0
                ? `${filtered.length} / ${logs.length} mốc hoạt động được ghi nhận`
                : 'Nhật ký các thay đổi và thao tác liên quan đến CTV'}
            </p>
          </div>
          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 cursor-pointer"
            title="Tải lại nhật ký hoạt động"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            Làm mới
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <div className="min-w-[200px] flex-1">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm nội dung, người thực hiện..."
                className="input py-1.5 pl-9 text-xs"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilter)}
            className="input w-auto py-1.5 text-xs"
          >
            <option value="all">Tất cả hành động</option>
            {CTV_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value as ResultFilter)}
            className="input w-auto py-1.5 text-xs"
          >
            <option value="all">Tất cả kết quả</option>
            <option value="success">Thành công</option>
            <option value="fail">Thất bại</option>
            <option value="error">Lỗi hệ thống</option>
          </select>

          {(keyword || actionFilter !== 'all' || resultFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-primary hover:underline px-2 py-1 cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="rounded-2xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={loadLogs}
            className="font-semibold underline hover:no-underline ml-3"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 rounded-2xl border border-border-subtle/60 bg-white p-6 shadow-card">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-8 w-8 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-3/4 rounded bg-slate-100" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State: No logs at all */}
      {!loading && !error && logs.length === 0 && (
        <div className="rounded-2xl border border-border-subtle/60 bg-white p-12 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-page text-slate-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-7 w-7"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-800">Chưa có lịch sử hoạt động</h3>
          <p className="mt-1.5 text-sm text-slate-500 max-w-md mx-auto">
            Các thao tác chỉnh sửa hồ sơ, tải lên hoặc xóa tài liệu của cộng tác viên này sẽ được lưu và hiển thị dạng dòng thời gian tại đây.
          </p>
        </div>
      )}

      {/* Empty State: Filter produced no matches */}
      {!loading && !error && logs.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-border-subtle/60 bg-white p-10 text-center shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </div>
          <h3 className="mt-3 text-base font-semibold text-slate-800">Không tìm thấy hoạt động phù hợp</h3>
          <p className="mt-1 text-sm text-slate-500">
            Vui lòng thử thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc hành động và kết quả.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 btn-secondary text-xs px-4 py-1.5"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* Timeline View */}
      {!loading && !error && filtered.length > 0 && (
        <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 sm:p-6 shadow-card">
          <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            <div className="space-y-6">
              {filtered.map((log) => (
                <TimelineItem key={log.id} log={log} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ log }: { log: ActivityLog }) {
  const iconConfig = getActionIcon(log.action);

  return (
    <div className="relative group">
      {/* Node Dot / Icon on vertical line */}
      <div
        className={`absolute -left-6 sm:-left-8 flex h-7 w-7 sm:h-8 sm:w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-white shadow-sm ring-2 ${iconConfig.ringColor} ${iconConfig.bgColor} ${iconConfig.textColor}`}
        title={actionLabel(log.action)}
      >
        {iconConfig.icon}
      </div>

      {/* Card Content */}
      <div className="rounded-xl border border-border-subtle/60 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow transition-all">
        {/* Top row: Action name, result badge, relative time */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-slate-900">
              {actionLabel(log.action)}
            </span>
            <ActivityResultBadge result={log.result} />
          </div>

          <div
            className="flex items-center gap-1 text-xs text-slate-400 cursor-help"
            title={`Thời gian ghi nhận: ${formatDateTime(log.createdAt)}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="h-3.5 w-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <span>{formatRelativeTime(log.createdAt)}</span>
          </div>
        </div>

        {/* Message body */}
        <div className="mt-2 text-sm text-slate-700 leading-relaxed break-words">
          {log.message}
        </div>

        {/* Footer info: Actor & exact timestamp */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 uppercase">
              {log.fullName ? log.fullName.charAt(0) : '?'}
            </div>
            <span className="font-medium text-slate-800">{log.fullName || 'Hệ thống'}</span>
            {log.username && (
              <span className="text-slate-400 font-mono">(@{log.username})</span>
            )}
          </div>

          <div className="font-mono text-[11px] text-slate-400">
            {formatDateTime(log.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}

function getActionIcon(action: ActivityAction) {
  switch (action) {
    case 'create_collaborator':
      return {
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        ringColor: 'ring-emerald-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
          </svg>
        ),
      };

    case 'update_collaborator':
      return {
        bgColor: 'bg-sky-50',
        textColor: 'text-sky-700',
        ringColor: 'ring-sky-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        ),
      };

    case 'upload_collaborator_document':
      return {
        bgColor: 'bg-indigo-50',
        textColor: 'text-indigo-700',
        ringColor: 'ring-indigo-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
        ),
      };

    case 'delete_collaborator_document':
      return {
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        ringColor: 'ring-rose-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        ),
      };

    case 'delete_collaborator':
      return {
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        ringColor: 'ring-red-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.765Z" />
          </svg>
        ),
      };

    case 'import_collaborators':
      return {
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        ringColor: 'ring-amber-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
          </svg>
        ),
      };

    default:
      return {
        bgColor: 'bg-slate-50',
        textColor: 'text-slate-700',
        ringColor: 'ring-slate-200',
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        ),
      };
  }
}
