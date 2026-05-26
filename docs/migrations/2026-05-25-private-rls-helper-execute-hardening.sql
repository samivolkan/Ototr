-- Tighten execute grants for private RLS helper functions.

revoke execute on function app_private.current_user_is_hq() from public, anon, authenticated;
revoke execute on function app_private.current_user_can_access_branch(uuid) from public, anon, authenticated;

grant execute on function app_private.current_user_is_hq() to authenticated;
grant execute on function app_private.current_user_can_access_branch(uuid) to authenticated;
