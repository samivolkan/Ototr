alter table ik_ototr_private.members add column can_health boolean not null default false;
alter table ik_ototr_private.members add column can_discipline boolean not null default false;
update ik_ototr_private.members set can_discipline=true where headquarters;
create function ik_ototr_private.any_access() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.ik_ototr_units u where ik_ototr_private.allowed(u.unit,false));
$$;
create function ik_ototr_private.capability(target text,cap text) returns boolean language sql stable security definer set search_path='' as $$
 select ik_ototr_private.allowed(target,false) and exists(select 1 from ik_ototr_private.members m where m.user_id=auth.uid() and m.enabled and case cap when 'identity' then m.headquarters when 'health' then m.can_health when 'discipline' then m.can_discipline when 'financial' then ik_ototr_private.allowed(target,true) else false end);
$$;
create function ik_ototr_private.project_document(value jsonb,target text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d jsonb:=value; staff jsonb:='[]'; e jsonb; personal jsonb; f boolean:=ik_ototr_private.capability(target,'financial'); ident boolean:=ik_ototr_private.capability(target,'identity'); health boolean:=ik_ototr_private.capability(target,'health');
begin
 if not ik_ototr_private.allowed(target,false) then raise exception 'IK_FORBIDDEN' using errcode='42501';end if;
 for e in select x from jsonb_array_elements(d->'employees') x loop
  personal:=coalesce(e->'personal','{}');
  if not ident then e:=e||'{"identity":""}'::jsonb;personal:=personal||'{"bank":"","iban":""}'::jsonb;end if;
  if not health then personal:=personal||'{"disability":"","bloodGroup":""}'::jsonb;end if;
  if not f then e:=e||'{"salary":0,"salaryHistory":[]}'::jsonb;end if;
  e:=jsonb_set(e,'{personal}',personal);staff:=staff||jsonb_build_array(e);
 end loop;
 d:=jsonb_set(d,'{employees}',staff);
 if not f then
  d:=d||'{"payrolls":[],"compensations":[],"paymentAdjustments":[]}'::jsonb;
  d:=jsonb_set(d,'{requests}',coalesce((select jsonb_agg(q-'amount'-'repayments') from jsonb_array_elements(d->'requests') q where q->>'type' not in ('Avans','Harcama')),'[]'));
  d:=jsonb_set(d,'{settings,financialControls}','[]');
 end if;
 return d;
end; $$;
create function ik_ototr_private.read_units() returns table(unit text,document jsonb,revision bigint)
language sql stable security definer set search_path='' as $$
 select u.unit,ik_ototr_private.project_document(u.document,u.unit),u.revision from public.ik_ototr_units u where ik_ototr_private.allowed(u.unit,false);
$$;
create function public.ik_ototr_read_units() returns table(unit text,document jsonb,revision bigint)
language sql security invoker set search_path='' as $$select * from ik_ototr_private.read_units();$$;
create function ik_ototr_private.access_units() returns table(unit text,can_write boolean)
language sql stable security definer set search_path='' as $$select u.unit,ik_ototr_private.allowed(u.unit,true) from public.ik_ototr_units u where ik_ototr_private.allowed(u.unit,false);$$;
create or replace function public.ik_ototr_access() returns table(unit text,can_write boolean)
language sql security invoker set search_path='' as $$select * from ik_ototr_private.access_units();$$;
create function ik_ototr_private.permissions() returns jsonb language sql stable security definer set search_path='' as $$
 select case when ik_ototr_private.any_access() then jsonb_build_object('identity',coalesce((select headquarters from ik_ototr_private.members where user_id=auth.uid()),false),'health',coalesce((select can_health from ik_ototr_private.members where user_id=auth.uid()),false),'discipline',coalesce((select can_discipline from ik_ototr_private.members where user_id=auth.uid()),false)) else '{}'::jsonb end;
$$;
create function public.ik_ototr_permissions() returns jsonb language sql security invoker set search_path='' as $$select ik_ototr_private.permissions();$$;

-- Clients may not fetch an unprojected document, including through a forged REST query.
revoke select on public.ik_ototr_units from authenticated;
drop policy business_read on public.ik_ototr_business;
create policy business_read on public.ik_ototr_business for select to authenticated using(
 ((ik_ototr_private.allowed(unit,false) and (kind<>'integration' or ik_ototr_private.allowed(unit,true)))
 or (kind='assignment' and ik_ototr_private.allowed(to_unit,false))
 or (kind='organization' and ik_ototr_private.any_access()))
);

create function ik_ototr_private.preserve_protected_fields() returns trigger language plpgsql security definer set search_path='' as $$
declare e jsonb; old_e jsonb; result jsonb:='[]'; personal jsonb; key text;
 ident boolean:=ik_ototr_private.capability(new.unit,'identity'); health boolean:=ik_ototr_private.capability(new.unit,'health');
begin
 if auth.uid() is null then return new;end if;
 for e in select x from jsonb_array_elements(new.document->'employees') x loop
  select x into old_e from jsonb_array_elements(old.document->'employees') x where x->>'id'=e->>'id';
  personal:=coalesce(e->'personal','{}');
  if not ident then
   if coalesce(e->>'identity','') not in ('',coalesce(old_e->>'identity','')) then raise exception 'Kimlik alanına yazma yetkiniz yok.' using errcode='42501';end if;
   e:=jsonb_set(e,'{identity}',coalesce(old_e->'identity','""'));
   foreach key in array array['bank','iban'] loop
    if coalesce(personal->>key,'') not in ('',coalesce(old_e->'personal'->>key,'')) then raise exception 'Banka alanına yazma yetkiniz yok.' using errcode='42501';end if;
    personal:=jsonb_set(personal,array[key],coalesce(old_e->'personal'->key,'""'));
   end loop;
  end if;
  if not health then
   foreach key in array array['disability','bloodGroup'] loop
    if coalesce(personal->>key,'') not in ('',coalesce(old_e->'personal'->>key,'')) then raise exception 'Sağlık alanına yazma yetkiniz yok.' using errcode='42501';end if;
    personal:=jsonb_set(personal,array[key],coalesce(old_e->'personal'->key,'""'));
   end loop;
  end if;
  e:=jsonb_set(e,'{personal}',personal);result:=result||jsonb_build_array(e);
 end loop;
 new.document:=jsonb_set(new.document,'{employees}',result);return new;
end; $$;
create trigger a_preserve_protected before update of document on public.ik_ototr_units for each row execute function ik_ototr_private.preserve_protected_fields();

create table public.ik_ototr_sensitive (
 id uuid primary key default gen_random_uuid(),unit text not null references public.ik_ototr_units(unit),employee_id text not null,
 category text not null check(category in ('health','discipline')),note text not null check(length(note) between 1 and 2000),
 mode text not null default 'synthetic-demo' check(mode='synthetic-demo'),revision bigint not null default 1,updated_at timestamptz not null default now()
);
create index ik_ototr_sensitive_unit_idx on public.ik_ototr_sensitive(unit);
alter table public.ik_ototr_sensitive enable row level security;
revoke all on public.ik_ototr_sensitive from public,anon,authenticated;
grant select on public.ik_ototr_sensitive to authenticated;
create policy sensitive_read on public.ik_ototr_sensitive for select to authenticated using(ik_ototr_private.capability(unit,category));
create function ik_ototr_private.sensitive_save(target text,employee text,category text,note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not ik_ototr_private.allowed(target,true) or not ik_ototr_private.capability(target,category) then raise exception 'IK_FORBIDDEN' using errcode='42501';end if;
 if not exists(select 1 from public.ik_ototr_units u,jsonb_array_elements(u.document->'employees') e where u.unit=target and e->>'id'=employee) or coalesce(trim(note),'')='' then raise exception 'Çalışan veya açıklama geçersiz.';end if;
 insert into public.ik_ototr_sensitive(unit,employee_id,category,note) values(target,employee,category,note) returning id into result;
 insert into ik_ototr_private.business_events(record_id,actor,action,revision) values(result::text,auth.uid(),'restricted_demo_record',1);return result;
end; $$;
create function public.ik_ototr_sensitive_save(target text,employee text,category text,note text) returns uuid
language sql security invoker set search_path='' as $$select ik_ototr_private.sensitive_save(target,employee,category,note);$$;

revoke all on function ik_ototr_private.any_access(),ik_ototr_private.capability(text,text),ik_ototr_private.project_document(jsonb,text),ik_ototr_private.read_units(),ik_ototr_private.access_units(),ik_ototr_private.permissions(),ik_ototr_private.preserve_protected_fields(),ik_ototr_private.sensitive_save(text,text,text,text) from public,anon,authenticated;
grant execute on function ik_ototr_private.any_access(),ik_ototr_private.capability(text,text),ik_ototr_private.read_units(),ik_ototr_private.access_units(),ik_ototr_private.permissions(),ik_ototr_private.sensitive_save(text,text,text,text) to authenticated;
revoke all on function public.ik_ototr_read_units(),public.ik_ototr_permissions(),public.ik_ototr_sensitive_save(text,text,text,text) from public,anon;
grant execute on function public.ik_ototr_read_units(),public.ik_ototr_permissions(),public.ik_ototr_sensitive_save(text,text,text,text) to authenticated;
