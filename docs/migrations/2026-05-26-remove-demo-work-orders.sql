-- One-time staging cleanup for demo/smoke expertise cases.
-- Keeps real live work orders and removes only explicit mock markers.

begin;

alter table public.inspection_item_values
  disable trigger trg_enforce_inspection_values_owner;
alter table public.inspection_item_values
  disable trigger trg_audit_inspection_values;
alter table public.inspection_evidence_assets
  disable trigger trg_enforce_evidence_assets_owner;
alter table public.inspection_evidence_assets
  disable trigger trg_audit_evidence_assets;

with mock_cases as (
  select ec.id
  from public.expertise_cases ec
  left join public.customers c on c.id = ec.customer_id
  left join public.vehicles v on v.id = ec.vehicle_id
  where ec.id in (
    '88888888-8888-8888-8888-888888888888',
    'effccc18-01ac-4a21-be4d-e1c910d3e7d7'
  )
     or ec.work_order_no = 'WO-2026-0001'
     or coalesce(c.full_name, '') ilike '%smoke%'
     or coalesce(ec.customer_summary, '') ilike '%smoke%'
     or coalesce(v.plate, '') = '16T5672'
)
delete from public.expertise_cases ec
using mock_cases mc
where ec.id = mc.id;

alter table public.inspection_item_values
  enable trigger trg_enforce_inspection_values_owner;
alter table public.inspection_item_values
  enable trigger trg_audit_inspection_values;
alter table public.inspection_evidence_assets
  enable trigger trg_enforce_evidence_assets_owner;
alter table public.inspection_evidence_assets
  enable trigger trg_audit_evidence_assets;

commit;
