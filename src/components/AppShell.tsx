import { CalendarDays, ClipboardList, LogOut, Settings, UserRound } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export function AppShell() {
  const { member, isDemo, signOut } = useAuth();
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  async function handleSignOut() {
    setIsLogoutConfirmOpen(false);
    await signOut();
  }

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
          <div className="logout-control">
            <button
              className="icon-button"
              type="button"
              onClick={() => setIsLogoutConfirmOpen((isOpen) => !isOpen)}
              aria-expanded={isLogoutConfirmOpen}
              aria-label="ログアウトメニュー"
              title="ログアウトメニュー"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
            {isLogoutConfirmOpen && (
              <div className="logout-popover" role="dialog" aria-label="ログアウト確認">
                <p>通常はログアウト不要です。</p>
                <button className="danger-button inline" type="button" onClick={handleSignOut}>
                  ログアウトする
                </button>
                <button className="secondary-button inline" type="button" onClick={() => setIsLogoutConfirmOpen(false)}>
                  キャンセル
                </button>
              </div>
            )}
          </div>
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
