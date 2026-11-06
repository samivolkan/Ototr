import assert from'node:assert/strict';
import test from'node:test';
import{readFile}from'node:fs/promises';
import{LIVE_CONSENT_VERSION,liveFranchisePayload,validateLiveFranchiseConfig}from'../franchise-basvuru/live-franchise-adapter.mjs';

const fragment=await readFile(new URL('../franchise-basvuru/live-form-consent-fragment.html',import.meta.url),'utf8');
const bootstrap=await readFile(new URL('../franchise-basvuru/live-franchise-bootstrap.mjs',import.meta.url),'utf8');

test('live form fragment exposes three separate consent decisions',()=>{
  assert.match(fragment,/name="kvkkConsent" required/);
  assert.match(fragment,/name="processingConsent" required/);
  assert.match(fragment,/name="contactConsent"/);
  assert.doesNotMatch(fragment,/name="contactConsent" required/);
});

test('legacy live fields map to the versioned privacy-minimized Edge contract',()=>{
  const deploymentIdentity='a'.repeat(40),rollbackReference=`revert:${'b'.repeat(40)}`;
  const payload=liveFranchisePayload({name:'  Sentetik Aday  ',phone:'05000000000',email:'demo@example.test',city:'Bursa',district:'Nilüfer',applicant_type:'Şirket',budget:'4–7 milyon TL',experience:'Otomotiv',company:'Demo Ltd.',location_status:'Mülk mevcut',area:'250–500 m²',timeline:'3–6 ay',message:'Yalnız test.',kvkkConsent:'on',processingConsent:'on',contactConsent:undefined},{deploymentIdentity,rollbackReference});
  assert.equal(payload.fullName,'Sentetik Aday');
  assert.equal(payload.province,'Bursa');
  assert.equal(payload.consentVersion,LIVE_CONSENT_VERSION);
  assert.equal(payload.kvkkConsent,true);
  assert.equal(payload.processingConsent,true);
  assert.equal(payload.contactConsent,false);
  assert.equal(payload.source,'ototr.com/franchise');
  assert.equal(payload.deploymentIdentity,deploymentIdentity);
  assert.equal(payload.rollbackReference,rollbackReference);
  assert.equal(Object.hasOwn(payload,'tckn'),false);
  assert.equal(Object.hasOwn(payload,'financialDocument'),false);
});

test('live adapter accepts only the exact Supabase Franchise Edge endpoint',()=>{
  const apiUrl='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications',deploymentIdentity='a'.repeat(40),rollbackReference=`revert:${'b'.repeat(40)}`;
  assert.equal(validateLiveFranchiseConfig({apiUrl,deploymentIdentity,rollbackReference}).apiUrl,apiUrl);
  for(const value of['','http://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications','https://evil.example/franchise-applications','https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/public_franchise_applications'])assert.throws(()=>validateLiveFranchiseConfig({apiUrl:value,deploymentIdentity,rollbackReference}));
  assert.throws(()=>validateLiveFranchiseConfig({apiUrl,deploymentIdentity:'main',rollbackReference}));
  assert.throws(()=>validateLiveFranchiseConfig({apiUrl,deploymentIdentity,rollbackReference:'manual'}));
});

test('bootstrap isolates Franchise from the legacy handler and locks duplicate submits',()=>{
  assert.match(bootstrap,/OTOTR_FRANCHISE_EDGE_HANDOFF=true/);
  assert.match(bootstrap,/\[data-live-franchise-form\]/);
  assert.match(bootstrap,/button\.disabled=true/);
  assert.match(bootstrap,/button\.disabled=false/);
  assert.match(bootstrap,/data-franchise-status/);
});
