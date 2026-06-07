import { FormEvent, useState } from 'react';
import { EventCard } from '../../components/EventCard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useAuth } from '../auth/AuthContext';
import { useEventCards } from '../events/useEventCards';

export function MyReservationsPage() {
  const { member, updateMyProfile } = useAuth();
  const { events, isLoading, busyEventId, error, reserve, cancel } = useEventCards();
  const [name, setName] = useState(member?.name ?? '');
  const [affiliation, setAffiliation] = useState(member?.affiliation ?? '');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const myEvents = events.filter(
    (event) => event.my_reservation_status === 'confirmed' || event.my_reservation_status === 'waitlisted',
  );

  if (isLoading) return <LoadingScreen />;

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    setIsProfileSaving(true);
    setProfileMessage(null);
    setProfileError(null);

    try {
      await updateMyProfile(name, affiliation || null);
      setProfileMessage('表示名を保存しました。');
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '表示名の保存に失敗しました。');
    } finally {
      setIsProfileSaving(false);
    }
  }

  return (
    <section className="page-section" aria-labelledby="my-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">My Schedule</p>
          <h2 id="my-title">自分の予約</h2>
        </div>
      </div>

      <form className="profile-panel" onSubmit={handleProfileSubmit}>
        <label>
          表示名またはニックネーム
          <input value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label>
          所属
          <input value={affiliation} onChange={(event) => setAffiliation(event.target.value)} placeholder="任意" />
        </label>
        <button className="primary-button" type="submit" disabled={isProfileSaving}>
          {isProfileSaving ? '保存中' : '表示名を保存'}
        </button>
        {profileMessage && <p className="notice">{profileMessage}</p>}
        {profileError && <p className="notice error">{profileError}</p>}
      </form>

      {error && <p className="notice error">{error}</p>}

      <div className="event-list">
        {myEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isBusy={busyEventId === event.id}
            onReserve={reserve}
            onCancel={cancel}
          />
        ))}
      </div>

      {myEvents.length === 0 && <p className="empty-state">参加中またはキャンセル待ちの予定はありません。</p>}
    </section>
  );
}
