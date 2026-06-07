import { AlertTriangle, Check, Clock, MapPin, UserCheck, Users, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { effectiveDeadline, formatDate, formatDateTime, formatTimeRange, isPastDeadline, isPastEvent } from '../lib/date';
import type { EventCard as EventCardType } from '../lib/types';

type Props = {
  event: EventCardType;
  isBusy?: boolean;
  onReserve: (eventId: string) => void;
  onCancel: (eventId: string) => void;
};

export function EventCard({ event, isBusy, onReserve, onCancel }: Props) {
  const isCancelled = event.status === 'cancelled';
  const isPast = isPastEvent(event.starts_at);
  const isDeadlinePast = isPastDeadline(event.response_deadline, event.starts_at);
  const isReserved = event.my_reservation_status === 'confirmed' || event.my_reservation_status === 'waitlisted';
  const isFull = event.confirmed_count >= event.capacity;
  const canReserve = event.status === 'published' && !isPast && !isDeadlinePast && !isReserved;
  const canCancel = event.status === 'published' && !isPast && !isDeadlinePast && isReserved;

  return (
    <article className={`event-card ${isCancelled ? 'is-cancelled' : ''}`}>
      <Link to={`/events/${event.id}`} className="event-card-main">
        <div className="date-block">
          <strong>{formatDate(event.starts_at)}</strong>
          <span>{formatTimeRange(event.starts_at, event.ends_at)}</span>
        </div>
        <div className="event-summary">
          <div className="event-title-row">
            <h2>{event.title}</h2>
            <StatusBadge event={event} />
          </div>
          <p className="meta-line">
            <MapPin size={16} aria-hidden="true" />
            {event.location}
            {event.court_name ? ` / ${event.court_name}` : ''}
          </p>
          <p className="meta-line">
            <Clock size={16} aria-hidden="true" />
            回答期限 {formatDateTime(effectiveDeadline(event.response_deadline, event.starts_at))}
          </p>
          <div className="event-metrics">
            <span>
              <Users size={16} aria-hidden="true" />
              {event.confirmed_count}/{event.capacity}
            </span>
            {event.waitlisted_count > 0 && (
              <span>
                <Clock size={16} aria-hidden="true" />
                待ち {event.waitlisted_count}
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="event-action-row">
        {canCancel ? (
          <button className="danger-button" type="button" disabled={isBusy} onClick={() => onCancel(event.id)}>
            <X size={18} aria-hidden="true" />
            キャンセル
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={!canReserve || isBusy} onClick={() => onReserve(event.id)}>
            {isFull ? <Clock size={18} aria-hidden="true" /> : <Check size={18} aria-hidden="true" />}
            {isCancelled ? '中止' : isPast || isDeadlinePast ? '締切' : isFull ? 'キャンセル待ち' : '参加する'}
          </button>
        )}
      </div>
    </article>
  );
}

function StatusBadge({ event }: { event: EventCardType }) {
  if (event.status === 'cancelled') {
    return (
      <span className="status-badge cancelled">
        <AlertTriangle size={14} aria-hidden="true" />
        中止
      </span>
    );
  }

  if (event.my_reservation_status === 'confirmed') {
    return (
      <span className="status-badge confirmed">
        <UserCheck size={14} aria-hidden="true" />
        参加中
      </span>
    );
  }

  if (event.my_reservation_status === 'waitlisted') {
    return <span className="status-badge waitlisted">待ち {event.my_waitlist_position ?? '-'}</span>;
  }

  if (event.my_reservation_status === 'declined') {
    return <span className="status-badge declined">不参加</span>;
  }

  if (event.my_reservation_status === 'tentative') {
    return <span className="status-badge tentative">未定</span>;
  }

  if (event.my_reservation_status === 'cancelled') {
    return <span className="status-badge neutral">キャンセル済み</span>;
  }

  return <span className="status-badge neutral">未予約</span>;
}
