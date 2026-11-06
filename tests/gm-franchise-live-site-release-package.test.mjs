import assert from'node:assert/strict';
import{mkdtemp,readFile,rm,writeFile}from'node:fs/promises';
import{join}from'node:path';
import{tmpdir}from'node:os';
import test from'node:test';
import{buildLiveSiteReleasePackage,verifyLiveSiteReleasePackage}from'../gm-franchise/live-site-release-package.mjs';

const sourceCommit='a'.repeat(40),rollbackCommit='b'.repeat(40);
const source='<!doctype html><html><body><form data-demo-form="franchise"><div class="field full"><button class="btn red">Ön Başvuruyu Gönder →</button></div></form></body></html>';

test('release package is immutable, hash bound and remains NO_GO',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ototr-live-package-')),input=join(root,'source.html'),output=join(root,'release');
 try{await writeFile(input,source);const result=await buildLiveSiteReleasePackage({sourceHtmlPath:input,outputDirectory:output,sourceCommit,rollbackCommit});assert.equal(result.artifactCount,3);assert.equal(result.productionDecision,'NO_GO');assert.match(result.manifestSha256,/^[a-f0-9]{64}$/);const manifest=JSON.parse(await readFile(result.manifestPath,'utf8'));assert.equal(manifest.sourceCommit,sourceCommit);assert.equal(manifest.rollbackCommit,rollbackCommit);assert.equal(manifest.runtimeConfig.deploymentIdentity,sourceCommit);assert.equal(manifest.runtimeConfig.rollbackReference,`revert:${rollbackCommit}`);assert.equal(manifest.productionDataUsed,false);assert.equal(manifest.releaseEffect,'NONE_UNTIL_APPLIED_AND_ACCEPTED');assert.equal(manifest.artifacts.length,3);for(const artifact of manifest.artifacts)assert.match(artifact.sha256,/^[a-f0-9]{64}$/);const candidate=await readFile(join(output,manifest.artifacts[0].file),'utf8');assert.match(candidate,/data-live-franchise-form/);assert.match(candidate,/name="processingConsent"/);assert.match(candidate,new RegExp(sourceCommit));assert.equal((await verifyLiveSiteReleasePackage({packageDirectory:output})).valid,true);await assert.rejects(()=>buildLiveSiteReleasePackage({sourceHtmlPath:input,outputDirectory:output,sourceCommit,rollbackCommit}));}
 finally{await rm(root,{recursive:true,force:true})}
});

test('release package verification rejects artifact drift and manifest escalation',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ototr-live-package-tamper-')),input=join(root,'source.html');
 try{
  await writeFile(input,source);
  for(const mode of['artifact','decision','traversal']){
   const output=join(root,mode);await buildLiveSiteReleasePackage({sourceHtmlPath:input,outputDirectory:output,sourceCommit,rollbackCommit});
   const manifestPath=join(output,'release-manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
   if(mode==='artifact')await writeFile(join(output,manifest.artifacts[1].file),'tampered');
   if(mode==='decision'){manifest.productionDecision='GO';await writeFile(manifestPath,JSON.stringify(manifest));}
   if(mode==='traversal'){manifest.artifacts[1].file='../outside.mjs';await writeFile(manifestPath,JSON.stringify(manifest));}
   await assert.rejects(()=>verifyLiveSiteReleasePackage({packageDirectory:output}));
  }
 }finally{await rm(root,{recursive:true,force:true})}
});

test('release package rejects unsafe identities and source drift before creating output',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ototr-live-package-reject-')),input=join(root,'source.html');
 try{await writeFile(input,source.replace('data-demo-form="franchise"','data-live-franchise-form'));for(const options of[{sourceCommit:'main',rollbackCommit},{sourceCommit,rollbackCommit:sourceCommit},{sourceCommit,rollbackCommit}]){const output=join(root,`release-${Math.random()}`);await assert.rejects(()=>buildLiveSiteReleasePackage({sourceHtmlPath:input,outputDirectory:output,...options}));}}
 finally{await rm(root,{recursive:true,force:true})}
});
