-- Ensure legacy public RLS helper functions are not executable through RPC.
-- Policies now use app_private helpers.

revoke execute on function public.current_user_is_hq() from authenticated;
revoke execute on function public.current_user_can_access_branch(uuid) from authenticated;
