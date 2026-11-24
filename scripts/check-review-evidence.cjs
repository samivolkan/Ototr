'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const allowed=new Set(['muhasebe-v2/assets/finance-command-bridge.mjs','muhasebe-v2/assets/finance-ui.js','gm-franchise/franchise-core.mjs','gm-franchise/index.html']);
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
const reportHash=report=>hash(JSON.stringify(canonical(report)));
const normalize=text=>text.replace(/\r\n/g,'\n');
function evidenceHash(text,e){
 if(!allowed.has(e.file)||!Number.isInteger(e.start)||!Number.isInteger(e.end)||e.start<1||e.end<e.start)throw Error('Invalid evidence reference');
 text=normalize(text);const lines=text.split('\n');if(e.end>lines.length)throw Error('Evidence range missing');
 return {file:e.file,start:e.start,end:e.end,fileHash:hash(text),rangeHash:hash(lines.slice(e.start-1,e.end).join('\n'))};
}
function captureBaseline(review,readOriginal){
 if(!/^[a-f0-9]{40}$/.test(review.sourceCommit))throw Error('Historical source commit required');
 return {version:1,sourceCommit:review.sourceCommit,origin:'historical_review_commit',reports:review.runs.flatMap(run=>run.reports.map(report=>({id:report.id,department:run.department,reportHash:reportHash(report),evidence:report.evidence.map(e=>evidenceHash(readOriginal(e.file),e))})))};
}
function checkEvidence(review,baseline,readCurrent,commit,now=new Date().toISOString()){
 if(baseline.version!==1||baseline.sourceCommit!==review.sourceCommit||!Array.isArray(baseline.reports)||!/^[a-f0-9]{40}$/.test(commit))throw Error('Baseline identity invalid');
 const reports=review.runs.flatMap(run=>run.reports.map(r=>({run,report:r}))),ids=reports.map(x=>x.report.id);
 if(new Set(ids).size!==ids.length||baseline.reports.length!==ids.length||new Set(baseline.reports.map(r=>r.id)).size!==ids.length)throw Error('Review inventory changed');
 const results=reports.map(({run,report})=>{
  const old=baseline.reports.find(r=>r.id===report.id);
  if(!old||old.department!==run.department||old.reportHash!==reportHash(report))return {id:report.id,department:run.department,status:'review_changed',evidence:[]};
  const evidence=report.evidence.map((e,i)=>{
   try{const expected=old.evidence[i];if(!expected||expected.file!==e.file||expected.start!==e.start||expected.end!==e.end)throw Error('Baseline range differs');
    const actual=evidenceHash(readCurrent(e.file),e);return {...actual,status:actual.fileHash===expected.fileHash&&actual.rangeHash===expected.rangeHash?'unchanged':'changed'};
   }catch{return {file:e.file,start:e.start,end:e.end,status:'unavailable'};}
  });
  return {id:report.id,department:run.department,status:evidence.some(e=>e.status==='unavailable')?'unavailable':evidence.some(e=>e.status==='changed')?'changed':'unchanged',evidence};
 });
 return {version:1,kind:'source_evidence_comparison',checkedAt:now,checkedCommit:commit,baselineCommit:baseline.sourceCommit,independentReviewPerformed:false,reports:results};
}
if(require.main===module){
 const root=path.resolve(__dirname,'..'),review=JSON.parse(fs.readFileSync(path.join(root,'ajan-ofisi/review-state.json'),'utf8'));
 const baselinePath=path.join(root,'ajan-ofisi/review-evidence-baseline.json');
 if(process.argv.includes('--capture-historical-baseline')){
  if(fs.existsSync(baselinePath))throw Error('Existing baseline cannot be silently replaced');
  const baseline=captureBaseline(review,file=>{if(!allowed.has(file))throw Error('Source not allowed');return cp.execFileSync('git',['show',`${review.sourceCommit}:${file}`],{cwd:root,encoding:'utf8'});});
  fs.writeFileSync(baselinePath,JSON.stringify(baseline,null,2)+'\n');
 }else{
  const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
  const result=checkEvidence(review,baseline,file=>{
   if(!allowed.has(file))throw Error('Source not allowed');const real=fs.realpathSync(path.join(root,file));if(!real.startsWith(root+path.sep))throw Error('Source escapes checkout');return fs.readFileSync(real,'utf8');
  },cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim());
  fs.writeFileSync(path.join(root,'ajan-ofisi/review-evidence-status.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({checkedCommit:result.checkedCommit,results:result.reports.map(r=>({id:r.id,status:r.status}))}));
 }
}
module.exports={captureBaseline,checkEvidence,evidenceHash};
