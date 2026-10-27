import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const src=fs.readFileSync(new URL('../assets/google-review-dashboard.js',import.meta.url),'utf8');
const context=vm.createContext({window:{},document:{addEventListener(){}},setTimeout(){},Intl,Date});
vm.runInContext(src,context);
const api=context.window.OTOTRGoogleDashboard;
const branches=[{id:'a',name:'A',synced:true,reviewListComplete:true},{id:'b',name:'B',synced:true,reviewListComplete:true}];
const targets=[{branch_id:'a',month:'2026-10-01',target:10},{branch_id:'b',month:'2026-10-01',target:20}];
const review=(id,branchId,date)=>({id,branchId,reviewDate:date});
test('monthly goals use Istanbul calendar boundaries and deduplicate review IDs',()=>{
 const reviews=[review('1','a','2026-09-30T22:00:00Z'),review('1','a','2026-09-30T22:00:00Z'),review('2','b','2026-10-01T10:00:00Z'),review('3','b','2026-11-01T10:00:00Z'),review('4','b','bad')];
 const data=api.model(branches,reviews,targets,'2026-10',new Date('2026-10-10T12:00:00Z'));
 assert.equal(data.total,2);assert.equal(data.target,30);assert.equal(data.projection,6);assert.equal(data.need,2);assert.equal(data.rows[0].count,1);
});
test('unknown targets remain unknown; partial data suppresses projection',()=>{
 const data=api.model([{...branches[0],reviewListComplete:false}],[],[],'2026-10',new Date('2026-10-10T12:00:00Z'));
 assert.equal(data.target,null);assert.equal(data.projection,null);assert.equal(data.total,0);assert.equal(data.need,null);
 const unavailable=api.model([{...branches[0],synced:false}],[],targets,'2026-10');assert.equal(unavailable.total,null);
});
test('past months have no daily requirement; future month cannot imply progress',()=>{
 const now=new Date('2026-11-03T12:00:00Z');const old=api.model(branches,[],targets,'2026-10',now);
 assert.equal(old.need,null);assert.equal(old.elapsed,31);
 const future=api.model(branches,[],[],'2026-12',now);assert.equal(future.elapsed,0);assert.equal(future.projection,null);
});
test('month series crosses year boundary and leap-year February correctly',()=>{
 assert.deepEqual(Array.from(api.monthsEnding('2026-02',3)),['2025-12','2026-01','2026-02']);
 assert.equal(api.model(branches,[],[],'2024-02').days,29);
});
test('dashboard escapes branch names and shows no invented target history',()=>{
 const html=api.render([{...branches[0],name:'<script>bad</script>'}],[],'a');
 assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));assert.ok(!html.includes('<script>bad'));
 assert.match(html,/Hedef belirlenmedi/);assert.match(html,/Silinmiş yorumlar dahil değildir/);
});
