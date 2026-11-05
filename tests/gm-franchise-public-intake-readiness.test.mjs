import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import {auditLivePublicIntake} from '../gm-franchise/public-intake-readiness.mjs';
const evidence=JSON.parse(await readFile(new URL('../gm-franchise/live-public-intake-readiness-evidence.json',import.meta.url),'utf8'));

const response=(body,{url='https://ototr.com/franchise',headers={},status=200}={})=>({ok:true,status,url,headers:{get:key=>headers[key.toLowerCase()]||null},text:async()=>body});
test('live intake audit is read-only and rejects legacy PHP without three consent fields',async()=>{
  const calls=[],fetchImpl=async(url,options)=>{calls.push({url,options});return calls.length===1?response('<form data-demo-form="franchise"></form><script src="/assets/js/app.js?v=1"></script>'):response("fetch('/form-handler.php',{method:'POST'})",{url:String(url)})};
  const result=await auditLivePublicIntake({fetchImpl,now:()=>new Date('2026-11-06T01:10:00Z')});assert.equal(result.decision,'NO_GO');assert.equal(result.checkedAtUtc,'2026-11-06T01:10:00.000Z');assert.equal(result.productionDataUsed,false);assert.equal(result.httpStatus,200);assert.equal(result.formPostAttempted,false);assert.equal(calls.length,2);assert.ok(calls.every(x=>!x.options.method||x.options.method==='GET'));
  for(const key of ['privacyNoticeSeparate','processingConsentSeparate','commercialConsentSeparate','edgeIntakeConfigured','legacyPhpHandlerAbsent'])assert.ok(result.blockers.includes(key));
});
test('live intake audit requires consent version, Edge intake, deployment identity and rollback reference',async()=>{
  const html='<form><input name="kvkkConsent"><input name="processingConsent"><input name="contactConsent"></form><script src="/assets/js/app.js?v=2"></script>';
  const js="const version='FR-KVKK-2026-11', endpoint='/public-api/franchise-applications', rollback_reference='abc';";
  let n=0;const fetchImpl=async url=>++n===1?response(html,{headers:{'x-release-commit':'a'.repeat(40)}}):response(js,{url:String(url)});
  const result=await auditLivePublicIntake({fetchImpl});assert.equal(result.decision,'READY_FOR_SYNTHETIC_HTTP_ACCEPTANCE');assert.deepEqual(result.blockers,[]);
});
test('current live intake evidence stays read-only and NO_GO',()=>{assert.equal(evidence.checkedReadOnly,true);assert.equal(evidence.formPostAttempted,false);assert.equal(evidence.productionDataUsed,false);assert.equal(evidence.decision,'NO_GO');for(const key of ['processingConsentSeparate','commercialConsentSeparate','edgeIntakeConfigured','deploymentIdentityPresent','rollbackReferencePresent'])assert.equal(evidence.checks[key],false);});
