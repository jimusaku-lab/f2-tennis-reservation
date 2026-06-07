import type { EventAnswer, EventCard, Member, Reservation } from './types';

const now = new Date();
const addDays = (days: number, hour: number, minutes = 0) => {
  const date = new Date(now);
  date.setDate(now.getDate() + days);
  date.setHours(hour, minutes, 0, 0);
  return date.toISOString();
};

const responseDeadlineFor = (startsAt: string) => {
  const date = new Date(startsAt);
  date.setDate(date.getDate() - 2);
  date.setHours(22, 0, 0, 0);
  return date.toISOString();
};

export const demoMember: Member = {
  id: 'demo-member',
  auth_user_id: 'demo-user',
  name: 'デモ管理者',
  email: 'demo@example.com',
  affiliation: '運営',
  role: 'admin',
  status: 'active',
  created_at: now.toISOString(),
  last_seen_at: now.toISOString(),
};

export const demoMembers: Member[] = [
  demoMember,
  {
    id: 'pending-member-1',
    auth_user_id: null,
    name: '申請 太郎',
    email: 'pending@example.com',
    affiliation: '川崎',
    role: 'member',
    status: 'pending',
    created_at: addDays(-1, 10),
    last_seen_at: null,
  },
];

export const demoEvents: EventCard[] = [
  (() => {
    const startsAt = addDays(2, 9);
    return {
    id: 'event-1',
    title: '日曜朝 練習会',
    starts_at: startsAt,
    ends_at: addDays(2, 11),
    response_deadline: responseDeadlineFor(startsAt),
    location: '市営テニスコート',
    court_name: 'A・B面',
    capacity: 8,
    note: 'アップ後にダブルス形式で回します。',
    status: 'published',
    confirmed_count: 5,
    declined_count: 2,
    tentative_count: 1,
    waitlisted_count: 0,
    unanswered_count: 4,
    my_reservation_status: null,
    my_waitlist_position: null,
    };
  })(),
  (() => {
    const startsAt = addDays(5, 19);
    return {
    id: 'event-2',
    title: '平日ナイター',
    starts_at: startsAt,
    ends_at: addDays(5, 21),
    response_deadline: responseDeadlineFor(startsAt),
    location: '中央公園コート',
    court_name: '3番',
    capacity: 4,
    note: '定員到達時はキャンセル待ちになります。',
    status: 'published',
    confirmed_count: 4,
    declined_count: 1,
    tentative_count: 1,
    waitlisted_count: 1,
    unanswered_count: 5,
    my_reservation_status: null,
    my_waitlist_position: null,
    };
  })(),
  (() => {
    const startsAt = addDays(7, 13);
    return {
    id: 'event-3',
    title: '雨天中止: 土曜練習',
    starts_at: startsAt,
    ends_at: addDays(7, 15),
    response_deadline: responseDeadlineFor(startsAt),
    location: '河川敷コート',
    court_name: '2番',
    capacity: 6,
    note: '天候不良のため中止です。',
    status: 'cancelled',
    confirmed_count: 0,
    declined_count: 0,
    tentative_count: 0,
    waitlisted_count: 0,
    unanswered_count: 12,
    my_reservation_status: null,
    my_waitlist_position: null,
    };
  })(),
];

export const demoReservations: Reservation[] = [];

export const demoAnswers: Record<string, EventAnswer[]> = {
  'event-1': [
    {
      reservation_id: 'answer-1',
      member_id: 'member-1',
      member_name: '佐藤 健',
      affiliation: '川崎',
      status: 'confirmed',
      comment: '参加します',
      waitlist_position: null,
      updated_at: addDays(-1, 21),
    },
    {
      reservation_id: 'answer-2',
      member_id: 'member-2',
      member_name: '鈴木 花',
      affiliation: '横浜',
      status: 'confirmed',
      comment: null,
      waitlist_position: null,
      updated_at: addDays(-1, 22),
    },
    {
      reservation_id: 'answer-3',
      member_id: 'member-3',
      member_name: '田中 誠',
      affiliation: '川崎',
      status: 'declined',
      comment: '午前は都合がつきません',
      waitlist_position: null,
      updated_at: addDays(0, 8),
    },
    {
      reservation_id: 'answer-4',
      member_id: 'member-4',
      member_name: '高橋 美咲',
      affiliation: '東京',
      status: 'tentative',
      comment: '前日までに確定します',
      waitlist_position: null,
      updated_at: addDays(0, 9),
    },
  ],
  'event-2': [
    {
      reservation_id: 'answer-5',
      member_id: 'member-5',
      member_name: '山本 翔',
      affiliation: '川崎',
      status: 'confirmed',
      comment: null,
      waitlist_position: null,
      updated_at: addDays(-1, 19),
    },
    {
      reservation_id: 'answer-6',
      member_id: 'member-6',
      member_name: '伊藤 葵',
      affiliation: '横浜',
      status: 'waitlisted',
      comment: '空きが出たら参加します',
      waitlist_position: 1,
      updated_at: addDays(0, 7),
    },
  ],
  'event-3': [],
};
