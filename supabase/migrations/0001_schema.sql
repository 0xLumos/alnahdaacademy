-- Al-Nahda Sports Academy: schema, row-level security, helper functions.
-- Run once in the Supabase SQL editor (or `supabase db push`).

-- ============ Types ============
create type public.user_role as enum ('admin', 'student');

-- ============ Tables ============
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_.]{3,32}$'),
  full_name   text not null check (length(trim(full_name)) between 2 and 80),
  phone       text check (phone is null or length(phone) <= 20),
  role        public.user_role not null default 'student',
  active      boolean not null default true,
  announcements_seen_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- Subscriptions are recorded by the admin when the student registers and pays at the center.
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  plan        text not null check (length(plan) between 1 and 60),
  start_date  date not null,
  end_date    date not null,
  amount      numeric(10, 2) check (amount is null or amount >= 0),
  notes       text check (notes is null or length(notes) <= 500),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);
create index on public.subscriptions (student_id, end_date desc);

create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 80),
  coach_name  text check (coach_name is null or length(coach_name) <= 80),
  location    text check (location is null or length(location) <= 80),
  weekday     smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time  time not null,
  end_time    time not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  check (end_time > start_time)
);

create table public.enrollments (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (student_id, class_id)
);
create index on public.enrollments (class_id);

-- One-way broadcasts. class_id null = everyone.
create table public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (length(title) between 1 and 120),
  body        text not null check (length(body) between 1 and 4000),
  class_id    uuid references public.classes (id) on delete cascade,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.announcements (created_at desc);

-- Two-way chat. Each student has one thread with the academy (all admins share it).
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles (id) on delete cascade,
  sender_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (length(trim(body)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index on public.chat_messages (student_id, created_at);

-- ============ Helper functions ============
-- security definer so policies can check the caller's role without recursive RLS.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function public.is_active_student() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'student' and active);
$$;

-- Students cannot UPDATE profiles or chat rows directly. These two RPCs are the only write paths.
create or replace function public.mark_announcements_seen() returns void
language sql security definer set search_path = public as $$
  update profiles set announcements_seen_at = now() where id = auth.uid() and active;
$$;

-- Marks messages in a thread as read, only messages sent by the other side.
create or replace function public.mark_thread_read(p_student uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_admin() or (p_student = auth.uid() and public.is_active_student())) then
    raise exception 'not allowed';
  end if;
  update chat_messages set read_at = now()
   where student_id = p_student and read_at is null and sender_id <> auth.uid()
     and (public.is_admin() = (sender_id = student_id)); -- admin reads student msgs, student reads admin msgs
end;
$$;

-- Admin inbox: one row per thread with last message and unread count.
create or replace function public.admin_threads()
returns table (student_id uuid, full_name text, username text, last_body text, last_at timestamptz, unread bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'not allowed'; end if;
  return query
    select p.id, p.full_name, p.username,
           (select m.body from chat_messages m where m.student_id = p.id order by m.created_at desc limit 1),
           max(c.created_at),
           count(*) filter (where c.read_at is null and c.sender_id = c.student_id)
      from profiles p join chat_messages c on c.student_id = p.id
     group by p.id
     order by max(c.created_at) desc;
end;
$$;

revoke execute on function public.mark_announcements_seen() from public, anon;
revoke execute on function public.mark_thread_read(uuid)    from public, anon;
revoke execute on function public.admin_threads()           from public, anon;
grant  execute on function public.mark_announcements_seen() to authenticated;
grant  execute on function public.mark_thread_read(uuid)    to authenticated;
grant  execute on function public.admin_threads()           to authenticated;

-- ============ Row-level security ============
alter table public.profiles      enable row level security;
alter table public.subscriptions enable row level security;
alter table public.classes       enable row level security;
alter table public.enrollments   enable row level security;
alter table public.announcements enable row level security;
alter table public.chat_messages enable row level security;

-- Nothing is readable without login.
revoke all on all tables in schema public from anon;

-- profiles: a user reads their own row; admins read and edit all.
-- Inserts happen only in the admin-users edge function (service role bypasses RLS).
create policy profiles_self_read  on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_admin_read on public.profiles for select to authenticated using (public.is_admin());
create policy profiles_admin_upd  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- subscriptions: student reads own, admin full control.
create policy subs_self_read on public.subscriptions for select to authenticated
  using (student_id = auth.uid() and public.is_active_student());
create policy subs_admin_all on public.subscriptions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- classes: any active member reads active classes; admin full control.
create policy classes_read on public.classes for select to authenticated
  using (public.is_admin() or (active and public.is_active_student()));
create policy classes_admin_all on public.classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- enrollments: student reads own, admin full control.
create policy enr_self_read on public.enrollments for select to authenticated
  using (student_id = auth.uid() and public.is_active_student());
create policy enr_admin_all on public.enrollments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- announcements: student reads global ones and ones for classes they are enrolled in.
create policy ann_read on public.announcements for select to authenticated using (
  public.is_admin() or (
    public.is_active_student() and (
      class_id is null or exists (
        select 1 from public.enrollments e where e.class_id = announcements.class_id and e.student_id = auth.uid()))));
create policy ann_admin_all on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- chat: student reads and writes only their own thread; admin reads and writes every thread.
create policy chat_read on public.chat_messages for select to authenticated
  using (public.is_admin() or (student_id = auth.uid() and public.is_active_student()));
create policy chat_insert on public.chat_messages for insert to authenticated with check (
  sender_id = auth.uid() and read_at is null and (
    public.is_admin() or (student_id = auth.uid() and public.is_active_student())));
create policy chat_admin_delete on public.chat_messages for delete to authenticated using (public.is_admin());

-- ============ Realtime ============
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages, public.announcements;
  end if;
end $$;
