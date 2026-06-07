import { ArrowLeft, Check, Clock, HelpCircle, MapPin, UserX, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { LoadingScreen } from '../../components/LoadingScreen';
import { api } from '../../lib/api';
import { effectiveDeadline, formatDate, formatDateTime, formatTimeRange, isPastDeadline, isPastEvent } from '../../lib/date';
import type { AnswerStatus, EventDetail, ResponseStatusInput } from '../../lib/types';
import { useEventCards } from './useEventCards';

const answerFilters = [
  { value: 'priority', label: '参加・待ち' },
  { value: 'all', label: 'すべて' },
  { value: 'confirmed', label: '参加' },
  { value: 'waitlisted', label: '待ち' },
  { value: 'declined', label: '不参加' },
  { value: 'tentative', label: '未定' },
] as const;

type AnswerFilter = (typeof answerFilters)[number]['value'];

export function EventDetailPage() {
  const { eventId } = useParams();
  const { events, isLoading, busyEventId, error, reserve, cancel, setResponse } = useEventCards();
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [filter, setFilter] = useState<AnswerFilter>('priority');
  const event = detail ?? events.find((item) => item.id === eventId);

  useEffect(() => {
    if (!eventId) return;
    api
      .getEventDetail(eventId)
      .then(setDetail)
      .catch((err) => setDetailError(err instanceof Error ? err.message : '予定詳細の取得に失敗しました。'));
  }, [eventId, events]);

  if (isLoading) return <LoadingScreen />;
  if (!event) return <p className="empty-state">予定が見つかりません。</p>;

  const currentEvent = event;
  const isReserved = currentEvent.my_reservation_status === 'confirmed' || currentEvent.my_reservation_status === 'waitlisted';
  const isClosed =
    currentEvent.status !== 'published' || isPastEvent(currentEvent.starts_at) || isPastDeadline(currentEvent.response_deadline, currentEvent.starts_at);
  const answers = detail?.answers ?? [];
  const filteredAnswers = answers.filter((answer) => {
    if (filter === 'all') return true;
    if (filter === 'priority') return answer.status === 'confirmed' || answer.status === 'waitlisted';
    return answer.status === filter;
  });

  async function handleReserve() {
    await reserve(currentEvent.id);
    const nextDetail = await api.getEventDetail(currentEvent.id);
    setDetail(nextDetail);
  }

  async function handleCancel() {
    await cancel(currentEvent.id);
    const nextDetail = await api.getEventDetail(currentEvent.id);
    setDetail(nextDetail);
  }

  async function handleResponse(status: ResponseStatusInput) {
    await setResponse(currentEvent.id, status, comment);
    setComment('');
    const nextDetail = await api.getEventDetail(currentEvent.id);
    setDetail(nextDetail);
  }

  function handleResponseSubmit(status: ResponseStatusInput) {
    return (formEvent: FormEvent) => {
      formEvent.preventDefault();
      handleResponse(status);
    };
  }

  return (
    <section className="page-section detail-page" aria-labelledby="event-title">
      <Link className="back-link" to="/events">
        <ArrowLeft size={18} aria-hidden="true" />
        予定へ戻る
      </Link>
      <div className="detail-header">
        <p className="eyebrow">{formatDate(event.starts_at)}</p>
        <h2 id="event-title">{event.title}</h2>
      </div>

      {error && <p className="notice error">{error}</p>}
      {detailError && <p className="notice error">{detailError}</p>}

      <div className="detail-grid">
        <div>
          <Clock size={18} aria-hidden="true" />
          <span>{formatTimeRange(event.starts_at, event.ends_at)}</span>
        </div>
        <div>
          <MapPin size={18} aria-hidden="true" />
          <span>
            {event.location}
            {event.court_name ? ` / ${event.court_name}` : ''}
          </span>
        </div>
        <div>
          <Users size={18} aria-hidden="true" />
          <span>
            参加 {event.confirmed_count}/{event.capacity}
            {event.waitlisted_count > 0 ? ` / 待ち ${event.waitlisted_count}` : ''}
          </span>
        </div>
        <div className="deadline-panel">
          <Clock size={18} aria-hidden="true" />
          <span>回答期限 {formatDateTime(effectiveDeadline(event.response_deadline, event.starts_at))}</span>
        </div>
      </div>

      {event.note && <p className="note-block">{event.note}</p>}

      <div className="summary-grid" aria-label="回答状況集計">
        <Metric label="定員" value={event.capacity} />
        <Metric label="参加" value={event.confirmed_count} emphasis />
        <Metric label="不参加" value={event.declined_count} />
        <Metric label="未定/その他" value={event.tentative_count} />
        <Metric label="キャンセル待ち" value={event.waitlisted_count} />
        <Metric label="未回答" value={event.unanswered_count} />
      </div>

      <form className="response-panel" onSubmit={handleResponseSubmit('tentative')}>
        {currentEvent.my_reservation_status === 'confirmed' && <p className="current-answer confirmed">参加中</p>}
        {currentEvent.my_reservation_status === 'waitlisted' && (
          <p className="current-answer waitlisted">キャンセル待ち {currentEvent.my_waitlist_position ?? '-'}</p>
        )}
        <label>
          出欠メモ
          <textarea
            value={comment}
            onChange={(inputEvent) => setComment(inputEvent.target.value)}
            placeholder="任意"
            rows={3}
            disabled={isClosed || busyEventId === event.id}
          />
        </label>
        <div className="response-actions">
          {!isReserved && (
            <button className="primary-button" type="button" disabled={isClosed || busyEventId === event.id} onClick={handleReserve}>
              <Check size={18} aria-hidden="true" />
              {event.confirmed_count >= event.capacity ? 'キャンセル待ち' : '参加する'}
            </button>
          )}
          <button className="secondary-button inline" type="button" disabled={isClosed || busyEventId === event.id} onClick={() => handleResponse('declined')}>
            <UserX size={18} aria-hidden="true" />
            不参加
          </button>
          <button className="secondary-button inline" type="submit" disabled={isClosed || busyEventId === event.id}>
            <HelpCircle size={18} aria-hidden="true" />
            未定/その他
          </button>
          {isReserved && (
            <button className="danger-button" type="button" disabled={isClosed || busyEventId === event.id} onClick={handleCancel}>
              <X size={18} aria-hidden="true" />
              キャンセル
            </button>
          )}
        </div>
      </form>

      <section className="answers-section" aria-labelledby="answers-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Answers</p>
            <h3 id="answers-title">回答者リスト</h3>
          </div>
        </div>
        <div className="segment-scroll" role="tablist" aria-label="回答者フィルター">
          {answerFilters.map((item) => (
            <button
              key={item.value}
              className={filter === item.value ? 'segment active' : 'segment'}
              type="button"
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="answer-list">
          {filteredAnswers.map((answer) => (
            <article className="answer-card" key={answer.reservation_id}>
              <div>
                <strong>{answer.member_name}</strong>
                <span>{answer.affiliation || '所属未設定'}</span>
              </div>
              <AnswerBadge status={answer.status} waitlistPosition={answer.waitlist_position} />
              {answer.comment && <p>{answer.comment}</p>}
              <time dateTime={answer.updated_at}>更新 {formatDateTime(answer.updated_at)}</time>
            </article>
          ))}
        </div>
        {filteredAnswers.length === 0 && <p className="empty-state">該当する回答はありません。</p>}
      </section>

      <div className="sticky-action">
        {isReserved ? (
          <button className="danger-button" type="button" disabled={isClosed || busyEventId === event.id} onClick={handleCancel}>
            キャンセル
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={isClosed || busyEventId === event.id} onClick={handleReserve}>
            {event.confirmed_count >= event.capacity ? 'キャンセル待ち' : '参加する'}
          </button>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={emphasis ? 'metric-card emphasis' : 'metric-card'}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function AnswerBadge({ status, waitlistPosition }: { status: AnswerStatus; waitlistPosition: number | null }) {
  const label = {
    confirmed: '参加',
    declined: '不参加',
    tentative: '未定',
    waitlisted: `待ち ${waitlistPosition ?? '-'}`,
    cancelled: 'キャンセル',
  }[status];

  return <span className={`status-badge ${status}`}>{label}</span>;
}
