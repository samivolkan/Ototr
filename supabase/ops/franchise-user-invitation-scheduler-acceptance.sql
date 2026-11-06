-- HOSTED STAGING ONLY. Proves rollback ordering without persisting destructive changes.
begin;

do $$
declare v_job_id bigint;
begin
  select jobid into v_job_id
  from cron.job
  where jobname='franchise-user-invitation-dispatch';

  if v_job_id is null then
    raise exception 'Invitation scheduler cron missing before rollback drill';
  end if;
  perform cron.unschedule(v_job_id);
end;
$$;

drop function app_private.dispatch_franchise_user_invitation();
drop table app_private.franchise_user_invitation_schedule_config;

do $$
begin
  if exists(select 1 from cron.job where jobname='franchise-user-invitation-dispatch') then
    raise exception 'Invitation scheduler cron survived rollback drill';
  end if;
  if to_regprocedure('app_private.dispatch_franchise_user_invitation()') is not null then
    raise exception 'Invitation scheduler dispatcher survived rollback drill';
  end if;
  if to_regclass('app_private.franchise_user_invitation_schedule_config') is not null then
    raise exception 'Invitation scheduler config survived rollback drill';
  end if;
end;
$$;

rollback;

-- Run after rollback in the same script: every object must be restored and delivery must remain disabled.
select
  to_regclass('app_private.franchise_user_invitation_schedule_config') is not null as config_restored,
  to_regprocedure('app_private.dispatch_franchise_user_invitation()') is not null as dispatcher_restored,
  config.enabled=false as delivery_disabled,
  config.worker_url is null as worker_url_absent,
  config.invoke_jwt_secret_id is null as invoke_jwt_absent,
  config.worker_secret_id is null as worker_secret_absent,
  (select count(*)=1 from cron.job where jobname='franchise-user-invitation-dispatch') as cron_restored,
  (select count(*)=0 from app_private.franchise_user_invitation_requests) as invitation_queue_empty,
  app_private.dispatch_franchise_user_invitation() is null as disabled_noop
from app_private.franchise_user_invitation_schedule_config config
where config.singleton=true;
