create or replace function public.claim_google_review_automation(p_lease uuid)
returns setof public.google_review_automation language sql security invoker set search_path = '' as $$
 update public.google_review_automation set lease_id=p_lease,lease_until=now()+interval '4 minutes',
 last_started_at=now(),status='running',next_run_at=to_timestamp((floor(extract(epoch from now())/(interval_minutes*60))+1)*(interval_minutes*60))
 where branch_id='branch-google-nilufer' and enabled
 and (lease_until is null or lease_until<now()) and (next_run_at is null or next_run_at<=now())
 returning *;
$$;
update public.google_review_automation set next_run_at=date_trunc('hour',now())+(floor(extract(minute from now())/5)+1)*interval '5 minutes' where lease_id is null;
