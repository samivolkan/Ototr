import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105380000_franchise_outbox_scheduler.sql',import.meta.url),'utf8');
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
