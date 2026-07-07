import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import ProfileStatusBadge from '../components/ProfileStatusBadge';
import { listCollaborators } from '../services/api/collaborators';
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

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    listCollaborators()
      .then(setCollaborators)
      .finally(() => setLoading(false));
  }

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách hồ sơ cộng tác viên</h1>
          <p className="mt-1 text-sm text-slate-500">{filtered.length} / {collaborators.length} cộng tác viên</p>
        </div>
        <Link
          to="/collaborators/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
        >
          + Thêm cộng tác viên
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Tìm theo mã NV, họ tên, MST, email..."
          className="input w-full max-w-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="input w-auto"
        >
          <option value="all">Tất cả hồ sơ</option>
          <option value="complete">Đã nộp đủ</option>
          <option value="incomplete">Còn thiếu</option>
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

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border-subtle bg-white shadow-sm">
        <table className="min-w-full divide-y divide-border-subtle text-sm">
          <thead className="bg-page">
            <tr>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã nhân viên</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Họ tên</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Mã số thuế</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ngày sinh</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Hồ sơ</th>
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
                    <Link
                      to={`/collaborators/${c.employeeCode}`}
                      className="font-mono font-medium text-primary hover:underline"
                    >
                      {c.employeeCode}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800">{c.fullName}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{c.taxCode || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-600">{formatDate(c.dob)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{c.email || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <ProfileStatusBadge checklist={c.checklist} />
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
