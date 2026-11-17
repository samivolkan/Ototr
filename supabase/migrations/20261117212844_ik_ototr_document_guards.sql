create policy no_direct_access on ik_ototr_private.members for all to authenticated using(false) with check(false);
create policy no_direct_access on ik_ototr_private.events for all to authenticated using(false) with check(false);
create function ik_ototr_private.validate_document() returns trigger
language plpgsql security invoker set search_path='' as $$
declare k text; ids jsonb;
begin
 if new.document#>'{settings,branches}' is distinct from jsonb_build_array(new.unit)
 or jsonb_array_length(new.document->'employees') not between 1 and 5000
 then raise exception 'IK_INVALID_DOCUMENT';end if;
 foreach k in array array['requests','events','assets','trainings','documents','shifts','timesheets','payrolls','assessments','goals','competencies','compensations','candidates','workflows','customFields','reportTemplates','audit','notifications','policies','approvalSteps'] loop
  if jsonb_typeof(new.document->k) is distinct from 'array' then raise exception 'IK_INVALID_DOCUMENT';end if;
 end loop;
 select jsonb_agg(e->'id') into ids from jsonb_array_elements(new.document->'employees') e;
 if exists(select 1 from jsonb_array_elements(new.document->'employees') e
 where e->>'branch' is distinct from new.unit or coalesce(e->>'name','')=''
 or coalesce(e->>'id','')!~'^[-a-zA-Z0-9_]+$'
 or (coalesce(e->>'managerId','')<>'' and not ids @> jsonb_build_array(e->>'managerId')))
 or (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(new.document->'employees') e)
 then raise exception 'IK_INVALID_EMPLOYEES';end if;
 -- All employee references, including nested payroll, review and finance-control rows.
 if exists(select 1 from jsonb_path_query(new.document,'$.**.employeeId') x(v)
 where v<>'""'::jsonb and v<>'null'::jsonb and not ids @> jsonb_build_array(v))
 then raise exception 'IK_INVALID_EMPLOYEE_REFERENCE';end if;
 return new;
end; $$;
revoke all on function ik_ototr_private.validate_document() from public,anon,authenticated;
create trigger ik_ototr_document_guard before insert or update of document on public.ik_ototr_units
for each row execute function ik_ototr_private.validate_document();
