import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {FRANCHISE_INTEGRATIONS} from './integration-adapters.mjs';

const SHA256=/^[a-f0-9]{64}$/;
export const PROVIDER_CHANNELS=Object.freeze(['email','sms','whatsapp','esign']);
export function evaluateIntegrationReadiness(deployment){
  const functions=new Map((deployment?.functions||[]).map(item=>[item.slug,item])),sources=Object.keys(FRANCHISE_INTEGRATIONS),blockers=[];
  for(const slug of ['franchise-outbox-worker','franchise-provider-worker']){const fn=functions.get(slug);if(!fn||fn.status!=='ACTIVE'||fn.verifyJwt!==true||!SHA256.test(fn.bundleSha256||'')||fn.unauthenticatedProbeStatus!==401||fn.authenticatedInvalidSecretProbeStatus!==401)blockers.push(`worker:${slug}`)}
  if(sources.length!==13||!sources.includes('accounting')||deployment?.syntheticTransportAcceptance?.sourceCount!==13)blockers.push('department_source_catalog');
  if(deployment?.accountingContractDeployed!==true)blockers.push('accounting_contract');
  if(deployment?.externalEndpointsConfigured!==true)blockers.push('real_department_endpoints');
  if(deployment?.providerSecretsConfigured!==true)for(const channel of PROVIDER_CHANNELS)blockers.push(`provider:${channel}`);
  for(const scheduler of ['outbox','provider']){
    const state=deployment?.schedulers?.[scheduler];
    if(state?.installed!==true)blockers.push(`scheduled_dispatch_installation:${scheduler}`);
    else if(state?.configured!==true)blockers.push(`scheduled_dispatch_activation:${scheduler}`);
  }
  return Object.freeze({decision:blockers.length?'NO_GO':'READY_FOR_DEPARTMENT_ACCEPTANCE',departmentSources:Object.freeze(sources),providerChannels:PROVIDER_CHANNELS,blockers:Object.freeze(blockers)});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const deployment=JSON.parse(await readFile(new URL('./staging-worker-deployment.json',import.meta.url),'utf8')),result=evaluateIntegrationReadiness(deployment);console.log(JSON.stringify(result,null,2));if(result.decision!=='READY_FOR_DEPARTMENT_ACCEPTANCE')process.exitCode=2;}
