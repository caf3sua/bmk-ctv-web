import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ExpiringContractsBarChart from '../components/charts/ExpiringContractsBarChart';
import EmploymentStatusPieChart from '../components/charts/EmploymentStatusPieChart';
import {
  downloadExpiringContractsTemplate,
  getExpiringContractsStats,
  importExpiringContractsFile,
  listExpiringContracts,
} from '../services/api/reconciliation';
import type {
  ExpiringContractsStatsResponse,
  ReconciliationRecord,
} from '../types/reconciliation';
import { formatDate } from '../utils/date';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function getNotificationInfo(expiryDateStr?: string | null): {
  text: string;
  className: string;
} {
  if (!expiryDateStr || expiryDateStr.trim() === '') {
    return {
      text: 'Thiếu ngày đáo hạn',
      className: 'text-slate-400 font-normal',
    };
  }

  const exp = new Date(expiryDateStr);
  if (Number.isNaN(exp.getTime())) {
    return {
      text: 'Thiếu ngày đáo hạn',
      className: 'text-slate-400 font-normal',
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return {
      text: `Hợp đồng đã quá hạn ${overdueDays} ngày`,
      className: 'text-rose-600 font-medium',
    };
  }

  // Ngày đáo hạn >= ngày hiện tại
  let colorClass = 'text-emerald-700 font-medium';
  if (diffDays <= 7) {
    colorClass = 'text-amber-600 font-semibold';
  } else if (diffDays <= 30) {
    colorClass = 'text-amber-700 font-medium';
  }

  return {
    text: `Hợp đồng sẽ đáo hạn trong ${diffDays} ngày`,
    className: colorClass,
  };
}

export default function ExpiringContractsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncMessageType, setSyncMessageType] = useState<'success' | 'error'>('success');

  // Chart state
  const [selectedChartDays, setSelectedChartDays] = useState<number>(30);
  const [stats, setStats] = useState<ExpiringContractsStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Table state
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [keyword, setKeyword] = useState<string>('');
  const [daysFilter, setDaysFilter] = useState<number | 'all'>('all');
  const [listLoading, setListLoading] = useState<boolean>(true);

  // Load stats
  const fetchStats = useCallback(async (days: number) => {
    setStatsLoading(true);
    try {
      const data = await getExpiringContractsStats(days);
      setStats(data);
    } catch (err) {
      console.error('Lỗi khi tải thống kê hợp đồng đến hạn:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats(selectedChartDays);
  }, [fetchStats, selectedChartDays]);

  // Load grid records
  const fetchRecords = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await listExpiringContracts({
        keyword: keyword.trim() || undefined,
        days: daysFilter !== 'all' ? daysFilter : undefined,
        page,
        pageSize,
      });
      setRecords(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi khi tải danh sách hợp đồng đến hạn:', err);
    } finally {
      setListLoading(false);
    }
  }, [keyword, daysFilter, page, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleRefresh = () => {
    fetchStats(selectedChartDays);
    fetchRecords();
  };

  const handleDownloadTemplate = async () => {
    if (isDownloadingTemplate) return;
    setIsDownloadingTemplate(true);
    try {
      await downloadExpiringContractsTemplate();
    } catch (err: any) {
      console.error('Lỗi tải template:', err);
      setSyncMessageType('error');
      setSyncMessage(`Không thể tải file mẫu: ${err.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setSyncMessage(null);
    try {
      const res = await importExpiringContractsFile(file);
      setSyncMessageType('success');
      setSyncMessage(res.message);
      // Cập nhật lại biểu đồ và danh sách dữ liệu
      handleRefresh();
    } catch (err: any) {
      console.error('Lỗi khi import ngày đáo hạn:', err);
      setSyncMessageType('error');
      setSyncMessage(`Import dữ liệu thất bại: ${err.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Hợp đồng đến hạn
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Danh sách các cộng tác viên có hợp đồng sắp hết hạn để thông báo cho quản trị
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".xlsx,.xlsm"
              className="hidden"
            />

            {/* Button 1: Download Template */}
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isDownloadingTemplate}
              className="btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Tải template mẫu template_bmk_ngay_dao_han.xlsx"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`h-4 w-4 ${isDownloadingTemplate ? 'animate-spin' : ''}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              {isDownloadingTemplate ? 'Đang tải mẫu...' : 'Tải file mẫu'}
            </button>

            {/* Button 2: Import data ngày đáo hạn */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="btn-primary px-4 py-2 text-xs font-semibold flex items-center gap-1.5 border-primary bg-primary hover:bg-primary-dark text-white shadow-sm cursor-pointer disabled:opacity-50"
              title="Upload file data ngày đáo hạn"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`h-4 w-4 ${isImporting ? 'animate-spin' : ''}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
              {isImporting ? 'Đang import...' : 'Import data ngày đáo hạn'}
            </button>

            {/* Button 3: Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              className="btn-secondary px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                />
              </svg>
              Làm mới
            </button>
          </div>
        </div>

        {/* Sync / Import Status Alert */}
        {syncMessage && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm flex items-center justify-between transition-all ${
              syncMessageType === 'error'
                ? 'border-rose-200 bg-rose-50 text-rose-700'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncMessageType === 'error' ? (
                <svg
                  className="w-5 h-5 text-rose-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-emerald-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="font-medium">{syncMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncMessage(null)}
              className="text-xs font-semibold underline hover:no-underline ml-4 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Part 1: Charts Section (Bar Chart ~75% width, Pie Chart ~25% width) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Bar Chart: 75% width (lg:col-span-3) */}
          <div className="lg:col-span-3 rounded-2xl border border-border-subtle bg-white p-5 shadow-card flex flex-col justify-between">
            <ExpiringContractsBarChart
              data={stats?.barChart?.items || []}
              totalExpiring={stats?.barChart?.totalExpiring || 0}
              selectedDays={selectedChartDays}
              onSelectDays={setSelectedChartDays}
              loading={statsLoading}
            />
          </div>

          {/* Pie Chart: 25% width (lg:col-span-1) */}
          <div className="lg:col-span-1 rounded-2xl border border-border-subtle bg-white p-5 shadow-card flex flex-col justify-between">
            <EmploymentStatusPieChart
              activeCount={stats?.pieChart?.active || 0}
              resignedCount={stats?.pieChart?.resigned || 0}
              activeWithExpiry={stats?.pieChart?.activeWithExpiry || 0}
              activeWithoutExpiry={stats?.pieChart?.activeWithoutExpiry || 0}
              loading={statsLoading}
            />
          </div>
        </div>

        {/* Part 2: Grid Section (Data Table) */}
        <div className="rounded-2xl border border-border-subtle bg-white shadow-card overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-border-subtle/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[260px]">
              {/* Search input */}
              <div className="relative min-w-[240px] max-w-sm flex-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Tìm theo mã NV, họ tên, CCCD, đơn vị..."
                  className="input pl-9 text-xs"
                />
              </div>

              {/* Days filter select */}
              <select
                value={daysFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setDaysFilter(val === 'all' ? 'all' : Number(val));
                  setPage(1);
                }}
                className="input w-auto text-xs font-medium"
              >
                <option value="all">Tất cả CTV còn hiệu lực</option>
                <option value="7">Đến hạn trong 7 ngày</option>
                <option value="15">Đến hạn trong 15 ngày</option>
                <option value="30">Đến hạn trong 30 ngày</option>
                <option value="60">Đến hạn trong 60 ngày</option>
              </select>
            </div>

            {/* Page size & count */}
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                Hiển thị <span className="font-semibold text-slate-800">{records.length}</span> /{' '}
                <span className="font-semibold text-slate-800">{total}</span> CTV
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="input w-auto py-1 px-2.5 text-xs font-mono"
              >
                {PAGE_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt} dòng/trang
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-subtle bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 w-14 text-center">STT</th>
                  <th className="py-3.5 px-4 min-w-[110px]">Mã NV</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Họ và tên</th>
                  <th className="py-3.5 px-4 min-w-[180px]">Ngày vào / Nghỉ</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Ngày đáo hạn</th>
                  <th className="py-3.5 px-4 min-w-[250px]">Thông báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-slate-700 font-sans">
                {listLoading ? (
                  // Skeleton Loading Rows
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-3.5 px-4 text-center">
                        <div className="h-4 w-6 bg-slate-200 rounded mx-auto" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-16 bg-slate-200 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-32 bg-slate-200 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-28 bg-slate-200 rounded" />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="h-4 w-24 bg-slate-200 rounded" />
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="h-4 w-16 bg-slate-200 rounded mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : records.length === 0 ? (
                  // Empty State
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
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
                            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                          />
                        </svg>
                      </div>
                      <p className="font-medium text-slate-600">Không tìm thấy cộng tác viên phù hợp</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc hạn hợp đồng.
                      </p>
                    </td>
                  </tr>
                ) : (
                  // Data Rows
                  records.map((r, index) => {
                    const stt = (page - 1) * pageSize + index + 1;
                    const notify = getNotificationInfo(r.contractExpiryDate);

                    return (
                      <tr
                        key={r.id || r.employeeCode}
                        className="hover:bg-slate-50/70 transition-colors duration-100"
                      >
                        {/* 1. STT */}
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {stt}
                        </td>

                        {/* 2. Mã NV */}
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {r.employeeCode}
                        </td>

                        {/* 3. Họ và tên */}
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">{r.fullName || '—'}</div>
                          {r.idNumber && (
                            <div className="text-[11px] font-mono font-normal text-slate-400">
                              CCCD: {r.idNumber}
                            </div>
                          )}
                          {r.departmentLevel1 && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                              {r.departmentLevel1}
                            </div>
                          )}
                        </td>

                        {/* 4. Ngày vào / Nghỉ */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 font-mono">
                              Vào: {formatDate(r.onboardDate)}
                            </span>
                            {r.offboardDate && (
                              <span className="text-rose-600 font-mono text-[11px]">
                                Nghỉ: {formatDate(r.offboardDate)}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Ngày đáo hạn */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {r.contractExpiryDate ? (
                            <span className="font-mono font-semibold text-slate-900">
                              {formatDate(r.contractExpiryDate)}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400">—</span>
                          )}
                        </td>

                        {/* 6. Thông báo */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`text-xs ${notify.className}`}>
                            {notify.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border-subtle/80 flex items-center justify-between gap-4 bg-slate-50/30">
              <span className="text-xs text-slate-500 font-mono">
                Trang {page} / {totalPages}
              </span>
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p)}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
