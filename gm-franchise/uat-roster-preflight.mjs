import{readFile}from'node:fs/promises';import{relative,resolve}from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
import{UAT_SIGNOFF_REQUIREMENTS}from'./uat-acceptance-evidence.mjs';
const SHA=/^[a-f0-9]{64}$/;const SCENARIOS=Object.freeze(Array.from({length:16},(_,i)=>`UAT-${String(i+1).padStart(2,'0')}`));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const exact=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&new Set(actual).size===expected.length&&expected.every(value=>actual.includes(value));

export function validateUatRoster(roster){
 assert(roster?.schemaVersion===1,'UAT roster şeması 1 olmalıdır.');assert(roster.environment==='staging'&&roster.productionDataUsed===false,'Roster yalnız sentetik staging için hazırlanabilir.');
 assert(/^[a-zA-Z0-9._-]{3,100}$/.test(roster.releaseCandidate||''),'Release adayı geçersiz.');assert(Array.isArray(roster.scenarios)&&roster.scenarios.length===16,'Tam 16 senaryo ataması zorunludur.');assert(Array.isArray(roster.signoffs)&&roster.signoffs.length===9,'Tam dokuz imzacı ataması zorunludur.');
 assert(exact(roster.scenarios.map(x=>x.scenarioCode),SCENARIOS),'Senaryo atama kataloğu eksik veya mükerrerdir.');
 const byScenario=new Map();for(const item of roster.scenarios){assert(SHA.test(item.executorRefSha256||'')&&SHA.test(item.checkerRefSha256||''),'Yürütücü ve kontrolör için SHA-256 aktör referansı zorunludur.');assert(item.executorRefSha256!==item.checkerRefSha256,`${item.scenarioCode} yürütücü ve kontrolörü bağımsız olmalıdır.`);byScenario.set(item.scenarioCode,item)}
 const roles=Object.keys(UAT_SIGNOFF_REQUIREMENTS);assert(exact(roster.signoffs.map(x=>x.signoffRole),roles),'İmza rol kataloğu eksik veya mükerrerdir.');
 for(const item of roster.signoffs)assert(SHA.test(item.signerRefSha256||''),'İmzacı için SHA-256 aktör referansı zorunludur.');assert(new Set(roster.signoffs.map(x=>x.signerRefSha256)).size===9,'Dokuz imza dokuz farklı sorumlu kişiye atanmalıdır.');
 for(const item of roster.signoffs)for(const code of UAT_SIGNOFF_REQUIREMENTS[item.signoffRole])assert(byScenario.get(code).executorRefSha256!==item.signerRefSha256,`${item.signoffRole}, imzalayacağı ${code} senaryosunu yürütemez.`);
 return Object.freeze({ready:true,releaseCandidate:roster.releaseCandidate,scenarioCount:16,signoffCount:9,uniqueSignerCount:9,productionDataUsed:false,rawActorReferencesReturned:false});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const index=process.argv.indexOf('--roster');assert(index>1&&process.argv[index+1],'Kullanım: node gm-franchise/uat-roster-preflight.mjs --roster REPO_DISI_JSON');const root=fileURLToPath(new URL('../',import.meta.url)),path=resolve(process.argv[index+1]);assert(relative(root,path).startsWith('..'),'Kimlik referanslı UAT roster dosyası public repository dışında tutulmalıdır.');console.log(JSON.stringify(validateUatRoster(JSON.parse(await readFile(path,'utf8'))),null,2));
}
