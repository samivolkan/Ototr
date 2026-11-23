create table public.seo_report_cache (
 source text primary key check(source in ('gbp','ads')),
 branch_id text not null default 'branch-google-nilufer' check(branch_id='branch-google-nilufer'),
 payload jsonb, last_success_at timestamptz, last_attempt_at timestamptz,
 last_error text, lease_until timestamptz, enabled boolean not null default false,
 token_digest text
);
alter table public.seo_report_cache enable row level security;
revoke all on public.seo_report_cache from public,anon,authenticated;
grant all on public.seo_report_cache to service_role;
insert into public.seo_report_cache(source) values ('gbp'),('ads');
do $$ declare s text:=encode(extensions.gen_random_bytes(32),'hex'); begin
 perform vault.create_secret(s,'ototr_seo_worker');
 update public.seo_report_cache set token_digest=encode(extensions.digest(s,'sha256'),'hex');
end $$;
create function public.claim_seo_sync(p_source text) returns setof public.seo_report_cache
language sql security invoker set search_path='' as $$
 update public.seo_report_cache set lease_until=now()+interval '3 minutes',last_attempt_at=now()
 where source=p_source and (lease_until is null or lease_until<now())
 and (last_attempt_at is null or last_attempt_at<now()-interval '5 minutes')
 returning *;
$$;
revoke all on function public.claim_seo_sync(text) from public,anon,authenticated;
grant execute on function public.claim_seo_sync(text) to service_role;
create function app_private.dispatch_seo_sync() returns bigint language plpgsql security definer set search_path='' as $$
declare r bigint; begin
 if not exists(select 1 from public.seo_report_cache where source='gbp' and enabled) then return null;end if;
 select net.http_post(url:='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/seo-reporting',
 headers:=jsonb_build_object('Content-Type','application/json','x-seo-worker',(select decrypted_secret from vault.decrypted_secrets where name='ototr_seo_worker')),
 body:='{"action":"worker"}'::jsonb,timeout_milliseconds:=90000) into r;
 return r;end $$;
revoke all on function app_private.dispatch_seo_sync() from public,anon,authenticated,service_role;
