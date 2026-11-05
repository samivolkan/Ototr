import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {FRANCHISE_INTEGRATIONS} from './integration-adapters.mjs';

const SHA256=/^[a-f0-9]{64}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const PROVIDER_CHANNELS=Object.freeze(['email','sms','whatsapp','esign']);
function hasAcceptanceEvidence(record){
  const acceptedAt=new Date(record?.acceptedAtUtc||'');
  return record?.configured===true&&Number.isInteger(record?.probeStatus)&&record.probeStatus>=200&&record.probeStatus<300&&SHA256.test(record?.evidenceSha256||'')&&UUID.test(record?.executedBy||'')&&UUID.test(record?.acceptedBy||'')&&record.executedBy!==record.acceptedBy&&!Number.isNaN(acceptedAt.getTime());
}
export function evaluateIntegrationReadiness(deployment){
  const functions=new Map((deployment?.functions||[]).map(item=>[item.slug,item])),sources=Object.keys(FRANCHISE_INTEGRATIONS),blockers=[];
  for(const slug of ['franchise-outbox-worker','franchise-provider-worker']){const fn=functions.get(slug);if(!fn||fn.status!=='ACTIVE'||fn.verifyJwt!==true||!SHA256.test(fn.bundleSha256||'')||fn.unauthenticatedProbeStatus!==401||fn.authenticatedInvalidSecretProbeStatus!==401)blockers.push(`worker:${slug}`)}
  if(sources.length!==13||!sources.includes('accounting')||deployment?.syntheticTransportAcceptance?.sourceCount!==13)blockers.push('department_source_catalog');
  if(deployment?.accountingContractDeployed!==true)blockers.push('accounting_contract');
  for(const source of sources)if(!hasAcceptanceEvidence(deployment?.departmentEndpointAcceptance?.[source]))blockers.push(`department_endpoint:${source}`);
  for(const channel of PROVIDER_CHANNELS)if(!hasAcceptanceEvidence(deployment?.providerAcceptance?.[channel]))blockers.push(`provider:${channel}`);
  for(const scheduler of ['outbox','provider']){
    const state=deployment?.schedulers?.[scheduler];
    if(state?.installed!==true)blockers.push(`scheduled_dispatch_installation:${scheduler}`);
    else if(state?.configured!==true)blockers.push(`scheduled_dispatch_activation:${scheduler}`);
  }
  return Object.freeze({decision:blockers.length?'NO_GO':'READY_FOR_DEPARTMENT_ACCEPTANCE',departmentSources:Object.freeze(sources),providerChannels:PROVIDER_CHANNELS,blockers:Object.freeze(blockers)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const deployment=JSON.parse(await readFile(new URL('./staging-worker-deployment.json',import.meta.url),'utf8')),result=evaluateIntegrationReadiness(deployment);console.log(JSON.stringify(result,null,2));if(result.decision!=='READY_FOR_DEPARTMENT_ACCEPTANCE')process.exitCode=2;}
