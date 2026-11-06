-- Approved invitation scheduler. Installed fail-closed: no URL, Vault credentials or delivery activation.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create table app_private.franchise_user_invitation_schedule_config (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  worker_url text,
  invoke_jwt_secret_id uuid,
  worker_secret_id uuid,
  updated_at timestamptz not null default now(),
  constraint franchise_user_invitation_worker_url_check check (
    worker_url is null or worker_url ~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/franchise-user-invitation-worker$'
  ),
  constraint franchise_user_invitation_secret_separation_check check (
    invoke_jwt_secret_id is null or worker_secret_id is null or invoke_jwt_secret_id<>worker_secret_id
  )
);

insert into app_private.franchise_user_invitation_schedule_config(singleton,enabled)
values(true,false)
on conflict(singleton) do nothing;

alter table app_private.franchise_user_invitation_schedule_config enable row level security;
revoke all on app_private.franchise_user_invitation_schedule_config from public,anon,authenticated;

create function app_private.dispatch_franchise_user_invitation()
returns bigint
language plpgsql
security definer
set search_path=''
as $$
declare
  v_config app_private.franchise_user_invitation_schedule_config%rowtype;
  v_invoke_jwt text;
  v_worker_secret text;
  v_request_id bigint;
begin
  select * into v_config
  from app_private.franchise_user_invitation_schedule_config
  where singleton=true;

  if not found or not v_config.enabled or v_config.worker_url is null then
    return null;
  end if;
  if v_config.invoke_jwt_secret_id is null or v_config.worker_secret_id is null then
    raise exception 'Franchise invitation scheduler Vault baglantilari eksik';
  end if;

  select decrypted_secret into v_invoke_jwt
  from vault.decrypted_secrets
  where id=v_config.invoke_jwt_secret_id;

  select decrypted_secret into v_worker_secret
  from vault.decrypted_secrets
  where id=v_config.worker_secret_id;

  if coalesce(length(v_invoke_jwt),0)<32
     or v_invoke_jwt !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$' then
    raise exception 'Franchise invitation scheduler invoke JWT eksik veya gecersiz';
  end if;
  if coalesce(length(v_worker_secret),0)<32 then
    raise exception 'Franchise invitation scheduler worker secret eksik veya gecersiz';
  end if;

  select net.http_post(
    url:=v_config.worker_url,
    headers:=jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer '||v_invoke_jwt,
      'x-franchise-invitation-worker-secret',v_worker_secret
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=15000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function app_private.dispatch_franchise_user_invitation() from public,anon,authenticated;
grant execute on function app_private.dispatch_franchise_user_invitation() to service_role;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id from cron.job where jobname='franchise-user-invitation-dispatch';
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;
end;
$$;

select cron.schedule(
  'franchise-user-invitation-dispatch',
  '* * * * *',
  $job$select app_private.dispatch_franchise_user_invitation();$job$
);
