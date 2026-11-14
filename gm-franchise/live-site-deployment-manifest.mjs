import{createHash}from'node:crypto';import{readFile}from'node:fs/promises';
const SHA256=/^[a-f0-9]{64}$/;const PLACEHOLDER=/^\$\{(?:SOURCE_COMMIT_40|PREVIOUS_SOURCE_COMMIT_40)\}$/;
const hash=value=>createHash('sha256').update(value).digest('hex');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
export async function validateLiveSiteDeploymentManifest(manifest,{rootUrl=new URL('../',import.meta.url)}={}){
 assert(manifest?.schemaVersion===1,'Deployment manifest sürümü geçersiz.');
 assert(manifest.target?.origin==='https://ototr.com'&&manifest.target?.pagePath==='/franchise','Canlı hedef yalnız ototr.com/franchise olmalıdır.');
 assert(manifest.target?.applicationBoundary==='cloudflare_fronted_php','Canlı PHP deployment sınırı açıkça tanımlanmalıdır.');
 assert(PLACEHOLDER.test(manifest.sourceCommit||'')&&PLACEHOLDER.test(manifest.rollbackCommit||''),'Kaynak ve rollback commit yer tutucuları zorunludur.');
 assert(manifest.runtimeConfig?.apiUrl==='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications','Edge endpoint tam ve sabit olmalıdır.');
 assert(/^FR-KVKK-[0-9]{4}-[0-9]{2}$/.test(manifest.runtimeConfig?.consentVersion||''),'KVKK sürümü geçersiz.');
 assert(manifest.runtimeConfig?.deploymentIdentity==='${SOURCE_COMMIT_40}'&&manifest.runtimeConfig?.rollbackReference==='revert:${PREVIOUS_SOURCE_COMMIT_40}','Runtime commit bağları eksiktir.');
 assert(Array.isArray(manifest.artifacts)&&manifest.artifacts.length===3,'Üç deployment artefaktı zorunludur.');
 for(const artifact of manifest.artifacts){assert(SHA256.test(artifact.sha256||''),`Artefakt özeti geçersiz: ${artifact.source}`);const bytes=await readFile(new URL(artifact.source,rootUrl));const normalized=Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');assert(hash(normalized)===artifact.sha256,`Artefakt özeti eşleşmiyor: ${artifact.source}`)}
 const serialized=JSON.stringify(manifest);assert(!/(Authorization:\s*Bearer\s+\S+|sb_secret_|service_role\s*[:=]|eyJ[a-zA-Z0-9_-]{20,}\.)/i.test(serialized),'Manifest gizli bilgi veya kimlik doğrulama değeri içeremez.');
 assert(manifest.acceptance?.syntheticSubmissionRequired===true&&manifest.acceptance?.productionDataUsed===false&&manifest.acceptance?.testDataCleanupRequired===true,'Sentetik kabul ve temizlik zorunludur.');
 assert(manifest.acceptance?.independentExecutorAndAcceptorRequired===true,'Bağımsız kabul eden zorunludur.');
 assert(manifest.releaseEffect==='NONE_UNTIL_APPLIED_AND_ACCEPTED'&&manifest.productionDecision==='NO_GO','Manifest tek başına release yetkisi veremez.');
 return Object.freeze({valid:true,artifactCount:manifest.artifacts.length,target:`${manifest.target.origin}${manifest.target.pagePath}`,productionDecision:manifest.productionDecision});
}
