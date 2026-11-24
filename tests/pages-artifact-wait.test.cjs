const test = require('node:test');const assert = require('node:assert/strict');
const {waitForPagesArtifact} = require('../scripts/wait-pages-artifact.cjs');
const artifact={id:42,name:'pages-test',size:100};
test('deployment waits for two stable artifact-service observations',async()=>{
 let reads=0,sleeps=0;
 const result=await waitForPagesArtifact({artifactName:artifact.name,sleep:async()=>{sleeps++;},listArtifacts:async()=>({artifacts:++reads<2?[]:[artifact]})});
 assert.equal(result.id,42);assert.equal(reads,3);assert.equal(sleeps,2);
});
test('transient lookup failure resets stability; missing and duplicate artifacts fail closed',async()=>{
 let reads=0;
 const result=await waitForPagesArtifact({artifactName:artifact.name,sleep:async()=>{},listArtifacts:async()=>{reads++;if(reads===2)throw Error('temporary');return {artifacts:[artifact]};}});
 assert.equal(result.id,42);assert.equal(reads,4);
 await assert.rejects(waitForPagesArtifact({artifactName:artifact.name,sleep:async()=>{},attempts:2,listArtifacts:async()=>({artifacts:[]})}),/not consistently/);
 await assert.rejects(waitForPagesArtifact({artifactName:artifact.name,sleep:async()=>{},listArtifacts:async()=>({artifacts:[artifact,{...artifact,id:43}]})}),/Multiple/);
});
