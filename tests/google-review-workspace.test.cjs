const {test}=require('node:test');
const assert=require('node:assert/strict');
const {operationalBranches,mapUrl,GROUPS}=require('../assets/google-review-workspace.js');
const {scopedRows,targetSeries}=require('../assets/google-review-alternative.js');
test('operational branch list excludes historical demos, incomplete, paused and test branches',()=>{
 const branches=[
  {id:'branch-google-nilufer'},
  {id:'branch-google-gebze',lifecycle:'live',google_verified_at:'today'},
  {id:'branch-google-inegol',lifecycle:'demo'},
  {id:'branch-custom-example1',lifecycle:'live_candidate'},
  {id:'branch-custom-example2',lifecycle:'live',google_verified_at:'today',onboarding:{test:true}},
  {id:'branch-custom-example3',lifecycle:'live',google_verified_at:'today',active:false},
  {id:'branch-custom-example4',lifecycle:'live',google_verified_at:'today'}
 ];
 assert.deepEqual(operationalBranches(branches).map(b=>b.id),['branch-google-nilufer','branch-custom-example4']);
});
test('map URL accepts only finite in-range coordinates and never injects an arbitrary iframe URL',()=>{
 assert.equal(mapUrl({lat:40.19,lng:29.06}),'https://maps.google.com/maps?q=40.19%2C29.06&z=14&output=embed');
 for(const map of [null,{lat:91,lng:29},{lat:'',lng:29},{lat:40,lng:Infinity},{lat:'javascript:alert(1)',lng:0}])assert.equal(mapUrl(map),null);
});
test('seven primary workspaces retain access to all operational modules',()=>{
 assert.equal(GROUPS.length,7);
 assert.equal(new Set(GROUPS.flatMap(g=>g.views)).size,16);
});
test('future live branches use their own real reviews and dated targets only',()=>{
 const id='branch-custom-example4';
 const rows=[{branch_id:id,demo:false},{branch_id:id,demo:true},{branch_id:'branch-google-nilufer',demo:false}];
 assert.equal(scopedRows(rows,id).length,1);
 assert.deepEqual(targetSeries(['2026-10','2026-11'],[{branch_id:id,month:'2026-11-01',target:60}],id,999),[null,60]);
});
