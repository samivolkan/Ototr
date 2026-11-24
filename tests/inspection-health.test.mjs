import test from'node:test';import assert from'node:assert/strict';import{inspectionHealth}from'../ajan-ofisi/inspection-health.mjs';
test('inspection display rejects stale or impossible counts and never promotes delivery status to proof',()=>{
 const s={source:'inspection_health',scope:'current_user_branch',delivery_verified:false,status:'ok',observed_at:new Date().toISOString(),counts:{cases:1,intake_gates_unconfirmed:0,tasks:1,tasks_not_completed:1,tasks_without_owner:1,current_locked_report:0,report_version_unconfirmed:1,delivery_status_unverified:1}};
 assert.match(inspectionHealth(s).rows.at(-1),/kanıtı doğrulanmadı/);
 for(const v of [{...s,delivery_verified:true},{...s,observed_at:'2020-01-01'},{...s,counts:{...s.counts,current_locked_report:1}},{...s,counts:{...s.counts,tasks_without_owner:2}}])assert.throws(()=>inspectionHealth(v));
 assert.match(inspectionHealth({...s,status:'branch_required',counts:null}).message,/sıfır iş sonucu değildir/);
});
