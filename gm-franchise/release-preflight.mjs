import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {evaluateIntegrationReadiness} from './integration-readiness.mjs';
import {evaluateRelease,hostedEvidenceHashes,manifestSha256,releaseMetadataOnlySinceCommit,REQUIRED_HOSTED_EVIDENCE} from './release-readiness.mjs';

export function buildReleasePreflight({gates,decision,currentCommit,expectedEvidenceHashes,dirtyPaths=[],releaseMetadataOnly=false,integrationDecision=null,uatAcceptance=null,publicIntakeAcceptance=null}){
  const evaluation=evaluateRelease(gates,decision,{currentCommit,expectedEvidenceHashes,releaseMetadataOnly,integrationDecision,uatAcceptance,publicIntakeAcceptance});
  const evidence=Object.fromEntries(REQUIRED_HOSTED_EVIDENCE.map(key=>[key,{recorded:decision.hostedStagingEvidence?.[key]||null,current:expectedEvidenceHashes[key],matches:decision.hostedStagingEvidence?.[key]===expectedEvidenceHashes[key]}]));
  const blockers=[...evaluation.blockers];if(dirtyPaths.length)blockers.push('worktree_dirty');
  return Object.freeze({
    productionDecision:blockers.length?'NO_GO':'GO',
    currentCommit,worktreeClean:dirtyPaths.length===0,dirtyPaths:Object.freeze([...dirtyPaths]),
    candidateBindings:Object.freeze({releaseCommit:currentCommit,releaseManifestSha256:manifestSha256(gates)}),
    evidence:Object.freeze(evidence),blockers:Object.freeze(blockers)
  });
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const root=fileURLToPath(new URL('..',import.meta.url));
  const [gates,decision,deployment,uatAcceptance,publicIntakeAcceptance,expectedEvidenceHashes]=await Promise.all([
    readFile(new URL('./preproduction-gates.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./preproduction-decision.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./staging-worker-deployment.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./uat-release-acceptance.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./public-intake-release-acceptance.json',import.meta.url),'utf8').then(JSON.parse),hostedEvidenceHashes()
  ]);
  const currentCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const dirtyPaths=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(line=>line.trim()).map(line=>line.slice(3));
  let isAncestor=false,changedPaths=[];if(/^[a-f0-9]{40}$/.test(decision.releaseCommit||'')){try{execFileSync('git',['merge-base','--is-ancestor',decision.releaseCommit,currentCommit],{cwd:root,stdio:'ignore'});isAncestor=true;changedPaths=execFileSync('git',['diff','--name-only',`${decision.releaseCommit}..${currentCommit}`],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);}catch{}}
  const releaseMetadataOnly=releaseMetadataOnlySinceCommit({isAncestor,changedPaths}),integrationDecision=evaluateIntegrationReadiness(deployment).decision,result=buildReleasePreflight({gates,decision,currentCommit,expectedEvidenceHashes,dirtyPaths,releaseMetadataOnly,integrationDecision,uatAcceptance,publicIntakeAcceptance});
  console.log(JSON.stringify(result,null,2));if(result.productionDecision!=='GO')process.exitCode=2;
}
