import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../supabase/functions/public-api/index.ts',import.meta.url),'utf8');
const liveOriginEvidence=JSON.parse(await readFile(new URL('../gm-franchise/public-api-live-origin-hosted-evidence.json',import.meta.url),'utf8'));

test('public API explicitly allows the canonical live OTOTR origin without a wildcard',()=>{
  assert.match(source,/host === "ototr\.com"/);
  assert.match(source,/host === "www\.ototr\.com"/);
  assert.doesNotMatch(source,/host\.endsWith\("\.ototr\.com"\)/);
});

test('hosted staging evidence proves canonical origins without posting form data',()=>{
  assert.equal(liveOriginEvidence.environment,'staging');
  assert.equal(liveOriginEvidence.functionVersion,14);
  assert.equal(liveOriginEvidence.productionDataUsed,false);
  assert.equal(liveOriginEvidence.formPostAttempted,false);
  assert.equal(liveOriginEvidence.checks.canonicalOriginAllowed,true);
  assert.equal(liveOriginEvidence.checks.wwwOriginAllowed,true);
  assert.equal(liveOriginEvidence.checks.untrustedSubdomainAllowed,false);
  assert.equal(liveOriginEvidence.checks.missingProcessingConsentStatus,400);
  assert.equal(liveOriginEvidence.checks.refusedProcessingConsentStatus,400);
  assert.equal(liveOriginEvidence.checks.rejectedProbeRows,0);
  assert.equal(liveOriginEvidence.checks.missingDeploymentIdentityStatus,400);
  assert.equal(liveOriginEvidence.checks.missingRollbackReferenceStatus,400);
  assert.equal(liveOriginEvidence.checks.invalidDeploymentIdentityStatus,400);
  assert.equal(liveOriginEvidence.checks.deploymentBindingProbeRows,0);
  assert.equal(liveOriginEvidence.productionDecision,'NO_GO');
});

test('staging preview origin is explicitly allowed without wildcard hosts',()=>{
  assert.match(source,/host === "raw\.githack\.com"/);
  assert.doesNotMatch(source,/endsWith\("\.githack\.com"\)/);
});

test('public franchise API maps separate processing consent without breaking legacy clients',()=>{
  assert.match(source,/hasOwnProperty\.call\(payload, "processingConsent"\)/);
  assert.match(source,/processing_consent:[\s\S]*\? cleanBool\(payload\.processingConsent\)[\s\S]*: null/);
});

test('versioned franchise intake rejects missing or refused processing consent server-side',()=>{
  const franchiseHandler=source.match(/async function createFranchise[\s\S]*?async function createComplaint/)?.[0]??'';
  assert.match(franchiseHandler,/\^FR-KVKK-\[0-9\]\{4\}-\[0-9\]\{2\}\$/);
  assert.match(franchiseHandler,/!hasProcessingDecision \|\| !cleanBool\(payload\.processingConsent\)/);
  assert.match(franchiseHandler,/Veri işleme izni zorunludur/);
  assert.doesNotMatch(franchiseHandler,/!cleanBool\(payload\.contactConsent\)/);
});

test('canonical live intake is bound to a release commit and rollback reference',()=>{
  const franchiseHandler=source.match(/async function createFranchise[\s\S]*?async function createComplaint/)?.[0]??'';
  assert.match(franchiseHandler,/common\.source === "ototr\.com\/franchise"/);
  assert.match(franchiseHandler,/\^\[a-f0-9\]\{40\}\$/);
  assert.match(franchiseHandler,/\^revert:\[a-f0-9\]\{40\}\$/);
  assert.match(franchiseHandler,/Sürümlü KVKK metni zorunludur/);
  assert.match(franchiseHandler,/Canlı kaynak commit kimliği zorunludur/);
  assert.match(franchiseHandler,/Rollback referansı zorunludur/);
});

test('live franchise profile codes fail with HTTP 400 before PostgreSQL constraints',()=>{
  const franchiseHandler=source.match(/async function createFranchise[\s\S]*?async function createComplaint/)?.[0]??'';
  for(const field of ['equityBand','sectorExperience','companyStatus','partnershipStructure','hasLocation'])assert.match(source,new RegExp(`${field}: new Set`));
  assert.match(source,/validateLiveFranchiseProfile\(payload\)/);
  assert.match(franchiseHandler,/if \(profileError\) return json\(req, \{ ok: false, error: profileError \}, 400\)/);
  assert.match(source,/Yönetim deneyimi 0-80 arasında tam sayı olmalıdır/);
  assert.match(source,/Franchise profil alanı geçersiz/);
});

test('live franchise persistence minimizes raw payload, metadata and UTM values',()=>{
  const franchiseHandler=source.match(/async function createFranchise[\s\S]*?async function createComplaint/)?.[0]??'';
  assert.match(source,/function minimizedLiveFranchiseCommon/);
  assert.match(source,/\["source", "medium", "campaign", "content", "term"\]/);
  assert.match(source,/payload: \{ schemaVersion: 1, deploymentIdentity, rollbackReference \}/);
  assert.match(source,/request_meta: \{ origin: common\.request_meta\.origin \}/);
  assert.match(franchiseHandler,/const persistedCommon = liveSource/);
  assert.match(franchiseHandler,/\.\.\.persistedCommon/);
  assert.doesNotMatch(source,/payload: \{ schemaVersion: 1, deploymentIdentity, rollbackReference, fullName/);
});

test('commercial communication remains a separate optional franchise decision',()=>{
  const leadValidator=source.match(/function validateLead[\s\S]*?function validateContact/)?.[0]??'';
  assert.match(leadValidator,/!payload\.kvkk_consent/);
  assert.doesNotMatch(leadValidator,/!payload\.contact_consent/);
  const contactValidator=source.match(/function validateContact[\s\S]*?async function body/)?.[0]??'';
  assert.match(contactValidator,/!payload\.kvkk_consent \|\| !payload\.contact_consent/);
});
