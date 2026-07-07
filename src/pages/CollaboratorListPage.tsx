import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ProfileStatusBadge from '../components/ProfileStatusBadge';
import { ApiError } from '../services/api/client';
import {
  downloadImportTemplate,
  exportCollaborators,
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
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{
    text: string;
    tone: 'success' | 'warning' | 'error';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        text: err instanceof ApiError ? err.message : 'Xuất Excel thất bại',
        tone: 'error',
      });
    } finally {
      setExporting(false);
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

  async function handleImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportMessage(null);
    try {
      const result = await importCollaborators(file);
      const parts = [`Đã cập nhật ${result.updatedCount} hồ sơ.`];
      if (result.notFoundCount > 0) {
        parts.push(`Không tìm thấy ${result.notFoundCount} mã: ${result.notFound.join(', ')}.`);
      }
      setImportMessage({ text: parts.join(' '), tone: result.notFoundCount > 0 ? 'warning' : 'success' });
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
        c.email.toLowerCase().includes(term);

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
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Hệ thống <span className="mx-1 text-slate-300">/</span> Cộng tác viên
      </p>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách hồ sơ cộng tác viên</h1>
          <p className="mt-1 text-sm text-slate-500">
            Quản lý và theo dõi thông tin hồ sơ cộng tác viên trên toàn hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {exporting ? 'Đang xuất...' : 'Xuất Excel'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="rounded-lg border border-border-subtle bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {importing ? 'Đang nhập...' : 'Nhập dữ liệu'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportFileChange}
            className="hidden"
          />
          <Link
            to="/collaborators/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            + Thêm cộng tác viên
          </Link>
        </div>
      </div>

      <div className="mt-2 flex justify-end">
        <button type="button" onClick={handleDownloadTemplate} className="text-xs text-primary hover:underline">
          Tải file mẫu nhập dữ liệu
        </button>
      </div>

      {importMessage && (
        <p
          className={`mt-3 rounded-lg px-3 py-2 text-sm ${
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
        <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tổng cộng</p>
          <p className="mt-2 font-mono text-3xl font-bold text-slate-900">{collaborators.length}</p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thiếu hồ sơ</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="font-mono text-3xl font-bold text-warning">{totalIncomplete}</p>
            {totalIncomplete > 0 && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                Cần xử lý
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-border-subtle bg-white p-4 shadow-sm">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Tìm kiếm</label>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo mã NV, họ tên, MST, email..."
            className="input"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Trạng thái hồ sơ</label>
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
          <label className="mb-1 block text-xs font-medium text-slate-500">Số dòng / trang</label>
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

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle bg-white shadow-sm">
        <table className="min-w-full divide-y divide-border-subtle text-sm">
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
                Hồ sơ
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Không tìm thấy cộng tác viên nào.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((c) => (
                <tr key={c.employeeCode} className="hover:bg-page">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link to={`/collaborators/${c.employeeCode}`} className="flex items-center gap-3">
                      <Avatar name={c.fullName || c.employeeCode} size="sm" />
                      <div>
                        <p className="font-medium text-slate-800">{c.fullName || '—'}</p>
                        <p className="font-mono text-xs text-slate-400">{c.employeeCode}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{c.taxCode || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="text-slate-700">{c.phone || '—'}</p>
                    <p className="text-xs text-slate-400">{c.email || '—'}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{formatDate(c.dob)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ProfileStatusBadge checklist={c.checklist} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Link
                      to={`/collaborators/${c.employeeCode}`}
                      title="Xem / chỉnh sửa hồ sơ"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary"
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
          <p className="text-sm text-slate-500">
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
