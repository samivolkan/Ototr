import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261105260000_franchise_public_intake_queue.sql',import.meta.url),'utf8');
test('queue returns minimal non-PII intake fields through a security invoker wrapper',()=>{
 assert.match(sql,/function app_private\.list_public_franchise_intake_queue/i);assert.match(sql,/function public\.list_public_franchise_intake_queue[\s\S]*security invoker/i);
 for(const field of ['source_application_id','status','reason_code','province','district','submitted_at'])assert.match(sql,new RegExp(field));
 assert.doesNotMatch(sql,/a\.full_name|a\.phone|a\.payload|a\.request_meta/i);
});
test('queue is limited to authenticated Franchise maker roles and open states',()=>{
 assert.match(sql,/v_actor uuid:=auth\.uid\(\)/i);assert.match(sql,/v_role not in \('gm','franchise_director','franchise_specialist'\)/i);
 assert.match(sql,/awaiting_processing_consent.*ready_for_canonicalization.*rejected_missing_privacy/is);
 assert.match(sql,/revoke execute on function public\.list_public_franchise_intake_queue\(\) from public,anon/i);
});
