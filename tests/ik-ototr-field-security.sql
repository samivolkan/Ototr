-- Synthetic fixtures only. Every mutation is rolled back.
begin;
select set_config('test.source',(select user_id::text from ik_ototr_private.members where unit='Gebze' and not headquarters and can_write and enabled limit 1),true);
select set_config('test.reader',(select user_id::text from ik_ototr_private.members where not can_write and enabled limit 1),true);
select set_config('test.hq',(select user_id::text from ik_ototr_private.members where headquarters and enabled limit 1),true);
update public.ik_ototr_units set document=jsonb_set(jsonb_set(document,'{employees,0,identity}','"DEMO-SECRET"'),'{employees,0,personal,bloodGroup}','"DEMO-HEALTH"') where unit='Gebze';
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.source'),'role','authenticated')::text,true);
do $$declare d jsonb; rev bigint; begin
 begin perform 1 from public.ik_ototr_units;raise exception 'Raw table readable';exception when insufficient_privilege then null;end;
 select document,revision into d,rev from public.ik_ototr_read_units() where unit='Gebze';
 if d#>>'{employees,0,identity}'<>'' or d#>>'{employees,0,personal,bloodGroup}'<>'' then raise exception 'Protected value leaked';end if;
 if (d#>>'{employees,0,salary}')::numeric<=0 then raise exception 'Manager lost finance';end if;
 perform public.ik_ototr_save('Gebze',rev,d);
 select revision into rev from public.ik_ototr_read_units() where unit='Gebze';
 begin perform public.ik_ototr_save('Gebze',rev,jsonb_set(d,'{employees,0,identity}','"FORGED"'));raise exception 'Protected write allowed';exception when insufficient_privilege then null;end;
 begin perform public.ik_ototr_sensitive_save('Gebze','e7','health','Kurgusal test');raise exception 'Health write allowed';exception when insufficient_privilege then null;end;
 if exists(select 1 from public.ik_ototr_sensitive) then raise exception 'Restricted read allowed';end if;
 begin perform public.ik_ototr_business_action(null,null,'create','{"kind":"assignment","unit":"Gebze","toUnit":"Nilüfer","employeeId":"e8","payload":{"reason":"QA"}}');raise exception 'Missing skill/date accepted';exception when others then if sqlerrm not like '%Görevlendirme bilgileri%' then raise;end if;end;
end $$;
reset role;
do $$begin if not exists(select 1 from public.ik_ototr_units where unit='Gebze' and document#>>'{employees,0,identity}'='DEMO-SECRET' and document#>>'{employees,0,personal,bloodGroup}'='DEMO-HEALTH') then raise exception 'Masked save erased protected values';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.reader'),'role','authenticated')::text,true);
do $$declare d jsonb;begin select document into d from public.ik_ototr_read_units() limit 1;if d is null or exists(select 1 from jsonb_array_elements(d->'employees') e where (e->>'salary')::numeric<>0) or d->'payrolls'<>'[]'::jsonb or d->'paymentAdjustments'<>'[]'::jsonb then raise exception 'Readonly finance leaked';end if;end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('test.hq'),'role','authenticated')::text,true);
do $$declare d jsonb;begin select document into d from public.ik_ototr_read_units() where unit='Gebze';if d#>>'{employees,0,identity}'<>'DEMO-SECRET' or d#>>'{employees,0,personal,bloodGroup}'<>'' then raise exception 'HQ capability projection failed';end if;perform public.ik_ototr_sensitive_save('Gebze','e7','discipline','Kurgusal demo kontrol notu');if not exists(select 1 from public.ik_ototr_sensitive where category='discipline') then raise exception 'HQ restricted record unavailable';end if;end $$;
rollback;
select 'PASS: raw read denied, branch identity/health masked, protected values preserved, forged writes denied, readonly finance masked, HQ discipline scoped, missing assignment fields denied; rollback' as result;
