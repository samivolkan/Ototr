-- Use a portable literal-dot JWT shape check under standard_conforming_strings.
create or replace function app_private.dispatch_franchise_outbox()
returns bigint
language plpgsql
security definer
set search_path = app_private, vault, net, public, pg_temp
as $$
declare
  v_config app_private.franchise_outbox_schedule_config%rowtype;
  v_worker_secret text;
  v_invoke_jwt text;
  v_request_id bigint;
begin
  select * into v_config
  from app_private.franchise_outbox_schedule_config
  where singleton=true;

  if not found or not v_config.enabled or v_config.worker_url is null then
    return null;
  end if;

  select decrypted_secret into v_worker_secret
  from vault.decrypted_secrets
  where name=v_config.worker_secret_name
  order by created_at desc
  limit 1;

  select decrypted_secret into v_invoke_jwt
  from vault.decrypted_secrets
  where name=v_config.invoke_jwt_secret_name
  order by created_at desc
  limit 1;

  if coalesce(length(v_worker_secret),0) < 32 then
    raise exception 'Franchise worker Vault secret eksik veya geçersiz';
  end if;
  if coalesce(length(v_invoke_jwt),0) < 32 or v_invoke_jwt !~ '^[A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+$' then
    raise exception 'Franchise worker invoke JWT eksik veya geçersiz';
  end if;

  select net.http_post(
    url:=v_config.worker_url,
    headers:=jsonb_build_object(
      'content-type','application/json',
      'authorization','Bearer '||v_invoke_jwt,
      'x-franchise-worker-secret',v_worker_secret
    ),
    body:='{}'::jsonb,
    timeout_milliseconds:=15000
  ) into v_request_id;
  return v_request_id;
end;
$$;

revoke all on function app_private.dispatch_franchise_outbox() from public, anon, authenticated;
grant execute on function app_private.dispatch_franchise_outbox() to service_role;

