import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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
      isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border-subtle bg-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between gap-3 border-b border-border-subtle px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-widest text-primary">BMK</span>
            <span className="h-4 w-px bg-border-subtle" />
            <span className="whitespace-nowrap text-sm font-semibold text-slate-800">Quản lý CTV</span>
          </div>
          <button
            type="button"
            onClick={closeMobileNav}
            aria-label="Đóng menu"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 lg:hidden"
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
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
        <header className="flex h-16 flex-shrink-0 items-center justify-between gap-3 border-b border-border-subtle bg-white px-4 lg:px-6">
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
              Xin chào, <span className="font-medium text-slate-900">{user?.name}</span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
