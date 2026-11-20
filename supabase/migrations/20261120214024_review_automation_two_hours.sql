begin;
update public.google_review_automation set interval_minutes=120,next_run_at=to_timestamp((floor(extract(epoch from now())/7200)+1)*7200) where branch_id='branch-google-nilufer';
select cron.alter_job(jobid, schedule := '0 */2 * * *') from cron.job where jobname='ototr-nilufer-review-automation';
commit;
