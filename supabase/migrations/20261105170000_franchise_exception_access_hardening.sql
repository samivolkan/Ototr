begin;
alter table public.franchise_exceptions add column if not exists expires_at timestamptz not null default (now()+interval '30 days');
alter table public.franchise_exceptions drop constraint if exists franchise_exceptions_exception_type_check;
alter table public.franchise_exceptions add constraint franchise_exceptions_type_guard check(
 exception_type not in ('legal','license','payment') and exception_type not in ('opening:calibration','opening:ohs_readiness','opening:quality_audit','opening:it_readiness','opening:trial_operation','opening:opening_board'));
alter table public.franchise_exceptions add constraint franchise_exceptions_expiry_guard check(expires_at>created_at and expires_at<=created_at+interval '90 days');

create or replace function public.franchise_exception_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 if tg_op='INSERT' then
  if auth.uid() is null or new.requester_id<>auth.uid() or new.requester_role<>public.franchise_claim_role() or new.status<>'pending_second_approval' or new.reviewer_id is not null then raise exception 'İstisna talep sahibi veya başlangıç durumu geçersiz'; end if;
  return new;
 end if;
 if new.franchise_case_id<>old.franchise_case_id or new.exception_type<>old.exception_type or new.reason<>old.reason or new.requester_id<>old.requester_id or new.requester_role<>old.requester_role or new.created_at<>old.created_at or new.expires_at<>old.expires_at then raise exception 'İstisna kapsamı inceleme sırasında değiştirilemez'; end if;
 if old.status<>'pending_second_approval' or new.status not in ('approved','rejected') or auth.uid() is null or new.reviewer_id<>auth.uid() or new.reviewer_id=old.requester_id or public.franchise_claim_role() not in ('gm','franchise_director') or new.reviewed_at is null then raise exception 'İstisna bağımsız ikinci onayı geçersiz'; end if;
 return new;
end $$;
create trigger franchise_exception_guard_trigger before insert or update on public.franchise_exceptions for each row execute function public.franchise_exception_guard();

create or replace function public.request_franchise_exception(p_case_id uuid,p_type text,p_reason text,p_expires_at timestamptz)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 if not public.franchise_can_access_case(p_case_id) then raise exception 'Dosya erişimi yok'; end if;
 insert into public.franchise_exceptions(franchise_case_id,exception_type,reason,requester_id,requester_role,expires_at)
 values(p_case_id,trim(p_type),trim(p_reason),auth.uid(),public.franchise_claim_role(),p_expires_at) returning id into v_id; return v_id;
end $$;
create or replace function public.review_franchise_exception(p_id uuid,p_approve boolean,p_note text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
begin
 update public.franchise_exceptions set status=case when p_approve then 'approved' else 'rejected' end,reviewer_id=auth.uid(),reviewer_role=public.franchise_claim_role(),review_note=left(trim(coalesce(p_note,'')),2000),reviewed_at=now() where id=p_id and status='pending_second_approval';
 if not found then raise exception 'İnceleme bekleyen istisna bulunamadı'; end if; return p_approve;
end $$;

create or replace function public.franchise_opening_execution_ready(p_case_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select count(*)=10 and bool_and(exists(select 1 from public.franchise_opening_deliverables d where d.franchise_case_id=p_case_id and d.deliverable_code=c.deliverable_code and d.status='approved' and public.franchise_opening_payload_valid(d.deliverable_code,d.payload))
   or (c.waivable and exists(select 1 from public.franchise_exceptions e where e.franchise_case_id=p_case_id and e.exception_type='opening:'||c.deliverable_code and e.status='approved' and e.reviewer_id<>e.requester_id and e.expires_at>now())))
 from public.franchise_opening_deliverable_catalog c where c.is_active
$$;

create or replace function public.franchise_sync_access_scope()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_staff public.franchise_staff%rowtype; v_existing text; v_updated_by uuid;
begin
 if new.auth_user_id is null or new.status<>'active' then return new; end if;
 select * into v_staff from public.franchise_staff where id=new.staff_id;
 if not found or v_staff.recruitment_status<>'hired' or not v_staff.employment_documents_complete or not v_staff.contract_signed or (v_staff.certification_required and (not v_staff.academy_completed or v_staff.certificate_valid_until<current_date)) then raise exception 'Sertifikasız veya eksik personel kapsamı etkinleştirilemez'; end if;
 select franchise_role into v_existing from public.franchise_user_scopes where auth_user_id=new.auth_user_id for update;
 if v_existing is not null and v_existing<>'dealer' then raise exception 'Kullanıcının mevcut ERP rolü bayi personeli kapsamıyla çakışıyor'; end if;
 select activated_by into v_updated_by from public.franchise_branches where id=new.branch_id;
 insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,scope_version,is_active,updated_by)
 values(new.auth_user_id,'dealer',array[new.branch_id],1,true,v_updated_by)
 on conflict(auth_user_id) do update set branch_ids=(select array(select distinct x from unnest(public.franchise_user_scopes.branch_ids||excluded.branch_ids) x)),scope_version=public.franchise_user_scopes.scope_version+1,is_active=true,updated_at=now();
 return new;
end $$;
create trigger franchise_access_scope_insert_trigger after insert on public.franchise_access_accounts for each row execute function public.franchise_sync_access_scope();

create or replace function public.franchise_revoke_access_scope()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.auth_user_id is not null and new.status='revoked' and old.status<>'revoked' then
  update public.franchise_user_scopes set branch_ids=array_remove(branch_ids,new.branch_id),scope_version=scope_version+1,is_active=cardinality(array_remove(branch_ids,new.branch_id))>0,updated_at=now() where auth_user_id=old.auth_user_id and franchise_role='dealer';
 end if; return new;
end $$;
create trigger franchise_access_scope_revoke_trigger after update of status on public.franchise_access_accounts for each row execute function public.franchise_revoke_access_scope();

revoke all on function public.franchise_exception_guard(),public.request_franchise_exception(uuid,text,text,timestamptz),public.review_franchise_exception(uuid,boolean,text),public.franchise_sync_access_scope(),public.franchise_revoke_access_scope() from public,anon;
grant execute on function public.request_franchise_exception(uuid,text,text,timestamptz),public.review_franchise_exception(uuid,boolean,text) to authenticated;
commit;
