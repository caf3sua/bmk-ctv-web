import { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import {
  listReconciliations,
  syncBmkSystemInfo,
  importHrBmkFile,
  reconcileTpBankFile,
  importHrTpBankFile,
  listReconciliationHistory,
  downloadReconciliationHistoryFile,
  downloadReconciliationResultFile,
} from '../services/api/reconciliation';
import type {
  ReconciliationRecord,
  TpBankContractItem,
  ReconciliationHistoryItem,
} from '../types/reconciliation';
import { formatDate, formatDateTime, formatRelativeTime } from '../utils/date';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderSourceBadge(source?: string | null) {
  const s = (source || 'bmk_system').toLowerCase();
  if (s.includes('hr tp bank') || s.includes('hr tpbank') || s.includes('hr_tpbank')) {
    return (
      <span className="inline-block rounded-full bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 text-[10px] font-semibold">
        HR TP Bank
      </span>
    );
  }
  if (s.includes('tpbank') || s.includes('tp_bank') || s.includes('tp bank')) {
    return (
      <span className="inline-block rounded-full bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 text-[10px] font-semibold">
        TP Bank
      </span>
    );
  }
  if (s.includes('bmk_hr') || s.includes('hr')) {
    return (
      <span className="inline-block rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold">
        HR BMK
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
      Hệ thống BMK
    </span>
  );
}

type ReconciliationTabKey = 'list' | 'history';

export default function ReconciliationPage() {
  const [activeTab, setActiveTab] = useState<ReconciliationTabKey>('list');
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [importingHrBmk, setImportingHrBmk] = useState(false);
  const [importingHrTpBank, setImportingHrTpBank] = useState(false);
  const [reconcilingTpBank, setReconcilingTpBank] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tpbankFileInputRef = useRef<HTMLInputElement>(null);
  const hrTpBankFileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('all');
  const [createdSource, setCreatedSource] = useState('all');
  const [isSyncedFilter, setIsSyncedFilter] = useState('all');
  const [resultStatusFilter, setResultStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  // Selected contracts modal
  const [selectedContracts, setSelectedContracts] = useState<{
    employeeCode: string;
    fullName: string;
    contracts: TpBankContractItem[];
  } | null>(null);

  // History Tab State
  const [historyRecords, setHistoryRecords] = useState<ReconciliationHistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize] = useState(20);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [downloadingHistoryId, setDownloadingHistoryId] = useState<string | null>(null);
  const [downloadingResultId, setDownloadingResultId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [keyword, employmentStatus, createdSource, isSyncedFilter, resultStatusFilter, page, pageSize]);

  useEffect(() => {
    loadHistory();
  }, [historyPage, historyPageSize]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await listReconciliationHistory(historyPage, historyPageSize);
      setHistoryRecords(res.items);
      setHistoryTotal(res.total);
      setHistoryTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error fetching reconciliation history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function handleDownloadHistory(id: string, filename: string) {
    if (downloadingHistoryId) return;
    setDownloadingHistoryId(id);
    try {
      await downloadReconciliationHistoryFile(id, filename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloadingHistoryId(null);
    }
  }

  async function handleDownloadResult(id: string, filename: string) {
    if (downloadingResultId) return;
    setDownloadingResultId(id);
    try {
      await downloadReconciliationResultFile(id, filename);
    } catch (err) {
      console.error('Download result failed:', err);
    } finally {
      setDownloadingResultId(null);
    }
  }

  async function loadData() {
    setLoading(true);
    try {
      const res = await listReconciliations({
        keyword: keyword.trim() || undefined,
        employment_status: employmentStatus,
        created_source: createdSource,
        is_synced: isSyncedFilter,
        result_status: resultStatusFilter,
        page,
        page_size: pageSize,
      });
      setRecords(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error('Error fetching reconciliation list:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSyncSystemInfo() {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncBmkSystemInfo();
      setSyncMessage(res.message);
      await loadData();
    } catch (err) {
      setSyncMessage('Đồng bộ thất bại: Đã có lỗi xảy ra');
    } finally {
      setSyncing(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingHrBmk(true);
    setSyncMessage(null);
    try {
      const res = await importHrBmkFile(file);
      setSyncMessage(res.message);
      await loadData();
    } catch (err: any) {
      setSyncMessage(`Import HR BMK thất bại: ${err.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setImportingHrBmk(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleTpBankFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReconcilingTpBank(true);
    setSyncMessage(null);
    try {
      const res = await reconcileTpBankFile(file);
      setSyncMessage(res.message);
      await loadData();
      if (activeTab === 'history') {
        await loadHistory();
      }
    } catch (err: any) {
      setSyncMessage(`Đối soát TP Bank thất bại: ${err.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setReconcilingTpBank(false);
      if (tpbankFileInputRef.current) {
        tpbankFileInputRef.current.value = '';
      }
    }
  }

  async function handleHrTpBankFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportingHrTpBank(true);
    setSyncMessage(null);
    try {
      const res = await importHrTpBankFile(file);
      setSyncMessage(res.message);
      await loadData();
    } catch (err: any) {
      setSyncMessage(`Import HĐ TP Bank thất bại: ${err.message || 'Đã có lỗi xảy ra'}`);
    } finally {
      setImportingHrTpBank(false);
      if (hrTpBankFileInputRef.current) {
        hrTpBankFileInputRef.current.value = '';
      }
    }
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Đối soát cộng tác viên</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp và đối chiếu thông tin CTV giữa ngân hàng TP Bank, Nhân sự BMK và Hệ thống BMK
          </p>
        </div>

        {activeTab === 'list' && (
          <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            ref={tpbankFileInputRef}
            onChange={handleTpBankFileChange}
            accept=".xlsx,.xlsm"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => tpbankFileInputRef.current?.click()}
            disabled={reconcilingTpBank}
            className="btn-primary px-4 py-2 text-xs flex items-center gap-2 border-purple-600 bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
            title="Upload file Excel Đối soát TP Bank"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 ${reconcilingTpBank ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {reconcilingTpBank ? 'Đang đối soát...' : 'Đối soát'}
          </button>

          <input
            type="file"
            ref={hrTpBankFileInputRef}
            onChange={handleHrTpBankFileChange}
            accept=".xlsx,.xlsm"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => hrTpBankFileInputRef.current?.click()}
            disabled={importingHrTpBank}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-2 border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100"
            title="Upload file Excel SL Hợp đồng TP Bank (template_ctv_hr_tpbank.xlsx)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 ${importingHrTpBank ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            {importingHrTpBank ? 'Đang nhập...' : 'Import HĐ TP Bank'}
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx,.xlsm"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importingHrBmk}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-2 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
            title="Upload file Excel dữ liệu HR BMK vào hệ thống đối soát"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 ${importingHrBmk ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
              />
            </svg>
            {importingHrBmk ? 'Đang nhập...' : 'Import HR BMK'}
          </button>

          <button
            type="button"
            onClick={handleSyncSystemInfo}
            disabled={syncing}
            className="btn-secondary px-4 py-2 text-xs flex items-center gap-2"
            title="Cập nhật số lượng hồ sơ từ bmk_ctv_collaborators vào dữ liệu đối soát"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            {syncing ? 'Đang đồng bộ...' : 'Đồng bộ hệ thống BMK'}
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="btn-primary px-4 py-2 text-xs"
          >
            Làm mới
          </button>
        </div>
        )}

        {activeTab === 'history' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={reconcilingTpBank}
              onClick={() => tpbankFileInputRef.current?.click()}
              className="btn-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`h-4 w-4 ${reconcilingTpBank ? 'animate-spin' : ''}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                />
              </svg>
              {reconcilingTpBank ? 'Đang đối soát...' : 'Đối soát'}
            </button>

            <button
              type="button"
              onClick={loadHistory}
              disabled={historyLoading}
              className="btn-secondary px-4 py-2 text-xs flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`}
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
        )}
      </div>

      {/* Tab Navigation */}
      <div className="mt-4 border-b border-border-subtle/60">
        <nav className="flex gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'list'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm0 5.25h.007v.008H3.75V12Zm0 5.25h.007v.008H3.75v-.008Z"
              />
            </svg>
            Danh sách
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`-mb-px border-b-2 px-1 pb-3 text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-500 hover:text-slate-700'
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

      {activeTab === 'list' && (
        <>


      {/* Sync Status Alert */}
      {syncMessage && (
        <div className="mt-4 rounded-xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm text-accent flex items-center justify-between">
          <span>{syncMessage}</span>
          <button
            type="button"
            onClick={() => setSyncMessage(null)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-border-subtle/60 bg-white p-4 shadow-card">
        <div className="min-w-[240px] flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo mã NV, họ tên, CCCD, đơn vị, chức danh..."
            className="input text-xs"
          />
        </div>

        <select
          value={employmentStatus}
          onChange={(e) => {
            setEmploymentStatus(e.target.value);
            setPage(1);
          }}
          className="input w-auto text-xs"
        >
          <option value="all">Tất cả tình trạng nhân sự</option>
          <option value="Hiện diện">Hiện diện</option>
          <option value="Nghỉ việc">Nghỉ việc</option>
        </select>

        <select
          value={createdSource}
          onChange={(e) => {
            setCreatedSource(e.target.value);
            setPage(1);
          }}
          className="input w-auto text-xs"
        >
          <option value="all">Tất cả nguồn tạo</option>
          <option value="bmk_system">Hệ thống BMK</option>
          <option value="bmk_hr">HR BMK</option>
          <option value="hr_tpbank">HR TP Bank</option>
          <option value="tpbank">TP Bank</option>
        </select>

        <select
          value={isSyncedFilter}
          onChange={(e) => {
            setIsSyncedFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto text-xs"
        >
          <option value="all">Tất cả trạng thái đối soát</option>
          <option value="synced">Đã đối soát</option>
          <option value="unsynced">Chưa đối soát</option>
        </select>

        <select
          value={resultStatusFilter}
          onChange={(e) => {
            setResultStatusFilter(e.target.value);
            setPage(1);
          }}
          className="input w-auto text-xs"
        >
          <option value="all">Tất cả kết quả đối soát</option>
          <option value="match_all">Khớp tất cả</option>
          <option value="warn_bank_contract">SL HĐ lệch với bank</option>
          <option value="mismatch_contract">Lệch SL HĐ</option>
          <option value="mismatch_idcard">Lệch CCCD</option>
          <option value="mismatch_liquidation">Lệch BBTL</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          className="input w-auto text-xs"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} dòng / trang
            </option>
          ))}
        </select>
      </div>

      {/* Main Reconciliation Table */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-border-subtle/60 bg-white shadow-card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border-subtle/60 text-xs text-left">
            {/* Header Tier 1: Categories */}
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
              <tr>
                <th colSpan={5} className="px-3 py-2.5 text-center border-r border-border-subtle/80 bg-slate-100/70">
                  Thông tin nhân sự
                </th>
                <th colSpan={2} className="px-3 py-2.5 text-center border-r border-border-subtle/80 bg-sky-50/80 text-sky-900">
                  Nhân sự TP Bank
                </th>
                <th colSpan={3} className="px-3 py-2.5 text-center border-r border-border-subtle/80 bg-amber-50/80 text-amber-900">
                  Nhân sự BMK
                </th>
                <th colSpan={3} className="px-3 py-2.5 text-center border-r border-border-subtle/80 bg-emerald-50/80 text-emerald-900">
                  Hệ thống BMK
                </th>
                <th colSpan={3} className="px-3 py-2.5 text-center bg-purple-50/80 text-purple-900">
                  Kết quả đối soát
                </th>
              </tr>
              {/* Header Tier 2: Sub-columns */}
              <tr className="border-t border-border-subtle/80 bg-page/80 text-[11px] text-slate-600">
                {/* Thông tin nhân sự */}
                <th className="px-3 py-2 whitespace-nowrap">Mã NV</th>
                <th className="px-3 py-2 whitespace-nowrap">Họ và tên</th>
                <th className="px-3 py-2 whitespace-nowrap text-center">Nguồn tạo</th>
                <th className="px-3 py-2 whitespace-nowrap">Tình trạng</th>
                <th className="px-3 py-2 whitespace-nowrap border-r border-border-subtle/80">Ngày vào / nghỉ</th>

                {/* TP Bank */}
                <th className="px-3 py-2 whitespace-nowrap text-center" title="Số lượng Hợp đồng dịch vụ dự tính theo quy tắc đối soát TP Bank">Est.HĐ</th>
                <th className="px-3 py-2 whitespace-nowrap text-center border-r border-border-subtle/80" title="Số lượng Hợp đồng theo file HR TP Bank cung cấp">HR.HĐ</th>

                {/* Nhân sự BMK */}
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Số lượng Hợp đồng dịch vụ">SL HĐ</th>
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Số lượng CCCD">CCCD</th>
                <th className="px-2 py-2 text-center whitespace-nowrap border-r border-border-subtle/80" title="Số lượng Biên bản thanh lý">BBTL</th>

                {/* Hệ thống BMK */}
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Số lượng Hợp đồng dịch vụ trên hệ thống">SL HĐ</th>
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Số lượng CCCD trên hệ thống">CCCD</th>
                <th className="px-2 py-2 text-center whitespace-nowrap border-r border-border-subtle/80" title="Số lượng Biên bản thanh lý trên hệ thống">BBTL</th>

                {/* Kết quả đối soát */}
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Kết quả đối soát Số lượng Hợp đồng">SL HĐ</th>
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Kết quả đối soát CCCD">CCCD</th>
                <th className="px-2 py-2 text-center whitespace-nowrap" title="Kết quả đối soát Biên bản thanh lý">BBTL</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border-subtle/60 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={16} className="p-8 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <span>Đang tải danh sách đối soát...</span>
                    </div>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={16} className="p-12 text-center text-slate-500">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có dữ liệu đối soát phù hợp</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Nhấn "Đồng bộ hệ thống BMK" để nạp danh sách CTV từ hệ thống hoặc điều chỉnh bộ lọc.
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  const contracts = r.tpbankInfo?.contracts || [];

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Nhân sự */}
                      <td className="px-3 py-2.5 font-mono text-slate-800 whitespace-nowrap">
                        <div className="font-bold">{r.employeeCode}</div>
                        {r.isSynced ? (
                          <span className="inline-block rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-semibold mt-0.5">
                            Đã đối soát
                          </span>
                        ) : (
                          <span className="inline-block rounded bg-slate-100 text-slate-400 border border-slate-200 px-1.5 py-0.2 text-[9px] font-semibold mt-0.5">
                            Chưa đối soát
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        <div>{r.fullName || '—'}</div>
                        {r.idNumber && (
                          <div className="text-[11px] font-mono font-normal text-slate-400">
                            CCCD: {r.idNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        {renderSourceBadge(r.createdSource)}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.employmentStatus === 'Nghỉ việc'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                        >
                          {r.employmentStatus || 'Hiện diện'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap border-r border-border-subtle/80 font-mono text-[11px]">
                        <div>Vào: {formatDate(r.onboardDate)}</div>
                        {r.offboardDate && <div className="text-danger">Nghỉ: {formatDate(r.offboardDate)}</div>}
                      </td>

                      {/* TP Bank */}
                      <td className="px-3 py-2.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {!r.onboardDate || r.tpbankInfo?.estimatedContractCount === null || r.tpbankInfo?.estimatedContractCount === undefined ? (
                            <span className="text-slate-400 font-sans text-[11px] italic">Chưa có thông tin</span>
                          ) : (
                            <span
                              className="inline-block rounded-full bg-purple-100 text-purple-800 font-bold px-2 py-0.5 text-[11px]"
                              title="Số hợp đồng dự tính theo quy tắc đối soát TP Bank"
                            >
                              {r.tpbankInfo.estimatedContractCount} HĐ
                            </span>
                          )}
                          {contracts.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedContracts({
                                  employeeCode: r.employeeCode,
                                  fullName: r.fullName,
                                  contracts,
                                })
                              }
                              className="inline-flex items-center justify-center rounded bg-sky-50 text-sky-700 font-medium px-1.5 py-0.5 text-[10px] hover:bg-sky-100 cursor-pointer"
                              title="Xem chi tiết danh sách hợp đồng TP Bank"
                            >
                              {contracts.length} chi tiết &rarr;
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono font-semibold text-slate-700 whitespace-nowrap border-r border-border-subtle/80">
                        {r.tpbankInfo?.hrContractCount !== null && r.tpbankInfo?.hrContractCount !== undefined ? (
                          <CountBadge count={r.tpbankInfo.hrContractCount} />
                        ) : (
                          <span className="text-slate-400 font-sans text-[11px] italic">—</span>
                        )}
                      </td>

                      {/* Nhân sự BMK */}
                      <td className="px-2 py-2.5 text-center font-mono font-semibold text-slate-700">
                        <CountBadge count={r.bmkHrInfo?.contractCount || 0} />
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-semibold text-slate-700">
                        <CountBadge count={r.bmkHrInfo?.idCardCount || 0} />
                      </td>
                      <td className="px-2 py-2.5 text-center font-mono font-semibold text-slate-700 border-r border-border-subtle/80">
                        <CountBadge count={r.bmkHrInfo?.liquidationCount || 0} />
                      </td>

                      {/* Hệ thống BMK */}
                      {r.isBmkSystemExist === false ? (
                        <td colSpan={3} className="px-2 py-2.5 text-center font-sans text-[11px] text-rose-500 font-medium bg-rose-50/30 border-r border-border-subtle/80">
                          Nhân viên không tồn tại
                        </td>
                      ) : (
                        <>
                          <td className="px-2 py-2.5 text-center font-mono font-semibold text-emerald-700">
                            <CountBadge count={r.bmkSystemInfo?.contractCount || 0} variant="success" />
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-semibold text-emerald-700">
                            <CountBadge count={r.bmkSystemInfo?.idCardCount || 0} variant="success" />
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-semibold text-emerald-700 border-r border-border-subtle/80">
                            <CountBadge count={r.bmkSystemInfo?.liquidationCount || 0} variant="success" />
                          </td>
                        </>
                      )}

                      {/* Kết quả đối soát */}
                      <td className="px-2 py-2.5 text-center">
                        <ResultBadge status={r.result?.contract} />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <ResultBadge status={r.result?.idCard} />
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        <ResultBadge status={r.result?.liquidation} />
                      </td>
                    </tr>
                  );
                })
              )}
          </tbody>
        </table>
      </div>

      {/* Footer & Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle/60 p-4">
        <p className="text-xs text-slate-500">
          Hiển thị <span className="font-semibold text-slate-800">{records.length}</span> /{' '}
          <span className="font-semibold text-slate-800">{total}</span> cộng tác viên đối soát
        </p>

        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
        </>
      )}

      {/* Tab: Lịch sử */}
      {activeTab === 'history' && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-border-subtle/60 bg-white shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle/60 text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-3 whitespace-nowrap text-center">STT</th>
                  <th className="px-3 py-3 whitespace-nowrap">Thời gian upload</th>
                  <th className="px-3 py-3 whitespace-nowrap">Người thực hiện</th>
                  <th className="px-3 py-3 whitespace-nowrap">Tệp đối soát</th>
                  <th className="px-3 py-3 whitespace-nowrap text-center border-r border-border-subtle/80">Xử lý dòng</th>
                  <th colSpan={5} className="px-3 py-2.5 text-center bg-purple-50/80 text-purple-900 border-b border-border-subtle/80">
                    Kết quả đối soát tổng hợp
                  </th>
                </tr>
                <tr className="border-t border-border-subtle/80 bg-page/80 text-[11px] text-slate-600">
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2 border-r border-border-subtle/80"></th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap text-emerald-700" title="Số lượng CTV khớp cả 3 điều kiện (SL HĐ, BBTL, CCCD)">Hợp lệ</th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap text-amber-700" title="Số lượng CTV có SL HĐ lệch với bank (Cảnh báo)">Lệch Bank</th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap text-rose-700" title="Số lượng CTV lệch SL HĐ">Lệch SL HĐ</th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap text-rose-700" title="Số lượng CTV lệch CCCD">Lệch CCCD</th>
                  <th className="px-2.5 py-2 text-center whitespace-nowrap text-rose-700" title="Số lượng CTV lệch Biên bản thanh lý">Lệch BBTL</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border-subtle/60 bg-white">
                {historyLoading ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span>Đang tải lịch sử đối soát...</span>
                      </div>
                    </td>
                  </tr>
                ) : historyRecords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-slate-500">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700">Chưa có lịch sử đối soát</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Các phiên chạy file Đối soát TP Bank sẽ được lưu lại tự động tại đây.
                      </p>
                    </td>
                  </tr>
                ) : (
                  historyRecords.map((item, idx) => {
                    const stt = (historyPage - 1) * historyPageSize + idx + 1;
                    const stats = item.stats || {
                      totalSuccess: 0,
                      totalWarnBank: 0,
                      totalMismatchContract: 0,
                      totalMismatchIdCard: 0,
                      totalMismatchLiquidation: 0,
                    };

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-3 text-center font-mono text-slate-500 whitespace-nowrap">
                          {stt}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap font-mono text-slate-700">
                          <div className="font-semibold text-slate-900">{formatDateTime(item.createdAt)}</div>
                          <div className="text-[10px] text-slate-400 font-sans">{formatRelativeTime(item.createdAt)}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="font-medium text-slate-900">{item.uploadedBy || '—'}</div>
                          <div className="text-[11px] font-mono text-slate-400">@{item.username}</div>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            {/* File gốc */}
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                Gốc
                              </span>
                              <span className="font-medium text-slate-800 max-w-[170px] truncate" title={item.filename}>
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
                                  title="Tải file đối soát gốc"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
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
                                <span className="font-medium text-slate-800 max-w-[170px] truncate" title={item.resultFile.filename}>
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
                                  onClick={() => handleDownloadResult(item.id, item.resultFile?.filename || 'ket_qua_doi_soat.xlsx')}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer disabled:opacity-50 ml-1 shrink-0"
                                  title="Tải file kết quả đối soát"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="h-3.5 w-3.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
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
                        <td className="px-3 py-3 text-center whitespace-nowrap border-r border-border-subtle/80">
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono font-bold text-slate-800">
                              {item.successRows} / {item.totalRows}
                            </span>
                            {item.failedRows > 0 ? (
                              <span className="text-[10px] text-rose-500 font-medium">
                                Lỗi: {item.failedRows} dòng
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-medium">
                                100% hợp lệ
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Thống kê kết quả đối soát */}
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold">
                            ✓ {stats.totalSuccess}
                          </span>
                        </td>
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          {stats.totalWarnBank > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 px-2 py-0.5 text-[11px] font-bold">
                              ⚠ {stats.totalWarnBank}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">0</span>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          {stats.totalMismatchContract > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-bold">
                              ✕ {stats.totalMismatchContract}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">0</span>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          {stats.totalMismatchIdCard > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-bold">
                              ✕ {stats.totalMismatchIdCard}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">0</span>
                          )}
                        </td>
                        <td className="px-2.5 py-3 text-center whitespace-nowrap">
                          {stats.totalMismatchLiquidation > 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 text-[11px] font-bold">
                              ✕ {stats.totalMismatchLiquidation}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer & Pagination cho tab Lịch sử */}
          {historyTotal > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle/60 p-4">
              <p className="text-xs text-slate-500">
                Hiển thị <span className="font-semibold text-slate-800">{historyRecords.length}</span> /{' '}
                <span className="font-semibold text-slate-800">{historyTotal}</span> phiên đối soát
              </p>
              <Pagination page={historyPage} totalPages={historyTotalPages} onPageChange={setHistoryPage} />
            </div>
          )}
        </div>
      )}

      {/* Modal: View Details of TP Bank Contracts */ }
  {
    selectedContracts && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Danh sách hợp đồng TP Bank</h3>
              <p className="text-xs text-slate-500 font-mono">
                CTV: {selectedContracts.fullName} ({selectedContracts.employeeCode})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedContracts(null)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {selectedContracts.contracts.map((c, idx) => (
              <div key={idx} className="rounded-xl border border-border-subtle/80 bg-slate-50 p-3.5 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    #{idx + 1}. {c.contractNumber || 'Chưa có số HĐ'}
                  </span>
                  {c.status && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                      {c.status}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>
                    <span className="text-slate-400">Hiệu lực: </span>
                    <span className="font-mono">{formatDate(c.effectiveDate)}</span> &rarr;{' '}
                    <span className="font-mono">{formatDate(c.expiryDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Kỳ / Năm: </span>
                    <span className="font-mono">{c.period || '—'} / {c.year || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">HRBP: </span>
                    <span className="font-mono font-semibold">{c.hrbp || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Ghi chú: </span>
                    <span>{c.note || '—'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedContracts(null)}
              className="btn-secondary px-4 py-1.5 text-xs"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }
    </Layout >
  );
}

function CountBadge({ count, variant = 'default' }: { count: number; variant?: 'default' | 'success' }) {
  if (count === 0) {
    return <span className="text-slate-300 font-mono">0</span>;
  }
  const color =
    variant === 'success'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-slate-100 text-slate-800';

  return (
    <span className={`inline-block min-w-[20px] rounded px-1 py-0.5 text-[11px] font-bold ${color}`}>
      {count}
    </span>
  );
}

function ResultBadge({ status }: { status?: string | null }) {
  if (!status) {
    return <span className="text-slate-300 font-mono">—</span>;
  }
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold">
        ✓ Khớp
      </span>
    );
  }
  if (status === 'warn') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded bg-amber-50 text-amber-700 border border-amber-300 px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
        title="Cảnh báo: Số lượng HĐ dự tính lệch với số lượng HĐ từ file HR TP Bank"
      >
        ⚠ Lệch Bank
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.5 text-[10px] font-semibold">
        ✕ Lệch
      </span>
    );
  }
  return <span className="text-slate-400 font-mono text-[10px]">{status}</span>;
}
