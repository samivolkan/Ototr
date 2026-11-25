import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {ORIGINS,validateIntake,validateContent} from './model.mjs';
const url=Deno.env.get('SUPABASE_URL')!, key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db=createClient(url,key,{auth:{persistSession:false}});
const columns='id,kind,slug,title,summary,body,details,branch_id,status,revision,updated_at';
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,'0')).join('');
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin');
 const headers={'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origin&&ORIGINS.includes(origin)?origin:'https://oto-tr.com','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,content-type,apikey,x-client-info','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const send=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!ORIGINS.includes(origin))return send({error:'Origin izinli değil.'},403);
 if(req.method==='OPTIONS')return send({ok:true});
 const path=new URL(req.url).pathname.split('/website-api')[1]||'/';
 try{
  if(req.method==='GET'&&path==='/content'){
   const [{data,error},{data:active}]=await Promise.all([db.from('website_content').select(columns).eq('status','published').order('updated_at',{ascending:false}),db.from('branches').select('id').eq('is_active',true).eq('status','ACTIVE')]);
   if(error)throw error;
   const ids=new Set((active||[]).map(x=>x.id));
   return send({ok:true,items:(data||[]).filter(x=>x.kind!=='branch'||ids.has(x.branch_id))});
  }
  if(req.method==='POST'&&['/appointment','/franchise'].includes(path)){
   if(Number(req.headers.get('content-length')||0)>12000)return send({error:'Form çok uzun.'},413);
   const raw=await req.text();if(raw.length>12000)return send({error:'Form çok uzun.'},413);
   const input=JSON.parse(raw),kind=path.slice(1);
   if(!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.requestId||''))return send({error:'İstek kimliği gerekli.'},400);
   const payload=validateIntake(kind,input);
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
   const bucket=await hash(key+'|'+ip);
   const rate=await db.rpc('website_rate_limit',{p_bucket:bucket});
   if(rate.error||rate.data!==true)return send({error:'Çok sayıda deneme. Lütfen 15 dakika sonra tekrar dene.'},429);
   const result=await db.rpc('website_submit',{p_kind:kind,p_request_id:input.requestId,p_hash:await hash(JSON.stringify(payload)),p_payload:payload});
   if(result.error){if(result.error.message.includes('IDEMPOTENCY_CONFLICT'))return send({error:'Bu istek farklı bilgilerle daha önce işlendi. Formu yeniden aç.'},409);if(result.error.message.includes('BRANCH_UNAVAILABLE'))return send({error:'Bu şube şu an talep alamıyor. Başka şube seçin veya bizi arayın.'},400);if(/INVALID_DATE|INVALID_CONTACT|PROCESSING_CONSENT_REQUIRED/.test(result.error.message))return send({error:'Form bilgilerini ve izin alanlarını kontrol edin.'},400);throw result.error;}
   return send(result.data,201);
  }
  if(path.startsWith('/admin')){
   const token=req.headers.get('authorization')?.replace(/^Bearer /i,'')||'';
   const {data:auth,error:authError}=await db.auth.getUser(token);
   if(authError||!auth.user)return send({error:'ERP oturumu gerekli.'},401);
   const {data:actor}=await db.from('app_users').select('role').eq('auth_user_id',auth.user.id).eq('is_active',true).maybeSingle();
   if(!actor||!['CEO','GENERAL_MANAGER','OPERATIONS'].includes(actor.role))return send({error:'Web yönetimi yetkiniz yok.'},403);
   if(req.method==='GET'){
    const [items,branches,appointments,franchise]=await Promise.all([
     db.from('website_content').select(columns).order('updated_at',{ascending:false}),
     db.from('branches').select('id,name,city,district').eq('is_active',true),
     db.from('public_appointment_requests').select('id,created_at,status,full_name,phone,service,preferred_date,preferred_time,province,district,note,payload').eq('source','oto-tr.com/web').order('created_at',{ascending:false}).limit(50),
     db.from('public_franchise_applications').select('id,created_at,status,full_name,phone,province,district,application_type,note,payload').eq('source','oto-tr.com/web/franchise').order('created_at',{ascending:false}).limit(50)
    ]);
    if([items,branches,appointments,franchise].some(x=>x.error))throw Error('Read failed');
    return send({ok:true,items:items.data,branches:branches.data,appointments:appointments.data,franchise:franchise.data});
   }
   if(req.method==='POST'&&path==='/admin/content'){
    const raw=await req.text();if(raw.length>40000)return send({error:'İçerik çok uzun.'},413);
    const input=JSON.parse(raw),payload=validateContent(input);
    // Use the user's own JWT and existing RLS roles for all editorial writes.
    const userDb=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false}});
    const q=input.id?userDb.from('website_content').update(payload).eq('id',input.id).eq('revision',input.revision):userDb.from('website_content').insert(payload);
    const {data,error}=await q.select(columns).maybeSingle();
    if(error){if(error.code==='23505')return send({error:'Bu sayfa adresi zaten kullanılıyor.'},409);if(error.code==='23514')return send({error:'Yayın bilgileri eksik veya geçersiz. Alanları kontrol edin.'},400);throw error;}if(!data)return send({error:'İçerik başka oturumda değişti. Yenileyip tekrar dene.'},409);
    return send({ok:true,item:data});
   }
  }
  return send({error:'Bulunamadı.'},404);
 }catch(e){
  if(e instanceof SyntaxError)return send({error:'Geçersiz istek.'},400);
  const m=e instanceof Error?e.message:'';
  if(/gerekli|seç|geçersiz|doğrulanamadı|belirtmelisin|içerik/i.test(m))return send({error:m},400);
  return send({error:'İşlem tamamlanamadı. Tekrar deneyebilir veya bizi arayabilirsiniz.'},503);
 }
});
