import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {evaluateRelease,hostedEvidenceHashes,manifestSha256,REQUIRED_HOSTED_EVIDENCE} from './release-readiness.mjs';

export function buildReleasePreflight({gates,decision,currentCommit,expectedEvidenceHashes,dirtyPaths=[]}){
  const evaluation=evaluateRelease(gates,decision,{currentCommit,expectedEvidenceHashes});
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
  const [gates,decision,expectedEvidenceHashes]=await Promise.all([
    readFile(new URL('./preproduction-gates.json',import.meta.url),'utf8').then(JSON.parse),
    readFile(new URL('./preproduction-decision.json',import.meta.url),'utf8').then(JSON.parse),hostedEvidenceHashes()
  ]);
  const currentCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  const dirtyPaths=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(line=>line.trim()).map(line=>line.slice(3));
  const result=buildReleasePreflight({gates,decision,currentCommit,expectedEvidenceHashes,dirtyPaths});
  console.log(JSON.stringify(result,null,2));if(result.productionDecision!=='GO')process.exitCode=2;
}
