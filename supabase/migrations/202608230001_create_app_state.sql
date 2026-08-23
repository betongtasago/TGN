-- Tasago Concrete Testing Portal
-- One durable state row keeps the existing application model compatible while
-- moving the source of truth from ephemeral server files to Supabase Postgres.
create table if not exists public.app_state (
  id text primary key,
  users jsonb not null default '[]'::jsonb,
  stations jsonb not null default '[]'::jsonb,
  samples jsonb not null default '[]'::jsonb,
  config jsonb not null default '{}'::jsonb,
  notification_logs jsonb not null default '[]'::jsonb,
  last_cron_date text not null default '',
  last_cron_log text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

-- The Node backend uses the service_role key and bypasses RLS. No browser
-- client should query this table directly because it contains private user
-- profile data and notification configuration.
revoke all on table public.app_state from anon, authenticated;
grant all on table public.app_state to service_role;

-- Keep Realtime subscriptions available for the backend's cross-instance sync.
do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_rel pr on pr.prpubid = p.oid
    where p.pubname = 'supabase_realtime'
      and pr.prrelid = 'public.app_state'::regclass
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
exception
  when undefined_table then
    null;
end
$$;
