-- Additive module: existing ERP tasks and accounts are never rewritten.
create schema if not exists app_private;
create table app_private.kokpit_roles (
  user_id uuid primary key references public.app_users(id),
  role text not null check(role in ('yonetici','calisan','izleyici'))
);
create table app_private.kokpit_settings (
  scope text primary key, late boolean not null default false,
  done boolean not null default true, version integer not null default 1
);
create table app_private.kokpit_isler (
  id bigint generated always as identity primary key,
  scope text not null, creator_id uuid not null references public.app_users(id),
  data jsonb not null, version integer not null default 1,
  created timestamptz not null default now(),
  recurrence_parent bigint unique references app_private.kokpit_isler(id) on delete set null,
  completion integer not null default 0
);
create index kokpit_scope_idx on app_private.kokpit_isler(scope,id);
create index kokpit_creator_idx on app_private.kokpit_isler(creator_id);
create table app_private.kokpit_outbox (
  id uuid primary key default gen_random_uuid(), task_id bigint,
  completion integer not null, recipient text not null, title text not null,
  attempts integer not null default 0, available_at timestamptz not null default now(),
  sent_at timestamptz, last_error text, created_at timestamptz not null default now(),
  unique(task_id,completion)
);
create index kokpit_mail_pending_idx on app_private.kokpit_outbox(available_at) where sent_at is null;
alter table app_private.kokpit_roles enable row level security;
alter table app_private.kokpit_settings enable row level security;
alter table app_private.kokpit_isler enable row level security;
alter table app_private.kokpit_outbox enable row level security;
revoke all on app_private.kokpit_roles,app_private.kokpit_settings,app_private.kokpit_isler,app_private.kokpit_outbox from public,anon,authenticated;

create function app_private.kokpit_validate(d jsonb) returns jsonb
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

-- The only user-facing database entrypoint checks auth, active ERP account,
-- branch boundary, role, validation and optimistic version inside one transaction.
create function app_private.kokpit_dispatch(method text, resource text, task_id bigint default null, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.app_users; role_name text; scope_name text; oldrow app_private.kokpit_isler;
  saved app_private.kokpit_isler; d jsonb; settings app_private.kokpit_settings;
  next_due date; base_due date; next_data jsonb; result jsonb;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli' using errcode='28000'; end if;
  select * into u from public.app_users where auth_user_id=auth.uid() and is_active=true;
  if not found then raise exception 'Aktif ERP hesabı gerekli' using errcode='42501'; end if;
  scope_name:=coalesce(u.branch_id::text,'hq');
  select role into role_name from app_private.kokpit_roles where user_id=u.id;
  role_name:=coalesce(role_name,case when u.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
    when u.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
  if resource='me' and method='GET' then return jsonb_build_object('id',u.id,'name',u.full_name,'role',role_name,'scope',scope_name); end if;
  if method is null or resource is null or method not in ('GET','POST','PUT','DELETE') or resource not in ('isler','settings','users','import') then raise exception 'Uç nokta bulunamadı' using errcode='P0002'; end if;
  if method<>'GET' and role_name='izleyici' then raise exception 'İzleyici değişiklik yapamaz' using errcode='42501'; end if;
  if resource='import' then
    if method<>'POST' or jsonb_typeof(payload) is distinct from 'array' then raise exception 'Geçersiz içe aktarma' using errcode='22023'; end if;
    if jsonb_array_length(payload) not between 1 and 100 or octet_length(payload::text)>1048576 then raise exception 'En fazla 100 iş / 1 MB aktarılabilir' using errcode='22023'; end if;
    perform pg_advisory_xact_lock(hashtextextended('kokpit:'||scope_name,0));
    for d in select value from jsonb_array_elements(payload) loop
      d:=app_private.kokpit_validate(d);
      insert into app_private.kokpit_isler(scope,creator_id,data) values(scope_name,u.id,d);
    end loop;
    return jsonb_build_object('imported',jsonb_array_length(payload));
  end if;
  if resource='users' then
    if method<>'GET' then raise exception 'İzin yok' using errcode='42501'; end if;
    return coalesce((select jsonb_agg(jsonb_build_object('name',full_name)) from public.app_users where is_active and coalesce(branch_id::text,'hq')=scope_name),'[]'::jsonb);
  end if;
  if resource='settings' then
    if method='PUT' then
      if role_name<>'yonetici' then raise exception 'Otomasyonu yalnızca yönetici değiştirebilir' using errcode='42501'; end if;
      if jsonb_typeof(payload->'late') is distinct from 'boolean' or jsonb_typeof(payload->'done') is distinct from 'boolean'
        or payload-'late'-'done'-'version'<>'{}'::jsonb then raise exception 'Geçersiz otomasyon' using errcode='22023'; end if;
      insert into app_private.kokpit_settings(scope) values(scope_name) on conflict do nothing;
      update app_private.kokpit_settings set late=(payload->>'late')::boolean,done=(payload->>'done')::boolean,version=version+1
      where scope=scope_name and version=(payload->>'version')::integer returning * into settings;
      if not found then raise exception 'Ayarlar değişti. Yenileyip tekrar deneyin' using errcode='40001'; end if;
    elsif method<>'GET' then raise exception 'İzin yok' using errcode='42501'; end if;
    select * into settings from app_private.kokpit_settings where scope=scope_name;
    return jsonb_build_object('late',coalesce(settings.late,false),'done',coalesce(settings.done,true),'version',coalesce(settings.version,1));
  end if;
  if method='GET' then
    return coalesce((select jsonb_agg(t.data||jsonb_build_object('id',t.id,'creator',c.full_name,'created',floor(extract(epoch from t.created)*1000),'version',t.version) order by t.id)
      from app_private.kokpit_isler t join public.app_users c on c.id=t.creator_id where t.scope=scope_name and (task_id is null or t.id=task_id)),'[]'::jsonb);
  end if;
  -- Serializes changes within this workspace, including recurrence and imports.
  perform pg_advisory_xact_lock(hashtextextended('kokpit:'||scope_name,0));
  if method in ('PUT','DELETE') then
    select * into oldrow from app_private.kokpit_isler where id=task_id and scope=scope_name for update;
    if not found then raise exception 'İş bulunamadı' using errcode='P0002'; end if;
    if (payload->>'version')::integer is distinct from oldrow.version then raise exception 'İş başka bir kullanıcı tarafından değiştirildi. Yenileyip tekrar deneyin' using errcode='40001'; end if;
    if method='DELETE' then delete from app_private.kokpit_isler where id=task_id; return jsonb_build_object('deleted',task_id); end if;
  end if;
  d:=app_private.kokpit_validate(payload);
  if method='POST' then
    insert into app_private.kokpit_isler(scope,creator_id,data) values(scope_name,u.id,d) returning * into saved;
  else
    update app_private.kokpit_isler set data=d,version=version+1 where id=task_id returning * into saved;
  end if;
  if d->>'status'='bitti' and coalesce(oldrow.data->>'status','')<>'bitti' then
    update app_private.kokpit_isler set completion=completion+1 where id=saved.id returning * into saved;
    if coalesce((select done from app_private.kokpit_settings where scope=scope_name),true) then
      insert into app_private.kokpit_outbox(task_id,completion,recipient,title)
      select saved.id,saved.completion,a.email,d->>'title' from public.app_users c join auth.users a on a.id=c.auth_user_id
      where c.id=saved.creator_id and c.is_active and a.email is not null on conflict do nothing;
    end if;
    if d->>'rec'<>'' and not exists(select 1 from app_private.kokpit_isler where recurrence_parent=saved.id) then
      base_due:=coalesce(nullif(d->>'due','')::date,(now() at time zone 'Europe/Istanbul')::date);
      next_due:=case d->>'rec' when 'gun' then base_due+1 when 'hafta' then base_due+7 else (base_due+interval '1 month')::date end;
      next_data:=d||jsonb_build_object('status','yapilacak','due',next_due::text,'start',case when d->>'start'<>'' then ((d->>'start')::date+(next_due-base_due))::text else '' end,
        'time',0,'ts',0,'subs',coalesce((select jsonb_agg(x||'{"d":false}'::jsonb) from jsonb_array_elements(d->'subs')x),'[]'::jsonb));
      insert into app_private.kokpit_isler(scope,creator_id,data,recurrence_parent) values(scope_name,saved.creator_id,next_data,saved.id);
    end if;
  end if;
  select saved.data||jsonb_build_object('id',saved.id,'creator',full_name,'created',floor(extract(epoch from saved.created)*1000),'version',saved.version) into result from public.app_users where id=saved.creator_id;
  return result;
end $$;

create function public.kokpit_api(method text, resource text, task_id bigint default null, payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.kokpit_dispatch(method,resource,task_id,payload) $$;
revoke all on function app_private.kokpit_validate(jsonb),app_private.kokpit_dispatch(text,text,bigint,jsonb),public.kokpit_api(text,text,bigint,jsonb) from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.kokpit_dispatch(text,text,bigint,jsonb),public.kokpit_api(text,text,bigint,jsonb) to authenticated;

create function app_private.kokpit_daily() returns integer language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
  update app_private.kokpit_isler t set data=jsonb_set(data,'{pri}','"yuksek"'),version=t.version+1
  from app_private.kokpit_settings s where s.scope=t.scope and s.late and t.data->>'status'<>'bitti'
    and t.data->>'due'<>'' and (t.data->>'due')::date<(now() at time zone 'Europe/Istanbul')::date and t.data->>'pri'<>'yuksek';
  get diagnostics changed=row_count; return changed;
end $$;
revoke all on function app_private.kokpit_daily() from public,anon,authenticated;

-- SMTP worker access is service-role only. Leases recover interrupted sends.
create function public.kokpit_mail_claim() returns setof app_private.kokpit_outbox
language sql security definer set search_path='' as $$
  update app_private.kokpit_outbox set available_at=now()+interval '5 minutes',attempts=attempts+1
  where id in (select id from app_private.kokpit_outbox where sent_at is null and available_at<=now() and attempts<10 order by created_at limit 20 for update skip locked) returning *
$$;
create function public.kokpit_mail_ack(mail_id uuid, success boolean) returns void
language sql security definer set search_path='' as $$
  update app_private.kokpit_outbox set sent_at=case when success then now() else null end,
    last_error=case when success then null else 'SMTP teslimi başarısız; yeniden denenecek' end,
    available_at=now()+interval '15 minutes' where id=mail_id
$$;
revoke all on function public.kokpit_mail_claim(),public.kokpit_mail_ack(uuid,boolean) from public,anon,authenticated;
grant execute on function public.kokpit_mail_claim(),public.kokpit_mail_ack(uuid,boolean) to service_role;
