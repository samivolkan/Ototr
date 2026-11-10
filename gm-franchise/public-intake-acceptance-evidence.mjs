import {createHash} from'node:crypto';import{readFile,writeFile}from'node:fs/promises';import{relative,resolve}from'node:path';import{fileURLToPath,pathToFileURL}from'node:url';
const SHA256=/^[a-f0-9]{64}$/,COMMIT=/^[a-f0-9]{40}$/,UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,CONSENT=/^FR-KVKK-[0-9]{4}-[0-9]{2}$/;
const utc=value=>typeof value==='string'&&value.endsWith('Z')&&!Number.isNaN(Date.parse(value)),assert=(condition,message)=>{if(!condition)throw new Error(message)};

export function validatePublicIntakeEvidence(evidence){
  assert(evidence?.schemaVersion===1,'Canlı başvuru kanıt şeması 1 olmalıdır.');
  assert(evidence.environment==='production'&&evidence.targetOrigin==='https://ototr.com','Kanıt doğrulanmış canlı OTOTR kaynağına ait olmalıdır.');
  assert(COMMIT.test(evidence.franchiseReleaseCommit||''),'Kanıt Franchise release commitine bağlı olmalıdır.');
  assert(evidence.productionDataUsed===false&&evidence.syntheticSubmission===true,'Yalnız sentetik ve üretim verisi içermeyen kabul kanıtı kullanılabilir.');
  assert(evidence.privacyNoticeSeparate===true&&evidence.processingConsentSeparate===true&&evidence.commercialConsentSeparate===true,'Üç izin kararı ayrı olmalıdır.');
  assert(CONSENT.test(evidence.consentVersion||''),'Sürümlü KVKK metni zorunludur.');
  assert(evidence.edgeIntakeConfigured===true&&evidence.legacyPhpHandlerAbsent===true,'Edge intake etkin ve eski PHP handler kapalı olmalıdır.');
  assert(evidence.pageProbeStatus===200&&[200,201,202].includes(evidence.submissionProbeStatus),'Canlı sayfa ve sentetik gönderim başarılı olmalıdır.');
  assert(evidence.canonicalStatus==='ready_for_canonicalization','Sentetik gönderim kanonik kuyruğa hazır ulaşmalıdır.');
  assert(evidence.commercialConsent===false,'Ticari ileti izni verilmeden başvuru kabulü kanıtlanmalıdır.');
  for(const key of['deploymentIdentitySha256','rollbackReferenceSha256','requestIdempotencyKeySha256','responseSha256'])assert(SHA256.test(evidence[key]||''),`${key} SHA-256 olmalıdır.`);
  assert(UUID.test(evidence.executedBy||'')&&UUID.test(evidence.acceptedBy||'')&&evidence.executedBy!==evidence.acceptedBy,'Canlı probe yürütücüsü ve kabul eden bağımsız UUID olmalıdır.');
  assert(utc(evidence.performedAtUtc),'Canlı kabul zamanı UTC olmalıdır.');
  assert(evidence.secretsPersisted===false&&evidence.rawPayloadPersisted===false&&evidence.personalDataPersistedInEvidence===false,'Secret, ham payload veya kişisel veri kanıta yazılamaz.');
  return true;
}

export function buildPublicIntakeAcceptanceRecord(evidenceText){const evidence=JSON.parse(evidenceText);validatePublicIntakeEvidence(evidence);return Object.freeze({schemaVersion:1,status:'ACCEPTED',environment:'production',targetOrigin:'https://ototr.com',productionDataUsed:false,franchiseReleaseCommit:evidence.franchiseReleaseCommit,consentVersion:evidence.consentVersion,deploymentIdentitySha256:evidence.deploymentIdentitySha256,rollbackReferenceSha256:evidence.rollbackReferenceSha256,evidenceSha256:createHash('sha256').update(evidenceText).digest('hex'),acceptedAtUtc:evidence.performedAtUtc});}
export function evaluatePublicIntakeAcceptance(record,{releaseCommit=null}={}){const blockers=[];if(record?.schemaVersion!==1||record?.status!=='ACCEPTED'||record?.environment!=='production'||record?.targetOrigin!=='https://ototr.com'||record?.productionDataUsed!==false)blockers.push('public_intake_manifest');if(!COMMIT.test(record?.franchiseReleaseCommit||'')||record.franchiseReleaseCommit!==releaseCommit)blockers.push('public_intake_release_commit');if(!CONSENT.test(record?.consentVersion||''))blockers.push('public_intake_consent_version');for(const key of['deploymentIdentitySha256','rollbackReferenceSha256','evidenceSha256'])if(!SHA256.test(record?.[key]||''))blockers.push(`public_intake:${key}`);if(!utc(record?.acceptedAtUtc))blockers.push('public_intake_accepted_at');return Object.freeze({decision:blockers.length?'NO_GO':'READY_FOR_RELEASE',blockers:Object.freeze(blockers)});}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const args=Object.fromEntries(process.argv.slice(2).reduce((rows,arg,index,all)=>arg.startsWith('--')?[...rows,[arg.slice(2),all[index+1]&&!all[index+1].startsWith('--')?all[index+1]:true]]:rows,[]));assert(typeof args.evidence==='string','Kullanım: --evidence REPO_DISI_JSON [--write]');const root=fileURLToPath(new URL('../',import.meta.url)),evidencePath=resolve(args.evidence);assert(relative(root,evidencePath).startsWith('..'),'Ham canlı başvuru kanıtı public repository dışında tutulmalıdır.');const record=buildPublicIntakeAcceptanceRecord(await readFile(evidencePath,'utf8'));if(args.write===true)await writeFile(new URL('./public-intake-release-acceptance.json',import.meta.url),`${JSON.stringify(record,null,2)}\n`,'utf8');console.log(JSON.stringify({updated:args.write===true,record},null,2));}
