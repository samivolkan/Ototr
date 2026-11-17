create or replace function ik_ototr_private.business_action(record_id text,expected bigint,operation text,input jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.ik_ototr_business; p jsonb; e jsonb; d jsonb; k text; u text; dest text; eid text;
 hq boolean:=ik_ototr_private.allowed('Genel Merkez',true); i integer; n integer; score integer; new_state text;
 today date:=(now() at time zone 'Europe/Istanbul')::date; new_revision bigint; nodes jsonb; original jsonb;
begin
 if auth.uid() is null or input is null or jsonb_typeof(input)<>'object' then raise exception 'IK_FORBIDDEN' using errcode='42501';end if;
 if operation='create' then
  k:=input->>'kind';u:=input->>'unit';eid:=nullif(input->>'employeeId','');p:=coalesce(input->'payload','{}');
  if not ik_ototr_private.allowed(u,true) then raise exception 'IK_FORBIDDEN' using errcode='42501';end if;
  select document into d from public.ik_ototr_units where unit=u for update;
  if eid is not null then select v into e from jsonb_array_elements(d->'employees') v where v->>'id'=eid and v->>'status'='active';
   if e is null then raise exception 'Çalışan bu birimde aktif değil.';end if;end if;
  new_state:='draft';dest:=null;
  if k='position' then
   if coalesce(trim(p->>'title'),'')='' or coalesce(trim(p->>'department'),'')='' or coalesce((p->>'capacity')::int,0) not between 1 and 1000 then raise exception 'Pozisyon ve kadro bilgileri geçersiz.';end if;
   if exists(select 1 from public.ik_ototr_business b where b.kind=k and b.unit=u and lower(b.payload->>'title')=lower(p->>'title')) then raise exception 'Pozisyon zaten tanımlı.';end if;
   p:=jsonb_build_object('title',p->>'title','department',p->>'department','capacity',(p->>'capacity')::int);new_state:='active';
  elsif k='assignment' then
   dest:=input->>'toUnit';
   if e is null or dest=u or dest='Genel Merkez' or not exists(select 1 from public.ik_ototr_units where unit=dest) or coalesce(p->>'skill','') not in ('Motor','Kaporta','İSG')
   or coalesce(trim(p->>'reason'),'')='' or nullif(p->>'start','') is null or nullif(p->>'end','') is null or (p->>'start')::date<today or (p->>'end')::date<(p->>'start')::date or (p->>'end')::date>(p->>'start')::date+90 then raise exception 'Görevlendirme bilgileri geçersiz (en çok 90 gün).';end if;
   if exists(select 1 from public.ik_ototr_business b where b.kind=k and b.employee_id=eid and b.state not in ('completed','rejected') and (b.payload->>'start')::date<=(p->>'end')::date and (b.payload->>'end')::date>=(p->>'start')::date) then raise exception 'Çakışan görevlendirme var.';end if;
   p:=jsonb_build_object('employeeName',e->>'name','title',e->>'title','skill',p->>'skill','start',(p->>'start')::date,'end',(p->>'end')::date,'reason',p->>'reason');new_state:='requested';
  elsif k='enrollment' then
   if e is null or coalesce(p->>'course','') not in ('motor','kaporta','isg') then raise exception 'Eğitim seçimi geçersiz.';end if;
   if exists(select 1 from public.ik_ototr_business b where b.kind=k and b.employee_id=eid and b.payload->>'course'=p->>'course' and (b.state in ('enrolled','failed') or (b.payload->>'validUntil')::date>=today)) then raise exception 'Çalışanın bu eğitimi veya geçerli sertifikası zaten var.';end if;
   p:=jsonb_build_object('course',p->>'course','skill',case p->>'course' when 'motor' then 'Motor' when 'kaporta' then 'Kaporta' else 'İSG' end,'lessons','[]'::jsonb,'attempts',0);new_state:='enrolled';
  elsif k='lifecycle' then
   if e is null or coalesce(p->>'type','') not in ('onboarding','offboarding') or coalesce(trim(p->>'reason'),'')='' or p->>'date' is null then raise exception 'Süreç bilgileri eksik.';end if;
   if exists(select 1 from public.ik_ototr_business b where b.kind=k and b.employee_id=eid and b.payload->>'type'=p->>'type' and b.state<>'completed') then raise exception 'Çalışanın açık süreci var.';end if;
   p:=jsonb_build_object('type',p->>'type','date',(p->>'date')::date,'reason',p->>'reason','checks',case p->>'type' when 'onboarding' then '[false,false,false,false,false,false,false]'::jsonb else '[false,false,false,false,false,false,false,false]'::jsonb end);
  elsif k='calibration' then
   if coalesce(trim(p->>'title'),'')='' or coalesce(trim(p->>'reference'),'')='' or coalesce(p->>'skill','') not in ('Motor','Kaporta','İSG') or nullif(p->>'validUntil','') is null or (p->>'validUntil')::date<today then raise exception 'Geçerli demo kalibrasyon kaydı gerekir.';end if;
   p:=jsonb_build_object('title',p->>'title','reference',p->>'reference','skill',p->>'skill','validUntil',(p->>'validUntil')::date);new_state:='active';
  elsif k='inspection' then
   if e is null or coalesce(trim(p->>'reference'),'')='' or coalesce(p->>'skill','') not in ('Motor','Kaporta','İSG') then raise exception 'Rapor bilgileri eksik.';end if;
   p:=jsonb_build_object('reference',p->>'reference','skill',p->>'skill','employeeName',e->>'name','note',coalesce(p->>'note',''));
  elsif k='integration' then
   if coalesce(p->>'event','') not in ('staffing_plan.created','payroll.inputs.prepared') or coalesce(p->>'period','')!~'^\d{4}-(0[1-9]|1[0-2])$' then raise exception 'Entegrasyon olayı veya dönem geçersiz.';end if;
   if exists(select 1 from public.ik_ototr_business b where b.kind=k and b.unit=u and b.payload->>'event'=p->>'event' and b.payload->>'period'=p->>'period') then raise exception 'Bu birim/dönem olayı zaten var.';end if;
   p:=jsonb_build_object('event',p->>'event','period',p->>'period','contractVersion',1,'mode','synthetic-demo','source','ik-ototr','unitKey',case u when 'Genel Merkez' then 'hq' when 'Nilüfer' then 'nilufer' when 'Gebze' then 'gebze' else 'inegol' end,'employeeCount',jsonb_array_length(d->'employees'),'attempts',0,'destination',case p->>'event' when 'staffing_plan.created' then 'franchise-demo-inbox' else 'finance-demo-inbox' end);
   if p->>'event'='staffing_plan.created' then p:=p||jsonb_build_object('positions',coalesce((select jsonb_agg(b.payload) from public.ik_ototr_business b where b.kind='position' and b.unit=u),'[]'::jsonb));
   else p:=p||jsonb_build_object('inputs',coalesce((select jsonb_agg(jsonb_build_object('employeeRef',v->>'employeeId','type',v->>'type','amount',v->'amount')) from jsonb_array_elements(coalesce(d->'paymentAdjustments','[]')) v where v->>'month'=p->>'period'),'[]'::jsonb));end if;
  else raise exception 'Desteklenmeyen kayıt türü.';end if;
  insert into public.ik_ototr_business(kind,unit,to_unit,employee_id,payload,state,created_by) values(k,u,dest,eid,p,new_state,auth.uid()) returning * into r;
 else
  select * into r from public.ik_ototr_business where id=record_id for update;
  if r.id is null or not (ik_ototr_private.allowed(r.unit,true) or (r.kind='assignment' and ik_ototr_private.allowed(r.to_unit,true))) then raise exception 'IK_FORBIDDEN' using errcode='42501';end if;
  if r.revision is distinct from expected then raise exception 'Kayıt başka kullanıcıda değişti. Yenileyin.' using errcode='PT409';end if;
  p:=r.payload;new_state:=r.state;
  if operation='reject' then
   if r.state not in ('requested','source_approved','target_approved','submitted') or coalesce(trim(input->>'reason'),'')='' then raise exception 'Ret durumu veya gerekçesi geçersiz.';end if;
   if r.kind='inspection' and not hq then raise exception 'Teknik merkez onayı gerekir.';end if;
   new_state:='rejected';p:=p||jsonb_build_object('reason',input->>'reason');
  elsif r.kind='organization' and operation='edit' then
   if not hq then raise exception 'Merkez yetkisi gerekir.' using errcode='42501';end if;
   nodes:=input->'nodes';if jsonb_typeof(nodes) is distinct from 'array' or jsonb_array_length(nodes) not between 13 and 100 then raise exception 'Organizasyon düğümleri geçersiz.';end if;
   if exists(select 1 from jsonb_array_elements(p->'nodes') old where not exists(select 1 from jsonb_array_elements(nodes) x where x->>'id'=old->>'id')) then raise exception 'Korunan merkez birimleri kaldırılamaz.';end if;
   if (select count(*)<>count(distinct x->>'id') from jsonb_array_elements(nodes) x) or exists(select 1 from jsonb_array_elements(nodes) x where coalesce(trim(x->>'id'),'')='' or x->>'capacity' is null or x->>'occupied' is null or coalesce(trim(x->>'title'),'')='' or coalesce(trim(x->>'position'),'')='' or (x->>'capacity')::int<1 or (x->>'occupied')::int<0 or (x->>'occupied')::int>(x->>'capacity')::int or (coalesce(x->>'parent','')<>'' and not exists(select 1 from jsonb_array_elements(nodes) y where y->>'id'=x->>'parent'))) then raise exception 'Kadro veya üst birim bilgisi geçersiz.';end if;
   if exists(with recursive t(id,parent,path,cycle) as (select x->>'id',x->>'parent',array[x->>'id'],false from jsonb_array_elements(nodes) x union all select t.id,x->>'parent',t.path||(x->>'id'),x->>'id'=any(t.path) from t join jsonb_array_elements(nodes) x on x->>'id'=t.parent where not t.cycle) select 1 from t where cycle) then raise exception 'Organizasyon döngüsü oluşturulamaz.';end if;
   p:=jsonb_build_object('nodes',nodes);
  elsif r.kind='position' and operation='edit' then
   select count(*) into n from public.ik_ototr_units u,jsonb_array_elements(u.document->'employees') e where u.unit=r.unit and e->>'status'='active' and e->>'title'=input->>'title';
   if coalesce((input->>'capacity')::int,0)<greatest(1,n) or (input->>'capacity')::int>1000 or coalesce(trim(input->>'title'),'')='' then raise exception 'Kadro aktif çalışan sayısından az olamaz.';end if;
   if coalesce(trim(input->>'department'),'')='' or exists(select 1 from public.ik_ototr_business b where b.id<>r.id and b.kind='position' and b.unit=r.unit and lower(b.payload->>'title')=lower(input->>'title')) then raise exception 'Departman eksik veya pozisyon yineleniyor.';end if;
   p:=jsonb_build_object('title',input->>'title','department',input->>'department','capacity',(input->>'capacity')::int);
  elsif r.kind='assignment' then
   if operation='approve' then
    if r.state='requested' and ik_ototr_private.allowed(r.unit,true) and auth.uid() is distinct from r.created_by then new_state:='source_approved';p:=p||jsonb_build_object('sourceActor',auth.uid());
    elsif r.state='source_approved' and ik_ototr_private.allowed(r.to_unit,true) and auth.uid()::text is distinct from p->>'sourceActor' then new_state:='target_approved';p:=p||jsonb_build_object('targetActor',auth.uid());
    elsif r.state='target_approved' and hq then
     if not exists(select 1 from public.ik_ototr_business b where b.kind='enrollment' and b.employee_id=r.employee_id and b.unit=r.unit and b.state='passed' and b.payload->>'skill'=p->>'skill' and (b.payload->>'validUntil')::date>=(p->>'end')::date) then raise exception 'Görev bitişine kadar geçerli sertifika gerekir.';end if;
     if not exists(select 1 from public.ik_ototr_units u,jsonb_array_elements(u.document->'employees') e where u.unit=r.unit and e->>'id'=r.employee_id and e->>'status'='active') then raise exception 'Çalışan artık aktif değil.';end if;
     if (p->>'end')::date<today then raise exception 'Görev süresi geçmiş.';end if;new_state:='approved';p:=p||jsonb_build_object('headquartersActor',auth.uid());
    else raise exception 'Bu aşamada ayrı ve yetkili onaylayan gerekir.' using errcode='42501';end if;
   elsif operation='complete' and r.state='approved' and ik_ototr_private.allowed(r.unit,true) then new_state:='completed';
   else raise exception 'Geçersiz görevlendirme geçişi.';end if;
  elsif r.kind='enrollment' then
   if r.state='passed' then raise exception 'Tamamlanan eğitim değiştirilemez.';end if;
   if operation='lesson' then
    i:=(input->>'index')::int;if i is null or i not between 0 and 2 then raise exception 'Ders bulunamadı.';end if;
    if not (p->'lessons') @> jsonb_build_array(i) then p:=jsonb_set(p,'{lessons}',(p->'lessons')||jsonb_build_array(i));end if;
   elsif operation='exam' then
    if jsonb_array_length(p->'lessons')<>3 then raise exception 'Önce tüm dersleri tamamlayın.';end if;
    if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 or exists(select 1 from jsonb_array_elements_text(input->'answers') a where a is null or a not in ('0','1','2')) then raise exception 'Tüm soruları yanıtlayın.';end if;
    select round(sum(case when a.value::int=a.ordinality-1 then 1 else 0 end)*100.0/3)::int into score from jsonb_array_elements_text(input->'answers') with ordinality a;
    new_state:=case when score>=70 then 'passed' else 'failed' end;p:=p||jsonb_build_object('score',score,'attempts',coalesce((p->>'attempts')::int,0)+1);
    if score>=70 then p:=p||jsonb_build_object('issued',today,'validUntil',today+365);end if;
   else raise exception 'Geçersiz eğitim işlemi.';end if;
  elsif r.kind='lifecycle' then
   if r.state='completed' then raise exception 'Tamamlanan süreç değiştirilemez.';end if;
   if operation='check' then
    i:=(input->>'index')::int;if i is null or i<0 or i>=jsonb_array_length(p->'checks') then raise exception 'Kontrol bulunamadı.';end if;
    p:=jsonb_set(p,array['checks',i::text],to_jsonb(not (p->'checks'->>i)::boolean));
   elsif operation='complete' then
    if exists(select 1 from jsonb_array_elements(p->'checks') c where c<>'true'::jsonb) or (p->>'date')::date>today then raise exception 'Tüm kontroller tamamlanmalı ve işlem tarihi gelmeli.';end if;
    select document into d from public.ik_ototr_units where unit=r.unit for update;
    if p->>'type'='offboarding' then
     if d->'settings'->>'hrApprover'=r.employee_id or exists(select 1 from jsonb_array_elements(d->'requests') q where q->>'status'='pending' and (q->'approvers') @> jsonb_build_array(r.employee_id)) then raise exception 'İK ve talep onaylayıcısı devredilmeli.';end if;
     if exists(select 1 from jsonb_array_elements(d->'assets') a where a->>'employeeId'=r.employee_id and a->>'status'<>'completed') then raise exception 'Aktif zimmetler iade edilmeli.';end if;
     if exists(select 1 from jsonb_array_elements(d->'requests') q where q->>'employeeId'=r.employee_id and q->>'status'='pending') then raise exception 'Bekleyen talepler sonuçlandırılmalı.';end if;
     if exists(select 1 from jsonb_array_elements(d->'employees') e where e->>'managerId'=r.employee_id and e->>'status'='active') then raise exception 'Yöneticiye bağlı çalışanların devri yapılmalı.';end if;
     if exists(select 1 from public.ik_ototr_business b where b.kind='assignment' and b.employee_id=r.employee_id and b.state not in ('completed','rejected')) then raise exception 'Açık görevlendirme sonuçlandırılmalı.';end if;
     select jsonb_agg(case when e->>'id'=r.employee_id then e||jsonb_build_object('status','inactive','end',p->>'date','exitReason',p->>'reason') else e end) into original from jsonb_array_elements(d->'employees') e;
     d:=jsonb_set(d,'{employees}',original);d:=jsonb_set(d,'{revision}',to_jsonb((d->>'revision')::bigint+1));
     update public.ik_ototr_units set document=d,revision=revision+1,updated_at=now(),updated_by=auth.uid() where unit=r.unit returning revision into new_revision;
     insert into ik_ototr_private.events(unit,revision,actor) values(r.unit,new_revision,auth.uid());
    elsif r.unit<>'Genel Merkez' and not exists(select 1 from public.ik_ototr_business b where b.kind='enrollment' and b.employee_id=r.employee_id and b.state='passed' and (b.payload->>'validUntil')::date>=today) then raise exception 'Bayi işe girişinde geçerli eğitim sertifikası gerekir.';end if;
    new_state:='completed';
   else raise exception 'Geçersiz süreç işlemi.';end if;
  elsif r.kind='integration' and operation='dispatch' then
   if r.state='acknowledged' then raise exception 'Bu olay daha önce işlendi.';end if;
   if p->>'mode'<>'synthetic-demo' or coalesce(p->>'event','') not in ('staffing_plan.created','payroll.inputs.prepared') then raise exception 'Demo sözleşmesi geçersiz.';end if;
   p:=p||jsonb_build_object('receipt','DEMO-ACK-'||r.id,'attempts',coalesce((p->>'attempts')::int,0)+1,'receivedAt',now(),'realDelivery',false);new_state:='acknowledged';
  elsif r.kind='inspection' then
   if operation='submit' and r.state in ('draft','revision') and r.created_by=auth.uid() then
    if not exists(select 1 from public.ik_ototr_business b where b.kind='enrollment' and b.unit=r.unit and b.employee_id=r.employee_id and b.state='passed' and b.payload->>'skill'=p->>'skill' and (b.payload->>'validUntil')::date>=today) or not exists(select 1 from public.ik_ototr_business b where b.kind='calibration' and b.unit=r.unit and b.payload->>'skill'=p->>'skill' and (b.payload->>'validUntil')::date>=today) then raise exception 'Geçerli sertifika ve kalibrasyon gerekir.';end if;new_state:='submitted';
   elsif operation='approve' and r.state='submitted' and hq and r.created_by<>auth.uid() then new_state:='published';p:=p||jsonb_build_object('approvedBy',auth.uid());
   elsif operation='revise' and r.state='published' and hq and coalesce(trim(input->>'reason'),'')<>'' then new_state:='revision';p:=p||jsonb_build_object('reason',input->>'reason');
   else raise exception 'Rapor durumu veya dört göz kuralı izin vermiyor.' using errcode='42501';end if;
  else raise exception 'Desteklenmeyen işlem.';end if;
  update public.ik_ototr_business set payload=p,state=new_state,revision=revision+1,updated_at=now() where id=r.id returning * into r;
 end if;
 insert into ik_ototr_private.business_events(record_id,actor,action,revision) values(r.id,auth.uid(),operation,r.revision);
 return to_jsonb(r);
end; $$;
