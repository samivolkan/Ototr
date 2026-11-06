begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('a3000000-0000-4000-8000-000000000001','owner-gm@example.invalid','{}',now(),now()),
('a3000000-0000-4000-8000-000000000002','owner-finance@example.invalid','{}',now(),now()),
('a3000000-0000-4000-8000-000000000003','unassigned-finance@example.invalid','{}',now(),now());

insert into public.franchise_user_scopes(auth_user_id,franchise_role,updated_by) values
('a3000000-0000-4000-8000-000000000002','finance','a3000000-0000-4000-8000-000000000001'),
('a3000000-0000-4000-8000-000000000003','finance','a3000000-0000-4000-8000-000000000001');

set local role authenticated;
set local request.jwt.claims='{"sub":"a3000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"gm"}}';
insert into public.franchise_department_responsibilities(
  department_code,user_id,role_code,assigned_by,assignment_note
) values(
  'finance','a3000000-0000-4000-8000-000000000002','finance',
  'a3000000-0000-4000-8000-000000000001','Sentetik tek finans sorumlusu token testi'
);
reset role;

select app_private.franchise_has_active_primary_assignment(
  'a3000000-0000-4000-8000-000000000002','finance'
) as assigned_finance_owner_is_authorized;

select not app_private.franchise_has_active_primary_assignment(
  'a3000000-0000-4000-8000-000000000003','finance'
) as unassigned_finance_user_is_denied;

select app_private.franchise_has_active_primary_assignment(
  'a3000000-0000-4000-8000-000000000001','gm'
) as gm_keeps_assignment_authority;

rollback;

