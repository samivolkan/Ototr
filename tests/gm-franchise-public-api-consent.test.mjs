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
  assert.equal(liveOriginEvidence.functionVersion,12);
  assert.equal(liveOriginEvidence.productionDataUsed,false);
  assert.equal(liveOriginEvidence.formPostAttempted,false);
  assert.equal(liveOriginEvidence.checks.canonicalOriginAllowed,true);
  assert.equal(liveOriginEvidence.checks.wwwOriginAllowed,true);
  assert.equal(liveOriginEvidence.checks.untrustedSubdomainAllowed,false);
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

test('commercial communication remains a separate optional franchise decision',()=>{
  const leadValidator=source.match(/function validateLead[\s\S]*?function validateContact/)?.[0]??'';
  assert.match(leadValidator,/!payload\.kvkk_consent/);
  assert.doesNotMatch(leadValidator,/!payload\.contact_consent/);
  const contactValidator=source.match(/function validateContact[\s\S]*?async function body/)?.[0]??'';
  assert.match(contactValidator,/!payload\.kvkk_consent \|\| !payload\.contact_consent/);
});
