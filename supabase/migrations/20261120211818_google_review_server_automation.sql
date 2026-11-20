-- Server-only scheduler. No customer text or API credentials are exposed to clients.
create table public.google_review_automation (
 branch_id text primary key check (branch_id = 'branch-google-nilufer'),
 enabled boolean not null default false,
 token_digest text not null,
 interval_minutes integer not null default 5 check (interval_minutes between 5 and 1440),
 lease_id uuid, lease_until timestamptz,
 last_started_at timestamptz, last_finished_at timestamptz, last_success_at timestamptz,
 last_google_success_at timestamptz, next_run_at timestamptz,
 status text not null default 'disabled', last_error text,
 reviewed integer not null default 0, prepared integer not null default 0,
 published integer not null default 0, approval_pending integer not null default 0
);
create table public.google_review_automation_runs (
 id uuid primary key, branch_id text not null references public.google_review_automation(branch_id),
 started_at timestamptz not null default now(), finished_at timestamptz,
 status text not null default 'running', reviewed integer default 0, prepared integer default 0,
 published integer default 0, approval_pending integer default 0, error text
);
alter table public.google_review_automation enable row level security;
alter table public.google_review_automation_runs enable row level security;
revoke all on public.google_review_automation, public.google_review_automation_runs from public, anon, authenticated;
grant all on public.google_review_automation, public.google_review_automation_runs to service_role;
create index google_review_automation_runs_started on public.google_review_automation_runs(started_at desc);
-- Generate and retain the scheduling credential inside Vault; never return it.
do $$ declare worker_secret text := encode(extensions.gen_random_bytes(32),'hex'); begin
 perform vault.create_secret(worker_secret,'ototr_google_review_worker');
 insert into public.google_review_automation(branch_id,token_digest)
 values ('branch-google-nilufer',encode(extensions.digest(worker_secret,'sha256'),'hex'));
end $$;
create function public.claim_google_review_automation(p_lease uuid)
returns setof public.google_review_automation language sql security invoker set search_path = '' as $$
 update public.google_review_automation set lease_id=p_lease,lease_until=now()+interval '4 minutes',
 last_started_at=now(),status='running',next_run_at=now()+make_interval(mins=>interval_minutes)
 where branch_id='branch-google-nilufer' and enabled
 and (lease_until is null or lease_until<now()) and (next_run_at is null or next_run_at<=now())
 returning *;
$$;
revoke all on function public.claim_google_review_automation(uuid) from public,anon,authenticated;
grant execute on function public.claim_google_review_automation(uuid) to service_role;
create or replace function app_private.dispatch_google_review_automation()
returns bigint language plpgsql security definer set search_path = '' as $$
declare request_id bigint; begin
 if not exists (select 1 from public.google_review_automation where enabled and branch_id='branch-google-nilufer') then return null; end if;
 select net.http_post(
 url:='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/google-business-oauth',
 headers:=jsonb_build_object('Content-Type','application/json','x-ototr-worker-token',
 (select decrypted_secret from vault.decrypted_secrets where name='ototr_google_review_worker')),
 body:='{"action":"automation_tick"}'::jsonb,timeout_milliseconds:=150000) into request_id;
 return request_id;
end $$;
revoke all on function app_private.dispatch_google_review_automation() from public,anon,authenticated,service_role;
-- Activation is an explicit post-deployment step, after authorization/worker tests.
