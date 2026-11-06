drop index if exists app_private.franchise_user_invitation_active_email_uq;
create unique index franchise_user_invitation_active_email_uq
on app_private.franchise_user_invitation_requests(normalized_email)
where status in ('pending','approved','provisioning');

create or replace function public.request_franchise_user_invitation(
  p_request_key uuid,
  p_email text,
  p_display_name text,
  p_erp_role text
)
returns table(request_id uuid,request_status text)
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_email text:=lower(trim(p_email));
begin
  if (select public.franchise_claim_role())<>'gm' or (select auth.uid()) is null then
    raise exception 'Hesap davet talebini yalnız Genel Müdür açabilir' using errcode='42501';
  end if;
  if p_request_key is null or length(trim(p_display_name)) not between 2 and 120
     or length(v_email) not between 6 and 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or right(v_email,10)<>'@ototr.com' then
    raise exception 'Geçerli talep anahtarı, ad ve @ototr.com kurumsal e-posta zorunludur' using errcode='22023';
  end if;
  if exists(
    select 1 from public.app_users app_user
    where lower(trim(app_user.email))=v_email and app_user.is_active
  ) then
    raise exception 'Bu kurumsal e-posta zaten aktif ERP hesabına bağlıdır' using errcode='23505';
  end if;
  if not exists(
    select 1 from public.franchise_department_erp_role_eligibility eligibility
    where eligibility.erp_role=upper(trim(p_erp_role)) and eligibility.is_active
  ) then
    raise exception 'ERP rolü Franchise departman sorumluluğu için uygun değildir' using errcode='22023';
  end if;

  insert into app_private.franchise_user_invitation_requests(
    request_key,normalized_email,display_name,erp_role,requested_by
  ) values(
    p_request_key,v_email,trim(p_display_name),upper(trim(p_erp_role)),(select auth.uid())
  )
  on conflict(requested_by,request_key) do nothing;

  return query
  select request_row.id,request_row.status
  from app_private.franchise_user_invitation_requests request_row
  where request_row.requested_by=(select auth.uid()) and request_row.request_key=p_request_key;
end
$$;

revoke all on function public.request_franchise_user_invitation(uuid,text,text,text) from public,anon;
grant execute on function public.request_franchise_user_invitation(uuid,text,text,text) to authenticated;
