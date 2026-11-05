import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {FRANCHISE_INTEGRATIONS} from './integration-adapters.mjs';
import {PROVIDER_CHANNELS} from './integration-readiness.mjs';

const SHA256=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROHIBITED_KEYS=/(authorization|token|secret|password|headers?|requestbody|responsebody|payload|fullname|phone|emailaddress|identity|financialdocument)/i;

function assert(condition,message){if(!condition)throw new Error(message)}
function validUtc(value){const date=new Date(value||'');return !Number.isNaN(date.getTime())&&String(value).endsWith('Z')}
function inspectKeys(value,path='evidence'){
  if(!value||typeof value!=='object')return;
  for(const [key,nested] of Object.entries(value)){
    const controlField=key==='secretsPersisted'||key==='rawPayloadPersisted';
    assert(controlField||!PROHIBITED_KEYS.test(key),`${path}.${key} kanıt dosyasında yasaklıdır.`);
    inspectKeys(nested,`${path}.${key}`);
  }
}

export function validateAcceptanceEvidence(evidence,{kind,code}={}){
  assert(evidence&&typeof evidence==='object'&&!Array.isArray(evidence),'Kanıt JSON nesnesi olmalıdır.');
  assert(kind==='department'||kind==='provider','Hedef türü department veya provider olmalıdır.');
  const allowed=kind==='department'?Object.keys(FRANCHISE_INTEGRATIONS):PROVIDER_CHANNELS;
  assert(allowed.includes(code),'Bilinmeyen entegrasyon hedefi.');
  assert(evidence.schemaVersion===1,'Kanıt şema sürümü 1 olmalıdır.');
  assert(evidence.environment==='staging','Yalnız staging kabul kanıtı kaydedilebilir.');
  assert(evidence.targetType===kind&&evidence.targetCode===code,'Kanıt hedefi komut hedefiyle eşleşmelidir.');
  assert(evidence.productionDataUsed===false,'Kabul testinde üretim verisi kullanılamaz.');
  assert(evidence.syntheticProbe===true,'Sentetik probe kanıtı zorunludur.');
  assert(evidence.endpointProtocol==='https:','Kabul endpointi HTTPS olmalıdır.');
  assert(Number.isInteger(evidence.probeStatus)&&evidence.probeStatus>=200&&evidence.probeStatus<300,'Başarılı 2xx probe sonucu zorunludur.');
  assert(SHA256.test(evidence.requestIdempotencyKeySha256||''),'Idempotency anahtarı SHA-256 kanıtı zorunludur.');
  assert(SHA256.test(evidence.responseSha256||''),'Yanıt SHA-256 kanıtı zorunludur.');
  assert(evidence.secretsPersisted===false,'Secret kalıcı kanıta yazılamaz.');
  assert(evidence.rawPayloadPersisted===false,'Ham istek/yanıt kalıcı kanıta yazılamaz.');
  assert(UUID.test(evidence.executedBy||''),'Probe çalıştıran Supabase kullanıcı UUID’si zorunludur.');
  assert(UUID.test(evidence.acceptedBy||''),'Kabul eden Supabase kullanıcı UUID’si zorunludur.');
  assert(evidence.executedBy!==evidence.acceptedBy,'Probe çalıştıran kendi sonucunu kabul edemez.');
  assert(validUtc(evidence.performedAtUtc),'Geçerli UTC probe zamanı zorunludur.');
  inspectKeys(evidence);
  return true;
}

export function buildAcceptanceRecord(evidenceText,{kind,code}={}){
  const evidence=JSON.parse(evidenceText);
  validateAcceptanceEvidence(evidence,{kind,code});
  return Object.freeze({configured:true,probeStatus:evidence.probeStatus,evidenceSha256:createHash('sha256').update(evidenceText).digest('hex'),executedBy:evidence.executedBy,acceptedBy:evidence.acceptedBy,acceptedAtUtc:evidence.performedAtUtc});
}

export function applyAcceptanceRecord(deployment,{kind,code,record}={}){
  const next=structuredClone(deployment),key=kind==='department'?'departmentEndpointAcceptance':'providerAcceptance';
  assert(next?.schemaVersion===2,'Deployment manifest şema sürümü 2 olmalıdır.');
  assert(next?.[key]&&Object.hasOwn(next[key],code),'Deployment manifest hedefi bulunamadı.');
  next[key][code]={...record};
  return next;
}

function parseArgs(argv){const result={write:false};for(let i=0;i<argv.length;i++){const arg=argv[i];if(arg==='--write')result.write=true;else if(arg.startsWith('--'))result[arg.slice(2)]=argv[++i]}return result}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const args=parseArgs(process.argv.slice(2));
  assert(args.kind&&args.code&&args.evidence,'Kullanım: --kind department|provider --code CODE --evidence FILE [--manifest FILE] [--write]');
  const manifestPath=args.manifest||new URL('./staging-worker-deployment.json',import.meta.url);
  const evidenceText=await readFile(args.evidence,'utf8'),deployment=JSON.parse(await readFile(manifestPath,'utf8'));
  const record=buildAcceptanceRecord(evidenceText,{kind:args.kind,code:args.code}),next=applyAcceptanceRecord(deployment,{kind:args.kind,code:args.code,record});
  if(args.write){await writeFile(manifestPath,`${JSON.stringify(next,null,2)}\n`,'utf8');console.log(JSON.stringify({updated:true,kind:args.kind,code:args.code,record},null,2));}
  else console.log(JSON.stringify({updated:false,dryRun:true,kind:args.kind,code:args.code,record},null,2));
}
