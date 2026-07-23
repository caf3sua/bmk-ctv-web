import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import UserStatusBadge from '../components/UserStatusBadge';
import { listUsers } from '../services/api/users';
import type { AdminUser, UserRole } from '../types/user';
import { roleLabel } from '../utils/user';

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'inactive';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function UserListPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    setLoading(true);
    listUsers()
      .then(setUsers)
      .finally(() => setLoading(false));
  }

  const filtered = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return users.filter((u) => {
      const matchesKeyword =
        !term ||
        u.username.toLowerCase().includes(term) ||
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term);

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && u.active) ||
        (statusFilter === 'inactive' && !u.active);

      return matchesKeyword && matchesRole && matchesStatus;
    });
  }, [users, keyword, roleFilter, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [keyword, roleFilter, statusFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Quản lý người dùng</h1>
          <p className="mt-1 text-sm text-slate-500">
            {filtered.length} / {users.length} tài khoản quản trị hệ thống
          </p>
        </div>
        <Link
          to="/users/new"
          className="btn-primary"
        >
          + Thêm người dùng
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 p-4 rounded-2xl border border-border-subtle/60 bg-white shadow-card">
        <div className="min-w-[220px] flex-1">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Tìm theo tên đăng nhập, họ tên, email..."
            className="input"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          className="input w-auto"
        >
          <option value="all">Tất cả vai trò</option>
          <option value="admin">Quản trị viên</option>
          <option value="staff">Nhân viên</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="input w-auto"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã khóa</option>
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
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tên đăng nhập</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Họ tên</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Email</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Vai trò</th>
              <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/60">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Đang tải dữ liệu...
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500 font-medium">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            )}
            {!loading &&
              pageItems.map((u) => (
                <tr key={u.username} className="hover:bg-ceramic/40 transition-colors">
                  <td className="whitespace-nowrap px-4 py-3">
                    <Link
                      to={`/users/${u.username}`}
                      className="font-mono font-semibold text-primary hover:text-accent transition-colors"
                    >
                      {u.username}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-800 font-semibold">{u.name || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 font-mono text-xs">{u.email}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 font-medium">{roleLabel(u.role)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <UserStatusBadge active={u.active} />
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
            {filtered.length} tài khoản
          </p>
          <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </Layout>
  );
}
