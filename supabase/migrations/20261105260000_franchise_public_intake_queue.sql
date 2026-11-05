begin;

create or replace function app_private.list_public_franchise_intake_queue()
returns table(
  source_application_id uuid,status text,reason_code text,consent_version text,
  commercial_consent_declared boolean,captured_at timestamptz,province text,district text,source text,submitted_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $$
declare v_actor uuid:=auth.uid(); v_role text:=public.franchise_claim_role();
begin
  if v_actor is null then raise exception 'Kimliği doğrulanmış Franchise kullanıcısı zorunludur'; end if;
  if v_role not in ('gm','franchise_director','franchise_specialist') then raise exception 'Web başvuru kuyruğu rolü yetkili değil'; end if;
  return query
  select b.source_application_id,b.status,b.reason_code,b.consent_version,b.commercial_consent_declared,b.captured_at,
         a.province,a.district,a.source,a.created_at
  from public.franchise_public_intake_bridge b
  join public.public_franchise_applications a on a.id=b.source_application_id
  where b.status in ('awaiting_processing_consent','ready_for_canonicalization','rejected_missing_privacy')
  order by b.captured_at asc,b.source_application_id;
end;
$$;

revoke execute on function app_private.list_public_franchise_intake_queue() from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.list_public_franchise_intake_queue() to authenticated;

create or replace function public.list_public_franchise_intake_queue()
returns table(
  source_application_id uuid,status text,reason_code text,consent_version text,
  commercial_consent_declared boolean,captured_at timestamptz,province text,district text,source text,submitted_at timestamptz
)
language sql
security invoker
set search_path=''
as $$ select * from app_private.list_public_franchise_intake_queue(); $$;

revoke execute on function public.list_public_franchise_intake_queue() from public,anon;
grant execute on function public.list_public_franchise_intake_queue() to authenticated;

commit;
