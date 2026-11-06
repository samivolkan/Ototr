import {createClient} from 'npm:@supabase/supabase-js@2.112.3'
import {processInvitationBatch} from './handler.mjs'

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8'}})
const env=(name:string)=>Deno.env.get(name)||''
const equal=(a:string,b:string)=>{if(!a||a.length!==b.length)return false;let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a.charCodeAt(i)^b.charCodeAt(i);return mismatch===0}

Deno.serve(async req=>{
  if(req.method!=='POST')return json({error:'Yalnız POST desteklenir.'},405)
  if(!equal(req.headers.get('x-franchise-invitation-worker-secret')||'',env('FRANCHISE_INVITATION_WORKER_SECRET')))return json({error:'Yetkisiz worker çağrısı.'},401)
  if(env('FRANCHISE_INVITATION_DELIVERY_ENABLED')!=='true')return json({error:'Kurumsal hesap davet gönderimi etkin değil.'},503)
  const url=env('SUPABASE_URL'),key=env('SUPABASE_SERVICE_ROLE_KEY'),redirectTo=env('FRANCHISE_INVITATION_REDIRECT_URL')
  if(!url||!key||!/^https:\/\/[^\s]+$/.test(redirectTo))return json({error:'Davet worker yapılandırması eksik.'},503)

  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})
  const claim=await admin.rpc('claim_franchise_user_invitation_requests',{p_limit:10})
  if(claim.error)return json({error:'Onaylı davet kuyruğu alınamadı.'},503)
  const results=await processInvitationBatch(claim.data||[],{
    invite:async({email,displayName,erpRole}:{email:string,displayName:string,erpRole:string})=>{
      const {data,error}=await admin.auth.admin.inviteUserByEmail(email,{redirectTo,data:{full_name:displayName,requested_erp_role:erpRole}})
      if(error||!data.user?.id)throw Object.assign(new Error('Auth invite failed'),{safeCode:'auth_invite_failed'})
      return data.user.id
    },
    cleanup:async(authUserId:string)=>{const {error}=await admin.auth.admin.deleteUser(authUserId);if(error)throw error},
    finish:async({requestId,leaseToken,success,authUserId,errorCode}:{requestId:string,leaseToken:string,success:boolean,authUserId:string|null,errorCode:string|null})=>{
      const {error}=await admin.rpc('finish_franchise_user_invitation',{p_request_id:requestId,p_lease_token:leaseToken,p_success:success,p_auth_user_id:authUserId,p_error_code:errorCode})
      if(error)throw error
    }
  })
  return json({claimed:(claim.data||[]).length,provisioned:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length})
})
