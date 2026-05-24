-- Fix app_users self-read RLS recursion.
-- The previous policy queried app_users inside an app_users policy, which can
-- recurse when Flutter loads the signed-in user's app profile.

drop policy if exists app_users_self_or_hq on app_users;

create policy app_users_self_read
on app_users
for select
to authenticated
using (auth_user_id = auth.uid());
