create extension if not exists pgcrypto;
create extension if not exists citext;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  email citext not null unique,
  affiliation text,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'invited', 'active', 'rejected', 'disabled')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  response_deadline timestamptz,
  location text not null,
  court_name text,
  capacity integer not null check (capacity >= 1),
  note text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled', 'deleted')),
  created_by uuid references public.members(id) on delete set null,
  deleted_by uuid references public.members(id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_check check (ends_at > starts_at)
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  status text not null check (status in ('confirmed', 'declined', 'tentative', 'waitlisted', 'cancelled')),
  waitlist_position integer,
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id),
  constraint reservations_waitlist_position_check check (
    (status = 'waitlisted' and waitlist_position is not null and waitlist_position >= 1)
    or (status <> 'waitlisted' and waitlist_position is null)
  )
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email citext not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  token_hash text,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  type text not null,
  channel text not null default 'email' check (channel in ('email', 'push', 'line')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index reservations_event_status_idx on public.reservations (event_id, status, created_at);
create index events_starts_at_idx on public.events (starts_at);
create index members_email_idx on public.members (email);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch_updated_at
before update on public.events
for each row execute function public.touch_updated_at();

create trigger reservations_touch_updated_at
before update on public.reservations
for each row execute function public.touch_updated_at();

create or replace function public.default_response_deadline(p_starts_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select (
    date_trunc('day', p_starts_at at time zone 'Asia/Tokyo')
    - interval '2 days'
    + interval '22 hours'
  ) at time zone 'Asia/Tokyo';
$$;

create or replace function public.effective_response_deadline(p_response_deadline timestamptz, p_starts_at timestamptz)
returns timestamptz
language sql
immutable
as $$
  select coalesce(p_response_deadline, public.default_response_deadline(p_starts_at));
$$;

create or replace function public.current_member_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.members
  where auth_user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.current_member_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.members
    where auth_user_id = auth.uid()
      and status = 'active'
      and role = 'admin'
  );
$$;

create or replace function public.set_event_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by = public.current_member_id();
  end if;
  return new;
end;
$$;

create trigger events_set_created_by
before insert on public.events
for each row execute function public.set_event_created_by();

create or replace function public.recalculate_waitlist_positions(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.reservations r
  set waitlist_position = ranked.position
  from (
    select id, row_number() over (order by created_at, id)::integer as position
    from public.reservations
    where event_id = p_event_id
      and status = 'waitlisted'
  ) ranked
  where r.id = ranked.id;

  update public.reservations
  set waitlist_position = null
  where event_id = p_event_id
    and status <> 'waitlisted'
    and waitlist_position is not null;
end;
$$;

create or replace function public.promote_next_waitlisted(p_event_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_promoted public.reservations;
begin
  select * into v_promoted
  from public.reservations
  where event_id = p_event_id
    and status = 'waitlisted'
  order by created_at, id
  limit 1
  for update;

  if v_promoted.id is not null then
    update public.reservations
    set status = 'confirmed',
        waitlist_position = null,
        updated_at = now()
    where id = v_promoted.id
    returning * into v_promoted;

    insert into public.notifications (member_id, event_id, type)
    values (v_promoted.member_id, p_event_id, 'waitlist_promoted');
  end if;

  perform public.recalculate_waitlist_positions(p_event_id);
  return v_promoted;
end;
$$;

create or replace function public.request_membership(p_email text, p_name text, p_affiliation text default null)
returns table (
  email citext,
  status text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email citext;
  v_member public.members;
begin
  v_email := nullif(lower(trim(p_email)), '')::citext;
  if v_email is null then
    raise exception 'メールアドレスを入力してください。';
  end if;
  if nullif(trim(p_name), '') is null then
    raise exception '表示名またはニックネームを入力してください。';
  end if;

  select * into v_member
  from public.members m
  where m.email = v_email
  for update;

  if v_member.status = 'disabled' then
    raise exception 'このメールアドレスでは申請できません。';
  end if;

  if v_member.status = 'active' then
    email := v_member.email;
    status := v_member.status;
    message := 'このメールアドレスは承認済みです。ログインリンクから利用できます。';
    return next;
    return;
  end if;

  if v_member.status = 'invited' then
    update public.members
    set name = trim(p_name),
        affiliation = nullif(trim(coalesce(p_affiliation, '')), '')
    where id = v_member.id
    returning * into v_member;

    email := v_member.email;
    status := v_member.status;
    message := 'このメールアドレスは招待済みです。ログインリンクから利用できます。';
    return next;
    return;
  end if;

  if v_member.id is null then
    insert into public.members (email, name, affiliation, role, status)
    values (v_email, trim(p_name), nullif(trim(coalesce(p_affiliation, '')), ''), 'member', 'pending')
    returning * into v_member;
  else
    update public.members
    set name = trim(p_name),
        affiliation = nullif(trim(coalesce(p_affiliation, '')), ''),
        status = 'pending'
    where id = v_member.id
    returning * into v_member;
  end if;

  email := v_member.email;
  status := v_member.status;
  message := '利用申請を受け付けました。管理者の承認後に予定一覧を利用できます。';
  return next;
end;
$$;

create or replace function public.claim_member_profile()
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email citext;
  v_member public.members;
begin
  if auth.uid() is null then
    raise exception 'ログインが必要です。';
  end if;

  v_email := nullif(auth.jwt() ->> 'email', '')::citext;
  if v_email is null then
    raise exception 'メールアドレスを確認できません。';
  end if;

  select * into v_member
  from public.members
  where email = v_email
    and (auth_user_id is null or auth_user_id = auth.uid())
  for update;

  if v_member.id is null then
    raise exception '利用申請または招待がまだ登録されていません。';
  end if;

  if v_member.status = 'disabled' then
    raise exception 'このメンバーは無効化されています。';
  end if;

  update public.members
  set auth_user_id = auth.uid(),
      status = case when v_member.status = 'invited' then 'active' else v_member.status end,
      last_seen_at = now()
  where id = v_member.id
  returning * into v_member;

  if v_member.status = 'rejected' then
    return v_member;
  end if;

  if v_member.status = 'pending' then
    return v_member;
  end if;

  return v_member;
end;
$$;

create or replace function public.update_my_profile(p_name text, p_affiliation text default null)
returns public.members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_member public.members;
begin
  v_member_id := public.current_member_id();
  if v_member_id is null then
    raise exception '有効なメンバーではありません。';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception '表示名またはニックネームを入力してください。';
  end if;

  update public.members
  set name = trim(p_name),
      affiliation = nullif(trim(coalesce(p_affiliation, '')), ''),
      last_seen_at = now()
  where id = v_member_id
  returning * into v_member;

  return v_member;
end;
$$;

create or replace function public.get_event_cards()
returns table (
  id uuid,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  response_deadline timestamptz,
  location text,
  court_name text,
  capacity integer,
  note text,
  status text,
  confirmed_count integer,
  declined_count integer,
  tentative_count integer,
  waitlisted_count integer,
  unanswered_count integer,
  my_reservation_status text,
  my_waitlist_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.title,
    e.starts_at,
    e.ends_at,
    public.effective_response_deadline(e.response_deadline, e.starts_at) as response_deadline,
    e.location,
    e.court_name,
    e.capacity,
    e.note,
    e.status,
    (
      select count(*)::integer
      from public.reservations r
      where r.event_id = e.id
        and r.status = 'confirmed'
    ) as confirmed_count,
    (
      select count(*)::integer
      from public.reservations r
      where r.event_id = e.id
        and r.status = 'declined'
    ) as declined_count,
    (
      select count(*)::integer
      from public.reservations r
      where r.event_id = e.id
        and r.status = 'tentative'
    ) as tentative_count,
    (
      select count(*)::integer
      from public.reservations r
      where r.event_id = e.id
        and r.status = 'waitlisted'
    ) as waitlisted_count,
    greatest(
      0,
      (
        select count(*)::integer
        from public.members m
        where m.status = 'active'
      )
      -
      (
        select count(distinct r.member_id)::integer
        from public.reservations r
        where r.event_id = e.id
          and r.status in ('confirmed', 'declined', 'tentative', 'waitlisted')
      )
    ) as unanswered_count,
    mine.status as my_reservation_status,
    mine.waitlist_position as my_waitlist_position
  from public.events e
  left join public.reservations mine
    on mine.event_id = e.id
   and mine.member_id = public.current_member_id()
  where public.current_member_id() is not null
    and e.starts_at >= now()
    and e.status <> 'deleted'
    and (
      e.status in ('published', 'cancelled')
      or public.current_member_is_admin()
    )
  order by e.starts_at asc;
$$;

create or replace function public.reserve_event(p_event_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_event public.events;
  v_existing public.reservations;
  v_confirmed_count integer;
  v_waitlist_position integer;
  v_status text;
  v_reservation public.reservations;
begin
  v_member_id := public.current_member_id();
  if v_member_id is null then
    raise exception '有効なメンバーではありません。';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception '予定が見つかりません。';
  end if;
  if v_event.status <> 'published' then
    raise exception 'この予定は予約できません。';
  end if;
  if public.effective_response_deadline(v_event.response_deadline, v_event.starts_at) <= now() then
    raise exception '回答期限を過ぎた予定は予約できません。';
  end if;
  if v_event.starts_at <= now() then
    raise exception '開始済みの予定は予約できません。';
  end if;

  select * into v_existing
  from public.reservations
  where event_id = p_event_id
    and member_id = v_member_id
  for update;

  if v_existing.status in ('confirmed', 'waitlisted') then
    return v_existing;
  end if;

  select count(*)::integer into v_confirmed_count
  from public.reservations
  where event_id = p_event_id
    and status = 'confirmed';

  if v_confirmed_count < v_event.capacity then
    v_status := 'confirmed';
    v_waitlist_position := null;
  else
    v_status := 'waitlisted';
    select count(*)::integer + 1 into v_waitlist_position
    from public.reservations
    where event_id = p_event_id
      and status = 'waitlisted';
  end if;

  insert into public.reservations (event_id, member_id, status, waitlist_position)
  values (p_event_id, v_member_id, v_status, v_waitlist_position)
  on conflict (event_id, member_id)
  do update set
    created_at = case
      when reservations.status = 'cancelled' then now()
      when excluded.status = 'waitlisted' and reservations.status <> 'waitlisted' then now()
      else reservations.created_at
    end,
    status = excluded.status,
    waitlist_position = excluded.waitlist_position,
    updated_at = now()
  returning * into v_reservation;

  perform public.recalculate_waitlist_positions(p_event_id);

  insert into public.notifications (member_id, event_id, type)
  values (
    v_member_id,
    p_event_id,
    case when v_status = 'confirmed' then 'reservation_confirmed' else 'reservation_waitlisted' end
  );

  return v_reservation;
end;
$$;

create or replace function public.cancel_reservation(p_event_id uuid)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_event public.events;
  v_reservation public.reservations;
  v_previous_status text;
  v_promoted public.reservations;
begin
  v_member_id := public.current_member_id();
  if v_member_id is null then
    raise exception '有効なメンバーではありません。';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception '予定が見つかりません。';
  end if;
  if v_event.status <> 'published' then
    raise exception 'この予定はキャンセルできません。';
  end if;
  if public.effective_response_deadline(v_event.response_deadline, v_event.starts_at) <= now() then
    raise exception '回答期限を過ぎた予定はキャンセルできません。';
  end if;
  if v_event.starts_at <= now() then
    raise exception '開始済みの予定はキャンセルできません。';
  end if;

  select * into v_reservation
  from public.reservations
  where event_id = p_event_id
    and member_id = v_member_id
  for update;

  if v_reservation.id is null or v_reservation.status = 'cancelled' then
    raise exception '有効な予約がありません。';
  end if;

  v_previous_status := v_reservation.status;

  update public.reservations
  set status = 'cancelled',
      waitlist_position = null,
      updated_at = now()
  where id = v_reservation.id
  returning * into v_reservation;

  insert into public.notifications (member_id, event_id, type)
  values (v_member_id, p_event_id, 'reservation_cancelled');

  if v_previous_status = 'confirmed' then
    v_promoted := public.promote_next_waitlisted(p_event_id);
  end if;

  perform public.recalculate_waitlist_positions(p_event_id);

  return v_reservation;
end;
$$;

create or replace function public.set_event_response(p_event_id uuid, p_status text, p_comment text default null)
returns public.reservations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_event public.events;
  v_existing public.reservations;
  v_reservation public.reservations;
begin
  if p_status not in ('declined', 'tentative') then
    raise exception '不参加または未定のみ指定できます。';
  end if;

  v_member_id := public.current_member_id();
  if v_member_id is null then
    raise exception '有効なメンバーではありません。';
  end if;

  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception '予定が見つかりません。';
  end if;
  if v_event.status <> 'published' then
    raise exception 'この予定には回答できません。';
  end if;
  if public.effective_response_deadline(v_event.response_deadline, v_event.starts_at) <= now() then
    raise exception '回答期限を過ぎた予定には回答できません。';
  end if;
  if v_event.starts_at <= now() then
    raise exception '開始済みの予定には回答できません。';
  end if;

  select * into v_existing
  from public.reservations
  where event_id = p_event_id
    and member_id = v_member_id
  for update;

  insert into public.reservations (event_id, member_id, status, waitlist_position, comment)
  values (p_event_id, v_member_id, p_status, null, p_comment)
  on conflict (event_id, member_id)
  do update set
    status = excluded.status,
    waitlist_position = null,
    comment = excluded.comment,
    updated_at = now()
  returning * into v_reservation;

  insert into public.notifications (member_id, event_id, type)
  values (
    v_member_id,
    p_event_id,
    case when p_status = 'declined' then 'reservation_declined' else 'reservation_tentative' end
  );

  if v_existing.status = 'confirmed' then
    perform public.promote_next_waitlisted(p_event_id);
  else
    perform public.recalculate_waitlist_positions(p_event_id);
  end if;

  return v_reservation;
end;
$$;

create or replace function public.delete_event(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_event public.events;
begin
  if not public.current_member_is_admin() then
    raise exception '管理者のみ削除できます。';
  end if;

  v_member_id := public.current_member_id();

  update public.events
  set status = 'deleted',
      deleted_at = now(),
      deleted_by = v_member_id,
      updated_at = now()
  where id = p_event_id
  returning * into v_event;

  if v_event.id is null then
    raise exception '予定が見つかりません。';
  end if;

  return v_event;
end;
$$;

create or replace function public.get_event_detail(p_event_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with cards as (
    select *
    from public.get_event_cards()
    where id = p_event_id
  ),
  answer_rows as (
    select
      r.id as reservation_id,
      r.member_id,
      m.name as member_name,
      m.affiliation,
      r.status,
      r.comment,
      r.waitlist_position,
      r.updated_at
    from public.reservations r
    join public.members m on m.id = r.member_id
    where r.event_id = p_event_id
      and r.status in ('confirmed', 'declined', 'tentative', 'waitlisted', 'cancelled')
    order by
      case r.status
        when 'confirmed' then 1
        when 'waitlisted' then 2
        when 'tentative' then 3
        when 'declined' then 4
        else 5
      end,
      r.updated_at desc
  )
  select jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'response_deadline', c.response_deadline,
    'location', c.location,
    'court_name', c.court_name,
    'capacity', c.capacity,
    'note', c.note,
    'status', c.status,
    'confirmed_count', c.confirmed_count,
    'declined_count', c.declined_count,
    'tentative_count', c.tentative_count,
    'waitlisted_count', c.waitlisted_count,
    'unanswered_count', c.unanswered_count,
    'my_reservation_status', c.my_reservation_status,
    'my_waitlist_position', c.my_waitlist_position,
    'answers', coalesce(
      (
        select jsonb_agg(to_jsonb(answer_rows))
        from answer_rows
      ),
      '[]'::jsonb
    )
  )
  from cards c;
$$;

alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.reservations enable row level security;
alter table public.invitations enable row level security;
alter table public.notifications enable row level security;

create policy "members can read own profile and admins can read members"
on public.members for select
to authenticated
using (id = public.current_member_id() or public.current_member_is_admin());

create policy "admins can insert members"
on public.members for insert
to authenticated
with check (public.current_member_is_admin());

create policy "admins can update members"
on public.members for update
to authenticated
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

create policy "active members can read visible events"
on public.events for select
to authenticated
using (
  public.current_member_id() is not null
  and (status in ('published', 'cancelled') or public.current_member_is_admin())
);

create policy "admins can insert events"
on public.events for insert
to authenticated
with check (public.current_member_is_admin());

create policy "admins can update events"
on public.events for update
to authenticated
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

create policy "members can read visible reservations"
on public.reservations for select
to authenticated
using (
  member_id = public.current_member_id()
  or public.current_member_is_admin()
);

create policy "members can create own reservations"
on public.reservations for insert
to authenticated
with check (member_id = public.current_member_id());

create policy "members can update own reservations"
on public.reservations for update
to authenticated
using (member_id = public.current_member_id() or public.current_member_is_admin())
with check (member_id = public.current_member_id() or public.current_member_is_admin());

create policy "admins can manage invitations"
on public.invitations for all
to authenticated
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

create policy "members can read own notifications"
on public.notifications for select
to authenticated
using (member_id = public.current_member_id() or public.current_member_is_admin());

create policy "admins can manage notifications"
on public.notifications for all
to authenticated
using (public.current_member_is_admin())
with check (public.current_member_is_admin());

grant execute on function public.request_membership(text, text, text) to anon, authenticated;
grant execute on function public.claim_member_profile() to authenticated;
grant execute on function public.update_my_profile(text, text) to authenticated;
grant execute on function public.get_event_cards() to authenticated;
grant execute on function public.get_event_detail(uuid) to authenticated;
grant execute on function public.reserve_event(uuid) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.set_event_response(uuid, text, text) to authenticated;
grant execute on function public.delete_event(uuid) to authenticated;

-- Bootstrap:
-- 1. Create the first user with Supabase Auth magic link.
-- 2. Insert that user's email here as an admin before first login, or run from SQL editor:
-- insert into public.members (name, email, role, status) values ('管理者名', 'admin@example.com', 'admin', 'invited');
