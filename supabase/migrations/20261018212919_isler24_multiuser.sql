create function app_private.isler24_validate(d jsonb) returns jsonb
language plpgsql set search_path='' as $$
declare k text; item jsonb; date_value date;
begin
  if jsonb_typeof(d) is distinct from 'object' or octet_length(d::text)>65536 then
    raise exception 'Geçersiz iş verisi' using errcode='22023'; end if;
  for k in select jsonb_object_keys(d) loop
    if k not in ('id','title','desc','who','helpers','creator','start','due','pri','status','proj','tags','subs','rec','time','ts','created','version') then
      raise exception 'Bilinmeyen alan: %',k using errcode='22023'; end if;
  end loop;
  foreach k in array array['title','desc','who','start','due','pri','status','proj','rec'] loop
    if jsonb_typeof(d->k) is distinct from 'string' then raise exception 'Geçersiz alan: %',k using errcode='22023'; end if;
  end loop;
  if length(trim(d->>'title')) not between 1 and 120 or length(d->>'desc')>10000
    or length(d->>'who')>120 or length(d->>'proj')>120 then raise exception 'Alan uzunluğu geçersiz' using errcode='22023'; end if;
  if d->>'pri' not in ('yuksek','orta','dusuk') or d->>'status' not in ('yapilacak','devam','bitti')
    or d->>'rec' not in ('','gun','hafta','ay') then raise exception 'Geçersiz seçim' using errcode='22023'; end if;
  foreach k in array array['start','due'] loop
    if d->>k <> '' then
      if d->>k !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Geçersiz tarih' using errcode='22023'; end if;
      begin date_value:=(d->>k)::date;
      exception when others then raise exception 'Geçersiz tarih' using errcode='22023'; end;
      if date_value < date '1900-01-01' or date_value > date '2200-12-31' then raise exception 'Tarih aralık dışında' using errcode='22023'; end if;
    end if;
  end loop;
  if d->>'start'<>'' and d->>'due'<>'' and d->>'start'>d->>'due' then raise exception 'Bitiş başlangıçtan önce olamaz' using errcode='22023'; end if;
  foreach k in array array['helpers','tags','subs'] loop
    if jsonb_typeof(d->k) is distinct from 'array' then raise exception 'Geçersiz liste' using errcode='22023'; end if;
    if jsonb_array_length(d->k)>100 then raise exception 'En fazla 100 öğe eklenebilir' using errcode='22023'; end if;
    for item in select value from jsonb_array_elements(d->k) loop
      if k='subs' then
        if jsonb_typeof(item) is distinct from 'object' or jsonb_typeof(item->'t') is distinct from 'string'
          or length(trim(item->>'t')) not between 1 and 500 or jsonb_typeof(item->'d') is distinct from 'boolean'
          or item - 't' - 'd' <> '{}'::jsonb then raise exception 'Geçersiz alt görev' using errcode='22023'; end if;
      elsif jsonb_typeof(item) is distinct from 'string' or length(trim(item#>>'{}')) not between 1 and 120 then
        raise exception 'Geçersiz etiket/kişi' using errcode='22023';
      end if;
    end loop;
  end loop;
  foreach k in array array['time','ts'] loop
    if jsonb_typeof(d->k) is distinct from 'number' then raise exception 'Geçersiz süre' using errcode='22023'; end if;
    if (d->>k)::numeric<0 or (d->>k)::numeric > (case when k='ts' then extract(epoch from clock_timestamp())*1000+60000 else 315576000 end) then
      raise exception 'Süre aralık dışında' using errcode='22023'; end if;
  end loop;
  if d->>'status'='bitti' and (d->>'ts')::numeric<>0 then raise exception 'Tamamlanan işte sayaç durdurulmalı' using errcode='22023'; end if;
  return (d-'id'-'creator'-'created'-'version') || jsonb_build_object('title',trim(d->>'title'));
end $$;

-- Separate namespace preserves the existing /kokpit module and its data.
create table app_private.isler24_tasks (
 id bigint generated always as identity primary key, scope text not null,
 creator_id uuid not null references public.app_users(id), data jsonb not null,
 version integer not null default 1, created timestamptz not null default now(),
 deleted_at timestamptz, deleted_by uuid references public.app_users(id), undo_until timestamptz,
 recurrence_parent bigint unique references app_private.isler24_tasks(id), completion integer not null default 0
);
create index isler24_scope_idx on app_private.isler24_tasks(scope,id) where deleted_at is null;
create index isler24_creator_idx on app_private.isler24_tasks(creator_id);
create index isler24_deleted_by_idx on app_private.isler24_tasks(deleted_by);
create table app_private.isler24_activity (
 id bigint generated always as identity primary key, task_id bigint not null references app_private.isler24_tasks(id),
 kind text not null check(kind in ('comment','history')), actor text not null, message text not null, at timestamptz not null default clock_timestamp()
);
create index isler24_activity_task_idx on app_private.isler24_activity(task_id,id);
create table app_private.isler24_filters(user_id uuid primary key references public.app_users(id), data jsonb not null default '[]', version integer not null default 1);
create table app_private.isler24_settings(scope text primary key, late boolean not null default false, done boolean not null default false,version integer not null default 1);
create table app_private.isler24_outbox (like app_private.kokpit_outbox including all);
alter table app_private.isler24_tasks enable row level security;
alter table app_private.isler24_activity enable row level security;
alter table app_private.isler24_filters enable row level security;
alter table app_private.isler24_settings enable row level security;
alter table app_private.isler24_outbox enable row level security;
revoke all on app_private.isler24_tasks,app_private.isler24_activity,app_private.isler24_filters,app_private.isler24_settings,app_private.isler24_outbox from public,anon,authenticated;

create function app_private.isler24_json(t app_private.isler24_tasks) returns jsonb language sql stable set search_path='' as $$
 select t.data||jsonb_build_object('id',t.id,'creator',t.creator_id,'created',floor(extract(epoch from t.created)*1000),'version',t.version,
 'comments',coalesce((select jsonb_agg(jsonb_build_object('a',a.actor,'d',floor(extract(epoch from a.at)*1000),'m',a.message) order by a.id) from app_private.isler24_activity a where a.task_id=t.id and a.kind='comment'),'[]'::jsonb),
 'log',coalesce((select jsonb_agg(jsonb_build_object('d',floor(extract(epoch from a.at)*1000),'m',a.message||' · '||a.actor) order by a.id desc) from (select * from app_private.isler24_activity where task_id=t.id and kind='history' order by id desc limit 100)a),'[]'::jsonb))
$$;

create function app_private.isler24_dispatch(method text, resource text, task_id bigint default null, payload jsonb default '{}')
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
 if method='GET' and resource='me' then return jsonb_build_object('id',u.id,'name',u.full_name,'role',role_name,'scope',scope_name,'serverTime',floor(extract(epoch from clock_timestamp())*1000)); end if;
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

create function public.isler24_api(method text,resource text,task_id bigint default null,payload jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select app_private.isler24_dispatch(method,resource,task_id,payload)$$;
revoke all on function app_private.isler24_validate(jsonb),app_private.isler24_json(app_private.isler24_tasks),app_private.isler24_dispatch(text,text,bigint,jsonb),public.isler24_api(text,text,bigint,jsonb) from public,anon,authenticated;
grant execute on function app_private.isler24_dispatch(text,text,bigint,jsonb),public.isler24_api(text,text,bigint,jsonb) to authenticated;

create function app_private.isler24_daily() returns integer language plpgsql security definer set search_path='' as $$
declare t app_private.isler24_tasks; n integer:=0;
begin
 for t in select x.* from app_private.isler24_tasks x join app_private.isler24_settings s on s.scope=x.scope where s.late and x.deleted_at is null and x.data->>'status'<>'bitti' and x.data->>'due'<>'' and (x.data->>'due')::date<(now() at time zone 'Europe/Istanbul')::date and x.data->>'pri'<>'yuksek' for update of x loop
  update app_private.isler24_tasks set data=data||'{"pri":"yuksek"}'::jsonb,version=version+1 where id=t.id;
  insert into app_private.isler24_activity(task_id,kind,actor,message) values(t.id,'history','Sistem','Geciken işin önceliği → Yüksek');n:=n+1;
 end loop;return n;
end $$;
revoke all on function app_private.isler24_daily() from public,anon,authenticated;


-- SMTP worker access is service-role only. Leases recover interrupted sends.
create function public.isler24_mail_claim() returns setof app_private.isler24_outbox
language sql security definer set search_path='' as $$
  update app_private.isler24_outbox set available_at=now()+interval '5 minutes',attempts=attempts+1
  where id in (select id from app_private.isler24_outbox where sent_at is null and available_at<=now() and attempts<10 order by created_at limit 20 for update skip locked) returning *
$$;
create function public.isler24_mail_ack(mail_id uuid, success boolean) returns void
language sql security definer set search_path='' as $$
  update app_private.isler24_outbox set sent_at=case when success then now() else null end,
    last_error=case when success then null else 'SMTP teslimi başarısız; yeniden denenecek' end,
    available_at=now()+interval '15 minutes' where id=mail_id
$$;
revoke all on function public.isler24_mail_claim(),public.isler24_mail_ack(uuid,boolean) from public,anon,authenticated;
grant execute on function public.isler24_mail_claim(),public.isler24_mail_ack(uuid,boolean) to service_role;
