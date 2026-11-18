import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../assets/google-review-ai.js',import.meta.url),'utf8');
const sessionSource=source.slice(source.indexOf('  async function session()'),source.indexOf('  function supabaseKey()'));
test('reviews prefer the account authenticated by the ERP gate over an older dealer account',async()=>{
 let legacyCalls=0;
 const context=vm.createContext({window:{OTOTRGetERPAuthSession:async()=>({access_token:'current-fixture'}),OTOTRGetLiveSession:async()=>{legacyCalls++;return {access_token:'old-fixture'};}}});
 vm.runInContext(sessionSource,context);
 assert.equal((await context.session()).access_token,'current-fixture');
 assert.equal(legacyCalls,0);
});
test('an expired or failed ERP session never falls through into a different cached account',async()=>{
 for(const current of [async()=>null,async()=>{throw new Error('expired');}]){
  let legacyCalls=0;
  const context=vm.createContext({window:{OTOTRGetERPAuthSession:current,OTOTRGetLiveSession:async()=>{legacyCalls++;return {access_token:'old-fixture'};}}});
  vm.runInContext(sessionSource,context);
  assert.equal(await context.session(),null);assert.equal(legacyCalls,0);
 }
});
