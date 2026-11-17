import test from 'node:test';
import assert from 'node:assert/strict';
import {seed} from '../ik-ototr/demo-seed.mjs';
import {unitDocument,combineUnits} from '../ik-ototr/unit-data.mjs';
import {HrStore} from '../ik-ototr/network-store.mjs';
import {UnitSync} from '../ik-ototr/unit-sync.mjs';
const source=seed(),rows=source.settings.branches.map(unit=>({unit,revision:1,document:unitDocument(source,unit)}));
test('each unit contains only its employees and remains a valid editable model',()=>{
 for(const r of rows){const store=new HrStore(r.document,{actor:r.document.employees[0].id});assert.equal(store.state.employees.length,3);for(const e of source.employees.filter(e=>e.branch!==r.unit))assert.ok(!JSON.stringify(r.document).includes(e.email));store.saveEmployee({...store.state.employees[1],phone:'DEMO-TEST'},store.state.employees[1].id);store.validate();}
 const store=new HrStore(combineUnits(rows));assert.equal(store.state.employees.length,12);assert.equal(store.state.payrolls[0].rows.length,12);
});
function service(){let db=structuredClone(rows);return {read:async()=>structuredClone(db),access:async()=>db.map(r=>({unit:r.unit,can_write:true})),save:async(unit,expected,value)=>{const r=db.find(r=>r.unit===unit);if(r.revision!==expected)throw Error('IK_CONFLICT');r.document=structuredClone(value);return ++r.revision;}};}
test('two independent clients synchronize and stale writes cannot overwrite',async()=>{
 const api=service(),a=new UnitSync(api),b=new UnitSync(api);await a.load();await b.load();a.select('Nilüfer');b.select('Nilüfer');const v=a.document();v.employees[0].phone='DEMO-NEW';a.persist(v);await a.flush();const stale=b.document();stale.employees[0].phone='DEMO-STALE';b.persist(stale);await assert.rejects(b.flush(),/CONFLICT/);await b.refresh();assert.equal(b.document().employees[0].phone,'DEMO-NEW');
});
test('open form retains original revision and gets a conflict instead of silently overwriting',async()=>{
 const api=service(),a=new UnitSync(api),b=new UnitSync(api);await a.load();await b.load();a.select('Gebze');b.select('Gebze');const v=a.document();v.employees[0].phone='DEMO-A';a.persist(v);await a.flush();await b.refresh(false);assert.equal(b.rows.find(r=>r.unit==='Gebze').revision,1);b.persist(b.document());await assert.rejects(b.flush(),/CONFLICT/);
});
test('aggregate, read-only, offline and pending saves are blocked',async()=>{
 const api=service(),a=new UnitSync(api);await a.load();assert.throws(()=>a.persist(a.document()),/birim seçin/);a.select('Nilüfer');a.access.forEach(r=>r.can_write=false);assert.throws(()=>a.persist(a.document()),/görüntüleyebilir/);a.access.forEach(r=>r.can_write=true);a.persist(a.document());assert.throws(()=>a.persist(a.document()),/tamamlanıyor/);await a.flush();a.online=false;assert.throws(()=>a.persist(a.document()),/bağlantısı/);
});
test('revocation is fail closed and branch cannot select another unit',async()=>{
 const api=service();api.read=async()=>[structuredClone(rows[1])];const a=new UnitSync(api);await a.load();assert.throws(()=>a.select('Gebze'),/yetkisi/);api.read=async()=>[];await assert.rejects(a.load(),/erişiminiz/);
});
