import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api/client';
import { createUser, deleteUser, getUser, updateUser } from '../services/api/users';
import { emptyAdminUser, type AdminUserInput, type UserRole } from '../types/user';

export default function UserDetailPage() {
  const { username } = useParams<{ username: string }>();
  const isNew = username === 'new';
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const isSelf = !isNew && currentUser?.username === username;

  const [form, setForm] = useState<AdminUserInput>(emptyAdminUser());
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (isNew || !username) return;
    setLoading(true);
    getUser(username)
      .then((u) => setForm({ ...u, password: '' }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError('Không thể tải dữ liệu người dùng');
      })
      .finally(() => setLoading(false));
  }, [username, isNew]);

  function updateField<K extends keyof AdminUserInput>(key: K, value: AdminUserInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (isNew && form.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (!isNew && form.password && form.password.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        await createUser(form);
      } else if (username) {
        const { password, ...rest } = form;
        await updateUser(username, password ? { ...rest, password } : rest);
      }
      navigate('/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lưu dữ liệu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!username || isNew) return;
    if (!window.confirm(`Xóa tài khoản "${form.name || username}"?`)) return;
    setSaving(true);
    try {
      await deleteUser(username);
      navigate('/users');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Xóa dữ liệu thất bại');
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
      </Layout>
    );
  }

  if (notFound) {
    return (
      <Layout>
        <p className="text-sm text-slate-500">Không tìm thấy người dùng.</p>
        <Link to="/users" className="mt-2 inline-block text-sm text-primary hover:underline">
          &larr; Quay lại danh sách
        </Link>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <Link to="/users" className="text-sm text-primary font-semibold hover:underline">
            &larr; Quản lý người dùng
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            {isNew ? 'Thêm người dùng mới' : form.name || username}
          </h1>
        </div>
        {!isNew && (
          <button
            onClick={handleDelete}
            disabled={saving || isSelf}
            title={isSelf ? 'Không thể tự xóa tài khoản của chính mình' : undefined}
            className="btn-danger-outline"
          >
            Xóa tài khoản
          </button>
        )}
      </div>

      {error && <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger font-medium">{error}</p>}

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-6">
        <section className="rounded-2xl border border-border-subtle/60 bg-white p-5 shadow-card">
          <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Thông tin tài khoản</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tên đăng nhập" required>
              <input
                type="text"
                required
                disabled={!isNew}
                value={form.username}
                onChange={(e) => updateField('username', e.target.value)}
                className="input disabled:bg-slate-100/50 disabled:text-slate-400 disabled:border-slate-200"
              />
            </Field>
            <Field label="Họ tên">
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="input font-semibold text-slate-800"
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                className="input font-mono"
              />
            </Field>
            <Field label="Vai trò" required>
              <select
                value={form.role}
                onChange={(e) => updateField('role', e.target.value as UserRole)}
                disabled={isSelf}
                title={isSelf ? 'Không thể tự đổi vai trò của chính mình' : undefined}
                className="input disabled:bg-slate-100/50 disabled:text-slate-400 disabled:border-slate-200"
              >
                <option value="admin">Quản trị viên</option>
                <option value="staff">Nhân viên</option>
              </select>
            </Field>
            <Field label={isNew ? 'Mật khẩu' : 'Mật khẩu mới (để trống nếu không đổi)'} required={isNew}>
              <input
                type="password"
                required={isNew}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                className="input font-mono"
                placeholder={isNew ? 'Tối thiểu 6 ký tự' : '••••••'}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-slate-700 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={form.active}
                disabled={isSelf}
                title={isSelf ? 'Không thể tự khóa tài khoản của chính mình' : undefined}
                onChange={(e) => updateField('active', e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-accent focus:ring-accent accent-accent cursor-pointer disabled:cursor-not-allowed"
              />
              Tài khoản đang hoạt động
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <Link
            to="/users"
            className="btn-outline-dark"
          >
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Đang lưu...' : 'Lưu người dùng'}
          </button>
        </div>
      </form>
    </Layout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>
      {children}
    </label>
  );
}
