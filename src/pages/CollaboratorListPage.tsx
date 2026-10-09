import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ProfileStatusBadge from '../components/ProfileStatusBadge';
import { ApiError } from '../services/api/client';
import {
  downloadDoiSoatTemplate,
  downloadImportTemplate,
  exportCollaborators,
  exportContractReport,
  importCollaborators,
  listCollaborators,
} from '../services/api/collaborators';
import type { Collaborator } from '../types/collaborator';
import { formatDate } from '../utils/date';
import { isChecklistComplete } from '../utils/checklist';

type StatusFilter = 'all' | 'complete' | 'incomplete';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function CollaboratorListPage() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [exporting, setExporting] = useState(false);
  const [exportingContracts, setExportingContracts] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    text: string;
    tone: 'success' | 'warning' | 'error';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const [dataMenuOpen, setDataMenuOpen] = useState(false);

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

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    listCollaborators()
      .then(setCollaborators)
      .finally(() => setLoading(false));
  }

  async function handleExport() {
    setExporting(true);
    setImportMessage(null);
    try {
      await exportCollaborators();
    } catch (err) {
      setImportMessage({
        text: err instanceof ApiError ? err.message : 'Xuất báo cáo CTV thất bại',
        tone: 'error',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleExportContracts() {
    setExportingContracts(true);
    setImportMessage(null);
    try {
      await exportContractReport();
    } catch (err) {
      setImportMessage({
        text: err instanceof ApiError ? err.message : 'Xuất báo cáo hợp đồng thất bại',
        tone: 'error',
      });
    } finally {
      setExportingContracts(false);
    }
  }

  async function handleDownloadTemplate() {
    try {
      await downloadImportTemplate();
    } catch (err) {
      setImportMessage({
        text: err instanceof ApiError ? err.message : 'Tải file mẫu thất bại',
        tone: 'error',
      });
    }
  }

  async function handleDownloadDoiSoat() {
    try {
      await downloadDoiSoatTemplate();
    } catch (err) {
      setImportMessage({
        text: err instanceof ApiError ? err.message : 'Tải file đối soát thất bại',
        tone: 'error',
      });
    }
  }

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const result = await importCollaborators(file);
      const parts = [`Đã cập nhật ${result.updatedCount} hồ sơ.`];
      if (result.createdCount > 0) {
        parts.push(`Đã tạo mới ${result.createdCount} hồ sơ: ${result.created.join(', ')}.`);
      }
      if (result.dateErrorCount > 0) {
        parts.push(`Có ${result.dateErrorCount} lỗi định dạng ngày: ${result.dateErrors.join('; ')}.`);
      }
      setImportMessage({ text: parts.join(' '), tone: result.dateErrorCount > 0 ? 'warning' : 'success' });
      load();
    } catch (err) {
      setImportMessage({
        text: err instanceof ApiError ? err.message : 'Nhập dữ liệu thất bại',
        tone: 'error',
      });
    } finally {
      setImporting(false);
    }
  }

  const totalIncomplete = collaborators.filter((c) => !isChecklistComplete(c.checklist)).length;

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return collaborators.filter((c) => {
      const matchesKeyword =
        !term ||
        c.employeeCode.toLowerCase().includes(term) ||
        c.fullName.toLowerCase().includes(term) ||
        c.taxCode.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term) ||
        Boolean(c.handoverInfo && c.handoverInfo.some((h) => h.handoverPerson?.toLowerCase().includes(term))) ||
        Boolean(c.noted && c.noted.toLowerCase().includes(term));

      const complete = isChecklistComplete(c.checklist);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'complete' && complete) ||
        (statusFilter === 'incomplete' && !complete);

      return matchesKeyword && matchesStatus;
    });
  }, [collaborators, keyword, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Layout>
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl text-center">
            <div className="flex justify-center">
              <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">Đang xử lý dữ liệu</h3>
            <p className="mt-2 text-sm text-slate-500">
              Hệ thống đang tải tệp lên lưu trữ S3 và tiến hành xử lý dữ liệu Excel. Vui lòng đợi trong giây lát và không tải lại trang...
            </p>
          </div>
        </div>
      )}

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Hệ thống <span className="mx-1 text-slate-300">/</span> Cộng tác viên
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Danh sách hồ sơ cộng tác viên</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý và theo dõi thông tin hồ sơ cộng tác viên trên toàn hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown button "Dữ liệu" */}
          <div className="relative" ref={dataMenuRef}>
            <button
              type="button"
              onClick={() => setDataMenuOpen((prev) => !prev)}
              aria-expanded={dataMenuOpen}
              className={`btn-secondary px-4 py-2 flex items-center gap-2.5 font-semibold transition-all border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 ${
                dataMenuOpen ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-sm ring-2 ring-amber-300/40' : ''
              }`}
            >
              <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>Dữ liệu</span>
              {(exporting || exportingContracts || importing) && (
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

            {/* Hidden File Input for Import */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImportFileChange}
              className="hidden"
            />

            {/* Dropdown Menu Popover matching user's reference */}
            {dataMenuOpen && (
              <div className="absolute right-0 mt-2 z-40 w-[340px] sm:w-[460px] bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">Thao tác dữ liệu</h3>
                    <p className="text-xs text-slate-400">Nhập, xuất hoặc đối soát hồ sơ cộng tác viên</p>
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
                          fileInputRef.current?.click();
                        }}
                        disabled={importing}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-blue-50 text-blue-600 border border-blue-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {importing ? (
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
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {importing ? 'Đang nhập...' : 'Nhập dữ liệu'}
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
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleDownloadTemplate();
                        }}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-violet-50 text-violet-600 border border-violet-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          Tải file mẫu nhập dữ liệu
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleExport();
                        }}
                        disabled={exporting}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-rose-50 text-rose-600 border border-rose-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {exporting ? (
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
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {exporting ? 'Đang xuất...' : 'Xuất báo cáo CTV'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleExportContracts();
                        }}
                        disabled={exportingContracts}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center disabled:opacity-60 disabled:cursor-not-allowed w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-amber-50 text-amber-600 border border-amber-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          {exportingContracts ? (
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          {exportingContracts ? 'Đang xuất...' : 'Xuất báo cáo HĐ'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Nhóm 3: Đối soát */}
                  <div>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                      <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                        ĐỐI SOÁT
                      </span>
                    </div>
                    <div className="flex items-start gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setDataMenuOpen(false);
                          handleDownloadDoiSoat();
                        }}
                        className="group flex flex-col items-center justify-start p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200/80 transition-all cursor-pointer text-center w-28 sm:w-32"
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600 border border-emerald-100/60 transition-transform group-hover:scale-105 group-hover:shadow-sm mb-2">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-primary leading-tight text-center min-h-[2.25rem] flex items-start justify-center">
                          Tải file đối soát
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/collaborators/new"
            className="btn-primary px-4 py-2"
          >
            + Thêm cộng tác viên
          </Link>
        </div>
      </div>

      {importMessage && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${
            importMessage.tone === 'error'
              ? 'bg-danger/10 text-danger'
              : importMessage.tone === 'warning'
                ? 'bg-warning/10 text-warning'
                : 'bg-accent/10 text-accent'
          }`}
        >
          {importMessage.text}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng cộng</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900">{collaborators.length}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thiếu hồ sơ</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-mono text-3xl font-bold text-warning">{totalIncomplete}</p>
            {totalIncomplete > 0 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                Cần xử lý
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle/60 bg-white p-4 shadow-card">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Tìm kiếm</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã NV, họ tên, MST, email, ghi chú..."
            className="input"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái hồ sơ</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="input w-auto"
          >
            <option value="all">Tất cả hồ sơ</option>
            <option value="complete">Đã nộp đủ</option>
            <option value="incomplete">Còn thiếu</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Số dòng / trang</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="input w-auto"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} dòng
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle/60 bg-white shadow-card">
        <table className="min-w-full divide-y divide-border-subtle/60 text-sm">
          <thead className="bg-page">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Cộng tác viên
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Mã số thuế
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Liên hệ
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Ngày sinh
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Bàn giao
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hồ sơ
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Không tìm thấy cộng tác viên nào.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((c) => (
                <tr key={c.employeeCode} className="hover:bg-ceramic/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/collaborators/${c.employeeCode}`} className="flex items-center gap-3">
                      <Avatar name={c.fullName || c.employeeCode} size="sm" />
                      <div>
                        <p className="font-semibold text-slate-800 hover:text-accent transition-colors">{c.fullName || '—'}</p>
                        <p className="font-mono text-xs text-slate-400">{c.employeeCode}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{c.taxCode || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="text-slate-700 font-medium">{c.phone || '—'}</p>
                    <p className="text-xs text-slate-400 font-mono">{c.email || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{formatDate(c.dob)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {c.handoverInfo && c.handoverInfo.length > 0 ? (
                      (() => {
                        const sorted = [...c.handoverInfo].sort((a, b) => (a.handoverDate || '').localeCompare(b.handoverDate || ''));
                        const latest = sorted[sorted.length - 1];
                        return (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-slate-700 font-medium">{latest.handoverPerson || '—'}</p>
                              {sorted.length > 1 && (
                                <span
                                  className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200 cursor-help"
                                  title={sorted.map((h) => `${h.handoverPerson || '—'} (${formatDate(h.handoverDate)})`).join('\n')}
                                >
                                  +{sorted.length - 1}
                                </span>
                              )}
                            </div>
                            {latest.handoverDate && (
                              <p className="text-xs text-slate-400 font-mono">{formatDate(latest.handoverDate)}</p>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ProfileStatusBadge checklist={c.checklist} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      to={`/collaborators/${c.employeeCode}`}
                      title="Xem / chỉnh sửa hồ sơ"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-accent transition-all active:scale-95"
                    >
                      <PencilIcon />
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && filtered.length > 0 && (
        <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-slate-500 font-medium">
            Hiển thị {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} trên{' '}
            {filtered.length} cộng tác viên
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </Layout>
  );
}

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-4 w-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
      />
    </svg>
  );
}
