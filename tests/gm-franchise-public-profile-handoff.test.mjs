import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const migration=await readFile(new URL('../supabase/migrations/20261105320000_public_franchise_profile_handoff.sql',import.meta.url),'utf8');
const edge=await readFile(new URL('../supabase/functions/public-api/index.ts',import.meta.url),'utf8');
const form=await readFile(new URL('../franchise-basvuru/franchise-application.mjs',import.meta.url),'utf8');
const ui=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');

test('public evaluation profile is structured and privacy-minimized through intake handoff',()=>{
  for(const field of ['equity_band','management_experience_years','sector_experience','company_status','partnership_structure']){
    assert.match(migration,new RegExp(`add column ${field}`));
    assert.match(migration,new RegExp(`a\\.${field}`));
  }
  assert.doesNotMatch(migration,/a\.full_name|a\.phone|a\.payload|a\.request_meta/i);
  assert.match(migration,/function public\.list_public_franchise_intake_queue[\s\S]*security invoker/i);
});

test('form, Edge API and GM queue preserve safe profile fields without documents',()=>{
  for(const field of ['equityBand','managementExperienceYears','sectorExperience','companyStatus','partnershipStructure'])assert.match(form,new RegExp(field));
  for(const field of ['equity_band','management_experience_years','sector_experience','company_status','partnership_structure'])assert.match(edge,new RegExp(field));
  for(const id of ['live-budget','live-equity','live-experience','live-sector','live-company','live-location','live-partnership'])assert.match(ui,new RegExp(`"${id}":item\\.`));
  assert.doesNotMatch(form,/identityVerificationRef|financialDocumentRef/);
});
