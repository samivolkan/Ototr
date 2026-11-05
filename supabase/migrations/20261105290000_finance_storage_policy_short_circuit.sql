create or replace function finance_private.storage_dispute_evidence_access(p_bucket text,p_name text,p_require_open boolean)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,storage,finance,finance_private as $$
declare v_parts text[]:=storage.foldername(p_name); v_request uuid;
begin
  if p_bucket<>'ototr-evidence' or v_parts[1]<>'finance-disputes' or array_length(v_parts,1)<>5 or v_parts[5]!~'^[0-9a-fA-F-]{36}$' then return false; end if;
  v_request:=v_parts[5]::uuid;
  return finance_private.current_actor_can_upload_dispute_evidence(auth.uid(),v_request)
    and (not p_require_open or finance_private.dispute_evidence_request_is_open(v_request));
end $$;

create or replace function finance_private.storage_payment_evidence_access(p_bucket text,p_name text)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,storage,finance_private as $$
declare v_parts text[]:=storage.foldername(p_name);
begin
  if p_bucket<>'ototr-evidence' or v_parts[1]<>'finance-payments' or array_length(v_parts,1)<>4
    or v_parts[2]!~'^[0-9a-fA-F-]{36}$' or v_parts[3]!~'^[0-9a-fA-F-]{36}$' or v_parts[4]!~'^[0-9a-fA-F-]{36}$' then return false; end if;
  return finance_private.current_actor_can_upload_payment_evidence(auth.uid(),v_parts[2]::uuid,v_parts[3]::uuid,v_parts[4]::uuid);
end $$;

create or replace function finance_private.storage_expense_evidence_access(p_bucket text,p_name text)
returns boolean language plpgsql stable security definer set search_path=pg_catalog,storage,finance_private as $$
declare v_parts text[]:=storage.foldername(p_name);
begin
  if p_bucket<>'ototr-evidence' or v_parts[1]<>'finance-expenses' or array_length(v_parts,1)<>4
    or v_parts[2]!~'^[0-9a-fA-F-]{36}$' or v_parts[3]!~'^[0-9a-fA-F-]{36}$' or v_parts[4]!~'^[0-9a-fA-F-]{36}$' then return false; end if;
  return finance_private.current_actor_can_upload_expense_evidence(auth.uid(),v_parts[2]::uuid,v_parts[3]::uuid,v_parts[4]::uuid);
end $$;

revoke all on function finance_private.storage_dispute_evidence_access(text,text,boolean) from public,anon;
revoke all on function finance_private.storage_payment_evidence_access(text,text) from public,anon;
revoke all on function finance_private.storage_expense_evidence_access(text,text) from public,anon;
grant execute on function finance_private.storage_dispute_evidence_access(text,text,boolean) to authenticated,service_role;
grant execute on function finance_private.storage_payment_evidence_access(text,text) to authenticated,service_role;
grant execute on function finance_private.storage_expense_evidence_access(text,text) to authenticated,service_role;

drop policy if exists finance_dispute_evidence_object_insert on storage.objects;
create policy finance_dispute_evidence_object_insert on storage.objects for insert to authenticated
with check (finance_private.storage_dispute_evidence_access(bucket_id,name,true));
drop policy if exists finance_dispute_evidence_object_select on storage.objects;
create policy finance_dispute_evidence_object_select on storage.objects for select to authenticated
using (finance_private.storage_dispute_evidence_access(bucket_id,name,false));

drop policy if exists finance_payment_evidence_object_insert on storage.objects;
create policy finance_payment_evidence_object_insert on storage.objects for insert to authenticated
with check (finance_private.storage_payment_evidence_access(bucket_id,name));
drop policy if exists finance_payment_evidence_object_select on storage.objects;
create policy finance_payment_evidence_object_select on storage.objects for select to authenticated
using (finance_private.storage_payment_evidence_access(bucket_id,name));

drop policy if exists finance_expense_evidence_object_insert on storage.objects;
create policy finance_expense_evidence_object_insert on storage.objects for insert to authenticated
with check (finance_private.storage_expense_evidence_access(bucket_id,name));
drop policy if exists finance_expense_evidence_object_select on storage.objects;
create policy finance_expense_evidence_object_select on storage.objects for select to authenticated
using (finance_private.storage_expense_evidence_access(bucket_id,name));
