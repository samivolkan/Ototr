import assert from 'node:assert/strict';
import test from 'node:test';
import {buildReleasePreflight} from '../gm-franchise/release-preflight.mjs';
import {REQUIRED_HOSTED_EVIDENCE,sha256} from '../gm-franchise/release-readiness.mjs';

const evidence=Object.fromEntries(REQUIRED_HOSTED_EVIDENCE.map(key=>[key,sha256(key)]));
const signoffRoles=['Franchise Sorumlusu','Finans Sorumlusu','Hukuk/KVKK','İK Sorumlusu','Academy Sorumlusu','Operasyon/Kalite/İSG','Tedarik/Mimari/Pazarlama','ERP/Bilgi Güvenliği','Genel Müdür'];
const gates={gates:Array.from({length:16},(_,i)=>({id:`G${String(i+1).padStart(2,'0')}`,mandatory:true,status:'PASS',evidence:'proof'}))};
const decision={releaseCommit:'a'.repeat(40),rollbackCommit:'b'.repeat(40),rollbackApproval:{approved:true,identitySha256:sha256('rollback-user'),evidenceSha256:sha256('rollback-proof'),approvedAtUtc:'2026-11-07T19:52:00Z'},releaseManifestSha256:null,hostedStagingEvidence:evidence,changeWindowStartUtc:'2026-11-07T20:00:00Z',changeWindowEndUtc:'2026-11-07T22:00:00Z',productionDataUsed:false,signoffs:signoffRoles.map((role,i)=>({role,identitySha256:sha256(`i${i}`),evidenceSha256:sha256(`e${i}`),signedAtUtc:i===8?'2026-11-07T19:50:00Z':'2026-11-07T19:40:00Z'}))};
decision.userApproval={approved:true,identitySha256:sha256('user'),evidenceSha256:sha256('approval'),approvedAtUtc:'2026-11-07T19:55:00Z'};
const uatAcceptance={schemaVersion:1,status:'ACCEPTED',environment:'staging',productionDataUsed:false,releaseCommit:decision.releaseCommit,scenarioCount:16,signoffCount:9,uniqueSignerCount:9,evidenceSha256:'a'.repeat(64),acceptedAtUtc:'2026-11-07T19:00:00Z'};
const publicIntakeAcceptance={schemaVersion:1,status:'ACCEPTED',environment:'production',targetOrigin:'https://ototr.com',productionDataUsed:false,franchiseReleaseCommit:decision.releaseCommit,consentVersion:'FR-KVKK-2026-11',deploymentIdentitySha256:'a'.repeat(64),rollbackReferenceSha256:'b'.repeat(64),evidenceSha256:'c'.repeat(64),acceptedAtUtc:'2026-11-07T19:30:00Z'};

test('release preflight exposes pinned bindings but never hides a dirty worktree',async()=>{
  const {manifestSha256}=await import('../gm-franchise/release-readiness.mjs');decision.releaseManifestSha256=manifestSha256(gates);
  const integrationDecision='READY_FOR_DEPARTMENT_ACCEPTANCE';
  const context={integrationDecision,uatAcceptance,publicIntakeAcceptance,now:new Date('2026-11-07T18:00:00Z')};
  const clean=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],...context});assert.equal(clean.productionDecision,'GO');assert.equal(clean.candidateBindings.releaseCommit,decision.releaseCommit);assert.equal(clean.candidateBindings.rollbackCommit,decision.rollbackCommit);
  const dirty=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:['sunum-32-ekran-v2/Main.dc.html'],...context});assert.equal(dirty.productionDecision,'NO_GO');assert.ok(dirty.blockers.includes('worktree_dirty'));
  const metadataHead=buildReleasePreflight({gates,decision,currentCommit:'b'.repeat(40),expectedEvidenceHashes:evidence,dirtyPaths:[],releaseMetadataOnly:true,...context});assert.equal(metadataHead.productionDecision,'GO');assert.ok(!metadataHead.blockers.includes('release_commit_mismatch'));
  const forged=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],...context,integrationDecision:'NO_GO'});assert.equal(forged.productionDecision,'NO_GO');assert.ok(forged.blockers.includes('gate:G12:derived_readiness_missing'));
  const forgedUat=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],...context,uatAcceptance:{...uatAcceptance,releaseCommit:'b'.repeat(40)}});assert.equal(forgedUat.productionDecision,'NO_GO');assert.ok(forgedUat.blockers.includes('gate:G14:derived_readiness_missing'));
  const forgedIntake=buildReleasePreflight({gates,decision,currentCommit:decision.releaseCommit,expectedEvidenceHashes:evidence,dirtyPaths:[],...context,publicIntakeAcceptance:{...publicIntakeAcceptance,franchiseReleaseCommit:'b'.repeat(40)}});assert.equal(forgedIntake.productionDecision,'NO_GO');assert.ok(forgedIntake.blockers.includes('gate:G16:derived_readiness_missing'));
});
