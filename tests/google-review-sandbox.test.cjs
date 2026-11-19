const {test}=require('node:test');
const assert=require('node:assert/strict');
const {create,step,classify,collection,progress,overdue,runAll}=require('../assets/google-review-sandbox.js');
const {registryName}=require('../assets/google-review-live-views.js');

test('all 22 visible training scenarios pass without network access',()=>{
 const results=runAll();assert.equal(results.length,22);assert.deepEqual(results.filter(r=>!r.passed),[]);
});
test('risk rules override positive stars and Turkish legal wording',()=>{
 for(const stars of [1,2,3])assert.equal(classify(stars,'İyi').automatic,false);
 for(const stars of [4,5])assert.equal(classify(stars,'Memnunum').automatic,true);
 for(const text of ['AVUKAT','HUKUK','Tazminat','kişisel veri','Ciddi teknik problem','Kötü hizmet'])assert.equal(classify(5,text).automatic,false);
 for(const stars of [0,6,1.5,NaN,'5'])assert.throws(()=>classify(stars,''));
});
test('legal release needs legal role, then a different approval action before sending',()=>{
 const original=create({stars:5,text:'Dava'});
 assert.throws(()=>step(original,'approve',{role:'admin'}));
 assert.throws(()=>step(original,'release',{role:'admin'}));
 const released=step(original,'release',{role:'legal'});
 assert.throws(()=>step(released,'send'));
 const sent=step(step(released,'approve',{role:'admin'}),'send',{now:Date.now()+1000});
 assert.equal(sent.status,'sent');assert.equal(original.status,'legal');assert.ok(sent.replyAt);
});
test('publication retry is idempotent and edit invalidates prior approval',()=>{
 let s=step(create({stars:2}),'approve',{role:'admin'});
 const failed=step(s,'send',{failure:true});assert.equal(failed.replyAt,null);
 s=step(failed,'send');assert.deepEqual(step(s,'send'),s);
 const changed=step(s,'edit',{text:'Yeni örnek yanıt'});assert.equal(changed.approved,false);assert.throws(()=>step(changed,'send'));
 assert.throws(()=>step({...s,demo:false},'send'));
});
test('collection eligibility never depends on rating, and blocks incomplete, opted out, duplicate requests',()=>{
 for(const patch of [{completed:false},{optOut:true},{consent:false},{duplicate:true},{cooldown:true},{provider:false}])assert.notEqual(collection({completed:true,consent:true,provider:true,...patch}),'demo_queued');
 for(const stars of [1,2,3,4,5])assert.equal(collection({completed:true,consent:true,provider:true,stars}),'demo_queued');
});
test('goal and SLA boundaries include overachievement without inventing dates',()=>{
 assert.equal(progress(25,205),12.2);assert.equal(progress(45,30),150);assert.throws(()=>progress(25,0));
 const s=create({},1);assert.equal(overdue(s,24*3600000+1),false);assert.equal(overdue(s,25*3600000),true);
 assert.equal(overdue(step(s,'send',{now:100}),25*3600000),false);
});
test('custom branch names round trip unchanged, builtin legacy labels are normalized',()=>{
 assert.equal(registryName({id:'branch-custom-example',name:'Örnek Kurulum Şubesi',city:'Bursa'}),'Örnek Kurulum Şubesi');
 assert.equal(registryName({id:'branch-custom-example',name:'Bursa Güney Şubesi',city:'Bursa'}),'Bursa Güney Şubesi');
 assert.equal(registryName({id:'branch-google-nilufer',name:'OTOTR Oto Ekspertiz Bursa Nilüfer Şubesi',city:'Bursa'}),'Nilüfer');
});
