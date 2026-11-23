import test from 'node:test';
import assert from 'node:assert/strict';
import * as d from '../src/data.js';
import * as a from '../src/analytics.js';
test('105 analytics assertions: periods, aggregation, compatible schemas and defensive edges',()=>{
 let checks=0;const check=x=>{assert.ok(x);checks++};
 for(const days of [7,28,90])for(const branch of ['all','brand','nilufer','inegol','gebze']){const rows=d.filteredRecords(days,branch);const total=d.aggregate(rows);check(new Set(rows.map(r=>r.date)).size===days);check(new Set(d.filteredRecords(days,branch,'all',true).map(r=>r.date)).size===days);check(Math.abs(total.ctr-total.clicks/total.impressions*100)<1e-10);check(d.queryRows(days,branch).reduce((s,r)=>s+r.clicks,0)===total.clicks);check(d.trendData(days,branch).length===days)}
 for(const source of Object.keys(a.schemas))for(const dim of Object.keys(a.schemas[source].dims)){const rows=a.reportRows({source,dim,days:28,branch:'all'});check(rows.length>0);check(rows.every(r=>r.previous&&Object.keys(a.schemas[source].metrics).every(k=>Number.isFinite(r[k])||r[k]===null)))}
 check(d.aggregate([]).position===null);check(d.delta(1,0)===null);check(d.csvText(['A'],[['\t=1+1']]).includes("'\t=1+1"));check(d.csvText(['A'],[[-1]]).includes('"-1"'));check(a.reportRows({source:'gbp',dim:'branch',days:28,branch:'brand'}).length===0);check(!d.eligibleOpportunity({impressions:200,ctr:2,position:21},5,100));check(d.opportunity({impressions:100,clicks:2},5)===3);
 const base={tasks:d.seedTasks,content:d.seedContent,sources:{gsc:true},reports:[],history:[],checks:[],threshold:50};const clean=a.storageState({tasks:[null,{title:12}],reports:[{source:'invalid'}],threshold:999},base);check(clean.tasks.length===0&&clean.reports.length===0&&clean.threshold===50);assert.equal(checks,105);
});
test('grouped query retains multiple pages and branches without picking first',()=>{const rs=[{query:'x',page:'/a',branch:'nilufer',impressions:100,clicks:5,position:3},{query:'x',page:'/b',branch:'gebze',impressions:300,clicks:15,position:7}];const [r]=d.groupRows(rs,'query');assert.equal(r.branch,'mixed');assert.equal(r.pages.length,2);assert.equal(r.ctr,5);assert.equal(r.position,6)});
