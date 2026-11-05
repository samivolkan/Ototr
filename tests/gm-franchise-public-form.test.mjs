import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const html=await readFile(new URL('../franchise-basvuru/index.html',import.meta.url),'utf8');
const js=await readFile(new URL('../franchise-basvuru/franchise-application.mjs',import.meta.url),'utf8');
test('public form separates privacy processing and optional commercial communication decisions',()=>{
 for(const name of ['kvkkConsent','processingConsent','contactConsent'])assert.match(html,new RegExp(`name="${name}"`));
 assert.match(html,/name="kvkkConsent" required/);assert.match(html,/name="processingConsent" required/);assert.doesNotMatch(html,/name="contactConsent" required/);
 assert.match(js,/kvkkConsent:data\.get\('kvkkConsent'\)==='on'/);assert.match(js,/processingConsent:data\.get\('processingConsent'\)==='on'/);assert.match(js,/contactConsent:data\.get\('contactConsent'\)==='on'/);
});
test('public form collects evaluation profile but never asks for raw identity or financial documents',()=>{
 for(const name of ['fullName','phone','province','district','budget','equityBand','managementExperienceYears','sectorExperience','companyStatus','partnershipStructure','hasLocation'])assert.match(html,new RegExp(`name="${name}"`));
 assert.doesNotMatch(html,/name="(?:tc|tckn|identity|financialDocument|iban|bank)/i);assert.match(html,/yalnız kimliği doğrulanmış özel aday portalında/);
});
test('submission is staging labeled, double-click locked and uses current public API contract',()=>{
 assert.match(html,/GÜVENLİ STAGING ÖNİZLEMESİ/);assert.match(html,/\.hp\{display:none\}/);assert.match(js,/functions\/v1\/public-api\/franchise-applications/);assert.match(js,/button\.disabled=true/);assert.match(js,/FR-KVKK-2026-11/);assert.match(js,/if\(!payload\.kvkkConsent\|\|!payload\.processingConsent\)/);
});
