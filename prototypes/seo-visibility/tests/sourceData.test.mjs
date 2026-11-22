import test from 'node:test';
import assert from 'node:assert/strict';
import {gscCSV,gaCSV,gscTotal} from '../src/sourceData.js';
test('GSC weighted totals preserve separate grains',()=>{const rows=gscCSV('Tarih,Tıklamalar,Gösterimler,TO,Pozisyon\n2026-11-01,1,10,10%,2\n2026-11-02,9,90,10%,10');assert.deepEqual(gscTotal(rows),{clicks:10,impressions:100,ctr:10,position:9.2})});
test('GA4 excludes revenue and preserves key events as event counts',()=>{const r=gaCSV('# comment\nChannel,Sessions,Engaged,Rate,Time,Per,Events,Key,SessionRate,Revenue\nDirect,10,6,0.6,5,2,20,15,0.2,999')[0];assert.equal(r.keyEvents,15);assert.equal(r.engagementRate,60);assert.equal(r.revenue,undefined)});
test('invalid metrics rejected',()=>assert.throws(()=>gscCSV('a,b,c,d,e\nx,NaN,10,5%,2')));
