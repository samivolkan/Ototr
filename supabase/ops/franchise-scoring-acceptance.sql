-- STAGING/LOCAL ONLY. Synthetic seven-dimension score and board maker-checker acceptance.
begin;
insert into auth.users(id,email,raw_app_meta_data,created_at,updated_at) values
('e1000000-0000-4000-8000-000000000001','score-specialist@example.invalid','{}',now(),now()),
('e1000000-0000-4000-8000-000000000002','score-finance@example.invalid','{}',now(),now()),
('e1000000-0000-4000-8000-000000000003','score-legal@example.invalid','{}',now(),now()),
('e1000000-0000-4000-8000-000000000004','score-operations@example.invalid','{}',now(),now()),
('e1000000-0000-4000-8000-000000000005','score-director@example.invalid','{}',now(),now()),
('e1000000-0000-4000-8000-000000000006','score-gm@example.invalid','{}',now(),now());
insert into public.franchise_cases(id,application_no,candidate_name,city,district,stage) values
('e2000000-0000-4000-8000-000000000001','APP-SCORE-UAT','Sentetik Skor Adayı','Bursa','Nilüfer',2),
('e2000000-0000-4000-8000-000000000002','APP-BOARD-UAT','Sentetik Kurul Adayı','Bursa','Nilüfer',7);

set local role authenticated;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000002","app_metadata":{"franchise_role":"finance"}}';
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','financial_capacity',84,repeat('a',64),'Sentetik finansal yeterlilik kanıtı');
do $$ begin
  begin perform public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','growth_potential',84,repeat('a',64),'Yetkisiz skor denemesi'); raise exception 'wrong role scored dimension';
  exception when others then if sqlerrm not like 'Bu skor başlığı için rol yetkili değil%' then raise; end if; end;
end $$;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"franchise_specialist"}}';
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','management_experience',82,repeat('b',64),'Sentetik yönetim deneyimi kanıtı');
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','growth_potential',86,repeat('c',64),'Sentetik büyüme potansiyeli kanıtı');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000003","app_metadata":{"franchise_role":"legal"}}';
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','brand_ethics_fit',80,repeat('d',64),'Sentetik marka ve etik uyumu kanıtı');
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','background_references',84,repeat('e',64),'Sentetik geçmiş ve referans kanıtı');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000004","app_metadata":{"franchise_role":"operations"}}';
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','location_potential',85,repeat('f',64),'Sentetik lokasyon potansiyeli kanıtı');
select public.submit_franchise_score('e2000000-0000-4000-8000-000000000001','operational_capability',81,repeat('1',64),'Sentetik operasyonel yeterlilik kanıtı');
reset role;

insert into public.franchise_candidate_score_entries(franchise_case_id,dimension_code,revision,score,assessor_id,assessor_role,evidence_sha256,rationale)
select 'e2000000-0000-4000-8000-000000000002',d.code,1,82,'e1000000-0000-4000-8000-000000000005','franchise_director',repeat('2',64),'Sentetik kurul puan kanıtı'
from public.franchise_score_dimensions as d;

set local role authenticated;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000001","app_metadata":{"franchise_role":"franchise_specialist"}}';
select public.franchise_score_value('e2000000-0000-4000-8000-000000000001')=83.15 as weighted_score_is_exact;
select public.franchise_score_recommendation(public.franchise_score_value('e2000000-0000-4000-8000-000000000001'))='strong' as threshold_recommendation_is_strong;
select (public.transition_franchise_case('e2000000-0000-4000-8000-000000000001',2::smallint,'Yedi skor tamamlandı')).stage=3 as scoring_gate_passed;

set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000005","app_metadata":{"franchise_role":"franchise_director"}}';
do $$ begin
  begin perform public.transition_franchise_case('e2000000-0000-4000-8000-000000000002',7::smallint,'Kurulsuz geçiş'); raise exception 'board gate bypassed';
  exception when others then if sqlerrm not like 'Bağımsız onaylı olumlu kurul%' then raise; end if; end;
end $$;
select public.submit_franchise_board_decision('e2000000-0000-4000-8000-000000000002','approved',null,null);
do $$ declare v_id uuid; begin
  select id into v_id from public.franchise_board_decisions where franchise_case_id='e2000000-0000-4000-8000-000000000002' and status='pending_second_approval';
  begin perform public.review_franchise_board_decision(v_id,true,'Kendi onayı'); raise exception 'maker approved own board decision';
  exception when others then if sqlerrm not like 'Kararı hazırlayan kendi%' then raise; end if; end;
end $$;
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000006","app_metadata":{"franchise_role":"gm"}}';
select public.review_franchise_board_decision((select id from public.franchise_board_decisions where franchise_case_id='e2000000-0000-4000-8000-000000000002' and status='pending_second_approval'),true,'Bağımsız GM onayı');
set local request.jwt.claims='{"sub":"e1000000-0000-4000-8000-000000000005","app_metadata":{"franchise_role":"franchise_director"}}';
select (public.transition_franchise_case('e2000000-0000-4000-8000-000000000002',7::smallint,'Kurul onayı tamamlandı')).stage=8 as approved_board_opens_stage_gate;
reset role;
rollback;
