import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ConfirmModal from '../components/ConfirmModal';
import CollaboratorMonthlyCountBarChart from '../components/charts/CollaboratorMonthlyCountBarChart';
import PaymentMonthlyAmountBarChart from '../components/charts/PaymentMonthlyAmountBarChart';
import {
  downloadExpenseTemplate,
  exportExpenseData,
  getExpenseStats,
  importExpenseFile,
  listExpenseCollaborators,
  listExpenseDetails,
  listExpenseLocations,
  listExpensePeriods,
} from '../services/api/expenses';
import type {
  CollaboratorExpenseSummary,
  ExpenseDetailItem,
  ExpenseStatsResponse,
} from '../types/expense';
import { formatDate } from '../utils/date';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

function formatVND(value: number): string {
  return `${Math.round(value).toLocaleString('vi-VN')} ₫`;
}

function formatPeriodBadge(period: string): string {
  if (period.length === 6 && !Number.isNaN(Number(period))) {
    return `${period.slice(4)}/${period.slice(0, 4)}`;
  }
  return period;
}

export default function CollaboratorExpensesPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const [dataMenuOpen, setDataMenuOpen] = useState<boolean>(false);

  // Active Tab: 'details' (Chi tiết thanh toán) hoặc 'collaborators' (Tổng hợp theo CTV)
  const [activeTab, setActiveTab] = useState<'details' | 'collaborators'>('details');

  // Stats state
  const [stats, setStats] = useState<ExpenseStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);

  // Filter options
  const [periods, setPeriods] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Table Details state
  const [details, setDetails] = useState<ExpenseDetailItem[]>([]);
  const [detailsTotal, setDetailsTotal] = useState<number>(0);
  const [detailsTotalPages, setDetailsTotalPages] = useState<number>(1);
  const [detailsPage, setDetailsPage] = useState<number>(1);
  const [detailsPageSize, setDetailsPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

  // Table Collaborators state
  const [collabs, setCollabs] = useState<CollaboratorExpenseSummary[]>([]);
  const [collabsTotal, setCollabsTotal] = useState<number>(0);
  const [collabsTotalPages, setCollabsTotalPages] = useState<number>(1);
  const [collabsPage, setCollabsPage] = useState<number>(1);
  const [collabsPageSize, setCollabsPageSize] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [collabsLoading, setCollabsLoading] = useState<boolean>(false);

  // Import & Confirm Modal states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Fetch filter options (periods & locations)
  const loadFilters = useCallback(async () => {
    try {
      const [periodsRes, locationsRes] = await Promise.all([
        listExpensePeriods(),
        listExpenseLocations(),
      ]);
      setPeriods(periodsRes.periods || []);
      setLocations(locationsRes.locations || []);
    } catch {
      // Ignored
    }
  }, []);

  // Fetch stats for charts & KPI cards
  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await getExpenseStats();
      setStats(res);
    } catch {
      // Ignored
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch details list
  const loadDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await listExpenseDetails({
        page: detailsPage,
        pageSize: detailsPageSize,
        search: searchKeyword,
        period: selectedPeriod,
        workLocation: selectedLocation,
      });
      setDetails(res.items || []);
      setDetailsTotal(res.total || 0);
      setDetailsTotalPages(res.total_pages || 1);
    } catch {
      setDetails([]);
      setDetailsTotal(0);
    } finally {
      setDetailsLoading(false);
    }
  }, [detailsPage, detailsPageSize, searchKeyword, selectedPeriod, selectedLocation]);

  // Fetch collaborators summary list
  const loadCollabs = useCallback(async () => {
    setCollabsLoading(true);
    try {
      const res = await listExpenseCollaborators({
        page: collabsPage,
        pageSize: collabsPageSize,
        search: searchKeyword,
      });
      setCollabs(res.items || []);
      setCollabsTotal(res.total || 0);
      setCollabsTotalPages(res.total_pages || 1);
    } catch {
      setCollabs([]);
      setCollabsTotal(0);
    } finally {
      setCollabsLoading(false);
    }
  }, [collabsPage, collabsPageSize, searchKeyword]);

  // Close data dropdown menu on click outside or ESC
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(event.target as Node)) {
        setDataMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setDataMenuOpen(false);
      }
    }
    if (dataMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dataMenuOpen]);

  // Initial load
  useEffect(() => {
    loadFilters();
    loadStats();
  }, [loadFilters, loadStats]);

  useEffect(() => {
    if (activeTab === 'details') {
      loadDetails();
    } else {
      loadCollabs();
    }
  }, [activeTab, loadDetails, loadCollabs]);

  // Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(searchInput.trim());
    if (activeTab === 'details') {
      setDetailsPage(1);
    } else {
      setCollabsPage(1);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearchInput('');
    setSearchKeyword('');
    setSelectedPeriod('');
    setSelectedLocation('');
    setDetailsPage(1);
    setCollabsPage(1);
  };

  // Trigger file picker
  const handleImportButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // When file is picked, show confirm modal
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setShowConfirmModal(true);
    }
  };

  // Perform upload after user confirms
  const handleConfirmImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setActionMessage(null);
    try {
      const res = await importExpenseFile(selectedFile);
      setActionMessage({
        text: res.message,
        type: 'success',
      });
      setShowConfirmModal(false);
      setSelectedFile(null);
      // Reload stats, filters, and list
      await Promise.all([loadStats(), loadFilters()]);
      if (activeTab === 'details') {
        loadDetails();
      } else {
        loadCollabs();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tải lên dữ liệu thanh toán thất bại';
      setActionMessage({
        text: msg,
        type: 'error',
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Download template
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadExpenseTemplate();
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Tải file mẫu thất bại',
        type: 'error',
      });
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Export list
  const handleExport = async (mode: 'details' | 'collaborators' = activeTab) => {
    setIsExporting(true);
    try {
      await exportExpenseData({
        mode,
        period: selectedPeriod,
        workLocation: selectedLocation,
        search: searchKeyword,
      });
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Xuất dữ liệu thất bại',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Filter directly by collaborator code from table
  const handleFilterByCollaborator = (code: string) => {
    setSearchInput(code);
    setSearchKeyword(code);
    setActiveTab('details');
    setDetailsPage(1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6H2.25m0 0v1.5a.75.75 0 00.75.75H4.5m-2.25-2.25h1.5a.75.75 0 01.75.75v1.5m0-3a.75.75 0 00-.75-.75H2.25m19.5 3a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5m-3 0a.75.75 0 00.75.75h1.5a.75.75 0 00.75-.75v-1.5m-3 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5m-9 3.75h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z"
                  />
                </svg>
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Quản lý chi phí cộng tác viên
              </h1>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Theo dõi chi phí thanh toán hàng tháng, thực lĩnh, thuế TNCN và đồng bộ dữ liệu đối soát CTV
            </p>
          </div>

          {/* Dropdown Button "Dữ liệu" */}
          <div className="relative" ref={dataMenuRef}>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm"
              className="hidden"
              onChange={handleFileChange}
            />

            <button
              type="button"
              onClick={() => setDataMenuOpen((prev) => !prev)}
              aria-expanded={dataMenuOpen}
              className={`rounded-full px-4 py-2 flex items-center gap-2.5 font-semibold text-xs sm:text-sm transition-all border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 shadow-xs cursor-pointer ${
                dataMenuOpen ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm ring-2 ring-amber-300/40' : ''
              }`}
            >
              <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Dữ liệu</span>
              {(isExporting || isImporting || isDownloadingTemplate) && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
                </span>
              )}
              <svg
                className={`w-3.5 h-3.5 text-amber-700 transition-transform duration-200 ${dataMenuOpen ? 'rotate-180 text-amber-900' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown Menu Popover matching user reference */}
            {dataMenuOpen && (
              <div className="absolute right-0 mt-2 z-40 w-[340px] sm:w-[460px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Thao tác dữ liệu</h3>
                    <p className="text-xs text-slate-400">Nhập, xuất hoặc đối soát chi phí cộng tác viên</p>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 tracking-wider">
                    BMK · CTV
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Nhóm 1: Nhập dữ liệu */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                        NHẬP DỮ LIỆU
                      </span>
                    </div>
                    <div className="flex items-start gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleImportButtonClick();
                        }}
                        disabled={isImporting}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {isImporting ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-accent leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {isImporting ? 'Đang nhập...' : 'Nhập dữ liệu'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Nhóm 2: Xuất dữ liệu */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                        XUẤT DỮ LIỆU
                      </span>
                    </div>
                    <div className="flex items-start gap-2 flex-wrap">
                      {/* Item 1: Tải file mẫu */}
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleDownloadTemplate();
                        }}
                        disabled={isDownloadingTemplate}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-violet-50 text-violet-600 border border-violet-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-accent leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {isDownloadingTemplate ? 'Đang tải...' : 'Tải file mẫu nhập dữ liệu'}
                        </span>
                      </button>

                      {/* Item 2: Xuất chi tiết thanh toán */}
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleExport('details');
                        }}
                        disabled={isExporting}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-600 border border-rose-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {isExporting ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-accent leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {isExporting ? 'Đang xuất...' : 'Xuất chi tiết thanh toán'}
                        </span>
                      </button>

                      {/* Item 3: Xuất tổng hợp CTV */}
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleExport('collaborators');
                        }}
                        disabled={isExporting}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-600 border border-amber-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-accent leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          Xuất tổng hợp CTV
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Message Banner */}
        {actionMessage && (
          <div
            className={`flex items-start justify-between rounded-xl p-4 text-xs sm:text-sm border transition-all animate-in fade-in duration-200 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : actionMessage.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 flex-shrink-0 text-emerald-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 flex-shrink-0 text-rose-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Tổng thực lĩnh */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Tổng thực lĩnh BMK đã TT
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                {statsLoading ? '...' : formatVND(stats?.totalPaidAmount || 0)}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tổng số tiền thực chuyển tới CTV
              </p>
            </div>
          </div>

          {/* Card 2: Thu nhập chịu thuế & Thuế TNCN */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Thuế TNCN đã khấu trừ
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V3.757c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927 0C9.697 1.7 10.5 2.648 10.5 3.757v.493"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600">
                {statsLoading ? '...' : formatVND(stats?.totalTaxAmount || 0)}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tổng TN: {formatVND(stats?.totalTaxableAmount || 0)}
              </p>
            </div>
          </div>

          {/* Card 3: Tổng số CTV đã nhận thanh toán */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Cộng tác viên nhận tiền
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                {statsLoading ? '...' : (stats?.totalCollaborators || 0).toLocaleString('vi-VN')}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Tổng {stats?.totalPaymentTransactions || 0} lượt giao dịch
              </p>
            </div>
          </div>

          {/* Card 4: Kỳ thanh toán gần nhất */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Kỳ thanh toán gần nhất
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900">
                {stats?.latestPeriod ? formatPeriodBadge(stats.latestPeriod) : '—'}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {periods.length} kỳ thanh toán đã lưu
              </p>
            </div>
          </div>
        </div>

        {/* 2 Charts in a 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <CollaboratorMonthlyCountBarChart
              data={stats?.collaboratorCountsByMonth || []}
              totalCollaborators={stats?.totalCollaborators || 0}
              loading={statsLoading}
            />
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <PaymentMonthlyAmountBarChart
              data={stats?.paymentAmountsByMonth || []}
              totalPaidAmount={stats?.totalPaidAmount || 0}
              loading={statsLoading}
            />
          </div>
        </div>

        {/* Table & Filter Section */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          {/* Tabs and Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 p-4 gap-4">
            {/* Tab switchers */}
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('details');
                  setDetailsPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'details'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chi tiết thanh toán ({detailsTotal.toLocaleString('vi-VN')})
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('collaborators');
                  setCollabsPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'collaborators'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tổng hợp theo CTV ({collabsTotal.toLocaleString('vi-VN')})
              </button>
            </div>

            {/* Filter form */}
            <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
              {/* Search input */}
              <div className="relative min-w-[200px]">
                <input
                  type="text"
                  placeholder="Mã CTV, tên, MST..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-accent focus:bg-white focus:outline-hidden"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>

              {/* Period dropdown (only for details tab) */}
              {activeTab === 'details' && (
                <select
                  value={selectedPeriod}
                  onChange={(e) => {
                    setSelectedPeriod(e.target.value);
                    setDetailsPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 text-xs text-slate-800 focus:border-accent focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Tất cả kỳ TT</option>
                  {periods.map((p) => (
                    <option key={p} value={p}>
                      Kỳ {formatPeriodBadge(p)}
                    </option>
                  ))}
                </select>
              )}

              {/* Location dropdown (only for details tab) */}
              {activeTab === 'details' && (
                <select
                  value={selectedLocation}
                  onChange={(e) => {
                    setSelectedLocation(e.target.value);
                    setDetailsPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 py-1.5 px-3 text-xs text-slate-800 focus:border-accent focus:bg-white focus:outline-hidden cursor-pointer"
                >
                  <option value="">Tất cả nơi làm việc</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              )}

              {/* Search button */}
              <button
                type="submit"
                className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition-all cursor-pointer"
              >
                Tìm kiếm
              </button>

              {/* Clear filters button */}
              {(searchKeyword || selectedPeriod || selectedLocation) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </form>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {activeTab === 'details' ? (
              /* TAB 1: CHI TIẾT THANH TOÁN */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">STT</th>
                    <th className="py-3 px-3">Mã CTV</th>
                    <th className="py-3 px-3">Họ và tên</th>
                    <th className="py-3 px-3">Mã số thuế</th>
                    <th className="py-3 px-3">TK Nhận lương</th>
                    <th className="py-3 px-3">Nơi làm việc</th>
                    <th className="py-3 px-3 text-right">Tổng TN chịu thuế</th>
                    <th className="py-3 px-3 text-right">Thuế TNCN</th>
                    <th className="py-3 px-3 text-right font-bold">Thực lĩnh</th>
                    <th className="py-3 px-3 text-center">Ngày BMK TT</th>
                    <th className="py-3 px-3 text-center">Kỳ TT</th>
                    <th className="py-3 px-3">Nội dung TT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailsLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          Đang tải dữ liệu chi tiết...
                        </div>
                      </td>
                    </tr>
                  ) : details.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        Không tìm thấy dữ liệu thanh toán nào
                      </td>
                    </tr>
                  ) : (
                    details.map((item, idx) => (
                      <tr
                        key={item.id || `${item.employeeCode}_${item.paymentDate}_${idx}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-3 text-center font-mono text-slate-400">
                          {(detailsPage - 1) * detailsPageSize + idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-accent whitespace-nowrap">
                          {item.employeeCode}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {item.fullName}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {item.taxCode || '—'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-mono text-slate-800">
                            {item.bankAccount?.accountNumber || '—'}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.bankAccount?.bankName || ''} {item.bankAccount?.accountName ? `(${item.bankAccount.accountName.trim()})` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                          {item.workLocation || '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                          {formatVND(item.taxableIncome)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                          {item.personalIncomeTax > 0 ? formatVND(item.personalIncomeTax) : '0 ₫'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                          {formatVND(item.netIncome)}
                        </td>
                        <td className="py-3 px-3 text-center font-mono whitespace-nowrap text-slate-700">
                          {formatDate(item.paymentDate)}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 border border-slate-200">
                            {formatPeriodBadge(item.period)}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[220px] truncate text-slate-500" title={item.paymentContent || ''}>
                          {item.paymentContent || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              /* TAB 2: TỔNG HỢP THEO CTV */
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3 px-4 text-center w-12">STT</th>
                    <th className="py-3 px-4">Mã CTV</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Mã số thuế</th>
                    <th className="py-3 px-4 text-center">Số lần nhận thanh toán</th>
                    <th className="py-3 px-4 text-center">Ngày TT gần nhất</th>
                    <th className="py-3 px-4 text-center">Kỳ gần nhất</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collabsLoading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          Đang tải danh sách tổng hợp...
                        </div>
                      </td>
                    </tr>
                  ) : collabs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Không tìm thấy cộng tác viên nào
                      </td>
                    </tr>
                  ) : (
                    collabs.map((collab, idx) => (
                      <tr
                        key={collab.id || collab.employeeCode}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                          {(collabsPage - 1) * collabsPageSize + idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-accent">
                          {collab.employeeCode}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">
                          {collab.fullName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          {collab.taxCode || '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-bold text-accent border border-emerald-200">
                            {collab.totalPaymentCount} lần
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {formatDate(collab.latestPaymentDate)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {collab.latestPeriod ? (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 border border-slate-200">
                              {formatPeriodBadge(collab.latestPeriod)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleFilterByCollaborator(collab.employeeCode)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-accent transition-all cursor-pointer"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="border-t border-slate-100 p-4 flex flex-wrap items-center justify-between gap-4 bg-slate-50/40">
            {activeTab === 'details' ? (
              <>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Hiển thị {detailsTotal > 0 ? (detailsPage - 1) * detailsPageSize + 1 : 0} -{' '}
                    {Math.min(detailsPage * detailsPageSize, detailsTotal)} /{' '}
                    <strong className="text-slate-800">{detailsTotal.toLocaleString('vi-VN')}</strong> bản ghi
                  </span>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <span>Hiển thị</span>
                    <select
                      value={detailsPageSize}
                      onChange={(e) => {
                        setDetailsPageSize(Number(e.target.value));
                        setDetailsPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <span>dòng/trang</span>
                  </div>
                </div>
                <Pagination
                  page={detailsPage}
                  totalPages={detailsTotalPages}
                  onPageChange={(p: number) => setDetailsPage(p)}
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>
                    Hiển thị {collabsTotal > 0 ? (collabsPage - 1) * collabsPageSize + 1 : 0} -{' '}
                    {Math.min(collabsPage * collabsPageSize, collabsTotal)} /{' '}
                    <strong className="text-slate-800">{collabsTotal.toLocaleString('vi-VN')}</strong> cộng tác viên
                  </span>
                  <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                    <span>Hiển thị</span>
                    <select
                      value={collabsPageSize}
                      onChange={(e) => {
                        setCollabsPageSize(Number(e.target.value));
                        setCollabsPage(1);
                      }}
                      className="rounded-lg border border-slate-200 bg-white py-1 px-2 text-xs text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      {PAGE_SIZE_OPTIONS.map((sz) => (
                        <option key={sz} value={sz}>
                          {sz}
                        </option>
                      ))}
                    </select>
                    <span>dòng/trang</span>
                  </div>
                </div>
                <Pagination
                  page={collabsPage}
                  totalPages={collabsTotalPages}
                  onPageChange={(p: number) => setCollabsPage(p)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL BEFORE IMPORT */}
      <ConfirmModal
        isOpen={showConfirmModal}
        title="Xác nhận Import dữ liệu thanh toán CTV"
        variant="primary"
        loading={isImporting}
        confirmLabel={isImporting ? 'Đang xử lý...' : 'Xác nhận Import'}
        cancelLabel="Hủy bỏ"
        onCancel={() => {
          if (!isImporting) {
            setShowConfirmModal(false);
            setSelectedFile(null);
          }
        }}
        onConfirm={handleConfirmImport}
        message={
          <div className="space-y-3">
            <p>
              Bạn đã chọn file:{' '}
              <strong className="text-slate-900 font-mono">
                {selectedFile?.name}
              </strong>{' '}
              ({selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}).
            </p>
            <p className="text-xs text-slate-600">
              Quy tắc thực hiện:
            </p>
            <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1">
              <li>
                Kiểm tra từng cộng tác viên trong danh sách đối soát (<code>bmk_ctv_reconciliations</code>). Nếu CTV chưa tồn tại, hệ thống sẽ tự động tạo mới hồ sơ cơ bản.
              </li>
              <li>
                Cập nhật chi tiết các khoản thanh toán vào collection chi phí hàng tháng (Unique key: Mã CTV + Ngày BMK thanh toán).
              </li>
              <li>
                Tính toán lại tổng số lần nhận thanh toán cho từng CTV.
              </li>
            </ul>
          </div>
        }
        note="Vui lòng đảm bảo các cột dữ liệu trong file khớp với mẫu import_thanh_toan_phi_CTV.xlsx trước khi tiến hành."
      />
    </Layout>
  );
}
