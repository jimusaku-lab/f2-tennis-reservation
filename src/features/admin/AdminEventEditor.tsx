import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { defaultResponseDeadline, fromInputDateTime, toInputDateTime } from '../../lib/date';
import type { AdminEvent, EventFormValues } from '../../lib/types';

const defaultValues = (): EventFormValues => {
  const start = new Date();
  start.setDate(start.getDate() + 28);
  const daysUntilSunday = (7 - start.getDay()) % 7;
  start.setDate(start.getDate() + daysUntilSunday);
  start.setHours(8, 0, 0, 0);
  const end = new Date(start);
  end.setHours(11, 0, 0, 0);
  const responseDeadline = new Date(start);
  responseDeadline.setDate(responseDeadline.getDate() - 2);
  responseDeadline.setHours(22, 0, 0, 0);

  return {
    title: '練習会',
    starts_at: toInputDateTime(start.toISOString()),
    ends_at: toInputDateTime(end.toISOString()),
    response_deadline: toInputDateTime(responseDeadline.toISOString()),
    location: '川崎ゴルフ',
    court_name: '',
    capacity: 10,
    note: '',
    status: 'published',
  };
};

export function AdminEventEditor() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [values, setValues] = useState<EventFormValues>(defaultValues);
  const [isLoading, setIsLoading] = useState(Boolean(eventId));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    api
      .listAdminEvents()
      .then((items) => {
        setEvents(items);
        const event = items.find((item) => item.id === eventId);
        if (!event) return;
        setValues({
          title: event.title,
          starts_at: toInputDateTime(event.starts_at),
          ends_at: toInputDateTime(event.ends_at),
          response_deadline: toInputDateTime(event.response_deadline ?? defaultResponseDeadline(event.starts_at)),
          location: event.location,
          court_name: event.court_name ?? '',
          capacity: event.capacity,
          note: event.note ?? '',
          status: event.status,
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : '予定の取得に失敗しました。'))
      .finally(() => setIsLoading(false));
  }, [eventId]);

  const eventExists = useMemo(() => !eventId || events.length === 0 || events.some((event) => event.id === eventId), [eventId, events]);
  const currentEvent = useMemo(() => events.find((event) => event.id === eventId), [eventId, events]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      await api.upsertEvent(
        {
          ...values,
          starts_at: fromInputDateTime(values.starts_at),
          ends_at: fromInputDateTime(values.ends_at),
          response_deadline: values.response_deadline ? fromInputDateTime(values.response_deadline) : '',
          capacity: Number(values.capacity),
        },
        eventId,
      );
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!eventId || !currentEvent) return;

    setError(null);
    try {
      const detail = await api.getEventDetail(eventId);
      const confirmedCount = detail?.confirmed_count ?? 0;
      const waitlistedCount = detail?.waitlisted_count ?? 0;
      const activeCount = confirmedCount + waitlistedCount;
      const warning =
        activeCount > 0
          ? `この予定には参加者 ${confirmedCount} 人、キャンセル待ち ${waitlistedCount} 人がいます。\n削除するとメンバー画面には表示されなくなります。中止を知らせたい場合は削除ではなく「中止」を使ってください。\n\n削除しますか？`
          : 'この予定を削除します。削除後はメンバー画面には表示されません。\n\n削除しますか？';

      if (!window.confirm(warning)) return;

      setIsDeleting(true);
      await api.deleteEvent(eventId);
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました。');
    } finally {
      setIsDeleting(false);
    }
  }

  if (!eventExists) return <Navigate to="/admin" replace />;

  return (
    <section className="page-section" aria-labelledby="editor-title">
      <Link className="back-link" to="/admin">
        管理へ戻る
      </Link>
      <div className="section-header">
        <div>
          <p className="eyebrow">Event</p>
          <h2 id="editor-title">{eventId ? '予定編集' : '予定作成'}</h2>
        </div>
      </div>

      {isLoading ? (
        <p className="empty-state">読み込み中</p>
      ) : (
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            タイトル
            <input value={values.title} onChange={(event) => setValues({ ...values, title: event.target.value })} required />
          </label>
          <label>
            開始
            <input
              type="datetime-local"
              value={values.starts_at}
              onChange={(event) => setValues({ ...values, starts_at: event.target.value })}
              required
            />
          </label>
          <label>
            終了
            <input
              type="datetime-local"
              value={values.ends_at}
              onChange={(event) => setValues({ ...values, ends_at: event.target.value })}
              required
            />
          </label>
          <label>
            回答期限
            <input
              type="datetime-local"
              value={values.response_deadline}
              onChange={(event) => setValues({ ...values, response_deadline: event.target.value })}
              required
            />
          </label>
          <label>
            場所
            <input value={values.location} onChange={(event) => setValues({ ...values, location: event.target.value })} required />
          </label>
          <label>
            コート
            <input value={values.court_name} onChange={(event) => setValues({ ...values, court_name: event.target.value })} />
          </label>
          <label>
            定員
            <input
              type="number"
              min="1"
              value={values.capacity}
              onChange={(event) => setValues({ ...values, capacity: Number(event.target.value) })}
              required
            />
          </label>
          <label>
            状態
            <select value={values.status} onChange={(event) => setValues({ ...values, status: event.target.value as EventFormValues['status'] })}>
              <option value="draft">下書き</option>
              <option value="published">公開</option>
              <option value="cancelled">中止</option>
              {values.status === 'deleted' && <option value="deleted">削除済み</option>}
            </select>
          </label>
          <label>
            備考
            <textarea value={values.note} onChange={(event) => setValues({ ...values, note: event.target.value })} rows={4} />
          </label>
          {error && <p className="notice error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? '保存中' : '保存'}
          </button>
          {eventId && values.status !== 'deleted' && (
            <button className="danger-button" type="button" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? '削除中' : '予定を削除'}
            </button>
          )}
        </form>
      )}
    </section>
  );
}
