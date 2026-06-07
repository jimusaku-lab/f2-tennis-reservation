import { EventCard } from '../../components/EventCard';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useEventCards } from './useEventCards';

export function EventsPage() {
  const { events, isLoading, busyEventId, error, reserve, cancel } = useEventCards();

  if (isLoading) return <LoadingScreen />;

  return (
    <section className="page-section" aria-labelledby="events-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Upcoming</p>
          <h2 id="events-title">今後の予定</h2>
        </div>
      </div>

      {error && <p className="notice error">{error}</p>}

      <div className="event-list">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isBusy={busyEventId === event.id}
            onReserve={reserve}
            onCancel={cancel}
          />
        ))}
      </div>

      {events.length === 0 && <p className="empty-state">公開中の予定はありません。</p>}
    </section>
  );
}
