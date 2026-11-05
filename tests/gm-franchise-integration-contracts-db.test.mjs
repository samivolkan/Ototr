import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql=(await readFile(new URL('../supabase/migrations/20261105110000_franchise_integration_contracts.sql',import.meta.url),'utf8'))+(await readFile(new URL('../supabase/migrations/20261105350000_franchise_accounting_integration_contracts.sql',import.meta.url),'utf8'));
const acceptance=await readFile(new URL('../supabase/ops/franchise-integration-contract-acceptance.sql',import.meta.url),'utf8');

test('database catalog contains all versioned department event contracts',()=>{
  assert.equal((sql.match(/^\('(?:finance|accounting|legal|hr|academy|operations|procurement|it|marketing|quality|ohs|architecture|tasks)'/gm)||[]).length,34);
  assert.match(sql,/contract_version smallint not null/);
  assert.match(sql,/required_payload_keys <@ allowed_payload_keys/);
});

test('database outbox guard rejects contract drift and sensitive payload keys',()=>{
  assert.match(sql,/franchise_integration_outbox_contract_trigger/);
  for(const key of ['tckn','email','iban','vin','token','password']) assert.match(sql,new RegExp(`'${key}'`));
  assert.match(acceptance,/source event mismatch accepted/);
  assert.match(acceptance,/missing required field accepted/);
  assert.match(acceptance,/prohibited pii accepted/);
  assert.match(acceptance,/unknown version accepted/);
});
