-- Keep finance evidence authorization private while preventing its Storage
-- policy from raising permission errors for unrelated private buckets.
create or replace function finance_private.dispute_evidence_request_is_open(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, finance
as $$
  select exists(
    select 1
    from finance.dispute_evidence_requests r
    where r.id = p_request_id
      and r.status = 'OPEN'
  );
$$;

revoke all on function finance_private.dispute_evidence_request_is_open(uuid) from public, anon;
grant execute on function finance_private.dispute_evidence_request_is_open(uuid) to authenticated, service_role;

drop policy if exists finance_dispute_evidence_object_insert on storage.objects;
create policy finance_dispute_evidence_object_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ototr-evidence'
  and (storage.foldername(name))[1] = 'finance-disputes'
  and array_length(storage.foldername(name), 1) = 5
  and (storage.foldername(name))[5] ~ '^[0-9a-fA-F-]{36}$'
  and finance_private.current_actor_can_upload_dispute_evidence(
    auth.uid(),
    ((storage.foldername(name))[5])::uuid
  )
  and finance_private.dispute_evidence_request_is_open(
    ((storage.foldername(name))[5])::uuid
  )
);
