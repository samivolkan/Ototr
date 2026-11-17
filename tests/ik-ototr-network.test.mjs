import test from 'node:test';
import assert from 'node:assert/strict';
import {HrStore,seed} from '../ik-ototr/network-store.mjs';
import {catalogData,reportCatalog} from '../ik-ototr/report-catalog.mjs';
test('network seed has three employees in each dealership and three at headquarters, with valid related records',()=>{
 const s=seed();assert.equal(s.employees.length,12);for(const unit of ['Genel Merkez','Nilüfer','Gebze','İnegöl'])assert.equal(s.employees.filter(e=>e.branch===unit).length,3);
 for(const e of s.employees){for(const k of ['birth','email','phone','identity','title','department','managerId'])if(e.id!=='e1'||k!=='managerId')assert.ok(e[k]);for(const k of ['address','school','education','bloodGroup','emergencyName','emergencyPhone','bank','iban'])assert.ok(e.personal[k]);assert.ok(e.email.endsWith('@example.invalid'));}
 for(const key of ['requests','assets','trainings','documents','shifts','timesheets','payrolls','assessments','goals','competencies','compensations','candidates','workflows','customFields','reportTemplates','events','notifications','clockEntries','paymentAdjustments'])assert.ok(s[key].length,key);
 new HrStore(s);assert.equal(s.settings.shiftsEnabled,false);assert.equal(s.payrolls[0].rows.length,12);
});
test('branch view scopes people, requests, reports and nested payroll/performance rows without deleting global records',()=>{
 const store=new HrStore();store.setScope('Nilüfer');const ids=new Set(['e4','e5','e6']);assert.deepEqual(store.readable('employees').map(e=>e.id),[...ids]);
 for(const key of ['requests','assets','documents','trainings','timesheets','clockEntries','goals','notifications'])assert.ok(store.readable(key).every(r=>ids.has(r.employeeId)),key);
 assert.equal(store.readable('payrolls')[0].rows.length,3);assert.equal(store.readable('assessments').length,1);assert.equal(store.readable('candidates').length,1);assert.equal(store.readable('events').length,1);
 assert.equal(store.allowedRoute('employee','e8'),false);assert.equal(store.allowedRoute('employee','e5'),true);
 for(const [id] of reportCatalog)assert.ok(Array.isArray(catalogData(store,id).rows),id);
 assert.equal(catalogData(store,'employees').rows.length,3);assert.equal(catalogData(store,'salary').rows.length,3);
 store.setScope('');assert.equal(store.readable('employees').length,12);assert.equal(store.readable('payrolls')[0].rows.length,12);assert.throws(()=>store.setScope('Unknown'));
});
test('branch edits retain one shared demo document and scope does not widen employee role',()=>{
 const store=new HrStore();store.setScope('Nilüfer');store.saveEmployee({...store.employee('e5'),phone:'DEMO-UPDATED'},'e5');store.setScope('');assert.equal(store.employee('e5').phone,'DEMO-UPDATED');assert.equal(store.state.employees.length,12);
 store.setSession('e5','employee');store.setScope('Gebze');assert.equal(store.readable('employees').length,0);assert.equal(store.allowedRoute('employee','e8'),false);
 const restored=new HrStore(store.state);assert.equal(restored.employee('e5').phone,'DEMO-UPDATED');const wrong=structuredClone(store.state);delete wrong.demoScenario;assert.throws(()=>restored.restore(wrong));assert.equal(restored.state.employees.length,12);
});

test('branch manager form retains the existing headquarters manager option',()=>{const s=new HrStore();s.setScope('Nilüfer');assert.ok(s.managerOptions(s.employee('e4')).some(([id])=>id==='e1'));assert.ok(!s.managerOptions(s.employee('e5')).some(([id])=>id==='e8'));});
