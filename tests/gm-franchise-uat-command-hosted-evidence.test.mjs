import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';

const evidence=JSON.parse(await readFile(new URL('../gm-franchise/uat-command-hosted-evidence.json',import.meta.url),'utf8'));
const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');

test('hosted UAT commands are proven without claiming human UAT completion',()=>{
  assert.equal(evidence.productionDataUsed,false);assert.equal(evidence.result,'PASS');assert.equal(evidence.releaseDecision,'NO_GO');
  for(const value of Object.values(evidence.checks))assert.equal(value,true);
  for(const value of Object.values(evidence.cleanup))assert.equal(value,0);
  assert.match(evidence.note,/16 gerçek UAT ve 9 insan imzası yerine geçmez/);
});

test('release screen uses authenticated hosted UAT workspace and command RPC client',()=>{
  assert.match(html,/data-live-uat-load/);assert.match(html,/franchiseLiveClient\.loadUat/);
  assert.match(html,/franchiseLiveClient\.submitUatResult/);assert.match(html,/franchiseLiveClient\.reviewUatResult/);assert.match(html,/franchiseLiveClient\.signUatRelease/);
  assert.match(html,/Ekrandaki rol seçimi yetki vermez/);
});
