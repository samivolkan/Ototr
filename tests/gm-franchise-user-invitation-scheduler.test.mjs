import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';

const migration=await readFile(new URL('../supabase/migrations/20261106094839_franchise_user_invitation_scheduler.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');
const acceptance=await readFile(new URL('../supabase/ops/franchise-user-invitation-scheduler-acceptance.sql',import.meta.url),'utf8');

test('invitation scheduler is installed fail-closed with no embedded credentials',()=>{
  assert.match(migration,/enabled boolean not null default false/i);
  assert.match(migration,/worker_url text[\s\S]*invoke_jwt_secret_id uuid[\s\S]*worker_secret_id uuid/i);
  assert.doesNotMatch(migration,/(service_role_key|password|secret_value)\s+text/i);
  assert.match(migration,/franchise-user-invitation-worker\$/);
});

test('scheduler uses two distinct Vault credentials and both request guards',()=>{
  assert.match(migration,/invoke_jwt_secret_id<>worker_secret_id/i);
  assert.equal((migration.match(/from vault\.decrypted_secrets/gi)||[]).length,2);
  assert.match(migration,/'authorization','Bearer '\|\|v_invoke_jwt/i);
  assert.match(migration,/'x-franchise-invitation-worker-secret',v_worker_secret/i);
});

test('private dispatcher is service-role-only and cron invokes only that dispatcher',()=>{
  assert.match(migration,/security definer[\s\S]*set search_path=''/i);
  assert.match(migration,/revoke all on function app_private\.dispatch_franchise_user_invitation\(\) from public,anon,authenticated/i);
  assert.match(migration,/grant execute on function app_private\.dispatch_franchise_user_invitation\(\) to service_role/i);
  assert.match(migration,/cron\.schedule\([\s\S]*'franchise-user-invitation-dispatch'[\s\S]*select app_private\.dispatch_franchise_user_invitation\(\)/i);
});

test('rollback unschedules invitation cron before dropping dispatcher and queue',()=>{
  const unschedule=rollback.indexOf("jobname='franchise-user-invitation-dispatch'");
  const dispatcher=rollback.indexOf('drop function if exists app_private.dispatch_franchise_user_invitation');
  const config=rollback.indexOf('drop table if exists app_private.franchise_user_invitation_schedule_config');
  const queue=rollback.indexOf('drop table if exists app_private.franchise_user_invitation_requests');
  assert.ok(unschedule>=0&&dispatcher>unschedule&&config>dispatcher&&queue>config);
});

test('hosted acceptance drills rollback and proves restored scheduler stays disabled',()=>{
  assert.match(acceptance,/begin;[\s\S]*cron\.unschedule[\s\S]*drop function app_private\.dispatch_franchise_user_invitation[\s\S]*drop table app_private\.franchise_user_invitation_schedule_config[\s\S]*rollback;/i);
  for(const proof of ['config_restored','dispatcher_restored','delivery_disabled','worker_url_absent','invoke_jwt_absent','worker_secret_absent','cron_restored','invitation_queue_empty','disabled_noop'])assert.match(acceptance,new RegExp(proof));
});
