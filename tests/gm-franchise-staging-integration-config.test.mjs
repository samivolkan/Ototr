import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
import{parseEnvText,validateStagingIntegrationConfig}from'../gm-franchise/staging-integration-config.mjs';
const example=parseEnvText(await readFile(new URL('../supabase/functions/.env.franchise.example',import.meta.url),'utf8'));

test('checked-in template covers every department and provider without claiming staging readiness',()=>{
 const template=validateStagingIntegrationConfig(example,{allowTemplate:true});assert.equal(template.valid,true);assert.equal(template.departmentCount,13);assert.equal(template.providerCount,4);
 const staging=validateStagingIntegrationConfig(example);assert.equal(staging.valid,false);assert.ok(staging.errors.some(x=>x.endsWith(':placeholder_host')));assert.ok(staging.errors.some(x=>x.endsWith(':unsafe')));
 for(const code of['finance','accounting','legal','hr','academy','operations','procurement','it','marketing','quality','ohs','architecture','tasks','email','sms','whatsapp','esign'])assert.ok(template.targets.some(x=>x.code===code));
});

test('real-shaped staging config requires HTTPS allowlists, strong distinct secrets and all 17 targets',()=>{
 const env=structuredClone(example);env.FRANCHISE_ADAPTER_ALLOWED_HOSTS='erp.staging.ototr.internal';env.FRANCHISE_PROVIDER_ALLOWED_HOSTS='notify.staging.ototr.internal';env.FRANCHISE_WORKER_SECRET='a'.repeat(48);env.FRANCHISE_PROVIDER_WORKER_SECRET='b'.repeat(48);
 for(const[key,value]of Object.entries(env)){if(key.endsWith('_ADAPTER_URL'))env[key]=`https://erp.staging.ototr.internal/${key.toLowerCase()}`;if(key.endsWith('_PROVIDER_URL'))env[key]=`https://notify.staging.ototr.internal/${key.toLowerCase()}`;if(key.endsWith('_TOKEN'))env[key]=`tok_${key.toLowerCase()}_${'x'.repeat(32)}`}
 const result=validateStagingIntegrationConfig(env);assert.equal(result.valid,true);assert.deepEqual(result.errors,[]);assert.equal(result.targets.length,17);
 env.FRANCHISE_ACCOUNTING_ADAPTER_URL='http://erp.staging.ototr.internal/accounting';env.FRANCHISE_PROVIDER_WORKER_SECRET=env.FRANCHISE_WORKER_SECRET;const invalid=validateStagingIntegrationConfig(env);assert.equal(invalid.valid,false);assert.ok(invalid.errors.includes('FRANCHISE_ACCOUNTING_ADAPTER_URL:https_required'));assert.ok(invalid.errors.includes('worker_secrets:must_differ'));
});

test('parser rejects duplicate keys and validator never returns secret values',()=>{
 assert.throws(()=>parseEnvText('A=1\nA=2'),/Tekrarlanan/);const result=validateStagingIntegrationConfig(example);const serialized=JSON.stringify(result);assert.doesNotMatch(serialized,/replace-me|replace-with-a-long-random-secret/);
});
