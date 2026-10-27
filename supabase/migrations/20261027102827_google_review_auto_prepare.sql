-- Reserve one AI preparation per existing review identity before any paid call.
-- No new browser grants or RLS policies; only the authorized Edge Function writes.
alter table public.google_review_work_items
  drop constraint google_review_work_status,
  add constraint google_review_work_status check (
    (kind = 'reply' and status in ('approval_pending', 'publishing', 'published', 'publish_failed', 'publish_unknown') and char_length(reply_text) > 0)
    or (kind = 'reply' and status in ('preparing', 'draft_failed') and char_length(reply_text) = 0
      and approved_by is null and approved_at is null and published_at is null
      and ((status = 'preparing' and attempt_id is not null) or (status = 'draft_failed' and attempt_id is null)))
    or (kind <> 'reply' and status in ('open', 'done'))
  );
