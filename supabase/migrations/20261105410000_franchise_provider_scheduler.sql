-- Provider delivery scheduler; installed disabled until real provider acceptance.
create table if not exists app_private.franchise_provider_schedule_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  worker_url text,
  provider_secret_name text not null default 'franchise_provider_worker_secret',
  invoke_jwt_secret_name text not null default 'franchise_worker_invoke_jwt',
  updated_at timestamptz not null default now(),
  check (worker_url is null or worker_url ~ '^https://[a-z0-9-]+\\.supabase\\.co/functions/v1/franchise-provider-worker$')
);

insert into app_private.franchise_provider_schedule_config(singleton,enabled)
values(true,false)
on conflict(singleton) do nothing;

alter table app_private.franchise_provider_schedule_config enable row level security;
revoke all on app_private.franchise_provider_schedule_config from public, anon, authenticated;

create or replace function app_private.dispatch_franchise_provider()
returns bigint
language plpgsql
security definer
set search_path = app_private, vault, net, public, pg_temp
as $$
declare
  v_config app_private.franchise_provider_schedule_config%rowtype;
  v_provider_secret text;
  v_invoke_jwt text;
  v_request_id bigint;
begin
  select * into v_config
  from app_private.franchise_provider_schedule_config
  where singleton=true;

  if not found or not v_config.enabled or v_config.worker_url is null then return null; end if;

  select decrypted_secret into v_provider_secret from vault.decrypted_secrets
  where name=v_config.provider_secret_name order by created_at desc limit 1;
  select decrypted_secret into v_invoke_jwt from vault.decrypted_secrets
  where name=v_config.invoke_jwt_secret_name order by created_at desc limit 1;

  if coalesce(length(v_provider_secret),0) < 32 then
    raise exception 'Franchise provider Vault secret eksik veya geçersiz';
  end if;
  if coalesce(length(v_invoke_jwt),0) < 32 or v_invoke_jwt !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$' then
    raise exception 'Franchise provider invoke JWT eksik veya geçersiz';
  end if;

  select net.http_post(
    url:=v_config.worker_url,
    headers:=jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer '||v_invoke_jwt,
      'x-franchise-provider-secret',v_provider_secret
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=15000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function app_private.dispatch_franchise_provider() from public, anon, authenticated;
grant execute on function app_private.dispatch_franchise_provider() to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='franchise-provider-dispatch';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end;
$$;

select cron.schedule(
  'franchise-provider-dispatch',
  '* * * * *',
  $job$select app_private.dispatch_franchise_provider();$job$
);
