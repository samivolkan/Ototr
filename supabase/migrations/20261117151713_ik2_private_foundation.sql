-- No memberships are provisioned by this migration. A fictional demo name is
-- never sufficient to grant an actual account access to HR data.
create schema if not exists ik2_private;
revoke all on schema ik2_private from public, anon, authenticated;
grant usage on schema ik2_private to authenticated;

create table ik2_private.members (
  user_id uuid primary key references auth.users(id),
  role text not null check (role in ('hr_admin')),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table ik2_private.members enable row level security;
revoke all on ik2_private.members from public, anon, authenticated;

create function ik2_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from ik2_private.members m
    where m.user_id = auth.uid() and m.enabled and m.role = 'hr_admin'
  );
$$;
revoke all on function ik2_private.is_admin() from public, anon;
grant execute on function ik2_private.is_admin() to authenticated;

create table public.ik2_workspaces (
  id text primary key check (id ~ '^[-a-z0-9_]{1,80}$'),
  document jsonb not null check (jsonb_typeof(document) = 'object'
    and document->>'mode' = 'synthetic-demo'
    and jsonb_typeof(document->'employees') = 'array'
    and octet_length(document::text) <= 5000000),
  revision bigint not null default 1 check (revision > 0),
  updated_by uuid not null default auth.uid(),
  updated_at timestamptz not null default now()
);
alter table public.ik2_workspaces enable row level security;
revoke all on public.ik2_workspaces from public, anon, authenticated;
grant select, insert, update on public.ik2_workspaces to authenticated;
create policy ik2_workspace_read on public.ik2_workspaces for select to authenticated
  using ((select ik2_private.is_admin()));
create policy ik2_workspace_create on public.ik2_workspaces for insert to authenticated
  with check ((select ik2_private.is_admin()) and updated_by = (select auth.uid()));
create policy ik2_workspace_update on public.ik2_workspaces for update to authenticated
  using ((select ik2_private.is_admin()))
  with check ((select ik2_private.is_admin()) and updated_by = (select auth.uid()));

create table public.ik2_workspace_events (
  id bigint generated always as identity primary key,
  workspace_id text not null references public.ik2_workspaces(id),
  revision bigint not null,
  actor_id uuid not null,
  occurred_at timestamptz not null default now(),
  snapshot jsonb not null,
  unique(workspace_id,revision)
);
alter table public.ik2_workspace_events enable row level security;
revoke all on public.ik2_workspace_events from public, anon, authenticated;
grant select on public.ik2_workspace_events to authenticated;
create policy ik2_events_read on public.ik2_workspace_events for select to authenticated
  using ((select ik2_private.is_admin()));

create function ik2_private.guard_workspace() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not ik2_private.is_admin() then
    raise exception 'IK2 access denied' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    if new.id <> old.id or new.revision <> old.revision + 1 then
      raise exception 'IK2 revision conflict' using errcode = '40001';
    end if;
  elsif new.revision <> 1 then
    raise exception 'IK2 initial revision must be 1';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function ik2_private.guard_workspace() from public, anon, authenticated;
create trigger ik2_workspace_guard before insert or update on public.ik2_workspaces
for each row execute function ik2_private.guard_workspace();

-- A trigger owns append-only server history. Clients never choose actor/time.
create function ik2_private.record_workspace_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not ik2_private.is_admin() then
    raise exception 'IK2 access denied' using errcode = '42501';
  end if;
  insert into public.ik2_workspace_events(workspace_id,revision,actor_id,snapshot)
  values(new.id,new.revision,auth.uid(),new.document);
  return new;
end;
$$;
revoke all on function ik2_private.record_workspace_event() from public, anon, authenticated;
create trigger ik2_workspace_history after insert or update on public.ik2_workspaces
for each row execute function ik2_private.record_workspace_event();

create function public.ik2_context() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('enabled',ik2_private.is_admin(),'mode','synthetic-demo');
$$;
revoke all on function public.ik2_context() from public, anon;
grant execute on function public.ik2_context() to authenticated;
