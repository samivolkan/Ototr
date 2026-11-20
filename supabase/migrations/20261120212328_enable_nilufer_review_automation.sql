update public.google_review_automation set enabled=true,status='ready',next_run_at=now() where branch_id='branch-google-nilufer';
select cron.schedule('ototr-nilufer-review-automation','*/5 * * * *','select app_private.dispatch_google_review_automation()');
