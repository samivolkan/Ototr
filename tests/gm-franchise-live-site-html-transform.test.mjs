import assert from'node:assert/strict';import{mkdtemp,readFile,writeFile}from'node:fs/promises';import{tmpdir}from'node:os';import{join}from'node:path';import test from'node:test';
import{runLiveSiteHtmlTransform,transformLiveFranchiseHtml}from'../gm-franchise/live-site-html-transform.mjs';
const consent=await readFile(new URL('../franchise-basvuru/live-form-consent-fragment.html',import.meta.url),'utf8');
const source='<!doctype html><html><body><form class="report-box" data-demo-form="franchise"><div class="form-grid"><input name="name"><div class="field full"><button class="btn red">Ön Başvuruyu Gönder →</button></div></div></form><script src="/assets/js/app.js"></script></body></html>';
const sourceCommit='1'.repeat(40),rollbackCommit='2'.repeat(40);

test('transform creates one isolated live form with three consents and commit-bound config',()=>{
 const output=transformLiveFranchiseHtml(source,{sourceCommit,rollbackCommit,consentFragment:consent});
 assert.doesNotMatch(output,/data-demo-form="franchise"/);assert.equal((output.match(/data-live-franchise-form/g)||[]).length,1);
 for(const name of['kvkkConsent','processingConsent','contactConsent'])assert.equal((output.match(new RegExp(`name="${name}"`,'g'))||[]).length,1);
 for(const name of['equity_band','management_experience_years','partnership_structure','company_status'])assert.equal((output.match(new RegExp(`name="${name}"`,'g'))||[]).length,1);
 assert.match(output,new RegExp(`deploymentIdentity":"${sourceCommit}`));assert.match(output,new RegExp(`rollbackReference":"revert:${rollbackCommit}`));
 assert.match(output,new RegExp(`/assets/js/live-franchise-bootstrap\\.mjs\\?v=${sourceCommit}`));assert.match(output,/type="module"/);
 assert.ok(output.indexOf('processingConsent')<output.indexOf('Ön Başvuruyu Gönder'));
});

test('transform fails closed on source drift, repeat transform and invalid release identities',()=>{
 assert.throws(()=>transformLiveFranchiseHtml(source.replace('data-demo-form="franchise"',''),{sourceCommit,rollbackCommit,consentFragment:consent}),/tam olarak bir kez/);
 assert.throws(()=>transformLiveFranchiseHtml(source.replace('</body>',''),{sourceCommit,rollbackCommit,consentFragment:consent}),/body kapanışı/);
 const once=transformLiveFranchiseHtml(source,{sourceCommit,rollbackCommit,consentFragment:consent});assert.throws(()=>transformLiveFranchiseHtml(once,{sourceCommit,rollbackCommit,consentFragment:consent}),/daha önce dönüştürülmüş/);
 assert.throws(()=>transformLiveFranchiseHtml(source,{sourceCommit:'main',rollbackCommit,consentFragment:consent}),/40 haneli/);
 assert.throws(()=>transformLiveFranchiseHtml(source,{sourceCommit,rollbackCommit:sourceCommit,consentFragment:consent}),/Farklı/);
});

test('CLI helper never overwrites source or an existing output',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'ototr-live-transform-')),inputPath=join(dir,'source.html'),outputPath=join(dir,'release.html');await writeFile(inputPath,source);
 const result=await runLiveSiteHtmlTransform({inputPath,outputPath,sourceCommit,rollbackCommit});assert.equal(result.outputPath,outputPath);assert.match(await readFile(outputPath,'utf8'),/data-live-franchise-form/);assert.equal(await readFile(inputPath,'utf8'),source);
 await assert.rejects(runLiveSiteHtmlTransform({inputPath,outputPath,sourceCommit,rollbackCommit}),/EEXIST/);await assert.rejects(runLiveSiteHtmlTransform({inputPath,outputPath:inputPath,sourceCommit,rollbackCommit}),/üzerine yazılmaz/);
});
