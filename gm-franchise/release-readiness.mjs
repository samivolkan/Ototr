import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SHA256=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
export const REQUIRED_SIGNOFF_ROLES=Object.freeze(['Franchise Yönetimi','Finans Direktörü','Hukuk/KVKK','İK Yöneticisi','Academy Yöneticisi','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','CEO/Yönetim']);
export const REQUIRED_HOSTED_EVIDENCE=Object.freeze(['migrationSha256','rollbackSha256','identitySha256','storageSha256','adapterSha256','providerSha256','concurrencySha256','uatSha256','publicIntakeSha256']);
export function sha256(value){return createHash('sha256').update(value).digest('hex');}
export function manifestSha256(gates){return sha256(JSON.stringify(gates));}
export function evaluateRelease(gates,decision,{currentCommit=null}={}){
 const blockers=[];
 if(!Array.isArray(gates?.gates)||gates.gates.length<16)blockers.push('gate_catalog_incomplete');
 for(const gate of gates?.gates||[]){if(gate.mandatory!==false&&gate.status!=='PASS')blockers.push(`gate:${gate.id}:${gate.status}`);if(gate.status==='PASS'&&!gate.evidence)blockers.push(`gate:${gate.id}:missing_evidence`);}
 if(!COMMIT.test(decision?.releaseCommit||''))blockers.push('release_commit_missing');
 if(!SHA256.test(decision?.releaseManifestSha256||''))blockers.push('release_manifest_hash_missing');
 else if(decision.releaseManifestSha256!==manifestSha256(gates))blockers.push('release_manifest_hash_mismatch');
 if(currentCommit!==null&&decision?.releaseCommit!==currentCommit)blockers.push('release_commit_mismatch');
 for(const key of REQUIRED_HOSTED_EVIDENCE)if(!SHA256.test(decision?.hostedStagingEvidence?.[key]||''))blockers.push(`hosted:${key}`);
 const start=Date.parse(decision?.changeWindowStartUtc||''),end=Date.parse(decision?.changeWindowEndUtc||'');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)blockers.push('change_window_invalid');
 const signoffs=new Map((decision?.signoffs||[]).map(s=>[s.role,s]));const identities=[];
 for(const role of REQUIRED_SIGNOFF_ROLES){const s=signoffs.get(role);if(!s||!SHA256.test(s.identitySha256||'')||!SHA256.test(s.evidenceSha256||'')||!Number.isFinite(Date.parse(s.signedAtUtc||'')))blockers.push(`signoff:${role}`);else identities.push(s.identitySha256);}
 if(new Set(identities).size!==identities.length)blockers.push('signoff_identity_not_independent');
 if(decision?.productionDataUsed!==false)blockers.push('preproduction_must_use_synthetic_data');
 return Object.freeze({productionDecision:blockers.length?'NO_GO':'GO',decision:blockers.length?'NOT_READY':'READY',blockers:Object.freeze(blockers)});
}
export async function loadAndEvaluate(gatesUrl=new URL('./preproduction-gates.json',import.meta.url),decisionUrl=new URL('./preproduction-decision.json',import.meta.url),context={}){const gates=JSON.parse(await readFile(gatesUrl,'utf8'));const decision=JSON.parse(await readFile(decisionUrl,'utf8'));return evaluateRelease(gates,decision,context);}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){let currentCommit=null;try{currentCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(new URL('..',import.meta.url)),encoding:'utf8'}).trim();}catch{currentCommit='git_commit_unavailable';}const result=await loadAndEvaluate(undefined,undefined,{currentCommit});console.log(JSON.stringify({...result,currentCommit},null,2));if(result.productionDecision!=='GO')process.exitCode=2;}
