begin;

create table if not exists public.franchise_integration_event_contracts (
  source text not null,
  event_type text not null,
  contract_version smallint not null check (contract_version>0),
  required_payload_keys text[] not null default '{}',
  allowed_payload_keys text[] not null default '{}',
  is_active boolean not null default true,
  primary key(source,event_type,contract_version),
  check (required_payload_keys <@ allowed_payload_keys)
);

insert into public.franchise_integration_event_contracts(source,event_type,contract_version,required_payload_keys,allowed_payload_keys) values
('finance','payment_plan.created',1,array['payment_plan_id'],array['payment_plan_id','branch_id','installment_count']),
('finance','opening_payment.verified',1,array['payment_verification_id'],array['payment_verification_id','branch_id','paid_ratio']),
('finance','royalty_profile.created',1,array['branch_id'],array['branch_id','royalty_rate','exemption_months']),
('legal','due_diligence.completed',1,array['due_diligence_id'],array['due_diligence_id']),
('legal','contract.signed',1,array['contract_id'],array['contract_id','template_version']),
('legal','territory.approved',1,array['territory_id'],array['territory_id','protection_type']),
('hr','staffing_plan.created',1,array['branch_id'],array['branch_id','branch_type','required_role_count']),
('hr','employee.hired',1,array['staff_id','role_key'],array['staff_id','role_key','branch_id']),
('hr','employment_file.completed',1,array['staff_id'],array['staff_id','branch_id']),
('academy','course.assigned',1,array['staff_id','course_id'],array['staff_id','course_id']),
('academy','certificate.issued',1,array['staff_id','certificate_id'],array['staff_id','certificate_id','valid_until']),
('academy','certificate.expired',1,array['staff_id','certificate_id'],array['staff_id','certificate_id']),
('operations','site_visit.completed',1,array['site_visit_id'],array['site_visit_id','location_id']),
('operations','trial_operation.completed',1,array['trial_operation_id'],array['trial_operation_id','branch_id']),
('procurement','equipment.ordered',1,array['order_id'],array['order_id','branch_id']),
('procurement','equipment.delivered',1,array['order_id','delivery_id'],array['order_id','delivery_id','branch_id']),
('procurement','calibration.verified',1,array['equipment_id','calibration_id'],array['equipment_id','calibration_id','branch_id']),
('it','account.provisioning_requested',1,array['branch_id'],array['branch_id','staff_scope_count']),
('it','account.activated',1,array['access_account_id'],array['access_account_id','branch_id']),
('it','branch_scope.assigned',1,array['access_account_id','branch_id'],array['access_account_id','branch_id']),
('marketing','brand_application.approved',1,array['brand_application_id'],array['brand_application_id','branch_id']),
('marketing','opening_campaign.ready',1,array['campaign_id'],array['campaign_id','branch_id']),
('quality','quality_audit.completed',1,array['audit_id'],array['audit_id','branch_id']),
('quality','corrective_action.closed',1,array['corrective_action_id'],array['corrective_action_id','audit_id']),
('ohs','risk_assessment.completed',1,array['risk_assessment_id'],array['risk_assessment_id','branch_id']),
('ohs','emergency_plan.published',1,array['emergency_plan_id'],array['emergency_plan_id','branch_id']),
('architecture','project.approved',1,array['project_id'],array['project_id','branch_id']),
('architecture','construction.completed',1,array['project_id','handover_id'],array['project_id','handover_id','branch_id']),
('architecture','handover.signed',1,array['handover_id'],array['handover_id','branch_id']),
('tasks','opening_tasks.created',1,array['franchise_case_id'],array['franchise_case_id','task_count']),
('tasks','followup_tasks.created',1,array['branch_id'],array['branch_id','task_count'])
on conflict(source,event_type,contract_version) do update set required_payload_keys=excluded.required_payload_keys,allowed_payload_keys=excluded.allowed_payload_keys,is_active=true;

alter table public.franchise_integration_outbox add column if not exists contract_version smallint not null default 1 check (contract_version>0);

create or replace function public.franchise_jsonb_has_prohibited_integration_key(p_value jsonb)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public, pg_temp
as $$
declare v_key text; v_nested jsonb;
begin
  if jsonb_typeof(p_value)='object' then
    for v_key,v_nested in select key,value from jsonb_each(p_value) loop
      if lower(v_key)=any(array['tckn','tc_kimlik_no','national_id','phone','telephone','email','iban','bank_account','plate','license_plate','vin','chassis','engine_no','person_name','full_name','document_url','file_url','token','password','secret']) then return true; end if;
      if public.franchise_jsonb_has_prohibited_integration_key(v_nested) then return true; end if;
    end loop;
  elsif jsonb_typeof(p_value)='array' then
    for v_nested in select value from jsonb_array_elements(p_value) loop
      if public.franchise_jsonb_has_prohibited_integration_key(v_nested) then return true; end if;
    end loop;
  end if;
  return false;
end;
$$;

create or replace function public.franchise_validate_integration_outbox()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_contract public.franchise_integration_event_contracts%rowtype; v_key text;
begin
  select * into v_contract from public.franchise_integration_event_contracts
  where source=new.source and event_type=new.event_type and contract_version=new.contract_version and is_active;
  if not found then raise exception 'Aktif entegrasyon olay sözleşmesi bulunamadı'; end if;
  if jsonb_typeof(new.payload)<>'object' then raise exception 'Entegrasyon yükü JSON nesnesi olmalıdır'; end if;
  if public.franchise_jsonb_has_prohibited_integration_key(new.payload) then raise exception 'Entegrasyon yükünde yasaklı kişisel veya gizli alan var'; end if;
  select k into v_key from jsonb_object_keys(new.payload) as k where not (k=any(v_contract.allowed_payload_keys)) limit 1;
  if v_key is not null then raise exception 'Entegrasyon yükünde sözleşme dışı alan: %',v_key; end if;
  select k into v_key from unnest(v_contract.required_payload_keys) as k where not (new.payload ? k) or new.payload->k='null'::jsonb or new.payload->>k='' limit 1;
  if v_key is not null then raise exception 'Entegrasyon yükünde zorunlu alan eksik: %',v_key; end if;
  return new;
end;
$$;
create trigger franchise_integration_outbox_contract_trigger before insert or update of source,event_type,payload,contract_version on public.franchise_integration_outbox for each row execute function public.franchise_validate_integration_outbox();

alter table public.franchise_integration_event_contracts enable row level security;
revoke all on public.franchise_integration_event_contracts from anon,authenticated;
grant select on public.franchise_integration_event_contracts to authenticated;
grant all on public.franchise_integration_event_contracts to service_role;
create policy franchise_integration_contract_select on public.franchise_integration_event_contracts for select to authenticated using (is_active);

revoke all on function public.franchise_jsonb_has_prohibited_integration_key(jsonb) from public,anon,authenticated;
revoke all on function public.franchise_validate_integration_outbox() from public,anon,authenticated;

commit;
