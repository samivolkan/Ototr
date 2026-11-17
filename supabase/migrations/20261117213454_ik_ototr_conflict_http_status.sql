-- Return a non-retryable application conflict over PostgREST.
create or replace function ik_ototr_private.save(target text, expected bigint, value jsonb)
returns bigint language plpgsql security definer set search_path='' as $$
declare next_revision bigint;
begin
 if not ik_ototr_private.allowed(target,true) then raise exception 'IK_FORBIDDEN' using errcode='42501'; end if;
 if value is null or value->>'mode' is distinct from 'synthetic-demo'
 or value->>'demoScenario' is distinct from 'ototr-network-v1'
 or jsonb_typeof(value->'employees') is distinct from 'array'
 or value#>'{settings,branches}' is distinct from jsonb_build_array(target)
 then raise exception 'IK_INVALID_DOCUMENT'; end if;
 if exists(select 1 from jsonb_array_elements(value->'employees') e where e->>'branch' is distinct from target)
 then raise exception 'IK_CROSS_UNIT'; end if;
 update public.ik_ototr_units set document=value, revision=revision+1,updated_at=now(),updated_by=auth.uid()
 where unit=target and revision=expected returning revision into next_revision;
 if next_revision is null then raise exception 'IK_CONFLICT' using errcode='PT409'; end if;
 insert into ik_ototr_private.events(unit,revision,actor) values(target,next_revision,auth.uid());
 return next_revision;
end; $$;
