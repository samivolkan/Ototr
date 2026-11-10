import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const manifest=JSON.parse(await readFile(new URL('../gm-franchise/version.json',import.meta.url),'utf8'));
const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');

test('franchise beta version is explicit, visible and remains production fail-closed',()=>{
  assert.equal(manifest.schemaVersion,1);
  assert.equal(manifest.module,'OTOTR_FRANCHISE');
  assert.equal(manifest.version,'0.9.0-beta.1');
  assert.equal(manifest.displayVersion,'v0.9.0-beta.1');
  assert.equal(manifest.releaseChannel,'beta');
  assert.equal(manifest.versionedAt,'2026-11-11');
  assert.equal(manifest.productionDecision,'NO_GO');
  assert.equal(manifest.requirementsPassed,23);
  assert.equal(manifest.requirementsTotal,28);
  assert.equal(manifest.automatedTests,312);
  assert.match(html,/v0\.9\.0-beta\.1/);
  assert.match(html,/GÜVENLİ PİLOT · CANLI FRANCHISE SİSTEMİ DEĞİLDİR/);
});
