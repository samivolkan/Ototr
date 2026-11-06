import{createHash}from'node:crypto';
import{copyFile,mkdir,readFile,writeFile}from'node:fs/promises';
import{basename,join,resolve}from'node:path';
import{pathToFileURL}from'node:url';
import{transformLiveFranchiseHtml}from'./live-site-html-transform.mjs';

const SHA=/^[a-f0-9]{40}$/;
const API='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications';
const CONSENT='FR-KVKK-2026-11';
const hash=value=>createHash('sha256').update(value).digest('hex');
const normalized=value=>Buffer.from(value.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

export async function buildLiveSiteReleasePackage({sourceHtmlPath,outputDirectory,sourceCommit,rollbackCommit,assetRoot=new URL('../franchise-basvuru/',import.meta.url)}={}){
 assert(sourceHtmlPath&&outputDirectory,'Kaynak HTML ve ayrı çıktı klasörü zorunludur.');
 assert(SHA.test(sourceCommit||'')&&SHA.test(rollbackCommit||'')&&sourceCommit!==rollbackCommit,'Farklı ve 40 haneli kaynak/rollback commitleri zorunludur.');
 const input=resolve(sourceHtmlPath),output=resolve(outputDirectory);
 assert(input!==output&&!input.startsWith(`${output}\\`)&&!output.startsWith(`${input}\\`),'Kaynak ve çıktı yolları birbirinden ayrı olmalıdır.');
 const consentUrl=new URL('live-form-consent-fragment.html',assetRoot),adapterUrl=new URL('live-franchise-adapter.mjs',assetRoot),bootstrapUrl=new URL('live-franchise-bootstrap.mjs',assetRoot);
 const [sourceHtml,consent,adapter,bootstrap]=await Promise.all([readFile(input,'utf8'),readFile(consentUrl),readFile(adapterUrl),readFile(bootstrapUrl)]);
 const candidate=transformLiveFranchiseHtml(sourceHtml,{sourceCommit,rollbackCommit,consentFragment:consent.toString('utf8')});
 await mkdir(output);
 const candidateName=`franchise.${sourceCommit}.html`,adapterName='live-franchise-adapter.mjs',bootstrapName='live-franchise-bootstrap.mjs';
 await Promise.all([
  writeFile(join(output,candidateName),candidate,{encoding:'utf8',flag:'wx'}),
  copyFile(adapterUrl,join(output,adapterName)),
  copyFile(bootstrapUrl,join(output,bootstrapName))
 ]);
 const manifest={
  schemaVersion:1,targetOrigin:'https://ototr.com',targetPath:'/franchise',applicationBoundary:'cloudflare_fronted_php',productionDataUsed:false,releaseEffect:'NONE_UNTIL_APPLIED_AND_ACCEPTED',productionDecision:'NO_GO',
  source:{file:basename(input),sha256:hash(normalized(Buffer.from(sourceHtml)))},
  sourceCommit,rollbackCommit,
  runtimeConfig:{apiUrl:API,consentVersion:CONSENT,deploymentIdentity:sourceCommit,rollbackReference:`revert:${rollbackCommit}`},
  artifacts:[
   {file:candidateName,target:'HTML:/franchise',sha256:hash(normalized(Buffer.from(candidate)))},
   {file:adapterName,target:'/assets/js/live-franchise-adapter.mjs',sha256:hash(normalized(adapter))},
   {file:bootstrapName,target:'/assets/js/live-franchise-bootstrap.mjs',sha256:hash(normalized(bootstrap))}
  ],
  acceptance:{readOnlyAudit:'node gm-franchise/public-intake-readiness.mjs',syntheticSubmissionRequired:true,testDataCleanupRequired:true,independentExecutorAndAcceptorRequired:true,evidenceBuilder:'gm-franchise/public-intake-acceptance-evidence.mjs'}
 };
 const manifestPath=join(output,'release-manifest.json');
 await writeFile(manifestPath,`${JSON.stringify(manifest,null,2)}\n`,{encoding:'utf8',flag:'wx'});
 return Object.freeze({outputDirectory:output,manifestPath,artifactCount:manifest.artifacts.length,sourceCommit,rollbackCommit,productionDecision:'NO_GO'});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const[,,sourceHtmlPath,outputDirectory,sourceCommit,rollbackCommit]=process.argv;
 buildLiveSiteReleasePackage({sourceHtmlPath,outputDirectory,sourceCommit,rollbackCommit}).then(result=>process.stdout.write(`${JSON.stringify(result,null,2)}\n`)).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1});
}
