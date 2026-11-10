import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {relative,resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const SHA256=/^[a-f0-9]{64}$/;
const COMMIT=/^[a-f0-9]{40}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SCENARIOS=Object.freeze(Array.from({length:16},(_,index)=>`UAT-${String(index+1).padStart(2,'0')}`));
export const UAT_SIGNOFF_REQUIREMENTS=Object.freeze({
  'Franchise Sorumlusu':['UAT-01','UAT-02','UAT-03','UAT-15'],
  'Finans Sorumlusu':['UAT-05','UAT-13'],
  'Hukuk/KVKK':['UAT-01','UAT-04','UAT-11','UAT-14'],
  'İK Sorumlusu':['UAT-07'],
  'Academy Sorumlusu':['UAT-08'],
  'Operasyon/Kalite/İSG':['UAT-06','UAT-12','UAT-14','UAT-15'],
  'Tedarik/Mimari/Pazarlama':['UAT-06','UAT-15'],
  'ERP/Bilgi Güvenliği':['UAT-09','UAT-10','UAT-11','UAT-16'],
  'Genel Müdür':SCENARIOS
});
const utc=value=>typeof value==='string'&&value.endsWith('Z')&&!Number.isNaN(Date.parse(value));
const exact=(actual,expected)=>Array.isArray(actual)&&actual.length===expected.length&&expected.every(value=>actual.includes(value));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

export function validateUatEvidence(evidence){
  assert(evidence?.schemaVersion===1,'UAT kanıt şeması 1 olmalıdır.');
  assert(evidence.environment==='staging'&&evidence.productionDataUsed===false,'Yalnız sentetik staging UAT kanıtı kabul edilir.');
  assert(COMMIT.test(evidence.releaseCommit||''),'UAT kanıtı 40 karakterli release commitine bağlı olmalıdır.');
  assert(Array.isArray(evidence.scenarios)&&evidence.scenarios.length===16,'Tam 16 UAT senaryosu zorunludur.');
  assert(Array.isArray(evidence.signoffs)&&evidence.signoffs.length===9,'Tam dokuz UAT imzası zorunludur.');
  const scenarioCodes=evidence.scenarios.map(item=>item.scenarioCode);
  assert(exact(scenarioCodes,SCENARIOS)&&new Set(scenarioCodes).size===16,'UAT senaryo kataloğu eksik veya mükerrerdir.');
  const byScenario=new Map();
  for(const item of evidence.scenarios){
    assert(item.status==='approved'&&SHA256.test(item.evidenceSha256||''),'Her UAT senaryosu onaylı ve SHA-256 kanıtlı olmalıdır.');
    assert(UUID.test(item.executorId||'')&&UUID.test(item.checkerId||'')&&item.executorId!==item.checkerId,'UAT yürütücü ve kontrolör bağımsız UUID olmalıdır.');
    assert(utc(item.reviewedAtUtc),'UAT inceleme zamanı UTC olmalıdır.');
    byScenario.set(item.scenarioCode,item);
  }
  const roles=evidence.signoffs.map(item=>item.signoffRole),requiredRoles=Object.keys(UAT_SIGNOFF_REQUIREMENTS);
  assert(exact(roles,requiredRoles)&&new Set(roles).size===9,'UAT imza rolleri eksik veya mükerrerdir.');
  assert(new Set(evidence.signoffs.map(item=>item.signerId)).size===9,'Dokuz imza dokuz farklı kullanıcıdan gelmelidir.');
  for(const item of evidence.signoffs){
    assert(item.decision==='approved'&&SHA256.test(item.evidenceSha256||''),'Her UAT imzası onaylı ve SHA-256 kanıtlı olmalıdır.');
    assert(UUID.test(item.signerId||'')&&utc(item.signedAtUtc),'UAT imzacısı UUID ve imza zamanı UTC olmalıdır.');
    for(const code of UAT_SIGNOFF_REQUIREMENTS[item.signoffRole])assert(byScenario.get(code)?.executorId!==item.signerId,`${item.signoffRole} kendi yürüttüğü zorunlu senaryoyu imzalayamaz.`);
  }
  const ceo=evidence.signoffs.find(item=>item.signoffRole==='Genel Müdür'),others=evidence.signoffs.filter(item=>item!==ceo);
  assert(others.every(item=>Date.parse(item.signedAtUtc)<=Date.parse(ceo.signedAtUtc)),'Genel Müdür imzası diğer sekiz imzadan sonra olmalıdır.');
  return true;
}

export function buildUatAcceptanceRecord(evidenceText){
  const evidence=JSON.parse(evidenceText);validateUatEvidence(evidence);
  return Object.freeze({schemaVersion:1,status:'ACCEPTED',environment:'staging',productionDataUsed:false,releaseCommit:evidence.releaseCommit,scenarioCount:16,signoffCount:9,uniqueSignerCount:9,evidenceSha256:createHash('sha256').update(evidenceText).digest('hex'),acceptedAtUtc:evidence.signoffs.find(item=>item.signoffRole==='Genel Müdür').signedAtUtc});
}

export function evaluateUatAcceptance(record,{releaseCommit=null}={}){
  const blockers=[];
  if(record?.schemaVersion!==1||record?.status!=='ACCEPTED'||record?.environment!=='staging'||record?.productionDataUsed!==false)blockers.push('uat_manifest');
  if(!COMMIT.test(record?.releaseCommit||'')||record.releaseCommit!==releaseCommit)blockers.push('uat_release_commit');
  if(record?.scenarioCount!==16||record?.signoffCount!==9||record?.uniqueSignerCount!==9)blockers.push('uat_counts');
  if(!SHA256.test(record?.evidenceSha256||'')||!utc(record?.acceptedAtUtc))blockers.push('uat_evidence');
  return Object.freeze({decision:blockers.length?'NO_GO':'READY_FOR_RELEASE',blockers:Object.freeze(blockers)});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=Object.fromEntries(process.argv.slice(2).reduce((rows,arg,index,all)=>arg.startsWith('--')?[...rows,[arg.slice(2),all[index+1]&&!all[index+1].startsWith('--')?all[index+1]:true]]:rows,[]));
  assert(typeof args.evidence==='string','Kullanım: --evidence REPO_DISI_JSON [--write]');
  const root=fileURLToPath(new URL('../',import.meta.url)),evidencePath=resolve(args.evidence);
  assert(relative(root,evidencePath).startsWith('..'),'Ham UAT kanıtı public repository dışında tutulmalıdır.');
  const record=buildUatAcceptanceRecord(await readFile(evidencePath,'utf8'));
  if(args.write===true)await writeFile(new URL('./uat-release-acceptance.json',import.meta.url),`${JSON.stringify(record,null,2)}\n`,'utf8');
  console.log(JSON.stringify({updated:args.write===true,record},null,2));
}
