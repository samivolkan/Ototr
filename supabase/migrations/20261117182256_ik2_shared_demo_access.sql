-- All active ERP accounts may collaborate ONLY on synthetic IK2 data.
-- No real HR membership or ERP role is granted or modified.
create function ik2_private.can_use_demo() returns boolean
language sql stable security definer set search_path = '' as $$
 select auth.uid() is not null and exists (
  select 1 from public.app_users u where u.auth_user_id=auth.uid() and u.is_active=true
 );
$$;
revoke all on function ik2_private.can_use_demo() from public, anon;
grant execute on function ik2_private.can_use_demo() to authenticated;
alter policy ik2_workspace_read on public.ik2_workspaces using ((select ik2_private.can_use_demo()));
alter policy ik2_workspace_create on public.ik2_workspaces with check ((select ik2_private.can_use_demo()) and updated_by=(select auth.uid()));
alter policy ik2_workspace_update on public.ik2_workspaces using ((select ik2_private.can_use_demo())) with check ((select ik2_private.can_use_demo()) and updated_by=(select auth.uid()));
alter policy ik2_events_read on public.ik2_workspace_events using ((select ik2_private.can_use_demo()));
create or replace function ik2_private.guard_workspace() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or not ik2_private.can_use_demo() then
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
create or replace function ik2_private.record_workspace_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not ik2_private.can_use_demo() then
    raise exception 'IK2 access denied' using errcode = '42501';
  end if;
  insert into public.ik2_workspace_events(workspace_id,revision,actor_id,snapshot)
  values(new.id,new.revision,auth.uid(),new.document);
  return new;
end;
$$;
create or replace function public.ik2_context() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object('enabled',ik2_private.can_use_demo(),'mode','synthetic-demo');
$$;
