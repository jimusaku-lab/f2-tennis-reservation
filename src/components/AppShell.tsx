import { CalendarDays, ClipboardList, LogOut, Settings, UserRound } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AppShell() {
  const { member, isDemo, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <p className="eyebrow">{isDemo ? 'Demo / F2テニス' : 'F2テニス'}</p>
          <h1>F2テニス予約管理</h1>
        </div>
        <div className="top-actions">
          <span className="member-pill">
            <UserRound size={16} aria-hidden="true" />
            {member?.name}
          </span>
          <button className="icon-button" type="button" onClick={signOut} aria-label="ログアウト" title="ログアウト">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <main className="content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="主要画面">
        <NavLink to="/events">
          <CalendarDays size={20} aria-hidden="true" />
          予定
        </NavLink>
        <NavLink to="/my">
          <ClipboardList size={20} aria-hidden="true" />
          自分
        </NavLink>
        {member?.role === 'admin' && (
          <NavLink to="/admin">
            <Settings size={20} aria-hidden="true" />
            管理
          </NavLink>
        )}
      </nav>
    </div>
  );
}
