import{readFile}from'node:fs/promises';import{pathToFileURL}from'node:url';
import{SOURCE_ENV}from'../supabase/functions/franchise-outbox-worker/handler.mjs';
import{CHANNEL_ENV}from'../supabase/functions/franchise-provider-worker/handler.mjs';

const PLACEHOLDER=/^(?:replace-me|replace-with-|changeme|example|todo)/i;
const parseList=value=>String(value||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
export function parseEnvText(text){
 const env={};for(const raw of String(text||'').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const at=line.indexOf('=');if(at<1)throw new Error('Geçersiz env satırı.');const key=line.slice(0,at).trim(),value=line.slice(at+1).trim();if(Object.hasOwn(env,key))throw new Error(`Tekrarlanan env anahtarı: ${key}`);env[key]=value}return env;
}
export function validateStagingIntegrationConfig(env,{allowTemplate=false}={}){
 if(!env||typeof env!=='object'||Array.isArray(env))throw new Error('Staging env nesnesi zorunludur.');
 const adapterHosts=parseList(env.FRANCHISE_ADAPTER_ALLOWED_HOSTS),providerHosts=parseList(env.FRANCHISE_PROVIDER_ALLOWED_HOSTS),errors=[];
 const checkSecret=(key,min=24)=>{const value=String(env[key]||'');if(!value)errors.push(`${key}:missing`);else if(!allowTemplate&&(PLACEHOLDER.test(value)||value.length<min))errors.push(`${key}:unsafe`)};
 const checkCatalog=(catalog,hosts,kind)=>{for(const [code,[urlKey,tokenKey]]of Object.entries(catalog)){let url;try{url=new URL(env[urlKey]||'')}catch{errors.push(`${urlKey}:invalid`)}if(url&&url.protocol!=='https:')errors.push(`${urlKey}:https_required`);if(url&&!hosts.includes(url.hostname.toLowerCase()))errors.push(`${urlKey}:host_not_allowed`);if(!allowTemplate&&url?.hostname.endsWith('.example.invalid'))errors.push(`${urlKey}:placeholder_host`);checkSecret(tokenKey);if(!env[urlKey])errors.push(`${urlKey}:missing`)}return Object.keys(catalog).map(code=>({kind,code,configured:!errors.some(error=>error.startsWith(`FRANCHISE_${code.toUpperCase()}_`))}))};
 if(!adapterHosts.length)errors.push('FRANCHISE_ADAPTER_ALLOWED_HOSTS:missing');if(!providerHosts.length)errors.push('FRANCHISE_PROVIDER_ALLOWED_HOSTS:missing');
 checkSecret('FRANCHISE_WORKER_SECRET',32);checkSecret('FRANCHISE_PROVIDER_WORKER_SECRET',32);
 if(env.FRANCHISE_WORKER_SECRET&&env.FRANCHISE_WORKER_SECRET===env.FRANCHISE_PROVIDER_WORKER_SECRET)errors.push('worker_secrets:must_differ');
 const targets=[...checkCatalog(SOURCE_ENV,adapterHosts,'department'),...checkCatalog(CHANNEL_ENV,providerHosts,'provider')];
 if(Object.keys(SOURCE_ENV).length!==13||Object.keys(CHANNEL_ENV).length!==4)errors.push('catalog:unexpected_size');
 return Object.freeze({valid:errors.length===0,mode:allowTemplate?'template':'staging',departmentCount:Object.keys(SOURCE_ENV).length,providerCount:Object.keys(CHANNEL_ENV).length,targets:Object.freeze(targets),errors:Object.freeze(errors)});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),fileIndex=args.indexOf('--env'),allowTemplate=args.includes('--template');if(fileIndex<0||!args[fileIndex+1])throw new Error('Kullanım: node gm-franchise/staging-integration-config.mjs --env FILE [--template]');
 const result=validateStagingIntegrationConfig(parseEnvText(await readFile(args[fileIndex+1],'utf8')),{allowTemplate});
 console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=2;
}
