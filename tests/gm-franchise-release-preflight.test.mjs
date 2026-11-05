import assert from 'node:assert/strict';
import test from 'node:test';
import {buildReleasePreflight} from '../gm-franchise/release-preflight.mjs';
import {REQUIRED_HOSTED_EVIDENCE,sha256} from '../gm-franchise/release-readiness.mjs';

const evidence=Object.fromEntries(REQUIRED_HOSTED_EVIDENCE.map(key=>[key,sha256(key)]));
const signoffRoles=['Franchise Yönetimi','Finans Direktörü','Hukuk/KVKK','İK Yöneticisi','Academy Yöneticisi','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','CEO/Yönetim'];
const gates={gates:Array.from({length:16},(_,i)=>({id:`G${String(i+1).padStart(2,'0')}`,mandatory:true,status:'PASS',evidence:'proof'}))};
const decision={releaseCommit:'a'.repeat(40),releaseManifestSha256:null,hostedStagingEvidence:evidence,changeWindowStartUtc:'2026-11-07T20:00:00Z',changeWindowEndUtc:'2026-11-07T22:00:00Z',productionDataUsed:false,signoffs:signoffRoles.map((role,i)=>({role,identitySha256:sha256(`i${i}`),evidenceSha256:sha256(`e${i}`),signedAtUtc:'2026-11-07T18:00:00Z'}))};

test('release preflight exposes pinned bindings but never hides a dirty worktree',async()=>{
  const {manifestSha256}=await import('../gm-franchise/release-readiness.mjs');decision.releaseManifestSha256=manifestSha256(gates);
  const integrationDecision='READY_FOR_DEPARTMENT_ACCEPTANCE';
  const clean=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],integrationDecision});assert.equal(clean.productionDecision,'GO');assert.equal(clean.candidateBindings.releaseCommit,decision.releaseCommit);
  const dirty=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:['sunum-32-ekran-v2/Main.dc.html'],integrationDecision});assert.equal(dirty.productionDecision,'NO_GO');assert.ok(dirty.blockers.includes('worktree_dirty'));
  const metadataHead=buildReleasePreflight({gates,decision,currentCommit:'b'.repeat(40),expectedEvidenceHashes:evidence,dirtyPaths:[],releaseMetadataOnly:true,integrationDecision});assert.equal(metadataHead.productionDecision,'GO');assert.ok(!metadataHead.blockers.includes('release_commit_mismatch'));
  const forged=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],integrationDecision:'NO_GO'});assert.equal(forged.productionDecision,'NO_GO');assert.ok(forged.blockers.includes('gate:G12:derived_readiness_missing'));
});
