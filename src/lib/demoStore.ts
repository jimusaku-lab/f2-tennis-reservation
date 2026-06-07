import { demoAnswers, demoEvents, demoMember, demoMembers } from './mockData';
import type {
  AnswerStatus,
  EventAnswer,
  EventCard,
  EventDetail,
  EventFormValues,
  Member,
  MembershipApplicationResult,
  MemberRole,
  MemberStatus,
  ResponseStatusInput,
} from './types';
import { defaultResponseDeadline } from './date';

const storageKey = 'tennis-demo-events';
const answersStorageKey = 'tennis-demo-answers';
const memberStorageKey = 'tennis-demo-member';
const membersStorageKey = 'tennis-demo-members';
const versionStorageKey = 'tennis-demo-version';
const demoDataVersion = 'f2-public-apply-20260607';

function ensureDemoVersion() {
  if (localStorage.getItem(versionStorageKey) === demoDataVersion) return;
  localStorage.removeItem(storageKey);
  localStorage.removeItem(answersStorageKey);
  localStorage.removeItem(memberStorageKey);
  localStorage.removeItem(membersStorageKey);
  localStorage.setItem(versionStorageKey, demoDataVersion);
}

function readEvents(): EventCard[] {
  ensureDemoVersion();
  const raw = localStorage.getItem(storageKey);
  if (!raw) return demoEvents;

  try {
    const storedEvents = JSON.parse(raw) as EventCard[];
    return storedEvents.map((event) => {
      const fallback = demoEvents.find((item) => item.id === event.id);
      return {
        ...event,
        response_deadline: event.response_deadline ?? fallback?.response_deadline ?? defaultResponseDeadline(event.starts_at),
        declined_count: event.declined_count ?? fallback?.declined_count ?? 0,
        tentative_count: event.tentative_count ?? fallback?.tentative_count ?? 0,
        waitlisted_count: event.waitlisted_count ?? fallback?.waitlisted_count ?? 0,
        unanswered_count: event.unanswered_count ?? fallback?.unanswered_count ?? 0,
      };
    });
  } catch {
    return demoEvents;
  }
}

function writeEvents(events: EventCard[]) {
  localStorage.setItem(storageKey, JSON.stringify(events));
}

function readAnswers(): Record<string, EventAnswer[]> {
  ensureDemoVersion();
  const raw = localStorage.getItem(answersStorageKey);
  if (!raw) return demoAnswers;

  try {
    return JSON.parse(raw) as Record<string, EventAnswer[]>;
  } catch {
    return demoAnswers;
  }
}

function writeAnswers(answers: Record<string, EventAnswer[]>) {
  localStorage.setItem(answersStorageKey, JSON.stringify(answers));
}

function readMembers(): Member[] {
  ensureDemoVersion();
  const raw = localStorage.getItem(membersStorageKey);
  if (!raw) return demoMembers;

  try {
    return JSON.parse(raw) as Member[];
  } catch {
    return demoMembers;
  }
}

function writeMembers(members: Member[]) {
  localStorage.setItem(membersStorageKey, JSON.stringify(members));
}

function upsertDemoAnswer(eventId: string, status: AnswerStatus, comment: string | null, waitlistPosition: number | null) {
  const answers = readAnswers();
  const eventAnswers = answers[eventId] ?? [];
  const current = eventAnswers.find((answer) => answer.member_id === demoMember.id);
  const nextAnswer: EventAnswer = {
    reservation_id: current?.reservation_id ?? `answer-${crypto.randomUUID()}`,
    member_id: demoMember.id,
    member_name: demoMember.name,
    affiliation: demoMember.affiliation,
    status,
    comment: comment?.trim() || null,
    waitlist_position: waitlistPosition,
    updated_at: new Date().toISOString(),
  };

  answers[eventId] = current
    ? eventAnswers.map((answer) => (answer.member_id === demoMember.id ? nextAnswer : answer))
    : [nextAnswer, ...eventAnswers];

  writeAnswers(answers);
}

function updateCountsForStatusChange(event: EventCard, previous: AnswerStatus | null, next: AnswerStatus): EventCard {
  const decrement = (status: AnswerStatus | null, current: EventCard) => {
    if (status === 'confirmed') return { ...current, confirmed_count: Math.max(0, current.confirmed_count - 1) };
    if (status === 'waitlisted') return { ...current, waitlisted_count: Math.max(0, current.waitlisted_count - 1) };
    if (status === 'declined') return { ...current, declined_count: Math.max(0, current.declined_count - 1) };
    if (status === 'tentative') return { ...current, tentative_count: Math.max(0, current.tentative_count - 1) };
    return current;
  };

  const increment = (status: AnswerStatus, current: EventCard) => {
    if (status === 'confirmed') return { ...current, confirmed_count: current.confirmed_count + 1 };
    if (status === 'waitlisted') return { ...current, waitlisted_count: current.waitlisted_count + 1 };
    if (status === 'declined') return { ...current, declined_count: current.declined_count + 1 };
    if (status === 'tentative') return { ...current, tentative_count: current.tentative_count + 1 };
    return current;
  };

  const withoutPrevious = decrement(previous, event);
  const withNext = increment(next, withoutPrevious);
  return {
    ...withNext,
    unanswered_count: previous ? withNext.unanswered_count : Math.max(0, withNext.unanswered_count - 1),
  };
}

export const demoStore = {
  getMember(): Member {
    ensureDemoVersion();
    const raw = localStorage.getItem(memberStorageKey);
    if (!raw) return demoMember;

    try {
      return { ...demoMember, ...(JSON.parse(raw) as Partial<Member>) };
    } catch {
      return demoMember;
    }
  },

  updateMyProfile(name: string, affiliation: string | null): Member {
    const nextMember = {
      ...this.getMember(),
      name,
      affiliation,
    };
    localStorage.setItem(memberStorageKey, JSON.stringify(nextMember));
    writeMembers(readMembers().map((member) => (member.id === nextMember.id ? nextMember : member)));
    return nextMember;
  },

  requestMembership(email: string, name: string, affiliation: string | null): MembershipApplicationResult {
    const normalizedEmail = email.trim().toLowerCase();
    const members = readMembers();
    const existing = members.find((member) => member.email.toLowerCase() === normalizedEmail);

    if (existing?.status === 'active') {
      return {
        email: existing.email,
        status: existing.status,
        message: 'このメールアドレスは承認済みです。ログインリンクから利用できます。',
      };
    }

    if (existing?.status === 'invited') {
      const nextInvited = {
        ...existing,
        name: name.trim(),
        affiliation: affiliation?.trim() || null,
      };
      writeMembers(members.map((member) => (member.id === existing.id ? nextInvited : member)));
      return {
        email: existing.email,
        status: existing.status,
        message: 'このメールアドレスは招待済みです。ログインリンクから利用できます。',
      };
    }

    const nextMember: Member = {
      ...(existing ?? {
        id: crypto.randomUUID(),
        auth_user_id: null,
        role: 'member' as const,
        created_at: new Date().toISOString(),
        last_seen_at: null,
      }),
      email: normalizedEmail,
      name: name.trim(),
      affiliation: affiliation?.trim() || null,
      status: 'pending',
    };

    writeMembers(existing ? members.map((member) => (member.id === existing.id ? nextMember : member)) : [nextMember, ...members]);

    return {
      email: normalizedEmail,
      status: 'pending',
      message: '利用申請を受け付けました。管理者の承認後に予定一覧を利用できます。',
    };
  },

  listEvents(): EventCard[] {
    return readEvents()
      .filter((event) => event.status !== 'deleted')
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },

  listAdminEvents(): EventCard[] {
    return readEvents().sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  },

  getEventDetail(eventId: string): EventDetail | null {
    const event = readEvents().find((item) => item.id === eventId);
    if (!event || event.status === 'deleted') return null;

    return {
      ...event,
      answers: (readAnswers()[eventId] ?? []).sort((a, b) => {
        const weight = { confirmed: 0, waitlisted: 1, tentative: 2, declined: 3, cancelled: 4 };
        return weight[a.status] - weight[b.status] || a.updated_at.localeCompare(b.updated_at);
      }),
    };
  },

  reserve(eventId: string): EventCard[] {
    const events = readEvents().map((event) => {
      if (event.id !== eventId || event.status !== 'published') return event;
      if (event.my_reservation_status === 'confirmed' || event.my_reservation_status === 'waitlisted') return event;

      const previous = event.my_reservation_status;
      if (event.confirmed_count < event.capacity) {
        upsertDemoAnswer(event.id, 'confirmed', null, null);
        return {
          ...updateCountsForStatusChange(event, previous, 'confirmed'),
          my_reservation_status: 'confirmed' as const,
          my_waitlist_position: null,
        };
      }

      upsertDemoAnswer(event.id, 'waitlisted', null, event.waitlisted_count + 1);
      return {
        ...updateCountsForStatusChange(event, previous, 'waitlisted'),
        my_reservation_status: 'waitlisted' as const,
        my_waitlist_position: event.waitlisted_count + 1,
      };
    });
    writeEvents(events);
    return events;
  },

  cancel(eventId: string): EventCard[] {
    const events = readEvents().map((event) => {
      if (event.id !== eventId) return event;

      if (event.my_reservation_status === 'confirmed') {
        upsertDemoAnswer(event.id, 'cancelled', null, null);
        return {
          ...updateCountsForStatusChange(event, 'confirmed', 'cancelled'),
          my_reservation_status: 'cancelled' as const,
          my_waitlist_position: null,
        };
      }

      if (event.my_reservation_status === 'waitlisted') {
        upsertDemoAnswer(event.id, 'cancelled', null, null);
        return {
          ...updateCountsForStatusChange(event, 'waitlisted', 'cancelled'),
          my_reservation_status: 'cancelled' as const,
          my_waitlist_position: null,
        };
      }

      return event;
    });
    writeEvents(events);
    return events;
  },

  setResponse(eventId: string, status: ResponseStatusInput, comment: string): EventCard[] {
    const events = readEvents().map((event) => {
      if (event.id !== eventId || event.status !== 'published') return event;
      const previous = event.my_reservation_status;
      upsertDemoAnswer(event.id, status, comment, null);
      return {
        ...updateCountsForStatusChange(event, previous, status),
        my_reservation_status: status,
        my_waitlist_position: null,
      };
    });
    writeEvents(events);
    return events;
  },

  upsertEvent(values: EventFormValues, id?: string): EventCard[] {
    const events = readEvents();
    const next = id
      ? events.map((event) =>
          event.id === id
            ? {
                ...event,
                ...values,
                response_deadline: values.response_deadline || null,
                court_name: values.court_name || null,
                note: values.note || null,
              }
            : event,
        )
      : [
          ...events,
          {
            id: crypto.randomUUID(),
            ...values,
            response_deadline: values.response_deadline || null,
            court_name: values.court_name || null,
            note: values.note || null,
            confirmed_count: 0,
            declined_count: 0,
            tentative_count: 0,
            waitlisted_count: 0,
            unanswered_count: 1,
            my_reservation_status: null,
            my_waitlist_position: null,
          },
        ];

    writeEvents(next);
    return next;
  },

  deleteEvent(id: string): EventCard[] {
    const events = readEvents().map((event) =>
      event.id === id
        ? {
            ...event,
            status: 'deleted' as const,
            deleted_at: new Date().toISOString(),
            deleted_by: demoMember.id,
          }
        : event,
    );
    writeEvents(events);
    return events;
  },

  listMembers(): Member[] {
    return readMembers();
  },

  updateMemberProfile(memberId: string, name: string, affiliation: string | null): Member[] {
    if (memberId === demoMember.id) this.updateMyProfile(name, affiliation);
    writeMembers(readMembers().map((member) => (member.id === memberId ? { ...member, name: name.trim(), affiliation } : member)));
    return this.listMembers();
  },

  updateMemberStatus(memberId: string, status: MemberStatus): Member[] {
    writeMembers(readMembers().map((member) => (member.id === memberId ? { ...member, status } : member)));
    return this.listMembers();
  },

  inviteMember(email: string, name: string, role: MemberRole): Member[] {
    const normalizedEmail = email.trim().toLowerCase();
    const members = readMembers();
    const existing = members.find((member) => member.email.toLowerCase() === normalizedEmail);
    const nextMember: Member = {
      ...(existing ?? {
        id: crypto.randomUUID(),
        auth_user_id: null,
        affiliation: null,
        created_at: new Date().toISOString(),
        last_seen_at: null,
      }),
      email: normalizedEmail,
      name: name.trim(),
      role,
      status: 'invited',
    };

    writeMembers(existing ? members.map((member) => (member.id === existing.id ? nextMember : member)) : [nextMember, ...members]);
    return this.listMembers();
  },
};
