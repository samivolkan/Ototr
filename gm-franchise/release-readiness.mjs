import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SHA256=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
export const REQUIRED_SIGNOFF_ROLES=Object.freeze(['Franchise Yönetimi','Finans Direktörü','Hukuk/KVKK','İK Yöneticisi','Academy Yöneticisi','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','CEO/Yönetim']);
export const REQUIRED_HOSTED_EVIDENCE=Object.freeze(['migrationSha256','rollbackSha256','identitySha256','storageSha256','adapterSha256','providerSha256','concurrencySha256','uatSha256','publicIntakeSha256']);
export const RELEASE_METADATA_PATHS=Object.freeze(['gm-franchise/preproduction-decision.json','gm-franchise/preproduction-gates.json']);
export const HOSTED_EVIDENCE_FILES=Object.freeze({
 migrationSha256:'../docs/franchise/FRANCHISE_HOSTED_STAGING_VERIFICATION_2026-11-05.md',
 rollbackSha256:'../supabase/ops/franchise-rollback.sql',
 identitySha256:'../docs/franchise/FRANCHISE_HOSTED_STAGING_VERIFICATION_2026-11-05.md',
 storageSha256:'../docs/franchise/FRANCHISE_HOSTED_STAGING_VERIFICATION_2026-11-05.md',
 adapterSha256:'./adapter-transport-hosted-evidence.json',
 providerSha256:'../docs/franchise/FRANCHISE_STAGING_WORKER_DEPLOYMENT_2026-11-05.md',
 concurrencySha256:'../docs/franchise/FRANCHISE_HOSTED_CONCURRENCY_RECOVERY_2026-11-05.md',
 uatSha256:'../docs/franchise/FRANCHISE_DEPARTMENT_UAT_SIGNOFF_2026-11-05.md',
 publicIntakeSha256:'../docs/franchise/FRANCHISE_LIVE_PUBLIC_INTAKE_GAP_2026-11-05.md'
});
export function sha256(value){return createHash('sha256').update(value).digest('hex');}
export function manifestSha256(gates){return sha256(JSON.stringify(gates));}
export async function hostedEvidenceHashes(baseUrl=new URL('.',import.meta.url)){const entries=await Promise.all(Object.entries(HOSTED_EVIDENCE_FILES).map(async([key,path])=>[key,sha256(await readFile(new URL(path,baseUrl)))]));return Object.freeze(Object.fromEntries(entries));}
export function releaseMetadataOnlySinceCommit({isAncestor=false,changedPaths=[]}={}){return isAncestor===true&&changedPaths.length>0&&changedPaths.every(path=>RELEASE_METADATA_PATHS.includes(path.replaceAll('\\','/')))}
export function evaluateRelease(gates,decision,{currentCommit=null,expectedEvidenceHashes=null,releaseMetadataOnly=false}={}){
 const blockers=[];
 if(!Array.isArray(gates?.gates)||gates.gates.length<16)blockers.push('gate_catalog_incomplete');
 for(const gate of gates?.gates||[]){if(gate.mandatory!==false&&gate.status!=='PASS')blockers.push(`gate:${gate.id}:${gate.status}`);if(gate.status==='PASS'&&!gate.evidence)blockers.push(`gate:${gate.id}:missing_evidence`);}
 if(!COMMIT.test(decision?.releaseCommit||''))blockers.push('release_commit_missing');
 if(!SHA256.test(decision?.releaseManifestSha256||''))blockers.push('release_manifest_hash_missing');
 else if(decision.releaseManifestSha256!==manifestSha256(gates))blockers.push('release_manifest_hash_mismatch');
 if(currentCommit!==null&&decision?.releaseCommit!==currentCommit&&releaseMetadataOnly!==true)blockers.push('release_commit_mismatch');
 for(const key of REQUIRED_HOSTED_EVIDENCE){const value=decision?.hostedStagingEvidence?.[key]||'';if(!SHA256.test(value))blockers.push(`hosted:${key}`);else if(expectedEvidenceHashes&&value!==expectedEvidenceHashes[key])blockers.push(`hosted:${key}:mismatch`);}
 const start=Date.parse(decision?.changeWindowStartUtc||''),end=Date.parse(decision?.changeWindowEndUtc||'');
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)blockers.push('change_window_invalid');
 const signoffs=new Map((decision?.signoffs||[]).map(s=>[s.role,s]));const identities=[];
 for(const role of REQUIRED_SIGNOFF_ROLES){const s=signoffs.get(role);if(!s||!SHA256.test(s.identitySha256||'')||!SHA256.test(s.evidenceSha256||'')||!Number.isFinite(Date.parse(s.signedAtUtc||'')))blockers.push(`signoff:${role}`);else identities.push(s.identitySha256);}
 if(new Set(identities).size!==identities.length)blockers.push('signoff_identity_not_independent');
 if(decision?.productionDataUsed!==false)blockers.push('preproduction_must_use_synthetic_data');
 return Object.freeze({productionDecision:blockers.length?'NO_GO':'GO',decision:blockers.length?'NOT_READY':'READY',blockers:Object.freeze(blockers)});
}
export async function loadAndEvaluate(gatesUrl=new URL('./preproduction-gates.json',import.meta.url),decisionUrl=new URL('./preproduction-decision.json',import.meta.url),context={}){const gates=JSON.parse(await readFile(gatesUrl,'utf8'));const decision=JSON.parse(await readFile(decisionUrl,'utf8'));const expectedEvidenceHashes=context.expectedEvidenceHashes||await hostedEvidenceHashes(new URL('.',decisionUrl));return evaluateRelease(gates,decision,{...context,expectedEvidenceHashes});}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const root=fileURLToPath(new URL('..',import.meta.url));let currentCommit=null;try{currentCommit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();}catch{currentCommit='git_commit_unavailable';}const decision=JSON.parse(await readFile(new URL('./preproduction-decision.json',import.meta.url),'utf8'));let isAncestor=false,changedPaths=[];if(COMMIT.test(decision.releaseCommit||'')){try{execFileSync('git',['merge-base','--is-ancestor',decision.releaseCommit,currentCommit],{cwd:root,stdio:'ignore'});isAncestor=true;changedPaths=execFileSync('git',['diff','--name-only',`${decision.releaseCommit}..${currentCommit}`],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);}catch{}}const releaseMetadataOnly=releaseMetadataOnlySinceCommit({isAncestor,changedPaths}),expectedEvidenceHashes=await hostedEvidenceHashes();const result=await loadAndEvaluate(undefined,undefined,{currentCommit,expectedEvidenceHashes,releaseMetadataOnly});console.log(JSON.stringify({...result,currentCommit,releaseMetadataOnly,changedPaths},null,2));if(result.productionDecision!=='GO')process.exitCode=2;}
