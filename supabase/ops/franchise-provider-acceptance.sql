-- STAGING/LOCAL ONLY. Run with synthetic data after both franchise migrations.
begin;
set local role service_role;

insert into public.franchise_cases(id, application_no, candidate_name, city, district, stage, consent_count, document_count, document_total, paid_percent)
values ('10000000-0000-0000-0000-000000000001','APP-PROVIDER-UAT','Sentetik Aday','Bursa','Nilüfer',1,3,0,17,0);

insert into public.franchise_consent_receipts(id, franchise_case_id, subject_id, purpose, status, notice_version, source, evidence_sha256)
values ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','data_processing','granted','2026.11','web',repeat('a',64));

insert into public.franchise_message_templates(id, code, version, channel, purpose, status, variables, content_sha256, approved_by, approved_at)
values ('40000000-0000-0000-0000-000000000001','APPLICATION_STATUS',1,'sms','application_status','approved',array['candidateName','applicationNo','status'],repeat('b',64),'50000000-0000-0000-0000-000000000001',now());

insert into public.franchise_provider_requests(id, franchise_case_id, consent_receipt_id, template_id, channel, purpose, recipient_ref, idempotency_key, variables, requested_by)
values ('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','sms','application_status','70000000-0000-0000-0000-000000000001','franchise:FR-1:application_status:sms:1','{"candidateName":"Sentetik","applicationNo":"APP-PROVIDER-UAT","status":"İlk temas"}','80000000-0000-0000-0000-000000000001');

do $$
begin
  begin
    insert into public.franchise_provider_requests(franchise_case_id, consent_receipt_id, template_id, channel, purpose, recipient_ref, idempotency_key, requested_by)
    values ('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','sms','application_status','70000000-0000-0000-0000-000000000001','franchise:FR-1:application_status:sms:1','80000000-0000-0000-0000-000000000001');
    raise exception 'duplicate idempotency key was accepted';
  exception when unique_violation then null;
  end;
end $$;

select count(*)=1 as provider_request_created_once from public.franchise_provider_requests where idempotency_key='franchise:FR-1:application_status:sms:1';
select count(*)=1 as approved_template_version_bound from public.franchise_message_templates where code='APPLICATION_STATUS' and version=1 and status='approved';
select count(*)=1 as consent_evidence_bound from public.franchise_consent_receipts where purpose='data_processing' and status='granted' and length(evidence_sha256)=64;

rollback;
