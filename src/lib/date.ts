export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(value));
}

export function formatTimeRange(startsAt: string, endsAt: string) {
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${formatter.format(new Date(startsAt))}-${formatter.format(new Date(endsAt))}`;
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function toInputDateTime(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromInputDateTime(value: string) {
  return new Date(value).toISOString();
}

export function isPastEvent(startsAt: string) {
  return new Date(startsAt).getTime() <= Date.now();
}

export function defaultResponseDeadline(startsAt: string) {
  const deadline = new Date(startsAt);
  deadline.setDate(deadline.getDate() - 2);
  deadline.setHours(22, 0, 0, 0);
  return deadline.toISOString();
}

export function effectiveDeadline(responseDeadline: string | null, startsAt: string) {
  return responseDeadline ?? defaultResponseDeadline(startsAt);
}

export function isPastDeadline(responseDeadline: string | null, startsAt: string) {
  return new Date(effectiveDeadline(responseDeadline, startsAt)).getTime() <= Date.now();
}
