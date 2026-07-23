import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/collaborators', label: 'Hồ sơ cộng tác viên', end: false },
];

const adminNavGroup = {
  label: 'Quản trị hệ thống',
  items: [
    { to: '/users', label: 'Quản lý người dùng', end: false },
    { to: '/system-logs', label: 'Nhật ký hệ thống', end: false },
    { to: '/upload-history', label: 'Lịch sử Upload file', end: false },
  ],
};

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const closeMobileNav = () => setMobileNavOpen(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-white/10 text-gold' : 'text-white/70 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <div className="flex min-h-screen bg-page">
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r-0 bg-house-green text-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-white/10 px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-widest text-gold font-serif">BMK</span>
            <span className="h-4 w-px bg-white/20" />
            <span className="whitespace-nowrap text-sm font-semibold text-white">Quản lý CTV</span>
          </div>
          <button
            type="button"
            onClick={closeMobileNav}
            aria-label="Đóng menu"
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobileNav} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}

          {user?.role === 'admin' && (
            <div className="pt-4">
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
                {adminNavGroup.label}
              </p>
              {adminNavGroup.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} onClick={closeMobileNav} className={navLinkClass}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 bg-white px-4 shadow-nav lg:px-6">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Mở menu"
            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="hidden text-sm text-slate-600 sm:inline">
              Xin chào, <span className="font-semibold text-slate-900">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="btn-outline-dark px-4 py-1.5 text-xs"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
        <Link
          to="/collaborators/new"
          className="btn-frap"
          title="Thêm cộng tác viên mới"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
