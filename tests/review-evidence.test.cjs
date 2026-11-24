const test=require('node:test'),assert=require('node:assert/strict');const {captureBaseline,checkEvidence}=require('../scripts/check-review-evidence.cjs');
const file='gm-franchise/franchise-core.mjs',original='line one\nline two\nline three\n',commit='a'.repeat(40);
const report={id:'FRA-R01',finding:'Finding',evidence:[{file,start:2,end:2}],recommendation:'Options',risk:'yetki',effort:'One hour',decision:'None'};
const review={sourceCommit:commit,runs:[{department:'FRA',reports:[report]}]};
const baseline=captureBaseline(review,()=>original);
test('historical review evidence is compared without fabricating a new independent review',()=>{const r=checkEvidence(review,baseline,()=>original.replaceAll('\n','\r\n'),'b'.repeat(40));assert.equal(r.reports[0].status,'unchanged');assert.equal(r.independentReviewPerformed,false);assert.doesNotMatch(JSON.stringify(r),/line one|line two/);});
test('file edits outside excerpt still require review; missing files and report edits fail closed',()=>{
 assert.equal(checkEvidence(review,baseline,()=>original+'changed dependency\n',commit).reports[0].status,'changed');
 assert.equal(checkEvidence(review,baseline,()=>{throw Error('missing');},commit).reports[0].status,'unavailable');
 const copy=structuredClone(review);copy.runs[0].reports[0].finding='Different finding';assert.equal(checkEvidence(copy,baseline,()=>original,commit).reports[0].status,'review_changed');
 assert.throws(()=>checkEvidence({...review,runs:[]},baseline,()=>original,commit));
});
test('baseline capture rejects arbitrary paths and missing evidence lines',()=>{for(const e of [{file:'../.env',start:1,end:1},{file,start:2,end:99}]){const copy=structuredClone(review);copy.runs[0].reports[0].evidence=[e];assert.throws(()=>captureBaseline(copy,()=>original));}});
const {evidenceLabel}=require('../ajan-ofisi/review-feed.js');
test('UI only trusts evidence matching the displayed release and full department inventory',()=>{
 const run={department:'FIN',reports:[{id:'FIN-R01'}]},commit='a'.repeat(40),base='b'.repeat(40);
 const snapshot={version:1,kind:'source_evidence_comparison',checkedAt:'2026-11-24T01:00:00Z',checkedCommit:commit,baselineCommit:base,independentReviewPerformed:false,reports:[{id:'FIN-R01',department:'FIN',status:'unchanged'}]};
 assert.match(evidenceLabel(snapshot,run,commit.slice(0,7),base),/değişmemiş/);
 for(const bad of [null,{...snapshot,checkedCommit:'c'.repeat(40)},{...snapshot,reports:[]},{...snapshot,independentReviewPerformed:true},{...snapshot,reports:[...snapshot.reports,...snapshot.reports]}]) assert.match(evidenceLabel(bad,run,commit,base),/doğrulanamadı/);
 assert.match(evidenceLabel({...snapshot,reports:[{id:'FIN-R01',department:'FIN',status:'changed'}]},run,commit,base),/yeniden inceleme/);
});
