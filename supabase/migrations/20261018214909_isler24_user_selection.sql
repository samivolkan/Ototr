-- Revocable, expiring board capability. Never a Supabase/ERP login token.
create table app_private.isler24_selection_links (
 token_hash text primary key check(token_hash ~ '^[a-f0-9]{64}$'),
 scope text not null, expires_at timestamptz not null,
 revoked boolean not null default false, created_at timestamptz not null default now()
);
alter table app_private.isler24_selection_links enable row level security;
revoke all on app_private.isler24_selection_links from public,anon,authenticated,service_role;

create function app_private.isler24_selection_dispatch(selection_token text, selected_user uuid, method text, resource text, task_id bigint default null, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare link app_private.isler24_selection_links; u public.app_users; result jsonb;
begin
 if selection_token is null or selection_token !~ '^[a-f0-9]{64}$' then raise exception 'Ekip bağlantısı geçersiz veya süresi dolmuş' using errcode='28000'; end if;
 select * into link from app_private.isler24_selection_links where token_hash=encode(sha256(convert_to(selection_token,'UTF8')),'hex') and not revoked and expires_at>clock_timestamp();
 if not found then raise exception 'Ekip bağlantısı geçersiz veya süresi dolmuş' using errcode='28000'; end if;
 if method='GET' and resource='users' then
  return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name) order by full_name,id) from public.app_users where is_active and auth_user_id is not null and coalesce(branch_id::text,'hq')=link.scope),'[]'::jsonb);
 end if;
 select * into u from public.app_users where id=selected_user and is_active and auth_user_id is not null and coalesce(branch_id::text,'hq')=link.scope;
 if not found then raise exception 'Bu ekipten aktif bir kullanıcı seçin' using errcode='42501'; end if;
 -- Transaction-local identity is used only inside this module. This RPC cannot
 -- execute arbitrary SQL or another ERP RPC and never returns an Auth JWT.
 perform set_config('request.jwt.claim.sub',u.auth_user_id::text,true);
 perform set_config('isler24.selected_identity','true',true);
 result:=app_private.isler24_dispatch(method,resource,task_id,payload);
 return result;
end $$;
create function public.isler24_selection(selection_token text,selected_user uuid,method text,resource text,task_id bigint default null,payload jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$select app_private.isler24_selection_dispatch(selection_token,selected_user,method,resource,task_id,payload)$$;
revoke all on function app_private.isler24_selection_dispatch(text,uuid,text,text,bigint,jsonb),public.isler24_selection(text,uuid,text,text,bigint,jsonb) from public,anon,authenticated;
grant usage on schema app_private to service_role;
grant execute on function app_private.isler24_selection_dispatch(text,uuid,text,text,bigint,jsonb),public.isler24_selection(text,uuid,text,text,bigint,jsonb) to service_role;
create or replace function app_private.isler24_dispatch(method text, resource text, task_id bigint default null, payload jsonb default '{}')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.app_users; role_name text; scope_name text; r app_private.isler24_tasks; saved app_private.isler24_tasks;
 d jsonb; x jsonb; result jsonb; k text; uid text; names jsonb; base_due date; next_due date; v integer; cfg app_private.isler24_settings;
begin
 if auth.uid() is null then raise exception 'Giriş gerekli' using errcode='28000'; end if;
 select * into u from public.app_users where auth_user_id=auth.uid() and is_active;
 if not found then raise exception 'Aktif ERP hesabı gerekli' using errcode='42501'; end if;
 scope_name:=coalesce(u.branch_id::text,'hq');
 select role into role_name from app_private.kokpit_roles where user_id=u.id;
 role_name:=coalesce(role_name,case when u.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
 when u.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
 if method is null or resource is null or method not in ('GET','POST','PUT','DELETE') or resource not in ('me','users','isler','yorum','gecmis','sayac','geri-al','sirala','toplu','filtreler','settings','import') then raise exception 'Uç nokta bulunamadı' using errcode='P0002'; end if;
 if current_setting('isler24.selected_identity',true)='true' then
  if role_name='yonetici' then role_name:='calisan'; end if;
  u.full_name:=u.full_name||' (kullanıcı seçimi)';
 end if;
 if method='GET' and resource='me' then return jsonb_build_object('id',u.id,'name',u.full_name,'role',role_name,'scope',scope_name,'authMethod',case when current_setting('isler24.selected_identity',true)='true' then 'selection' else 'password' end,'serverTime',floor(extract(epoch from clock_timestamp())*1000)); end if;
 if method='GET' and resource='users' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',full_name) order by full_name,id) from public.app_users where is_active and coalesce(branch_id::text,'hq')=scope_name),'[]'::jsonb); end if;
 if octet_length(payload::text)>1048576 then raise exception 'İstek çok büyük' using errcode='22023'; end if;
 if resource='filtreler' then
  if method='PUT' then
   if jsonb_typeof(payload->'data') is distinct from 'array' or payload-'data'-'version'<>'{}'::jsonb then raise exception 'Geçersiz filtreler' using errcode='22023'; end if;
   if jsonb_array_length(payload->'data')>50 then raise exception 'En fazla 50 filtre' using errcode='22023'; end if;
   for d in select value from jsonb_array_elements(payload->'data') loop
    if jsonb_typeof(d) is distinct from 'object' or d-'n'-'q'-'role'-'proj'-'pri'-'sort'-'sf'<>'{}'::jsonb then raise exception 'Geçersiz filtre' using errcode='22023'; end if;
    foreach k in array array['n','q','role','proj','pri','sort','sf'] loop
     if jsonb_typeof(d->k) is distinct from 'string' or length(d->>k)>200 then raise exception 'Geçersiz filtre alanı' using errcode='22023'; end if;
    end loop;
    if length(trim(d->>'n'))<1 or d->>'role' not in ('','me','help','mine') or d->>'pri' not in ('','yuksek','orta','dusuk') or d->>'sort' not in ('due','pri','new','man') or d->>'sf' not in ('','late','yapilacak','devam','bitti') then raise exception 'Geçersiz filtre seçimi' using errcode='22023'; end if;
   end loop;
   insert into app_private.isler24_filters(user_id) values(u.id) on conflict do nothing;
   update app_private.isler24_filters set data=payload->'data',version=version+1 where user_id=u.id and version=(payload->>'version')::integer returning version into v;
   if not found then raise exception 'Filtreler değişti. Yenileyin' using errcode='40001'; end if;
  elsif method<>'GET' then raise exception 'İzin yok' using errcode='42501'; end if;
  return coalesce((select jsonb_build_object('data',data,'version',version) from app_private.isler24_filters where user_id=u.id),'{"data":[],"version":1}'::jsonb);
 end if;
 if method<>'GET' and role_name='izleyici' then raise exception 'İzleyici değişiklik yapamaz' using errcode='42501'; end if;
 if resource='settings' then
  if method='PUT' then
   if role_name<>'yonetici' then raise exception 'Otomasyonu yalnızca yönetici değiştirebilir' using errcode='42501'; end if;
   if jsonb_typeof(payload->'late') is distinct from 'boolean' or jsonb_typeof(payload->'done') is distinct from 'boolean' or payload-'late'-'done'-'version'<>'{}'::jsonb then raise exception 'Geçersiz otomasyon' using errcode='22023'; end if;
   insert into app_private.isler24_settings(scope) values(scope_name) on conflict do nothing;
   update app_private.isler24_settings set late=(payload->>'late')::boolean,done=(payload->>'done')::boolean,version=version+1 where scope=scope_name and version=(payload->>'version')::integer returning * into cfg;
   if not found then raise exception 'Ayarlar değişti. Yenileyin' using errcode='40001'; end if;
  elsif method<>'GET' then raise exception 'İzin yok' using errcode='42501'; end if;
  return coalesce((select jsonb_build_object('late',late,'done',done,'version',version) from app_private.isler24_settings where scope=scope_name),'{"late":false,"done":false,"version":1}'::jsonb);
 end if;
 if method='GET' and resource='isler' then
  return coalesce((select jsonb_agg(app_private.isler24_json(t) order by t.id) from app_private.isler24_tasks t where t.scope=scope_name and deleted_at is null and (task_id is null or t.id=task_id)),'[]'::jsonb);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('isler24:'||scope_name,0));
 if resource='toplu' then
  if method<>'POST' or jsonb_typeof(payload->'items') is distinct from 'array' or payload-'items'-'action'-'value'<>'{}'::jsonb or coalesce(payload->>'action','') not in ('status','pri','who','delete','restore') then raise exception 'Geçersiz toplu işlem' using errcode='22023'; end if;
  if jsonb_array_length(payload->'items') not between 1 and 100 then raise exception 'En fazla 100 iş seçin' using errcode='22023'; end if;
  result:='[]';
  for x in select value from jsonb_array_elements(payload->'items') loop
   if jsonb_typeof(x) is distinct from 'object' or x-'id'-'version'<>'{}'::jsonb then raise exception 'Geçersiz seçim' using errcode='22023'; end if;
   if payload->>'action'='delete' then d:=app_private.isler24_dispatch('DELETE','isler',(x->>'id')::bigint,x-'id');
   elsif payload->>'action'='restore' then d:=app_private.isler24_dispatch('POST','geri-al',(x->>'id')::bigint,x-'id');
   else
    select * into r from app_private.isler24_tasks where id=(x->>'id')::bigint and scope=scope_name and deleted_at is null;
    if not found then raise exception 'İş bulunamadı' using errcode='P0002'; end if;
    d:=app_private.isler24_dispatch('PUT','isler',r.id,r.data||jsonb_build_object('version',x->'version',payload->>'action',payload->'value'));
   end if;
   result:=result||jsonb_build_array(d);
  end loop;
  return result;
 end if;
 if resource='import' then
  if method<>'POST' or jsonb_typeof(payload) is distinct from 'array' then raise exception 'Geçersiz içe aktarma' using errcode='22023'; end if;
  if jsonb_array_length(payload) not between 1 and 100 then raise exception 'En fazla 100 iş aktarılabilir' using errcode='22023'; end if;
  for x in select value from jsonb_array_elements(payload) loop
   d:=x-'id'-'creator'-'created'-'version'-'comments'-'log';
   -- Preserve imported duration, but never trust a running browser timestamp.
   d:=app_private.isler24_validate((d-'ord')||'{"ts":0}'::jsonb)||jsonb_build_object('ord',coalesce(d->'ord','0'));
   foreach k in array array['who','helpers'] loop
    names:='[]';
    for uid in select value from jsonb_array_elements_text(case when k='who' then jsonb_build_array(d->>'who') else d->'helpers' end) loop
     if uid='' then names:=names||'""'::jsonb; continue; end if;
     select count(*),min(id::text) into v,scope_name from public.app_users where is_active and coalesce(branch_id::text,'hq')=coalesce(u.branch_id::text,'hq') and (id::text=uid or full_name=uid);
     if v<>1 then raise exception 'İçe aktarmadaki kişi kayıtlı kullanıcıyla eşleşmiyor: %',uid using errcode='22023'; end if;
     names:=names||to_jsonb(scope_name);
    end loop;
    d:=d||jsonb_build_object(k,case when k='who' then names->0 else names end);
   end loop;
   scope_name:=coalesce(u.branch_id::text,'hq');
   -- POST import mode is private to this transaction; suppress historical recurrence/email.
   perform set_config('isler24.importing','true',true);
   result:=app_private.isler24_dispatch('POST','isler',null,d||jsonb_build_object('time',0));
   perform set_config('isler24.importing','false',true);
   update app_private.isler24_tasks set data=data||jsonb_build_object('time',d->'time') where id=(result->>'id')::bigint;
   foreach k in array array['comments','log'] loop
    if x?k then
     if jsonb_typeof(x->k) is distinct from 'array' then raise exception 'Geçersiz içe aktarılan geçmiş' using errcode='22023'; end if;
     if jsonb_array_length(x->k)>100 then raise exception 'En fazla 100 geçmiş/yorum aktarılır' using errcode='22023'; end if;
     for d in select value from jsonb_array_elements(x->k) loop
      if jsonb_typeof(d->'m') is distinct from 'string' or length(d->>'m')>4000 then raise exception 'Geçersiz geçmiş metni' using errcode='22023'; end if;
      insert into app_private.isler24_activity(task_id,kind,actor,message) values((result->>'id')::bigint,case when k='comments' then 'comment' else 'history' end,u.full_name,'İçe aktarılan kayıt (doğrulanmamış kaynak): '||left(d::text,5000));
     end loop;
    end if;
   end loop;
  end loop;
  return jsonb_build_object('imported',jsonb_array_length(payload));
 end if;
 if task_id is not null then
  select * into r from app_private.isler24_tasks where id=task_id and scope=scope_name for update;
  if not found or (r.deleted_at is not null and resource<>'geri-al') then raise exception 'İş bulunamadı' using errcode='P0002'; end if;
  if method='GET' and resource='gecmis' then return app_private.isler24_json(r)->'log'; end if;
  if method<>'GET' and role_name<>'yonetici' and r.creator_id<>u.id and r.data->>'who'<>u.id::text and not (r.data->'helpers' ? u.id::text) then raise exception 'Yalnızca kendi veya yardımcı olduğunuz işi değiştirebilirsiniz' using errcode='42501'; end if;
  if (payload->>'version')::integer is distinct from r.version then raise exception 'İş başka kullanıcı tarafından değiştirildi. Yenileyin' using errcode='40001'; end if;
 else
  if resource<>'isler' or method<>'POST' then raise exception 'Geçersiz işlem' using errcode='22023'; end if;
 end if;
 if resource='geri-al' and method='POST' then
  if r.deleted_at is null or clock_timestamp()>r.undo_until or (r.deleted_by<>u.id and role_name<>'yonetici') then raise exception 'Geri alma süresi doldu' using errcode='22023'; end if;
  update app_private.isler24_tasks set deleted_at=null,deleted_by=null,undo_until=null,version=version+1 where id=r.id returning * into saved;
  k:='Silme geri alındı';
 elsif resource='isler' and method='DELETE' then
  update app_private.isler24_tasks set deleted_at=clock_timestamp(),deleted_by=u.id,undo_until=clock_timestamp()+interval '7 seconds',version=version+1 where id=r.id returning * into saved;
  insert into app_private.isler24_activity(task_id,kind,actor,message) values(r.id,'history',u.full_name,'Silindi');
  return jsonb_build_object('id',saved.id,'version',saved.version,'undoUntil',floor(extract(epoch from saved.undo_until)*1000));
 elsif resource='yorum' and method='POST' then
  if jsonb_typeof(payload->'m') is distinct from 'string' or length(trim(payload->>'m')) not between 1 and 4000 or payload-'m'-'version'<>'{}'::jsonb then raise exception 'Geçersiz yorum' using errcode='22023'; end if;
  if (select count(*) from app_private.isler24_activity act where act.task_id=r.id and act.kind='comment')>=1000 then raise exception 'Yorum sınırına ulaşıldı' using errcode='22023'; end if;
  insert into app_private.isler24_activity(task_id,kind,actor,message) values(r.id,'comment',u.full_name,trim(payload->>'m'));
  update app_private.isler24_tasks set version=version+1 where id=r.id returning * into saved; k:='Yorum eklendi';
 elsif resource='sayac' and method='POST' then
  if payload-'version'-'action'<>'{}'::jsonb or coalesce(payload->>'action','') not in ('start','stop') then raise exception 'Geçersiz sayaç işlemi' using errcode='22023'; end if;
  d:=r.data;
  if payload->>'action'='start' then
   if d->>'status'='bitti' then raise exception 'Tamamlanan işte sayaç başlatılamaz' using errcode='22023'; end if;
   if (d->>'ts')::numeric<>0 then raise exception 'Sayaç zaten çalışıyor' using errcode='40001'; end if;
   d:=d||jsonb_build_object('ts',floor(extract(epoch from clock_timestamp())*1000),'status','devam'); k:='Sayaç başladı';
  else
   if (d->>'ts')::numeric<>0 then d:=d||jsonb_build_object('time',(d->>'time')::numeric+greatest(0,extract(epoch from clock_timestamp())-(d->>'ts')::numeric/1000),'ts',0); end if; k:='Sayaç durdu';
  end if;
  update app_private.isler24_tasks set data=d,version=version+1 where id=r.id returning * into saved;
 elsif resource='sirala' and method='POST' then
  if payload-'version'-'before'-'status'<>'{}'::jsonb or coalesce(payload->>'status','') not in ('yapilacak','devam','bitti') then raise exception 'Geçersiz sıra' using errcode='22023'; end if;
  select * into saved from app_private.isler24_tasks where id=(payload->>'before')::bigint and scope=scope_name and deleted_at is null and data->>'status'=payload->>'status';
  if not found or saved.id=r.id then raise exception 'Sıra hedefi bulunamadı' using errcode='22023'; end if;
  d:=app_private.isler24_dispatch('PUT','isler',r.id,r.data||jsonb_build_object('version',r.version,'status',payload->>'status'));
  -- Reindex positions only. Business fields of other people's tasks are never changed.
  v:=0;
  for x in select jsonb_build_object('id',t.id) from app_private.isler24_tasks t where t.scope=scope_name and t.deleted_at is null and t.data->>'status'=payload->>'status' and t.id<>r.id order by coalesce((t.data->>'ord')::numeric,1e9),t.id loop
   if (x->>'id')::bigint=saved.id then update app_private.isler24_tasks set data=data||jsonb_build_object('ord',v),version=version+1 where id=r.id;v:=v+1;end if;
   update app_private.isler24_tasks set data=data||jsonb_build_object('ord',v),version=version+1 where id=(x->>'id')::bigint;v:=v+1;
  end loop;
  select * into saved from app_private.isler24_tasks where id=r.id;k:='Sıralama değişti';
 elsif resource='isler' and method in ('POST','PUT') then
  if (method='PUT' and task_id is null) or (method='POST' and task_id is not null) then raise exception 'Geçersiz işlem' using errcode='22023'; end if;
  d:=app_private.isler24_validate((payload-'ord')||jsonb_build_object('time',0,'ts',0));
  if payload?'ord' and (jsonb_typeof(payload->'ord') is distinct from 'number' or abs((payload->>'ord')::numeric)>1e9) then raise exception 'Geçersiz sıra' using errcode='22023'; end if;
  d:=d||jsonb_build_object('ord',coalesce(payload->'ord','1000000000'::jsonb),'time',coalesce(r.data->'time','0'::jsonb),'ts',coalesce(r.data->'ts','0'::jsonb));
  if (d->>'who'<>'' and not exists(select 1 from public.app_users where id::text=d->>'who' and is_active and coalesce(branch_id::text,'hq')=scope_name)) or exists(select 1 from jsonb_array_elements_text(d->'helpers') h where not exists(select 1 from public.app_users where id::text=h and is_active and coalesce(branch_id::text,'hq')=scope_name)) then raise exception 'Sorumlu ve yardımcılar kayıtlı ekip kullanıcıları olmalı' using errcode='22023'; end if;
  if d->>'status'='bitti' and (d->>'ts')::numeric<>0 then d:=d||jsonb_build_object('time',(d->>'time')::numeric+greatest(0,extract(epoch from clock_timestamp())-(d->>'ts')::numeric/1000),'ts',0); end if;
  if method='POST' then insert into app_private.isler24_tasks(scope,creator_id,data) values(scope_name,u.id,d) returning * into saved;k:='Oluşturuldu';
  else update app_private.isler24_tasks set data=d,version=version+1 where id=r.id returning * into saved;
   k:=case when r.data->>'status'<>d->>'status' then 'Durum → '||case d->>'status' when 'bitti' then 'Tamamlandı' when 'devam' then 'Devam ediyor' else 'Yapılacak' end else 'Düzenlendi' end;
  end if;
  if d->>'status'='bitti' and coalesce(r.data->>'status','')<>'bitti' and coalesce(current_setting('isler24.importing',true),'false')<>'true' then
   update app_private.isler24_tasks set completion=completion+1 where id=saved.id returning * into saved;
   if coalesce((select done from app_private.isler24_settings where scope=scope_name),false) then
    insert into app_private.isler24_outbox(task_id,completion,recipient,title) select saved.id,saved.completion,a.email,d->>'title' from public.app_users c join auth.users a on a.id=c.auth_user_id where c.id=saved.creator_id and c.is_active and a.email is not null on conflict do nothing;
   end if;
   if d->>'rec'<>'' and not exists(select 1 from app_private.isler24_tasks where recurrence_parent=saved.id) then
    base_due:=coalesce(nullif(d->>'due','')::date,(now() at time zone 'Europe/Istanbul')::date);
    next_due:=case d->>'rec' when 'gun' then base_due+1 when 'hafta' then base_due+7 else (base_due+interval '1 month')::date end;
    d:=d||jsonb_build_object('status','yapilacak','due',next_due::text,'start',case when d->>'start'<>'' then ((d->>'start')::date+(next_due-base_due))::text else '' end,'time',0,'ts',0,'subs',coalesce((select jsonb_agg(sub.value||'{"d":false}'::jsonb) from jsonb_array_elements(d->'subs')sub),'[]'::jsonb));
    insert into app_private.isler24_tasks(scope,creator_id,data,recurrence_parent) values(scope_name,saved.creator_id,d,saved.id) returning * into r;
    insert into app_private.isler24_activity(task_id,kind,actor,message) values(r.id,'history','Sistem','Tekrarlayan iş oluşturuldu');
   end if;
  end if;
 else raise exception 'Geçersiz işlem' using errcode='22023';
 end if;
 insert into app_private.isler24_activity(task_id,kind,actor,message) values(saved.id,'history',u.full_name,k);
 return app_private.isler24_json(saved);
end $$;


