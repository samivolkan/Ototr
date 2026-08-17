-- Run against an isolated Supabase database after applying the V2 migration:
-- psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f tests/task-center-v2-integration.sql
-- The transaction always rolls back fixture data.
begin;
create or replace function pg_temp.assert_true(ok boolean, message text) returns void language plpgsql as $$begin if not coalesce(ok,false) then raise exception 'ASSERTION FAILED: %',message;end if;end$$;

insert into public.branches(id,code,name,city) values
('91000000-0000-4000-8000-000000000001','V2-TEST-A','V2 Test A','Bursa'),
('91000000-0000-4000-8000-000000000002','V2-TEST-B','V2 Test B','İstanbul');
insert into public.app_users(id,auth_user_id,branch_id,full_name,email,role,is_active) values
('92000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Manager A','v2-manager-a@example.test','BRANCH_MANAGER',true),
('92000000-0000-4000-8000-000000000002','93000000-0000-4000-8000-000000000002','91000000-0000-4000-8000-000000000001','Staff A','v2-staff-a@example.test','INSPECTION_TECHNICIAN',true),
('92000000-0000-4000-8000-000000000003','93000000-0000-4000-8000-000000000003','91000000-0000-4000-8000-000000000002','Manager B','v2-manager-b@example.test','BRANCH_MANAGER',true),
('92000000-0000-4000-8000-000000000004','93000000-0000-4000-8000-000000000004',null,'HQ','v2-hq@example.test','CEO',true);
insert into public.task_organization_branches(organization_id,branch_id) values
('30000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001'),
('30000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002');

select pg_temp.assert_true((select count(*)=1 from public.task_templates where id='10000000-0000-4000-8000-000000000001'),'TEST 02 template count');
select pg_temp.assert_true((select count(*)=11 from public.task_template_categories where template_id='10000000-0000-4000-8000-000000000001'),'TEST 02 category count');
select pg_temp.assert_true((select count(*)=100 from public.task_template_tasks where template_id='10000000-0000-4000-8000-000000000001'),'TEST 03 task count');

set local role authenticated;
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000001',true);
select public.create_task_project_from_template('10000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','Integration Project',current_date+30) as project_id \gset
select pg_temp.assert_true((select count(*)=1 from public.task_projects where id=:'project_id'),'TEST 04 project created');
select pg_temp.assert_true((select count(*)=11 from public.task_categories where project_id=:'project_id'),'TEST 05 11 categories created');
select pg_temp.assert_true((select count(*)=100 from public.task_tasks where project_id=:'project_id'),'TEST 06 100 tasks created');
select pg_temp.assert_true((select count(*)=100 from public.task_tasks t join public.task_categories c on c.id=t.category_id and c.project_id=t.project_id where t.project_id=:'project_id'),'TEST 07 category links');
select id as task_id,updated_at as task_version from public.task_tasks where project_id=:'project_id' order by sort_order,id limit 1 \gset
insert into public.task_assignees(task_id,user_id,assigned_by) values(:'task_id','92000000-0000-4000-8000-000000000001','92000000-0000-4000-8000-000000000001'),(:'task_id','92000000-0000-4000-8000-000000000002','92000000-0000-4000-8000-000000000001');
select pg_temp.assert_true((select count(*)=2 from public.task_assignees where task_id=:'task_id'),'TEST 08 multiple assignee');
insert into public.task_checklist_items(task_id,title) values(:'task_id','Checklist test');
select pg_temp.assert_true((select count(*)=1 from public.task_checklist_items where task_id=:'task_id'),'TEST 09 checklist');
insert into public.task_comments(task_id,user_id,comment) values(:'task_id','92000000-0000-4000-8000-000000000001','Comment test');
select pg_temp.assert_true((select count(*)=1 from public.task_comments where task_id=:'task_id'),'TEST 10 comment');
insert into public.task_attachments(task_id,uploaded_by,storage_path,file_name,attachment_type) values(:'task_id','92000000-0000-4000-8000-000000000001',:'project_id'||'/'||:'task_id'||'/test.pdf','test.pdf','document');
select pg_temp.assert_true((select count(*)=1 from public.task_attachments where task_id=:'task_id'),'TEST 11 attachment metadata');
select pg_temp.assert_true((select count(*)>=4 from public.task_activity_logs where task_id=:'task_id'),'TEST 16 activity log');

select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000003',true);
select pg_temp.assert_true((select count(*)=0 from public.task_tasks where id=:'task_id'),'TEST 17 cross-branch read blocked');
select set_config('request.jwt.claim.sub','93000000-0000-4000-8000-000000000004',true);
select pg_temp.assert_true((select count(*)=1 from public.task_tasks where id=:'task_id'),'TEST 19 HQ access');

-- Gate, approve/reject and stale update tests intentionally use exception-aware client assertions.
-- Expected SQLSTATE: evidence/approval 23514, stale update 40001, cross-branch mutation 42501.
rollback;
