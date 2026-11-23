import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
const cors={'Access-Control-Allow-Origin':'https://samivolkan.github.io','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:{...cors,'Content-Type':'application/json'}});
const env=(n:string)=>{const v=Deno.env.get(n);if(!v)throw Error('SERVER_CONFIGURATION');return v};
const key=(legacy:string,dict:string)=>Deno.env.get(legacy)||env(JSON.parse(env(dict)).default);
const db=createClient(env('SUPABASE_URL'),key('SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEYS'),{auth:{persistSession:false}});
const checked=(r:any)=>{if(r.error)throw Error('DATABASE_ERROR');return r.data};
import {metrics,parseMetrics,assess} from './metrics.mjs';
async function digest(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('')}
async function refresh(c:any){
 if(c.oauth_client_id!==env('GOOGLE_OAUTH_CLIENT_ID'))throw Error('GOOGLE_RECONNECT_REQUIRED');
 const bytes=(s:string)=>Uint8Array.from(atob(s),x=>x.charCodeAt(0));
 const [iv,data]=c.refresh_token_encrypted.split('.');
 const k=await crypto.subtle.importKey('raw',bytes(env('GOOGLE_TOKEN_ENCRYPTION_KEY')),'AES-GCM',false,['decrypt']);
 const clear=new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(iv)},k,bytes(data)));
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(20000),body:new URLSearchParams({client_id:env('GOOGLE_OAUTH_CLIENT_ID'),client_secret:env('GOOGLE_OAUTH_CLIENT_SECRET'),refresh_token:clear,grant_type:'refresh_token'})});
 const j=await r.json();if(!r.ok||!j.access_token)throw Error('GOOGLE_RECONNECT_REQUIRED');return j.access_token;
}
async function sync(c:any){
 const claims=checked(await db.rpc('claim_seo_sync',{p_source:'gbp'}));
 if(!claims?.length)return;
 try{
 const end=new Date(Date.now()-3*86400000),start=new Date(Date.now()-180*86400000);
 const date=(d:Date)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul'}).format(d);
 const a=date(start),z=date(end);const q=new URLSearchParams();
 for(const metric of Object.keys(metrics))q.append('dailyMetrics',metric);
 for(const [which,value] of [['start_date',a],['end_date',z]]){const [y,m,d]=value.split('-');q.set('dailyRange.'+which+'.year',y);q.set('dailyRange.'+which+'.month',String(+m));q.set('dailyRange.'+which+'.day',String(+d));}
 const token=await refresh(c);
 const r=await fetch('https://businessprofileperformance.googleapis.com/v1/locations/13476693615171033693:fetchMultiDailyMetricsTimeSeries?'+q,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
 const j=await r.json();
 if(!r.ok){const reason=j.error?.details?.find((d:any)=>d.reason)?.reason||j.error?.status||'FAILED';throw Error('GBP_'+r.status+'_'+String(reason).replace(/[^A-Z_]/g,''));}
 const reports=parseMetrics(j,a,z);
 const payload={mode:'api',source:'Google İşletme Profili Performance API',start:a,end:z,importedAt:date(new Date()),syncedAt:new Date().toISOString(),...reports,findings:assess(reports.daily,z),rulesVersion:'1.0'};
 checked(await db.from('seo_report_cache').update({payload,last_success_at:payload.syncedAt,last_error:null,lease_until:null}).eq('source','gbp'));
 }catch(e){const message=e instanceof Error?e.message:'SYNC_FAILED';checked(await db.from('seo_report_cache').update({last_error:/^(GBP_|GOOGLE_|SERVER_|DATABASE_)/.test(message)?message:'SYNC_FAILED',lease_until:null}).eq('source','gbp'));}
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return out({error:'METHOD_NOT_ALLOWED'},405);
 try{
 const body=await req.json();if(!['status','sync','worker'].includes(body.action))return out({error:'INVALID_ACTION'},400);
 const c=checked(await db.from('google_business_connections').select('*').eq('id','ototr-primary').maybeSingle());if(!c)return out({error:'GOOGLE_CONNECTION_MISSING'},409);
 if(body.action==='worker'){
 const row=checked(await db.from('seo_report_cache').select('token_digest,enabled').eq('source','gbp').single());
 const token=req.headers.get('x-seo-worker')||'';if(!token||await digest(token)!==row.token_digest)return out({error:'UNAUTHORIZED'},401);
 if(!row.enabled)return out({status:'disabled'});
 await sync(c);return out({status:'finished'});
 }
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token)return out({error:'ERP_LOGIN_REQUIRED'},401);
 const auth=await db.auth.getUser(token);if(auth.error||!auth.data.user)return out({error:'ERP_LOGIN_REQUIRED'},401);
 const allowed=[c.connected_by,...(Deno.env.get('GOOGLE_BUSINESS_ADMIN_USER_IDS')||'').split(',').map(x=>x.trim()).filter(Boolean)];
 if(!allowed.includes(auth.data.user.id))return out({error:'SEO_OWNER_ACCESS_REQUIRED'},403);
 if(body.action==='sync')await sync(c);
 const rows=checked(await db.from('seo_report_cache').select('source,payload,last_success_at,last_attempt_at,last_error,enabled'));
 const g=rows.find((x:any)=>x.source==='gbp');
 const schedule=checked(await db.rpc('seo_schedule_status'));
 return out({branch:'Nilüfer',gbp:g,schedule,ads:{connected:false,developerTokenConfigured:!!Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN'),oauthScopeReady:String(c.scope).includes('/auth/adwords'),reason:'Ads için ayrı API yetkilendirmesi gerekli.'}});
 }catch{return out({error:'REPORT_SERVICE_ERROR'},503);}
});
