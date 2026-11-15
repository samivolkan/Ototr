update public.google_review_policies
set auto_reply_enabled=true, updated_at=clock_timestamp()
where connection_id='ototr-primary';
