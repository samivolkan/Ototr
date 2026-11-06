import assert from'node:assert/strict';
import test from'node:test';
import{readFile}from'node:fs/promises';
import{LIVE_CONSENT_VERSION,liveFranchisePayload,validateLiveFranchiseConfig}from'../franchise-basvuru/live-franchise-adapter.mjs';

const fragment=await readFile(new URL('../franchise-basvuru/live-form-consent-fragment.html',import.meta.url),'utf8');

test('live form fragment exposes three separate consent decisions',()=>{
  assert.match(fragment,/name="kvkkConsent" required/);
  assert.match(fragment,/name="processingConsent" required/);
  assert.match(fragment,/name="contactConsent"/);
  assert.doesNotMatch(fragment,/name="contactConsent" required/);
});

test('legacy live fields map to the versioned privacy-minimized Edge contract',()=>{
  const payload=liveFranchisePayload({name:'  Sentetik Aday  ',phone:'05000000000',email:'demo@example.test',city:'Bursa',district:'Nilüfer',applicant_type:'Şirket',budget:'4–7 milyon TL',experience:'Otomotiv',company:'Demo Ltd.',location_status:'Mülk mevcut',area:'250–500 m²',timeline:'3–6 ay',message:'Yalnız test.',kvkkConsent:'on',processingConsent:'on',contactConsent:undefined});
  assert.equal(payload.fullName,'Sentetik Aday');
  assert.equal(payload.province,'Bursa');
  assert.equal(payload.consentVersion,LIVE_CONSENT_VERSION);
  assert.equal(payload.kvkkConsent,true);
  assert.equal(payload.processingConsent,true);
  assert.equal(payload.contactConsent,false);
  assert.equal(payload.source,'ototr.com/franchise');
  assert.equal(Object.hasOwn(payload,'tckn'),false);
  assert.equal(Object.hasOwn(payload,'financialDocument'),false);
});

test('live adapter accepts only the exact Supabase Franchise Edge endpoint',()=>{
  const apiUrl='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications';
  assert.equal(validateLiveFranchiseConfig({apiUrl}).apiUrl,apiUrl);
  for(const value of['','http://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications','https://evil.example/franchise-applications','https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/public_franchise_applications'])assert.throws(()=>validateLiveFranchiseConfig({apiUrl:value}));
});
