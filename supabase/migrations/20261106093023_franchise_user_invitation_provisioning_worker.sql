alter table app_private.franchise_user_invitation_requests
  drop constraint franchise_user_invitation_requests_status_check,
  add column attempt_count integer not null default 0 check(attempt_count between 0 and 5),
  add column lease_token uuid,
  add column lease_expires_at timestamptz,
  add column last_error_code text check(last_error_code is null or last_error_code ~ '^[a-z0-9_]{3,64}$'),
  add column provisioned_auth_user_id uuid references auth.users(id) on delete restrict,
  add constraint franchise_user_invitation_requests_status_check
    check(status in ('pending','approved','rejected','provisioning','provisioned','failed')),
  add constraint franchise_user_invitation_provisioning_state_check check(
    (status='provisioning' and lease_token is not null and lease_expires_at is not null)
    or (status<>'provisioning' and lease_token is null and lease_expires_at is null)
  ),
  add constraint franchise_user_invitation_provisioned_user_check check(
    (status='provisioned' and provisioned_auth_user_id is not null and provisioned_at is not null)
    or (status<>'provisioned' and provisioned_auth_user_id is null and provisioned_at is null)
  );

create index franchise_user_invitation_worker_idx
on app_private.franchise_user_invitation_requests(status,lease_expires_at,created_at,id)
where status in ('approved','provisioning');

create function public.claim_franchise_user_invitation_requests(p_limit integer default 10)
returns table(
  request_id uuid,
  normalized_email text,
  display_name text,
  erp_role text,
  lease_token uuid
)
language plpgsql
security invoker
set search_path=''
as $$
begin
  if p_limit not between 1 and 25 then
    raise exception 'Davet worker batch limiti 1 ile 25 arasında olmalıdır' using errcode='22023';
  end if;

  update app_private.franchise_user_invitation_requests request_row
  set status='failed',lease_token=null,lease_expires_at=null,last_error_code='attempts_exhausted'
  where request_row.status='provisioning'
    and request_row.lease_expires_at<now()
    and request_row.attempt_count>=5;

  return query
  with candidates as(
    select request_row.id
    from app_private.franchise_user_invitation_requests request_row
    where (
      request_row.status='approved'
      or (request_row.status='provisioning' and request_row.lease_expires_at<now())
    )
      and request_row.attempt_count<5
    order by request_row.created_at,request_row.id
    for update skip locked
    limit p_limit
  )
  update app_private.franchise_user_invitation_requests request_row
  set status='provisioning',attempt_count=request_row.attempt_count+1,
      lease_token=gen_random_uuid(),lease_expires_at=now()+interval '10 minutes',last_error_code=null
  from candidates
  where request_row.id=candidates.id
  returning request_row.id,request_row.normalized_email,request_row.display_name,
            request_row.erp_role,request_row.lease_token;
end
$$;

create function app_private.finish_franchise_user_invitation(
  p_request_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_auth_user_id uuid,
  p_error_code text
)
returns table(request_id uuid,request_status text)
language plpgsql
security definer
set search_path=''
as $$
declare
  v_request app_private.franchise_user_invitation_requests%rowtype;
  v_auth_email text;
  v_app_user public.app_users%rowtype;
begin
  if p_request_id is null or p_lease_token is null then
    raise exception 'Davet worker kimliği ve lease zorunludur' using errcode='22023';
  end if;

  select * into v_request
  from app_private.franchise_user_invitation_requests request_row
  where request_row.id=p_request_id and request_row.status='provisioning'
    and request_row.lease_token=p_lease_token and request_row.lease_expires_at>=now()
  for update;
  if not found then
    raise exception 'Aktif davet provisioning lease bulunamadı' using errcode='P0002';
  end if;

  if not p_success then
    if p_auth_user_id is not null or p_error_code is null or p_error_code !~ '^[a-z0-9_]{3,64}$' then
      raise exception 'Başarısız sonuç için güvenli hata kodu zorunludur' using errcode='22023';
    end if;
    update app_private.franchise_user_invitation_requests request_row
    set status=case when request_row.attempt_count>=5 or p_error_code='auth_cleanup_failed' then 'failed' else 'approved' end,
        lease_token=null,lease_expires_at=null,last_error_code=p_error_code
    where request_row.id=p_request_id
    returning request_row.id,request_row.status into request_id,request_status;
    return next;
    return;
  end if;

  if p_auth_user_id is null or p_error_code is not null then
    raise exception 'Başarılı sonuç için Auth kullanıcı kimliği zorunludur' using errcode='22023';
  end if;
  select lower(trim(auth_user.email)) into v_auth_email from auth.users auth_user where auth_user.id=p_auth_user_id;
  if v_auth_email is null or v_auth_email<>v_request.normalized_email then
    raise exception 'Auth kullanıcısı ile onaylı davet e-postası eşleşmiyor' using errcode='23514';
  end if;

  select * into v_app_user from public.app_users app_user
  where app_user.auth_user_id=p_auth_user_id or lower(trim(app_user.email))=v_auth_email
  order by (app_user.auth_user_id=p_auth_user_id) desc
  limit 1 for update;
  if found then
    if v_app_user.auth_user_id is not null and v_app_user.auth_user_id<>p_auth_user_id then
      raise exception 'ERP e-postası başka Auth hesabına bağlı' using errcode='23505';
    end if;
    if v_app_user.branch_id is not null then
      raise exception 'Merkez daveti şube kullanıcısına bağlanamaz' using errcode='42501';
    end if;
    update public.app_users set auth_user_id=p_auth_user_id,full_name=v_request.display_name,
      email=v_auth_email,role=v_request.erp_role,is_active=true,updated_at=now()
    where id=v_app_user.id;
  else
    insert into public.app_users(auth_user_id,branch_id,full_name,email,role,is_active)
    values(p_auth_user_id,null,v_request.display_name,v_auth_email,v_request.erp_role,true);
  end if;

  update app_private.franchise_user_invitation_requests request_row
  set status='provisioned',lease_token=null,lease_expires_at=null,last_error_code=null,
      provisioned_auth_user_id=p_auth_user_id,provisioned_at=now()
  where request_row.id=p_request_id
  returning request_row.id,request_row.status into request_id,request_status;
  return next;
end
$$;

create function public.finish_franchise_user_invitation(
  p_request_id uuid,
  p_lease_token uuid,
  p_success boolean,
  p_auth_user_id uuid,
  p_error_code text
)
returns table(request_id uuid,request_status text)
language sql
security invoker
set search_path=''
as $$
  select * from app_private.finish_franchise_user_invitation(
    p_request_id,p_lease_token,p_success,p_auth_user_id,p_error_code
  );
$$;

revoke all on function public.claim_franchise_user_invitation_requests(integer) from public,anon,authenticated;
revoke all on function public.finish_franchise_user_invitation(uuid,uuid,boolean,uuid,text) from public,anon,authenticated;
revoke all on function app_private.finish_franchise_user_invitation(uuid,uuid,boolean,uuid,text) from public,anon,authenticated;
grant execute on function public.claim_franchise_user_invitation_requests(integer) to service_role;
grant execute on function public.finish_franchise_user_invitation(uuid,uuid,boolean,uuid,text) to service_role;
grant execute on function app_private.finish_franchise_user_invitation(uuid,uuid,boolean,uuid,text) to service_role;

comment on function public.claim_franchise_user_invitation_requests(integer) is
'Service-role-only lease claim for independently approved OTOTR account invitations.';
comment on function public.finish_franchise_user_invitation(uuid,uuid,boolean,uuid,text) is
'Service-role-only result boundary. Successful completion atomically links the invited Auth identity to the HQ ERP directory.';
