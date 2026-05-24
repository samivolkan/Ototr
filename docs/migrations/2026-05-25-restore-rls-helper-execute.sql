-- RLS policies call these helper functions during authenticated reads.
-- Keep anonymous execution closed, but allow signed-in users so policies do
-- not fail with "permission denied for function current_user_can_access_branch".

revoke execute on function public.current_user_can_access_branch(uuid)
  from public, anon;
revoke execute on function public.current_user_is_hq() from public, anon;

grant execute on function public.current_user_can_access_branch(uuid)
  to authenticated;
grant execute on function public.current_user_is_hq() to authenticated;
