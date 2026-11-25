-- Additive website publishing layer. Existing operational records are not rewritten.
create schema if not exists web_private;
revoke all on schema web_private from public, anon, authenticated;
create table if not exists public.website_content (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('branch','blog')),
 slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,100}$'),
 title text not null check (length(title) between 3 and 180),
 summary text not null default '' check (length(summary)<=500),
 body text not null default '' check (length(body)<=30000),
 details jsonb not null default '{}'::jsonb,
 branch_id uuid references public.branches(id),
 status text not null default 'draft' check (status in ('draft','published','archived')),
 revision integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(kind,slug), unique(branch_id)
);
alter table public.website_content add constraint website_kind_branch check ((kind='branch' and branch_id is not null) or (kind='blog' and branch_id is null));
alter table public.website_content add constraint website_publish_complete check (status<>'published' or (length(trim(summary))>=30 and length(trim(body))>=100 and (kind='blog' or (length(trim(coalesce(details->>'address','')))>=5 and coalesce(details->>'phone','') ~ '^\+?[0-9 ()-]{10,20}$' and length(trim(coalesce(details->>'city','')))>=2 and length(trim(coalesce(details->>'district','')))>=2))));
alter table public.website_content enable row level security;
revoke all on public.website_content from anon;
grant select,insert,update on public.website_content to authenticated;
grant all on public.website_content to service_role;
create policy website_editor_access on public.website_content for all to authenticated
 using (app_private.current_user_has_role(array['CEO','GENERAL_MANAGER','OPERATIONS']))
 with check (app_private.current_user_has_role(array['CEO','GENERAL_MANAGER','OPERATIONS']));

create table web_private.intake_receipts (
 request_id uuid primary key,
 kind text not null check(kind in ('appointment','franchise')),
 payload_hash text not null,
 record_id uuid not null,
 reference_no text not null,
 created_at timestamptz not null default now()
);
alter table web_private.intake_receipts enable row level security;
revoke all on web_private.intake_receipts from public,anon,authenticated;
create table web_private.rate_limits (bucket text primary key, hits integer not null, expires_at timestamptz not null);
alter table web_private.rate_limits enable row level security;
revoke all on web_private.rate_limits from public,anon,authenticated;

create function web_private.create_branch_draft() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.website_content(kind,slug,title,branch_id,details)
 values('branch','sube-'||new.id::text,new.name,new.id,jsonb_build_object('city',new.city,'district',new.district,'address',coalesce(new.address,'')))
 on conflict(branch_id) do nothing;
 return new;
end $$;
revoke all on function web_private.create_branch_draft() from public,anon,authenticated;
create trigger website_new_branch after insert on public.branches for each row execute function web_private.create_branch_draft();

create function public.website_rate_limit(p_bucket text) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if length(p_bucket)>160 then return false; end if;
 delete from web_private.rate_limits where expires_at<now()-interval '1 day';
 insert into web_private.rate_limits(bucket,hits,expires_at) values(p_bucket,1,now()+interval '15 minutes')
 on conflict(bucket) do update set hits=case when web_private.rate_limits.expires_at<now() then 1 else web_private.rate_limits.hits+1 end,
 expires_at=case when web_private.rate_limits.expires_at<now() then now()+interval '15 minutes' else web_private.rate_limits.expires_at end returning hits into n;
 return n<=8;
end $$;
revoke all on function public.website_rate_limit(text) from public,anon,authenticated;
grant execute on function public.website_rate_limit(text) to service_role;

create function public.website_submit(p_kind text,p_request_id uuid,p_hash text,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r web_private.intake_receipts; record_id uuid; ref text; b public.website_content; expected_date date;
begin
 if p_kind not in ('appointment','franchise') or p_request_id is null or p_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REQUEST'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,0));
 select * into r from web_private.intake_receipts where request_id=p_request_id;
 if found then
  if r.payload_hash<>p_hash or r.kind<>p_kind then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  return jsonb_build_object('ok',true,'referenceNo',r.reference_no,'duplicate',true);
 end if;
 if length(trim(coalesce(p_payload->>'fullName','')))<3 or coalesce(p_payload->>'phone','') !~ '^05[0-9]{9}$'
 or (p_payload->>'kvkkConsent')::boolean is distinct from true then raise exception 'INVALID_CONTACT'; end if;
 if p_kind='appointment' then
  select * into b from public.website_content where kind='branch' and status='published' and slug=p_payload->>'branchSlug';
  if not found or not exists(select 1 from public.branches where id=b.branch_id and is_active and status='ACTIVE') then raise exception 'BRANCH_UNAVAILABLE'; end if;
  expected_date=(p_payload->>'preferredDate')::date;
  if expected_date is null or expected_date<(now() at time zone 'Europe/Istanbul')::date or expected_date>(now() at time zone 'Europe/Istanbul')::date+90 then raise exception 'INVALID_DATE'; end if;
  insert into public.public_appointment_requests(source,full_name,phone,province,district,service,preferred_date,preferred_time,note,kvkk_consent,contact_consent,consent_version,payload,request_meta)
  values('oto-tr.com/web',p_payload->>'fullName',p_payload->>'phone',b.details->>'city',b.details->>'district',p_payload->>'service',expected_date,p_payload->>'preferredTime',p_payload->>'note',true,false,'WEB-KVKK-2026-11',p_payload,jsonb_build_object('channel','website-v1','branch_id',b.branch_id,'external_messages',false)) returning id into record_id;
  ref='WEB-CRM-'||upper(left(record_id::text,8));
 else
  if (p_payload->>'processingConsent')::boolean is distinct from true then raise exception 'PROCESSING_CONSENT_REQUIRED'; end if;
  insert into public.public_franchise_applications(source,full_name,phone,province,district,application_type,budget,region,has_location,note,kvkk_consent,processing_consent,contact_consent,consent_version,payload,request_meta)
  values('oto-tr.com/web/franchise',p_payload->>'fullName',p_payload->>'phone',p_payload->>'province',p_payload->>'district',p_payload->>'applicationType',p_payload->>'budget',concat_ws(' / ',p_payload->>'province',p_payload->>'district'),p_payload->>'hasLocation',p_payload->>'note',true,true,false,'FR-KVKK-2026-11',p_payload,jsonb_build_object('channel','website-v1','external_messages',false)) returning id into record_id;
  ref='WEB-FR-'||upper(left(record_id::text,8));
 end if;
 insert into web_private.intake_receipts(request_id,kind,payload_hash,record_id,reference_no) values(p_request_id,p_kind,p_hash,record_id,ref);
 return jsonb_build_object('ok',true,'referenceNo',ref,'duplicate',false);
end $$;
revoke all on function public.website_submit(text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.website_submit(text,uuid,text,jsonb) to service_role;

create function web_private.content_revision() returns trigger language plpgsql set search_path='' as $$
begin
 new.updated_at=now();new.revision=old.revision+1;
 if new.kind<>old.kind or new.branch_id is distinct from old.branch_id then raise exception 'CONTENT_IDENTITY_IMMUTABLE'; end if;
 if new.slug<>old.slug and old.status<>'draft' then raise exception 'PUBLISHED_SLUG_IMMUTABLE'; end if;
 return new;
end $$;
revoke all on function web_private.content_revision() from public,anon,authenticated;
create trigger website_revision before update on public.website_content for each row execute function web_private.content_revision();
