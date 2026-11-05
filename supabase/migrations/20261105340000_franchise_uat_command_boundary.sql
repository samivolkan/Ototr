revoke insert,update on public.franchise_uat_results from authenticated;
revoke insert on public.franchise_uat_signoffs from authenticated;

create or replace function app_private.submit_franchise_uat_result(
  p_release_candidate text,p_scenario_code text,p_evidence_sha256 text,p_result_summary text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_role text; v_revision smallint;
begin
  v_role:=public.franchise_claim_role();
  if auth.uid() is null then raise exception 'UAT için ERP oturumu zorunludur'; end if;
  if p_release_candidate !~ '^[a-zA-Z0-9._-]{3,100}$' then raise exception 'Release adayı geçersiz'; end if;
  if p_evidence_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'SHA-256 kanıtı zorunludur'; end if;
  if length(trim(coalesce(p_result_summary,''))) not between 20 and 2000 then raise exception 'Sonuç özeti 20-2000 karakter olmalıdır'; end if;
  if not exists(select 1 from public.franchise_uat_scenarios s where s.scenario_code=p_scenario_code and s.is_active and v_role=any(s.owner_roles)) then
    raise exception 'Rol bu UAT senaryosunu çalıştıramaz';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_release_candidate||':'||p_scenario_code,0));
  if exists(select 1 from public.franchise_uat_results r where r.release_candidate=p_release_candidate and r.scenario_code=p_scenario_code and r.status in ('submitted','approved')) then
    raise exception 'Bu senaryonun açık veya onaylı sonucu zaten var';
  end if;
  select (coalesce(max(r.revision),0)+1)::smallint into v_revision from public.franchise_uat_results r
    where r.release_candidate=p_release_candidate and r.scenario_code=p_scenario_code;
  insert into public.franchise_uat_results(release_candidate,scenario_code,revision,status,executor_id,executor_role,evidence_sha256,result_summary)
  values(p_release_candidate,p_scenario_code,v_revision,'submitted',auth.uid(),v_role,p_evidence_sha256,trim(p_result_summary)) returning id into v_id;
  return v_id;
end $$;

create or replace function app_private.review_franchise_uat_result(
  p_result_id uuid,p_decision text,p_checker_note text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_result public.franchise_uat_results%rowtype; v_role text;
begin
  v_role:=public.franchise_claim_role();
  if auth.uid() is null then raise exception 'UAT için ERP oturumu zorunludur'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'İnceleme kararı geçersiz'; end if;
  if length(trim(coalesce(p_checker_note,''))) not between 10 and 2000 then raise exception 'İnceleme notu 10-2000 karakter olmalıdır'; end if;
  select * into v_result from public.franchise_uat_results where id=p_result_id for update;
  if not found or v_result.status<>'submitted' then raise exception 'İncelenebilir UAT sonucu bulunamadı'; end if;
  if v_result.executor_id=auth.uid() then raise exception 'UAT çalıştıran kişi kendi sonucunu onaylayamaz'; end if;
  if not exists(select 1 from public.franchise_uat_scenarios s where s.scenario_code=v_result.scenario_code and v_role=any(s.reviewer_roles)) then
    raise exception 'Rol bu UAT sonucunu inceleyemez';
  end if;
  update public.franchise_uat_results set status=p_decision,checker_id=auth.uid(),checker_role=v_role,checker_note=trim(p_checker_note),reviewed_at=now() where id=p_result_id;
  return p_result_id;
end $$;

create or replace function app_private.sign_franchise_uat_release(
  p_release_candidate text,p_signoff_role text,p_evidence_sha256 text,p_decision text,p_note text
) returns uuid
language plpgsql security definer set search_path=''
as $$
declare v_id uuid; v_role text; v_catalog public.franchise_uat_signoff_catalog%rowtype;
begin
  v_role:=public.franchise_claim_role();
  if auth.uid() is null then raise exception 'UAT imzası için ERP oturumu zorunludur'; end if;
  if p_release_candidate !~ '^[a-zA-Z0-9._-]{3,100}$' then raise exception 'Release adayı geçersiz'; end if;
  if p_evidence_sha256 !~ '^[0-9a-f]{64}$' then raise exception 'SHA-256 kanıtı zorunludur'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'İmza kararı geçersiz'; end if;
  if length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'İmza notu 10-2000 karakter olmalıdır'; end if;
  select * into v_catalog from public.franchise_uat_signoff_catalog where signoff_role=p_signoff_role;
  if not found or not v_role=any(v_catalog.authorized_roles) then raise exception 'Rol bu departman imzasını veremez'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_release_candidate||':signoff',0));
  if exists(select 1 from public.franchise_uat_signoffs where release_candidate=p_release_candidate and (signoff_role=p_signoff_role or signer_id=auth.uid())) then
    raise exception 'Departman veya imzalayan kişi için mükerrer imza';
  end if;
  if exists(
    select 1 from unnest(v_catalog.required_scenarios) required_code
    where not exists(select 1 from public.franchise_uat_results r where r.release_candidate=p_release_candidate and r.scenario_code=required_code and r.status='approved' and r.executor_id<>auth.uid())
  ) then raise exception 'İmza için gereken bağımsız UAT senaryoları tamamlanmadı'; end if;
  if p_signoff_role='CEO/Yönetim' and (select count(*) from public.franchise_uat_signoffs where release_candidate=p_release_candidate and decision='approved')<>8 then
    raise exception 'CEO/Yönetim imzası diğer sekiz onaydan sonra verilebilir';
  end if;
  insert into public.franchise_uat_signoffs(release_candidate,signoff_role,signer_id,signer_role,evidence_sha256,decision,note)
  values(p_release_candidate,p_signoff_role,auth.uid(),v_role,p_evidence_sha256,p_decision,trim(p_note)) returning id into v_id;
  return v_id;
end $$;

revoke all on function app_private.submit_franchise_uat_result(text,text,text,text) from public,anon;
revoke all on function app_private.review_franchise_uat_result(uuid,text,text) from public,anon;
revoke all on function app_private.sign_franchise_uat_release(text,text,text,text,text) from public,anon;
grant execute on function app_private.submit_franchise_uat_result(text,text,text,text) to authenticated;
grant execute on function app_private.review_franchise_uat_result(uuid,text,text) to authenticated;
grant execute on function app_private.sign_franchise_uat_release(text,text,text,text,text) to authenticated;

create or replace function public.submit_franchise_uat_result(p_release_candidate text,p_scenario_code text,p_evidence_sha256 text,p_result_summary text)
returns uuid language sql security invoker set search_path=''
as $$select app_private.submit_franchise_uat_result(p_release_candidate,p_scenario_code,p_evidence_sha256,p_result_summary)$$;
create or replace function public.review_franchise_uat_result(p_result_id uuid,p_decision text,p_checker_note text)
returns uuid language sql security invoker set search_path=''
as $$select app_private.review_franchise_uat_result(p_result_id,p_decision,p_checker_note)$$;
create or replace function public.sign_franchise_uat_release(p_release_candidate text,p_signoff_role text,p_evidence_sha256 text,p_decision text,p_note text)
returns uuid language sql security invoker set search_path=''
as $$select app_private.sign_franchise_uat_release(p_release_candidate,p_signoff_role,p_evidence_sha256,p_decision,p_note)$$;

revoke all on function public.submit_franchise_uat_result(text,text,text,text) from public,anon;
revoke all on function public.review_franchise_uat_result(uuid,text,text) from public,anon;
revoke all on function public.sign_franchise_uat_release(text,text,text,text,text) from public,anon;
grant execute on function public.submit_franchise_uat_result(text,text,text,text) to authenticated;
grant execute on function public.review_franchise_uat_result(uuid,text,text) to authenticated;
grant execute on function public.sign_franchise_uat_release(text,text,text,text,text) to authenticated;
