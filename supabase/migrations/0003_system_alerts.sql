create table if not exists public.poll_system_alerts (
  alert_key text primary key,
  last_sent_at timestamptz not null
);

alter table public.poll_system_alerts enable row level security;
