import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import type { EventCard, ResponseStatusInput } from '../../lib/types';

export function useEventCards() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setError(null);
    const data = await api.listEventCards();
    setEvents(data);
  }, []);

  useEffect(() => {
    reload()
      .catch((err) => setError(err instanceof Error ? err.message : '予定の取得に失敗しました。'))
      .finally(() => setIsLoading(false));
  }, [reload]);

  const reserve = useCallback(async (eventId: string) => {
    setBusyEventId(eventId);
    setError(null);
    try {
      const nextEvents = await api.reserveEvent(eventId);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予約に失敗しました。');
    } finally {
      setBusyEventId(null);
    }
  }, []);

  const cancel = useCallback(async (eventId: string) => {
    setBusyEventId(eventId);
    setError(null);
    try {
      const nextEvents = await api.cancelReservation(eventId);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'キャンセルに失敗しました。');
    } finally {
      setBusyEventId(null);
    }
  }, []);

  const setResponse = useCallback(async (eventId: string, status: ResponseStatusInput, comment: string) => {
    setBusyEventId(eventId);
    setError(null);
    try {
      const nextEvents = await api.setEventResponse(eventId, status, comment);
      setEvents(nextEvents);
    } catch (err) {
      setError(err instanceof Error ? err.message : '回答に失敗しました。');
    } finally {
      setBusyEventId(null);
    }
  }, []);

  return { events, isLoading, busyEventId, error, reserve, cancel, setResponse, reload };
}
