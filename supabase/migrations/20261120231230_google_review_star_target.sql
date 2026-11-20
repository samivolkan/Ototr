alter table public.google_review_targets add column if not exists rating_target numeric(2,1) check (rating_target between 1 and 5);
