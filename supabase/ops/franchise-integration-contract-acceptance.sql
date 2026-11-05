-- STAGING/LOCAL ONLY. Versioned department event contracts and privacy minimization acceptance.
begin;
insert into public.franchise_cases(id,application_no,candidate_name,city,district) values
('e3000000-0000-4000-8000-000000000001','APP-INTEGRATION-UAT','Sentetik Entegrasyon Adayı','Bursa','Nilüfer');

do $$ declare c record; v_payload jsonb; begin
  for c in select * from public.franchise_integration_event_contracts where is_active and contract_version=1 loop
    select coalesce(jsonb_object_agg(k,'SENTETIK'::text),'{}'::jsonb) into v_payload from unnest(c.required_payload_keys) as k;
    insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload,contract_version)
    values('e3000000-0000-4000-8000-000000000001',c.source,c.event_type,v_payload,c.contract_version);
  end loop;
end $$;

do $$ begin
  begin insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload) values ('e3000000-0000-4000-8000-000000000001','finance','employee.hired','{"staff_id":"S-1","role_key":"manager"}'); raise exception 'source event mismatch accepted';
  exception when others then if sqlerrm not like 'Aktif entegrasyon olay sözleşmesi%' then raise; end if; end;
  begin insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload) values ('e3000000-0000-4000-8000-000000000001','legal','contract.signed','{}'); raise exception 'missing required field accepted';
  exception when others then if sqlerrm not like 'Entegrasyon yükünde zorunlu alan eksik%' then raise; end if; end;
  begin insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload) values ('e3000000-0000-4000-8000-000000000001','it','account.provisioning_requested','{"branch_id":"BR-SENTETIK","identity":{"email":"sentetik@example.invalid"}}'); raise exception 'prohibited pii accepted';
  exception when others then if sqlerrm not like 'Entegrasyon yükünde yasaklı%' then raise; end if; end;
  begin insert into public.franchise_integration_outbox(franchise_case_id,source,event_type,payload,contract_version) values ('e3000000-0000-4000-8000-000000000001','finance','opening_payment.verified','{"payment_verification_id":"PV-1"}',2); raise exception 'unknown version accepted';
  exception when others then if sqlerrm not like 'Aktif entegrasyon olay sözleşmesi%' then raise; end if; end;
end $$;

select count(*)=31 as all_department_event_contracts_present from public.franchise_integration_event_contracts where is_active and contract_version=1;
select count(*)=31 as every_valid_event_persisted from public.franchise_integration_outbox where franchise_case_id='e3000000-0000-4000-8000-000000000001';
rollback;
