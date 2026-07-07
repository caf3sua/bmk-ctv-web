import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/collaborators', label: 'Hồ sơ cộng tác viên', end: false },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-page">
      <aside className="flex w-64 flex-col border-r border-border-subtle bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-border-subtle px-6">
          <span className="text-sm font-bold tracking-widest text-primary">BMK</span>
          <span className="h-4 w-px bg-border-subtle" />
          <span className="whitespace-nowrap text-sm font-semibold text-slate-800">Quản lý CTV</span>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-white px-6">
          <div />
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Xin chào, <span className="font-medium text-slate-900">{user?.displayName}</span>
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-border-subtle px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
