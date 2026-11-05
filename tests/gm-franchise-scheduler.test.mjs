import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105380000_franchise_outbox_scheduler.sql',import.meta.url),'utf8');
const jwtAuth=await readFile(new URL('../supabase/migrations/20261105390000_franchise_scheduler_jwt_auth.sql',import.meta.url),'utf8');
const jwtRegexFix=await readFile(new URL('../supabase/migrations/20261105400000_franchise_scheduler_jwt_regex_fix.sql',import.meta.url),'utf8');
const providerScheduler=await readFile(new URL('../supabase/migrations/20261105410000_franchise_provider_scheduler.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('scheduler is installed disabled and requires explicit HTTPS worker configuration',()=>{
  assert.match(sql,/enabled boolean not null default false/i);
  assert.match(sql,/worker_url ~ '\^https:\/\//i);
  assert.match(sql,/not v_config\.enabled or v_config\.worker_url is null/i);
  assert.match(sql,/return null/i);
});

test('scheduler reads its secret from Vault and never persists it in config',()=>{
  assert.match(sql,/from vault\.decrypted_secrets/i);
  assert.match(sql,/worker_secret_name text not null/i);
  assert.doesNotMatch(sql,/worker_secret\s+text/i);
  assert.match(sql,/x-franchise-worker-secret/i);
});

test('scheduler satisfies gateway JWT and application worker-secret checks separately',()=>{
  assert.match(jwtAuth,/invoke_jwt_secret_name text not null default 'franchise_worker_invoke_jwt'/i);
  assert.match(jwtAuth,/where name=v_config\.invoke_jwt_secret_name/i);
  assert.match(jwtAuth,/'authorization','Bearer '\|\|v_invoke_jwt/i);
  assert.match(jwtAuth,/'x-franchise-worker-secret',v_worker_secret/i);
  assert.match(jwtRegexFix,/v_invoke_jwt !~ '\^\[A-Za-z0-9_-\]\+\[\.\]/i);
  assert.match(jwtRegexFix,/'authorization','Bearer '\|\|v_invoke_jwt/i);
  assert.doesNotMatch(jwtAuth,/service_role_key|supabase_service_role/i);
});

test('cron calls only the private dispatcher and public roles cannot execute it',()=>{
  assert.match(sql,/cron\.schedule[\s\S]+app_private\.dispatch_franchise_outbox/i);
  assert.match(sql,/revoke all on function app_private\.dispatch_franchise_outbox\(\) from public, anon, authenticated/i);
  assert.match(sql,/grant execute on function app_private\.dispatch_franchise_outbox\(\) to service_role/i);
});

test('staging rollback unschedules cron before dropping dispatcher state',()=>{
  const unschedule=rollback.indexOf("jobname='franchise-outbox-dispatch'");
  const dropFunction=rollback.indexOf('drop function if exists app_private.dispatch_franchise_outbox()');
  const dropConfig=rollback.indexOf('drop table if exists app_private.franchise_outbox_schedule_config');
  assert.ok(unschedule>=0&&dropFunction>unschedule&&dropConfig>dropFunction);
});

test('provider queue has an independent fail-closed scheduler',()=>{
  assert.match(providerScheduler,/enabled boolean not null default false/i);
  assert.match(providerScheduler,/franchise-provider-dispatch/i);
  assert.match(providerScheduler,/'authorization','Bearer '\|\|v_invoke_jwt/i);
  assert.match(providerScheduler,/'x-franchise-provider-secret',v_provider_secret/i);
  assert.match(providerScheduler,/revoke all on function app_private\.dispatch_franchise_provider\(\) from public, anon, authenticated/i);
  assert.match(rollback,/jobname='franchise-provider-dispatch'/i);
  assert.ok(rollback.indexOf("jobname='franchise-provider-dispatch'")<rollback.indexOf('drop function if exists app_private.dispatch_franchise_provider()'));
});
