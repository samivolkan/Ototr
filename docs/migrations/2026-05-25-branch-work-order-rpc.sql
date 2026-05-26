-- Branch work order RPCs for the Flutter office screens.
--
-- The public functions are thin RPC wrappers. Privileged writes stay in the
-- private schema so customers/vehicles can be created without opening broad
-- INSERT policies on exposed public tables.

create schema if not exists app_private;

insert into public.package_plans (code, name, duration_minutes, included_modules, is_active)
values
  ('STANDARD', 'Standard', 45, '["Kaporta","Boya","Motor","Mekanik","Genel foto","Rapor kontrol"]'::jsonb, true),
  ('FULL', 'Full', 75, '["Kaporta","Boya","Motor","Mekanik","Elektrik","Alt takim","Fren","Genel foto","Rapor kontrol"]'::jsonb, true),
  ('PREMIUM', 'Premium', 95, '["Kaporta","Boya","Motor","Mekanik","Elektrik","Dyno","Alt takim","Fren","Ic kondisyon","Genel foto","Rapor kontrol","Yonetici onay"]'::jsonb, true),
  ('KAPORTA_BOYA', 'Kaporta Boya', 35, '["Kaporta","Boya","Genel foto","Rapor kontrol"]'::jsonb, true),
  ('MEKANIK', 'Mekanik', 40, '["Motor","Mekanik","Alt takim","Fren","Rapor kontrol"]'::jsonb, true),
  ('HIZLI_KONTROL', 'Hizli Kontrol', 20, '["Genel foto","Motor","Fren","Rapor kontrol"]'::jsonb, true)
on conflict (code) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  included_modules = excluded.included_modules,
  is_active = excluded.is_active;

alter table public.inspection_tasks
  drop constraint if exists inspection_tasks_status_check;

alter table public.inspection_tasks
  add constraint inspection_tasks_status_check
  check (
    status in (
      'AVAILABLE',
      'ASSIGNED',
      'LOCKED',
      'OPEN',
      'COMPLETED',
      'CANCELLED',
      'EVIDENCE_MISSING',
      'MANAGER_RETURNED',
      'CONFLICT_DETECTED'
    )
  );

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
    select upper(coalesce(target_package_type, 'STANDARD')) as package_code
  ),
  specs(package_code, sort_order, task_key, title, assigned_role, report_field_key, estimated_minutes) as (
    values
      ('STANDARD', 10, 'KAPORTA_KONTROL', 'Kaporta kontrol', 'BODY_PAINT', 'report.section.body', 8),
      ('STANDARD', 20, 'BOYA_KONTROL', 'Boya kontrol', 'BODY_PAINT', 'report.section.paint', 8),
      ('STANDARD', 30, 'MOTOR_KONTROL', 'Motor kontrol', 'MECHANIC', 'report.section.engine', 8),
      ('STANDARD', 40, 'MEKANIK_KONTROL', 'Mekanik kontrol', 'MECHANIC', 'report.section.mechanic', 8),
      ('STANDARD', 50, 'GENEL_FOTO', 'Genel foto', 'BODY_PAINT', 'report.section.photos', 5),
      ('STANDARD', 60, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5),

      ('FULL', 10, 'KAPORTA_KONTROL', 'Kaporta kontrol', 'BODY_PAINT', 'report.section.body', 8),
      ('FULL', 20, 'BOYA_KONTROL', 'Boya kontrol', 'BODY_PAINT', 'report.section.paint', 8),
      ('FULL', 30, 'MOTOR_KONTROL', 'Motor kontrol', 'MECHANIC', 'report.section.engine', 8),
      ('FULL', 40, 'MEKANIK_KONTROL', 'Mekanik kontrol', 'MECHANIC', 'report.section.mechanic', 8),
      ('FULL', 50, 'ELEKTRIK_KONTROL', 'Elektrik kontrol', 'OBD', 'report.section.electric', 8),
      ('FULL', 60, 'ALT_TAKIM_KONTROL', 'Alt takim kontrol', 'MECHANIC', 'report.section.undercarriage', 8),
      ('FULL', 70, 'FREN_KONTROL', 'Fren kontrol', 'TEST_OPERATOR', 'report.section.brake', 8),
      ('FULL', 80, 'GENEL_FOTO', 'Genel foto', 'BODY_PAINT', 'report.section.photos', 5),
      ('FULL', 90, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5),

      ('PREMIUM', 10, 'KAPORTA_KONTROL', 'Kaporta kontrol', 'BODY_PAINT', 'report.section.body', 8),
      ('PREMIUM', 20, 'BOYA_KONTROL', 'Boya kontrol', 'BODY_PAINT', 'report.section.paint', 8),
      ('PREMIUM', 30, 'MOTOR_KONTROL', 'Motor kontrol', 'MECHANIC', 'report.section.engine', 8),
      ('PREMIUM', 40, 'MEKANIK_KONTROL', 'Mekanik kontrol', 'MECHANIC', 'report.section.mechanic', 8),
      ('PREMIUM', 50, 'ELEKTRIK_KONTROL', 'Elektrik kontrol', 'OBD', 'report.section.electric', 8),
      ('PREMIUM', 60, 'DYNO_TEST', 'Dyno test', 'TEST_OPERATOR', 'report.section.dyno', 8),
      ('PREMIUM', 70, 'ALT_TAKIM_KONTROL', 'Alt takim kontrol', 'MECHANIC', 'report.section.undercarriage', 8),
      ('PREMIUM', 80, 'FREN_KONTROL', 'Fren kontrol', 'TEST_OPERATOR', 'report.section.brake', 8),
      ('PREMIUM', 90, 'IC_KONDISYON', 'Ic kondisyon', 'FOREMAN', 'report.section.interior', 6),
      ('PREMIUM', 100, 'GENEL_FOTO', 'Genel foto', 'BODY_PAINT', 'report.section.photos', 5),
      ('PREMIUM', 110, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5),
      ('PREMIUM', 120, 'YONETICI_ONAY', 'Yonetici onay', 'BRANCH_MANAGER', 'report.section.manager_approval', 5),

      ('KAPORTA_BOYA', 10, 'KAPORTA_KONTROL', 'Kaporta kontrol', 'BODY_PAINT', 'report.section.body', 8),
      ('KAPORTA_BOYA', 20, 'BOYA_KONTROL', 'Boya kontrol', 'BODY_PAINT', 'report.section.paint', 8),
      ('KAPORTA_BOYA', 30, 'GENEL_FOTO', 'Genel foto', 'BODY_PAINT', 'report.section.photos', 5),
      ('KAPORTA_BOYA', 40, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5),

      ('MEKANIK', 10, 'MOTOR_KONTROL', 'Motor kontrol', 'MECHANIC', 'report.section.engine', 8),
      ('MEKANIK', 20, 'MEKANIK_KONTROL', 'Mekanik kontrol', 'MECHANIC', 'report.section.mechanic', 8),
      ('MEKANIK', 30, 'ALT_TAKIM_KONTROL', 'Alt takim kontrol', 'MECHANIC', 'report.section.undercarriage', 8),
      ('MEKANIK', 40, 'FREN_KONTROL', 'Fren kontrol', 'TEST_OPERATOR', 'report.section.brake', 8),
      ('MEKANIK', 50, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5),

      ('HIZLI_KONTROL', 10, 'GENEL_FOTO', 'Genel foto', 'BODY_PAINT', 'report.section.photos', 5),
      ('HIZLI_KONTROL', 20, 'MOTOR_KONTROL', 'Motor kontrol', 'MECHANIC', 'report.section.engine', 8),
      ('HIZLI_KONTROL', 30, 'FREN_KONTROL', 'Fren kontrol', 'TEST_OPERATOR', 'report.section.brake', 8),
      ('HIZLI_KONTROL', 40, 'RAPOR_KONTROL', 'Rapor kontrol', 'FOREMAN', 'report.section.review', 5)
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
  where code = upper(coalesce(package_type, 'STANDARD'))
    and is_active = true
  limit 1;

  if package_record.id is null then
    raise exception 'Paket bulunamadi: %', package_type;
  end if;

  insert into public.customers (
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
    date_prefix || lpad(next_sequence::text, 4, '0'),
    'DRAFT',
    'NONE',
    nullif(trim(coalesce(work_order_notes, '')), ''),
    true,
    false,
    true,
    actor.id,
    actor.id
  )
  returning id into new_case_id;

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

create or replace function app_private.update_branch_work_order_task_status(
  target_task_id uuid,
  next_status text
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
  actor record;
  current_task record;
  target_case_id uuid;
  remote_status text;
  active_task_count integer;
  completed_task_count integer;
  open_task_count integer;
  assigned_task_count integer;
  next_case_status text;
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

  if actor.role not in (
    'BRANCH_MANAGER',
    'RECEPTION_STAFF',
    'CEO',
    'GENERAL_MANAGER',
    'QUALITY_AUDITOR'
  ) then
    raise exception 'Bu rol is emri gorev durumu guncelleyemez.';
  end if;

  select it.id, it.expertise_case_id, ec.branch_id
    into current_task
  from public.inspection_tasks it
  join public.expertise_cases ec on ec.id = it.expertise_case_id
  where it.id = target_task_id
  for update;

  if current_task.id is null then
    raise exception 'Gorev bulunamadi.';
  end if;

  if not app_private.current_user_can_access_branch(current_task.branch_id) then
    raise exception 'Bu is emrine erisim yok.';
  end if;

  remote_status := case upper(coalesce(next_status, 'PENDING'))
    when 'PENDING' then 'LOCKED'
    when 'ASSIGNED' then 'ASSIGNED'
    when 'IN_PROGRESS' then 'OPEN'
    when 'COMPLETED' then 'COMPLETED'
    when 'CANCELLED' then 'CANCELLED'
    else null
  end;

  if remote_status is null then
    raise exception 'Gecersiz gorev durumu: %', next_status;
  end if;

  perform set_config('ototr.branch_work_order_admin', 'on', true);
  perform set_config('ototr.manager_task_admin', 'on', true);

  update public.inspection_tasks
  set
    status = remote_status,
    updated_at = now(),
    audit_log = public.append_task_audit(
      audit_log,
      'branch_status_update',
      actor.id,
      upper(coalesce(next_status, 'PENDING'))
    )
  where id = target_task_id
  returning expertise_case_id into target_case_id;

  select
    count(*) filter (where status <> 'CANCELLED'),
    count(*) filter (where status = 'COMPLETED'),
    count(*) filter (where status = 'OPEN'),
    count(*) filter (where status = 'ASSIGNED')
    into active_task_count, completed_task_count, open_task_count, assigned_task_count
  from public.inspection_tasks
  where expertise_case_id = target_case_id;

  next_case_status := case
    when active_task_count = 0 then 'CANCELLED'
    when active_task_count = completed_task_count then 'MANAGER_REVIEW'
    when open_task_count > 0 then 'TECHNICAL_ENTRY_OPEN'
    when assigned_task_count > 0 then 'ASSIGNED'
    else 'DRAFT'
  end;

  update public.expertise_cases
  set
    status = next_case_status,
    inspection_started_at = case
      when next_case_status = 'TECHNICAL_ENTRY_OPEN' and inspection_started_at is null
      then now()
      else inspection_started_at
    end,
    inspection_completed_at = case
      when next_case_status = 'MANAGER_REVIEW' then now()
      else inspection_completed_at
    end,
    updated_by = actor.id
  where id = target_case_id;

  return target_case_id;
end;
$$;

create or replace function public.create_branch_work_order(
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
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.create_branch_work_order(
    customer_full_name,
    customer_phone,
    customer_email,
    customer_identity_number,
    customer_role,
    vehicle_plate,
    vehicle_vin,
    vehicle_brand,
    vehicle_model,
    vehicle_year,
    vehicle_fuel_type,
    vehicle_transmission,
    vehicle_kilometers,
    vehicle_seller_type,
    vehicle_arrival_note,
    package_type,
    work_order_notes
  );
$$;

create or replace function public.update_branch_work_order_task_status(
  target_task_id uuid,
  next_status text
)
returns uuid
language sql
security invoker
set search_path = public, app_private
as $$
  select app_private.update_branch_work_order_task_status(
    target_task_id,
    next_status
  );
$$;

create or replace function public.enforce_inspection_task_owner_mutation()
returns trigger as $$
declare
  actor_id uuid;
  actor_role text;
begin
  if current_setting('ototr.branch_work_order_admin', true) = 'on' then
    return new;
  end if;

  actor_id := current_app_user_id();
  actor_role := current_app_user_role();

  if actor_role = 'BRANCH_MANAGER' then
    if current_setting('ototr.manager_task_admin', true) = 'on' then
      return new;
    end if;
    raise exception 'Mudur teknik veriyi degistiremez; sadece sahiplik islemi yapabilir.';
  end if;

  if old.owner_user_id is null and new.owner_user_id is null then
    if old.status in ('LOCKED', 'ASSIGNED')
       and new.status = 'AVAILABLE'
       and (to_jsonb(new) - 'updated_at' - 'status') =
           (to_jsonb(old) - 'updated_at' - 'status') then
      return new;
    end if;
    raise exception 'Baslik sahiplenilmeden degistirilemez.';
  end if;

  if old.owner_user_id is null and new.owner_user_id is not null then
    if new.owner_user_id = actor_id
       and current_setting('ototr.task_claim', true) = 'on' then
      return new;
    end if;
    raise exception 'Baslik sadece claim RPC ile sahiplenilebilir.';
  end if;

  if old.owner_user_id <> actor_id then
    raise exception 'Sadece gorev sahibi bu basligi degistirebilir.';
  end if;

  if new.owner_user_id is null then
    if current_setting('ototr.task_release', true) = 'on' then
      return new;
    end if;
    raise exception 'Gorev sadece release RPC ile birakilabilir.';
  end if;

  if new.owner_user_id is distinct from old.owner_user_id then
    raise exception 'Usta sahipligi dogrudan degistiremez.';
  end if;

  if new.status is distinct from old.status
     and current_setting('ototr.task_submit', true) <> 'on' then
    raise exception 'Baslik durumu sadece ilgili islem RPC ile degistirilebilir.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke all on function app_private.branch_work_order_task_specs(text) from public, anon;
revoke all on function app_private.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) from public, anon;
revoke all on function app_private.update_branch_work_order_task_status(uuid, text) from public, anon;

grant execute on function app_private.branch_work_order_task_specs(text) to authenticated;
grant execute on function app_private.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) to authenticated;
grant execute on function app_private.update_branch_work_order_task_status(uuid, text) to authenticated;

revoke all on function public.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) from public, anon;
revoke all on function public.update_branch_work_order_task_status(uuid, text) from public, anon;

grant execute on function public.create_branch_work_order(text, text, text, text, text, text, text, text, text, integer, text, text, integer, text, text, text, text) to authenticated;
grant execute on function public.update_branch_work_order_task_status(uuid, text) to authenticated;
