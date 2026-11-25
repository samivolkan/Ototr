create or replace function web_private.create_branch_draft() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.website_content(kind,slug,title,branch_id,details)
 values('branch','sube-'||new.id::text,left(case when length(trim(coalesce(new.name,'')))>=3 then trim(new.name) else 'OTOTR Yeni Şube' end,180),new.id,jsonb_build_object('city',new.city,'district',new.district,'address',coalesce(new.address,'')))
 on conflict(branch_id) do nothing;
 return new;
end $$;
revoke all on function web_private.create_branch_draft() from public,anon,authenticated;
