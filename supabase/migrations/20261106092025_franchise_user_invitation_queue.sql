create table app_private.franchise_user_invitation_requests (
  id uuid primary key default gen_random_uuid(),
  request_key uuid not null,
  normalized_email text not null check (
    normalized_email = lower(trim(normalized_email))
    and length(normalized_email) between 6 and 254
    and normalized_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  display_name text not null check (length(trim(display_name)) between 2 and 120),
  erp_role text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','provisioned','failed')),
  requested_by uuid not null references auth.users(id) on delete restrict default auth.uid(),
  reviewed_by uuid references auth.users(id) on delete restrict,
  review_note text check (review_note is null or length(trim(review_note)) between 10 and 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  provisioned_at timestamptz,
  unique(requested_by,request_key),
  check (
    (status='pending' and reviewed_by is null and reviewed_at is null)
    or (status<>'pending' and reviewed_by is not null and reviewed_at is not null)
  )
);

create unique index franchise_user_invitation_active_email_uq
on app_private.franchise_user_invitation_requests(normalized_email)
where status in ('pending','approved');

create index franchise_user_invitation_pending_idx
on app_private.franchise_user_invitation_requests(created_at,id)
where status='pending';

alter table app_private.franchise_user_invitation_requests enable row level security;
revoke all on app_private.franchise_user_invitation_requests from public, anon, authenticated;
grant usage on schema app_private to authenticated, service_role;
grant select, insert, update on app_private.franchise_user_invitation_requests to authenticated, service_role;

create policy franchise_user_invitation_select
on app_private.franchise_user_invitation_requests
for select to authenticated
using ((select public.franchise_claim_role()) in ('gm','it'));

create policy franchise_user_invitation_insert
on app_private.franchise_user_invitation_requests
for insert to authenticated
with check (
  (select public.franchise_claim_role())='gm'
  and requested_by=(select auth.uid())
  and status='pending'
  and reviewed_by is null
);

create policy franchise_user_invitation_review
on app_private.franchise_user_invitation_requests
for update to authenticated
using (
  (select public.franchise_claim_role())='it'
  and status='pending'
  and requested_by<>(select auth.uid())
)
with check (
  (select public.franchise_claim_role())='it'
  and status in ('approved','rejected')
  and reviewed_by=(select auth.uid())
  and requested_by<>reviewed_by
);

create function public.request_franchise_user_invitation(
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
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Geçerli talep anahtarı, ad ve kurumsal e-posta zorunludur' using errcode='22023';
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

create function public.list_franchise_user_invitation_requests()
returns table(
  request_id uuid,
  masked_email text,
  display_name text,
  erp_role text,
  request_status text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path=''
as $$
  select
    request_row.id,
    left(split_part(request_row.normalized_email,'@',1),1)||'***@'||split_part(request_row.normalized_email,'@',2),
    request_row.display_name,
    request_row.erp_role,
    request_row.status,
    request_row.created_at
  from app_private.franchise_user_invitation_requests request_row
  order by request_row.created_at desc,request_row.id desc
  limit 100;
$$;

create function public.review_franchise_user_invitation(
  p_request_id uuid,
  p_decision text,
  p_note text
)
returns table(request_id uuid,request_status text)
language plpgsql
security invoker
set search_path=''
as $$
begin
  if (select public.franchise_claim_role())<>'it' or (select auth.uid()) is null then
    raise exception 'Hesap davet talebini yalnız BT sorumlusu inceleyebilir' using errcode='42501';
  end if;
  if lower(trim(p_decision)) not in ('approved','rejected') or length(trim(p_note)) not between 10 and 500 then
    raise exception 'Geçerli karar ve en az 10 karakter inceleme notu zorunludur' using errcode='22023';
  end if;

  return query
  update app_private.franchise_user_invitation_requests request_row
  set status=lower(trim(p_decision)),reviewed_by=(select auth.uid()),review_note=trim(p_note),reviewed_at=now()
  where request_row.id=p_request_id
    and request_row.status='pending'
    and request_row.requested_by<>(select auth.uid())
  returning request_row.id,request_row.status;

  if not found then
    raise exception 'Bekleyen ve bağımsız incelemeye uygun davet talebi bulunamadı' using errcode='P0002';
  end if;
end
$$;

revoke all on function public.request_franchise_user_invitation(uuid,text,text,text) from public, anon;
revoke all on function public.list_franchise_user_invitation_requests() from public, anon;
revoke all on function public.review_franchise_user_invitation(uuid,text,text) from public, anon;
grant execute on function public.request_franchise_user_invitation(uuid,text,text,text) to authenticated;
grant execute on function public.list_franchise_user_invitation_requests() to authenticated;
grant execute on function public.review_franchise_user_invitation(uuid,text,text) to authenticated;

comment on table app_private.franchise_user_invitation_requests is
'Private maker-checker queue for Franchise department account invitations. It never stores a password and does not create Auth users.';
