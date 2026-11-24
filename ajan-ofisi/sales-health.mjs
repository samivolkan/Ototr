const BASE='https://bsjkohwbtrfwrqcyhsfz.supabase.co/rest/v1/';
const KEY='sb_publishable_2vkXvrJrWhex-e0wFdM3Bg_nVlqGGuE';
export function istanbulDate(now){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Istanbul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
 return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-');
}
export function exactCount(header){
 if(typeof header!=='string'||! /^(?:\*|\d+-\d+)\/\d+$/.test(header))throw Error('Kesin kayıt sayısı doğrulanamadı.');
 const n=Number(header.split('/')[1]);if(!Number.isSafeInteger(n)||n<0)throw Error('Kesin kayıt sayısı doğrulanamadı.');return n;
}
// Reads existing RLS-protected sources. No keys, identities or source rows are returned.
export function createOfficeSalesClient({getSession,fetchImpl=fetch,now=()=>Date.now()}){
 return {async read(){
  const session=await getSession();if(!session?.access_token)throw Error('ERP oturumu gerekli.');
  const headers={apikey:KEY,Authorization:`Bearer ${session.access_token}`};
  const request=async(path,options)=>{const r=await fetchImpl(BASE+path,{...options,headers:{...headers,...options.headers},cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Saha Satış erişimi veya bağlantısı doğrulanamadı.');return r;};
  const team=await(await request('rpc/saha_team',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).json();
  const matches=Array.isArray(team?.members)?team.members.filter(m=>m.id===team.me&&m.active===true):[];
  if(typeof team?.me!=='string'||matches.length!==1)throw Error('Aktif satış ekibi üyeliği doğrulanamadı.');
  const started=now(),day=istanbulDate(started);
  const queries={
   openTasks:'saha_visit_tasks?select=id&state=eq.open',
   overdueTasks:`saha_visit_tasks?select=id&state=eq.open&due_on=lt.${day}`,
   visibleGoalRecords:'saha_goals?select=id',
   visiblePerformanceTargetRecords:'saha_performance_targets?select=id'
  };
  const entries=await Promise.all(Object.entries(queries).map(async([key,path])=>[key,exactCount((await request(path,{method:'HEAD',headers:{Prefer:'count=exact'}})).headers.get('content-range'))]));
  if(now()-started>60000)throw Error('Saha Satış okuması güncelliğini yitirdi.');
  return {status:'ok',observedAt:new Date(started).toISOString(),day,timeZone:'Europe/Istanbul',scope:'current_user_rls',atomicSnapshot:false,...Object.fromEntries(entries),targetAchievementVerified:false,franchiseHandoffVerified:false};
 }};
}
