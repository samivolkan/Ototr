-- STAGING/LOCAL ONLY. Synthetic sequential lifecycle and append-only audit acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('d1000000-0000-4000-8000-000000000001','lifecycle-specialist@example.invalid','{}',now(),now()),
('d1000000-0000-4000-8000-000000000002','lifecycle-finance@example.invalid','{}',now(),now());
insert into public.franchise_cases(id,application_no,candidate_name,city,district,applicant_user_id)
values('d2000000-0000-4000-8000-000000000001','APP-LIFECYCLE-UAT','Sentetik Süreç Adayı','Bursa','Nilüfer','d1000000-0000-4000-8000-000000000001');
insert into public.franchise_consent_receipts(franchise_case_id,subject_id,purpose,status,notice_version,source,evidence_sha256) values
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','privacy_notice','granted','2026.11','web',repeat('1',64)),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','data_processing','granted','2026.11','web',repeat('2',64)),
('d2000000-0000-4000-8000-000000000001','d1000000-0000-4000-8000-000000000001','commercial_communication','granted','2026.11','web',repeat('3',64));

set local role authenticated;
set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"finance"}}';
do $$ begin
  begin perform public.transition_franchise_case('d2000000-0000-4000-8000-000000000001',0::smallint,'Finans yetkisiz deneme'); raise exception 'wrong role advanced case';
  exception when others then if sqlerrm not like 'Bu aşama geçişi için rol yetkili değil%' then raise; end if; end;
end $$;

set local request.jwt.claims='{"sub":"d1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"franchise_specialist"}}';
select (public.transition_franchise_case('d2000000-0000-4000-8000-000000000001',0::smallint,'İzinler doğrulandı')).stage=1 as authorized_transition_passed;
select count(*)=1 as transition_written_to_history from public.franchise_case_stage_history where franchise_case_id='d2000000-0000-4000-8000-000000000001';

do $$ begin
  perform set_config('ototr.franchise_transition_reason','Aşama atlama denemesi',true);
  begin update public.franchise_cases set stage=3 where id='d2000000-0000-4000-8000-000000000001'; raise exception 'stage skip accepted';
  exception when others then if sqlerrm not like 'Aşamalar yalnız sırayla ilerletilebilir%' then raise; end if; end;
end $$;

do $$ begin
  begin insert into public.franchise_case_stage_history(franchise_case_id,from_stage,to_stage,from_status,to_status,actor_id,actor_role,reason) values('d2000000-0000-4000-8000-000000000001',1,2,'in_review','in_review','d1000000-0000-4000-8000-000000000001','franchise_specialist','Sahte geçmiş'); raise exception 'manual history insert accepted';
  exception when others then if sqlerrm not like 'Aşama geçmişi yalnız sistem%' then raise; end if; end;
end $$;
reset role;

select stage=1 as denied_transitions_left_stage_unchanged from public.franchise_cases where id='d2000000-0000-4000-8000-000000000001';
rollback;
