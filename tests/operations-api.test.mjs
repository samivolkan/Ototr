import test from'node:test';import assert from'node:assert/strict';import{readOperationalSource}from'../ajan-ofisi/operations-api.mjs';
test('work health API requires session, sends no selector or personal payload, propagates rejection',async()=>{
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;let calls=0;
 try{globalThis.window={};globalThis.fetch=async()=>{calls++;throw Error('Unexpected fetch');};
 await assert.rejects(readOperationalSource('work'),/oturumu/);await assert.rejects(readOperationalSource('write_task'),/Tanımsız/);assert.equal(calls,0);
 globalThis.window.OTOTRGetERPAuthSession=async()=>({access_token:'synthetic-token'});
 globalThis.fetch=async(url,opts)=>{calls++;assert.match(url,/\/rpc\/office_work_health_summary$/);assert.equal(opts.body,'{}');assert.equal(opts.headers.Authorization,'Bearer synthetic-token');return{ok:true,json:async()=>({source:'isler24'})};};
 assert.deepEqual(await readOperationalSource('work'),{source:'isler24'});assert.equal(calls,1);
 globalThis.fetch=async()=>({ok:false});await assert.rejects(readOperationalSource('work'),/kapsamı doğrulanamadı/);
 }finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
