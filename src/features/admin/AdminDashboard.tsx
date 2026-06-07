import { Plus, UsersRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../lib/api';
import { formatDate, formatTimeRange } from '../../lib/date';
import type { AdminEvent, Member } from '../../lib/types';

export function AdminDashboard() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.listAdminEvents(), api.listMembers()])
      .then(([eventItems, memberItems]) => {
        setEvents(eventItems);
        setMembers(memberItems);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '管理データの取得に失敗しました。'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <LoadingScreen />;

  const pendingCount = members.filter((member) => member.status === 'pending').length;

  return (
    <section className="page-section" aria-labelledby="admin-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h2 id="admin-title">管理</h2>
        </div>
      </div>

      <div className="admin-actions">
        <Link className="primary-button" to="/admin/events/new">
          <Plus size={18} aria-hidden="true" />
          予定作成
        </Link>
        <Link className="secondary-button" to="/admin/members">
          <UsersRound size={18} aria-hidden="true" />
          メンバー{pendingCount > 0 ? ` (${pendingCount})` : ''}
        </Link>
      </div>

      {pendingCount > 0 && <p className="notice">未承認の利用申請が {pendingCount} 件あります。</p>}

      {error && <p className="notice error">{error}</p>}

      <div className="admin-list">
        {events.map((event) => (
          <Link key={event.id} className="admin-row" to={`/admin/events/${event.id}`}>
            <div>
              <strong>{event.title}</strong>
              <span>
                {formatDate(event.starts_at)} {formatTimeRange(event.starts_at, event.ends_at)}
              </span>
              <span>
                {event.location}
                {event.court_name ? ` / ${event.court_name}` : ''}
              </span>
            </div>
            <span className={`status-badge ${event.status === 'cancelled' || event.status === 'deleted' ? 'cancelled' : 'neutral'}`}>
              {event.status}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
