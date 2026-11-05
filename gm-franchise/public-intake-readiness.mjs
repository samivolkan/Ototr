import {pathToFileURL} from 'node:url';

const SCRIPT_SRC=/<script[^>]+src=["']([^"']*\/assets\/js\/app\.js[^"']*)["']/i;
const has=(text,pattern)=>pattern.test(text);
export async function auditLivePublicIntake({pageUrl='https://ototr.com/franchise',fetchImpl=fetch}={}){
  const pageResponse=await fetchImpl(pageUrl,{headers:{Accept:'text/html','Cache-Control':'no-cache'},redirect:'follow'}),html=await pageResponse.text();
  const source=html.match(SCRIPT_SRC)?.[1]||'',appUrl=source?new URL(source,pageResponse.url||pageUrl).href:null;
  let appResponse=null,appJs='';if(appUrl){appResponse=await fetchImpl(appUrl,{headers:{Accept:'text/javascript','Cache-Control':'no-cache'},redirect:'follow'});appJs=await appResponse.text()}
  const checks={
    pageAvailable:pageResponse.ok,
    applicationScriptAvailable:Boolean(appResponse?.ok),
    privacyNoticeSeparate:has(html,/name=["'](?:kvkkConsent|privacyAcknowledged)["']/i),
    processingConsentSeparate:has(html,/name=["']processingConsent["']/i),
    commercialConsentSeparate:has(html,/name=["'](?:contactConsent|commercialConsent)["']/i),
    consentVersionPresent:has(html+appJs,/FR-KVKK-[0-9]{4}-[0-9]{2}/i),
    edgeIntakeConfigured:has(appJs,/public-api\/franchise-applications/i),
    legacyPhpHandlerAbsent:!has(appJs,/\/form-handler\.php/i),
    deploymentIdentityPresent:Boolean(pageResponse.headers?.get?.('x-deployment-id')||pageResponse.headers?.get?.('x-vercel-id')||pageResponse.headers?.get?.('x-release-commit')),
    rollbackReferencePresent:has(html+appJs,/rollback[_ -]?(?:id|reference|commit)|x-rollback/i)
  };
  const blockers=Object.entries(checks).filter(([,value])=>!value).map(([key])=>key);
  return Object.freeze({schemaVersion:1,target:new URL(pageResponse.url||pageUrl).origin+new URL(pageResponse.url||pageUrl).pathname,checkedReadOnly:true,formPostAttempted:false,pageBytes:html.length,applicationScriptBytes:appJs.length,checks:Object.freeze(checks),decision:blockers.length?'NO_GO':'READY_FOR_SYNTHETIC_HTTP_ACCEPTANCE',blockers:Object.freeze(blockers)});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const result=await auditLivePublicIntake();console.log(JSON.stringify(result,null,2));if(result.decision!=='READY_FOR_SYNTHETIC_HTTP_ACCEPTANCE')process.exitCode=2;}
