begin;
create table public.franchise_opening_deliverable_catalog(
 deliverable_code text primary key, title text not null, owner_role text not null,
 required_payload_keys text[] not null, waivable boolean not null default true, sequence_no smallint not null unique, is_active boolean not null default true
);
insert into public.franchise_opening_deliverable_catalog values
('architecture_project','Mimari proje onayı','architecture',array['project_id','plan_version'],true,1,true),
('construction_handover','İnşaat ve şube teslimi','architecture',array['project_id','handover_id'],true,2,true),
('equipment_delivery','Ekipman teslimi','procurement',array['order_id','delivery_id','inventory_count'],true,3,true),
('calibration','Cihaz kalibrasyonu','procurement',array['equipment_count','calibration_batch_id'],false,4,true),
('ohs_readiness','İSG risk ve acil durum hazırlığı','ohs',array['risk_assessment_id','emergency_plan_id'],false,5,true),
('quality_audit','Açılış kalite denetimi','quality',array['audit_id','score','open_finding_count'],false,6,true),
('brand_campaign','Marka uygulaması ve açılış kampanyası','marketing',array['brand_application_id','campaign_id'],true,7,true),
('it_readiness','ERP, ağ ve kullanıcı hazırlığı','it',array['network_check_id','erp_tenant_id','provisioned_account_count'],false,8,true),
('trial_operation','Deneme operasyonu','operations',array['trial_operation_id','successful_job_count','critical_error_count'],false,9,true),
('opening_board','Açılış kurulu kararı','franchise_director',array['board_decision_id','decision'],false,10,true);

create table public.franchise_opening_deliverables(
 id uuid primary key default gen_random_uuid(), franchise_case_id uuid not null references public.franchise_cases(id) on delete restrict,
 deliverable_code text not null references public.franchise_opening_deliverable_catalog(deliverable_code), payload jsonb not null,
 evidence_sha256 text not null check(evidence_sha256 ~ '^[a-f0-9]{64}$'), status text not null default 'submitted' check(status in ('submitted','approved','rejected')),
 maker_id uuid not null references auth.users(id), checker_id uuid references auth.users(id), reviewed_at timestamptz, review_note text, created_at timestamptz not null default now(),
 unique(franchise_case_id,deliverable_code), check(checker_id is null or checker_id<>maker_id),
 check((status='submitted' and checker_id is null and reviewed_at is null) or (status in ('approved','rejected') and checker_id is not null and reviewed_at is not null))
);
alter table public.franchise_opening_deliverable_catalog enable row level security;
alter table public.franchise_opening_deliverables enable row level security;
revoke all on public.franchise_opening_deliverable_catalog,public.franchise_opening_deliverables from anon,authenticated;
grant select on public.franchise_opening_deliverable_catalog to authenticated;
grant select,insert,update on public.franchise_opening_deliverables to authenticated;
create policy franchise_opening_catalog_select on public.franchise_opening_deliverable_catalog for select to authenticated using(is_active);
create policy franchise_opening_deliverable_select on public.franchise_opening_deliverables for select to authenticated using(public.franchise_can_access_case(franchise_case_id));
create policy franchise_opening_deliverable_insert on public.franchise_opening_deliverables for insert to authenticated with check(
 public.franchise_can_access_case(franchise_case_id) and maker_id=auth.uid() and status='submitted' and exists(select 1 from public.franchise_opening_deliverable_catalog c where c.deliverable_code=franchise_opening_deliverables.deliverable_code and c.owner_role=public.franchise_claim_role())
);
create policy franchise_opening_deliverable_update on public.franchise_opening_deliverables for update to authenticated using(public.franchise_can_access_case(franchise_case_id)) with check(public.franchise_can_access_case(franchise_case_id));

create or replace function public.franchise_opening_payload_valid(p_code text,p_payload jsonb)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select jsonb_typeof(p_payload)='object' and p_payload ?& c.required_payload_keys
   and not exists(select 1 from unnest(c.required_payload_keys) k where p_payload->k is null or p_payload->k='null'::jsonb or trim(p_payload->>k)='')
   and case p_code when 'quality_audit' then (p_payload->>'score')~'^[0-9]+([.][0-9]+)?$' and (p_payload->>'score')::numeric>=80 and p_payload->>'open_finding_count'='0'
     when 'trial_operation' then (p_payload->>'successful_job_count')~'^[1-9][0-9]*$' and p_payload->>'critical_error_count'='0'
     when 'opening_board' then p_payload->>'decision'='approved' else true end
 from public.franchise_opening_deliverable_catalog c where c.deliverable_code=p_code and c.is_active
$$;

create or replace function public.franchise_opening_deliverable_guard()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_owner text; v_role text:=public.franchise_claim_role();
begin
 select owner_role into v_owner from public.franchise_opening_deliverable_catalog where deliverable_code=old.deliverable_code and is_active;
 if new.franchise_case_id<>old.franchise_case_id or new.deliverable_code<>old.deliverable_code or new.payload<>old.payload or new.evidence_sha256<>old.evidence_sha256 or new.maker_id<>old.maker_id or new.created_at<>old.created_at then raise exception 'Açılış teslimatının kapsam ve kanıtı değiştirilemez'; end if;
 if old.status<>'submitted' or new.status not in ('approved','rejected') then raise exception 'Yalnız gönderilmiş teslimat bir kez incelenebilir'; end if;
 if auth.uid() is null or new.checker_id<>auth.uid() or new.checker_id=old.maker_id or new.reviewed_at is null then raise exception 'Bağımsız açılış kontrolörü geçersiz'; end if;
 if old.deliverable_code='opening_board' and v_role<>'gm' then raise exception 'Açılış kurulunu yalnız GM onaylayabilir'; end if;
 if old.deliverable_code<>'opening_board' and v_role not in (v_owner,'gm','franchise_director') then raise exception 'Teslimat inceleme rolü geçersiz'; end if;
 return new;
end $$;
create trigger franchise_opening_deliverable_guard_trigger before update on public.franchise_opening_deliverables for each row execute function public.franchise_opening_deliverable_guard();

create or replace function public.submit_franchise_opening_deliverable(p_case_id uuid,p_code text,p_payload jsonb,p_evidence_sha256 text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid; v_owner text;
begin select owner_role into v_owner from public.franchise_opening_deliverable_catalog where deliverable_code=p_code and is_active;
 if v_owner is null or v_owner<>public.franchise_claim_role() then raise exception 'Teslimat departman sahipliği uyuşmuyor'; end if;
 if not public.franchise_opening_payload_valid(p_code,p_payload) then raise exception 'Teslimat alanları eksik veya eşik altında'; end if;
 insert into public.franchise_opening_deliverables(franchise_case_id,deliverable_code,payload,evidence_sha256,maker_id) values(p_case_id,p_code,p_payload,lower(p_evidence_sha256),auth.uid()) returning id into v_id; return v_id;
end $$;
create or replace function public.review_franchise_opening_deliverable(p_id uuid,p_approve boolean,p_note text)
returns boolean language plpgsql security invoker set search_path=public,pg_temp as $$
declare v public.franchise_opening_deliverables%rowtype;
begin select * into v from public.franchise_opening_deliverables where id=p_id for update; if not found then raise exception 'Açılış teslimatı bulunamadı'; end if;
 if not public.franchise_opening_payload_valid(v.deliverable_code,v.payload) then raise exception 'Teslimat alanları eksik veya eşik altında'; end if;
 update public.franchise_opening_deliverables set status=case when p_approve then 'approved' else 'rejected' end,checker_id=auth.uid(),reviewed_at=now(),review_note=left(trim(coalesce(p_note,'')),2000) where id=p_id; return p_approve; end $$;

create or replace function public.franchise_opening_execution_ready(p_case_id uuid)
returns boolean language sql stable security invoker set search_path=public,pg_temp as $$
 select count(*)=10 and bool_and(exists(select 1 from public.franchise_opening_deliverables d where d.franchise_case_id=p_case_id and d.deliverable_code=c.deliverable_code and d.status='approved' and public.franchise_opening_payload_valid(d.deliverable_code,d.payload))
   or (c.waivable and exists(select 1 from public.franchise_exceptions e where e.franchise_case_id=p_case_id and e.exception_type='opening:'||c.deliverable_code and e.status='approved' and e.reviewer_id<>e.requester_id)))
 from public.franchise_opening_deliverable_catalog c where c.is_active
$$;
create or replace function public.franchise_branch_opening_execution_gate()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$ begin if not public.franchise_opening_execution_ready(new.franchise_case_id) then raise exception 'Mimari, tedarik, kalibrasyon, İSG, kalite, pazarlama, BT, deneme veya açılış kurulu kapısı eksik'; end if; return new; end $$;
create trigger franchise_branch_opening_execution_gate_trigger before insert on public.franchise_branches for each row execute function public.franchise_branch_opening_execution_gate();
revoke all on function public.franchise_opening_payload_valid(text,jsonb),public.franchise_opening_deliverable_guard(),public.submit_franchise_opening_deliverable(uuid,text,jsonb,text),public.review_franchise_opening_deliverable(uuid,boolean,text),public.franchise_opening_execution_ready(uuid),public.franchise_branch_opening_execution_gate() from public,anon;
grant execute on function public.franchise_opening_payload_valid(text,jsonb),public.submit_franchise_opening_deliverable(uuid,text,jsonb,text),public.review_franchise_opening_deliverable(uuid,boolean,text),public.franchise_opening_execution_ready(uuid) to authenticated;
commit;
