begin;

insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('14141414-1414-4141-8141-141414141401','finance-maker@example.invalid','{}',now(),now()),
('14141414-1414-4141-8141-141414141402','accounting-checker@example.invalid','{}',now(),now()),
('14141414-1414-4141-8141-141414141403','gm-checker@example.invalid','{}',now(),now()) on conflict do nothing;
insert into public.franchise_user_scopes(auth_user_id,franchise_role,branch_ids,updated_by) values
('14141414-1414-4141-8141-141414141401','finance','{}','14141414-1414-4141-8141-141414141403'),
('14141414-1414-4141-8141-141414141402','accounting','{}','14141414-1414-4141-8141-141414141403'),
('14141414-1414-4141-8141-141414141403','gm','{}','14141414-1414-4141-8141-141414141403');
insert into public.franchise_cases(id,application_no,candidate_name,city,district,stage,score,consent_count,document_count,document_total,paid_percent,status,created_by)
values('14141414-1414-4141-8141-141414141410','APP-FINANCE-UAT','Sentetik Finans Adayı','Bursa','Osmangazi',12,82,3,17,17,100,'approved','14141414-1414-4141-8141-141414141403');

set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141401","app_metadata":{"franchise_role":"finance"}}';
select public.submit_franchise_financial_terms('14141414-1414-4141-8141-141414141410','FIN-UAT-1',100000,20,10,0,6::smallint,100) as term_id \gset
insert into public.franchise_entry_fee_installments(financial_term_id,installment_no,due_date,amount) values
(:'term_id',1,current_date-40,50000),(:'term_id',2,current_date+10,50000);
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141402","app_metadata":{"franchise_role":"accounting"}}';
select public.review_franchise_financial_terms(:'term_id',true,'Taksit toplamı doğrulandı');
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141401","app_metadata":{"franchise_role":"finance"}}';
select public.submit_franchise_entry_fee_receipt(:'term_id','RCPT-99',99000,now()) as receipt_99 \gset
reset role;
set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141402","app_metadata":{"franchise_role":"accounting"}}';
select public.review_franchise_entry_fee_receipt(:'receipt_99',true,'Banka hareketi doğrulandı');
do $$ begin
  if public.franchise_entry_fee_collection_percent('14141414-1414-4141-8141-141414141410')<>99 then raise exception 'Tahsilat yüzdesi 99 hesaplanmadı'; end if;
  if public.franchise_financial_readiness('14141414-1414-4141-8141-141414141410') then raise exception 'Yüzde 99 finans kapısını yanlışlıkla açtı'; end if;
end $$;
reset role;

set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141401","app_metadata":{"franchise_role":"finance"}}';
select public.submit_franchise_entry_fee_receipt(:'term_id','RCPT-01',1000,now()) as receipt_01 \gset
do $$ begin
  begin perform public.submit_franchise_entry_fee_receipt((select id from public.franchise_financial_terms where franchise_case_id='14141414-1414-4141-8141-141414141410'),'RCPT-01',1000,now()); raise exception 'Mükerrer tahsilat referansı kabul edildi';
  exception when unique_violation then null; end;
end $$;
reset role;
set local role authenticated;
set local request.jwt.claims='{"sub":"14141414-1414-4141-8141-141414141402","app_metadata":{"franchise_role":"accounting"}}';
select public.review_franchise_entry_fee_receipt(:'receipt_01',true,'Kalan tutar doğrulandı');
do $$ begin
  if not public.franchise_financial_readiness('14141414-1414-4141-8141-141414141410') then raise exception 'Yüzde 100 finans kapısını açmadı'; end if;
end $$;
reset role;

do $$ begin
  if not exists(select 1 from public.franchise_payment_status_v where franchise_case_id='14141414-1414-4141-8141-141414141410' and royalty_basis='vat_inclusive_customer_collection' and royalty_rate=10 and advertising_fund_rate=0 and royalty_exemption_months=6 and automatic_operational_stop=false) then
    raise exception 'Royalty veya gecikme yönetişimi hatalı';
  end if;
end $$;

select 'PASS' as franchise_finance_acceptance;
rollback;
