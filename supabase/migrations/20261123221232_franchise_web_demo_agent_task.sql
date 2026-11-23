-- Authenticated HQ-only synthetic web intake. No public intake enablement,
-- canonical case activation, outbound communication, or LLM execution.
create table app_private.franchise_web_demo_tasks (
 request_key uuid primary key,
 application_id uuid not null unique references public.public_franchise_applications(id),
 task_id uuid not null unique default gen_random_uuid(),
 created_by uuid not null,
 agent_id text not null default 'FRA-01' check(agent_id='FRA-01'),
 status text not null default 'awaiting_manager_review' check(status='awaiting_manager_review'),
 prepared_output jsonb not null,
 created_at timestamptz not null default now()
);
alter table app_private.franchise_web_demo_tasks enable row level security;
revoke all on app_private.franchise_web_demo_tasks from public,anon,authenticated;

create function app_private.submit_franchise_office_demo(p_request_key uuid,p_application jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_row app_private.franchise_web_demo_tasks; v_application_id uuid; v_expected jsonb := '{"fullName":"DEMO Aday - Ajan Ofisi","phone":"00000000000","applicationType":"Sıfırdan franchise yatırımcısı","budget":"3M - 5M TL","region":"Marmara","province":"Bursa","district":"Osmangazi","hasLocation":"Görüşmek istiyorum","squareMeters":"450","dailyTarget":"10","note":"DEMO - Gerçek kişi değildir. Web başvurusu ve FRA-01 görev ataması bağlantı testi."}'::jsonb;
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then raise exception 'Yalnız mevcut ERP merkez yöneticisi demo gönderebilir' using errcode='42501'; end if;
 if p_request_key is null or p_application is distinct from v_expected then raise exception 'Yalnız sabit sentetik demo formu kabul edilir; gerçek kişi verisi gönderilemez' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_key::text,0));
 select * into v_row from app_private.franchise_web_demo_tasks where request_key=p_request_key;
 if found then
  if v_row.created_by<>auth.uid() then raise exception 'Bu demo başka oturuma ait' using errcode='42501'; end if;
  return jsonb_build_object('application_id',v_row.application_id,'task_id',v_row.task_id,'agent_id',v_row.agent_id,'status',v_row.status,'created_at',v_row.created_at,'replayed',true);
 end if;
 insert into public.public_franchise_applications(source,full_name,phone,province,district,application_type,budget,region,has_location,square_meters,daily_target,note,kvkk_consent,processing_consent,contact_consent,payload,request_meta)
 values('agent_office_demo',p_application->>'fullName',p_application->>'phone',p_application->>'province',p_application->>'district',p_application->>'applicationType',p_application->>'budget',p_application->>'region',p_application->>'hasLocation',p_application->>'squareMeters',p_application->>'dailyTarget',p_application->>'note',false,false,false,
 jsonb_build_object('demo',true,'production_data_used',false,'request_key',p_request_key,'outbound_allowed',false),jsonb_build_object('source_page','ototr-web.html','mode','authenticated_synthetic_demo')) returning id into v_application_id;
 insert into app_private.franchise_web_demo_tasks(request_key,application_id,created_by,prepared_output)
 values(p_request_key,v_application_id,auth.uid(),jsonb_build_object(
  'title','Yeni web başvurusu · ilk temas hazırlığı',
  'engine','Kurallı hazırlık v1 · LLM çalıştırılmadı',
  'source_reference','public.public_franchise_applications/'||v_application_id::text,
  'finding','Demo web başvurusu ERP kaynağına kaydedildi. İzin kanıtları yok; gerçek iletişim kapalı.',
  'recommendation','Sorumlu görüşmeciye soru listesi ve eksik kanıt listesini sun.',
  'risk','veri','effort','İlk insan incelemesi: 5 dakika önerisi; rezervasyon yapılmadı.',
  'decision','Şimdilik Sami kararı yok; önce MGR-FRA incelemesi.',
  'handoff','FRA-01 → MGR-FRA → COO-01 → gerekirse Sami',
  'questions',jsonb_build_array('Hangi bölgede yatırım düşünüyorsunuz?','OTOTR ve ekspertiz sektörünü neden seçtiniz?','İşletmeyi kim yönetecek?','Yönetim ve otomotiv deneyiminiz nedir?','Yatırım ve işletme sermayesi hazırlığınız nedir?','Lokasyonun kullanım ve ruhsat durumu nedir?','Hedef açılış zamanınız nedir?','Tarafsız rapor ve kalite kurallarına yaklaşımınız nedir?'),
  'missing_evidence',jsonb_build_array('Aydınlatma ve veri işleme izinleri','Finansal yeterlilik kanıtı','Lokasyon ve ruhsat kanıtı'),
  'events',jsonb_build_array('Web formu sunucuya ulaştı','Mevcut ERP başvuru kaynağına kaydedildi','Tekil görev FRA-01 üzerine atandı','Kurallı ilk temas hazırlığı tamamlandı','İzin kontrolü ve yönetici incelemesi bekleniyor')
 )) returning * into v_row;
 return jsonb_build_object('application_id',v_row.application_id,'task_id',v_row.task_id,'agent_id',v_row.agent_id,'status',v_row.status,'created_at',v_row.created_at,'replayed',false);
end $$;

create function app_private.list_franchise_office_demo_tasks() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not app_private.franchise_office_manager() then raise exception 'ERP merkez yönetici yetkisi gerekli' using errcode='42501'; end if;
 return jsonb_build_object('checked_at',now(),'mode','server_backed_demo','tasks',coalesce((select jsonb_agg(to_jsonb(t)) from (
 select d.task_id,d.application_id,d.agent_id,d.status,d.prepared_output,d.created_at,a.full_name,a.province,a.district,b.status as intake_status
 from app_private.franchise_web_demo_tasks d join public.public_franchise_applications a on a.id=d.application_id
 left join public.franchise_public_intake_bridge b on b.source_application_id=d.application_id
 where d.created_by=auth.uid() order by d.created_at desc limit 20)t),'[]'::jsonb));
end $$;

create function public.submit_franchise_office_demo(p_request_key uuid,p_application jsonb) returns jsonb language sql security invoker set search_path='' as $$ select app_private.submit_franchise_office_demo(p_request_key,p_application); $$;
create function public.list_franchise_office_demo_tasks() returns jsonb language sql stable security invoker set search_path='' as $$ select app_private.list_franchise_office_demo_tasks(); $$;
revoke all on function app_private.submit_franchise_office_demo(uuid,jsonb), app_private.list_franchise_office_demo_tasks(),public.submit_franchise_office_demo(uuid,jsonb),public.list_franchise_office_demo_tasks() from public,anon,authenticated;
grant execute on function app_private.submit_franchise_office_demo(uuid,jsonb), app_private.list_franchise_office_demo_tasks(),public.submit_franchise_office_demo(uuid,jsonb),public.list_franchise_office_demo_tasks() to authenticated;
