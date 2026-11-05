const DEFAULT_URL='https://bsjkohwbtrfwrqcyhsfz.supabase.co';
const DEFAULT_KEY='sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
const CONFIG_KEY='ototr-dealer-supabase-config-v1';
const SESSION_KEY='ototr-dealer-supabase-session-v1';

function parse(value,fallback=null){try{return JSON.parse(value||'')||fallback}catch{return fallback}}
export function browserRuntimeConfig(){
  const stored=parse(globalThis.localStorage?.getItem(CONFIG_KEY),'')||{};
  const runtime=globalThis.OTOTR_SUPABASE_CONFIG||{};
  return{url:String(runtime.url||stored.url||DEFAULT_URL).replace(/\/$/,''),key:String(runtime.key||stored.key||DEFAULT_KEY)};
}
function storedSession(){
  const direct=parse(globalThis.localStorage?.getItem(SESSION_KEY)||globalThis.sessionStorage?.getItem(SESSION_KEY));
  if(direct?.access_token||direct?.refresh_token)return direct;
  const ref=new URL(browserRuntimeConfig().url).hostname.split('.')[0];
  const native=parse(globalThis.localStorage?.getItem(`sb-${ref}-auth-token`)||globalThis.sessionStorage?.getItem(`sb-${ref}-auth-token`));
  return native?.currentSession||native?.session||native||null;
}
async function browserSession(fetchImpl=fetch){
  const config=browserRuntimeConfig(),session=storedSession();
  if(session?.access_token&&(!session.expires_at||Number(session.expires_at)>Date.now()/1000+60||Number(session.expires_at)>Date.now()+60000))return session;
  if(!session?.refresh_token)return null;
  const response=await fetchImpl(`${config.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
  const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||'ERP oturumu yenilenemedi.');
  const next={access_token:body.access_token,refresh_token:body.refresh_token||session.refresh_token,expires_at:Math.floor(Date.now()/1000)+(Number(body.expires_in)||3600)};
  globalThis.localStorage?.setItem(SESSION_KEY,JSON.stringify(next));return next;
}
export function createFranchiseLiveClient({config=browserRuntimeConfig(),getSession=browserSession,fetchImpl=fetch}={}){
  async function rpc(name,payload={}){
    const session=await getSession(fetchImpl);if(!session?.access_token)throw new Error('ERP Supabase oturumu bulunamadı. Ana ERP ekranından giriş yapın.');
    const response=await fetchImpl(`${config.url}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:config.key,Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||body?.hint||'Franchise canlı işlemi tamamlanamadı.');return body;
  }
  return Object.freeze({listQueue:()=>rpc('list_public_franchise_intake_queue'),canonicalize:(payload)=>rpc('canonicalize_public_franchise_application',payload)});
}
export const franchiseLiveClient=createFranchiseLiveClient();
