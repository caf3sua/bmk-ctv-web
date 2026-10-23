import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ExpiringContractsBarChart from '../components/charts/ExpiringContractsBarChart';
import EmploymentStatusPieChart from '../components/charts/EmploymentStatusPieChart';
import {
  downloadExpiringContractsHistoryFile,
  downloadExpiringContractsResultFile,
  downloadExpiringContractsTemplate,
  getExpiringContractsStats,
  importExpiringContractsFile,
  listExpiringContracts,
  listExpiringContractsHistory,
} from '../services/api/reconciliation';
import type {
  ExpiringContractsHistoryRecord,
  ExpiringContractsStatsResponse,
  ReconciliationRecord,
} from '../types/reconciliation';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/date';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function formatFileSize(bytes?: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

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
  const [activeTab, setActiveTab] = useState<'list' | 'history'>('list');

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
  const [searchInput, setSearchInput] = useState<string>('');
  const [keyword, setKeyword] = useState<string>('');
  const [daysFilter, setDaysFilter] = useState<number | 'all'>('all');
  const [calcExpiredFilter, setCalcExpiredFilter] = useState<boolean | 'all'>('all');
  const [listLoading, setListLoading] = useState<boolean>(true);

  // History state
  const [historyRecords, setHistoryRecords] = useState<ExpiringContractsHistoryRecord[]>([]);
  const [historyTotal, setHistoryTotal] = useState<number>(0);
  const [historyTotalPages, setHistoryTotalPages] = useState<number>(1);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyPageSize] = useState<number>(20);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);
  const [downloadingResultId, setDownloadingResultId] = useState<string | null>(null);

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
        is_calculate_expired: calcExpiredFilter !== 'all' ? calcExpiredFilter : undefined,
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
  }, [keyword, daysFilter, calcExpiredFilter, page, pageSize]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Load history records
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await listExpiringContractsHistory(historyPage, historyPageSize);
      setHistoryRecords(res.items);
      setHistoryTotal(res.total);
      setHistoryTotalPages(res.totalPages);
    } catch (err) {
      console.error('Lỗi khi tải lịch sử import ngày đáo hạn:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = () => {
    fetchStats(selectedChartDays);
    fetchRecords();
    loadHistory();
  };

  const handleSearch = () => {
    setKeyword(searchInput.trim());
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setKeyword('');
    setPage(1);
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
      // Cập nhật lại biểu đồ, danh sách và lịch sử
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

  const handleDownloadHistory = async (id: string, filename: string) => {
    if (downloadingHistoryId) return;
    setDownloadingHistoryId(id);
    try {
      await downloadExpiringContractsHistoryFile(id, filename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingHistoryId(null);
    }
  };

  const handleDownloadResult = async (id: string, filename: string) => {
    if (downloadingResultId) return;
    setDownloadingResultId(id);
    try {
      await downloadExpiringContractsResultFile(id, filename);
    } catch (err) {
      console.error('Download result failed:', err);
    } finally {
      setDownloadingResultId(null);
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

        {/* Navigation Tabs */}
        <div className="border-b border-border-subtle">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`border-b-2 py-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'list'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                />
              </svg>
              Danh sách hợp đồng
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                {total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('history');
                loadHistory();
              }}
              className={`border-b-2 py-3 px-1 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                />
              </svg>
              Lịch sử
              {historyTotal > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-medium">
                  {historyTotal}
                </span>
              )}
            </button>
          </nav>
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
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-emerald-600 shrink-0"
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
              className="text-xs font-semibold underline hover:no-underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* TAB 1: DANH SÁCH HỢP ĐỒNG */}
        {activeTab === 'list' && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pie Chart: Trạng thái nhân sự */}
              <div className="lg:col-span-1">
                <EmploymentStatusPieChart
                  activeCount={stats?.pieChart.active ?? 0}
                  resignedCount={stats?.pieChart.resigned ?? 0}
                  activeWithExpiry={stats?.pieChart.activeWithExpiry}
                  activeWithoutExpiry={stats?.pieChart.activeWithoutExpiry}
                  loading={statsLoading}
                />
              </div>

              {/* Bar Chart: Biến động Hợp đồng đến hạn */}
              <div className="lg:col-span-2">
                <ExpiringContractsBarChart
                  data={stats?.barChart.items ?? []}
                  totalExpiring={stats?.barChart.totalExpiring ?? 0}
                  selectedDays={selectedChartDays}
                  onSelectDays={(d: number) => setSelectedChartDays(d)}
                  loading={statsLoading}
                />
              </div>
            </div>

            {/* Grid Container */}
            <div className="rounded-2xl border border-border-subtle/80 bg-white shadow-card overflow-hidden">
              {/* Filter Toolbar */}
              <div className="p-4 border-b border-border-subtle/80 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                  {/* Search input */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSearch();
                    }}
                    className="flex items-center gap-2 flex-1 min-w-[220px] max-w-[380px]"
                  >
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Tìm theo mã NV, họ tên, CCCD, đơn vị..."
                        className={`input text-xs ${searchInput ? 'pr-8' : ''}`}
                      />
                      {searchInput && (
                        <button
                          type="button"
                          onClick={handleClearSearch}
                          title="Xóa tìm kiếm"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="btn-primary px-3.5 py-2 text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      <span>Tìm kiếm</span>
                    </button>
                  </form>

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

                  {/* Filter CTV vừa upload tính đáo hạn */}
                  <select
                    value={calcExpiredFilter === 'all' ? 'all' : String(calcExpiredFilter)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCalcExpiredFilter(val === 'all' ? 'all' : val === 'true');
                      setPage(1);
                    }}
                    className="input w-auto text-xs font-medium"
                  >
                    <option value="all">Tất cả CTV</option>
                    <option value="true">Chỉ CTV đợt upload tính đáo hạn vừa rồi</option>
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
                      <th className="py-3.5 px-4 min-w-[130px]">Mã NV</th>
                      <th className="py-3.5 px-4 min-w-[180px]">Họ và tên</th>
                      <th className="py-3.5 px-4 min-w-[140px]">Ngày gia nhập</th>
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
                          {keyword ? (
                            <div>
                              <p className="font-medium text-slate-600">
                                Không tìm thấy cộng tác viên phù hợp với từ khóa &ldquo;{keyword}&rdquo;
                              </p>
                              <button
                                type="button"
                                onClick={handleClearSearch}
                                className="mt-2 text-xs font-semibold text-accent hover:underline cursor-pointer"
                              >
                                Xóa bộ lọc tìm kiếm
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium text-slate-600">Không tìm thấy cộng tác viên phù hợp</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc hạn hợp đồng.
                              </p>
                            </>
                          )}
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
                            <td className="py-3.5 px-4 font-mono">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-primary">{r.employeeCode}</span>
                                {r.isCalculateExpired && (
                                  <span
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                                    title="CTV có trong dữ liệu upload tính ngày đáo hạn gần nhất"
                                  >
                                    Mới tính
                                  </span>
                                )}
                              </div>
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

                            {/* 4. Ngày gia nhập */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {r.contractOnboardDate ? (
                                <span className="font-mono text-slate-800">
                                  {formatDate(r.contractOnboardDate)}
                                </span>
                              ) : (
                                <span className="font-mono text-slate-400">—</span>
                              )}
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
          </>
        )}

        {/* TAB 2: LỊCH SỬ IMPORT */}
        {activeTab === 'history' && (
          <div className="rounded-2xl border border-border-subtle/80 bg-white shadow-card overflow-hidden">
            <div className="p-4 border-b border-border-subtle/80 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Lịch sử import ngày đáo hạn</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lưu lại các tệp Excel đã upload và cho phép tải về file kết quả tính toán ngày đáo hạn kèm thông báo
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Tổng cộng: <strong className="text-slate-800">{historyTotal}</strong> phiên
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-slate-50/80 font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-14 text-center">STT</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Thời gian upload</th>
                    <th className="py-3.5 px-4 min-w-[140px]">Người thực hiện</th>
                    <th className="py-3.5 px-4 min-w-[280px]">Tệp dữ liệu</th>
                    <th className="py-3.5 px-4 min-w-[140px] text-center">Số dòng xử lý</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Trạng thái / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/60 text-slate-700 font-sans">
                  {historyLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4 text-center">
                          <div className="h-4 w-6 bg-slate-200 rounded mx-auto" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-28 bg-slate-200 rounded" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-24 bg-slate-200 rounded" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-48 bg-slate-200 rounded" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-16 bg-slate-200 rounded mx-auto" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="h-4 w-32 bg-slate-200 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : historyRecords.length === 0 ? (
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
                              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                            />
                          </svg>
                        </div>
                        <p className="font-medium text-slate-600">Chưa có lịch sử import ngày đáo hạn nào</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Khi bạn upload file data ngày đáo hạn, thông tin phiên và file kết quả sẽ được lưu trữ tại đây.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    historyRecords.map((item, idx) => {
                      const stt = (historyPage - 1) * historyPageSize + idx + 1;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {stt}
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                            <div className="font-semibold text-slate-900">{formatDateTime(item.createdAt)}</div>
                            <div className="text-[10px] text-slate-400 font-sans">{formatRelativeTime(item.createdAt)}</div>
                          </td>
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-900">{item.uploadedBy || '—'}</div>
                            <div className="text-[11px] font-mono text-slate-400">@{item.username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1.5">
                              {/* File gốc */}
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                  Gốc
                                </span>
                                <span className="font-medium text-slate-800 max-w-[200px] truncate" title={item.filename}>
                                  {item.filename}
                                </span>
                                {item.fileSize ? (
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                    ({formatFileSize(item.fileSize)})
                                  </span>
                                ) : null}
                                {item.s3Key && (
                                  <button
                                    type="button"
                                    disabled={downloadingHistoryId === item.id}
                                    onClick={() => handleDownloadHistory(item.id, item.filename)}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer disabled:opacity-50 ml-1 shrink-0"
                                    title="Tải file import gốc"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                    </svg>
                                    {downloadingHistoryId === item.id ? '...' : 'Tải'}
                                  </button>
                                )}
                              </div>

                              {/* File kết quả */}
                              {item.resultFile ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                                    Kết quả
                                  </span>
                                  <span className="font-medium text-slate-800 max-w-[200px] truncate" title={item.resultFile.filename}>
                                    {item.resultFile.filename}
                                  </span>
                                  {item.resultFile.fileSize ? (
                                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                                      ({formatFileSize(item.resultFile.fileSize)})
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    disabled={downloadingResultId === item.id}
                                    onClick={() => handleDownloadResult(item.id, item.resultFile?.filename || 'ket_qua_ngay_dao_han.xlsx')}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer disabled:opacity-50 ml-1 shrink-0"
                                    title="Tải file kết quả ngày đáo hạn kèm Thông báo"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                    </svg>
                                    {downloadingResultId === item.id ? '...' : 'Tải'}
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 italic">
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400 border border-slate-100 shrink-0">
                                    Kết quả
                                  </span>
                                  <span>Chưa có file</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="inline-flex flex-col items-center">
                              <span className="font-mono font-bold text-slate-800">
                                {item.totalRows} dòng
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                Tạo mới: {item.createdCount} | Cập nhật: {item.updatedCount}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="inline-flex items-center gap-1 w-fit rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                                ✓ Thành công
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {item.message || 'Xử lý hoàn tất'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* History Pagination */}
            {historyTotalPages > 1 && (
              <div className="p-4 border-t border-border-subtle/80 flex items-center justify-between gap-4 bg-slate-50/30">
                <span className="text-xs text-slate-500 font-mono">
                  Trang {historyPage} / {historyTotalPages}
                </span>
                <Pagination
                  page={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(p) => setHistoryPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
