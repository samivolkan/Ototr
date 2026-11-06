import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migration = await readFile(
  new URL('../supabase/migrations/20261106084145_franchise_gm_bootstrap_guard.sql', import.meta.url),
  'utf8'
);
const rollback = await readFile(
  new URL('../supabase/ops/franchise-rollback.sql', import.meta.url),
  'utf8'
);

test('GM bootstrap is private, invoker-rights and service-role only', () => {
  assert.match(migration, /function app_private\.bootstrap_franchise_gm\(p_user_id uuid\)/i);
  assert.match(migration, /security invoker/i);
  assert.doesNotMatch(migration, /security definer/i);
  assert.match(migration, /revoke all on function app_private\.bootstrap_franchise_gm\(uuid\) from public,anon,authenticated/i);
  assert.match(migration, /grant execute on function app_private\.bootstrap_franchise_gm\(uuid\) to service_role/i);
  assert.match(rollback, /drop function if exists app_private\.bootstrap_franchise_gm\(uuid\)/i);
});

test('GM bootstrap is one-time, serialized and privacy-minimized', () => {
  assert.match(migration, /pg_advisory_xact_lock/i);
  assert.match(migration, /franchise_role='gm' and s\.is_active/i);
  assert.match(migration, /u\.auth_user_id=p_user_id and u\.is_active/i);
  assert.match(migration, /different active Franchise role|farklı aktif Franchise rolü/i);
  assert.match(migration, /jsonb_build_object\(\s*'role','gm',\s*'active',true,\s*'scopeVersion'/i);
  assert.doesNotMatch(migration, /jsonb_build_object\([^;]*(email|phone|full_name|p_user_id)/is);
});
