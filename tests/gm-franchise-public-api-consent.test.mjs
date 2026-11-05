import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=await readFile(new URL('../supabase/functions/public-api/index.ts',import.meta.url),'utf8');

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
