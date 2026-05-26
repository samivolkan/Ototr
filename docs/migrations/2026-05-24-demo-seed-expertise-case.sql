-- OTOTR demo seed for Supabase staging
-- Run after: 2026-05-24-expertise-report-backbone.sql
--
-- IMPORTANT:
-- 1) Create a Supabase Auth user first, or use an existing one.
-- 2) Replace the auth_user_id value below with that user's auth.users.id.
-- 3) Never put service_role keys in Flutter. This seed is SQL Editor/staging only.

begin;

insert into branches (
  id,
  code,
  name,
  city,
  district,
  region,
  is_active
)
values (
  '11111111-1111-1111-1111-111111111111',
  'OTOTR-BRS-001',
  'OTOTR Bursa Nilüfer',
  'Bursa',
  'Nilüfer',
  'Marmara',
  true
)
on conflict (code) do update set
  name = excluded.name,
  city = excluded.city,
  district = excluded.district,
  region = excluded.region,
  is_active = excluded.is_active;

insert into app_users (
  id,
  auth_user_id,
  branch_id,
  full_name,
  email,
  phone,
  role,
  is_active
)
values
(
  '22222222-2222-2222-2222-222222222222',
  null, -- TODO: replace with Supabase auth.users.id for ahmet.usta@ototr.test
  '11111111-1111-1111-1111-111111111111',
  'Ahmet Usta',
  'ahmet.usta@ototr.test',
  '0555 000 16 16',
  'INSPECTION_TECHNICIAN',
  true
),
(
  '33333333-3333-3333-3333-333333333333',
  null,
  '11111111-1111-1111-1111-111111111111',
  'Murat Kaya',
  'murat.kaya@ototr.test',
  '0555 000 16 17',
  'BRANCH_MANAGER',
  true
)
on conflict (email) do update set
  branch_id = excluded.branch_id,
  full_name = excluded.full_name,
  phone = excluded.phone,
  role = excluded.role,
  is_active = excluded.is_active;

insert into customers (
  id,
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
  '44444444-4444-4444-4444-444444444444',
  'Mehmet Yılmaz',
  '0532 000 16 16',
  'mehmet.yilmaz@example.test',
  null,
  'Alıcı',
  true,
  true,
  false
)
on conflict (id) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  email = excluded.email,
  customer_role = excluded.customer_role,
  kvkk_consent = excluded.kvkk_consent,
  service_consent = excluded.service_consent,
  marketing_consent = excluded.marketing_consent;

insert into vehicles (
  id,
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
  '55555555-5555-5555-5555-555555555555',
  '44444444-4444-4444-4444-444444444444',
  '16 ABC 123',
  'WVWZZZ3CZLE000001',
  'WVWZZZ3CZLE000001',
  'Volkswagen',
  'Passat 1.5 TSI',
  2020,
  'Benzin',
  'Otomatik',
  84500,
  'Bireysel',
  'Randevulu kabul. Sol arka kapıda boya beyanı var.'
)
on conflict (id) do update set
  customer_id = excluded.customer_id,
  plate = excluded.plate,
  vin = excluded.vin,
  vin_normalized = excluded.vin_normalized,
  brand = excluded.brand,
  model = excluded.model,
  model_year = excluded.model_year,
  fuel_type = excluded.fuel_type,
  transmission = excluded.transmission,
  mileage_km = excluded.mileage_km,
  seller_type = excluded.seller_type,
  arrival_note = excluded.arrival_note;

insert into package_plans (
  id,
  code,
  name,
  duration_minutes,
  included_modules,
  is_active
)
values (
  '66666666-6666-6666-6666-666666666666',
  'PREMIUM_360',
  'OTOTR Premium 360',
  95,
  '["Kaporta & Boya","Motor / Mekanik","OBD / Elektronik","Fren / Dyno / Yol Testi"]'::jsonb,
  true
)
on conflict (code) do update set
  name = excluded.name,
  duration_minutes = excluded.duration_minutes,
  included_modules = excluded.included_modules,
  is_active = excluded.is_active;

insert into appointments (
  id,
  branch_id,
  customer_id,
  vehicle_id,
  package_plan_id,
  appointment_at,
  source,
  status,
  assigned_user_id,
  notes
)
values (
  '77777777-7777-7777-7777-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '2026-05-24 10:30:00+03',
  'CRM Demo',
  'ARRIVED',
  '22222222-2222-2222-2222-222222222222',
  'Demo staging randevusu.'
)
on conflict (id) do update set
  branch_id = excluded.branch_id,
  customer_id = excluded.customer_id,
  vehicle_id = excluded.vehicle_id,
  package_plan_id = excluded.package_plan_id,
  appointment_at = excluded.appointment_at,
  source = excluded.source,
  status = excluded.status,
  assigned_user_id = excluded.assigned_user_id,
  notes = excluded.notes;

insert into expertise_cases (
  id,
  branch_id,
  appointment_id,
  customer_id,
  vehicle_id,
  package_plan_id,
  work_order_no,
  report_no,
  verification_token,
  status,
  risk_level,
  overall_result,
  customer_summary,
  assigned_technician_id,
  technical_supervisor_id,
  secretary_gate_ready,
  payment_gate_ready,
  kvkk_gate_ready,
  revision_no,
  is_locked,
  opened_at,
  created_by,
  updated_by
)
values (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '77777777-7777-7777-7777-777777777777',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  'WO-2026-0001',
  'OTOTR-20260524-0001',
  'demo-verification-token-20260524-0001',
  'ASSIGNED',
  'MEDIUM',
  null,
  '',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  true,
  true,
  true,
  1,
  false,
  '2026-05-24 10:15:00+03',
  '33333333-3333-3333-3333-333333333333',
  '33333333-3333-3333-3333-333333333333'
)
on conflict (id) do update set
  branch_id = excluded.branch_id,
  appointment_id = excluded.appointment_id,
  customer_id = excluded.customer_id,
  vehicle_id = excluded.vehicle_id,
  package_plan_id = excluded.package_plan_id,
  work_order_no = excluded.work_order_no,
  report_no = excluded.report_no,
  verification_token = excluded.verification_token,
  status = excluded.status,
  risk_level = excluded.risk_level,
  assigned_technician_id = excluded.assigned_technician_id,
  technical_supervisor_id = excluded.technical_supervisor_id,
  secretary_gate_ready = excluded.secretary_gate_ready,
  payment_gate_ready = excluded.payment_gate_ready,
  kvkk_gate_ready = excluded.kvkk_gate_ready,
  is_locked = excluded.is_locked,
  updated_by = excluded.updated_by;

insert into technician_start_evidence (
  id,
  expertise_case_id,
  vin,
  vin_photo_url,
  plate_photo_url,
  odometer_km,
  odometer_photo_url,
  captured_by,
  captured_at,
  device_id,
  gps_approx
)
values (
  '99999999-9999-9999-9999-999999999999',
  '88888888-8888-8888-8888-888888888888',
  '',
  '',
  '',
  null,
  '',
  '22222222-2222-2222-2222-222222222222',
  '2026-05-24 10:30:00+03',
  'android-demo-device',
  'Bursa Nilüfer'
)
on conflict (expertise_case_id) do update set
  vin = excluded.vin,
  vin_photo_url = excluded.vin_photo_url,
  plate_photo_url = excluded.plate_photo_url,
  odometer_km = excluded.odometer_km,
  odometer_photo_url = excluded.odometer_photo_url,
  captured_by = excluded.captured_by,
  captured_at = excluded.captured_at,
  device_id = excluded.device_id,
  gps_approx = excluded.gps_approx;

insert into inspection_tasks (
  id,
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
values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  '88888888-8888-8888-8888-888888888888',
  'body-paint',
  'Kaporta ve Boya Ekspertizi',
  'BODY_PAINT',
  '22222222-2222-2222-2222-222222222222',
  'LOCKED',
  'report.section.body_paint',
  '["customerFriendlyNote"]'::jsonb,
  '[]'::jsonb,
  '',
  '',
  1,
  15
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  '88888888-8888-8888-8888-888888888888',
  'mechanic',
  'Motor / Mekanik',
  'MECHANIC',
  null,
  'LOCKED',
  'report.section.engine_mechanic',
  '["customerFriendlyNote"]'::jsonb,
  '[]'::jsonb,
  '',
  '',
  1,
  8
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  '88888888-8888-8888-8888-888888888888',
  'obd',
  'OBD / Elektronik',
  'OBD',
  null,
  'LOCKED',
  'report.section.obd',
  '["customerFriendlyNote"]'::jsonb,
  '[]'::jsonb,
  '',
  '',
  1,
  8
),
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  '88888888-8888-8888-8888-888888888888',
  'test',
  'Fren / Dyno / Yol Testi',
  'TEST_OPERATOR',
  null,
  'LOCKED',
  'report.section.road_test',
  '["customerFriendlyNote"]'::jsonb,
  '[]'::jsonb,
  '',
  '',
  1,
  8
)
on conflict (expertise_case_id, task_key) do update set
  title = excluded.title,
  assigned_role = excluded.assigned_role,
  assigned_user_id = excluded.assigned_user_id,
  status = excluded.status,
  report_field_key = excluded.report_field_key,
  required_fields = excluded.required_fields,
  risky_findings = excluded.risky_findings,
  customer_friendly_note = excluded.customer_friendly_note,
  manager_return_reason = excluded.manager_return_reason,
  revision_no = excluded.revision_no,
  estimated_minutes = excluded.estimated_minutes;

insert into inspection_item_values (
  id,
  expertise_case_id,
  task_id,
  item_key,
  title,
  result,
  note,
  not_done_reason,
  report_field_key,
  requires_evidence_on_risk,
  severity,
  created_by,
  updated_by
)
values
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'front-hood',
  'Ön Kaput',
  'NORMAL',
  '',
  '',
  'report.body_paint.front_hood',
  true,
  0,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'roof',
  'Tavan',
  'NORMAL',
  '',
  '',
  'report.body_paint.roof',
  true,
  0,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'left-front-door',
  'Sol Ön Kapı',
  'RISKY',
  'Sol ön kapıda boya işlemi şüphesi var.',
  '',
  'report.body_paint.left_front_door',
  true,
  1,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb4',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2',
  'oil-leak',
  'Yağ kaçak kontrolü',
  'NORMAL',
  '',
  '',
  'report.engine.oil_leak',
  true,
  0,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb5',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'obd-output',
  'OBD test çıktısı',
  'NOT_DONE',
  '',
  '',
  'report.obd.output',
  true,
  0,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb6',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4',
  'road-test-note',
  'Yol testi notu',
  'NORMAL',
  '',
  '',
  'report.road_test.note',
  false,
  0,
  '22222222-2222-2222-2222-222222222222',
  '22222222-2222-2222-2222-222222222222'
)
on conflict (expertise_case_id, task_id, item_key) do update set
  title = excluded.title,
  result = excluded.result,
  note = excluded.note,
  not_done_reason = excluded.not_done_reason,
  report_field_key = excluded.report_field_key,
  requires_evidence_on_risk = excluded.requires_evidence_on_risk,
  severity = excluded.severity,
  updated_by = excluded.updated_by;

insert into inspection_evidence_assets (
  id,
  expertise_case_id,
  task_id,
  item_value_id,
  field_key,
  report_field_key,
  evidence_type,
  title,
  local_path,
  remote_url,
  storage_path,
  file_hash,
  sync_status,
  is_required,
  quality_status,
  rejection_reason,
  captured_by,
  captured_at,
  uploaded_at,
  device_id
)
values (
  'cccccccc-cccc-cccc-cccc-ccccccccccc1',
  '88888888-8888-8888-8888-888888888888',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  null,
  'body_general_photo',
  'report.photos.body_general',
  'IMAGE',
  'Kaporta genel açı fotoğrafı',
  null,
  'https://example.test/demo/body-general.jpg',
  'demo/body-general.jpg',
  'demo-hash-body-general',
  'UPLOADED',
  true,
  'ACCEPTED',
  '',
  '22222222-2222-2222-2222-222222222222',
  '2026-05-24 10:40:00+03',
  '2026-05-24 10:41:00+03',
  'android-demo-device'
)
on conflict (id) do update set
  remote_url = excluded.remote_url,
  storage_path = excluded.storage_path,
  file_hash = excluded.file_hash,
  sync_status = excluded.sync_status,
  quality_status = excluded.quality_status,
  rejection_reason = excluded.rejection_reason,
  uploaded_at = excluded.uploaded_at;

insert into external_query_results (
  id,
  expertise_case_id,
  query_type,
  source,
  status,
  result_summary,
  raw_payload,
  queried_at,
  imported_to_report,
  blocking_reason
)
values
(
  'dddddddd-dddd-dddd-dddd-ddddddddddd1',
  '88888888-8888-8888-8888-888888888888',
  'KM geçmişi',
  'Portal entegrasyonu',
  'READY',
  'Son kayıt: 84.500 km / 16.05.2026',
  '{"lastKm":84500,"lastDate":"2026-05-16"}'::jsonb,
  '2026-05-24 10:20:00+03',
  true,
  ''
),
(
  'dddddddd-dddd-dddd-dddd-ddddddddddd2',
  '88888888-8888-8888-8888-888888888888',
  'Tramer/SBM',
  'Portal entegrasyonu',
  'PENDING',
  '',
  null,
  null,
  false,
  'Dış sorgu bekliyor: Tramer/SBM sonucu yok.'
)
on conflict (id) do update set
  query_type = excluded.query_type,
  source = excluded.source,
  status = excluded.status,
  result_summary = excluded.result_summary,
  raw_payload = excluded.raw_payload,
  queried_at = excluded.queried_at,
  imported_to_report = excluded.imported_to_report,
  blocking_reason = excluded.blocking_reason;

delete from report_gate_issues
where expertise_case_id = '88888888-8888-8888-8888-888888888888';

insert into report_gate_issues (
  expertise_case_id,
  issue_code,
  message,
  task_id,
  field_key,
  evidence_related,
  external_query_related,
  is_blocking
)
values
(
  '88888888-8888-8888-8888-888888888888',
  'START_EVIDENCE_MISSING',
  'Başlangıç kanıtı tamamlanmadı.',
  null,
  'start_evidence',
  true,
  false,
  true
),
(
  '88888888-8888-8888-8888-888888888888',
  'RISKY_FINDING_NEEDS_EVIDENCE',
  'Sol Ön Kapı için fotoğraf veya cihaz çıktısı eklenmeli.',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
  'report.body_paint.left_front_door',
  true,
  false,
  true
),
(
  '88888888-8888-8888-8888-888888888888',
  'NOT_DONE_NEEDS_REASON',
  'OBD test çıktısı yapılamadıysa nedeni yazılmalı.',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3',
  'report.obd.output',
  false,
  false,
  true
),
(
  '88888888-8888-8888-8888-888888888888',
  'EXTERNAL_QUERY_PENDING',
  'Dış sorgu bekliyor: Tramer/SBM sonucu yok.',
  null,
  'external_queries.Tramer/SBM',
  false,
  true,
  true
);

delete from report_audit_logs
where expertise_case_id = '88888888-8888-8888-8888-888888888888'
  and action = 'DEMO_SEED';

insert into report_audit_logs (
  expertise_case_id,
  actor_id,
  action,
  entity_name,
  entity_id,
  new_value
)
values (
  '88888888-8888-8888-8888-888888888888',
  '33333333-3333-3333-3333-333333333333',
  'DEMO_SEED',
  'expertise_cases',
  '88888888-8888-8888-8888-888888888888',
  '{"note":"Demo ekspertiz dosyası seed edildi."}'::jsonb
);

commit;
