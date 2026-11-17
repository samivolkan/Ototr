alter table public.ik2_workspaces drop constraint ik2_workspaces_document_check;
alter table public.ik2_workspaces add constraint ik2_workspaces_document_check check (
 jsonb_typeof(document) = 'object'
 and (document->>'mode') is not distinct from 'synthetic-demo'
 and coalesce(jsonb_typeof(document->'employees') = 'array',false)
 and octet_length(document::text) <= 5000000
);
-- Explicit deny documents the intentional closed membership registry.
create policy ik2_members_no_client_access on ik2_private.members
for all to authenticated using(false) with check(false);
