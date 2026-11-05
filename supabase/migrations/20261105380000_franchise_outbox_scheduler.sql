-- Installed but fail-closed scheduler. Activation requires an explicit URL and Vault secret.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table if not exists app_private.franchise_outbox_schedule_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  worker_url text,
  worker_secret_name text not null default 'franchise_worker_secret',
  updated_at timestamptz not null default now(),
  check (worker_url is null or worker_url ~ '^https://[a-z0-9-]+\\.supabase\\.co/functions/v1/franchise-outbox-worker$')
);

insert into app_private.franchise_outbox_schedule_config(singleton,enabled)
values(true,false)
on conflict(singleton) do nothing;

alter table app_private.franchise_outbox_schedule_config enable row level security;
revoke all on app_private.franchise_outbox_schedule_config from public, anon, authenticated;

create or replace function app_private.dispatch_franchise_outbox()
returns bigint
language plpgsql
security definer
set search_path = app_private, vault, net, public, pg_temp
as $$
declare
  v_config app_private.franchise_outbox_schedule_config%rowtype;
  v_secret text;
  v_request_id bigint;
begin
  select * into v_config
  from app_private.franchise_outbox_schedule_config
  where singleton=true;

  if not found or not v_config.enabled or v_config.worker_url is null then
    return null;
  end if;

  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name=v_config.worker_secret_name
  order by created_at desc
  limit 1;

  if coalesce(length(v_secret),0) < 32 then
    raise exception 'Franchise worker Vault secret eksik veya geçersiz';
  end if;

  select net.http_post(
    url:=v_config.worker_url,
    headers:=jsonb_build_object('content-type','application/json','x-franchise-worker-secret',v_secret),
    body:='{}'::jsonb,
    timeout_milliseconds:=15000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function app_private.dispatch_franchise_outbox() from public, anon, authenticated;
grant execute on function app_private.dispatch_franchise_outbox() to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='franchise-outbox-dispatch';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end;
$$;

select cron.schedule(
  'franchise-outbox-dispatch',
  '* * * * *',
  $job$select app_private.dispatch_franchise_outbox();$job$
);

