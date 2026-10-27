import { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import MonthPicker from '../components/MonthPicker';
import CollaboratorMonthlyCountBarChart from '../components/charts/CollaboratorMonthlyCountBarChart';
import PaymentMonthlyAmountBarChart from '../components/charts/PaymentMonthlyAmountBarChart';
import CollaboratorExpenseHistoryBarChart from '../components/charts/CollaboratorExpenseHistoryBarChart';
import {
  downloadExpenseTemplate,
  exportExpenseData,
  exportMonthlyExpenseData,
  getCollaboratorExpenseDetail,
  getExpenseStats,
  importExpenseFile,
  listExpenseCollaborators,
  listExpenseDetails,
  listExpenseLocations,
  listExpensePeriods,
} from '../services/api/expenses';
import type {
  CollaboratorExpenseDetailResponse,
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

  // Active Tab: 'collaborators' (Chi phí của CTV) hoặc 'details' (Chi tiết thanh toán)
  const [activeTab, setActiveTab] = useState<'details' | 'collaborators'>('collaborators');

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

  // Import Modal & Confirm states
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPeriod, setImportPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importDragActive, setImportDragActive] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [showExportDetailsModal, setShowExportDetailsModal] = useState<boolean>(false);
  const [exportDetailsMonth, setExportDetailsMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showYearExportModal, setShowYearExportModal] = useState<boolean>(false);
  const [exportYear, setExportYear] = useState<number>(() => new Date().getFullYear());
  const [isExportingMonthly, setIsExportingMonthly] = useState<boolean>(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [showWarningsModal, setShowWarningsModal] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);

  // Collaborator Detail Modal state
  const [showCollabDetailModal, setShowCollabDetailModal] = useState<boolean>(false);
  const [selectedCollabCode, setSelectedCollabCode] = useState<string | null>(null);
  const [collabDetailData, setCollabDetailData] = useState<CollaboratorExpenseDetailResponse | null>(null);
  const [collabDetailLoading, setCollabDetailLoading] = useState<boolean>(false);
  const [collabDetailError, setCollabDetailError] = useState<string | null>(null);

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

  // Trigger import modal
  const handleOpenImportModal = () => {
    if (selectedPeriod && selectedPeriod.length === 6) {
      setImportPeriod(`${selectedPeriod.slice(0, 4)}-${selectedPeriod.slice(4)}`);
    } else {
      const d = new Date();
      setImportPeriod(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    setSelectedFile(null);
    setShowImportModal(true);
  };

  // When file is picked via input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  // Drag and drop events for import modal
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setImportDragActive(true);
    } else if (e.type === 'dragleave') {
      setImportDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setImportDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) {
        setSelectedFile(file);
      } else {
        setActionMessage({
          text: 'Chỉ hỗ trợ file Excel (.xlsx, .xlsm)',
          type: 'error',
        });
      }
    }
  };

  // Perform upload after user confirms
  const handleConfirmImport = async () => {
    if (!selectedFile || !importPeriod) return;
    setIsImporting(true);
    setActionMessage(null);
    try {
      const res = await importExpenseFile(selectedFile, importPeriod);
      setShowImportModal(false);
      setSelectedFile(null);
      if (res.warnings && res.warnings.length > 0) {
        setImportWarnings(res.warnings);
        setShowWarningsModal(true);
        setActionMessage({
          text: res.message,
          type: 'warning',
        });
      } else {
        setImportWarnings([]);
        setActionMessage({
          text: res.message,
          type: 'success',
        });
      }
      // Chuyển bộ lọc hiển thị sang kỳ vừa import để người dùng thấy ngay dữ liệu mới
      const normalizedPeriod = importPeriod.replace('-', '');
      setSelectedPeriod(normalizedPeriod);
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

  // Open Month Picker modal for exporting details
  const handleOpenExportDetailsModal = () => {
    if (selectedPeriod && selectedPeriod.length === 6) {
      setExportDetailsMonth(`${selectedPeriod.slice(0, 4)}-${selectedPeriod.slice(4)}`);
    } else if (periods && periods.length > 0 && periods[0].length === 6) {
      setExportDetailsMonth(`${periods[0].slice(0, 4)}-${periods[0].slice(4)}`);
    } else {
      const d = new Date();
      setExportDetailsMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    setShowExportDetailsModal(true);
  };

  // Confirm export details by chosen month
  const handleConfirmExportDetails = async () => {
    if (!exportDetailsMonth) return;
    setIsExporting(true);
    try {
      const cleanPeriod = exportDetailsMonth.replace('-', '');
      await exportExpenseData({
        mode: 'details',
        period: cleanPeriod,
      });
      setShowExportDetailsModal(false);
      const [y, m] = exportDetailsMonth.split('-');
      setActionMessage({
        text: `Đã xuất chi tiết thanh toán tháng ${m}/${y} thành công`,
        type: 'success',
      });
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Xuất chi tiết thanh toán thất bại',
        type: 'error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Export list
  const handleExport = async (mode: 'details' | 'collaborators' = activeTab) => {
    if (mode === 'details') {
      handleOpenExportDetailsModal();
      return;
    }
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

  // Export monthly expenses by year
  const handleConfirmExportMonthly = async () => {
    setIsExportingMonthly(true);
    try {
      await exportMonthlyExpenseData(exportYear);
      setShowYearExportModal(false);
      setActionMessage({
        text: `Đã xuất báo cáo chi phí CTV theo tháng cho năm ${exportYear} thành công`,
        type: 'success',
      });
    } catch (err: unknown) {
      setActionMessage({
        text: err instanceof Error ? err.message : 'Xuất báo cáo theo tháng thất bại',
        type: 'error',
      });
    } finally {
      setIsExportingMonthly(false);
    }
  };

  // Open collaborator detail dialog
  const handleOpenCollabDetail = async (code: string) => {
    setSelectedCollabCode(code);
    setShowCollabDetailModal(true);
    setCollabDetailLoading(true);
    setCollabDetailError(null);
    try {
      const data = await getCollaboratorExpenseDetail(code);
      setCollabDetailData(data);
    } catch (err: unknown) {
      setCollabDetailError(
        err instanceof Error ? err.message : 'Không thể tải thông tin chi tiết của cộng tác viên'
      );
    } finally {
      setCollabDetailLoading(false);
    }
  };

  const handleCloseCollabDetail = () => {
    setShowCollabDetailModal(false);
    setSelectedCollabCode(null);
    setCollabDetailData(null);
    setCollabDetailError(null);
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
                          handleOpenImportModal();
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
                          handleOpenExportDetailsModal();
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

                      {/* Item 4: Xuất thanh toán theo tháng */}
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          setShowYearExportModal(true);
                        }}
                        disabled={isExportingMonthly}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {isExportingMonthly ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-accent leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {isExportingMonthly ? 'Đang xuất...' : 'Xuất thanh toán theo tháng'}
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
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
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
              ) : actionMessage.type === 'warning' ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 flex-shrink-0 text-amber-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
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
              {importWarnings.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowWarningsModal(true)}
                  className="inline-flex items-center gap-1 font-semibold text-amber-800 underline hover:text-amber-950 cursor-pointer text-xs ml-2"
                >
                  Xem chi tiết {importWarnings.length} cảnh báo
                </button>
              )}
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
                  setActiveTab('collaborators');
                  setCollabsPage(1);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'collaborators'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chi phí của CTV ({collabsTotal.toLocaleString('vi-VN')})
              </button>
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
                    <th className="py-3 px-4 text-center">Số lần nhận TT</th>
                    <th className="py-3 px-4 text-center">Ngày gia nhập</th>
                    <th className="py-3 px-4 text-center">Ngày chấm dứt</th>
                    <th className="py-3 px-4 text-center">Ngày TT gần nhất</th>
                    <th className="py-3 px-4 text-center">Kỳ gần nhất</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {collabsLoading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                          Đang tải danh sách tổng hợp...
                        </div>
                      </td>
                    </tr>
                  ) : collabs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
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
                          {collab.onboardDate ? formatDate(collab.onboardDate) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-slate-700">
                          {collab.offboardDate ? formatDate(collab.offboardDate) : '—'}
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
                            onClick={() => handleOpenCollabDetail(collab.employeeCode)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 hover:underline cursor-pointer group transition-colors"
                          >
                            <span>Xem chi tiết</span>
                            <svg
                              className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
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

      {/* DIALOG IMPORT DỮ LIỆU THANH TOÁN CTV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent ring-4 ring-accent/5">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Import dữ liệu thanh toán CTV
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chọn tháng áp dụng và file dữ liệu Excel để tiến hành import
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isImporting) {
                    setShowImportModal(false);
                    setSelectedFile(null);
                  }
                }}
                disabled={isImporting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Bước 1: Chọn tháng áp dụng (MonthPicker) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  1. Chọn tháng chi phí (Kỳ import) <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-full sm:w-64">
                    <MonthPicker
                      value={importPeriod}
                      onChange={(newVal) => setImportPeriod(newVal)}
                      disabled={isImporting}
                    />
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-1.5 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex-1">
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Dữ liệu file sẽ được gán kỳ: <strong className="text-slate-900 font-mono">Tháng {formatPeriodBadge(importPeriod.replace('-', ''))}</strong> ({importPeriod.replace('-', '')})
                    </span>
                  </div>
                </div>
              </div>

              {/* Bước 2: Chọn file */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    2. Chọn file dữ liệu (.xlsx, .xlsm) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    disabled={isDownloadingTemplate}
                    className="text-xs text-accent hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>{isDownloadingTemplate ? 'Đang tải mẫu...' : 'Tải file mẫu'}</span>
                  </button>
                </div>

                {!selectedFile ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                      importDragActive
                        ? 'border-accent bg-accent/5'
                        : 'border-slate-200 hover:border-accent/60 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700">
                        Kéo thả file vào đây hoặc <span className="text-accent underline font-bold">chọn từ máy tính</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Chỉ hỗ trợ file Excel (.xlsx, .xlsm) theo đúng cấu trúc mẫu
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-accent/30 bg-accent/5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center flex-shrink-0 font-bold text-xs">
                        XLS
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate" title={selectedFile.name}>
                          {selectedFile.name}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {(selectedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer px-2 py-1"
                      >
                        Đổi file
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        disabled={isImporting}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 cursor-pointer px-2 py-1"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Bước 3: Confirm lại thông tin & Cảnh báo xóa dữ liệu cũ */}
              {selectedFile && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>Xác nhận thông tin Import</span>
                  </div>
                  <div className="text-xs text-amber-900 space-y-1.5">
                    <p>
                      File <strong className="font-mono text-slate-900">{selectedFile.name}</strong> sẽ được import cho{' '}
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-amber-200/80 text-amber-950">
                        Tháng {formatPeriodBadge(importPeriod.replace('-', ''))}
                      </span>
                    </p>
                    <ul className="list-disc pl-4 space-y-1 text-amber-800 text-[11px] leading-relaxed">
                      <li>
                        <strong>Xóa sạch dữ liệu cũ:</strong> Trước khi import, toàn bộ dữ liệu chi tiết hiện có của kỳ <strong>Tháng {formatPeriodBadge(importPeriod.replace('-', ''))}</strong> ({importPeriod.replace('-', '')}) trong hệ thống sẽ được xóa sạch để thực hiện import lại từ đầu.
                      </li>
                      <li>
                        <strong>Cập nhật kỳ (period):</strong> Toàn bộ các dòng chi phí trong file sẽ được gán thuộc tính <code>period = {importPeriod.replace('-', '')}</code>.
                      </li>
                      <li>
                        <strong>Đồng bộ CTV:</strong> Tự động bổ sung CTV vào danh sách đối soát nếu chưa có và tính lại tổng số lần thanh toán cho các CTV liên quan.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50">
              <button
                type="button"
                onClick={() => {
                  if (!isImporting) {
                    setShowImportModal(false);
                    setSelectedFile(null);
                  }
                }}
                disabled={isImporting}
                className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={!selectedFile || !importPeriod || isImporting}
                className="rounded-full px-6 py-2.5 text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xử lý import...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>
                      {selectedFile
                        ? `Xác nhận Import cho Tháng ${formatPeriodBadge(importPeriod.replace('-', ''))}`
                        : 'Xác nhận Import'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG XUẤT CHI TIẾT THANH TOÁN (MONTH PICKER) */}
      {showExportDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-rose-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 ring-4 ring-rose-500/10">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Xuất chi tiết thanh toán theo tháng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Xuất tất cả chi tiết thanh toán của cộng tác viên trong tháng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isExporting) {
                    setShowExportDetailsModal(false);
                  }
                }}
                disabled={isExporting}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Month Picker Control */}
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Chọn tháng cần xuất dữ liệu <span className="text-rose-500">*</span>
                  </label>

                  {/* Tooltip Icon Information */}
                  <div className="relative inline-flex items-center group">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 focus:outline-hidden transition-colors cursor-pointer p-0.5 rounded-full hover:bg-blue-50"
                      aria-label="Quy chuẩn xuất dữ liệu chi tiết"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Tooltip Popover (Light style matching image 2) */}
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-200 pointer-events-none absolute left-[-60px] sm:left-[-120px] top-full mt-2 z-50 w-80 sm:w-[380px] p-4 rounded-2xl bg-white text-slate-700 shadow-xl shadow-slate-900/10 border border-slate-200 text-left">
                      <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-100 text-xs font-bold text-slate-800 tracking-wide">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span>QUY CHUẨN XUẤT DỮ LIỆU CHI TIẾT</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                        <li>
                          Sử dụng mẫu chuẩn <strong className="text-slate-800 font-semibold">export_bc_chi_phi_chi_tiet_theo_thang.xlsx</strong> (sheet <em>Gui BMK</em>).
                        </li>
                        <li>
                          Xuất tất cả chi tiết thanh toán của cộng tác viên trong tháng từ collection <code className="bg-slate-100 text-blue-700 font-mono text-[11px] px-1 py-0.5 rounded">bmk_ctv_expense_details</code>.
                        </li>
                        <li>
                          Bao gồm 13 cột: STT, MNV, Họ tên, MST, Thông tin ngân hàng, Thu nhập chịu thuế, Thuế TNCN, Thực lĩnh, Nơi làm việc, Ngày BMK TT, Nội dung TT.
                        </li>
                        <li>
                          Tự động tính dòng <strong className="text-slate-800 font-semibold">TỔNG CỘNG</strong> ở chân bảng.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <MonthPicker
                    value={exportDetailsMonth}
                    onChange={(val) => setExportDetailsMonth(val)}
                    disabled={isExporting}
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Nhấp vào để chọn năm và tháng cần kết xuất dữ liệu.
                </p>
              </div>

              {/* Quick select chips from existing periods in database (6 kỳ gần nhất) */}
              {periods.length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Các kỳ thanh toán gần nhất:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {periods.slice(0, 6).map((p) => {
                      const formattedMonth = p.length === 6 ? `${p.slice(0, 4)}-${p.slice(4)}` : p;
                      const isSelected = exportDetailsMonth === formattedMonth;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setExportDetailsMonth(formattedMonth)}
                          disabled={isExporting}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-xs ring-2 ring-rose-500/30'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Tháng {formatPeriodBadge(p)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  if (!isExporting) {
                    setShowExportDetailsModal(false);
                  }
                }}
                disabled={isExporting}
                className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmExportDetails}
                disabled={!exportDetailsMonth || isExporting}
                className="rounded-full px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xuất file Excel...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>
                      Xuất chi tiết tháng {exportDetailsMonth ? `${exportDetailsMonth.split('-')[1]}/${exportDetailsMonth.split('-')[0]}` : ''}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG XUẤT THANH TOÁN THEO THÁNG (YEAR PICKER & CONFIRM) */}
      {showYearExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-4 ring-emerald-500/10">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Xuất thanh toán theo tháng
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tổng hợp chi phí cộng tác viên theo từng tháng trong năm
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!isExportingMonthly) {
                    setShowYearExportModal(false);
                  }
                }}
                disabled={isExportingMonthly}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Year Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Chọn năm xuất báo cáo <span className="text-rose-500">*</span>
                  </label>

                  {/* Tooltip Icon Information */}
                  <div className="relative inline-flex items-center group">
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 focus:outline-hidden transition-colors cursor-pointer p-0.5 rounded-full hover:bg-blue-50"
                      aria-label="Quy chuẩn xuất báo cáo theo năm"
                    >
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </button>

                    {/* Tooltip Popover (Light card style matching image 2) */}
                    <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 transition-all duration-200 pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-80 sm:w-[380px] p-4 rounded-2xl bg-white text-slate-700 shadow-xl shadow-slate-900/10 border border-slate-200 text-left">
                      <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-100 text-xs font-bold text-slate-800 tracking-wide">
                        <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </span>
                        <span>QUY CHUẨN XUẤT BÁO CÁO NĂM {exportYear}</span>
                      </div>
                      <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-600 leading-relaxed">
                        <li>
                          Sử dụng mẫu biểu <strong className="text-slate-800 font-semibold">export_bao_cao_chi_phi_theo_thang.xlsx</strong> (sheet <em>Gui BMK</em>).
                        </li>
                        <li>
                          Tổng hợp chi phí thực nhận của từng CTV theo 12 tháng (Tháng 1 đến Tháng 12) của năm <strong className="text-slate-800 font-semibold">{exportYear}</strong>.
                        </li>
                        <li>
                          <strong className="text-slate-800 font-semibold">Tháng nào CTV không có chi phí sẽ để trống</strong> theo đúng quy định.
                        </li>
                        <li>
                          Tự động tính tổng thực lĩnh cả năm và dòng <strong className="text-slate-800 font-semibold">TỔNG CỘNG</strong> ở chân bảng.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Main Year Stepper */}
                <div className="flex items-center justify-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setExportYear((prev) => prev - 1)}
                    disabled={isExportingMonthly || exportYear <= 2010}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Năm trước"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  <div className="px-6 py-1 text-center min-w-[140px]">
                    <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                      {exportYear}
                    </span>
                    <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                      NĂM BÁO CÁO
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExportYear((prev) => prev + 1)}
                    disabled={isExportingMonthly || exportYear >= 2040}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Năm sau"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Quick select year chips */}
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  {[
                    new Date().getFullYear() - 2,
                    new Date().getFullYear() - 1,
                    new Date().getFullYear(),
                    new Date().getFullYear() + 1,
                  ].map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setExportYear(y)}
                      disabled={isExportingMonthly}
                      className={`px-3.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                        exportYear === y
                          ? 'bg-accent text-white shadow-xs ring-2 ring-accent/30'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => {
                  if (!isExportingMonthly) {
                    setShowYearExportModal(false);
                  }
                }}
                disabled={isExportingMonthly}
                className="rounded-full px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmExportMonthly}
                disabled={isExportingMonthly}
                className="rounded-full px-6 py-2.5 text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isExportingMonthly ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xuất file Excel...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Xác nhận Xuất báo cáo năm {exportYear}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WARNINGS MODAL (Khi import có ngày gia nhập/chấm dứt khác hệ thống) */}
      {showWarningsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cảnh báo ngày gia nhập / ngày chấm dứt
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phát hiện {importWarnings.length} trường hợp ngày trong file khác ngày đã có trong hệ thống (Hệ thống chỉ cập nhật từ giá trị trống, dữ liệu đã có được bảo toàn).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowWarningsModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-2 pr-1">
              {importWarnings.map((warn, wIdx) => (
                <div
                  key={wIdx}
                  className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2.5"
                >
                  <span className="font-mono font-bold text-amber-700 min-w-[24px]">#{wIdx + 1}</span>
                  <span className="leading-relaxed">{warn}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowWarningsModal(false)}
                className="rounded-xl bg-slate-800 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-900 transition-all cursor-pointer"
              >
                Đã hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COLLABORATOR DETAILS DIALOG */}
      {showCollabDetailModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseCollabDetail();
          }}
        >
          <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl border border-slate-200 my-auto flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-900">
                      Chi tiết chi phí cộng tác viên
                    </h3>
                    {selectedCollabCode && (
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                        {selectedCollabCode}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {collabDetailData?.collaborator.fullName
                      ? `${collabDetailData.collaborator.fullName} • Lịch sử chi trả và thống kê chi phí 12 tháng gần nhất`
                      : 'Đang tải thông tin chi phí và lịch sử thanh toán...'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseCollabDetail}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer"
                title="Đóng cửa sổ"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {collabDetailLoading ? (
                <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
                  <svg className="animate-spin h-8 w-8 text-accent" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-medium">Đang tải dữ liệu chi tiết của cộng tác viên...</p>
                </div>
              ) : collabDetailError ? (
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-center">
                  <p className="font-semibold">{collabDetailError}</p>
                  <button
                    type="button"
                    onClick={() => selectedCollabCode && handleOpenCollabDetail(selectedCollabCode)}
                    className="mt-3 px-4 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : collabDetailData ? (
                <>
                  {/* SECTION 1: Thông tin chung (2 phần: Trái 33% avatar + info, Phải 67% bar chart 12 tháng) */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Section 1 • Thông tin chung & Biến động chi phí
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Bên trái: Rộng ~33% (lg:col-span-4) - Avatar default + Thông tin CTV */}
                      <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40 p-5 shadow-xs flex flex-col justify-between">
                        <div>
                          {/* Avatar default & Name */}
                          <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                            <div className="relative mb-3">
                              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-accent/20 via-sky-100 to-indigo-100 border-2 border-white shadow-md flex items-center justify-center text-accent overflow-hidden">
                                <svg
                                  className="w-12 h-12 text-accent/80 translate-y-1"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                </svg>
                              </div>
                              <span
                                className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-white ${
                                  collabDetailData.collaborator.offboardDate
                                    ? 'bg-slate-400'
                                    : 'bg-emerald-500'
                                }`}
                                title={
                                  collabDetailData.collaborator.offboardDate
                                    ? 'Đã nghỉ việc'
                                    : 'Đang hoạt động'
                                }
                              />
                            </div>
                            <h3 className="font-bold text-slate-900 text-base">
                              {collabDetailData.collaborator.fullName || '—'}
                            </h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                                {collabDetailData.collaborator.employeeCode}
                              </span>
                              {collabDetailData.collaborator.offboardDate ? (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                  Đã nghỉ việc
                                </span>
                              ) : (
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Đang cộng tác
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Thông tin chi tiết */}
                          <div className="mt-4 space-y-2.5 text-xs">
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">Mã số thuế:</span>
                              <span className="font-mono font-semibold text-slate-800">
                                {collabDetailData.collaborator.taxCode || 'Chưa cập nhật'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">Ngày gia nhập:</span>
                              <span className="font-mono font-medium text-slate-800">
                                {collabDetailData.collaborator.onboardDate
                                  ? formatDate(collabDetailData.collaborator.onboardDate)
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">Ngày nghỉ việc:</span>
                              <span className="font-mono font-medium text-slate-800">
                                {collabDetailData.collaborator.offboardDate
                                  ? formatDate(collabDetailData.collaborator.offboardDate)
                                  : '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-1 border-b border-slate-100">
                              <span className="text-slate-500">Số đợt chi trả:</span>
                              <span className="font-mono font-bold text-accent">
                                {collabDetailData.collaborator.totalPaymentCount} lần
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Thông tin ngân hàng (lấy từ thanh toán gần nhất) */}
                        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-blue-900 font-semibold mb-1">
                            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span>Tài khoản ngân hàng (gần nhất)</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Ngân hàng:</span>
                            <span
                              className="font-semibold text-slate-800 text-right text-[11px] max-w-[160px] truncate"
                              title={collabDetailData.collaborator.bankAccount?.bankName || ''}
                            >
                              {collabDetailData.collaborator.bankAccount?.bankName || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Số tài khoản:</span>
                            <span className="font-mono font-bold text-blue-700 text-[11px]">
                              {collabDetailData.collaborator.bankAccount?.accountNumber || '—'}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[11px]">Chủ tài khoản:</span>
                            <span className="font-medium text-slate-800 text-[11px]">
                              {collabDetailData.collaborator.bankAccount?.accountName || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Bên phải: Rộng ~67% (lg:col-span-8) - Bar Chart 12 tháng gần nhất */}
                      <div className="lg:col-span-8 flex flex-col">
                        <CollaboratorExpenseHistoryBarChart
                          data={collabDetailData.monthlyStats}
                          loading={collabDetailLoading}
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Danh sách chi tiết thanh toán của CTV (sort theo ngày BMK thanh toán và số tiền) */}
                  <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          Section 2 • Danh sách chi tiết thanh toán
                        </h4>
                        <span className="rounded-full bg-slate-200 px-2.5 py-0.5 font-mono text-xs font-bold text-slate-700">
                          {collabDetailData.paymentDetails.length} giao dịch
                        </span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                        ↓ Sắp xếp giảm dần theo ngày BMK thanh toán & số tiền
                      </span>
                    </div>

                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs z-10 text-[11px] font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-12">STT</th>
                            <th className="py-2.5 px-3 text-center">Ngày BMK TT</th>
                            <th className="py-2.5 px-3 text-center">Kỳ TT</th>
                            <th className="py-2.5 px-3">Nơi làm việc</th>
                            <th className="py-2.5 px-3 text-right">Tổng TN chịu thuế</th>
                            <th className="py-2.5 px-3 text-right">Thuế TNCN</th>
                            <th className="py-2.5 px-3 text-right">Thực lĩnh</th>
                            <th className="py-2.5 px-3">Tài khoản nhận</th>
                            <th className="py-2.5 px-3">Nội dung thanh toán</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-sans">
                          {collabDetailData.paymentDetails.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-slate-400">
                                Chưa có bản ghi chi tiết thanh toán nào cho cộng tác viên này
                              </td>
                            </tr>
                          ) : (
                            collabDetailData.paymentDetails.map((detail, dIdx) => (
                              <tr key={detail.id || dIdx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3 text-center font-mono text-slate-400">
                                  {dIdx + 1}
                                </td>
                                <td className="py-2.5 px-3 text-center font-mono text-slate-700 whitespace-nowrap">
                                  {formatDate(detail.paymentDate)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-700 border border-slate-200 whitespace-nowrap">
                                    {formatPeriodBadge(detail.period)}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                                  {detail.workLocation || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                                  {formatVND(detail.taxableIncome)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                                  {detail.personalIncomeTax > 0 ? formatVND(detail.personalIncomeTax) : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-accent whitespace-nowrap">
                                  {formatVND(detail.netIncome)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  <div className="font-mono text-[11px] font-semibold text-slate-800">
                                    {detail.bankAccount?.accountNumber || '—'}
                                  </div>
                                  <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                                    {detail.bankAccount?.bankName}
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={detail.paymentContent || ''}>
                                  {detail.paymentContent || '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                        {/* Table summary footer */}
                        {collabDetailData.paymentDetails.length > 0 && (
                          <tfoot className="sticky bottom-0 bg-slate-100/95 backdrop-blur-xs border-t-2 border-slate-300 font-bold text-xs">
                            <tr>
                              <td colSpan={4} className="py-2.5 px-3 text-center text-slate-800">
                                TỔNG CỘNG ({collabDetailData.paymentDetails.length} giao dịch)
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900 whitespace-nowrap">
                                {formatVND(
                                  collabDetailData.paymentDetails.reduce(
                                    (sum, item) => sum + (item.taxableIncome || 0),
                                    0
                                  )
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                                {formatVND(
                                  collabDetailData.paymentDetails.reduce(
                                    (sum, item) => sum + (item.personalIncomeTax || 0),
                                    0
                                  )
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-accent whitespace-nowrap">
                                {formatVND(
                                  collabDetailData.paymentDetails.reduce(
                                    (sum, item) => sum + (item.netIncome || 0),
                                    0
                                  )
                                )}
                              </td>
                              <td colSpan={2} className="py-2.5 px-3"></td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/70">
              <button
                type="button"
                onClick={handleCloseCollabDetail}
                className="rounded-xl px-5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
