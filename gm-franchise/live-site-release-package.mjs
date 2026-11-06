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
const safeFile=value=>typeof value==='string'&&value===basename(value)&&!['.','..'].includes(value);

export async function verifyLiveSiteReleasePackage({packageDirectory}={}){
 assert(packageDirectory,'Paket klasörü zorunludur.');
 const directory=resolve(packageDirectory),manifestPath=join(directory,'release-manifest.json');
 const manifestBytes=await readFile(manifestPath),manifest=JSON.parse(manifestBytes.toString('utf8'));
 assert(manifest.schemaVersion===1&&manifest.targetOrigin==='https://ototr.com'&&manifest.targetPath==='/franchise','Canlı hedef manifesti geçersizdir.');
 assert(manifest.applicationBoundary==='cloudflare_fronted_php'&&manifest.productionDataUsed===false,'Deployment sınırı veya veri sınıfı geçersizdir.');
 assert(manifest.releaseEffect==='NONE_UNTIL_APPLIED_AND_ACCEPTED'&&manifest.productionDecision==='NO_GO','Paket kendi başına yayın yetkisi veremez.');
 assert(SHA.test(manifest.sourceCommit||'')&&SHA.test(manifest.rollbackCommit||'')&&manifest.sourceCommit!==manifest.rollbackCommit,'Kaynak/rollback commit bağları geçersizdir.');
 assert(manifest.runtimeConfig?.apiUrl===API&&manifest.runtimeConfig?.consentVersion===CONSENT,'Runtime endpoint veya izin sürümü geçersizdir.');
 assert(manifest.runtimeConfig?.deploymentIdentity===manifest.sourceCommit&&manifest.runtimeConfig?.rollbackReference===`revert:${manifest.rollbackCommit}`,'Runtime commit bağları geçersizdir.');
 const expectedTargets=['HTML:/franchise','/assets/js/live-franchise-adapter.mjs','/assets/js/live-franchise-bootstrap.mjs'];
 assert(Array.isArray(manifest.artifacts)&&manifest.artifacts.length===3,'Tam üç yayın artefaktı zorunludur.');
 assert(new Set(manifest.artifacts.map(item=>item.file)).size===3,'Artefakt dosyaları benzersiz olmalıdır.');
 const artifacts=[];
 for(const[target,artifact]of expectedTargets.map(target=>[target,manifest.artifacts.find(item=>item.target===target)])){
  assert(artifact&&safeFile(artifact.file)&&/^[a-f0-9]{64}$/.test(artifact.sha256||''),`Artefakt kaydı geçersiz: ${target}`);
  const bytes=await readFile(join(directory,artifact.file));
  assert(hash(normalized(bytes))===artifact.sha256,`Artefakt özeti eşleşmiyor: ${artifact.file}`);
  artifacts.push([target,bytes.toString('utf8')]);
 }
 const candidate=artifacts.find(([target])=>target==='HTML:/franchise')[1];
 for(const marker of['data-live-franchise-form','name="kvkkConsent"','name="processingConsent"','name="contactConsent"','OTOTR_FRANCHISE_PUBLIC_CONFIG'])assert(candidate.includes(marker),`Aday HTML işareti eksik: ${marker}`);
 assert(candidate.includes(manifest.sourceCommit)&&candidate.includes(`revert:${manifest.rollbackCommit}`),'Aday HTML commit bağları manifestle eşleşmiyor.');
 const serialized=JSON.stringify(manifest);
 assert(!/(Authorization:\s*Bearer\s+\S+|sb_secret_|service_role\s*[:=]|eyJ[a-zA-Z0-9_-]{20,}\.)/i.test(serialized),'Paket manifesti gizli bilgi içeremez.');
 assert(manifest.acceptance?.syntheticSubmissionRequired===true&&manifest.acceptance?.testDataCleanupRequired===true&&manifest.acceptance?.independentExecutorAndAcceptorRequired===true,'Bağımsız sentetik kabul kapıları eksiktir.');
 return Object.freeze({valid:true,packageDirectory:directory,manifestSha256:hash(normalized(manifestBytes)),artifactCount:3,sourceCommit:manifest.sourceCommit,rollbackCommit:manifest.rollbackCommit,productionDecision:'NO_GO'});
}

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
 const verification=await verifyLiveSiteReleasePackage({packageDirectory:output});
 return Object.freeze({outputDirectory:output,manifestPath,...verification});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const[,,modeOrSource,outputDirectory,sourceCommit,rollbackCommit]=process.argv;
 const operation=modeOrSource==='--verify'?verifyLiveSiteReleasePackage({packageDirectory:outputDirectory}):buildLiveSiteReleasePackage({sourceHtmlPath:modeOrSource,outputDirectory,sourceCommit,rollbackCommit});
 operation.then(result=>process.stdout.write(`${JSON.stringify(result,null,2)}\n`)).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1});
}
