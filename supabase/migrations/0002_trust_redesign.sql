alter table public.poll_user_votes
  add column if not exists zone text null,
  add column if not exists state text null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
declare
  cons record;
begin
  for cons in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'poll_user_votes'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%direction%'
  loop
    execute format('alter table public.poll_user_votes drop constraint %I', cons.conname);
  end loop;
  alter table public.poll_user_votes
    add constraint poll_user_votes_direction_check check (direction in ('s', 'o', 'u'));
end $$;

create index if not exists poll_user_votes_zone_idx on public.poll_user_votes (zone) where zone is not null;
create index if not exists poll_user_votes_user_idx on public.poll_user_votes (user_id);

create or replace function public.pollux_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists poll_user_votes_touch on public.poll_user_votes;
create trigger poll_user_votes_touch
  before update on public.poll_user_votes
  for each row execute function public.pollux_touch_updated_at();

alter table public.poll_votes
  add column if not exists undecided_count integer not null default 0;

create or replace function public.pollux_recount_votes(pid text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into poll_votes (politician_id, support_count, oppose_count, undecided_count)
  select pid,
         count(*) filter (where direction = 's'),
         count(*) filter (where direction = 'o'),
         count(*) filter (where direction = 'u')
  from poll_user_votes where politician_id = pid
  on conflict (politician_id) do update set
    support_count = excluded.support_count,
    oppose_count = excluded.oppose_count,
    undecided_count = excluded.undecided_count;
end $$;

create or replace function public.pollux_votes_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform pollux_recount_votes(old.politician_id);
  else
    perform pollux_recount_votes(new.politician_id);
    if tg_op = 'UPDATE' and new.politician_id <> old.politician_id then
      perform pollux_recount_votes(old.politician_id);
    end if;
  end if;
  return null;
end $$;

drop trigger if exists poll_user_votes_aggregate on public.poll_user_votes;
create trigger poll_user_votes_aggregate
  after insert or update or delete on public.poll_user_votes
  for each row execute function public.pollux_votes_changed();

alter table public.poll_comments
  add column if not exists status text not null default 'approved',
  add column if not exists moderation_label text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public' and rel.relname = 'poll_comments'
      and con.conname = 'poll_comments_status_check'
  ) then
    alter table public.poll_comments
      add constraint poll_comments_status_check check (status in ('approved', 'held', 'pending'));
  end if;
end $$;

create index if not exists poll_comments_pol_status_idx
  on public.poll_comments (politician_id, status, created_at);

create table if not exists public.poll_ai_insights (
  politician_id text primary key,
  temperature integer null,
  emotions jsonb null,
  temp_summary text null,
  digest_support text null,
  digest_oppose text null,
  briefing text null,
  briefing_at timestamptz null,
  comment_count_at_compute integer not null default 0,
  computed_at timestamptz null
);

create table if not exists public.poll_reports (
  id uuid primary key default gen_random_uuid(),
  comment_id text not null,
  reporter_uid text not null,
  reason text null,
  created_at timestamptz not null default now(),
  unique (comment_id, reporter_uid)
);

create table if not exists public.poll_vote_actions (
  id bigint generated always as identity primary key,
  user_id text not null,
  politician_id text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists poll_vote_actions_user_time_idx
  on public.poll_vote_actions (user_id, created_at);
create index if not exists poll_vote_actions_user_pol_time_idx
  on public.poll_vote_actions (user_id, politician_id, created_at);

create or replace view public.poll_zone_stats as
  select zone,
         count(*) filter (where direction = 's') as support_count,
         count(*) filter (where direction = 'o') as oppose_count,
         count(*) filter (where direction = 'u') as undecided_count,
         count(*) as total
  from public.poll_user_votes
  where zone is not null
  group by zone;

create or replace view public.poll_pol_zone_stats as
  select politician_id, zone,
         count(*) filter (where direction = 's') as support_count,
         count(*) filter (where direction = 'o') as oppose_count,
         count(*) filter (where direction = 'u') as undecided_count,
         count(*) as total
  from public.poll_user_votes
  where zone is not null
  group by politician_id, zone;

alter table public.poll_user_votes enable row level security;
alter table public.poll_votes enable row level security;
alter table public.poll_comments enable row level security;
alter table public.poll_ai_insights enable row level security;
alter table public.poll_reports enable row level security;
alter table public.poll_vote_actions enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('poll_user_votes', 'poll_votes', 'poll_comments',
                        'poll_ai_insights', 'poll_reports', 'poll_vote_actions')
  loop
    execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end $$;

create policy poll_votes_read on public.poll_votes
  for select to anon, authenticated using (true);

create policy poll_user_votes_read on public.poll_user_votes
  for select to anon, authenticated using (true);

create policy poll_comments_read_approved on public.poll_comments
  for select to anon, authenticated using (status = 'approved');

create policy poll_ai_insights_read on public.poll_ai_insights
  for select to anon, authenticated using (true);

grant select on public.poll_zone_stats to anon, authenticated;
grant select on public.poll_pol_zone_stats to anon, authenticated;
