import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
import{processInvitationBatch,safeErrorCode}from'../supabase/functions/franchise-user-invitation-worker/handler.mjs';
const migration=await readFile(new URL('../supabase/migrations/20261106093023_franchise_user_invitation_provisioning_worker.sql',import.meta.url),'utf8');
const worker=await readFile(new URL('../supabase/functions/franchise-user-invitation-worker/index.ts',import.meta.url),'utf8');
const emailGuard=await readFile(new URL('../supabase/migrations/20261106093537_franchise_user_invitation_provisioning_email_guard.sql',import.meta.url),'utf8');
const rollback=await readFile(new URL('../supabase/ops/franchise-rollback.sql',import.meta.url),'utf8');

test('approved invitation worker uses bounded leases, retries and service-role-only RPCs',()=>{
 assert.match(migration,/status='approved'.*status='provisioning'/s);assert.match(migration,/for update skip locked/i);assert.match(migration,/attempt_count<5/i);assert.match(migration,/interval '10 minutes'/i);
 assert.match(migration,/revoke all on function public\.claim_franchise_user_invitation_requests\(integer\) from public,anon,authenticated/i);assert.match(migration,/grant execute .* to service_role/i);
 assert.doesNotMatch(migration,/grant execute on function public\.claim_franchise_user_invitation_requests\(integer\) to authenticated/i);
});

test('successful provisioning verifies Auth email and atomically links the HQ ERP directory',()=>{
 assert.match(migration,/security definer/);assert.match(migration,/v_auth_email<>v_request\.normalized_email/i);assert.match(migration,/branch_id is not null/i);
 assert.match(migration,/insert into public\.app_users/i);assert.match(migration,/status='provisioned'/i);assert.match(migration,/provisioned_auth_user_id=p_auth_user_id/i);
 assert.match(migration,/p_error_code='auth_cleanup_failed'.*'failed'/s);
});

test('Edge worker is disabled by default and never accepts or creates passwords',()=>{
 assert.match(worker,/FRANCHISE_INVITATION_DELIVERY_ENABLED.*!=='true'/);assert.match(worker,/x-franchise-invitation-worker-secret/);assert.match(worker,/inviteUserByEmail/);assert.match(worker,/FRANCHISE_INVITATION_REDIRECT_URL/);
 assert.doesNotMatch(worker,/createUser|password\s*:/i);assert.doesNotMatch(worker,/console\.(?:log|error).*email/i);
});

test('batch provisions an approved invitation without returning personal data',async()=>{
 const calls=[],request={request_id:'req-1',lease_token:'lease-1',normalized_email:'finance@ototr.com',display_name:'Finans Sorumlusu',erp_role:'FINANCE'};
 const result=await processInvitationBatch([request],{invite:async value=>{calls.push(['invite',value]);return'11111111-1111-4111-8111-111111111111'},cleanup:async()=>assert.fail('cleanup must not run'),finish:async value=>calls.push(['finish',value])});
 assert.deepEqual(result,[{requestId:'req-1',ok:true}]);assert.equal(calls[1][1].success,true);assert.doesNotMatch(JSON.stringify(result),/finance@ototr\.com|Finans Sorumlusu/);
});

test('ERP link failure removes the invited Auth identity and records a safe retry code',async()=>{
 const calls=[],request={request_id:'req-2',lease_token:'lease-2',normalized_email:'legal@ototr.com',display_name:'Hukuk Sorumlusu',erp_role:'LEGAL'};
 let finishes=0;const result=await processInvitationBatch([request],{invite:async()=> '22222222-2222-4222-8222-222222222222',cleanup:async id=>calls.push(['cleanup',id]),finish:async value=>{finishes++;calls.push(['finish',value]);if(finishes===1)throw new Error('db link failed')}});
 assert.deepEqual(result,[{requestId:'req-2',ok:false,errorCode:'erp_link_failed'}]);assert.equal(calls[1][0],'cleanup');assert.equal(calls[2][1].authUserId,null);assert.equal(calls[2][1].errorCode,'erp_link_failed');
});

test('worker errors are allowlisted and rollback removes worker functions first',()=>{
 assert.equal(safeErrorCode('raw database detail'),'unexpected_worker_error');assert.match(rollback,/drop function if exists public\.finish_franchise_user_invitation[\s\S]*drop table if exists app_private\.franchise_user_invitation_requests/i);
});

test('email uniqueness survives provisioning and existing ERP accounts cannot be reinvited',()=>{
 assert.match(emailGuard,/where status in \('pending','approved','provisioning'\)/i);assert.match(emailGuard,/from public\.app_users[\s\S]*lower\(trim\(app_user\.email\)\)=v_email[\s\S]*app_user\.is_active/i);
 assert.match(emailGuard,/raise exception 'Bu kurumsal e-posta zaten aktif ERP hesabına bağlıdır'/);
});
