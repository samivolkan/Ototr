begin;

alter table public.franchise_provider_requests
  add column if not exists processing_started_at timestamptz;

create or replace function public.claim_franchise_provider_requests(p_limit integer default 25)
returns setof public.franchise_provider_requests
language sql
security invoker
set search_path = public, pg_temp
as $$
  with recover_stale as (
    update public.franchise_provider_requests
    set status = case when attempt_count >= 10 then 'dead_letter' else 'failed' end,
        last_error_code = 'WORKER_LEASE_EXPIRED',
        next_attempt_at = now(),
        processing_started_at = null
    where status = 'processing' and processing_started_at < now() - interval '15 minutes'
    returning id
  ), claimed as (
    select id from public.franchise_provider_requests
    where status in ('pending','failed') and next_attempt_at <= now() and attempt_count < 10
    order by requested_at
    for update skip locked
    limit least(greatest(p_limit,1),100)
  )
  update public.franchise_provider_requests r
  set status = 'processing',
      attempt_count = r.attempt_count + 1,
      processing_started_at = now(),
      last_error_code = null
  from claimed c
  where r.id = c.id
  returning r.*;
$$;

create or replace function public.finish_franchise_provider_request(
  p_request_id uuid,
  p_success boolean,
  p_provider_status text default null,
  p_provider_message_id text default null,
  p_error_code text default null
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_success and (p_provider_status not in ('accepted','delivered') or nullif(trim(p_provider_message_id),'') is null) then
    raise exception 'Başarılı sağlayıcı sonucu durum ve mesaj kimliği içermelidir';
  end if;

  update public.franchise_provider_requests
  set status = case
        when p_success then p_provider_status
        when attempt_count >= 10 then 'dead_letter'
        else 'failed'
      end,
      provider_message_id = case when p_success then left(p_provider_message_id,500) else provider_message_id end,
      last_error_code = case when p_success then null else left(coalesce(nullif(p_error_code,''),'PROVIDER_ERROR'),100) end,
      processed_at = case when p_success then now() else null end,
      next_attempt_at = case
        when p_success then next_attempt_at
        else now() + make_interval(secs => least(3600,30*power(2,greatest(attempt_count-1,0))::integer))
      end,
      processing_started_at = null
  where id = p_request_id and status = 'processing';

  if not found then raise exception 'İşlenmekte olan sağlayıcı talebi bulunamadı'; end if;
end;
$$;

revoke all on function public.claim_franchise_provider_requests(integer) from public, anon, authenticated;
revoke all on function public.finish_franchise_provider_request(uuid,boolean,text,text,text) from public, anon, authenticated;
grant execute on function public.claim_franchise_provider_requests(integer) to service_role;
grant execute on function public.finish_franchise_provider_request(uuid,boolean,text,text,text) to service_role;

commit;
