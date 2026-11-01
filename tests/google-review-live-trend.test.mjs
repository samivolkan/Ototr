import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../assets/app-core.js',import.meta.url),'utf8');
const begin=source.indexOf('function googleReviewMonthKey(');
const end=source.indexOf('function googleDashboardSnapshot(',begin);
assert.ok(begin>=0&&end>begin);

function harness(){
  const branch={id:'branch-google-nilufer'};
  const reviews=[
    {id:'a',googleReviewId:'a',branchId:branch.id,reviewDate:'2026-06-03T10:00:00Z',rating:5},
    {id:'b',googleReviewId:'b',branchId:branch.id,reviewDate:'2026-06-18T10:00:00Z',rating:4},
    {id:'c',googleReviewId:'c',branchId:branch.id,reviewDate:'2026-10-10T10:00:00Z',rating:3},
    {id:'d',googleReviewId:'d',branchId:branch.id,reviewDate:'2026-11-01T10:00:00Z',rating:4},
    {id:'e',googleReviewId:'e',branchId:branch.id,reviewDate:'2026-11-02T10:00:00Z',rating:5},
    {id:'demo',googleReviewId:'demo',branchId:branch.id,reviewDate:'2026-11-02T10:00:00Z',rating:1,demo:true},
  ];
  const context=vm.createContext({Intl,Date,googleDashboardState:{period:'2026-11'},googleReputationData:{branches:[branch],reviews},googleReviews:()=>reviews});
  vm.runInContext(source.slice(begin,end),context);
  return {branch,reviews,refresh:context.googleRefreshBranchMonthlyTrend,trend:context.googleLiveMonthlyTrend};
}

test('Nilüfer live trend is built from real cached review dates and ratings',()=>{
  const h=harness(),cache=h.refresh(h.branch.id),trend=h.trend(h.branch.id,'2026-11');
  assert.deepEqual(Array.from(trend.months),['2026-06','2026-07','2026-08','2026-09','2026-10','2026-11']);
  assert.deepEqual(Array.from(trend.volume),[2,0,0,0,1,2]);
  assert.deepEqual(Array.from(trend.rating),[4.5,null,null,null,3,4.5]);
  assert.equal(trend.growth,100);
  assert.equal(cache['2026-06'].count,2);
  assert.equal(h.branch.monthlyTrend,cache);
});

test('an updated cached review replaces its month average without another API series',()=>{
  const h=harness();h.refresh(h.branch.id);
  h.reviews.find(review=>review.googleReviewId==='e').rating=1;
  const trend=h.trend(h.branch.id,'2026-11');
  assert.equal(trend.rating.at(-1),4.5,'stored summary remains stable until synchronization refreshes it');
  h.refresh(h.branch.id);
  assert.equal(h.trend(h.branch.id,'2026-11').rating.at(-1),2.5);
});
