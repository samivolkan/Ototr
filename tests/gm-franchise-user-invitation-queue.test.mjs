import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261106092025_franchise_user_invitation_queue.sql',import.meta.url),'utf8');
const guard=await readFile(new URL('../supabase/migrations/20261106092244_franchise_user_invitation_corporate_email_guard.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('invitation queue is private, RLS protected and password free',()=>{
 assert.match(sql,/create table app_private\.franchise_user_invitation_requests/);assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all .* from public, anon, authenticated/i);assert.doesNotMatch(sql,/\b(password|service_role_key|access_token|refresh_token)\s+(text|varchar|jsonb)/i);
 assert.match(sql,/normalized_email/);assert.match(sql,/franchise_user_invitation_active_email_uq/);assert.match(sql,/where status in \('pending','approved'\)/);
});

test('GM request and independent IT review are database enforced',()=>{
 assert.match(sql,/request_franchise_user_invitation/);assert.match(sql,/franchise_claim_role\(\)\)<>'gm'/);
 assert.match(sql,/review_franchise_user_invitation/);assert.match(sql,/franchise_claim_role\(\)\)<>'it'/);
 assert.match(sql,/requested_by<>\(select auth\.uid\(\)\)/);assert.match(sql,/requested_by<>reviewed_by/);
 assert.match(sql,/status in \('approved','rejected'\)/);assert.match(sql,/ERP rolü Franchise departman sorumluluğu için uygun değildir/);
});

test('invitation list masks email and all RPCs use invoker rights',()=>{
 assert.match(sql,/list_franchise_user_invitation_requests/);assert.match(sql,/\*\*\*@/);assert.equal((sql.match(/security invoker/g)||[]).length,3);
 assert.equal((sql.match(/revoke all on function/g)||[]).length,3);assert.doesNotMatch(sql,/security definer/);
});

test('invitation queue rollback removes functions before private data',()=>{
 const functionDrop=rollback.indexOf('drop function if exists public.review_franchise_user_invitation');
 const tableDrop=rollback.indexOf('drop table if exists app_private.franchise_user_invitation_requests');
 assert.ok(functionDrop>=0&&tableDrop>functionDrop);assert.match(rollback,/drop function if exists public\.request_franchise_user_invitation/);
});

test('department account requests require an OTOTR corporate email',()=>{
 assert.match(guard,/franchise_user_invitation_corporate_email_check/);assert.match(guard,/right\(normalized_email,10\)='@ototr\.com'/);
 assert.match(guard,/right\(v_email,10\)<>'@ototr\.com'/);assert.match(guard,/@ototr\.com kurumsal e-posta zorunludur/);
 assert.match(guard,/security invoker/);assert.doesNotMatch(guard,/security definer/);
});
