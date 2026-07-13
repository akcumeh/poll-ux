create table if not exists public.poll_votes (
  politician_id text primary key,
  support_count integer not null default 0,
  oppose_count integer not null default 0
);

create table if not exists public.poll_user_votes (
  id bigint generated always as identity primary key,
  user_id text not null,
  politician_id text not null,
  direction text not null,
  unique (user_id, politician_id)
);

create table if not exists public.poll_comments (
  id uuid primary key default gen_random_uuid(),
  politician_id text not null,
  user_id text not null,
  handle text not null,
  comment_text text not null,
  direction text null,
  created_at timestamptz not null default now()
);
