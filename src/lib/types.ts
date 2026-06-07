export type MemberRole = 'member' | 'admin';
export type MemberStatus = 'pending' | 'invited' | 'active' | 'rejected' | 'disabled';
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'deleted';
export type AnswerStatus = 'confirmed' | 'declined' | 'tentative' | 'waitlisted' | 'cancelled';
export type ReservationStatus = AnswerStatus | null;

export type Member = {
  id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  affiliation: string | null;
  role: MemberRole;
  status: MemberStatus;
  created_at: string;
  last_seen_at: string | null;
};

export type EventCard = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  response_deadline: string | null;
  location: string;
  court_name: string | null;
  capacity: number;
  note: string | null;
  status: EventStatus;
  confirmed_count: number;
  declined_count: number;
  tentative_count: number;
  waitlisted_count: number;
  unanswered_count: number;
  my_reservation_status: ReservationStatus;
  my_waitlist_position: number | null;
};

export type Reservation = {
  id: string;
  event_id: string;
  member_id: string;
  status: AnswerStatus;
  waitlist_position: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  event?: EventCard;
};

export type AdminEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  response_deadline: string | null;
  location: string;
  court_name: string | null;
  capacity: number;
  note: string | null;
  status: EventStatus;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type EventFormValues = {
  title: string;
  starts_at: string;
  ends_at: string;
  response_deadline: string;
  location: string;
  court_name: string;
  capacity: number;
  note: string;
  status: EventStatus;
};

export type EventAnswer = {
  reservation_id: string;
  member_id: string;
  member_name: string;
  affiliation: string | null;
  status: AnswerStatus;
  comment: string | null;
  waitlist_position: number | null;
  updated_at: string;
};

export type EventDetail = EventCard & {
  answers: EventAnswer[];
};

export type ResponseStatusInput = 'declined' | 'tentative';

export type InviteResult = {
  email_status: 'sent' | 'skipped';
  message: string;
};

export type MembershipApplicationResult = {
  email: string;
  status: MemberStatus;
  message: string;
};
