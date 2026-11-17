-- Separate from the legacy IK2 shared demo. No existing ERP roles are changed.
create schema if not exists ik_ototr_private;
revoke all on schema ik_ototr_private from public,anon,authenticated;
grant usage on schema ik_ototr_private to authenticated;
create table ik_ototr_private.members (
 user_id uuid primary key references auth.users(id), unit text,
 headquarters boolean not null default false, can_write boolean not null default false,
 enabled boolean not null default true,
 check (headquarters or unit in ('Nilüfer','Gebze','İnegöl'))
);
revoke all on ik_ototr_private.members from public,anon,authenticated;
alter table ik_ototr_private.members enable row level security;

-- Snapshot only established, confirmed ERP mappings. New users require explicit provisioning.
insert into ik_ototr_private.members(user_id,unit,headquarters,can_write)
select u.id,case when m.branch='Bursa' then 'Nilüfer' else m.branch end,
 m.org_role='headquarters' and m.role='admin', m.org_role in ('headquarters','branch_manager')
from saha_private.members m join auth.users u on lower(u.email)=lower(m.email)
where m.active and u.email_confirmed_at is not null and u.deleted_at is null
and ((m.org_role='headquarters' and m.role='admin') or m.branch in ('Bursa','Gebze'));

create function ik_ototr_private.allowed(target text, writing boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from ik_ototr_private.members m join auth.users u on u.id=m.user_id
 where m.user_id=(select auth.uid()) and m.enabled and (m.headquarters or m.unit=target)
 and (not writing or m.can_write) and u.email_confirmed_at is not null
 and not coalesce(u.is_anonymous,false) and u.deleted_at is null
 and (u.banned_until is null or u.banned_until<=now())
 and exists(select 1 from saha_private.members s where lower(s.email)=lower(u.email) and s.active
 and ((m.headquarters and s.org_role='headquarters' and s.role='admin')
 or (not m.headquarters and (case when s.branch='Bursa' then 'Nilüfer' else s.branch end)=m.unit
 and (not writing or s.org_role='branch_manager')))));
$$;
revoke all on function ik_ototr_private.allowed(text,boolean) from public,anon;
grant execute on function ik_ototr_private.allowed(text,boolean) to authenticated;

create table public.ik_ototr_units (
 unit text primary key check(unit in ('Genel Merkez','Nilüfer','Gebze','İnegöl')),
 document jsonb not null, revision bigint not null default 1 check(revision>0),
 updated_at timestamptz not null default now(), updated_by uuid references auth.users(id),
 check(document->>'mode'='synthetic-demo' and document->>'demoScenario'='ototr-network-v1'),
 check(jsonb_typeof(document->'employees')='array'), check(octet_length(document::text)<5000000)
);
alter table public.ik_ototr_units enable row level security;
revoke all on public.ik_ototr_units from public,anon,authenticated;
grant select on public.ik_ototr_units to authenticated;
create policy unit_read on public.ik_ototr_units for select to authenticated
 using(ik_ototr_private.allowed(unit,false));

create table ik_ototr_private.events (
 id bigint generated always as identity primary key,unit text not null,
 revision bigint not null, actor uuid not null, occurred_at timestamptz not null default now()
);
alter table ik_ototr_private.events enable row level security;
revoke all on ik_ototr_private.events from public,anon,authenticated;

create function ik_ototr_private.save(target text, expected bigint, value jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
 if not ik_ototr_private.allowed(target,true) then raise exception 'IK_FORBIDDEN' using errcode='42501'; end if;
 if value is null or value->>'mode' is distinct from 'synthetic-demo'
 or value->>'demoScenario' is distinct from 'ototr-network-v1'
 or jsonb_typeof(value->'employees') is distinct from 'array'
 or value#>'{settings,branches}' is distinct from jsonb_build_array(target)
 then raise exception 'IK_INVALID_DOCUMENT'; end if;
 if exists(select 1 from jsonb_array_elements(value->'employees') e where e->>'branch' is distinct from target)
 then raise exception 'IK_CROSS_UNIT'; end if;
 update public.ik_ototr_units set document=value, revision=revision+1,updated_at=now(),updated_by=auth.uid()
 where unit=target and revision=expected returning revision into next_revision;
 if next_revision is null then raise exception 'IK_CONFLICT' using errcode='40001'; end if;
 insert into ik_ototr_private.events(unit,revision,actor) values(target,next_revision,auth.uid());
 return next_revision;
end; $$;
revoke all on function ik_ototr_private.save(text,bigint,jsonb) from public,anon;
grant execute on function ik_ototr_private.save(text,bigint,jsonb) to authenticated;
create function public.ik_ototr_save(target text,expected bigint,value jsonb)
returns bigint language sql security invoker set search_path='' as $$
 select ik_ototr_private.save(target,expected,value);
$$;
revoke all on function public.ik_ototr_save(text,bigint,jsonb) from public,anon;
grant execute on function public.ik_ototr_save(text,bigint,jsonb) to authenticated;
create function public.ik_ototr_access()
returns table(unit text,can_write boolean) language sql security invoker set search_path='' as $$
 select u.unit,ik_ototr_private.allowed(u.unit,true) from public.ik_ototr_units u;
$$;
revoke all on function public.ik_ototr_access() from public,anon;
grant execute on function public.ik_ototr_access() to authenticated;
comment on table ik_ototr_private.members is 'IK OTOTR demo ACL. Inegol sample: Elif Aksoy, no auth account and no login grant.';
