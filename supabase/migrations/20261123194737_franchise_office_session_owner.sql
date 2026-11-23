-- Match the session gate's canonical ERP membership, not the legacy app_users directory.
create or replace function app_private.franchise_office_manager() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(
 select 1 from saha_private.members m where m.id=saha_private.current_member()
 and m.active and m.role='admin' and m.org_role='headquarters');
$$;
revoke all on function app_private.franchise_office_manager() from public,anon,authenticated;
-- Profile changes only through the validated, version-checked office RPC.
revoke all on public.franchise_agent_profile from anon,authenticated;
