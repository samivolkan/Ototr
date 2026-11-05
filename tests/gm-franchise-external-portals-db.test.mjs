import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql=await readFile(new URL('../supabase/migrations/20261105120000_franchise_external_portals.sql',import.meta.url),'utf8');
const acceptance=await readFile(new URL('../supabase/ops/franchise-external-portal-acceptance.sql',import.meta.url),'utf8');

test('external portal assignments are persona scoped and RLS protected',()=>{
  for(const persona of ['applicant','dealer','inspector','supplier']) assert.match(sql,new RegExp(`'${persona}'`));
  assert.match(sql,/user_id=\(select auth\.uid\(\)\) and persona=public\.franchise_claim_role\(\)/);
  assert.match(sql,/security_invoker=true/);
  assert.match(sql,/Portal atama kapsamı değiştirilemez/);
});

test('external portal actions use constrained RPC and privacy-safe references',()=>{
  assert.match(sql,/complete_franchise_portal_item/);
  assert.match(sql,/Portal işi yalnız atanmış kullanıcı tarafından tamamlanabilir/);
  assert.match(sql,/Güvenli işlem referansı zorunludur/);
  assert.match(sql,/franchise_jsonb_has_prohibited_integration_key/);
  assert.match(sql,/Portal işi persona ile uyumsuz/);
  assert.match(sql,/close_franchise_portal_assignment/);
  for(const proof of ['applicant_sees_only_own_assignment','dealer_sees_assigned_branch','inspector_cannot_read_internal_case','supplier_cannot_read_documents']) assert.match(acceptance,new RegExp(proof));
});
