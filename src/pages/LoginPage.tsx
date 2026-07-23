import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../services/api/client';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-client';

export default function LoginPage() {
  const { isAuthenticated, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleInitializedRef = useRef(false);

  const handleGoogleCredential = async (response: { credential: string }) => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(response.credential);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập bằng Google thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGoogleSignIn = () => {
      if (googleInitializedRef.current || !window.google?.accounts?.id || !googleButtonRef.current) return;
      googleInitializedRef.current = true;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: googleButtonRef.current.clientWidth || 320,
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogleSignIn();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_GSI_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', initializeGoogleSignIn);
      return () => existingScript.removeEventListener('load', initializeGoogleSignIn);
    }

    const script = document.createElement('script');
    script.id = GOOGLE_GSI_SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogleSignIn;
    script.onerror = () => console.error('Không thể tải thư viện Google Sign-In.');
    document.body.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <div className="flex min-h-screen font-sans">
      <div className="relative hidden w-[45%] flex-col justify-between bg-primary-dark px-12 py-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold tracking-widest text-gold font-serif">BMK</span>
          <span className="h-4 w-px bg-white/20" />
          <span className="text-sm font-medium text-white/80">Quản lý CTV</span>
        </div>

        <div>
          <h1 className="text-5xl font-serif leading-tight text-gold">
            Quản lý hồ sơ
            <br />
            cộng tác viên
            <br />
            tập trung
          </h1>
          <p className="mt-6 max-w-sm text-sm text-white/70 leading-relaxed">
            Theo dõi hồ sơ, checklist giấy tờ và tình trạng hợp đồng của cộng tác viên trên một nền
            tảng duy nhất.
          </p>
        </div>

        <p className="text-xs text-white/40">Nội bộ · dữ liệu được lưu trữ an toàn</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center bg-page px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-card border border-border-subtle/50">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="text-xl font-bold tracking-widest text-primary font-serif">BMK</span>
            <span className="h-4 w-px bg-slate-300" />
            <span className="text-sm font-semibold text-slate-800">Quản lý CTV</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-500">Tiếp tục vào hệ thống quản lý hồ sơ cộng tác viên</p>

          {error && (
            <p className="mt-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
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

            <button
              type="submit"
              disabled={submitting}
              className="w-full btn-primary py-3 mt-2"
            >
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>

            <p className="text-center text-xs text-slate-400 mt-4">
              Cần hỗ trợ đăng nhập? Liên hệ quản trị viên hệ thống của bạn.
            </p>
          </form>

          {GOOGLE_CLIENT_ID && (
            <>
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-border-subtle" />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Hoặc</span>
                <span className="h-px flex-1 bg-border-subtle" />
              </div>
              <div ref={googleButtonRef} className="flex min-h-[40px] w-full justify-center" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
