begin;

alter table public.franchise_integration_outbox
  add column if not exists processing_started_at timestamptz,
  add column if not exists lease_token uuid;

drop function if exists public.finish_franchise_outbox(uuid,boolean,text);

create or replace function public.claim_franchise_outbox(p_limit integer default 25)
returns setof public.franchise_integration_outbox
language sql
security invoker
set search_path = public, pg_temp
as $$
  with recover_stale as (
    update public.franchise_integration_outbox
    set status = case when attempts >= 10 then 'dead_letter' else 'failed' end,
        last_error = 'WORKER_LEASE_EXPIRED',
        next_attempt_at = now(),
        processing_started_at = null,
        lease_token = null
    where status = 'processing'
      and processing_started_at < now() - interval '15 minutes'
    returning id
  ), claimed as (
    select id
    from public.franchise_integration_outbox
    where status in ('pending','failed')
      and next_attempt_at <= now()
      and attempts < 10
    order by created_at
    for update skip locked
    limit least(greatest(p_limit,1),100)
  )
  update public.franchise_integration_outbox o
  set status = 'processing',
      attempts = o.attempts + 1,
      processing_started_at = now(),
      lease_token = gen_random_uuid(),
      last_error = null
  from claimed c
  where o.id = c.id
  returning o.*;
$$;

create or replace function public.finish_franchise_outbox(
  p_event_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_error text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_lease_token is null then
    raise exception 'Outbox lease anahtarı zorunludur';
  end if;

  update public.franchise_integration_outbox
  set status = case when p_success then 'processed' when attempts >= 10 then 'dead_letter' else 'failed' end,
      processed_at = case when p_success then now() else null end,
      next_attempt_at = case when p_success then next_attempt_at else now() + make_interval(secs=>least(3600,30*power(2,greatest(attempts-1,0))::integer)) end,
      last_error = case when p_success then null else left(coalesce(p_error,'Bilinmeyen adaptör hatası'),2000) end,
      processing_started_at = null,
      lease_token = null
  where id = p_event_id
    and status = 'processing'
    and lease_token = p_lease_token;

  if not found then
    raise exception 'Geçerli lease ile işlenmekte olan outbox olayı bulunamadı';
  end if;
end;
$$;

revoke all on function public.claim_franchise_outbox(integer) from public, anon, authenticated;
revoke all on function public.finish_franchise_outbox(uuid,uuid,boolean,text) from public, anon, authenticated;
grant execute on function public.claim_franchise_outbox(integer) to service_role;
grant execute on function public.finish_franchise_outbox(uuid,uuid,boolean,text) to service_role;

commit;
