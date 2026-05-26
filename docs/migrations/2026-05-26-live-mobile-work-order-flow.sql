-- Align live branch work-order creation with the mobile report-entry flow.
-- New work orders now create the same technical task headings used by the
-- dynamic report template, and task submission advances the case status.

insert into public.package_plans (code, name, duration_minutes, included_modules, is_active)
values
  ('MINI', 'Mini Ekspertiz', 35, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Fren / Süspansiyon Testi"]'::jsonb, true),
  ('ESNAF', 'Esnaf Ekspertiz', 50, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","OBD / Beyin Testi"]'::jsonb, true),
  ('STANDARD', 'Standart Ekspertiz', 60, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","Fren / Süspansiyon Testi"]'::jsonb, true),
  ('FULL', 'Full Ekspertiz', 85, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","OBD / Beyin Testi","Fren / Süspansiyon Testi","Dyno / Yol Testi","Airbag Kontrol Testi","Conta Kaçak Testi"]'::jsonb, true),
  ('PREMIUM', 'OTOTR Premium 360', 110, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","OBD / Beyin Testi","Fren / Süspansiyon Testi","Dyno / Yol Testi","Genel Kondisyon / Dış Ekspertiz","İç Ekspertiz","Airbag Kontrol Testi","Conta Kaçak Testi"]'::jsonb, true),
  ('PREMIUM_360', 'OTOTR Premium 360', 110, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","OBD / Beyin Testi","Fren / Süspansiyon Testi","Dyno / Yol Testi","Genel Kondisyon / Dış Ekspertiz","İç Ekspertiz","Airbag Kontrol Testi","Conta Kaçak Testi"]'::jsonb, true),
  ('CORPORATE', 'Kurumsal / Filo Paketi', 105, '["İş Emri / Araç Kabul","Araç Dosya Ekspertizi","Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Kaporta ve Boya Ekspertizi","OBD / Beyin Testi","Fren / Süspansiyon Testi","Dyno / Yol Testi","Genel Kondisyon / Dış Ekspertiz","İç Ekspertiz","Airbag Kontrol Testi","Conta Kaçak Testi"]'::jsonb, true),
  ('KAPORTA_BOYA', 'Kaporta Boya', 40, '["Kaporta ve Boya Ekspertizi","Genel Kondisyon / Dış Ekspertiz"]'::jsonb, true),
  ('MEKANIK', 'Mekanik', 50, '["Motor Ekspertiz ve Check-up","Alt / Ön / Mekanik Ekspertiz","Fren / Süspansiyon Testi","Conta Kaçak Testi"]'::jsonb, true),
  ('HIZLI_KONTROL', 'Hızlı Kontrol', 25, '["Motor Ekspertiz ve Check-up","Fren / Süspansiyon Testi","Genel Kondisyon / Dış Ekspertiz"]'::jsonb, true)
on conflict (code) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  included_modules = excluded.included_modules,
  is_active = excluded.is_active;

update public.report_template_groups
set code = 'AIRBAG_CHECK',
    assigned_role = 'OBD Ustası'
where code = 'AIRBAG_HAVA_YASTIKLARI_KONTROL_TESTI'
   or title ilike '%airbag%';

create or replace function app_private.branch_work_order_task_specs(
  target_package_type text
)
returns table (
  task_key text,
  title text,
  assigned_role text,
  report_field_key text,
  estimated_minutes integer
)
language sql
stable
set search_path = public
as $$
  with requested as (
    select case upper(coalesce(target_package_type, 'STANDARD'))
      when 'PREMIUM_360' then 'PREMIUM'
      when 'OTOTR_PREMIUM_360' then 'PREMIUM'
      when 'KURUMSAL' then 'CORPORATE'
      when 'FILO' then 'CORPORATE'
      else upper(coalesce(target_package_type, 'STANDARD'))
    end as package_code
  ),
  specs(package_code, sort_order, task_key, title, assigned_role, report_field_key, estimated_minutes) as (
    values
      ('MINI', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('MINI', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('MINI', 30, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('ESNAF', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('ESNAF', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('ESNAF', 30, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('ESNAF', 40, 'OBD_ECU_TEST', 'OBD / Beyin Testi', 'OBD', 'report.section.obd_ecu_test', 17),
      ('STANDARD', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('STANDARD', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('STANDARD', 30, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('STANDARD', 40, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('FULL', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('FULL', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('FULL', 30, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('FULL', 40, 'OBD_ECU_TEST', 'OBD / Beyin Testi', 'OBD', 'report.section.obd_ecu_test', 17),
      ('FULL', 50, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('FULL', 60, 'DYNO_ROAD_TEST', 'Dyno / Yol Testi', 'TEST_OPERATOR', 'report.section.dyno_road_test', 9),
      ('FULL', 70, 'AIRBAG_CHECK', 'Airbag Kontrol Testi', 'OBD', 'report.section.airbag_check', 6),
      ('FULL', 80, 'HEAD_GASKET_LEAK_TEST', 'Conta Kaçak Testi', 'MECHANIC', 'report.section.head_gasket_leak_test', 1),
      ('PREMIUM', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('PREMIUM', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('PREMIUM', 30, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('PREMIUM', 40, 'OBD_ECU_TEST', 'OBD / Beyin Testi', 'OBD', 'report.section.obd_ecu_test', 17),
      ('PREMIUM', 50, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('PREMIUM', 60, 'DYNO_ROAD_TEST', 'Dyno / Yol Testi', 'TEST_OPERATOR', 'report.section.dyno_road_test', 9),
      ('PREMIUM', 70, 'EXTERIOR_CONDITION', 'Genel Kondisyon / Dış Ekspertiz', 'BODY_PAINT', 'report.section.exterior_condition', 23),
      ('PREMIUM', 80, 'INTERIOR_CHECKUP', 'İç Ekspertiz', 'BODY_PAINT', 'report.section.interior_checkup', 31),
      ('PREMIUM', 90, 'AIRBAG_CHECK', 'Airbag Kontrol Testi', 'OBD', 'report.section.airbag_check', 6),
      ('PREMIUM', 100, 'HEAD_GASKET_LEAK_TEST', 'Conta Kaçak Testi', 'MECHANIC', 'report.section.head_gasket_leak_test', 1),
      ('CORPORATE', 10, 'WORK_ORDER_ACCEPTANCE', 'İş Emri / Araç Kabul', 'RECEPTION_STAFF', 'report.section.work_order_acceptance', 3),
      ('CORPORATE', 20, 'VEHICLE_FILE_CHECK', 'Araç Dosya Ekspertizi', 'RECEPTION_STAFF', 'report.section.vehicle_file_check', 6),
      ('CORPORATE', 30, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('CORPORATE', 40, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('CORPORATE', 50, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('CORPORATE', 60, 'OBD_ECU_TEST', 'OBD / Beyin Testi', 'OBD', 'report.section.obd_ecu_test', 17),
      ('CORPORATE', 70, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('CORPORATE', 80, 'DYNO_ROAD_TEST', 'Dyno / Yol Testi', 'TEST_OPERATOR', 'report.section.dyno_road_test', 9),
      ('CORPORATE', 90, 'EXTERIOR_CONDITION', 'Genel Kondisyon / Dış Ekspertiz', 'BODY_PAINT', 'report.section.exterior_condition', 23),
      ('CORPORATE', 100, 'INTERIOR_CHECKUP', 'İç Ekspertiz', 'BODY_PAINT', 'report.section.interior_checkup', 31),
      ('CORPORATE', 110, 'AIRBAG_CHECK', 'Airbag Kontrol Testi', 'OBD', 'report.section.airbag_check', 6),
      ('CORPORATE', 120, 'HEAD_GASKET_LEAK_TEST', 'Conta Kaçak Testi', 'MECHANIC', 'report.section.head_gasket_leak_test', 1),
      ('KAPORTA_BOYA', 10, 'BODY_PAINT_CHECKUP', 'Kaporta ve Boya Ekspertizi', 'BODY_PAINT', 'report.section.body_paint_checkup', 44),
      ('KAPORTA_BOYA', 20, 'EXTERIOR_CONDITION', 'Genel Kondisyon / Dış Ekspertiz', 'BODY_PAINT', 'report.section.exterior_condition', 23),
      ('MEKANIK', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('MEKANIK', 20, 'MECHANICAL_CHECKUP', 'Alt / Ön / Mekanik Ekspertiz', 'MECHANIC', 'report.section.mechanical_checkup', 47),
      ('MEKANIK', 30, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('MEKANIK', 40, 'HEAD_GASKET_LEAK_TEST', 'Conta Kaçak Testi', 'MECHANIC', 'report.section.head_gasket_leak_test', 1),
      ('HIZLI_KONTROL', 10, 'MOTOR_CHECKUP', 'Motor Ekspertiz ve Check-up', 'MECHANIC', 'report.section.motor_checkup', 43),
      ('HIZLI_KONTROL', 20, 'BRAKE_SUSPENSION_TEST', 'Fren / Süspansiyon Testi', 'TEST_OPERATOR', 'report.section.brake_suspension_test', 6),
      ('HIZLI_KONTROL', 30, 'EXTERIOR_CONDITION', 'Genel Kondisyon / Dış Ekspertiz', 'BODY_PAINT', 'report.section.exterior_condition', 23)
  )
  select s.task_key, s.title, s.assigned_role, s.report_field_key, s.estimated_minutes
  from specs s
  join requested r on r.package_code = s.package_code
  order by s.sort_order;
$$;

create or replace function app_private.create_branch_work_order(
  customer_full_name text,
  customer_phone text,
  customer_email text,
  customer_identity_number text,
  customer_role text,
  vehicle_plate text,
  vehicle_vin text,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_fuel_type text,
  vehicle_transmission text,
  vehicle_kilometers integer,
  vehicle_seller_type text,
  vehicle_arrival_note text,
  package_type text,
  work_order_notes text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  actor record;
  package_record record;
  new_customer_id uuid;
  new_vehicle_id uuid;
  new_case_id uuid;
  active_template_id text;
  date_prefix text;
  next_sequence integer;
  task_record record;
begin
  select id, branch_id, role
    into actor
  from public.app_users
  where auth_user_id = auth.uid()
    and is_active = true
  limit 1;

  if actor.id is null then
    raise exception 'Aktif uygulama kullanicisi bulunamadi.';
  end if;

  if actor.branch_id is null then
    raise exception 'Kullanici sube baglantisi olmadan is emri acamaz.';
  end if;

  if actor.role not in (
    'BRANCH_MANAGER',
    'RECEPTION_STAFF',
    'INSPECTION_TECHNICIAN',
    'CEO',
    'GENERAL_MANAGER',
    'QUALITY_AUDITOR'
  ) then
    raise exception 'Bu rol is emri acamaz.';
  end if;

  select *
    into package_record
  from public.package_plans
  where code = case upper(coalesce(package_type, 'STANDARD'))
    when 'OTOTR_PREMIUM_360' then 'PREMIUM'
    else upper(coalesce(package_type, 'STANDARD'))
  end
    and is_active = true
  limit 1;

  if package_record.id is null then
    raise exception 'Paket bulunamadi: %', package_type;
  end if;

  select id into active_template_id
  from public.report_templates
  where is_active = true
  order by created_at desc
  limit 1;

  insert into public.customers (
    branch_id,
    owner_user_id,
    full_name,
    phone,
    email,
    identity_number,
    customer_role,
    kvkk_consent,
    service_consent,
    marketing_consent
  )
  values (
    actor.branch_id,
    actor.id,
    trim(customer_full_name),
    trim(customer_phone),
    nullif(trim(coalesce(customer_email, '')), ''),
    nullif(trim(coalesce(customer_identity_number, '')), ''),
    nullif(trim(coalesce(customer_role, 'Musteri')), ''),
    true,
    true,
    false
  )
  returning id into new_customer_id;

  insert into public.vehicles (
    branch_id,
    owner_user_id,
    customer_id,
    plate,
    vin,
    vin_normalized,
    brand,
    model,
    model_year,
    fuel_type,
    transmission,
    mileage_km,
    seller_type,
    arrival_note
  )
  values (
    actor.branch_id,
    actor.id,
    new_customer_id,
    upper(trim(vehicle_plate)),
    nullif(upper(trim(coalesce(vehicle_vin, ''))), ''),
    nullif(upper(trim(coalesce(vehicle_vin, ''))), ''),
    trim(vehicle_brand),
    trim(vehicle_model),
    vehicle_year,
    nullif(trim(coalesce(vehicle_fuel_type, '')), ''),
    nullif(trim(coalesce(vehicle_transmission, '')), ''),
    greatest(coalesce(vehicle_kilometers, 0), 0),
    nullif(trim(coalesce(vehicle_seller_type, '')), ''),
    nullif(trim(coalesce(vehicle_arrival_note, '')), '')
  )
  returning id into new_vehicle_id;

  date_prefix := 'OTOTR-' || to_char(now(), 'YYYYMMDD') || '-';
  select coalesce(max(nullif(replace(work_order_no, date_prefix, ''), '')::integer), 0) + 1
    into next_sequence
  from public.expertise_cases
  where work_order_no like date_prefix || '%'
    and replace(work_order_no, date_prefix, '') ~ '^[0-9]+$';

  insert into public.expertise_cases (
    branch_id,
    customer_id,
    vehicle_id,
    package_plan_id,
    template_id,
    work_order_no,
    status,
    risk_level,
    customer_summary,
    secretary_gate_ready,
    payment_gate_ready,
    kvkk_gate_ready,
    created_by,
    updated_by
  )
  values (
    actor.branch_id,
    new_customer_id,
    new_vehicle_id,
    package_record.id,
    active_template_id,
    date_prefix || lpad(next_sequence::text, 4, '0'),
    'START_EVIDENCE_REQUIRED',
    'NONE',
    nullif(trim(coalesce(work_order_notes, '')), ''),
    true,
    false,
    true,
    actor.id,
    actor.id
  )
  returning id into new_case_id;

  perform set_config('ototr.branch_work_order_admin', 'on', true);

  for task_record in
    select * from app_private.branch_work_order_task_specs(package_record.code)
  loop
    insert into public.inspection_tasks (
      expertise_case_id,
      task_key,
      title,
      assigned_role,
      assigned_user_id,
      status,
      report_field_key,
      required_fields,
      risky_findings,
      customer_friendly_note,
      manager_return_reason,
      revision_no,
      estimated_minutes
    )
    values (
      new_case_id,
      task_record.task_key,
      task_record.title,
      task_record.assigned_role,
      null,
      'LOCKED',
      task_record.report_field_key,
      '[]'::jsonb,
      '[]'::jsonb,
      '',
      '',
      1,
      task_record.estimated_minutes
    );
  end loop;

  return new_case_id;
end;
$$;

create or replace function public.submit_inspection_task(target_task_id uuid)
returns public.inspection_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  previous_task public.inspection_tasks;
  next_task public.inspection_tasks;
  active_task_count integer;
  completed_task_count integer;
begin
  actor_id := public.current_app_user_id();
  if actor_id is null then
    raise exception 'Aktif kullanici bulunamadi.';
  end if;

  select * into previous_task
  from public.inspection_tasks
  where id = target_task_id
  for update;

  if previous_task.owner_user_id <> actor_id then
    raise exception 'Sadece gorev sahibi basligi gonderebilir.';
  end if;

  perform set_config('ototr.task_submit', 'on', true);

  update public.inspection_tasks
  set
    status = 'COMPLETED',
    ownership_history = public.append_task_history(
      ownership_history,
      'SUBMITTED',
      actor_id,
      previous_task.owner_user_id,
      previous_task.owner_user_id,
      'completed'
    ),
    audit_log = public.append_task_audit(audit_log, 'submit', actor_id, 'completed')
  where id = target_task_id
  returning * into next_task;

  perform public.log_task_audit(
    next_task.expertise_case_id,
    actor_id,
    'SUBMIT_TASK',
    target_task_id,
    'completed',
    to_jsonb(previous_task),
    to_jsonb(next_task)
  );

  select
    count(*) filter (where status <> 'CANCELLED'),
    count(*) filter (where status = 'COMPLETED')
  into active_task_count, completed_task_count
  from public.inspection_tasks
  where expertise_case_id = next_task.expertise_case_id;

  update public.expertise_cases
  set
    status = case
      when active_task_count > 0 and active_task_count = completed_task_count
      then 'MANAGER_REVIEW'
      else 'TECHNICAL_ENTRY_OPEN'
    end,
    inspection_completed_at = case
      when active_task_count > 0 and active_task_count = completed_task_count
      then now()
      else inspection_completed_at
    end,
    updated_at = now()
  where id = next_task.expertise_case_id;

  return next_task;
end;
$$;

revoke all on function app_private.branch_work_order_task_specs(text) from public, anon;
revoke all on function app_private.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) from public, anon;
revoke all on function public.submit_inspection_task(uuid) from public, anon;

grant execute on function app_private.branch_work_order_task_specs(text) to authenticated;
grant execute on function app_private.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) to authenticated;
grant execute on function public.submit_inspection_task(uuid) to authenticated;
