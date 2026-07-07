import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api/client';

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[45%] flex-col justify-between bg-primary-dark px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <img src="/logo_bmk_white.svg" alt="BMK" className="h-7 w-auto" />
          <span className="h-4 w-px bg-white/30" />
          <span className="text-sm font-semibold">Quản lý CTV</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight">
            Quản lý hồ sơ
            <br />
            cộng tác viên tập trung
          </h1>
          <p className="mt-4 max-w-sm text-sm text-white/70">
            Theo dõi hồ sơ, checklist giấy tờ và tình trạng hợp đồng của cộng tác viên trên một nền
            tảng duy nhất.
          </p>
        </div>

        <p className="text-xs text-white/50">Nội bộ · dữ liệu được lưu trữ an toàn</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/logo_bmk.png" alt="BMK" className="h-7 w-auto" />
            <span className="h-4 w-px bg-slate-300" />
            <span className="text-sm font-semibold text-slate-800">Quản lý CTV</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-500">Tiếp tục vào hệ thống quản lý hồ sơ cộng tác viên</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input"
                placeholder="admin"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input"
                placeholder="••••••"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-primary px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <p className="text-center text-xs text-slate-400">
              Tài khoản demo: <span className="font-mono">admin / 123456</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
