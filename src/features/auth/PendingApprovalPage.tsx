import { LogOut } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function PendingApprovalPage() {
  const { member, signOut } = useAuth();

  if (!member) return <Navigate to="/login" replace />;
  if (member.status === 'active') return <Navigate to="/events" replace />;

  const statusMessage = {
    active: '',
    pending: '利用申請は承認待ちです。管理者が承認すると予定一覧と予約機能を利用できます。',
    rejected: '利用申請は却下されています。内容を確認して再申請してください。',
    invited: '招待は未完了です。ログインリンクを開き直すか管理者へ確認してください。',
    disabled: 'このメンバーは無効化されています。',
  }[member.status];

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="pending-title">
        <img src={`${import.meta.env.BASE_URL}tennis-ball.svg`} alt="" className="login-logo" />
        <p className="eyebrow">F2テニス</p>
        <h1 id="pending-title">承認待ち</h1>
        <p className="login-copy">{statusMessage}</p>
        <div className="pending-profile">
          <strong>{member.name}</strong>
          <span>{member.email}</span>
          <span>{member.affiliation || '所属未設定'}</span>
          <span className={`status-badge ${member.status === 'rejected' || member.status === 'disabled' ? 'cancelled' : 'neutral'}`}>
            {member.status}
          </span>
        </div>
        <button className="secondary-button" type="button" onClick={signOut}>
          <LogOut size={18} aria-hidden="true" />
          ログアウト
        </button>
      </section>
    </main>
  );
}
