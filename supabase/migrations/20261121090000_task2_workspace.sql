create table if not exists app_private.task2_workspace (
  scope text primary key,
  data jsonb not null default '{}'::jsonb,
  version bigint not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.app_users(id)
);
alter table app_private.task2_workspace enable row level security;
revoke all on app_private.task2_workspace from public, anon, authenticated;

create or replace function app_private.task2_workspace_dispatch(method text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u public.app_users; scope_name text; role_name text; row_data app_private.task2_workspace; incoming jsonb; previous jsonb;
 old_task jsonb; new_task jsonb; task_id text; actor_id text; x jsonb; user_key text;
begin
 if auth.uid() is null then raise exception 'ERP oturumu gerekli' using errcode='28000'; end if;
 select * into u from public.app_users where auth_user_id=auth.uid() and is_active;
 if not found then raise exception 'Aktif ERP hesabı gerekli' using errcode='42501'; end if;
 scope_name:=coalesce(u.branch_id::text,'hq');
 select role into role_name from app_private.kokpit_roles where user_id=u.id;
 role_name:=coalesce(role_name,case when u.role in ('CEO','GENERAL_MANAGER','BRANCH_MANAGER') then 'yonetici'
   when u.role in ('INSPECTION_TECHNICIAN','OPERATIONS','CRM_AGENT','MARKETING','HR','FRANCHISE_SALES','SUPPORT_AGENT','ACADEMY_MANAGER') then 'calisan' else 'izleyici' end);
 if method='GET' then
   select * into row_data from app_private.task2_workspace where scope=scope_name;
   return jsonb_build_object('data',coalesce(row_data.data,'{}'::jsonb),'version',coalesce(row_data.version,0),'serverTime',floor(extract(epoch from clock_timestamp())*1000),'identity',jsonb_build_object('id',u.id,'name',u.full_name,'role',role_name,'scope',scope_name));
 end if;
 if method<>'PUT' or role_name='izleyici' then raise exception 'Bu işlem için yetki gerekli' using errcode='42501'; end if;
 if jsonb_typeof(payload) is distinct from 'object' or payload-'data'-'version'<>'{}'::jsonb
   or jsonb_typeof(payload->'data') is distinct from 'object' or octet_length(payload::text)>2097152
   or coalesce((payload->>'version')::bigint,-1)<0 then raise exception 'Geçersiz çalışma alanı' using errcode='22023'; end if;
 incoming:=payload->'data';
 if jsonb_typeof(incoming->'tasks') is distinct from 'array' or jsonb_array_length(incoming->'tasks')>10000
   or jsonb_typeof(incoming->'projects') is distinct from 'array' or jsonb_array_length(incoming->'projects')>500
   or jsonb_typeof(incoming->'members') is distinct from 'array' or jsonb_array_length(incoming->'members')>1000
   or jsonb_typeof(incoming->'comments') is distinct from 'array' or jsonb_array_length(incoming->'comments')>50000
   or jsonb_typeof(incoming->'activity') is distinct from 'array' or jsonb_array_length(incoming->'activity')>100000 then
   raise exception 'Çalışma alanı verisi sınırları aşıyor' using errcode='22023'; end if;
 for x in select value from jsonb_array_elements(incoming->'members') loop
   if jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'id') is distinct from 'string'
      or jsonb_typeof(x->'name') is distinct from 'string' or length(trim(x->>'name')) not between 1 and 200
      or not exists(select 1 from public.app_users where id::text=x->>'id' and is_active and coalesce(branch_id::text,'hq')=scope_name) then
     raise exception 'Üye listesi yalnızca aktif ERP hesaplarından oluşmalı' using errcode='22023';
   end if;
 end loop;
 for x in select value from jsonb_array_elements(incoming->'projects') loop
   if jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'id') is distinct from 'string'
      or length(x->>'id') not between 1 and 80 or jsonb_typeof(x->'name') is distinct from 'string'
      or length(trim(x->>'name')) not between 1 and 200 or jsonb_typeof(x->'members') is distinct from 'array'
      or jsonb_array_length(x->'members')>1000 then raise exception 'Geçersiz proje verisi' using errcode='22023'; end if;
   for user_key in select jsonb_array_elements_text(x->'members') loop
     if not exists(select 1 from public.app_users where id::text=user_key and is_active and coalesce(branch_id::text,'hq')=scope_name) then
       raise exception 'Proje üyeleri aktif ERP hesapları olmalı' using errcode='22023';
     end if;
   end loop;
   if x?'desc' and (jsonb_typeof(x->'desc') is distinct from 'string' or length(x->>'desc')>10000) then raise exception 'Proje açıklaması çok uzun' using errcode='22023'; end if;
 end loop;
 for x in select value from jsonb_array_elements(incoming->'tasks') loop
   if jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'id') is distinct from 'string'
      or length(x->>'id') not between 1 and 100 or jsonb_typeof(x->'title') is distinct from 'string'
      or length(trim(x->>'title')) not between 1 and 500 or jsonb_typeof(x->'project') is distinct from 'string'
      or length(x->>'project') not between 1 and 100 or jsonb_typeof(x->'desc') is distinct from 'string'
      or length(x->>'desc')>50000 or x->>'status' not in ('backlog','todo','progress','review','done')
      or x->>'priority' not in ('none','low','medium','high','urgent')
      or jsonb_typeof(x->'labels') is distinct from 'array' or jsonb_array_length(x->'labels')>100
      or jsonb_typeof(x->'subtasks') is distinct from 'array' or jsonb_array_length(x->'subtasks')>500
      or jsonb_typeof(x->'helpers') is distinct from 'array' or jsonb_array_length(x->'helpers')>100
      or (x?'assignee' and x->'assignee'<>'null'::jsonb and jsonb_typeof(x->'assignee') is distinct from 'string') then
     raise exception 'Geçersiz görev alanı veya sınır aşıldı' using errcode='22023';
   end if;
   if coalesce(x->>'assignee','')<>'' and not exists(select 1 from public.app_users where id::text=x->>'assignee' and is_active and coalesce(branch_id::text,'hq')=scope_name) then
     raise exception 'Sorumlu aktif ERP hesabı olmalı' using errcode='22023';
   end if;
   for user_key in select jsonb_array_elements_text(x->'helpers') loop
     if not exists(select 1 from public.app_users where id::text=user_key and is_active and coalesce(branch_id::text,'hq')=scope_name) then
       raise exception 'Yardımcılar aktif ERP hesapları olmalı' using errcode='22023';
     end if;
   end loop;
   if exists(select 1 from jsonb_array_elements(x->'labels') label where jsonb_typeof(label) is distinct from 'string' or length(label#>>'{}')>100) then raise exception 'Geçersiz etiket' using errcode='22023'; end if;
   if exists(select 1 from jsonb_array_elements(x->'subtasks') sub where jsonb_typeof(sub) is distinct from 'object' or jsonb_typeof(sub->'title') is distinct from 'string' or length(trim(sub->>'title')) not between 1 and 500) then raise exception 'Geçersiz alt görev' using errcode='22023'; end if;
 end loop;
 for x in select value from jsonb_array_elements(incoming->'comments') loop
   if jsonb_typeof(x) is distinct from 'object' or jsonb_typeof(x->'id') is distinct from 'string'
      or length(x->>'id') not between 1 and 100 or jsonb_typeof(x->'task') is distinct from 'string'
      or jsonb_typeof(x->'text') is distinct from 'string' or length(trim(x->>'text')) not between 1 and 4000 then
     raise exception 'Geçersiz yorum' using errcode='22023';
   end if;
 end loop;
 select data into previous from app_private.task2_workspace where scope=scope_name;
 previous:=coalesce(previous,'{}'::jsonb);
 if coalesce(incoming->'activity','[]'::jsonb) @> coalesce(previous->'activity','[]'::jsonb) is false then
   raise exception 'Geçmiş kayıtları değiştirilemez veya silinemez' using errcode='42501';
 end if;
 if role_name<>'yonetici' then
   if previous<>'{}'::jsonb and (incoming-'tasks'-'comments'-'activity'-'_task2') is distinct from (previous-'tasks'-'comments'-'activity'-'_task2') then
     raise exception 'Projeleri ve çalışma alanı ayarlarını yalnızca yönetici değiştirebilir' using errcode='42501';
   end if;
   for old_task in select value from jsonb_array_elements(coalesce(previous->'tasks','[]'::jsonb)) loop
     task_id:=old_task->>'id';
     select value into new_task from jsonb_array_elements(coalesce(incoming->'tasks','[]'::jsonb)) where value->>'id'=task_id limit 1;
     if new_task is distinct from old_task then
       actor_id:=u.id::text;
       if old_task->>'creator' is distinct from actor_id and old_task->>'assignee' is distinct from actor_id
          and not coalesce(old_task->'helpers','[]'::jsonb) @> to_jsonb(actor_id) then
         raise exception 'Yalnızca kendi veya yardımcı olduğunuz görevi değiştirebilirsiniz' using errcode='42501';
       end if;
     end if;
     new_task:=null;
   end loop;
   for new_task in select value from jsonb_array_elements(coalesce(incoming->'tasks','[]'::jsonb)) loop
     task_id:=new_task->>'id';
     if not exists(select 1 from jsonb_array_elements(coalesce(previous->'tasks','[]'::jsonb)) old where old->>'id'=task_id) then
       new_task:=new_task||jsonb_build_object('creator',u.id::text);
       incoming:=jsonb_set(incoming,'{tasks}',(select jsonb_agg(case when value->>'id'=task_id then new_task else value end) from jsonb_array_elements(incoming->'tasks')));
     end if;
   end loop;
   for old_task in select value from jsonb_array_elements(coalesce(previous->'comments','[]'::jsonb)) loop
     task_id:=old_task->>'task';
     if not coalesce(incoming->'comments','[]'::jsonb) @> jsonb_build_array(old_task) then
       if not exists(select 1 from jsonb_array_elements(coalesce(previous->'tasks','[]'::jsonb)) t where t->>'id'=task_id and
         (t->>'creator'=u.id::text or t->>'assignee'=u.id::text or coalesce(t->'helpers','[]'::jsonb) @> to_jsonb(u.id::text))) then
         raise exception 'Başka kullanıcının görevi üzerindeki yorumu değiştiremezsiniz' using errcode='42501';
       end if;
     end if;
   end loop;
   for new_task in select value from jsonb_array_elements(coalesce(incoming->'comments','[]'::jsonb)) loop
     task_id:=new_task->>'task';
     if not coalesce(previous->'comments','[]'::jsonb) @> jsonb_build_array(new_task) and not exists(
       select 1 from jsonb_array_elements(coalesce(incoming->'tasks','[]'::jsonb)) t where t->>'id'=task_id and
       (t->>'creator'=u.id::text or t->>'assignee'=u.id::text or coalesce(t->'helpers','[]'::jsonb) @> to_jsonb(u.id::text))) then
       raise exception 'Yorumu yalnızca kendi veya yardımcı olduğunuz göreve ekleyebilirsiniz' using errcode='42501';
     end if;
   end loop;
 end if;
 for new_task in select value from jsonb_array_elements(coalesce(incoming->'tasks','[]'::jsonb)) loop
   task_id:=new_task->>'id';
   select value into old_task from jsonb_array_elements(coalesce(previous->'tasks','[]'::jsonb)) where value->>'id'=task_id limit 1;
   incoming:=jsonb_set(incoming,'{tasks}',(select jsonb_agg(case when value->>'id'=task_id then
     (value-'creator')||jsonb_build_object('creator',coalesce(old_task->'creator',to_jsonb(u.id::text))) else value end)
     from jsonb_array_elements(incoming->'tasks')));
   old_task:=null;
 end loop;
 for new_task in select value from jsonb_array_elements(coalesce(incoming->'comments','[]'::jsonb)) loop
   task_id:=new_task->>'id';
   select value into old_task from jsonb_array_elements(coalesce(previous->'comments','[]'::jsonb)) where value->>'id'=task_id limit 1;
   if found then actor_id:=old_task->>'by'; user_key:=old_task->>'at';
   elsif previous='{}'::jsonb and task_id like 'legacy-comment-%' then actor_id:=new_task->>'by'; user_key:=new_task->>'at';
   else actor_id:=u.id::text; user_key:=floor(extract(epoch from clock_timestamp())*1000)::text; end if;
   incoming:=jsonb_set(incoming,'{comments}',(select jsonb_agg(case when value->>'id'=task_id then
     (value-'by'-'at')||jsonb_build_object('by',actor_id,'at',coalesce(user_key,floor(extract(epoch from clock_timestamp())*1000)::text)::numeric) else value end) from jsonb_array_elements(incoming->'comments')));
   old_task:=null;
 end loop;
 for new_task in select value from jsonb_array_elements(coalesce(incoming->'activity','[]'::jsonb)) loop
   task_id:=new_task->>'id';
   select value into old_task from jsonb_array_elements(coalesce(previous->'activity','[]'::jsonb)) where value->>'id'=task_id limit 1;
   if found then actor_id:=old_task->>'by'; user_key:=old_task->>'at';
   elsif previous='{}'::jsonb and task_id like 'legacy-activity-%' then actor_id:=new_task->>'by'; user_key:=new_task->>'at';
   else actor_id:=u.id::text; user_key:=floor(extract(epoch from clock_timestamp())*1000)::text; end if;
   incoming:=jsonb_set(incoming,'{activity}',(select jsonb_agg(case when value->>'id'=task_id then
     (value-'by'-'at')||jsonb_build_object('by',actor_id,'at',coalesce(user_key,floor(extract(epoch from clock_timestamp())*1000)::text)::numeric) else value end)
     from jsonb_array_elements(incoming->'activity')));
   old_task:=null;
 end loop;
 insert into app_private.task2_workspace(scope,data,version,updated_by) values(scope_name,incoming,0,u.id) on conflict(scope) do nothing;
 update app_private.task2_workspace set data=incoming,version=version+1,updated_at=clock_timestamp(),updated_by=u.id
   where scope=scope_name and version=(payload->>'version')::bigint returning * into row_data;
 if not found then raise exception 'Çalışma alanı başka kullanıcı tarafından değiştirildi; yenileyip tekrar deneyin' using errcode='40001'; end if;
 return jsonb_build_object('data',row_data.data,'version',row_data.version,'serverTime',floor(extract(epoch from clock_timestamp())*1000));
end $$;
revoke all on function app_private.task2_workspace_dispatch(text,jsonb) from public,anon,authenticated;
grant execute on function app_private.task2_workspace_dispatch(text,jsonb) to authenticated;
create or replace function public.task2_workspace_api(method text,payload jsonb default '{}'::jsonb)
returns jsonb language sql security invoker set search_path='' as $$ select app_private.task2_workspace_dispatch(method,payload) $$;
revoke all on function public.task2_workspace_api(text,jsonb) from public,anon;
grant execute on function public.task2_workspace_api(text,jsonb) to authenticated;
